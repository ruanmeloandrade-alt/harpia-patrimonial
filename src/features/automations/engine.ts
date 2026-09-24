import type { AutomationCommandResult, CrmActionPort, CrmAutomationEvent, SalesBotCommandPort, AIAgentCommandPort } from './contracts';
import { notConfiguredResult } from './contracts';
import { listAutomations } from './repository';
import type { AutomationAction, AutomationDefinition } from './types';

export interface AutomationWebhookPort {
  invoke(input: { url: string; method: string; payload: Record<string, unknown> }): Promise<AutomationCommandResult>;
}

export interface AutomationEngineDependencies {
  salesbot: SalesBotCommandPort;
  ai: AIAgentCommandPort;
  crm: CrmActionPort;
  webhook: AutomationWebhookPort;
}

export interface AutomationActionReport {
  actionId: string;
  type: AutomationAction['type'];
  result: AutomationCommandResult;
}

export interface AutomationExecutionReport {
  automationId: string;
  automationName: string;
  matched: boolean;
  actions: AutomationActionReport[];
}

const unconfiguredCrm: CrmActionPort = {
  moveStage: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
  assignOwner: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
  createTask: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
  updateField: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
  addTag: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
  removeTag: async () => notConfiguredResult('CRM ainda não conectado ao Automatize.'),
};

export const unconfiguredAutomationEngineDependencies: AutomationEngineDependencies = {
  salesbot: {
    start: async () => notConfiguredResult('SalesBot ainda não conectado ao Automatize.'),
    pause: async () => notConfiguredResult('SalesBot ainda não conectado ao Automatize.'),
    resume: async () => notConfiguredResult('SalesBot ainda não conectado ao Automatize.'),
    getStatus: async () => 'not_found',
  },
  ai: {
    invoke: async () => notConfiguredResult('Agentes IA ainda não conectados ao Automatize.'),
    pause: async () => notConfiguredResult('Agentes IA ainda não conectados ao Automatize.'),
    getStatus: async () => 'not_found',
  },
  crm: unconfiguredCrm,
  webhook: { invoke: async () => notConfiguredResult('Executor de webhook ainda não conectado ao Automatize.') },
};

function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);
}

function canonicalEventSource(event: CrmAutomationEvent): Record<string, unknown> {
  return {
    ...event.payload,
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt,
    leadId: event.leadId,
    conversationId: event.conversationId,
    payload: event.payload,
  };
}

function matchesPipelineDefinition(definition: AutomationDefinition, event: CrmAutomationEvent): boolean {
  const meta = definition.pipeline;
  if (!meta || definition.status !== 'active') return false;
  const source = canonicalEventSource(event);
  const pipelineId = String(getPath(source, 'pipelineId') ?? '');
  const stageId = String(getPath(source, 'stageId') ?? '');
  const previousStageId = String(getPath(source, 'previousStageId') ?? '');
  const kind = String(getPath(source, 'kind') ?? getPath(source, 'sourceEventType') ?? '');
  const automationId = String(getPath(source, 'automationId') ?? '');
  const duration = String(getPath(source, 'duration') ?? getPath(source, 'threshold') ?? '');

  if (meta.pipelineId && pipelineId !== meta.pipelineId) return false;

  if (meta.event === 'enter') {
    return event.type === 'lead.stage_changed' && stageId === meta.stageId;
  }
  if (meta.event === 'created_or_moved') {
    return (event.type === 'lead.created' || event.type === 'lead.stage_changed') && stageId === meta.stageId;
  }
  if (meta.event === 'leave') {
    return event.type === 'lead.stage_changed' && previousStageId === meta.stageId;
  }
  if (meta.event === 'created') {
    return event.type === 'lead.created' && (!meta.stageId || stageId === meta.stageId);
  }
  if (meta.event === 'time') {
    if (event.type !== 'lead.inactivity' || stageId !== meta.stageId) return false;
    if (automationId) return automationId === definition.id;
    if (duration) return duration === String(meta.value ?? '');
    return false;
  }
  if (meta.event === 'salesbot_done' || meta.event === 'salesbot_failed' || meta.event === 'ai_done') {
    if (event.type !== 'custom.event' || kind !== meta.event) return false;
    if (meta.stageId && stageId !== meta.stageId) return false;
    if (!meta.value) return true;
    const resourceId = meta.event.startsWith('salesbot_')
      ? String(getPath(source, 'botId') ?? '')
      : String(getPath(source, 'agentId') ?? '');
    return resourceId === meta.value;
  }
  if (meta.event === 'tag_added') {
    return event.type === 'lead.tag_added'
      && stageId === meta.stageId
      && (!meta.value || String(getPath(source, 'tagId') ?? '') === meta.value);
  }
  if (meta.event === 'field_changed') {
    return event.type === 'lead.field_changed'
      && stageId === meta.stageId
      && (!meta.value || String(getPath(source, 'fieldId') ?? '') === meta.value);
  }
  return false;
}

function matchesDefinition(definition: AutomationDefinition, event: CrmAutomationEvent): boolean {
  if (definition.origin === 'pipeline' && definition.pipeline) {
    return matchesPipelineDefinition(definition, event);
  }
  if (definition.status !== 'active' || definition.trigger.event !== event.type) return false;
  const source = canonicalEventSource(event);

  return definition.trigger.conditions.every((condition) => {
    const actual = getPath(source, condition.field);
    if (condition.operator === 'exists') return actual !== undefined && actual !== null && actual !== '';
    const expected = String(condition.value ?? '');
    if (condition.operator === 'equals') return String(actual ?? '') === expected;
    if (condition.operator === 'not_equals') return String(actual ?? '') !== expected;
    if (condition.operator === 'contains') {
      if (Array.isArray(actual)) return actual.map(String).includes(expected);
      return String(actual ?? '').includes(expected);
    }
    return false;
  });
}

const configString = (action: AutomationAction, key: string) => String(action.config[key] ?? '').trim();
const webhookMethod = (action: AutomationAction) => (configString(action, 'method') || 'POST').toUpperCase();

async function executeAction(
  action: AutomationAction,
  event: CrmAutomationEvent,
  deps: AutomationEngineDependencies,
): Promise<AutomationCommandResult> {
  const leadId = event.leadId;
  switch (action.type) {
    case 'start_salesbot':
      return deps.salesbot.start({ botId: configString(action, 'botId'), leadId, conversationId: event.conversationId, context: event.payload });
    case 'invoke_ai':
      return deps.ai.invoke({ agentId: configString(action, 'agentId'), leadId, conversationId: event.conversationId, context: event.payload });
    case 'create_task':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para criação de tarefa.' };
      return deps.crm.createTask({ leadId, title: configString(action, 'title') });
    case 'move_stage':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para mudança de etapa.' };
      return deps.crm.moveStage({ leadId, stageId: configString(action, 'stageId') });
    case 'update_field':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para alteração de campo.' };
      return deps.crm.updateField({ leadId, fieldId: configString(action, 'fieldId'), value: action.config.value });
    case 'add_tag':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para adicionar tag.' };
      return deps.crm.addTag({ leadId, tagId: configString(action, 'tagId') });
    case 'remove_tag':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para remover tag.' };
      return deps.crm.removeTag({ leadId, tagId: configString(action, 'tagId') });
    case 'assign_owner':
      if (!leadId) return { status: 'rejected', reason: 'Evento não possui lead para atribuir responsável.' };
      return deps.crm.assignOwner({ leadId, userId: configString(action, 'userId') });
    case 'webhook':
      return deps.webhook.invoke({
        url: configString(action, 'url'),
        method: webhookMethod(action),
        payload: {
          ...event.payload,
          eventId: event.id,
          eventType: event.type,
          leadId,
          conversationId: event.conversationId,
        },
      });
    default:
      return { status: 'rejected', reason: `Ação ${action.type} não suportada.` };
  }
}

export async function processCrmAutomationEvent(
  event: CrmAutomationEvent,
  deps: AutomationEngineDependencies = unconfiguredAutomationEngineDependencies,
): Promise<AutomationExecutionReport[]> {
  const reports: AutomationExecutionReport[] = [];

  for (const definition of listAutomations()) {
    const matched = matchesDefinition(definition, event);
    const report: AutomationExecutionReport = {
      automationId: definition.id,
      automationName: definition.name,
      matched,
      actions: [],
    };

    if (matched) {
      for (const action of definition.actions) {
        const result = await executeAction(action, event, deps);
        report.actions.push({ actionId: action.id, type: action.type, result });
        if (result.status !== 'accepted') break;
      }
    }
    reports.push(report);
  }

  return reports;
}
