import { NextResponse } from 'next/server';
import { getBaseUrl, getEventById, getParticipantsByEvent } from '@/lib/repo';
import { sendMessageToParticipant } from '@/lib/sending';

export const dynamic = 'force-dynamic';

/**
 * Sends the message to every participant that has not been sent yet.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (event.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'The draw has not been done yet' }, { status: 400 });
  }

  const baseUrl = getBaseUrl(req);
  const parts = getParticipantsByEvent(id);
  const targets = parts.filter((p) => p.phone && p.whatsappStatus !== 'SENT');

  let sent = 0;
  const failed: { name: string; error: string; fallback?: string }[] = [];

  for (const p of targets) {
    const result = await sendMessageToParticipant(p.id, baseUrl);
    if (result.ok) {
      sent++;
    } else {
      failed.push({
        name: p.name,
        error: result.error ?? 'Unknown error',
        fallback: result.fallback,
      });
    }
  }

  return NextResponse.json({ sent, failed, total: targets.length });
}
