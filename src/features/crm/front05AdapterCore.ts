import type { CrmEvent, CrmEventSink, CustomFieldValue } from './domain';
import type {
  ConversationAutomationStatus,
  InboxAutomationPort,
} from './contracts';
import { CrmService } from './service';

export type Front05CommandStatus = 'accepted' | 'rejected' | 'not_configured';

export interface Front05CommandResult {
  status: Front05CommandStatus;
  executionId?: string;
  reason?: string;
  data?: Record<string, unknown>;
}

export interface Front05SalesBotCommandPort {
  start(input: {
    botId: string;
    leadId?: string;
    conversationId?: string;
    context?: Record<string, unknown>;
  }): Promise<Front05CommandResult>;
  pause(input: { executionId: string; reason?: string }): Promise<Front05CommandResult>;
  resume(input: { executionId: string; context?: Record<string, unknown> }): Promise<Front05CommandResult>;
  getStatus(executionId: string): Promise<'running' | 'paused' | 'completed' | 'failed' | 'not_found'>;
}

export interface Front05AiAgentCommandPort {
  invoke(input: {
    agentId: string;
    leadId?: string;
    conversationId?: string;
    input?: string;
    context?: Record<string, unknown>;
  }): Promise<Front05CommandResult>;
  pause(input: { executionId: string; reason?: string }): Promise<Front05CommandResult>;
  getStatus(executionId: string): Promise<'running' | 'paused' | 'completed' | 'failed' | 'not_found'>;
}

export interface Front05CrmActionPort {
  moveStage(input: { leadId: string; stageId: string }): Promise<Front05CommandResult>;
  assignOwner(input: { leadId: string; userId: string }): Promise<Front05CommandResult>;
  createTask(input: { leadId: string; title: string; dueAt?: string }): Promise<Front05CommandResult>;
  updateField(input: { leadId: string; fieldId: string; value: unknown }): Promise<Front05CommandResult>;
  addTag(input: { leadId: string; tagId: string }): Promise<Front05CommandResult>;
  removeTag(input: { leadId: string; tagId: string }): Promise<Front05CommandResult>;
}

export type Front05AutomationEventType =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'lead.assignee_changed'
  | 'lead.field_changed'
  | 'lead.tag_added'
  | 'lead.tag_removed'
  | 'lead.inactivity'
  | 'task.due'
  | 'custom.event';

export interface Front05CrmAutomationEvent {
  id: string;
  type: Front05AutomationEventType;
  occurredAt: string;
  leadId?: string;
  conversationId?: string;
  payload: Record<string, unknown>;
}

export type Front05CrmAutomationEventProcessor = (
  event: Front05CrmAutomationEvent,
) => Promise<unknown>;

export interface Front05AutomationSelectionContext {
  leadId: string;
  conversationId?: string;
}

export interface Front05InboxAutomationAdapterOptions {
  salesBot: Front05SalesBotCommandPort;
  aiAgent: Front05AiAgentCommandPort;
  resolveSalesBotId: (context: Front05AutomationSelectionContext) => string | undefined;
  resolveAiAgentId: (context: Front05AutomationSelectionContext) => string | undefined;
}

type ExecutionState = {
  salesBotId?: string;
  salesBotExecutionId?: string;
  aiAgentId?: string;
  aiAgentExecutionId?: string;
};

const executionKey = (input: Front05AutomationSelectionContext) =>
  `${input.leadId}::${input.conversationId ?? ''}`;

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

export function createFront05InboxAutomationAdapter(
  options: Front05InboxAutomationAdapterOptions,
): InboxAutomationPort {
  const executions = new Map<string, ExecutionState>();

  const getExecution = (input: Front05AutomationSelectionContext) => {
    const key = executionKey(input);
    const current = executions.get(key) ?? {};
    executions.set(key, current);
    return current;
  };

  return {
    async startSalesBot(input) {
      const execution = getExecution(input);
      const botId = input.botId || options.resolveSalesBotId(input) || execution.salesBotId;
      if (!botId) throw new Error('Selecione um SalesBot antes de iniciar.');

      const isSameBot = execution.salesBotId === botId;
      if (isSameBot && execution.salesBotExecutionId) {
        const currentStatus = await options.salesBot.getStatus(execution.salesBotExecutionId);
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

      const salesBot = execution.salesBotExecutionId && requestedSalesBotId === execution.salesBotId
        ? mapRuntimeStatus(await options.salesBot.getStatus(execution.salesBotExecutionId))
        : requestedSalesBotId
          ? 'idle'
          : 'unavailable';

      const aiAgent = execution.aiAgentExecutionId && requestedAiAgentId === execution.aiAgentId
        ? mapRuntimeStatus(await options.aiAgent.getStatus(execution.aiAgentExecutionId))
        : requestedAiAgentId
          ? 'idle'
          : 'unavailable';

      return { salesBot, aiAgent };
    },
  };
}

function accepted(): Front05CommandResult {
  return { status: 'accepted' };
}

function rejected(error: unknown): Front05CommandResult {
  return {
    status: 'rejected',
    reason: error instanceof Error ? error.message : 'Falha ao executar ação no CRM.',
  };
}

function normalizeCustomFieldValue(value: unknown): CustomFieldValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  throw new Error('Valor de campo personalizado incompatível com o CRM.');
}

export function createFront05CrmActionPort(crm: CrmService): Front05CrmActionPort {
  return {
    async moveStage(input) {
      try {
        crm.moveLead(input.leadId, input.stageId);
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },

    async assignOwner(input) {
      try {
        crm.assignLead(input.leadId, input.userId);
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },

    async createTask(input) {
      try {
        crm.createTask({ leadId: input.leadId, title: input.title, dueAt: input.dueAt });
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },

    async updateField(input) {
      try {
        crm.setCustomFieldValue(input.leadId, input.fieldId, normalizeCustomFieldValue(input.value));
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },

    async addTag(input) {
      try {
        crm.addTagToLead(input.leadId, input.tagId);
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },

    async removeTag(input) {
      try {
        crm.removeTagFromLead(input.leadId, input.tagId);
        return accepted();
      } catch (error) {
        return rejected(error);
      }
    },
  };
}

function mapCrmEventType(type: CrmEvent['type']): Front05AutomationEventType {
  if (type === 'lead.created') return 'lead.created';
  if (type === 'lead.stage_changed') return 'lead.stage_changed';
  if (type === 'lead.assignee_changed') return 'lead.assignee_changed';
  if (type === 'lead.custom_field_changed') return 'lead.field_changed';
  if (type === 'lead.tag_added') return 'lead.tag_added';
  if (type === 'lead.tag_removed') return 'lead.tag_removed';
  if (type === 'lead.inactivity_detected') return 'lead.inactivity';
  return 'custom.event';
}

export function toFront05CrmAutomationEvent(event: CrmEvent): Front05CrmAutomationEvent {
  const mappedType = mapCrmEventType(event.type);
  return {
    id: event.id,
    type: mappedType,
    occurredAt: event.occurredAt,
    leadId: event.leadId,
    payload: mappedType === 'custom.event'
      ? { ...event.payload, sourceEventType: event.type }
      : event.payload,
  };
}

export class Front05CrmEventSink implements CrmEventSink {
  constructor(private readonly processEvent: Front05CrmAutomationEventProcessor) {}

  async publish(event: CrmEvent): Promise<void> {
    await this.processEvent(toFront05CrmAutomationEvent(event));
  }
}
