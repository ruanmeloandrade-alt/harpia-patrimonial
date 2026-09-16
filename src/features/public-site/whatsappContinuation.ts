import type { PublicSiteConversion } from './PublicSiteApp';

export interface WhatsAppContinuationOptions {
  phone: string;
  baseUrl?: string;
  navigate?: (url: string) => void;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Número de WhatsApp inválido para a integração pública. Use formato internacional com DDI.');
  }
  return digits;
}

function cleanContext(value: unknown, maxLength = 160) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function buildMessage(event: PublicSiteConversion) {
  const lines = ['Olá! Vim pelo site da Hárpia Patrimonial & Co.'];
  const service = cleanContext(event.service);
  const propertySlug = cleanContext(event.propertySlug, 120);
  const city = cleanContext(event.metadata?.city, 120);
  const propertyType = cleanContext(event.metadata?.propertyType, 120);
  const name = cleanContext(event.contact?.name, 120);

  if (service) lines.push(`Interesse: ${service}.`);
  if (propertySlug) lines.push(`Imóvel: ${propertySlug}.`);
  if (city) lines.push(`Cidade: ${city}.`);
  if (propertyType) lines.push(`Tipo de imóvel: ${propertyType}.`);
  if (name) lines.push(`Nome: ${name}.`);

  lines.push('Gostaria de continuar o atendimento.');
  return lines.join('\n');
}

/**
 * Prepara o redirecionamento contextual para WhatsApp sem embutir número
 * fictício na Frente02. O integrador fornece o número real da Hárpia em
 * formato internacional (DDI + DDD + número).
 *
 * A função não cria lead e não dispara mensagem automaticamente: apenas
 * direciona o navegador para a conversa já com o contexto preenchido.
 */
export function createWhatsAppContinuation(options: WhatsAppContinuationOptions) {
  const phone = normalizePhone(options.phone);
  const baseUrl = (options.baseUrl ?? 'https://wa.me').replace(/\/$/, '');
  const navigate = options.navigate ?? ((url: string) => window.location.assign(url));

  return async (event: PublicSiteConversion): Promise<void> => {
    const message = encodeURIComponent(buildMessage(event));
    navigate(`${baseUrl}/${phone}?text=${message}`);
  };
}
