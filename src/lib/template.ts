export const DEFAULT_MESSAGE_TEMPLATE = [
  'Hola {name}! 🎁',
  '',
  "Ja tenim l'Amic Invisible! T'ha tocat regalar a {friend}.",
  '',
  '🎉 {title}',
  '📅 {date}',
  '📍 {location}',
  '💰 Pressupost: {budget}',
  '',
  'Normes:',
  '{rules}',
  '',
  'Revela el teu regal aquí 👉 {link}',
].join('\n');

export function renderMessage(
  template: string | null | undefined,
  vars: Record<string, string>,
): string {
  const t = template && template.trim() ? template : DEFAULT_MESSAGE_TEMPLATE;
  return t.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}
