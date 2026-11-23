import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { participants } from '@/lib/db/schema';
import { getEventById, getParticipantByToken } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/**
 * Anti-spoiler: el destinatari només s'obté i es marca viewedAt aquí,
 * quan l'usuari prem el botó de revelar al client.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const participant = getParticipantByToken(token);
  if (!participant) {
    return NextResponse.json({ error: 'Enllaç no vàlid' }, { status: 404 });
  }

  const event = getEventById(participant.eventId);
  if (!event) {
    return NextResponse.json({ error: 'Esdeveniment no trobat' }, { status: 404 });
  }

  if (!participant.assignedToId) {
    return NextResponse.json(
      { error: "El sorteig encara no s'ha fet. Torna-ho a provar més tard." },
      { status: 409 },
    );
  }

  const assigned = db
    .select()
    .from(participants)
    .where(eq(participants.id, participant.assignedToId))
    .get();

  if (!assigned) {
    return NextResponse.json({ error: 'Assignació no trobada' }, { status: 404 });
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
