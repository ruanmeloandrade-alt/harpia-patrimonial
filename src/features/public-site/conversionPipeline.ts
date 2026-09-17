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
 *
 * O retorno `true` significa exclusivamente que a captura no CRM foi aceita.
 * A continuação para WhatsApp é posterior e nunca transforma um lead aceito em
 * falso erro de conversão.
 */
export function createPublicConversionPipeline(options: PublicConversionPipelineOptions) {
  return async (event: PublicSiteConversion): Promise<true> => {
    await options.capture(event);

    if (!options.continueToWhatsApp) return true;

    try {
      await options.continueToWhatsApp(event);
    } catch (error) {
      if (options.onContinuationError) {
        try {
          await options.onContinuationError(error, event);
        } catch {
          // Diagnóstico de uma continuação externa nunca invalida o lead já aceito.
        }
      }
    }

    return true;
  };
}
