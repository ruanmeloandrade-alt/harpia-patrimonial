import type { AIModelRuntimePort } from './aiRuntimePort';
import { createRemoteAIModelRuntime } from './remoteAIModelRuntime';

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

/**
 * Adapter browser -> Edge Function canônica `ai-model-invoke` da integração
 * F01/F05. A chave API nunca passa pelo navegador: o servidor recebe apenas o
 * profileId, carrega o perfil compartilhado e resolve o segredo no Vault.
 */
export function createSupabaseAIModelRuntime(client: SupabaseFunctionsLike): AIModelRuntimePort {
  return createRemoteAIModelRuntime({
    async invoke(input) {
      const { data, error } = await client.functions.invoke('ai-model-invoke', {
        body: {
          executionId: input.executionId,
          profileId: input.profileId,
          instructions: input.instructions,
          input: input.input,
          context: input.context,
        },
      });
      if (error) throw new Error(error.message?.trim() || 'Falha ao chamar o executor seguro de IA.');
      return data;
    },
  });
}
