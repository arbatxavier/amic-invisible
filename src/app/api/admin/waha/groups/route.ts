import { NextResponse } from 'next/server';
import { getGroups, getWahaConfig } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { url } = getWahaConfig();
  if (!url) {
    return NextResponse.json({ configured: false, groups: [] });
  }

  try {
    const groups = await getGroups();
    return NextResponse.json({ configured: true, groups });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      groups: [],
      error: err instanceof Error ? err.message : 'WAHA unavailable',
    });
  }
}
