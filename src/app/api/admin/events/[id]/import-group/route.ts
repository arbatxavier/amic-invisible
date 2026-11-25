import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { participants } from '@/lib/db/schema';
import { newId, newToken } from '@/lib/id';
import { normalizePhone } from '@/lib/phone';
import { getGroupParticipants } from '@/lib/whatsapp';
import { getEventById, syncSamePhoneExclusions } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (event.status !== 'DRAFT') {
    return NextResponse.json({ error: 'This event is read-only' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const groupId = typeof body.groupId === 'string' ? body.groupId : '';
  if (!groupId) {
    return NextResponse.json({ error: 'Group id is required' }, { status: 400 });
  }

  const members = await getGroupParticipants(groupId);
  if (members.length === 0) {
    return NextResponse.json({ error: 'No participants found in this group' }, { status: 400 });
  }

  const now = Date.now();
  let imported = 0;

  for (const m of members) {
    const phone = normalizePhone(m.phone);
    const name = phone || m.id;
    db.insert(participants)
      .values({
        id: newId(),
        eventId: id,
        name,
        phone,
        language: 'ca',
        token: newToken(),
        assignedToId: null,
        whatsappStatus: 'PENDING',
        whatsappSentAt: null,
        viewedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    imported++;
  }

  syncSamePhoneExclusions(id);

  return NextResponse.json({ imported });
}
