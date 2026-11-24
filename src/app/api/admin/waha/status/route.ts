import { NextResponse } from 'next/server';
import { getMe, getSessions, getWahaConfig } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { url } = getWahaConfig();
  if (!url) {
    return NextResponse.json({ configured: false });
  }

  try {
    const sessions = await getSessions();
    const def = sessions.find((s) => s?.name === 'default');
    const status = def ? String(def.status) : null;

    let me: { phone: string; name: string | null } | null = null;
    if (status === 'WORKING') {
      const info = await getMe();
      if (info?.id) {
        me = {
          phone: info.id.replace(/@c\.us$/, ''),
          name: info.pushName || null,
        };
      }
    }

    return NextResponse.json({ configured: true, status, me, sessions });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      status: null,
      me: null,
      error: err instanceof Error ? err.message : 'WAHA unavailable',
    });
  }
}
