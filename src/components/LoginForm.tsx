'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { makeT, type Locale } from '@/lib/i18n';

export default function LoginForm({ locale }: { locale: Locale }) {
  const t = makeT(locale);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(t('login.wrong'));
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError(t('login.connectError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="festive-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-gold-200 bg-white/80 p-8 shadow-xl backdrop-blur">
        <p className="text-center text-4xl">🔐</p>
        <h1 className="mt-3 text-center font-display text-2xl font-black text-burgundy-800">
          {t('login.title')}
        </h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password')}
            autoFocus
            className="w-full rounded-xl border border-burgundy-200 bg-cream px-4 py-3 outline-none focus:ring-2 focus:ring-burgundy-400"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-full bg-burgundy-600 px-6 py-3 font-bold text-cream transition hover:bg-burgundy-700 disabled:opacity-50"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </main>
  );
}
