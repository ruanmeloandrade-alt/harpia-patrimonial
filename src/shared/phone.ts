export class PhoneNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhoneNormalizationError';
  }
}

export function normalizeWhatsAppNumber(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;

  if (/[A-Za-z]/.test(raw)) {
    throw new PhoneNormalizationError('O WhatsApp deve conter apenas número, DDI e caracteres de formatação.');
  }

  let digits = raw.replace(/\D/g, '');
  const hasExplicitInternationalPrefix = /^\s*(\+|00)/.test(raw);

  if (digits.startsWith('00')) digits = digits.slice(2);

  if (!hasExplicitInternationalPrefix && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new PhoneNormalizationError('Informe um WhatsApp válido, preferencialmente com DDI.');
  }

  return digits;
}

export function formatWhatsAppNumber(value?: string | null): string {
  const normalized = normalizeWhatsAppNumber(value);
  return normalized ? `+${normalized}` : '';
}
