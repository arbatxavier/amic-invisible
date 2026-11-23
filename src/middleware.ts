import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'amic_admin';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isAdmin = path.startsWith('/admin') || path.startsWith('/api/admin');
  if (!isAdmin) return NextResponse.next();

  const isLogin = path === '/admin/login' || path === '/api/admin/login';

  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD no configurada' }, { status: 500 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  const expected = await sha256Hex(pw);
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authed = cookie === expected;

  if (!authed && !isLogin) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autoritzat' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
