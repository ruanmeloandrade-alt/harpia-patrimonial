import type { AICredentialInspectResult, AICredentialSaveResult, AICredentialVaultPort } from './aiCredentialPort';

interface FunctionInvokeError {
  message?: string;
}

interface SupabaseFunctionsLike {
  functions: {
    invoke<T = unknown>(
      name: string,
      options: { body: Record<string, unknown> },
    ): Promise<{ data: T | null; error: FunctionInvokeError | null }>;
  };
}

type VaultResponse =
  | { status: 'stored'; secretRef: string }
  | { status: 'identified'; provider: 'openai' | 'anthropic' | 'google_gemini'; providerLabel: string; models: string[] }
  | { status: 'rejected'; reason: string }
  | { status: 'not_configured'; reason: string };

function normalizeResult(data: unknown, error?: FunctionInvokeError | null): AICredentialSaveResult {
  if (error) return { status: 'rejected', reason: error.message?.trim() || 'Falha ao acessar o cofre seguro.' };
  if (!data || typeof data !== 'object') {
    return { status: 'rejected', reason: 'Resposta inválida do cofre seguro.' };
  }
  const result = data as VaultResponse;
  if (result.status === 'stored') {
    return { status: 'stored', secretRef: result.secretRef || '' };
  }
  if (result.status === 'not_configured') return result;
  if (result.status === 'rejected') return result;
  return { status: 'rejected', reason: 'Estado de resposta do cofre não reconhecido.' };
}

function normalizeInspectResult(data: unknown, error?: FunctionInvokeError | null): AICredentialInspectResult {
  if (error) return { status: 'rejected', reason: error.message?.trim() || 'Falha ao validar a credencial.' };
  if (!data || typeof data !== 'object') return { status: 'rejected', reason: 'Resposta inválida ao validar a credencial.' };
  const result = data as VaultResponse;
  if (result.status === 'identified') return { status: 'identified', provider: result.provider, providerLabel: result.providerLabel, models: Array.isArray(result.models) ? result.models : [] };
  if (result.status === 'not_configured') return result;
  if (result.status === 'rejected') return result;
  return { status: 'rejected', reason: 'Estado de resposta da validação não reconhecido.' };
}

/**
 * Adapter para a Edge Function canônica `ai-credential-vault` criada na
 * integração com a Frente01. A sessão/JWT é fornecida pelo cliente Supabase.
 */
export function createSupabaseAICredentialVault(client: SupabaseFunctionsLike): AICredentialVaultPort {
  return {
    async inspectApiKey(input) {
      const { data, error } = await client.functions.invoke<VaultResponse>('ai-credential-vault', {
        body: { action: 'inspect', apiKey: input.apiKey },
      });
      return normalizeInspectResult(data, error);
    },

    async saveApiKey(input) {
      const { data, error } = await client.functions.invoke<VaultResponse>('ai-credential-vault', {
        body: { action: 'save', profileId: input.profileId, apiKey: input.apiKey },
      });
      return normalizeResult(data, error);
    },

    async removeApiKey(input) {
      const { data, error } = await client.functions.invoke<VaultResponse>('ai-credential-vault', {
        body: {
          action: 'remove',
          profileId: input.profileId,
          secretRef: input.secretRef,
        },
      });
      return normalizeResult(data, error);
    },
  };
}
