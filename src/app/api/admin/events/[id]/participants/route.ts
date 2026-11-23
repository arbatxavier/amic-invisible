import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { participants } from '@/lib/db/schema';
import { newId, newToken } from '@/lib/id';
import { normalizePhone } from '@/lib/phone';
import {
  getEventById,
  getParticipantsByEvent,
  syncSamePhoneExclusions,
} from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.participants) ? body.participants : [body];

  const now = Date.now();
  const created: string[] = [];

  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) continue;
    const pid = newId();
    db.insert(participants)
      .values({
        id: pid,
        eventId: id,
        name,
        phone: normalizePhone(raw.phone),
        token: newToken(),
        assignedToId: null,
        whatsappStatus: 'PENDING',
        whatsappSentAt: null,
        viewedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    created.push(pid);
  }

  if (created.length === 0) {
    return NextResponse.json({ error: 'Could not create any participant' }, { status: 400 });
  }

  // Shared-phone rule: sync SAME_PHONE exclusions.
  syncSamePhoneExclusions(id);

  return NextResponse.json(
    { participants: getParticipantsByEvent(id), created },
    { status: 201 },
  );
}
