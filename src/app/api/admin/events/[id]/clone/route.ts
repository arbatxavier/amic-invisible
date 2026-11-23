import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { events, exclusions, participants } from '@/lib/db/schema';
import { newId, newToken } from '@/lib/id';
import {
  getEventById,
  getExclusionsByEvent,
  getParticipantsByEvent,
  syncSamePhoneExclusions,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const src = getEventById(id);
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const now = Date.now();
  const newEventId = newId();

  db.insert(events)
    .values({
      id: newEventId,
      title: `${src.title} (còpia)`,
      eventDate: src.eventDate,
      location: src.location,
      budget: src.budget,
      rules: src.rules,
      avoidTwoCycles: src.avoidTwoCycles,
      messageTemplate: src.messageTemplate,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const srcParts = getParticipantsByEvent(id);
  const idMap = new Map<string, string>();

  for (const p of srcParts) {
    const np = newId();
    idMap.set(p.id, np);
    db.insert(participants)
      .values({
        id: np,
        eventId: newEventId,
        name: p.name,
        phone: p.phone,
        token: newToken(),
        assignedToId: null,
        whatsappStatus: 'PENDING',
        whatsappSentAt: null,
        viewedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  // Copy MANUAL exclusions (remapping ids). SAME_PHONE ones are regenerated.
  for (const e of getExclusionsByEvent(id)) {
    if (e.reason !== 'MANUAL') continue;
    const giver = idMap.get(e.giverId);
    const receiver = idMap.get(e.receiverId);
    if (!giver || !receiver) continue;
    db.insert(exclusions)
      .values({
        id: newId(),
        eventId: newEventId,
        giverId: giver,
        receiverId: receiver,
        reason: 'MANUAL',
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();
  }

  syncSamePhoneExclusions(newEventId);

  return NextResponse.json({ event: getEventById(newEventId) }, { status: 201 });
}
