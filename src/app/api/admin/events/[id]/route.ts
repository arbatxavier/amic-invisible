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
  if (!event) return NextResponse.json({ error: 'No trobat' }, { status: 404 });

  // Modo anti-spoiler: por defecto oculta assignedTo al admin.
  const spoiler = new URL(req.url).searchParams.get('spoiler') !== 'false';

  const parts = getParticipantsByEvent(id);
  const nameMap = new Map(parts.map((p) => [p.id, p.name]));
  const excl = getExclusionsByEvent(id);

  const participantsOut = parts.map((p) => {
    const base = {
      id: p.id,
      eventId: p.eventId,
      name: p.name,
      phone: p.phone,
      token: p.token,
      whatsappStatus: p.whatsappStatus,
      whatsappSentAt: p.whatsappSentAt,
      viewedAt: p.viewedAt,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
    if (spoiler) {
      return { ...base, assignedToId: null, assignedToName: null };
    }
    return {
      ...base,
      assignedToId: p.assignedToId,
      assignedToName: p.assignedToId ? (nameMap.get(p.assignedToId) ?? null) : null,
    };
  });

  return NextResponse.json({ event, participants: participantsOut, exclusions: excl, spoiler });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'No trobat' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updatedAt: Date.now() };

  if (typeof body.title === 'string') updates.title = body.title.trim();
  if ('eventDate' in body)
    updates.eventDate = typeof body.eventDate === 'number' ? body.eventDate : null;
  if ('location' in body)
    updates.location = typeof body.location === 'string' ? body.location : null;
  if ('budget' in body)
    updates.budget = typeof body.budget === 'string' ? body.budget : null;
  if ('rules' in body)
    updates.rules = typeof body.rules === 'string' ? body.rules : null;
  if ('messageTemplate' in body)
    updates.messageTemplate =
      typeof body.messageTemplate === 'string' ? body.messageTemplate : null;
  if ('avoidTwoCycles' in body) updates.avoidTwoCycles = !!body.avoidTwoCycles;
  if (typeof body.status === 'string') updates.status = body.status;

  db.update(events).set(updates).where(eq(events.id, id)).run();

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
