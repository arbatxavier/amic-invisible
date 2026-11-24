import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, exclusions, participants } from '@/lib/db/schema';
import {
  getEventById,
  getExclusionsByEvent,
  getParticipantsByEvent,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parts = getParticipantsByEvent(id);
  const nameMap = new Map(parts.map((p) => [p.id, p.name]));
  const excl = getExclusionsByEvent(id);

  const participantsOut = parts.map((p) => ({
    id: p.id,
    eventId: p.eventId,
    name: p.name,
    phone: p.phone,
    token: p.token,
    assignedToId: p.assignedToId,
    assignedToName: p.assignedToId ? (nameMap.get(p.assignedToId) ?? null) : null,
    whatsappStatus: p.whatsappStatus,
    whatsappSentAt: p.whatsappSentAt,
    viewedAt: p.viewedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({ event, participants: participantsOut, exclusions: excl });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const now = Date.now();

  // One-way state machine: DRAFT -> ACTIVE (via draw) -> ARCHIVED. No going back.
  const allowedTransitions: Record<string, string[]> = {
    DRAFT: [],
    ACTIVE: ['ARCHIVED'],
    ARCHIVED: [],
  };

  if (typeof body.status === 'string' && body.status !== event.status) {
    const allowed = allowedTransitions[event.status] ?? [];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status transition' }, { status: 400 });
    }
    db.update(events)
      .set({ status: body.status, updatedAt: now })
      .where(eq(events.id, id))
      .run();
    return NextResponse.json({ event: getEventById(id) });
  }

  // Field edits. eventDate/location/budget/rules are editable in DRAFT and ACTIVE.
  // title/messageTemplate/avoidTwoCycles are only editable while DRAFT.
  const updates: Record<string, unknown> = { updatedAt: now };
  const editable = event.status !== 'ARCHIVED';
  const draftOnly = event.status === 'DRAFT';

  if (draftOnly && typeof body.title === 'string') updates.title = body.title.trim();
  if (editable && 'eventDate' in body)
    updates.eventDate = typeof body.eventDate === 'number' ? body.eventDate : null;
  if (editable && 'location' in body)
    updates.location = typeof body.location === 'string' ? body.location : null;
  if (editable && 'budget' in body)
    updates.budget = typeof body.budget === 'string' ? body.budget : null;
  if (editable && 'rules' in body)
    updates.rules = typeof body.rules === 'string' ? body.rules : null;
  if (draftOnly && 'messageTemplate' in body)
    updates.messageTemplate =
      typeof body.messageTemplate === 'string' ? body.messageTemplate : null;
  if (draftOnly && 'avoidTwoCycles' in body) updates.avoidTwoCycles = !!body.avoidTwoCycles;

  if (Object.keys(updates).length > 1) {
    db.update(events).set(updates).where(eq(events.id, id)).run();
  }

  return NextResponse.json({ event: getEventById(id) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  db.delete(participants).where(eq(participants.eventId, id)).run();
  db.delete(exclusions).where(eq(exclusions.eventId, id)).run();
  db.delete(events).where(eq(events.id, id)).run();
  return NextResponse.json({ ok: true });
}
