import type { PublicSiteConversion } from './PublicSiteApp';

export interface WhatsAppContinuationOptions {
  phone: string;
  baseUrl?: string;
  navigate?: (url: string) => void;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) {
    throw new Error('Número de WhatsApp inválido para a integração pública.');
  }
  return digits;
}

function buildMessage(event: PublicSiteConversion) {
  const lines = ['Olá! Vim pelo site da Hárpia Patrimonial & Co.'];

  if (event.service) lines.push(`Interesse: ${event.service}.`);
  if (event.propertySlug) lines.push(`Imóvel: ${event.propertySlug}.`);
  if (event.metadata?.city) lines.push(`Cidade: ${String(event.metadata.city)}.`);
  if (event.metadata?.propertyType) lines.push(`Tipo de imóvel: ${String(event.metadata.propertyType)}.`);
  if (event.contact?.name) lines.push(`Nome: ${event.contact.name}.`);

  lines.push('Gostaria de continuar o atendimento.');
  return lines.join('\n');
}

/**
 * Prepara o redirecionamento contextual para WhatsApp sem embutir número
 * fictício na Frente02. O integrador fornece o número real da Hárpia.
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
