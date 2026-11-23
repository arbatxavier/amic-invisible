import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, hashAdminPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === 'string' ? body.password : '';
  const configured = process.env.ADMIN_PASSWORD;

  if (!configured || password !== configured) {
    return NextResponse.json({ error: 'Contrasenya incorrecta' }, { status: 401 });
  }

  const token = hashAdminPassword(configured);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
