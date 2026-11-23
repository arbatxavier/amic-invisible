export interface IcsInput {
  uid: string;
  title: string;
  start: Date;
  location?: string | null;
  description: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildIcs(input: IcsInput): string {
  const start = new Date(input.start);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Amic Invisible//Amic Invisible 1.0//CA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@amic-invisible`,
    `DTSTAMP:${toUtc(now)}`,
    `DTSTART:${toUtc(start)}`,
    `DTEND:${toUtc(end)}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(input.description)}`,
    `LOCATION:${escapeText(input.location || '')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}
