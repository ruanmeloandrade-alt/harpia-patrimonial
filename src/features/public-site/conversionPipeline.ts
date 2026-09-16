import type { PublicSiteConversion } from './PublicSiteApp';

export interface PublicConversionPipelineOptions {
  capture: (event: PublicSiteConversion) => void | Promise<void>;
  continueToWhatsApp?: (event: PublicSiteConversion) => void | Promise<void>;
  onContinuationError?: (error: unknown, event: PublicSiteConversion) => void | Promise<void>;
}

/**
 * Composição recomendada para a experiência pública:
 * 1) registra a conversão/lead no CRM;
 * 2) somente após sucesso, continua para WhatsApp quando configurado.
 *
 * A captura é a fonte de verdade do sucesso da conversão. Se ela falhar, a
 * continuação não executa. Se o lead já foi aceito e apenas o redirecionamento
 * externo falhar, o pipeline preserva o sucesso da captura e sinaliza a falha
 * opcionalmente por `onContinuationError`, evitando falso negativo na UI.
 */
export function createPublicConversionPipeline(options: PublicConversionPipelineOptions) {
  return async (event: PublicSiteConversion): Promise<void> => {
    await options.capture(event);

    if (!options.continueToWhatsApp) return;

    try {
      await options.continueToWhatsApp(event);
    } catch (error) {
      await options.onContinuationError?.(error, event);
    }
  };
}
