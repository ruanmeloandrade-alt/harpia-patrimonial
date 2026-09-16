import type { AIAgentCommandPort, AutomationCommandResult } from '../automations/contracts';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import type { AIModelRuntimePort } from '../integrations/aiRuntimePort';
import { unconfiguredAIModelRuntime } from '../integrations/aiRuntimePort';
import { listAIAgents } from './repository';
import {
  finishAIAgentExecution,
  listAIAgentExecutions,
  startAIAgentExecution,
  updateAIAgentExecution,
} from './executionRepository';

const buildInstructions = (agent: ReturnType<typeof listAIAgents>[number]) =>
  [
    agent.role ? `Função: ${agent.role}` : '',
    agent.instructions,
    agent.rules ? `Regras:\n${agent.rules}` : '',
    agent.context ? `Contexto-base:\n${agent.context}` : '',
  ].filter(Boolean).join('\n\n');

export function createAIAgentCommandPort(runtime: AIModelRuntimePort = unconfiguredAIModelRuntime): AIAgentCommandPort {
  return {
    async invoke(input): Promise<AutomationCommandResult> {
      const agent = listAIAgents().find((item) => item.id === input.agentId);
      if (!agent) return { status: 'rejected', reason: 'Agente IA não encontrado.' };
      if (agent.status !== 'active') return { status: 'rejected', reason: 'Agente IA precisa estar ativo.' };
      if (!agent.providerProfileId) return { status: 'rejected', reason: 'Agente IA não possui perfil de provedor selecionado.' };

      const profile = listAIProviderProfiles().find((item) => item.id === agent.providerProfileId);
      if (!profile) return { status: 'rejected', reason: 'Perfil de provedor IA não encontrado.' };
      if (profile.status !== 'ready' || !profile.apiKeyConfigured || !profile.secretRef) {
        return { status: 'not_configured', reason: 'Perfil de provedor/modelo ainda não possui credencial segura pronta.' };
      }

      const execution = startAIAgentExecution({
        agentId: agent.id,
        providerProfileId: profile.id,
        leadId: input.leadId,
        conversationId: input.conversationId,
      });

      try {
        const result = await runtime.invoke({
          executionId: execution.id,
          profile,
          instructions: buildInstructions(agent),
          input: input.input,
          context: input.context,
        });

        if (result.status === 'completed') {
          finishAIAgentExecution(execution.id, 'completed');
          return {
            status: 'accepted',
            executionId: execution.id,
            data: { output: result.output, ...(result.metadata ? { metadata: result.metadata } : {}) },
          };
        }

        if (result.status === 'not_configured') {
          finishAIAgentExecution(execution.id, 'failed', result.reason);
          return { status: 'not_configured', executionId: execution.id, reason: result.reason };
        }

        finishAIAgentExecution(execution.id, 'failed', result.reason);
        return { status: 'rejected', executionId: execution.id, reason: result.reason };
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Falha inesperada na execução do agente IA.';
        finishAIAgentExecution(execution.id, 'failed', reason);
        return { status: 'rejected', executionId: execution.id, reason };
      }
    },

    async pause(input): Promise<AutomationCommandResult> {
      const execution = listAIAgentExecutions().find((item) => item.id === input.executionId);
      if (!execution) return { status: 'rejected', reason: 'Execução de IA não encontrada.' };
      if (execution.status !== 'running') {
        return { status: 'rejected', executionId: execution.id, reason: `Execução já está ${execution.status}.` };
      }
      if (!runtime.cancel) {
        return { status: 'not_configured', executionId: execution.id, reason: 'Runtime atual não oferece cancelamento/pausa.' };
      }
      const result = await runtime.cancel({ executionId: execution.id });
      if (result.status === 'cancelled') {
        updateAIAgentExecution(execution.id, { status: 'paused' });
        return { status: 'accepted', executionId: execution.id };
      }
      if (result.status === 'not_configured') {
        return { status: 'not_configured', executionId: execution.id, reason: result.reason };
      }
      return { status: 'rejected', executionId: execution.id, reason: result.reason ?? 'Execução não encontrada no runtime.' };
    },

    async getStatus(executionId) {
      return listAIAgentExecutions().find((item) => item.id === executionId)?.status ?? 'not_found';
    },
  };
}
