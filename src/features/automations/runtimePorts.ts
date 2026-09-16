import { createAIAgentCommandPort } from '../ai-agents/runtime';
import { unconfiguredAIModelRuntime } from '../integrations/aiRuntimePort';
import { getSalesBot, validateSalesBotForActivation } from '../salesbot/repository';
import { listSalesBotExecutions, startExecution, updateExecution } from '../salesbot/executionRepository';
import { runSalesBotExecution, unconfiguredSalesBotRuntimeDependencies, type SalesBotRuntimeDependencies } from '../salesbot/runtime';
import type { AutomationCommandResult, SalesBotCommandPort } from './contracts';

function mapSalesBotRunResult(executionId: string, result: Awaited<ReturnType<typeof runSalesBotExecution>>): AutomationCommandResult {
  if (result.status === 'completed') {
    return { status: 'accepted', executionId, data: { runtimeStatus: 'completed' } };
  }
  if (result.status === 'failed') {
    return { status: 'rejected', executionId, reason: result.reason, data: { runtimeStatus: 'failed' } };
  }

  const execution = listSalesBotExecutions().find((item) => item.id === executionId);
  if (execution?.resumeMode === 'retry_current') {
    return { status: 'not_configured', executionId, reason: result.reason, data: { runtimeStatus: 'paused' } };
  }
  return { status: 'accepted', executionId, reason: result.reason, data: { runtimeStatus: 'paused' } };
}

export function createSalesBotCommandPort(
  dependencies: SalesBotRuntimeDependencies = unconfiguredSalesBotRuntimeDependencies,
): SalesBotCommandPort {
  let commandPort: SalesBotCommandPort;
  const resolvedDependencies = (): SalesBotRuntimeDependencies => ({ ...dependencies, chain: commandPort });

  commandPort = {
    async start(input): Promise<AutomationCommandResult> {
      const bot = getSalesBot(input.botId);
      if (!bot) return { status: 'rejected', reason: 'SalesBot não encontrado.' };
      if (bot.status !== 'active') return { status: 'rejected', reason: 'SalesBot precisa estar ativo.' };
      const issues = validateSalesBotForActivation(bot);
      if (issues.length > 0) return { status: 'rejected', reason: issues.join(' ') };

      const execution = startExecution({ botId: bot.id, leadId: input.leadId, conversationId: input.conversationId });
      const result = await runSalesBotExecution(
        execution.id,
        { leadId: input.leadId, conversationId: input.conversationId, data: input.context },
        resolvedDependencies(),
      );
      return mapSalesBotRunResult(execution.id, result);
    },

    async pause(input): Promise<AutomationCommandResult> {
      const execution = listSalesBotExecutions().find((item) => item.id === input.executionId);
      if (!execution) return { status: 'rejected', reason: 'Execução não encontrada.' };
      if (execution.status !== 'running') {
        return { status: 'rejected', executionId: execution.id, reason: `Execução já está ${execution.status}.` };
      }
      updateExecution(input.executionId, {
        status: 'paused',
        resumeMode: 'retry_current',
        action: input.reason ?? 'Pausado por comando externo.',
      });
      return { status: 'accepted', executionId: input.executionId };
    },

    async resume(input): Promise<AutomationCommandResult> {
      const execution = listSalesBotExecutions().find((item) => item.id === input.executionId);
      if (!execution) return { status: 'rejected', reason: 'Execução não encontrada.' };
      if (execution.status !== 'paused') {
        return { status: 'rejected', executionId: execution.id, reason: `Apenas execução pausada pode ser retomada; status atual: ${execution.status}.` };
      }
      const result = await runSalesBotExecution(
        execution.id,
        { leadId: execution.leadId, conversationId: execution.conversationId, data: input.context },
        resolvedDependencies(),
      );
      return mapSalesBotRunResult(execution.id, result);
    },

    async getStatus(executionId) {
      return listSalesBotExecutions().find((item) => item.id === executionId)?.status ?? 'not_found';
    },
  };

  return commandPort;
}

export const salesBotCommandPort = createSalesBotCommandPort(unconfiguredSalesBotRuntimeDependencies);
export const aiAgentCommandPort = createAIAgentCommandPort(unconfiguredAIModelRuntime);
