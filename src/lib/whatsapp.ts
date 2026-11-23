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
  if (!url) throw new Error('WAHA_URL no configurada');

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

/** S'assegura que la sessió "default" existeix (és idempotent). */
export async function ensureDefaultSession(): Promise<void> {
  try {
    await wahaRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'default' }),
    });
  } catch {
    // La sessió pot existir o WAHA pot no estar disponible encara.
  }
}

/** Envia un missatge de text usant sempre la sessió "default" i JID {phone}@c.us */
export async function sendWhatsAppText(phone: string, text: string): Promise<void> {
  const jid = `${phone}@c.us`;
  const res = await wahaRequest('/api/sendText', {
    method: 'POST',
    body: JSON.stringify({ session: 'default', chatId: jid, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`WAHA va respondre ${res.status}: ${body.slice(0, 300)}`);
  }
}
