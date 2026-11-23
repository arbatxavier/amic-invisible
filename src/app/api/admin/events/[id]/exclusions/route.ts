import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { exclusions } from '@/lib/db/schema';
import { newId } from '@/lib/id';
import { getEventById, getExclusionsByEvent } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const giverId = typeof body.giverId === 'string' ? body.giverId : '';
  const receiverId = typeof body.receiverId === 'string' ? body.receiverId : '';

  if (!giverId || !receiverId || giverId === receiverId) {
    return NextResponse.json({ error: 'Invalid exclusion' }, { status: 400 });
  }

  db.insert(exclusions)
    .values({
      id: newId(),
      eventId: id,
      giverId,
      receiverId,
      reason: 'MANUAL',
      createdAt: Date.now(),
    })
    .onConflictDoNothing()
    .run();

  return NextResponse.json({ exclusions: getExclusionsByEvent(id) }, { status: 201 });
}
