import { listAIAgents } from '../ai-agents/repository';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import { getSalesBot } from '../salesbot/repository';
import { listSalesBotExecutions, startExecution, updateExecution } from '../salesbot/executionRepository';
import type { AIAgentCommandPort, AutomationCommandResult, SalesBotCommandPort } from './contracts';

export const salesBotCommandPort: SalesBotCommandPort = {
  async start(input): Promise<AutomationCommandResult> {
    const bot = getSalesBot(input.botId);
    if (!bot) return { status: 'rejected', reason: 'SalesBot não encontrado.' };
    if (bot.status !== 'active') return { status: 'rejected', reason: 'SalesBot precisa estar ativo.' };
    const execution = startExecution({ botId: bot.id, leadId: input.leadId, conversationId: input.conversationId });
    return { status: 'accepted', executionId: execution.id };
  },
  async pause(input): Promise<AutomationCommandResult> {
    const execution = listSalesBotExecutions().find((item) => item.id === input.executionId);
    if (!execution) return { status: 'rejected', reason: 'Execução não encontrada.' };
    updateExecution(input.executionId, { status: 'paused', action: input.reason ?? 'Pausado por comando externo.' });
    return { status: 'accepted', executionId: input.executionId };
  },
  async resume(input): Promise<AutomationCommandResult> {
    const execution = listSalesBotExecutions().find((item) => item.id === input.executionId);
    if (!execution) return { status: 'rejected', reason: 'Execução não encontrada.' };
    updateExecution(input.executionId, { status: 'running', action: 'Execução retomada.' });
    return { status: 'accepted', executionId: input.executionId };
  },
  async getStatus(executionId) {
    return listSalesBotExecutions().find((item) => item.id === executionId)?.status ?? 'not_found';
  },
};

export const aiAgentCommandPort: AIAgentCommandPort = {
  async invoke(input): Promise<AutomationCommandResult> {
    const agent = listAIAgents().find((item) => item.id === input.agentId);
    if (!agent) return { status: 'rejected', reason: 'Agente IA não encontrado.' };
    if (agent.status !== 'active') return { status: 'rejected', reason: 'Agente IA precisa estar ativo.' };
    if (!agent.providerProfileId) return { status: 'rejected', reason: 'Agente IA não possui perfil de provedor selecionado.' };

    const provider = listAIProviderProfiles().find((item) => item.id === agent.providerProfileId);
    if (!provider) return { status: 'rejected', reason: 'Perfil de provedor IA não encontrado.' };
    if (provider.status !== 'ready' || !provider.apiKeyConfigured) {
      return { status: 'not_configured', reason: 'Perfil de provedor/modelo ainda não está pronto ou não possui chave API segura.' };
    }

    return {
      status: 'not_configured',
      reason: 'Perfil de IA está configurado, mas o adaptador de execução do provedor ainda precisa ser conectado ao backend seguro.',
    };
  },
  async pause(): Promise<AutomationCommandResult> {
    return { status: 'not_configured', reason: 'Não existe execução de IA real sem adaptador de provedor conectado.' };
  },
  async getStatus() {
    return 'not_found';
  },
};
