export interface WahaConfig {
  url: string | undefined;
  apiKey: string | undefined;
}

export function getWahaConfig(): WahaConfig {
  return {
    url: process.env.WAHA_URL,
    apiKey: process.env.WAHA_API_KEY,
  };
}

export async function wahaRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, apiKey } = getWahaConfig();
  if (!url) throw new Error('WAHA_URL is not configured');

  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (apiKey) headers.set('X-Api-Key', apiKey);

  return fetch(`${url.replace(/\/+$/, '')}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(15000),
  });
}

export interface WahaSession {
  name: string;
  status: string;
  [key: string]: unknown;
}

export async function getSessions(): Promise<WahaSession[]> {
  const res = await wahaRequest('/api/sessions?all=true');
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function getDefaultSessionStatus(): Promise<string | null> {
  const sessions = await getSessions();
  const def = sessions.find((s) => s?.name === 'default');
  return def ? String(def.status) : null;
}

/** Creates the "default" session if missing (idempotent; 422 if it already exists). */
export async function ensureDefaultSession(): Promise<void> {
  try {
    await wahaRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'default' }),
    });
  } catch {
    // The session may already exist, or WAHA may not be ready yet.
  }
}

/** Starts the "default" session if it is currently stopped. */
export async function startDefaultSessionIfStopped(): Promise<void> {
  const status = await getDefaultSessionStatus();
  if (status === 'STOPPED') {
    await wahaRequest('/api/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ name: 'default' }),
    });
  }
}

export interface WahaMe {
  id?: string;
  pushName?: string;
  [key: string]: unknown;
}

/** Returns the linked account info (id like 34600112233@c.us, pushName, ...). */
export async function getMe(): Promise<WahaMe | null> {
  try {
    const res = await wahaRequest('/api/sessions/default/me');
    if (!res.ok) return null;
    return (await res.json().catch(() => null)) as WahaMe | null;
  } catch {
    return null;
  }
}

/** Logs the "default" session out (unlinks the WhatsApp account). */
export async function logoutDefaultSession(): Promise<void> {
  await wahaRequest('/api/sessions/logout', {
    method: 'POST',
    body: JSON.stringify({ name: 'default' }),
  });
}

/** Sends a text message always using the "default" session and JID {phone}@c.us */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  const jid = `${phone}@c.us`;
  const res = await wahaRequest('/api/sendText', {
    method: 'POST',
    body: JSON.stringify({ session: 'default', chatId: jid, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WAHA responded ${res.status}: ${body.slice(0, 300)}`);
  }
}

export interface WahaGroup {
  id: string;
  name: string;
}

export async function getGroups(): Promise<WahaGroup[]> {
  const res = await wahaRequest('/api/default/groups?exclude=participants');
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  const list: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return list
    .map((g) => ({
      id: String(g.id ?? g.gid ?? ''),
      name: String(g.name ?? g.subject ?? g.id ?? ''),
    }))
    .filter((g) => g.id);
}

async function resolveLidToPhone(lid: string): Promise<string> {
  try {
    const res = await wahaRequest(`/api/default/lids/${encodeURIComponent(lid)}`);
    if (!res.ok) return '';
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data) return '';
    const raw = data.pn ?? data.phone ?? data.phoneNumber ?? data.id;
    if (typeof raw === 'string') {
      if (raw.endsWith('@c.us')) return raw.slice(0, -5);
      if (/^\d+$/.test(raw)) return raw;
    }
    return '';
  } catch {
    return '';
  }
}

export interface WahaGroupMember {
  id: string;
  phone: string;
}

export async function getGroupParticipants(groupId: string): Promise<WahaGroupMember[]> {
  const res = await wahaRequest(
    `/api/default/groups/${encodeURIComponent(groupId)}/participants/v2`,
  );
  if (!res.ok) return [];
  const data = await res.json().catch(() => []);
  const list = Array.isArray(data) ? data : [];
  const members: WahaGroupMember[] = [];
  for (const p of list) {
    const id = String((p as Record<string, unknown>).id ?? '');
    if (!id) continue;
    let phone = '';
    if (id.endsWith('@c.us')) phone = id.slice(0, -5);
    else if (id.endsWith('@lid')) phone = await resolveLidToPhone(id);
    members.push({ id, phone });
  }
  return members;
}
