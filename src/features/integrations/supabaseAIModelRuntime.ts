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
 * Adapter browser -> Edge Function `ai-provider-runtime`.
 * A chave API não passa pelo navegador: o servidor recebe apenas o profileId,
 * resolve o segredo pelo Vault e executa o provedor.
 */
export function createSupabaseAIModelRuntime(client: SupabaseFunctionsLike): AIModelRuntimePort {
  return createRemoteAIModelRuntime({
    async invoke(input) {
      const { data, error } = await client.functions.invoke('ai-provider-runtime', {
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
