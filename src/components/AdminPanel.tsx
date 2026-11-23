'use client';

import { useCallback, useEffect, useState } from 'react';

type EventStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type WhatsappStatus = 'PENDING' | 'SENT' | 'FAILED';

interface EventRow {
  id: string;
  title: string;
  eventDate: number | null;
  location: string | null;
  budget: string | null;
  rules: string | null;
  status: EventStatus;
  avoidTwoCycles: boolean;
  messageTemplate: string | null;
  createdAt: number;
  updatedAt: number;
  participantCount: number;
}

interface ParticipantRow {
  id: string;
  eventId: string;
  name: string;
  phone: string | null;
  token: string;
  assignedToId: string | null;
  assignedToName: string | null;
  whatsappStatus: WhatsappStatus;
  whatsappSentAt: number | null;
  viewedAt: number | null;
}

interface ExclusionRow {
  id: string;
  eventId: string;
  giverId: string;
  receiverId: string;
  reason: string;
}

interface EventDetail {
  event: EventRow;
  participants: ParticipantRow[];
  exclusions: ExclusionRow[];
  spoiler: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmtDate(ms: number | null): string {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleString();
  }
}

function toTimestamp(v: string): number | null {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

const statusLabel: Record<EventStatus, string> = {
  DRAFT: 'Esborrany',
  ACTIVE: 'Actiu',
  ARCHIVED: 'Arxivat',
};

const statusColor: Record<EventStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  ACTIVE: 'bg-forest-100 text-forest-700',
  ARCHIVED: 'bg-burgundy-100 text-burgundy-700',
};

const waColor: Record<WhatsappStatus, string> = {
  PENDING: 'bg-gold-100 text-gold-700',
  SENT: 'bg-forest-100 text-forest-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function AdminPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [antiSpoiler, setAntiSpoiler] = useState(true);

  const [waha, setWaha] = useState<{ configured: boolean; info?: string; error?: string } | null>(null);
  const [qrNonce, setQrNonce] = useState(0);

  const [sending, setSending] = useState<{ name: string; index: number; total: number } | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' });
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch {
      setError("No s'han pogut carregar els esdeveniments");
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string, spoiler: boolean) => {
    const res = await fetch(`/api/admin/events/${id}?spoiler=${spoiler}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    setDetail(json);
  }, []);

  const loadWaha = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/waha/status', { cache: 'no-store' });
      const json = await res.json();
      if (!json.configured) {
        setWaha({ configured: false });
        return;
      }
      let info = '';
      const sessions = Array.isArray(json.sessions)
        ? json.sessions
        : Array.isArray(json.sessions?.data)
          ? json.sessions.data
          : [];
      const def = sessions.find((s: { name?: string }) => s.name === 'default');
      info = def?.status ? `Sessió "default": ${def.status}` : json.error ?? '';
      setWaha({ configured: true, info, error: json.error });
    } catch (e) {
      setWaha({ configured: true, error: e instanceof Error ? e.message : 'WAHA no disponible' });
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadWaha();
  }, [loadEvents, loadWaha]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId, antiSpoiler);
  }, [selectedId, antiSpoiler, loadDetail]);

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: fd.get('title'),
      eventDate: toTimestamp(String(fd.get('eventDate') ?? '')),
      location: fd.get('location'),
      budget: fd.get('budget'),
      rules: fd.get('rules'),
      avoidTwoCycles: fd.get('avoidTwoCycles') === 'on',
      messageTemplate: fd.get('messageTemplate'),
    };
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? 'Error en crear');
      return;
    }
    e.currentTarget.reset();
    await loadEvents();
  }

  async function draw() {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/events/${selectedId}/draw`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? 'Error al sortejar');
      return;
    }
    await loadDetail(selectedId, antiSpoiler);
    await loadEvents();
  }

  async function cloneEvent(id: string) {
    const res = await fetch(`/api/admin/events/${id}/clone`, { method: 'POST' });
    if (!res.ok) return;
    await loadEvents();
  }

  async function deleteEvent(id: string) {
    if (!confirm('Segur que vols eliminar aquest esdeveniment? Aquesta acció no es pot desfer.')) return;
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    setDetail(null);
    await loadEvents();
  }

  async function setStatus(id: string, status: EventStatus) {
    await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadEvents();
    if (selectedId === id) await loadDetail(id, antiSpoiler);
  }

  async function updateEventField(field: string, value: unknown) {
    if (!selectedId) return;
    await fetch(`/api/admin/events/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    await loadDetail(selectedId, antiSpoiler);
    await loadEvents();
  }

  async function addParticipants(text: string) {
    if (!selectedId) return;
    const participants = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, ...rest] = line.split(/[,;]/).map((s) => s.trim());
        return { name, phone: rest.join('') };
      })
      .filter((p) => p.name);
    if (participants.length === 0) return;
    const res = await fetch(`/api/admin/events/${selectedId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? 'Error en afegir');
      return;
    }
    await loadDetail(selectedId, antiSpoiler);
    await loadEvents();
  }

  async function deleteParticipant(id: string) {
    await fetch(`/api/admin/participants/${id}`, { method: 'DELETE' });
    if (selectedId) {
      await loadDetail(selectedId, antiSpoiler);
      await loadEvents();
    }
  }

  async function updateParticipant(id: string, payload: Record<string, unknown>) {
    await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (selectedId) await loadDetail(selectedId, antiSpoiler);
  }

  async function addExclusion(giverId: string, receiverId: string) {
    if (!selectedId) return;
    await fetch(`/api/admin/events/${selectedId}/exclusions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giverId, receiverId }),
    });
    await loadDetail(selectedId, antiSpoiler);
  }

  async function deleteExclusion(id: string) {
    await fetch(`/api/admin/exclusions/${id}`, { method: 'DELETE' });
    if (selectedId) await loadDetail(selectedId, antiSpoiler);
  }

  async function sendQueue() {
    if (!detail) return;
    const targets = detail.participants.filter((p) => p.phone);
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      setSending({ name: p.name, index: i + 1, total: targets.length });
      try {
        const res = await fetch(`/api/admin/participants/${p.id}/send-whatsapp`, {
          method: 'POST',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok && json.fallback) {
          window.open(json.fallback, '_blank');
        }
      } catch {
        // continua amb el següent
      }
      if (i < targets.length - 1) {
        await sleep(3000 + Math.random() * 2000);
      }
    }
    setSending(null);
    if (selectedId) await loadDetail(selectedId, antiSpoiler);
  }

  async function sendOne(id: string) {
    try {
      const res = await fetch(`/api/admin/participants/${id}/send-whatsapp`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && json.fallback) window.open(json.fallback, '_blank');
      if (!res.ok && json.error) alert(json.error);
    } catch {
      alert('Error en enviar');
    }
    if (selectedId) await loadDetail(selectedId, antiSpoiler);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    navigator.clipboard?.writeText(url);
    alert(`Enllaç copiat: ${url}`);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <main className="festive-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gold-200 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-xl font-black text-burgundy-800">
              🎄 Amic Invisible
            </h1>
            <p className="text-xs text-burgundy-900/50">Panell d&apos;administració</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-bold text-burgundy-700">
              <input
                type="checkbox"
                checked={antiSpoiler}
                onChange={(e) => setAntiSpoiler(e.target.checked)}
                className="h-4 w-4 accent-burgundy-600"
              />
              Anti-spoiler
            </label>
            <button
              onClick={logout}
              className="rounded-full border border-burgundy-300 px-4 py-1.5 text-sm font-bold text-burgundy-700 transition hover:bg-burgundy-50"
            >
              Sortir
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!selectedId ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                <h2 className="font-display text-lg font-bold text-forest-700">Nou esdeveniment</h2>
                <form onSubmit={createEvent} className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Títol *</span>
                      <input
                        name="title"
                        required
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                        placeholder="Amic invisible 2026"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Data i hora</span>
                      <input
                        name="eventDate"
                        type="datetime-local"
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Lloc</span>
                      <input
                        name="location"
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                        placeholder="Casa l'àvia"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Pressupost</span>
                      <input
                        name="budget"
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                        placeholder="25€"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-burgundy-700">Normes</span>
                    <textarea
                      name="rules"
                      rows={2}
                      className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                      placeholder="Res de regals usats…"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-burgundy-700">
                      Plantilla de missatge (variables: {'{name} {friend} {title} {date} {location} {budget} {rules} {link}'})
                    </span>
                    <textarea
                      name="messageTemplate"
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 font-mono text-xs"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-burgundy-700">
                    <input name="avoidTwoCycles" type="checkbox" className="h-4 w-4 accent-burgundy-600" />
                    Evitar cicles de 2 (A regala a B i B regala a A)
                  </label>
                  <button
                    type="submit"
                    className="rounded-full bg-burgundy-600 px-6 py-2.5 font-bold text-cream transition hover:bg-burgundy-700"
                  >
                    Crear esdeveniment
                  </button>
                </form>
              </div>

              <div className="mt-6">
                <h2 className="mb-3 font-display text-lg font-bold text-forest-700">Esdeveniments</h2>
                {loadingEvents ? (
                  <p className="text-sm text-burgundy-900/50">Carregant…</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-burgundy-900/50">Encara no hi ha cap esdeveniment.</p>
                ) : (
                  <ul className="space-y-3">
                    {events.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-2xl border border-gold-200 bg-white/70 p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            onClick={() => setSelectedId(ev.id)}
                            className="text-left"
                          >
                            <span className="font-display text-lg font-bold text-burgundy-800 hover:underline">
                              {ev.title}
                            </span>
                            <span className="ml-2 text-sm text-burgundy-900/50">
                              {fmtDate(ev.eventDate) || 'Sense data'} · {ev.participantCount} participants
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColor[ev.status]}`}>
                              {statusLabel[ev.status]}
                            </span>
                            <button
                              onClick={() => cloneEvent(ev.id)}
                              className="rounded-full border border-forest-300 px-3 py-1 text-xs font-bold text-forest-700 hover:bg-forest-50"
                            >
                              Clonar
                            </button>
                            <button
                              onClick={() => deleteEvent(ev.id)}
                              className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                <h2 className="font-display text-lg font-bold text-forest-700">WhatsApp (WAHA)</h2>
                <p className="mt-1 text-sm text-burgundy-900/60">
                  {waha?.configured === false
                    ? 'WAHA_URL no configurada.'
                    : waha?.info || waha?.error || 'Connectat.'}
                </p>
                {waha?.configured !== false && (
                  <div className="mt-3">
                    <img
                      key={qrNonce}
                      src={`/api/admin/waha/qr?t=${qrNonce}`}
                      alt="QR de WhatsApp"
                      className="mx-auto h-48 w-48 rounded-xl bg-white p-2 shadow"
                    />
                    <button
                      onClick={() => setQrNonce((n) => n + 1)}
                      className="mt-3 w-full rounded-full bg-forest-600 px-4 py-2 text-sm font-bold text-cream hover:bg-forest-700"
                    >
                      Refrescar QR
                    </button>
                    <p className="mt-2 text-center text-xs text-burgundy-900/50">
                      Escaneja amb WhatsApp per vincular el número. Sessió: default
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => {
                setSelectedId(null);
                setDetail(null);
              }}
              className="mb-4 rounded-full border border-burgundy-300 px-4 py-1.5 text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
            >
              ← Tornar
            </button>

            {detail && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-black text-burgundy-800">
                      {detail.event.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      {(['DRAFT', 'ACTIVE', 'ARCHIVED'] as EventStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(detail.event.id, s)}
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            detail.event.status === s
                              ? 'bg-burgundy-600 text-cream'
                              : 'border border-burgundy-300 text-burgundy-700 hover:bg-burgundy-50'
                          }`}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Lloc</span>
                      <input
                        defaultValue={detail.event.location ?? ''}
                        onBlur={(e) => updateEventField('location', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">Pressupost</span>
                      <input
                        defaultValue={detail.event.budget ?? ''}
                        onBlur={(e) => updateEventField('budget', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2"
                      />
                    </label>
                    <label className="flex items-end gap-2 pb-2 text-sm font-bold text-burgundy-700">
                      <input
                        type="checkbox"
                        defaultChecked={detail.event.avoidTwoCycles}
                        onChange={(e) => updateEventField('avoidTwoCycles', e.target.checked)}
                        className="h-4 w-4 accent-burgundy-600"
                      />
                      Evitar cicles de 2
                    </label>
                  </div>

                  <button
                    onClick={draw}
                    disabled={detail.participants.length < 2}
                    className="mt-4 rounded-full bg-burgundy-600 px-6 py-2.5 font-bold text-cream transition hover:bg-burgundy-700 disabled:opacity-50"
                  >
                    🎲 Fer el sorteig
                  </button>
                  {detail.participants.length < 2 && (
                    <p className="mt-2 text-xs text-burgundy-900/50">
                      Calen almenys 2 participants per sortejar.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-forest-700">
                    Participants ({detail.participants.length})
                  </h3>
                  <p className="text-xs text-burgundy-900/50">
                    Format per afegir: «Nom, telèfon» (una línia per participant).
                  </p>
                  <textarea
                    id="bulkParticipants"
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 text-sm"
                    placeholder={'Anna, 600112233\nPere, 611223344'}
                  />
                  <button
                    onClick={() => {
                      const el = document.getElementById('bulkParticipants') as HTMLTextAreaElement;
                      addParticipants(el.value);
                      el.value = '';
                    }}
                    className="mt-2 rounded-full bg-forest-600 px-5 py-2 text-sm font-bold text-cream hover:bg-forest-700"
                  >
                    Afegir participants
                  </button>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gold-200 text-left text-xs text-burgundy-900/50">
                          <th className="py-2 pr-2">Nom</th>
                          <th className="py-2 pr-2">Telèfon</th>
                          {!antiSpoiler && <th className="py-2 pr-2">Regala a</th>}
                          <th className="py-2 pr-2">WhatsApp</th>
                          <th className="py-2 pr-2">Vist</th>
                          <th className="py-2">Accions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.participants.map((p) => (
                          <tr key={p.id} className="border-b border-gold-100">
                            <td className="py-2 pr-2">
                              <input
                                defaultValue={p.name}
                                onBlur={(e) => updateParticipant(p.id, { name: e.target.value })}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-1 hover:border-burgundy-200"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                defaultValue={p.phone ?? ''}
                                onBlur={(e) => updateParticipant(p.id, { phone: e.target.value })}
                                className="w-28 rounded border border-transparent bg-transparent px-1 py-1 hover:border-burgundy-200"
                              />
                            </td>
                            {!antiSpoiler && (
                              <td className="py-2 pr-2 font-bold text-forest-700">
                                {p.assignedToName ?? '—'}
                              </td>
                            )}
                            <td className="py-2 pr-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${waColor[p.whatsappStatus]}`}>
                                {p.whatsappStatus}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{p.viewedAt ? '👁' : '—'}</td>
                            <td className="py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => copyLink(p.token)}
                                  className="rounded border border-burgundy-200 px-2 py-0.5 text-xs text-burgundy-700 hover:bg-burgundy-50"
                                >
                                  Enllaç
                                </button>
                                <button
                                  onClick={() => sendOne(p.id)}
                                  className="rounded border border-forest-200 px-2 py-0.5 text-xs text-forest-700 hover:bg-forest-50"
                                >
                                  Enviar
                                </button>
                                <button
                                  onClick={() => deleteParticipant(p.id)}
                                  className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={sendQueue}
                      disabled={!!sending || detail.participants.filter((p) => p.phone).length === 0}
                      className="rounded-full bg-gold-500 px-5 py-2 text-sm font-bold text-burgundy-900 hover:bg-gold-400 disabled:opacity-50"
                    >
                      {sending
                        ? `Enviant ${sending.index}/${sending.total} (${sending.name})…`
                        : 'Enviar a tots per WhatsApp (cua)'}
                    </button>
                    <p className="mt-1 text-xs text-burgundy-900/50">
                      S&apos;envia un a un amb un retard aleatori de 3–5 s. Si falla, s&apos;obre el botó wa.me.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-forest-700">
                    Exclusions manuals
                  </h3>
                  <p className="text-xs text-burgundy-900/50">
                    Impedeix que algú regali a una persona concreta. Les de telèfon compartit (SAME_PHONE) són automàtiques.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <GiverReceiverSelect
                      label="Qui"
                      participants={detail.participants}
                      onAdd={(g, r) => addExclusion(g, r)}
                    />
                  </div>
                  <ul className="mt-4 space-y-1 text-sm">
                    {detail.exclusions.map((e) => {
                      const g = detail.participants.find((p) => p.id === e.giverId)?.name ?? e.giverId;
                      const r = detail.participants.find((p) => p.id === e.receiverId)?.name ?? e.receiverId;
                      return (
                        <li key={e.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-1.5">
                          <span>
                            <b>{g}</b> no pot regalar a <b>{r}</b>{' '}
                            <span className="ml-1 rounded bg-gold-100 px-1.5 text-xs text-gold-700">
                              {e.reason}
                            </span>
                          </span>
                          {e.reason === 'MANUAL' && (
                            <button
                              onClick={() => deleteExclusion(e.id)}
                              className="text-red-600 hover:underline"
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function GiverReceiverSelect({
  label,
  participants,
  onAdd,
}: {
  label: string;
  participants: ParticipantRow[];
  onAdd: (giverId: string, receiverId: string) => void;
}) {
  const [giver, setGiver] = useState('');
  const [receiver, setReceiver] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-burgundy-700">{label}</span>
      <select
        value={giver}
        onChange={(e) => setGiver(e.target.value)}
        className="rounded-lg border border-burgundy-200 bg-cream px-2 py-1.5 text-sm"
      >
        <option value="">Qui regala</option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <span className="text-sm text-burgundy-900/50">no regala a</span>
      <select
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
        className="rounded-lg border border-burgundy-200 bg-cream px-2 py-1.5 text-sm"
      >
        <option value="">Qui rep</option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (giver && receiver && giver !== receiver) {
            onAdd(giver, receiver);
            setGiver('');
            setReceiver('');
          }
        }}
        className="rounded-full border border-burgundy-300 px-3 py-1.5 text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
      >
        Afegir exclusió
      </button>
    </div>
  );
}
