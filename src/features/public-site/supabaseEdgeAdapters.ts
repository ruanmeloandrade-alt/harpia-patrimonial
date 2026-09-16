import type {
  ClientAreaDataSourcePort,
} from '../client-area/useClientAreaData';
import type {
  ClientAreaDataView,
  ClientHistoryView,
  ClientInterestView,
} from '../client-area/ClientArea';
import type {
  Front04LeadConversionEventPort,
  Front04LeadConversionIngestPort,
  Front04LeadConversionResultPort,
} from './front04ConversionAdapter';

interface EdgeFunctionErrorLike {
  message: string;
}

interface EdgeFunctionResult<T> {
  data: T | null;
  error: EdgeFunctionErrorLike | null;
}

export interface SupabaseFunctionsClientPort {
  functions: {
    invoke<T>(
      name: string,
      options?: { body?: unknown },
    ): Promise<EdgeFunctionResult<T>>;
  };
}

interface PublicLeadIngestResponse {
  ok?: boolean;
  leadId?: unknown;
  created?: unknown;
  automaticMessageSent?: unknown;
  message?: unknown;
}

interface ClientAreaEdgeResponse {
  ok?: boolean;
  data?: unknown;
  message?: unknown;
}

function edgeFailure(
  error: EdgeFunctionErrorLike | null,
  payload: { message?: unknown } | null | undefined,
  fallback: string,
) {
  const message = typeof payload?.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : error?.message?.trim();
  return new Error(message || fallback);
}

function stringOrUndefined(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim();
  return clean || undefined;
}

function normalizeInterests(value: unknown): ClientInterestView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as Record<string, unknown>;
    const id = stringOrUndefined(row.id);
    const label = stringOrUndefined(row.label);
    if (!id || !label) return [];
    return [{
      id,
      label,
      type: stringOrUndefined(row.type),
      detail: stringOrUndefined(row.detail),
    }];
  });
}

function normalizeHistory(value: unknown): ClientHistoryView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const row = candidate as Record<string, unknown>;
    const id = stringOrUndefined(row.id);
    const title = stringOrUndefined(row.title);
    if (!id || !title) return [];
    return [{
      id,
      title,
      detail: stringOrUndefined(row.detail),
      occurredAt: stringOrUndefined(row.occurredAt),
      propertySlug: stringOrUndefined(row.propertySlug),
    }];
  });
}

/**
 * Usa a Edge Function pública controlada `public-lead-ingest`.
 *
 * A função server-side é quem usa `service_role`; a Frente02 nunca recebe nem
 * expõe essa credencial no navegador. O retorno continua obedecendo o contrato
 * da Frente04 e declara explicitamente que não houve mensagem automática.
 */
export function createSupabasePublicLeadIngest(
  client: SupabaseFunctionsClientPort,
): Front04LeadConversionIngestPort {
  return async (
    event: Front04LeadConversionEventPort,
  ): Promise<Front04LeadConversionResultPort> => {
    const result = await client.functions.invoke<PublicLeadIngestResponse>(
      'public-lead-ingest',
      { body: event },
    );

    if (result.error || result.data?.ok !== true) {
      throw edgeFailure(
        result.error,
        result.data,
        'Não foi possível registrar o atendimento.',
      );
    }

    const leadId = stringOrUndefined(result.data.leadId);
    if (!leadId || result.data.created !== true) {
      throw new Error('O backend não confirmou a criação do lead.');
    }

    if (result.data.automaticMessageSent !== false) {
      throw new Error('O backend retornou um estado de mensagem automática inesperado.');
    }

    return {
      leadId,
      created: true,
      automaticMessageSent: false,
    };
  };
}

/**
 * Fonte autenticada da Área do Cliente sobre `client-area-data`.
 *
 * O `clientId` é validado como presença de identidade no fluxo local, mas não
 * é enviado como autoridade para o backend: a Edge Function resolve o dono
 * pelo JWT da sessão atual, impedindo consulta arbitrária de outro cliente.
 */
export function createSupabaseClientAreaDataSource(
  client: SupabaseFunctionsClientPort,
): ClientAreaDataSourcePort {
  return {
    async load(clientId): Promise<ClientAreaDataView> {
      if (!clientId.trim()) throw new Error('Cliente autenticado não identificado.');

      const result = await client.functions.invoke<ClientAreaEdgeResponse>(
        'client-area-data',
        { body: {} },
      );

      if (result.error || result.data?.ok !== true) {
        throw edgeFailure(
          result.error,
          result.data,
          'Não foi possível carregar os dados da área do cliente.',
        );
      }

      const payload = result.data.data;
      const data = payload && typeof payload === 'object'
        ? payload as Record<string, unknown>
        : {};

      return {
        interests: normalizeInterests(data.interests),
        history: normalizeHistory(data.history),
      };
    },
  };
}
