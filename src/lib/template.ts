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

export const DEFAULT_RULES_CA = `📜✨ *NORMES DEL JOC: LES DUES PISTES* ✨📜

1️⃣ *Pista 1 (A FORA de l'embolcall) 👉 PER A QUI ÉS:*
Ha d'indicar qui rep el regal. Sigueu creatius (una endevinalla, un dibuix, una foto, un objecte...), però assegureu-vos que es pugui resoldre!

2️⃣ *Pista 2 (A DINS de l'embolcall) 👉 QUI EL REGALA:*
Un cop obert el paquet, aquesta pista ha d'assenyalar qui és l'amic invisible que l'ha preparat.

🎲 *Com funcionarà el repartiment?*
Mirarem la *Pista 1* entre tots. Quan tinguem clar per a qui és el regal, li passarem el paquet. Llavors l'obrirà, trobarà la *Pista 2* i haurà d'endevinar qui és el seu amic invisible! 🕵️‍♂️

💡 *Exemple:*
Imaginem que a en *Xavier* li toca regalar a la *Judith*:
• *A fora del paquet:* En Xavier posa una pista que fa referència a la Judith. Entre tots dedueixen que és per a ella i li entreguen el regal.
• *A dins del paquet:* Quan la Judith l'obre, troba una pista que apunta cap a en Xavier, i així descobreix qui li ha fet el regal! 🎁`;

export const DEFAULT_RULES_ES = `📜✨ *NORMAS DEL JUEGO: LAS DOS PISTAS* ✨📜

1️⃣ *Pista 1 (POR FUERA del envoltorio) 👉 PARA QUIÉN ES:*
Debe indicar quién recibe el regalo. Sed creativos (una adivinanza, un dibujo, una foto, un objeto...), ¡pero aseguraos de que se pueda resolver!

2️⃣ *Pista 2 (POR DENTRO del envoltorio) 👉 QUIÉN LO REGALA:*
Una vez abierto el paquete, esta pista tiene que señalar quién es el amigo invisible que lo ha preparado.

🎲 *¿Cómo funcionará el reparto?*
Miraremos la *Pista 1* entre todos. Cuando tengamos claro para quién es el regalo, le pasaremos el paquete. Entonces lo abrirá, encontrará la *Pista 2* ¡y tendrá que adivinar quién es su amigo invisible! 🕵️‍♂️

💡 *Ejemplo:*
Imaginemos que a *Xavier* le toca regalar a *Judith*:
• *Por fuera del paquete:* Xavier pone una pista que hace referencia a Judith. Entre todos deducen que es para ella y le entregan el regalo.
• *Por dentro del paquete:* Cuando Judith lo abre, encuentra una pista que apunta hacia Xavier, ¡y así descubre quién le ha hecho el regalo! 🎁`;

export function getDefaultTemplate(lang: string): string {
  return lang === 'es' ? DEFAULT_MESSAGE_TEMPLATE_ES : DEFAULT_MESSAGE_TEMPLATE_CA;
}

export function getDefaultRules(lang: string): string {
  return lang === 'es' ? DEFAULT_RULES_ES : DEFAULT_RULES_CA;
}

export function renderMessage(
  template: string | null | undefined,
  vars: Record<string, string>,
  lang = 'ca',
): string {
  const t = template && template.trim() ? template : getDefaultTemplate(lang);
  return t.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}
