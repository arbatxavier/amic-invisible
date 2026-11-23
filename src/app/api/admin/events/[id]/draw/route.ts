import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, participants } from '@/lib/db/schema';
import { runDraw } from '@/lib/draw';
import {
  getEventById,
  getExclusionsByEvent,
  getParticipantsByEvent,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'No trobat' }, { status: 404 });

  const parts = getParticipantsByEvent(id);
  const excl = getExclusionsByEvent(id);

  let assignment: Record<string, string>;
  try {
    assignment = runDraw({
      participantIds: parts.map((p) => p.id),
      exclusions: excl.map((e) => ({ giverId: e.giverId, receiverId: e.receiverId })),
      avoidTwoCycles: event.avoidTwoCycles,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al sortejar' },
      { status: 400 },
    );
  }

  const now = Date.now();
  for (const p of parts) {
    db.update(participants)
      .set({
        assignedToId: assignment[p.id],
        whatsappStatus: 'PENDING',
        whatsappSentAt: null,
        viewedAt: null,
        updatedAt: now,
      })
      .where(eq(participants.id, p.id))
      .run();
  }

  if (event.status === 'DRAFT') {
    db.update(events)
      .set({ status: 'ACTIVE', updatedAt: now })
      .where(eq(events.id, id))
      .run();
  }

  return NextResponse.json({ ok: true, assignments: parts.length });
}
