import { NextResponse } from 'next/server';
import { eq, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exclusions, participants } from '@/lib/db/schema';
import { normalizePhone } from '@/lib/phone';
import { getEventById, getParticipantById, syncSamePhoneExclusions } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = getParticipantById(id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const event = getEventById(p.eventId);
  if (event && event.status !== 'DRAFT') {
    return NextResponse.json({ error: 'This event is read-only' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (typeof body.name === 'string') updates.name = body.name.trim();
  if ('phone' in body) updates.phone = normalizePhone(body.phone);
  if ('language' in body) updates.language = body.language === 'es' ? 'es' : 'ca';

  db.update(participants).set(updates).where(eq(participants.id, id)).run();

  syncSamePhoneExclusions(p.eventId);

  return NextResponse.json({ participant: getParticipantById(id) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const p = getParticipantById(id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const event = getEventById(p.eventId);
  if (event && event.status !== 'DRAFT') {
    return NextResponse.json({ error: 'This event is read-only' }, { status: 400 });
  }

  db.delete(exclusions)
    .where(or(eq(exclusions.giverId, id), eq(exclusions.receiverId, id)))
    .run();
  db.update(participants)
    .set({ assignedToId: null })
    .where(eq(participants.assignedToId, id))
    .run();
  db.delete(participants).where(eq(participants.id, id)).run();

  return NextResponse.json({ ok: true });
}
