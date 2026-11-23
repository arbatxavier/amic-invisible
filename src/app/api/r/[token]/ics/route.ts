import { NextResponse } from 'next/server';
import { getBaseUrl, getEventById, getParticipantByToken } from '@/lib/repo';
import { buildIcs } from '@/lib/ics';

export const dynamic = 'force-dynamic';

/**
 * Downloads a .ics with date, location, rules and a private link in DESCRIPTION.
 * It never includes the assigned name in plain text and never touches viewedAt.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const participant = getParticipantByToken(token);
  if (!participant) {
    return new NextResponse('Not found', { status: 404 });
  }

  const event = getEventById(participant.eventId);
  if (!event) {
    return new NextResponse('Not found', { status: 404 });
  }

  const baseUrl = getBaseUrl(req);
  const link = `${baseUrl}/r/${participant.token}`;

  const description = [
    `Hello ${participant.name}!`,
    event.rules || '',
    '',
    `Private link: ${link}`,
  ]
    .filter(Boolean)
    .join('\n');

  const ics = buildIcs({
    uid: event.id,
    title: event.title,
    start: event.eventDate ? new Date(event.eventDate) : new Date(),
    location: event.location,
    description,
  });

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="amic-invisible.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
