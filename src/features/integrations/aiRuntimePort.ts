import type { AIProviderProfile } from './aiProviderTypes';

export interface AIModelInvocationInput {
  executionId?: string;
  profile: AIProviderProfile;
  instructions: string;
  context?: Record<string, unknown>;
  input?: string;
}

export type AIModelInvocationResult =
  | { status: 'completed'; output: string; metadata?: Record<string, unknown> }
  | { status: 'not_configured'; reason: string }
  | { status: 'failed'; reason: string };

export type AIModelCancelResult =
  | { status: 'cancelled' }
  | { status: 'not_found'; reason?: string }
  | { status: 'not_configured'; reason: string };

export interface AIModelRuntimePort {
  invoke(input: AIModelInvocationInput): Promise<AIModelInvocationResult>;
  cancel?(input: { executionId: string }): Promise<AIModelCancelResult>;
}

export const unconfiguredAIModelRuntime: AIModelRuntimePort = {
  async invoke() {
    return {
      status: 'not_configured',
      reason: 'Adaptador de execução do provedor ainda não foi conectado ao backend seguro.',
    };
  },
  async cancel() {
    return {
      status: 'not_configured',
      reason: 'Cancelamento de execução IA ainda não está conectado ao backend seguro.',
    };
  },
};
