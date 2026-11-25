export const DEFAULT_MESSAGE_TEMPLATE_CA = [
  '🎄✨ *AMIC INVISIBLE FAMÍLIA ARBAT* ✨🎄',
  '',
  'Hola *{nom}*! 👋',
  '',
  "Ja s'ha fet el sorteig i ha arribat el moment de descobrir a qui li fas el regal aquest any 🎁",
  '',
  '👇 *Entra al teu enllaç secret (no el comparteixis!):*',
  '',
  '{link}',
].join('\n');

export const DEFAULT_MESSAGE_TEMPLATE_ES = [
  '🎄✨ *AMIGO INVISIBLE FAMILIA ARBAT* ✨🎄',
  '',
  '¡Hola *{nom}*! 👋',
  '',
  'Ya se ha hecho el sorteo y ha llegado el momento de descubrir a quién le haces el regalo este año 🎁',
  '',
  '👇 *Entra en tu enlace secreto (¡no lo compartas!):*',
  '',
  '{link}',
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
