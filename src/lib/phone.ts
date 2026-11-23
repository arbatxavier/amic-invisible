/**
 * Normalizes a phone number to international digits without '+'.
 * Example: "600 11 22 33", "+34 600112233", "0034 600112233" -> "34600112233"
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  let digits = input.replace(/\D+/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = '34' + digits.slice(1);
  else if (digits.length === 9) digits = '34' + digits;
  return digits;
}

export function isValidPhone(digits: string): boolean {
  return /^\d{10,15}$/.test(digits);
}

export function toWhatsAppJid(phone: string): string {
  return `${phone}@c.us`;
}
