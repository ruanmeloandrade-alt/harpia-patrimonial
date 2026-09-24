import { listAIAgents } from '../ai-agents/repository';
import { listSalesBots } from '../salesbot/repository';
import { createF05Id, readStoredList, writeStoredList } from './f05Storage';
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
  } else {
    event = 'custom.event';
    conditions.push({ field: 'kind', operator: 'equals', value: input.event });
    if (input.stageId) conditions.push({ field: 'stageId', operator: 'equals', value: input.stageId });
  }

  let action: AutomationAction;
  if (input.action === 'move_stage') {
    action = { id: createF05Id('action'), type: 'move_stage', config: { stageId: input.targetStageId ?? '' } };
  } else if (input.action === 'salesbot') {
    action = { id: createF05Id('action'), type: 'start_salesbot', config: { botId: input.resourceId ?? '' } };
  } else {
    action = { id: createF05Id('action'), type: 'invoke_ai', config: { agentId: input.resourceId ?? '' } };
  }

  return {
    id: createF05Id('automation'),
    name: `Gatilho do funil ${input.pipelineId}`,
    description: '',
    status: 'active',
    origin: 'pipeline',
    pipeline: { ...input },
    trigger: { event, conditions },
    actions: [action],
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
}): AutomationDefinition {
  const normalized: PipelineAutomationMeta = {
    pipelineId: input.pipelineId,
    event: input.event,
    stageId: input.stageId?.trim() || undefined,
    value: input.value?.trim() || undefined,
    action: input.action,
    targetStageId: input.targetStageId?.trim() || undefined,
    resourceId: input.resourceId?.trim() || undefined,
  };

  if (!normalized.pipelineId) throw new Error('Selecione um funil.');
  if (!normalized.stageId) throw new Error('Selecione a etapa do gatilho.');
  if (normalized.event === 'time' && !/^\d+\s*(m|min|h|d|dia|dias|hora|horas)$/i.test(normalized.value ?? '')) {
    throw new Error('Informe o tempo como 30m, 2h ou 3d.');
  }
  if (normalized.action === 'move_stage' && !normalized.targetStageId) {
    throw new Error('Selecione a etapa destino.');
  }
  if ((normalized.action === 'salesbot' || normalized.action === 'ai') && !normalized.resourceId) {
    throw new Error(normalized.action === 'salesbot' ? 'Selecione o SalesBot.' : 'Selecione o Agente IA.');
  }

  const item = pipelineTriggerDefinition(normalized);
  writeStoredList(STORAGE_KEY, [item, ...listAutomations()]);
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
  };

  if (!normalized.pipelineId || !normalized.stageId) throw new Error('Selecione a etapa do gatilho.');
  if (normalized.event === 'time' && !/^\d+\s*(m|min|h|d|dia|dias|hora|horas)$/i.test(normalized.value ?? '')) {
    throw new Error('Informe o tempo como 30m, 2h ou 3d.');
  }
  if (normalized.action === 'move_stage' && !normalized.targetStageId) {
    throw new Error('Selecione a etapa destino.');
  }
  if ((normalized.action === 'salesbot' || normalized.action === 'ai') && !normalized.resourceId) {
    throw new Error(normalized.action === 'salesbot' ? 'Selecione o SalesBot.' : 'Selecione o Agente IA.');
  }

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
