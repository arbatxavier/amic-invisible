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
 * Sends the message to a SINGLE participant. The queue (with a random 3-5s
 * delay between calls) is driven by the frontend, call by call.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = getParticipantById(id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const event = getEventById(p.eventId);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  if (!p.assignedToId) {
    return NextResponse.json({ error: 'The draw has not been done yet' }, { status: 400 });
  }

  const assigned = getParticipantById(p.assignedToId);
  if (!assigned) return NextResponse.json({ error: 'Assignment not found' }, { status: 400 });

  if (!p.phone) {
    return NextResponse.json({ error: 'This participant has no phone number' }, { status: 400 });
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
        error: err instanceof Error ? err.message : 'Unknown error',
        fallback,
      },
      { status: 502 },
    );
  }
}
