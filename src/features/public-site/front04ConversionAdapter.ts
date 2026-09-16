import type { PublicSiteConversion } from './PublicSiteApp';
import type { ClientProfileView } from '../client-area/ClientArea';

interface Front04LeadInterest {
  type: 'property' | 'product' | 'service' | 'other';
  referenceId?: string;
  label?: string;
}

export interface Front04LeadConversionEventPort {
  contact: {
    name: string;
    email?: string;
    whatsapp?: string;
  };
  origin: string;
  action?: string;
  page?: string;
  interest?: Front04LeadInterest;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Front04LeadConversionResultPort {
  leadId: string;
  created: true;
  automaticMessageSent: false;
}

export type Front04LeadConversionIngestPort = (
  event: Front04LeadConversionEventPort,
) => Front04LeadConversionResultPort | Promise<Front04LeadConversionResultPort>;

export type PublicConversionHandlingResult =
  | {
      accepted: true;
      leadId: string;
      automaticMessageSent: false;
    }
  | {
      accepted: false;
      reason: 'contact-required';
    };

function resolveInterest(event: PublicSiteConversion): Front04LeadInterest | undefined {
  if (event.propertyId) {
    return {
      type: 'property',
      referenceId: event.propertyId,
      label: event.service,
    };
  }

  if (event.service) {
    return {
      type: 'service',
      label: event.service,
    };
  }

  return undefined;
}

function resolveContact(
  event: PublicSiteConversion,
  currentClient?: ClientProfileView | null,
): Front04LeadConversionEventPort['contact'] | null {
  const name = event.contact?.name?.trim() || currentClient?.name?.trim();
  if (!name) return null;

  return {
    name,
    email: event.contact?.email?.trim() || currentClient?.email?.trim() || undefined,
    whatsapp: event.contact?.whatsapp?.trim() || currentClient?.whatsapp?.trim() || undefined,
  };
}

/**
 * Adapter entre os eventos produzidos pela experiência pública (Frente02)
 * e o contrato de ingestão de lead atualmente exposto pela Frente04.
 *
 * O handler devolvido é compatível diretamente com `PublicSiteApp.onConversion`.
 * Resultados de ingestão são expostos por `onResult`, sem alterar a assinatura
 * pública usada pelos componentes.
 */
export function createFront04ConversionHandler(options: {
  ingest: Front04LeadConversionIngestPort;
  getCurrentClient?: () => ClientProfileView | null;
  onContactRequired?: (event: PublicSiteConversion) => void | Promise<void>;
  onResult?: (
    result: PublicConversionHandlingResult,
    event: PublicSiteConversion,
  ) => void | Promise<void>;
}): (event: PublicSiteConversion) => Promise<void> {
  return async (event: PublicSiteConversion): Promise<void> => {
    const currentClient = options.getCurrentClient?.() ?? null;
    const contact = resolveContact(event, currentClient);

    if (!contact) {
      await options.onContactRequired?.(event);
      await options.onResult?.(
        {
          accepted: false,
          reason: 'contact-required',
        },
        event,
      );
      return;
    }

    const result = await options.ingest({
      contact,
      origin: event.source,
      action: event.action,
      page: event.page,
      interest: resolveInterest(event),
      occurredAt: new Date().toISOString(),
      metadata: event.metadata,
    });

    await options.onResult?.(
      {
        accepted: true,
        leadId: result.leadId,
        automaticMessageSent: false,
      },
      event,
    );
  };
}
