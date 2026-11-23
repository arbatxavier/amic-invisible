import crypto from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'amic_admin';

export function hashAdminPassword(pw: string): string {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

export function isAdminAuthenticated(cookieValue: string | undefined | null): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !cookieValue) return false;
  return cookieValue === hashAdminPassword(pw);
}
