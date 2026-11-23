import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RevealClient from '@/components/RevealClient';
import { getEventById, getParticipantByToken } from '@/lib/repo';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const participant = getParticipantByToken(token);
  if (!participant) return { title: 'Amic Invisible' };
  const event = getEventById(participant.eventId);
  return {
    title: event?.title ?? 'Amic Invisible',
    description: "El teu sorteig d'Amic Invisible",
    robots: { index: false, follow: false },
  };
}

export default async function RevealPage({ params }: Props) {
  const { token } = await params;

  // Anti-spoiler: aquí MAI es llegeix assignedTo ni es modifica viewedAt.
  const participant = getParticipantByToken(token);
  if (!participant) notFound();

  const event = getEventById(participant.eventId);
  if (!event) notFound();

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
    },
  };

  return <RevealClient data={data} />;
}
