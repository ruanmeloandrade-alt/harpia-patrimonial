import type { AICredentialVaultPort } from './aiCredentialPort';

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

interface SaveResponse {
  ok?: boolean;
  secretRef?: string;
  message?: string;
}

interface RemoveResponse {
  ok?: boolean;
  removed?: boolean;
  message?: string;
}

const reason = (message?: string, fallback = 'Falha ao acessar o cofre seguro de credenciais.') =>
  message?.trim() || fallback;

export function createSupabaseAICredentialVault(client: SupabaseFunctionsLike): AICredentialVaultPort {
  return {
    async saveApiKey(input) {
      const { data, error } = await client.functions.invoke<SaveResponse>('ai-credentials', {
        body: { action: 'save', profileId: input.profileId, apiKey: input.apiKey },
      });

      if (error) return { status: 'rejected', reason: reason(error.message) };
      if (!data?.ok || !data.secretRef) {
        return { status: 'rejected', reason: reason(data?.message, 'O backend não confirmou o armazenamento da credencial.') };
      }
      return { status: 'stored', secretRef: data.secretRef };
    },

    async removeApiKey(input) {
      const { data, error } = await client.functions.invoke<RemoveResponse>('ai-credentials', {
        body: { action: 'remove', profileId: input.profileId },
      });

      if (error) return { status: 'rejected', reason: reason(error.message) };
      if (!data?.ok) return { status: 'rejected', reason: reason(data?.message, 'O backend não confirmou a remoção da credencial.') };
      return { status: 'stored', secretRef: input.secretRef ?? 'removed' };
    },
  };
}
