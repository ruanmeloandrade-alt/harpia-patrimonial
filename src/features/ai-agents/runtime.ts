import type { AIAgentCommandPort, AutomationCommandResult } from '../automations/contracts';
import { loadAIBrain } from './brainRepository';
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

const buildInstructions = (
  agent: ReturnType<typeof listAIAgents>[number],
  brainContext = '',
) =>
  [
    agent.role ? `Função: ${agent.role}` : '',
    agent.instructions,
    agent.rules ? `Regras:\n${agent.rules}` : '',
    agent.context ? `Contexto-base:\n${agent.context}` : '',
    brainContext ? `Cérebro da empresa:\n${brainContext}` : '',
  ].filter(Boolean).join('\n\n');

const loadBrainContext = async () => {
  try {
    const brain = await loadAIBrain();
    return [
      brain.companyContext,
      ...brain.sources
        .filter((source) => source.status === 'ready' && source.text_content)
        .map((source) => `Fonte ${source.title}:\n${source.text_content}`),
    ].filter(Boolean).join('\n\n').slice(0, 120000);
  } catch {
    return '';
  }
};

export function createAIAgentCommandPort(runtime: AIModelRuntimePort = unconfiguredAIModelRuntime): AIAgentCommandPort {
  return {
    async invoke(input): Promise<AutomationCommandResult> {
      const agent = listAIAgents().find((item) => item.id === input.agentId);
      if (!agent) return { status: 'rejected', reason: 'Agente IA não encontrado.' };
      if (agent.status !== 'active') return { status: 'rejected', reason: 'Agente IA precisa estar ativo.' };
      const profiles = listAIProviderProfiles();
      const profile = (agent.providerProfileId
        ? profiles.find((item) => item.id === agent.providerProfileId)
        : undefined) ?? profiles.find((item) => item.status === 'ready' && item.apiKeyConfigured && item.secretRef);
      if (!profile) return { status: 'not_configured', reason: 'Configure uma chave de IA em Integrações.' };
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
        const brainContext = await loadBrainContext();
        const result = await runtime.invoke({
          executionId: execution.id,
          profile,
          instructions: buildInstructions(agent, brainContext),
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
