import type {
  ConversationAutomationStatus,
  InboxAutomationPort,
} from './contracts';
import type { CrmEvent, CrmEventSink } from './domain';
import { waitForCrmPersistence } from './repository';
import { CrmService } from './service';
import {
  createFront05CrmActionPort as createCoreFront05CrmActionPort,
  toFront05CrmAutomationEvent,
} from './front05AdapterCore';
import type {
  Front05AutomationSelectionContext,
  Front05CommandResult,
  Front05CrmActionPort,
  Front05CrmAutomationEventProcessor,
  Front05InboxAutomationAdapterOptions,
} from './front05AdapterCore';

export { toFront05CrmAutomationEvent };
export type {
  Front05AiAgentCommandPort,
  Front05AutomationEventType,
  Front05AutomationSelectionContext,
  Front05CommandResult,
  Front05CommandStatus,
  Front05CrmActionPort,
  Front05CrmAutomationEvent,
  Front05CrmAutomationEventProcessor,
  Front05InboxAutomationAdapterOptions,
  Front05SalesBotCommandPort,
} from './front05AdapterCore';

type ExecutionState = {
  salesBotId?: string;
  salesBotExecutionId?: string;
  aiAgentId?: string;
  aiAgentExecutionId?: string;
};

// O PlatformRuntime da Frente01 recria os ports quando chega atualização realtime.
// Este mapa pertence ao módulo, não à instância do adapter, para preservar o
// vínculo com a execução durante essas reconstruções dentro da mesma sessão.
const executionStates = new Map<string, ExecutionState>();

const executionKey = (input: Front05AutomationSelectionContext) =>
  `${input.leadId}::${input.conversationId ?? ''}`;

function getExecution(input: Front05AutomationSelectionContext): ExecutionState {
  const key = executionKey(input);
  const current = executionStates.get(key) ?? {};
  executionStates.set(key, current);
  return current;
}

function requireAccepted(result: Front05CommandResult, resource: string): string {
  if (result.status !== 'accepted') {
    throw new Error(result.reason || `${resource} recusou o comando.`);
  }
  if (!result.executionId) {
    throw new Error(`${resource} aceitou o comando sem informar executionId.`);
  }
  return result.executionId;
}

function mapRuntimeStatus(
  status: 'running' | 'paused' | 'completed' | 'failed' | 'not_found',
): 'idle' | 'running' | 'paused' {
  if (status === 'running') return 'running';
  if (status === 'paused') return 'paused';
  return 'idle';
}

function clearFinishedSalesBot(
  execution: ExecutionState,
  status: 'running' | 'paused' | 'completed' | 'failed' | 'not_found',
): void {
  if (status === 'completed' || status === 'failed' || status === 'not_found') {
    execution.salesBotExecutionId = undefined;
  }
}

function clearFinishedAiAgent(
  execution: ExecutionState,
  status: 'running' | 'paused' | 'completed' | 'failed' | 'not_found',
): void {
  if (status === 'completed' || status === 'failed' || status === 'not_found') {
    execution.aiAgentExecutionId = undefined;
  }
}

function persistenceFailure(error: unknown): Front05CommandResult {
  return {
    status: 'rejected',
    reason: error instanceof Error
      ? `A alteração no CRM não foi confirmada: ${error.message}`
      : 'A alteração no CRM não foi confirmada pela persistência compartilhada.',
  };
}

async function confirmCrmAction(
  action: () => Promise<Front05CommandResult>,
): Promise<Front05CommandResult> {
  const result = await action();
  if (result.status !== 'accepted') return result;

  try {
    await waitForCrmPersistence();
    return result;
  } catch (error) {
    return persistenceFailure(error);
  }
}

export function createFront05CrmActionPort(crm: CrmService): Front05CrmActionPort {
  const core = createCoreFront05CrmActionPort(crm);
  return {
    moveStage: (input) => confirmCrmAction(() => core.moveStage(input)),
    assignOwner: (input) => confirmCrmAction(() => core.assignOwner(input)),
    createTask: (input) => confirmCrmAction(() => core.createTask(input)),
    updateField: (input) => confirmCrmAction(() => core.updateField(input)),
    addTag: (input) => confirmCrmAction(() => core.addTag(input)),
    removeTag: (input) => confirmCrmAction(() => core.removeTag(input)),
  };
}

export class Front05CrmEventSink implements CrmEventSink {
  constructor(private readonly processEvent: Front05CrmAutomationEventProcessor) {}

  async publish(event: CrmEvent): Promise<void> {
    try {
      await waitForCrmPersistence();
    } catch {
      // O repository já publica harpia:persistence-error. Sem commit confirmado,
      // a automação não pode observar nem reagir ao estado otimista local.
      return;
    }

    await this.processEvent(toFront05CrmAutomationEvent(event));
  }
}

export function createFront05InboxAutomationAdapter(
  options: Front05InboxAutomationAdapterOptions,
): InboxAutomationPort {
  return {
    async startSalesBot(input) {
      const execution = getExecution(input);
      const botId = input.botId || options.resolveSalesBotId(input) || execution.salesBotId;
      if (!botId) throw new Error('Selecione um SalesBot antes de iniciar.');

      const isSameBot = execution.salesBotId === botId;
      if (isSameBot && execution.salesBotExecutionId) {
        const currentStatus = await options.salesBot.getStatus(execution.salesBotExecutionId);
        clearFinishedSalesBot(execution, currentStatus);
        if (currentStatus === 'running') return;
        if (currentStatus === 'paused') {
          const result = await options.salesBot.resume({
            executionId: execution.salesBotExecutionId,
            context: { leadId: input.leadId, conversationId: input.conversationId },
          });
          execution.salesBotId = botId;
          execution.salesBotExecutionId = requireAccepted(result, 'SalesBot');
          return;
        }
      }

      const result = await options.salesBot.start({
        botId,
        leadId: input.leadId,
        conversationId: input.conversationId,
      });
      execution.salesBotId = botId;
      execution.salesBotExecutionId = requireAccepted(result, 'SalesBot');
    },

    async pauseSalesBot(input) {
      const execution = getExecution(input);
      const executionId = execution.salesBotExecutionId;
      if (!executionId) throw new Error('Não existe execução ativa de SalesBot neste contexto.');

      const currentStatus = await options.salesBot.getStatus(executionId);
      clearFinishedSalesBot(execution, currentStatus);
      if (currentStatus !== 'running') {
        if (currentStatus === 'paused') return;
        throw new Error('A execução de SalesBot já foi encerrada.');
      }

      const result = await options.salesBot.pause({
        executionId,
        reason: 'Pausado pela Inbox da Frente04.',
      });
      if (result.status !== 'accepted') throw new Error(result.reason || 'SalesBot recusou a pausa.');
    },

    async startAiAgent(input) {
      const execution = getExecution(input);
      const agentId = input.agentId || options.resolveAiAgentId(input) || execution.aiAgentId;
      if (!agentId) throw new Error('Selecione um agente IA antes de iniciar.');

      if (execution.aiAgentId === agentId && execution.aiAgentExecutionId) {
        const currentStatus = await options.aiAgent.getStatus(execution.aiAgentExecutionId);
        clearFinishedAiAgent(execution, currentStatus);
        if (currentStatus === 'running') return;
      }

      const result = await options.aiAgent.invoke({
        agentId,
        leadId: input.leadId,
        conversationId: input.conversationId,
      });
      execution.aiAgentId = agentId;
      execution.aiAgentExecutionId = requireAccepted(result, 'Agente IA');
    },

    async pauseAiAgent(input) {
      const execution = getExecution(input);
      const executionId = execution.aiAgentExecutionId;
      if (!executionId) throw new Error('Não existe execução ativa de agente IA neste contexto.');

      const currentStatus = await options.aiAgent.getStatus(executionId);
      clearFinishedAiAgent(execution, currentStatus);
      if (currentStatus !== 'running') {
        if (currentStatus === 'paused') return;
        throw new Error('A execução do agente IA já foi encerrada.');
      }

      const result = await options.aiAgent.pause({
        executionId,
        reason: 'Pausado pela Inbox da Frente04.',
      });
      if (result.status !== 'accepted') throw new Error(result.reason || 'Agente IA recusou a pausa.');
    },

    async getStatus(input): Promise<ConversationAutomationStatus> {
      const execution = getExecution(input);
      const requestedSalesBotId = input.botId || execution.salesBotId || options.resolveSalesBotId(input);
      const requestedAiAgentId = input.agentId || execution.aiAgentId || options.resolveAiAgentId(input);

      let salesBot: ConversationAutomationStatus['salesBot'] = requestedSalesBotId ? 'idle' : 'unavailable';
      if (execution.salesBotExecutionId && requestedSalesBotId === execution.salesBotId) {
        const status = await options.salesBot.getStatus(execution.salesBotExecutionId);
        clearFinishedSalesBot(execution, status);
        salesBot = mapRuntimeStatus(status);
      }

      let aiAgent: ConversationAutomationStatus['aiAgent'] = requestedAiAgentId ? 'idle' : 'unavailable';
      if (execution.aiAgentExecutionId && requestedAiAgentId === execution.aiAgentId) {
        const status = await options.aiAgent.getStatus(execution.aiAgentExecutionId);
        clearFinishedAiAgent(execution, status);
        aiAgent = mapRuntimeStatus(status);
      }

      return { salesBot, aiAgent };
    },
  };
}
