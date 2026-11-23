import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { participants } from '@/lib/db/schema';
import { getEventById, getParticipantByToken } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/**
 * Anti-spoiler: the recipient is only retrieved and marked as viewed here,
 * when the user taps the reveal button on the client.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const participant = getParticipantByToken(token);
  if (!participant) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  }

  const event = getEventById(participant.eventId);
  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  if (!participant.assignedToId) {
    return NextResponse.json(
      { error: 'The draw has not been done yet. Please try again later.' },
      { status: 409 },
    );
  }

  const assigned = db
    .select()
    .from(participants)
    .where(eq(participants.id, participant.assignedToId))
    .get();

  if (!assigned) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  const now = Date.now();
  db.update(participants)
    .set({ viewedAt: now, updatedAt: now })
    .where(eq(participants.id, participant.id))
    .run();

  return NextResponse.json({
    name: participant.name,
    giftTo: { name: assigned.name },
    event: { title: event.title },
  });
}
