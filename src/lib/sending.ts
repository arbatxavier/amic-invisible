import { eq } from 'drizzle-orm';
import { db } from './db';
import { participants } from './db/schema';
import { sendWhatsAppText } from './whatsapp';
import { renderMessage, getDefaultRules } from './template';
import { formatDate, getEventById, getParticipantById } from './repo';

export interface SendResult {
  id: string;
  ok: boolean;
  status: 'SENT' | 'FAILED';
  error?: string;
  fallback?: string;
}

export async function sendMessageToParticipant(
  id: string,
  baseUrl: string,
): Promise<SendResult> {
  const p = getParticipantById(id);
  if (!p) return { id, ok: false, status: 'FAILED', error: 'Not found' };

  const event = getEventById(p.eventId);
  if (!event) return { id, ok: false, status: 'FAILED', error: 'Event not found' };
  if (!p.assignedToId)
    return { id, ok: false, status: 'FAILED', error: 'The draw has not been done yet' };

  const assigned = getParticipantById(p.assignedToId);
  if (!assigned) return { id, ok: false, status: 'FAILED', error: 'Assignment not found' };
  if (!p.phone)
    return { id, ok: false, status: 'FAILED', error: 'This participant has no phone number' };

  const lang = p.language === 'es' ? 'es' : 'ca';
  const template = lang === 'es' ? event.messageTemplateEs : event.messageTemplate;

  const baseVars = {
    name: p.name,
    nom: p.name,
    friend: assigned.name,
    title: event.title,
    date: formatDate(event.eventDate),
    location: event.location || '',
    budget: event.budget || '',
    link: `${baseUrl}/r/${p.token}`,
  };

  const customRules = lang === 'es' ? event.rulesEs : event.rules;
  const rules = customRules && customRules.trim()
    ? renderMessage(customRules, baseVars, lang)
    : getDefaultRules(lang);

  const message = renderMessage(template, { ...baseVars, rules }, lang);

  const now = Date.now();

  try {
    await sendWhatsAppText(p.phone, message);
    db.update(participants)
      .set({ whatsappStatus: 'SENT', whatsappSentAt: now, updatedAt: now })
      .where(eq(participants.id, p.id))
      .run();
    return { id, ok: true, status: 'SENT' };
  } catch (err) {
    db.update(participants)
      .set({ whatsappStatus: 'FAILED', updatedAt: now })
      .where(eq(participants.id, p.id))
      .run();
    return {
      id,
      ok: false,
      status: 'FAILED',
      error: err instanceof Error ? err.message : 'Unknown error',
      fallback: `https://wa.me/${p.phone}?text=${encodeURIComponent(message)}`,
    };
  }
}
