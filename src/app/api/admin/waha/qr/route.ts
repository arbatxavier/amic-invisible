import { NextResponse } from 'next/server';
import {
  ensureDefaultSession,
  getWahaConfig,
  startDefaultSessionIfStopped,
} from '@/lib/whatsapp';

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
  await startDefaultSessionIfStopped();

  const base = url.replace(/\/+$/, '');
  const headers: Record<string, string> = { Accept: 'image/png' };
  if (apiKey) headers['X-Api-Key'] = apiKey;

  // The session transitions STOPPED -> STARTING -> SCAN_QR_CODE; poll briefly.
  for (let attempt = 0; attempt < 15; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${base}/api/default/auth/qr`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
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

    // Not ready yet (e.g. 422 while the session is starting); retry.
    await new Promise((r) => setTimeout(r, 1000));
  }

  return NextResponse.json(
    { error: 'Could not fetch the QR. Open the WAHA dashboard.' },
    { status: 502 },
  );
}
