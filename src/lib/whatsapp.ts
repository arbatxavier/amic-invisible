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
