import type { PublicSiteConversion } from './PublicSiteApp';

export interface PublicConversionPipelineOptions {
  capture: (event: PublicSiteConversion) => void | Promise<void>;
  continueToWhatsApp?: (event: PublicSiteConversion) => void | Promise<void>;
}

/**
 * Composição recomendada para a experiência pública:
 * 1) registra a conversão/lead no CRM;
 * 2) somente após sucesso, continua para WhatsApp quando configurado.
 *
 * Se a captura falhar, a continuação não executa, evitando perder o contexto
 * do lead ao trocar de página.
 */
export function createPublicConversionPipeline(options: PublicConversionPipelineOptions) {
  return async (event: PublicSiteConversion): Promise<void> => {
    await options.capture(event);
    await options.continueToWhatsApp?.(event);
  };
}
