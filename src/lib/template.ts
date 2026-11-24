export const DEFAULT_MESSAGE_TEMPLATE_CA = [
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

export const DEFAULT_MESSAGE_TEMPLATE_ES = [
  'Hola {name}! 🎁',
  '',
  '¡Ya tenemos el Amigo Invisible! Te ha tocado regalar a {friend}.',
  '',
  '🎉 {title}',
  '📅 {date}',
  '📍 {location}',
  '💰 Presupuesto: {budget}',
  '',
  'Normas:',
  '{rules}',
  '',
  'Revela tu regalo aquí 👉 {link}',
].join('\n');

export function getDefaultTemplate(lang: string): string {
  return lang === 'es' ? DEFAULT_MESSAGE_TEMPLATE_ES : DEFAULT_MESSAGE_TEMPLATE_CA;
}

export function renderMessage(
  template: string | null | undefined,
  vars: Record<string, string>,
  lang = 'ca',
): string {
  const t = template && template.trim() ? template : getDefaultTemplate(lang);
  return t.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}
