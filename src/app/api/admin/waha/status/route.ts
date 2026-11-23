import { NextResponse } from 'next/server';
import { getWahaConfig, wahaRequest } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { url } = getWahaConfig();
  if (!url) {
    return NextResponse.json({ configured: false });
  }

  try {
    const res = await wahaRequest('/api/sessions?all=true');
    if (!res.ok) {
      return NextResponse.json({ configured: true, error: `status ${res.status}` });
    }
    const data = await res.json();
    return NextResponse.json({ configured: true, sessions: data });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      error: err instanceof Error ? err.message : 'WAHA no disponible',
    });
  }
}
