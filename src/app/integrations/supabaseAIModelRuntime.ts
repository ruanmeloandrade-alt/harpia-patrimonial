import { requireSupabase } from '../../core/supabase/client';
import type {
  AIModelCancelResult,
  AIModelInvocationInput,
  AIModelInvocationResult,
  AIModelRuntimePort,
} from '../../features/integrations/aiRuntimePort';

type EdgeResult =
  | { status: 'completed'; output: string; metadata?: Record<string, unknown> }
  | { status: 'not_configured'; reason: string }
  | { status: 'failed'; reason: string };

export class SupabaseAIModelRuntime implements AIModelRuntimePort {
  async invoke(input: AIModelInvocationInput): Promise<AIModelInvocationResult> {
    const supabase = requireSupabase() as any;
    const { data, error } = await supabase.functions.invoke('ai-model-invoke', {
      body: {
        executionId: input.executionId,
        profileId: input.profile.id,
        instructions: input.instructions,
        input: input.input,
        context: input.context,
      },
    });

    if (error) {
      return {
        status: 'failed',
        reason: error.message || 'Falha ao chamar o runtime seguro de IA.',
      };
    }

    const result = data as EdgeResult | null;
    if (!result || !result.status) {
      return { status: 'failed', reason: 'Runtime seguro de IA retornou uma resposta inválida.' };
    }
    if (result.status === 'completed') {
      return {
        status: 'completed',
        output: result.output,
        metadata: result.metadata,
      };
    }
    if (result.status === 'not_configured') {
      return { status: 'not_configured', reason: result.reason };
    }
    return { status: 'failed', reason: result.reason };
  }

  async cancel(): Promise<AIModelCancelResult> {
    return {
      status: 'not_configured',
      reason: 'Execuções atuais são síncronas; cancelamento remoto ainda não é suportado pelo provedor.',
    };
  }
}
