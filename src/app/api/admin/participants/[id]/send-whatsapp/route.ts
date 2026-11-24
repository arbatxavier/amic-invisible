import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/repo';
import { sendMessageToParticipant } from '@/lib/sending';

export const dynamic = 'force-dynamic';

/**
 * Sends the message to a SINGLE participant.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await sendMessageToParticipant(id, getBaseUrl(req));

  if (result.ok) {
    return NextResponse.json({ ok: true, status: 'SENT' });
  }
  return NextResponse.json(
    { ok: false, status: 'FAILED', error: result.error, fallback: result.fallback },
    { status: 502 },
  );
}
