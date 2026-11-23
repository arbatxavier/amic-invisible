import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, participants } from '@/lib/db/schema';
import { newId } from '@/lib/id';

export const dynamic = 'force-dynamic';

export async function GET() {
  const evs = db.select().from(events).orderBy(desc(events.eventDate)).all();

  const counts = db
    .select({ eventId: participants.eventId, count: sql<number>`count(*)`.mapWith(Number) })
    .from(participants)
    .groupBy(participants.eventId)
    .all();
  const countMap = new Map(counts.map((c) => [c.eventId, c.count]));

  return NextResponse.json({
    events: evs.map((e) => ({ ...e, participantCount: countMap.get(e.id) ?? 0 })),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return NextResponse.json({ error: 'El títol és obligatori' }, { status: 400 });
  }

  const now = Date.now();
  const id = newId();

  db.insert(events)
    .values({
      id,
      title,
      eventDate: typeof body.eventDate === 'number' ? body.eventDate : null,
      location: typeof body.location === 'string' ? body.location : null,
      budget: typeof body.budget === 'string' ? body.budget : null,
      rules: typeof body.rules === 'string' ? body.rules : null,
      messageTemplate:
        typeof body.messageTemplate === 'string' ? body.messageTemplate : null,
      avoidTwoCycles: !!body.avoidTwoCycles,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const created = db.select().from(events).where(eq(events.id, id)).get();
  return NextResponse.json({ event: created }, { status: 201 });
}
