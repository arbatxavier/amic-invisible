import { NextResponse } from 'next/server';
import { logoutDefaultSession } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await logoutDefaultSession();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    );
  }
}
