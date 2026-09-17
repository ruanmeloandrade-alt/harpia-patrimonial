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

const forbiddenIdentityMetadataKeys = new Set([
  'clientid',
  'userid',
  'accountid',
  'accounttype',
  'authorization',
  'role',
  'permissions',
  'isadmin',
]);

function normalizeMetadataKey(key: string) {
  return key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sanitizeMetadata(metadata?: Record<string, string | number | boolean>) {
  if (!metadata) return undefined;

  const safeEntries = Object.entries(metadata).filter(
    ([key]) => !forbiddenIdentityMetadataKeys.has(normalizeMetadataKey(key)),
  );

  return safeEntries.length ? Object.fromEntries(safeEntries) : undefined;
}

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
  const whatsapp = event.contact?.whatsapp?.trim() || currentClient?.whatsapp?.trim();
  if (!name || !whatsapp) return null;

  return {
    name,
    email: event.contact?.email?.trim() || currentClient?.email?.trim() || undefined,
    whatsapp,
  };
}

/**
 * Adapter entre os eventos produzidos pela experiência pública (Frente02)
 * e o contrato de ingestão de lead atualmente exposto pela Frente04.
 *
 * O handler devolvido é compatível diretamente com `PublicSiteApp.onConversion`.
 * Resultados de ingestão são expostos por `onResult`, sem alterar a assinatura
 * pública usada pelos componentes.
 *
 * Falta de nome ou WhatsApp é uma falha explícita. Isso garante que um pipeline
 * CRM -> WhatsApp nunca avance sem que a captura do lead tenha sido aceita.
 * Metadados de identidade/autorização fornecidos pelo caller público são
 * descartados: a identidade autenticada deve ser derivada apenas no backend.
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
      const result: PublicConversionHandlingResult = {
        accepted: false,
        reason: 'contact-required',
      };

      await options.onContactRequired?.(event);
      await options.onResult?.(result, event);
      throw new Error('Nome e WhatsApp são obrigatórios para registrar o atendimento.');
    }

    const result = await options.ingest({
      contact,
      origin: event.source,
      action: event.action,
      page: event.page,
      interest: resolveInterest(event),
      occurredAt: new Date().toISOString(),
      metadata: sanitizeMetadata(event.metadata),
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
