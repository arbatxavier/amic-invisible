import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import RevealClient from '@/components/RevealClient';
import { detectLocale, t } from '@/lib/i18n';
import { getEventById, getParticipantByToken } from '@/lib/repo';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const headersList = await headers();
  const locale = detectLocale(headersList.get('accept-language'));

  const participant = getParticipantByToken(token);
  if (!participant) return { title: t(locale, 'appName') };
  const event = getEventById(participant.eventId);
  return {
    title: event?.title ?? t(locale, 'appName'),
    description: t(locale, 'appName'),
    robots: { index: false, follow: false },
  };
}

export default async function RevealPage({ params }: Props) {
  const { token } = await params;

  // Anti-spoiler: assignedTo is NEVER read here and viewedAt is NEVER touched.
  const participant = getParticipantByToken(token);
  if (!participant) notFound();

  const event = getEventById(participant.eventId);
  if (!event) notFound();

  const headersList = await headers();
  const locale = detectLocale(headersList.get('accept-language'));

  const data = {
    token: participant.token,
    name: participant.name,
    viewedAt: participant.viewedAt,
    event: {
      title: event.title,
      eventDate: event.eventDate,
      location: event.location,
      budget: event.budget,
      rules: event.rules,
      rulesEs: event.rulesEs,
    },
  };

  return <RevealClient data={data} locale={locale} />;
}
