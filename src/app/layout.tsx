import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Amic Invisible',
    template: '%s · Amic Invisible',
  },
  description: "Sorteig d'Amic Invisible per a la família i els amics, amb WhatsApp.",
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ca">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
