import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="festive-bg flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-forest-600">
          🎄 Sorteig familiar 🎁
        </p>
        <h1 className="font-display text-5xl font-black leading-tight text-burgundy-800 sm:text-7xl">
          Amic <span className="text-gold-500">Invisible</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-burgundy-900/70">
          Organitza el teu amic invisible, reparteix els regals en secret i
          envia-ho tot per WhatsApp. Sense spoilers.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin"
            className="rounded-full bg-burgundy-600 px-8 py-3 font-bold text-cream shadow-lg shadow-burgundy-600/20 transition hover:bg-burgundy-700"
          >
            Organitza un sorteig
          </Link>
          <Link
            href="/admin/login"
            className="rounded-full border border-forest-600 px-8 py-3 font-bold text-forest-700 transition hover:bg-forest-50"
          >
            Panell d'administració
          </Link>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: '📱', title: 'Telèfon compartit', desc: 'Exclusions automàtiques si dos participants comparteixen número.' },
            { icon: '🕵️', title: 'Anti-spoiler', desc: 'Ningú veu la seva parella fins que revela la targeta.' },
            { icon: '💬', title: 'WhatsApp', desc: 'Enviament automàtic de missatges amb enllaç privat.' },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gold-200 bg-white/70 p-5 shadow-sm backdrop-blur"
            >
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-2 font-display text-lg font-bold text-forest-700">{f.title}</h3>
              <p className="mt-1 text-sm text-burgundy-900/60">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
