import type { Metadata } from 'next';
import { Nunito, Playfair_Display } from 'next/font/google';
import './globals.css';

const display = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700', '800', '900'],
  display: 'swap',
});

const sans = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Amic Invisible',
    template: '%s · Amic Invisible',
  },
  description: "Sorteig d'Amic Invisible per a la família i els amics, amb WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
