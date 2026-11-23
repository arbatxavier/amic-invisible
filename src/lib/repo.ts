import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import { events, exclusions, participants } from './db/schema';
import { newId } from './id';
import { normalizePhone } from './phone';

export function getEventById(id: string) {
  return db.select().from(events).where(eq(events.id, id)).get();
}

export function getParticipantsByEvent(eventId: string) {
  return db
    .select()
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .orderBy(asc(participants.name))
    .all();
}

export function getExclusionsByEvent(eventId: string) {
  return db.select().from(exclusions).where(eq(exclusions.eventId, eventId)).all();
}

export function getParticipantByToken(token: string) {
  return db.select().from(participants).where(eq(participants.token, token)).get();
}

export function getParticipantById(id: string) {
  return db.select().from(participants).where(eq(participants.id, id)).get();
}

/**
 * Shared-phone rule: two or more participants of the same event with the same
 * normalized phone generate bidirectional exclusions (SAME_PHONE). Tokens and
 * WhatsApp sends are always kept separate.
 */
export function syncSamePhoneExclusions(eventId: string): void {
  const now = Date.now();

  db.delete(exclusions)
    .where(and(eq(exclusions.eventId, eventId), eq(exclusions.reason, 'SAME_PHONE')))
    .run();

  const parts = getParticipantsByEvent(eventId);

  const groups = new Map<string, string[]>();
  for (const p of parts) {
    const phone = normalizePhone(p.phone);
    if (!phone) continue;
    const list = groups.get(phone) ?? [];
    list.push(p.id);
    groups.set(phone, list);
  }

  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    for (const giverId of ids) {
      for (const receiverId of ids) {
        if (giverId === receiverId) continue;
        db.insert(exclusions)
          .values({ id: newId(), eventId, giverId, receiverId, reason: 'SAME_PHONE', createdAt: now })
          .onConflictDoNothing()
          .run();
      }
    }
  }
}

export function getBaseUrl(request?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, '');
  if (request) {
    const host =
      request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    if (host) return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export function formatDate(ms: number | null | undefined, withTime = true): string {
  if (!ms) return '';
  const d = new Date(ms);
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'long', year: 'numeric' };
  try {
    return new Intl.DateTimeFormat('ca-ES', opts).format(d);
  } catch {
    return d.toLocaleString();
  }
}
