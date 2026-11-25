'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { makeT, type Locale } from '@/lib/i18n';
import Modal from '@/components/Modal';
import {
  DEFAULT_MESSAGE_TEMPLATE_CA,
  DEFAULT_MESSAGE_TEMPLATE_ES,
  DEFAULT_RULES_CA,
  DEFAULT_RULES_ES,
} from '@/lib/template';

type EventStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
type WhatsappStatus = 'PENDING' | 'SENT' | 'FAILED';
type TFunc = ReturnType<typeof makeT>;

interface EventRow {
  id: string;
  title: string;
  eventDate: number | null;
  location: string | null;
  budget: string | null;
  rules: string | null;
  rulesEs: string | null;
  status: EventStatus;
  avoidTwoCycles: boolean;
  messageTemplate: string | null;
  messageTemplateEs: string | null;
  createdAt: number;
  updatedAt: number;
  participantCount: number;
}

interface ParticipantRow {
  id: string;
  eventId: string;
  name: string;
  phone: string | null;
  language: string;
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

type ModalState =
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
      onConfirm: () => void | Promise<void>;
    }
  | { kind: 'info'; title: string; message: string }
  | { kind: 'link'; url: string }
  | { kind: 'groups' }
  | null;

const drawErrorKeys: Record<string, string> = {
  NOT_ENOUGH: 'admin.errors.drawNotEnough',
  EMPTY_DOMAIN: 'admin.errors.drawEmptyDomain',
  NO_SOLUTION: 'admin.errors.drawNoSolution',
};

function fmtDate(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function dateToTimestamp(v: string): number | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d).getTime();
}

function toDateInput(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const waColor: Record<WhatsappStatus, string> = {
  PENDING: 'bg-gold-100 text-gold-700',
  SENT: 'bg-forest-100 text-forest-700',
  FAILED: 'bg-red-100 text-red-700',
};

const statusColor: Record<EventStatus, string> = {
  DRAFT: 'bg-gray-200 text-gray-700',
  ACTIVE: 'bg-forest-100 text-forest-700',
  ARCHIVED: 'bg-burgundy-100 text-burgundy-700',
};

export default function AdminPanel({ locale }: { locale: Locale }) {
  const t = useMemo(() => makeT(locale), [locale]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [revealedAssignments, setRevealedAssignments] = useState<Set<string>>(new Set());

  const [waha, setWaha] = useState<{
    configured: boolean;
    status?: string | null;
    me?: { phone: string; name: string | null } | null;
    error?: string;
  } | null>(null);
  const [qrNonce, setQrNonce] = useState(0);

  const [sendingAll, setSendingAll] = useState(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [groups, setGroups] = useState<{ id: string; name: string }[] | null>(null);

  const readOnly = detail ? detail.event.status !== 'DRAFT' : false;
  const isActive = detail?.event.status === 'ACTIVE';
  const isArchived = detail?.event.status === 'ARCHIVED';

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' });
      const json = await res.json();
      setEvents(json.events ?? []);
    } catch {
      setError(t('admin.errors.loadEvents'));
    } finally {
      setLoadingEvents(false);
    }
  }, [t]);

  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' });
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
      setWaha({
        configured: true,
        status: json.status ?? null,
        me: json.me ?? null,
        error: json.error,
      });
    } catch (e) {
      setWaha({
        configured: true,
        error: e instanceof Error ? e.message : 'WAHA not available',
      });
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => loadWaha(), 5000);
    return () => clearInterval(id);
  }, [loadWaha]);

  useEffect(() => {
    loadEvents();
    loadWaha();
  }, [loadEvents, loadWaha]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleConfirm() {
    if (modal?.kind !== 'confirm') return;
    const fn = modal.onConfirm;
    setModal(null);
    await fn();
  }

  async function createEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      title: fd.get('title'),
    };
    const res = await fetch('/api/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? t('admin.errors.createEvent'));
      return;
    }
    form.reset();
    await loadEvents();
  }

  function confirmDraw() {
    setModal({
      kind: 'confirm',
      title: t('admin.modal.drawTitle'),
      message: t('admin.modal.drawMessage'),
      confirmLabel: t('common.confirm'),
      onConfirm: doDraw,
    });
  }

  async function doDraw() {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/events/${selectedId}/draw`, { method: 'POST' });
    const json = await res.json();
    if (!res.ok) {
      const msg =
        json.code && drawErrorKeys[json.code]
          ? t(drawErrorKeys[json.code])
          : json.error ?? t('admin.errors.drawFail');
      setModal({ kind: 'info', title: t('admin.modal.drawErrorTitle'), message: msg });
      return;
    }
    await loadDetail(selectedId);
    await loadEvents();
  }

  function confirmDeleteEvent(id: string) {
    setModal({
      kind: 'confirm',
      title: t('admin.modal.deleteTitle'),
      message: t('admin.errors.confirmDelete'),
      confirmLabel: t('common.confirm'),
      danger: true,
      onConfirm: async () => {
        await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
        setSelectedId(null);
        setDetail(null);
        await loadEvents();
      },
    });
  }

  function confirmArchive(id: string) {
    setModal({
      kind: 'confirm',
      title: t('admin.modal.archiveTitle'),
      message: t('admin.modal.archiveMessage'),
      confirmLabel: t('common.confirm'),
      onConfirm: async () => {
        await fetch(`/api/admin/events/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ARCHIVED' }),
        });
        await loadEvents();
        if (selectedId === id) await loadDetail(id);
      },
    });
  }

  async function updateEventField(field: string, value: unknown) {
    if (!selectedId) return;
    await fetch(`/api/admin/events/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    await loadDetail(selectedId);
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
      setModal({
        kind: 'info',
        title: t('admin.modal.addErrorTitle'),
        message: json.error ?? t('admin.errors.addFail'),
      });
      return;
    }
    await loadDetail(selectedId);
    await loadEvents();
  }

  async function deleteParticipant(id: string) {
    await fetch(`/api/admin/participants/${id}`, { method: 'DELETE' });
    if (selectedId) {
      await loadDetail(selectedId);
      await loadEvents();
    }
  }

  async function updateParticipant(id: string, payload: Record<string, unknown>) {
    await fetch(`/api/admin/participants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (selectedId) await loadDetail(selectedId);
  }

  async function addExclusion(giverId: string, receiverId: string) {
    if (!selectedId) return;
    await fetch(`/api/admin/events/${selectedId}/exclusions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ giverId, receiverId }),
    });
    await loadDetail(selectedId);
  }

  async function deleteExclusion(id: string) {
    await fetch(`/api/admin/exclusions/${id}`, { method: 'DELETE' });
    if (selectedId) await loadDetail(selectedId);
  }

  async function sendAll() {
    if (!selectedId) return;
    const id = selectedId;
    setSendingAll(true);
    try {
      const res = await fetch(`/api/admin/events/${id}/send-all`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setModal({
          kind: 'info',
          title: t('admin.modal.sendErrorTitle'),
          message: json.error ?? t('admin.errors.sendFail'),
        });
        return;
      }
      for (const f of json.failed ?? []) {
        if (f.fallback) window.open(f.fallback, '_blank');
      }
      setModal({
        kind: 'info',
        title: t('admin.modal.sendAllTitle'),
        message: t('admin.send.result', {
          sent: json.sent ?? 0,
          failed: (json.failed ?? []).length,
        }),
      });
    } catch {
      setModal({
        kind: 'info',
        title: t('admin.modal.sendErrorTitle'),
        message: t('admin.errors.sendFail'),
      });
    } finally {
      setSendingAll(false);
      await loadDetail(id);
    }
  }

  async function sendOne(id: string) {
    try {
      const res = await fetch(`/api/admin/participants/${id}/send-whatsapp`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok && json.fallback) window.open(json.fallback, '_blank');
      if (!res.ok && json.error) {
        setModal({ kind: 'info', title: t('admin.modal.sendErrorTitle'), message: json.error });
        return;
      }
    } catch {
      setModal({ kind: 'info', title: t('admin.modal.sendErrorTitle'), message: t('admin.errors.sendFail') });
      return;
    }
    if (selectedId) await loadDetail(selectedId);
  }

  function openLink(token: string) {
    const url = `${window.location.origin}/r/${token}`;
    setModal({ kind: 'link', url });
  }

  function toggleReveal(id: string) {
    setRevealedAssignments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function openImportModal() {
    setGroups(null);
    setModal({ kind: 'groups' });
    try {
      const res = await fetch('/api/admin/waha/groups', { cache: 'no-store' });
      const json = await res.json();
      setGroups(json.groups ?? []);
    } catch {
      setGroups([]);
    }
  }

  async function importGroup(groupId: string) {
    if (!selectedId) return;
    const res = await fetch(`/api/admin/events/${selectedId}/import-group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    });
    const json = await res.json();
    setModal(null);
    if (!res.ok) {
      setModal({
        kind: 'info',
        title: t('admin.modal.importTitle'),
        message: json.error ?? t('admin.errors.addFail'),
      });
      return;
    }
    setModal({
      kind: 'info',
      title: t('admin.modal.importTitle'),
      message: t('admin.modal.importResult', { n: json.imported ?? 0 }),
    });
    await loadDetail(selectedId);
    await loadEvents();
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  function confirmUnlinkWaha() {
    setModal({
      kind: 'confirm',
      title: t('admin.modal.unlinkTitle'),
      message: t('admin.modal.unlinkMessage'),
      confirmLabel: t('common.confirm'),
      onConfirm: async () => {
        await fetch('/api/admin/waha/logout', { method: 'POST' });
        setQrNonce((n) => n + 1);
        await loadWaha();
      },
    });
  }

  return (
    <main className="festive-bg min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gold-200 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-display text-xl font-black text-burgundy-800">
              🎄 {t('appName')}
            </h1>
            <p className="text-xs text-burgundy-900/50">{t('admin.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={logout}
              className="rounded-full border border-burgundy-300 px-4 py-1.5 text-sm font-bold text-burgundy-700 transition hover:bg-burgundy-50"
            >
              {t('admin.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {!selectedId ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                <h2 className="font-display text-lg font-bold text-forest-700">
                  {t('admin.newEvent.title')}
                </h2>
                <form onSubmit={createEvent} className="mt-4 flex gap-2">
                  <input
                    name="title"
                    required
                    className="flex-1 rounded-full border border-burgundy-200 bg-cream px-4 py-2.5"
                    placeholder={t('admin.newEvent.titlePlaceholder')}
                  />
                  <button
                    type="submit"
                    className="rounded-full bg-burgundy-600 px-6 py-2.5 font-bold text-cream transition hover:bg-burgundy-700"
                  >
                    {t('admin.newEvent.submit')}
                  </button>
                </form>
              </div>

              <div className="mt-6">
                <h2 className="mb-3 font-display text-lg font-bold text-forest-700">
                  {t('admin.events.title')}
                </h2>
                {loadingEvents ? (
                  <p className="text-sm text-burgundy-900/50">{t('admin.events.loading')}</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-burgundy-900/50">{t('admin.events.empty')}</p>
                ) : (
                  <ul className="space-y-3">
                    {events.map((ev) => (
                      <li
                        key={ev.id}
                        className="rounded-2xl border border-gold-200 bg-white/70 p-4 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button onClick={() => setSelectedId(ev.id)} className="text-left">
                            <span className="font-display text-lg font-bold text-burgundy-800 hover:underline">
                              {ev.title}
                            </span>
                            <span className="ml-2 text-sm text-burgundy-900/50">
                              {fmtDate(ev.eventDate) || t('admin.events.withoutDate')} ·{' '}
                              {t('admin.events.participants', { n: ev.participantCount })}
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusColor[ev.status]}`}>
                              {t(`admin.status.${ev.status}`)}
                            </span>
                            <button
                              onClick={() => confirmDeleteEvent(ev.id)}
                              className="rounded-full border border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50"
                            >
                              {t('admin.events.delete')}
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
                <h2 className="font-display text-lg font-bold text-forest-700">
                  {t('admin.waha.title')}
                </h2>

                {waha?.configured === false ? (
                  <p className="mt-1 text-sm text-burgundy-900/60">
                    {t('admin.waha.notConfigured')}
                  </p>
                ) : waha?.status === 'WORKING' && waha.me ? (
                  <div className="mt-3">
                    <div className="flex items-center gap-3 rounded-xl bg-forest-50 px-4 py-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <p className="font-bold text-forest-700">
                          {t('admin.waha.linked', { phone: waha.me.phone })}
                        </p>
                        {waha.me.name && (
                          <p className="text-sm text-forest-600">{waha.me.name}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={confirmUnlinkWaha}
                      className="mt-3 w-full rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                    >
                      {t('admin.waha.unlink')}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3">
                    {waha?.error && (
                      <p className="mb-2 text-center text-xs text-red-600">{waha.error}</p>
                    )}
                    <img
                      key={qrNonce}
                      src={`/api/admin/waha/qr?t=${qrNonce}`}
                      alt="WhatsApp QR"
                      className="mx-auto h-48 w-48 rounded-xl bg-white p-2 shadow"
                    />
                    <button
                      onClick={() => setQrNonce((n) => n + 1)}
                      className="mt-3 w-full rounded-full bg-forest-600 px-4 py-2 text-sm font-bold text-cream hover:bg-forest-700"
                    >
                      {t('admin.waha.refresh')}
                    </button>
                    <p className="mt-2 text-center text-xs text-burgundy-900/50">
                      {t('admin.waha.hint')}
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
              {t('admin.detail.back')}
            </button>

            {detail && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-black text-burgundy-800">
                      {detail.event.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[detail.event.status]}`}>
                        {t(`admin.status.${detail.event.status}`)}
                      </span>
                      {isActive && (
                        <button
                          onClick={() => confirmArchive(detail.event.id)}
                          className="rounded-full border border-burgundy-300 px-3 py-1 text-xs font-bold text-burgundy-700 hover:bg-burgundy-50"
                        >
                          {t('admin.archive')}
                        </button>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <p className="mt-3 rounded-xl bg-forest-50 px-4 py-2 text-sm text-forest-700">
                      {t('admin.detail.activeHint')}
                    </p>
                  )}
                  {isArchived && (
                    <p className="mt-3 rounded-xl bg-burgundy-50 px-4 py-2 text-sm text-burgundy-700">
                      {t('admin.detail.archivedHint')}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.date')}
                      </span>
                      <input
                        type="date"
                        defaultValue={toDateInput(detail.event.eventDate)}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('eventDate', dateToTimestamp(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.location')}
                      </span>
                      <input
                        defaultValue={detail.event.location ?? ''}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('location', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.budget')}
                      </span>
                      <input
                        defaultValue={detail.event.budget ?? ''}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('budget', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 disabled:opacity-60"
                      />
                    </label>
                  </div>

                  <h3 className="mt-6 font-display text-lg font-bold text-forest-700">
                    {t('admin.detail.rules')}
                  </h3>
                  <p className="text-xs text-burgundy-900/50">{t('admin.detail.templateHint')}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.catalan')}
                      </span>
                      <textarea
                        rows={12}
                        defaultValue={detail.event.rules ?? ''}
                        placeholder={DEFAULT_RULES_CA}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('rules', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.spanish')}
                      </span>
                      <textarea
                        rows={12}
                        defaultValue={detail.event.rulesEs ?? ''}
                        placeholder={DEFAULT_RULES_ES}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('rulesEs', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 disabled:opacity-60"
                      />
                    </label>
                  </div>

                  <h3 className="mt-6 font-display text-lg font-bold text-forest-700">
                    {t('admin.detail.templates')}
                  </h3>
                  <p className="text-xs text-burgundy-900/50">{t('admin.detail.templateHint')}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.catalan')}
                      </span>
                      <textarea
                        rows={6}
                        defaultValue={detail.event.messageTemplate ?? ''}
                        placeholder={DEFAULT_MESSAGE_TEMPLATE_CA}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('messageTemplate', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 font-mono text-xs disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold text-burgundy-700">
                        {t('admin.detail.spanish')}
                      </span>
                      <textarea
                        rows={6}
                        defaultValue={detail.event.messageTemplateEs ?? ''}
                        placeholder={DEFAULT_MESSAGE_TEMPLATE_ES}
                        disabled={isArchived}
                        onBlur={(e) => updateEventField('messageTemplateEs', e.target.value)}
                        className="mt-1 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 font-mono text-xs disabled:opacity-60"
                      />
                    </label>
                  </div>
<label className="mt-3 flex items-center gap-2 text-sm font-bold text-burgundy-700">
                    <input
                      type="checkbox"
                      defaultChecked={detail.event.avoidTwoCycles}
                      disabled={readOnly}
                      onChange={(e) => updateEventField('avoidTwoCycles', e.target.checked)}
                      className="h-4 w-4 accent-burgundy-600"
                    />
                    {t('admin.detail.avoidTwoCycles')}
                  </label>
                  {!readOnly && (
                    <>
                      <button
                        onClick={confirmDraw}
                        disabled={detail.participants.length < 2}
                        className="mt-4 rounded-full bg-burgundy-600 px-6 py-2.5 font-bold text-cream transition hover:bg-burgundy-700 disabled:opacity-50"
                      >
                        {t('admin.detail.draw')}
                      </button>
                      {detail.participants.length < 2 && (
                        <p className="mt-2 text-xs text-burgundy-900/50">
                          {t('admin.detail.needParticipants')}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-forest-700">
                    {t('admin.participants.title', { n: detail.participants.length })}
                  </h3>

                  {!readOnly && (
                    <>
                      <p className="text-xs text-burgundy-900/50">{t('admin.participants.help')}</p>
                      <textarea
                        id="bulkParticipants"
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 text-sm"
                        placeholder={t('admin.participants.placeholder')}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            const el = document.getElementById('bulkParticipants') as HTMLTextAreaElement;
                            addParticipants(el.value);
                            el.value = '';
                          }}
                          className="rounded-full bg-forest-600 px-5 py-2 text-sm font-bold text-cream hover:bg-forest-700"
                        >
                          {t('admin.participants.add')}
                        </button>
                        <button
                          onClick={openImportModal}
                          className="rounded-full border border-forest-300 px-5 py-2 text-sm font-bold text-forest-700 hover:bg-forest-50"
                        >
                          {t('admin.participants.importGroup')}
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gold-200 text-left text-xs text-burgundy-900/50">
                          <th className="py-2 pr-2">{t('admin.participants.colName')}</th>
                          <th className="py-2 pr-2">{t('admin.participants.colPhone')}</th>
                          <th className="py-2 pr-2">{t('admin.participants.colLang')}</th>
                          <th className="py-2 pr-2">{t('admin.participants.colGivesTo')}</th>
                          <th className="py-2 pr-2">{t('admin.participants.colWhatsapp')}</th>
                          <th className="py-2 pr-2">{t('admin.participants.colViewed')}</th>
                          <th className="py-2">{t('admin.participants.colActions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.participants.map((p) => (
                          <tr key={p.id} className="border-b border-gold-100">
                            <td className="py-2 pr-2">
                              <input
                                defaultValue={p.name}
                                disabled={readOnly}
                                onBlur={(e) => updateParticipant(p.id, { name: e.target.value })}
                                className="w-full rounded border border-transparent bg-transparent px-1 py-1 hover:border-burgundy-200 disabled:cursor-default"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                defaultValue={p.phone ?? ''}
                                disabled={readOnly}
                                onBlur={(e) => updateParticipant(p.id, { phone: e.target.value })}
                                className="w-28 rounded border border-transparent bg-transparent px-1 py-1 hover:border-burgundy-200 disabled:cursor-default"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <select
                                value={p.language}
                                disabled={isArchived}
                                onChange={(e) => updateParticipant(p.id, { language: e.target.value })}
                                className="rounded border border-transparent bg-transparent px-1 py-1 text-sm hover:border-burgundy-200 disabled:cursor-default"
                              >
                                <option value="ca">CA</option>
                                <option value="es">ES</option>
                              </select>
                            </td>
                            <td className="py-2 pr-2">
                              {p.assignedToName ? (
                                <button
                                  onClick={() => toggleReveal(p.id)}
                                  title={t('admin.participants.revealHint')}
                                  className="font-bold text-forest-700 hover:underline"
                                >
                                  {revealedAssignments.has(p.id) ? p.assignedToName : '****'}
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-2 pr-2">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${waColor[p.whatsappStatus]}`}>
                                {p.whatsappStatus}
                              </span>
                            </td>
                            <td className="py-2 pr-2">{p.viewedAt ? '👁' : '—'}</td>
                            <td className="py-2">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => openLink(p.token)}
                                  className="rounded border border-burgundy-200 px-2 py-0.5 text-xs text-burgundy-700 hover:bg-burgundy-50"
                                >
                                  {t('admin.participants.actionLink')}
                                </button>
                                {isActive && (
                                  <button
                                    onClick={() => sendOne(p.id)}
                                    className="rounded border border-forest-200 px-2 py-0.5 text-xs text-forest-700 hover:bg-forest-50"
                                  >
                                    {t('admin.participants.actionSend')}
                                  </button>
                                )}
                                {!readOnly && (
                                  <button
                                    onClick={() => deleteParticipant(p.id)}
                                    className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {isActive && (
                    <div className="mt-4">
                      <button
                        onClick={sendAll}
                        disabled={sendingAll || detail.participants.filter((p) => p.phone && p.whatsappStatus !== 'SENT').length === 0}
                        className="rounded-full bg-gold-500 px-5 py-2 text-sm font-bold text-burgundy-900 hover:bg-gold-400 disabled:opacity-50"
                      >
                        {sendingAll ? t('admin.send.sendingAll') : t('admin.send.sendAll')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm">
                  <h3 className="font-display text-lg font-bold text-forest-700">
                    {t('admin.exclusions.title')}
                  </h3>
                  {!readOnly && (
                    <>
                      <p className="text-xs text-burgundy-900/50">{t('admin.exclusions.help')}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <ExclusionEditor
                          t={t}
                          participants={detail.participants}
                          onAdd={(g, r) => addExclusion(g, r)}
                        />
                      </div>
                    </>
                  )}
                  <ul className="mt-4 space-y-1 text-sm">
                    {detail.exclusions.map((e) => {
                      const g = detail.participants.find((p) => p.id === e.giverId)?.name ?? e.giverId;
                      const r = detail.participants.find((p) => p.id === e.receiverId)?.name ?? e.receiverId;
                      return (
                        <li key={e.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-1.5">
                          <span>
                            {t('admin.exclusions.cannotGive', { giver: g, receiver: r })}{' '}
                            <span className="ml-1 rounded bg-gold-100 px-1.5 text-xs text-gold-700">
                              {e.reason}
                            </span>
                          </span>
                          {e.reason === 'MANUAL' && !readOnly && (
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

      {modal?.kind === 'confirm' && (
        <Modal
          open
          title={modal.title}
          onClose={() => setModal(null)}
          footer={
            <>
              <button
                onClick={() => setModal(null)}
                className="rounded-full border border-burgundy-300 px-4 py-2 text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                className={`rounded-full px-5 py-2 text-sm font-bold text-cream ${
                  modal.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-burgundy-600 hover:bg-burgundy-700'
                }`}
              >
                {modal.confirmLabel}
              </button>
            </>
          }
        >
          <p className="whitespace-pre-wrap">{modal.message}</p>
        </Modal>
      )}

      {modal?.kind === 'info' && (
        <Modal
          open
          title={modal.title}
          onClose={() => setModal(null)}
          footer={
            <button
              onClick={() => setModal(null)}
              className="rounded-full bg-burgundy-600 px-5 py-2 text-sm font-bold text-cream hover:bg-burgundy-700"
            >
              {t('common.ok')}
            </button>
          }
        >
          <p className="whitespace-pre-wrap">{modal.message}</p>
        </Modal>
      )}

      {modal?.kind === 'link' && (
        <Modal
          open
          title={t('admin.modal.linkTitle')}
          onClose={() => setModal(null)}
          footer={
            <button
              onClick={() => setModal(null)}
              className="rounded-full border border-burgundy-300 px-4 py-2 text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
            >
              {t('common.ok')}
            </button>
          }
        >
          <LinkContent url={modal.url} t={t} />
        </Modal>
      )}

      {modal?.kind === 'groups' && (
        <Modal
          open
          title={t('admin.modal.importTitle')}
          onClose={() => setModal(null)}
          footer={
            <button
              onClick={() => setModal(null)}
              className="rounded-full border border-burgundy-300 px-4 py-2 text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
            >
              {t('common.cancel')}
            </button>
          }
        >
          <p className="text-xs text-burgundy-900/50">{t('admin.modal.importHint')}</p>
          {groups === null ? (
            <p className="mt-3 text-sm text-burgundy-900/50">{t('admin.events.loading')}</p>
          ) : groups.length === 0 ? (
            <p className="mt-3 text-sm text-burgundy-900/50">{t('admin.modal.noGroups')}</p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => importGroup(g.id)}
                    className="w-full rounded-xl border border-burgundy-200 bg-cream px-4 py-2 text-left text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </main>
  );
}

function LinkContent({ url, t }: { url: string; t: TFunc }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-burgundy-200 bg-cream px-3 py-2 text-sm"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={copy}
          className="flex-1 rounded-full bg-forest-600 px-4 py-2 text-sm font-bold text-cream hover:bg-forest-700"
        >
          {copied ? t('common.copied') : t('common.copy')}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-full border border-burgundy-300 px-4 py-2 text-center text-sm font-bold text-burgundy-700 hover:bg-burgundy-50"
        >
          {t('common.open')}
        </a>
      </div>
    </div>
  );
}

function ExclusionEditor({
  t,
  participants,
  onAdd,
}: {
  t: TFunc;
  participants: ParticipantRow[];
  onAdd: (giverId: string, receiverId: string) => void;
}) {
  const [giver, setGiver] = useState('');
  const [receiver, setReceiver] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-bold text-burgundy-700">{t('admin.exclusions.who')}</span>
      <select
        value={giver}
        onChange={(e) => setGiver(e.target.value)}
        className="rounded-lg border border-burgundy-200 bg-cream px-2 py-1.5 text-sm"
      >
        <option value="">{t('admin.exclusions.whoGives')}</option>
        {participants.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <span className="text-sm text-burgundy-900/50">{t('admin.exclusions.notTo')}</span>
      <select
        value={receiver}
        onChange={(e) => setReceiver(e.target.value)}
        className="rounded-lg border border-burgundy-200 bg-cream px-2 py-1.5 text-sm"
      >
        <option value="">{t('admin.exclusions.whoReceives')}</option>
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
        {t('admin.exclusions.add')}
      </button>
    </div>
  );
}
