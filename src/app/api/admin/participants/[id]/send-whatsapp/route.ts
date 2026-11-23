import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { participants } from '@/lib/db/schema';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { renderMessage } from '@/lib/template';
import {
  formatDate,
  getBaseUrl,
  getEventById,
  getParticipantById,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';

/**
 * Envia el missatge a UN sol participant. La cua (amb retardo aleatori de 3-5s)
 * la controla el frontend crida a crida.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = getParticipantById(id);
  if (!p) return NextResponse.json({ error: 'No trobat' }, { status: 404 });

  const event = getEventById(p.eventId);
  if (!event) return NextResponse.json({ error: 'Esdeveniment no trobat' }, { status: 404 });

  if (!p.assignedToId) {
    return NextResponse.json({ error: "Encara no s'ha fet el sorteig" }, { status: 400 });
  }

  const assigned = getParticipantById(p.assignedToId);
  if (!assigned) return NextResponse.json({ error: 'Assignació no trobada' }, { status: 400 });

  if (!p.phone) {
    return NextResponse.json({ error: 'Aquest participant no té telèfon' }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const message = renderMessage(event.messageTemplate, {
    name: p.name,
    friend: assigned.name,
    title: event.title,
    date: formatDate(event.eventDate),
    location: event.location || '',
    budget: event.budget || '',
    rules: event.rules || '',
    link: `${baseUrl}/r/${p.token}`,
  });

  const now = Date.now();

  try {
    await sendWhatsAppText(p.phone, message);
    db.update(participants)
      .set({ whatsappStatus: 'SENT', whatsappSentAt: now, updatedAt: now })
      .where(eq(participants.id, p.id))
      .run();
    return NextResponse.json({ ok: true, status: 'SENT' });
  } catch (err) {
    db.update(participants)
      .set({ whatsappStatus: 'FAILED', updatedAt: now })
      .where(eq(participants.id, p.id))
      .run();

    const fallback = `https://wa.me/${p.phone}?text=${encodeURIComponent(message)}`;
    return NextResponse.json(
      {
        ok: false,
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Error desconegut',
        fallback,
      },
      { status: 502 },
    );
  }
}
