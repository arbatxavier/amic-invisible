import { NextResponse } from 'next/server';
import { getWahaConfig, ensureDefaultSession } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Proxies the QR of the "default" WAHA session so it can be scanned
 * from the admin panel without exposing WAHA directly.
 */
export async function GET() {
  const { url, apiKey } = getWahaConfig();
  if (!url) {
    return NextResponse.json({ error: 'WAHA_URL is not configured' }, { status: 400 });
  }

  await ensureDefaultSession();

  const base = url.replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/api/default/auth/qr`, {
      headers: {
        Accept: 'image/png',
        ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'WAHA unavailable' },
      { status: 502 },
    );
  }

  const contentType = res.headers.get('content-type') || '';

  if (res.ok && contentType.includes('image')) {
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' },
    });
  }

  if (res.ok && contentType.includes('json')) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data);
  }

  return NextResponse.json(
    { error: `Could not fetch the QR (status ${res.status}). Open the WAHA dashboard.` },
    { status: 502 },
  );
}
