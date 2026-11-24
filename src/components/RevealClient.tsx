'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { makeT, type Locale } from '@/lib/i18n';

interface RevealData {
  token: string;
  name: string;
  viewedAt: number | null;
  event: {
    title: string;
    eventDate: number | null;
    location: string | null;
    budget: string | null;
    rules: string | null;
  };
}

function formatDate(ms: number | null): string {
  if (!ms) return '';
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fireConfetti() {
  const colors = ['#8f2a43', '#2e5e43', '#d4a537', '#f2d98b', '#ffffff'];
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 }, colors });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1 }, colors });
  }, 250);
}

export default function RevealClient({ data, locale }: { data: RevealData; locale: Locale }) {
  const t = useMemo(() => makeT(locale), [locale]);

  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = useCallback(async () => {
    if (loading || revealed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/r/${data.token}/reveal`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? t('reveal.error'));
        return;
      }
      setRevealed(json.giftTo.name);
      fireConfetti();
    } catch {
      setError(t('reveal.connectError'));
    } finally {
      setLoading(false);
    }
  }, [data.token, loading, revealed, t]);

  return (
    <main className="festive-bg flex min-h-screen flex-col items-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-3 text-center text-sm font-bold uppercase tracking-[0.25em] text-forest-600">
          🎄 {t('appName')} 🎁
        </p>
        <h1 className="text-center font-display text-4xl font-black text-burgundy-800">
          {t('reveal.greeting', { name: data.name })}
        </h1>
        <p className="mt-2 text-center text-burgundy-900/60">{data.event.title}</p>

        <div className="mt-8 space-y-3 rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm backdrop-blur">
          <InfoRow
            label={`📅 ${t('reveal.date')}`}
            value={data.event.eventDate ? formatDate(data.event.eventDate) : t('reveal.dateUndefined')}
          />
          <InfoRow
            label={`📍 ${t('reveal.location')}`}
            value={data.event.location || t('reveal.locationUndefined')}
          />
          {data.event.budget && (
            <InfoRow label={`💰 ${t('reveal.budget')}`} value={data.event.budget} />
          )}
          {data.event.rules && <InfoRow label={`📜 ${t('reveal.rules')}`} value={data.event.rules} />}
        </div>

        <div className="card-3d mt-8 h-72 w-full">
          <div className="preserve-3d relative h-full w-full">
            <motion.div
              className="backface-hidden absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-burgundy-300 bg-burgundy-50/80 p-6 text-center"
              animate={{ rotateY: revealed ? 180 : 0 }}
              transition={{ duration: 0.7 }}
              onClick={reveal}
              role="button"
              aria-label={t('reveal.cardTitle')}
            >
              <div className="relative text-6xl">
                <span>🧍</span>
                <span className="absolute -right-4 -top-2 text-3xl">❓</span>
              </div>
              <p className="mt-4 font-display text-xl font-bold text-burgundy-700">
                {loading ? t('reveal.revealing') : t('reveal.cardTitle')}
              </p>
              {data.viewedAt && !revealed && (
                <p className="mt-2 text-xs text-burgundy-900/50">{t('reveal.seenBefore')}</p>
              )}
            </motion.div>

            <motion.div
              className="backface-hidden absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-burgundy-600 to-forest-700 p-6 text-center shadow-xl"
              initial={{ rotateY: 180 }}
              animate={{ rotateY: revealed ? 360 : 180 }}
              transition={{ duration: 0.7 }}
            >
              <div className="text-5xl">✨</div>
              <p className="mt-3 font-display text-2xl font-black text-cream">{revealed}</p>
              <p className="mt-1 text-sm text-cream/80">{t('reveal.isPerson')}</p>
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="shrink-0 font-bold text-forest-700">{label}</span>
      <span className="whitespace-pre-wrap text-burgundy-900/80">{value}</span>
    </div>
  );
}
