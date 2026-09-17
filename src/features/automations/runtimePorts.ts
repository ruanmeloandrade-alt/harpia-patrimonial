import { createAIAgentCommandPort } from '../ai-agents/runtime';
import { unconfiguredAIModelRuntime } from '../integrations/aiRuntimePort';
import { getSalesBot, validateSalesBotForActivation } from '../salesbot/repository';
import {
  claimPausedExecutionForResume,
  listDueSalesBotExecutions,
  listSalesBotExecutions,
  startExecution,
  updateExecution,
} from '../salesbot/executionRepository';
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

function buildRuntimeContext(input: {
  leadId?: string;
  conversationId?: string;
  previous?: Record<string, unknown>;
  incoming?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...(input.previous ?? {}),
    ...(input.incoming ?? {}),
    ...(input.leadId ? { leadId: input.leadId } : {}),
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
  };
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

      const runtimeContext = buildRuntimeContext({
        leadId: input.leadId,
        conversationId: input.conversationId,
        incoming: input.context,
      });
      const execution = startExecution({
        botId: bot.id,
        leadId: input.leadId,
        conversationId: input.conversationId,
        runtimeContext,
      });
      const result = await runSalesBotExecution(
        execution.id,
        { leadId: input.leadId, conversationId: input.conversationId, data: runtimeContext },
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
        resumeAt: undefined,
        resumeClaimToken: undefined,
        resumeClaimedUntil: undefined,
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

      const runtimeContext = buildRuntimeContext({
        leadId: execution.leadId,
        conversationId: execution.conversationId,
        previous: execution.runtimeContext,
        incoming: input.context,
      });

      let claimed;
      try {
        claimed = await claimPausedExecutionForResume(execution.id, { runtimeContext });
      } catch {
        return {
          status: 'rejected',
          executionId: execution.id,
          reason: 'A execução foi alterada por outra sessão durante a retomada. O estado mais recente foi restaurado.',
        };
      }

      if (!claimed) {
        const latest = listSalesBotExecutions().find((item) => item.id === execution.id);
        if (!latest) return { status: 'rejected', reason: 'Execução não encontrada após atualizar o estado.' };
        if (latest.status !== 'paused') {
          return {
            status: 'rejected',
            executionId: latest.id,
            reason: `A execução já foi retomada por outra sessão; status atual: ${latest.status}.`,
          };
        }
        return {
          status: 'rejected',
          executionId: latest.id,
          reason: 'A retomada desta execução já está reservada por outra sessão.',
        };
      }

      const result = await runSalesBotExecution(
        claimed.id,
        { leadId: claimed.leadId, conversationId: claimed.conversationId, data: claimed.runtimeContext ?? runtimeContext },
        resolvedDependencies(),
      );
      return mapSalesBotRunResult(claimed.id, result);
    },

    async getStatus(executionId) {
      return listSalesBotExecutions().find((item) => item.id === executionId)?.status ?? 'not_found';
    },
  };

  return commandPort;
}

export async function resumeDueSalesBotExecutions(
  commandPort: SalesBotCommandPort,
  now = new Date(),
): Promise<Array<{ executionId: string; result: AutomationCommandResult }>> {
  const results: Array<{ executionId: string; result: AutomationCommandResult }> = [];
  for (const execution of listDueSalesBotExecutions(now)) {
    const result = await commandPort.resume({ executionId: execution.id });
    results.push({ executionId: execution.id, result });
  }
  return results;
}

export const salesBotCommandPort = createSalesBotCommandPort(unconfiguredSalesBotRuntimeDependencies);
export const aiAgentCommandPort = createAIAgentCommandPort(unconfiguredAIModelRuntime);
