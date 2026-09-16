import type {
  AIModelCancelResult,
  AIModelInvocationInput,
  AIModelInvocationResult,
  AIModelRuntimePort,
} from './aiRuntimePort';

export interface RemoteAIModelRuntimeTransport {
  invoke(input: {
    executionId?: string;
    profileId: string;
    instructions: string;
    input: string;
    context?: Record<string, unknown>;
  }): Promise<unknown>;
  cancel?(input: { executionId: string }): Promise<unknown>;
}

function normalizeInvocationResult(value: unknown): AIModelInvocationResult {
  if (!value || typeof value !== 'object') {
    return { status: 'failed', reason: 'Resposta inválida do runtime remoto de IA.' };
  }
  const result = value as Record<string, unknown>;
  if (result.status === 'completed' && typeof result.output === 'string') {
    return {
      status: 'completed',
      output: result.output,
      metadata: result.metadata && typeof result.metadata === 'object'
        ? result.metadata as Record<string, unknown>
        : undefined,
    };
  }
  if (result.status === 'not_configured' && typeof result.reason === 'string') {
    return { status: 'not_configured', reason: result.reason };
  }
  if (result.status === 'failed' && typeof result.reason === 'string') {
    return { status: 'failed', reason: result.reason };
  }
  return { status: 'failed', reason: 'Runtime remoto retornou um estado não reconhecido.' };
}

function normalizeCancelResult(value: unknown): AIModelCancelResult {
  if (!value || typeof value !== 'object') {
    return { status: 'not_configured', reason: 'Cancelamento remoto retornou resposta inválida.' };
  }
  const result = value as Record<string, unknown>;
  if (result.status === 'cancelled') return { status: 'cancelled' };
  if (result.status === 'not_found') {
    return { status: 'not_found', reason: typeof result.reason === 'string' ? result.reason : undefined };
  }
  if (result.status === 'not_configured' && typeof result.reason === 'string') {
    return { status: 'not_configured', reason: result.reason };
  }
  return { status: 'not_configured', reason: 'Cancelamento remoto não suportado.' };
}

/**
 * Conecta o AIAgentCommandPort a um executor remoto/Edge Function.
 * O navegador envia apenas profileId + conteúdo operacional; a chave API nunca
 * faz parte deste contrato.
 */
export function createRemoteAIModelRuntime(transport: RemoteAIModelRuntimeTransport): AIModelRuntimePort {
  return {
    async invoke(input: AIModelInvocationInput): Promise<AIModelInvocationResult> {
      try {
        const value = await transport.invoke({
          executionId: input.executionId,
          profileId: input.profile.id,
          instructions: input.instructions,
          input: input.input ?? JSON.stringify(input.context ?? {}),
          context: input.context,
        });
        return normalizeInvocationResult(value);
      } catch (error) {
        return {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Falha ao chamar runtime remoto de IA.',
        };
      }
    },
    async cancel(input): Promise<AIModelCancelResult> {
      if (!transport.cancel) {
        return { status: 'not_configured', reason: 'Executor remoto atual não oferece cancelamento.' };
      }
      try {
        return normalizeCancelResult(await transport.cancel(input));
      } catch (error) {
        return {
          status: 'not_configured',
          reason: error instanceof Error ? error.message : 'Falha ao solicitar cancelamento remoto.',
        };
      }
    },
  };
}
