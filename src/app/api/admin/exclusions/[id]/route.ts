import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { exclusions } from '@/lib/db/schema';
import { getEventById } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const exclusion = db.select().from(exclusions).where(eq(exclusions.id, id)).get();
  if (!exclusion) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const event = getEventById(exclusion.eventId);
  if (event && event.status !== 'DRAFT') {
    return NextResponse.json({ error: 'This event is read-only' }, { status: 400 });
  }

  db.delete(exclusions).where(eq(exclusions.id, id)).run();
  return NextResponse.json({ ok: true });
}
