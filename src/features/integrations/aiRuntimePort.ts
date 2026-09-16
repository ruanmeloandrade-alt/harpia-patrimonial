import type { AIProviderProfile } from './aiProviderTypes';

export interface AIModelInvocationInput {
  profile: AIProviderProfile;
  instructions: string;
  context?: Record<string, unknown>;
  input?: string;
}

export type AIModelInvocationResult =
  | { status: 'completed'; output: string; metadata?: Record<string, unknown> }
  | { status: 'not_configured'; reason: string }
  | { status: 'failed'; reason: string };

export interface AIModelRuntimePort {
  invoke(input: AIModelInvocationInput): Promise<AIModelInvocationResult>;
}

export const unconfiguredAIModelRuntime: AIModelRuntimePort = {
  async invoke() {
    return {
      status: 'not_configured',
      reason: 'Adaptador de execução do provedor ainda não foi conectado ao backend seguro.',
    };
  },
};
