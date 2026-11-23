import { NextResponse } from 'next/server';
import { getWahaConfig, ensureDefaultSession } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Proxya el QR de la sessió "default" de WAHA per poder escanejar-lo
 * des del panell d'administració sense exposar WAHA directament.
 */
export async function GET() {
  const { url, apiKey } = getWahaConfig();
  if (!url) {
    return NextResponse.json({ error: 'WAHA_URL no configurada' }, { status: 400 });
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
      { error: err instanceof Error ? err.message : 'WAHA no disponible' },
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
    { error: `No s'ha pogut obtenir el QR (estat ${res.status}). Obre el dashboard de WAHA.` },
    { status: 502 },
  );
}
