import { listAIAgents } from '../ai-agents/repository';
import { listSalesBots } from '../salesbot/repository';
import { createF05Id, readStoredList, writeStoredList, writeStoredListConfirmed } from './f05Storage';
import type {
  AutomationAction,
  AutomationDefinition,
  AutomationStatus,
  PipelineAutomationMeta,
  PipelineTriggerAction,
  PipelineTriggerEvent,
} from './types';
import { validateAutomation } from './validation';

const STORAGE_KEY = 'harpia:f05:automations';
const now = () => new Date().toISOString();

export function listAutomations(): AutomationDefinition[] {
  return readStoredList<AutomationDefinition>(STORAGE_KEY).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function validateAutomationReferences(definition: AutomationDefinition): string[] {
  const issues: string[] = [];
  const bots = listSalesBots();
  const agents = listAIAgents();

  definition.actions.forEach((action) => {
    if (action.type === 'start_salesbot') {
      const botId = String(action.config.botId ?? '').trim();
      if (botId) {
        const bot = bots.find((item) => item.id === botId);
        if (!bot) issues.push('Ação Iniciar SalesBot: fluxo não encontrado.');
        else if (bot.status !== 'active') issues.push(`Ação Iniciar SalesBot: ${bot.name} precisa estar ativo.`);
      }
    }
    if (action.type === 'invoke_ai') {
      const agentId = String(action.config.agentId ?? '').trim();
      if (agentId) {
        const agent = agents.find((item) => item.id === agentId);
        if (!agent) issues.push('Ação Chamar agente IA: agente não encontrado.');
        else if (agent.status !== 'active') issues.push(`Ação Chamar agente IA: ${agent.name} precisa estar ativo.`);
      }
    }
  });

  return issues;
}

export function validateAutomationForActivation(definition: AutomationDefinition): string[] {
  return [...validateAutomation(definition), ...validateAutomationReferences(definition)];
}

export function createAutomation(name: string): AutomationDefinition {
  const timestamp = now();
  const item: AutomationDefinition = {
    id: createF05Id('automation'),
    name: name.trim(),
    description: '',
    status: 'draft',
    trigger: { event: 'lead.created', conditions: [] },
    actions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [item, ...listAutomations()]);
  return item;
}

export function updateAutomation(id: string, patch: Partial<Omit<AutomationDefinition, 'id' | 'createdAt'>>): AutomationDefinition {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  let updated: AutomationDefinition = { ...current, ...patch, updatedAt: now() };
  if (current.status === 'active' && patch.status === undefined && validateAutomationForActivation(updated).length > 0) {
    updated = { ...updated, status: 'paused' };
  }
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteAutomation(id: string): void {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  if (typeof window !== 'undefined' && !window.confirm(`Excluir a automação “${current.name}”? Esta ação não pode ser desfeita.`)) return;
  writeStoredList(STORAGE_KEY, items.filter((item) => item.id !== id));
}

export function duplicateAutomation(id: string): AutomationDefinition {
  const source = listAutomations().find((item) => item.id === id);
  if (!source) throw new Error('Automação não encontrada.');
  const timestamp = now();
  const copy: AutomationDefinition = {
    ...source,
    id: createF05Id('automation'),
    name: `${source.name} — cópia`,
    status: 'draft',
    trigger: {
      ...source.trigger,
      conditions: source.trigger.conditions.map((condition) => ({ ...condition })),
    },
    actions: source.actions.map((action) => ({ ...action, id: createF05Id('action'), config: { ...action.config } })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [copy, ...listAutomations()]);
  return copy;
}

export function setAutomationStatus(id: string, status: AutomationStatus): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  if (status === 'active') {
    const issues = validateAutomationForActivation(current);
    if (issues.length > 0) throw new Error(issues.join(' '));
  }
  return updateAutomation(id, { status });
}

export function addAutomationAction(id: string, action: Omit<AutomationAction, 'id'>): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  return updateAutomation(id, { actions: [...current.actions, { ...action, id: createF05Id('action') }] });
}

export function updateAutomationAction(id: string, actionId: string, config: AutomationAction['config']): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  if (!current.actions.some((action) => action.id === actionId)) throw new Error('Ação não encontrada.');
  return updateAutomation(id, {
    actions: current.actions.map((action) => action.id === actionId ? { ...action, config } : action),
  });
}

export function removeAutomationAction(id: string, actionId: string): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  return updateAutomation(id, { actions: current.actions.filter((action) => action.id !== actionId) });
}

export function moveAutomationAction(id: string, actionId: string, direction: -1 | 1): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  const index = current.actions.findIndex((action) => action.id === actionId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= current.actions.length) return current;
  const actions = [...current.actions];
  [actions[index], actions[target]] = [actions[target], actions[index]];
  return updateAutomation(id, { actions });
}


function pipelineActionDefinition(input: PipelineAutomationMeta): AutomationAction {
  const config = input.actionConfig ?? {};
  const make = (type: AutomationAction['type'], actionConfig: AutomationAction['config']): AutomationAction => ({
    id: createF05Id('action'),
    type,
    config: actionConfig,
  });

  if (input.action === 'move_stage') return make('move_stage', { stageId: input.targetStageId ?? '' });
  if (input.action === 'salesbot') return make('start_salesbot', { botId: input.resourceId ?? '' });
  if (input.action === 'ai') return make('invoke_ai', { agentId: input.resourceId ?? '' });
  if (input.action === 'pause_ai') return make('pause_ai', { agentId: input.resourceId ?? '' });
  if (input.action === 'create_task') return make('create_task', { title: String(config.title ?? ''), dueAt: String(config.dueAt ?? '') });
  if (input.action === 'duplicate_lead') return make('duplicate_lead', { stageId: String(config.stageId ?? '') });
  if (input.action === 'complete_tasks') return make('complete_tasks', { title: String(config.title ?? '') });
  if (input.action === 'delete_tasks') return make('delete_tasks', { title: String(config.title ?? '') });
  if (input.action === 'tags') {
    const operation = String(config.operation ?? 'add');
    const tagId = String(config.tagId ?? '');
    if (operation === 'remove') return make('remove_tag', { tagId });
    if (operation === 'replace') return make('replace_tags', { tagId });
    return make('add_tag', { tagId });
  }
  if (input.action === 'assign_owner') return make('assign_owner', { userId: String(config.userId ?? '') });
  if (input.action === 'update_field') {
    const fieldId = String(config.fieldId ?? '');
    return fieldId.startsWith('lead.')
      ? make('update_lead_field', { fieldId, value: config.value ?? '' })
      : make('update_field', { fieldId, value: config.value ?? '' });
  }
  if (input.action === 'delete_lead') return make('delete_lead', {});
  if (input.action === 'internal_message') return make('internal_message', { message: String(config.message ?? '') });
  if (input.action === 'generate_form') return make('generate_form', { title: String(config.title ?? ''), fields: String(config.fields ?? '') });
  if (input.action === 'delete_files') return make('delete_files', { classification: String(config.classification ?? '') });
  if (input.action === 'link_product') return make('link_product', {
    catalogItemId: String(config.catalogItemId ?? ''),
    relationship: String(config.relationship ?? 'interest'),
    quantity: Number(config.quantity ?? 1),
  });

  return make('webhook', {
    url: String(config.url ?? ''),
    method: String(config.method ?? 'POST'),
    preset: input.action,
  });
}

function validatePipelineAutomationMeta(input: PipelineAutomationMeta): void {
  const config = input.actionConfig ?? {};
  if (!input.pipelineId || !input.stageId) throw new Error('Selecione a etapa do gatilho.');
  if (input.event === 'time' && !/^\d+\s*(m|min|h|d|dia|dias|hora|horas)$/i.test(input.value ?? '')) {
    throw new Error('Informe o tempo como 30m, 2h ou 3d.');
  }
  if (input.event === 'hours_before_datetime') {
    if (!String(config.scheduleFieldId ?? '').trim()) throw new Error('Selecione o campo de data/hora.');
    if (!(Number(config.scheduleHours ?? 0) > 0)) throw new Error('Informe quantas horas antes o gatilho deve executar.');
  }
  if (input.event === 'daily_time' && !/^\d{2}:\d{2}$/.test(String(config.scheduleTime ?? ''))) {
    throw new Error('Informe o horário fixo do gatilho.');
  }
  if (input.event === 'specific_datetime' && !String(config.scheduleDateTime ?? '').trim()) {
    throw new Error('Informe a data e hora do gatilho.');
  }
  if (input.event === 'inbound_webhook' && !String(input.value ?? '').trim()) throw new Error('Token do webhook de entrada não foi gerado.');
  if (input.action === 'move_stage' && !input.targetStageId) throw new Error('Selecione a etapa destino.');
  if ((input.action === 'salesbot' || input.action === 'ai') && !input.resourceId) {
    throw new Error(input.action === 'salesbot' ? 'Selecione o SalesBot.' : 'Selecione o Agente IA.');
  }
  if (input.action === 'create_task' && !String(config.title ?? '').trim()) throw new Error('Informe o título da tarefa.');
  if (input.action === 'tags' && !String(config.tagId ?? '').trim()) throw new Error('Selecione a tag.');
  if (input.action === 'assign_owner' && !String(config.userId ?? '').trim()) throw new Error('Selecione o usuário responsável.');
  if (input.action === 'update_field' && !String(config.fieldId ?? '').trim()) throw new Error('Selecione o campo que será alterado.');
  if (input.action === 'internal_message' && !String(config.message ?? '').trim()) throw new Error('Digite a mensagem interna.');
  if (input.action === 'generate_form' && !String(config.title ?? '').trim()) throw new Error('Informe o nome do formulário.');
  if (input.action === 'link_product' && !String(config.catalogItemId ?? '').trim()) throw new Error('Selecione o produto.');
  if ([
    'meta_ads',
    'webhook_won',
    'webhook_lost',
    'webhook_remarketing',
    'webhook_meeting',
    'webhook_charge',
    'webhook_qualified',
    'webhook',
  ].includes(input.action) && !String(config.url ?? '').trim()) {
    throw new Error('Informe a URL HTTPS do webhook.');
  }
}

function pipelineTriggerDefinition(input: PipelineAutomationMeta): AutomationDefinition {
  const timestamp = now();
  const conditions: AutomationDefinition['trigger']['conditions'] = [];

  if (input.pipelineId) conditions.push({ field: 'pipelineId', operator: 'equals', value: input.pipelineId });

  let event: AutomationDefinition['trigger']['event'] = 'lead.created';
  if (input.event === 'enter' || input.event === 'created_or_moved') {
    event = 'lead.stage_changed';
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  } else if (input.event === 'leave') {
    event = 'lead.stage_changed';
    if (input.stageId) conditions.push({ field: 'previousStageId', operator: 'equals', value: input.stageId });
  } else if (input.event === 'created') {
    event = 'lead.created';
  } else if (input.event === 'time') {
    event = 'lead.inactivity';
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  } else if (input.event === 'tag_added') {
    event = 'lead.tag_added';
    if (input.value) conditions.push({ field: 'tagId', operator: 'equals', value: input.value });
  } else if (input.event === 'field_changed') {
    event = 'lead.field_changed';
    if (input.value) conditions.push({ field: 'fieldId', operator: 'equals', value: input.value });
  } else if (input.event === 'assignee_changed') {
    event = 'lead.assignee_changed';
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  } else if (input.event === 'hours_before_datetime' || input.event === 'daily_time' || input.event === 'specific_datetime') {
    event = 'custom.event';
    conditions.push({ field: 'kind', operator: 'equals', value: input.event });
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  } else if (input.event === 'inbound_webhook') {
    event = 'custom.event';
    conditions.push({ field: 'kind', operator: 'equals', value: 'inbound_webhook' });
    if (input.value) conditions.push({ field: 'token', operator: 'equals', value: input.value });
  } else {
    event = 'custom.event';
    conditions.push({ field: 'kind', operator: 'equals', value: input.event });
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  }

  return {
    id: createF05Id('automation'),
    name: `Gatilho do funil ${input.pipelineId}`,
    description: '',
    status: 'active',
    origin: 'pipeline',
    pipeline: { ...input, actionConfig: { ...(input.actionConfig ?? {}) } },
    trigger: { event, conditions },
    actions: [pipelineActionDefinition(input)],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function listPipelineAutomations(pipelineId: string): AutomationDefinition[] {
  return listAutomations()
    .filter((item) => item.origin === 'pipeline' && item.pipeline?.pipelineId === pipelineId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function createPipelineAutomation(input: {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
  actionConfig?: Record<string, string | number | boolean | null>;
}): AutomationDefinition {
  const normalized: PipelineAutomationMeta = {
    pipelineId: input.pipelineId,
    event: input.event,
    stageId: input.stageId?.trim() || undefined,
    value: input.value?.trim() || undefined,
    action: input.action,
    targetStageId: input.targetStageId?.trim() || undefined,
    resourceId: input.resourceId?.trim() || undefined,
    actionConfig: { ...(input.actionConfig ?? {}) },
  };

  validatePipelineAutomationMeta(normalized);

  const item = pipelineTriggerDefinition(normalized);
  writeStoredList(STORAGE_KEY, [item, ...listAutomations()]);
  return item;
}

export async function createPipelineAutomationConfirmed(input: {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
  actionConfig?: Record<string, string | number | boolean | null>;
}): Promise<AutomationDefinition> {
  const normalized: PipelineAutomationMeta = {
    pipelineId: input.pipelineId,
    event: input.event,
    stageId: input.stageId?.trim() || undefined,
    value: input.value?.trim() || undefined,
    action: input.action,
    targetStageId: input.targetStageId?.trim() || undefined,
    resourceId: input.resourceId?.trim() || undefined,
    actionConfig: { ...(input.actionConfig ?? {}) },
  };

  validatePipelineAutomationMeta(normalized);

  const item = pipelineTriggerDefinition(normalized);
  await writeStoredListConfirmed(STORAGE_KEY, [item, ...listAutomations()]);
  return item;
}

export function deletePipelineAutomation(id: string): void {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current || current.origin !== 'pipeline') throw new Error('Gatilho não encontrado.');
  writeStoredList(STORAGE_KEY, items.filter((item) => item.id !== id));
}

export function updatePipelineAutomation(id: string, input: {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
  actionConfig?: Record<string, string | number | boolean | null>;
}): AutomationDefinition {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current || current.origin !== 'pipeline') throw new Error('Gatilho não encontrado.');

  const normalized: PipelineAutomationMeta = {
    pipelineId: input.pipelineId,
    event: input.event,
    stageId: input.stageId?.trim() || undefined,
    value: input.value?.trim() || undefined,
    action: input.action,
    targetStageId: input.targetStageId?.trim() || undefined,
    resourceId: input.resourceId?.trim() || undefined,
    actionConfig: { ...(input.actionConfig ?? {}) },
  };

  validatePipelineAutomationMeta(normalized);

  const rebuilt = pipelineTriggerDefinition(normalized);
  const updated: AutomationDefinition = {
    ...rebuilt,
    id: current.id,
    createdAt: current.createdAt,
    status: current.status,
    updatedAt: now(),
  };
  writeStoredList(STORAGE_KEY, items.map((item) => item.id === id ? updated : item));
  return updated;
}

export async function updatePipelineAutomationConfirmed(id: string, input: {
  pipelineId: string;
  event: PipelineTriggerEvent;
  stageId?: string;
  value?: string;
  action: PipelineTriggerAction;
  targetStageId?: string;
  resourceId?: string;
  actionConfig?: Record<string, string | number | boolean | null>;
}): Promise<AutomationDefinition> {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current || current.origin !== 'pipeline') throw new Error('Gatilho não encontrado.');

  const normalized: PipelineAutomationMeta = {
    pipelineId: input.pipelineId,
    event: input.event,
    stageId: input.stageId?.trim() || undefined,
    value: input.value?.trim() || undefined,
    action: input.action,
    targetStageId: input.targetStageId?.trim() || undefined,
    resourceId: input.resourceId?.trim() || undefined,
    actionConfig: { ...(input.actionConfig ?? {}) },
  };

  validatePipelineAutomationMeta(normalized);

  const rebuilt = pipelineTriggerDefinition(normalized);
  const updated: AutomationDefinition = {
    ...rebuilt,
    id: current.id,
    createdAt: current.createdAt,
    status: current.status,
    updatedAt: now(),
  };
  await writeStoredListConfirmed(STORAGE_KEY, items.map((item) => item.id === id ? updated : item));
  return updated;
}

export function deletePipelineAutomationsForStage(stageId: string): void {
  const items = listAutomations();
  writeStoredList(
    STORAGE_KEY,
    items.filter((item) => !(item.origin === 'pipeline' && (
      item.pipeline?.stageId === stageId || item.pipeline?.targetStageId === stageId
    ))),
  );
}

export function deletePipelineAutomationsForPipeline(pipelineId: string): void {
  const items = listAutomations();
  writeStoredList(
    STORAGE_KEY,
    items.filter((item) => !(item.origin === 'pipeline' && item.pipeline?.pipelineId === pipelineId)),
  );
}
