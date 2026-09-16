import type { AIAgentCommandPort, AutomationCommandResult, CrmActionPort, SalesBotCommandPort } from '../automations/contracts';
import { notConfiguredResult } from '../automations/contracts';
import { getSalesBot } from './repository';
import { finishExecution, listSalesBotExecutions, updateExecution } from './executionRepository';
import type { SalesBotBlock } from './types';

export interface SalesBotMessagePort {
  send(input: { leadId?: string; conversationId?: string; message: string; context: Record<string, unknown> }): Promise<AutomationCommandResult>;
}

export interface SalesBotWebhookPort {
  invoke(input: { url: string; method: string; payload: Record<string, unknown> }): Promise<AutomationCommandResult>;
}

export interface SalesBotDelayPort {
  schedule(input: { executionId: string; duration: string }): Promise<AutomationCommandResult>;
}

export type SalesBotConditionResult =
  | { status: 'matched'; matched: boolean }
  | { status: 'not_configured'; reason: string }
  | { status: 'failed'; reason: string };

export interface SalesBotConditionPort {
  evaluate(input: { expression: string; context: Record<string, unknown> }): Promise<SalesBotConditionResult>;
}

export interface SalesBotRuntimeDependencies {
  crm: CrmActionPort;
  ai: AIAgentCommandPort;
  chain: SalesBotCommandPort;
  message: SalesBotMessagePort;
  webhook: SalesBotWebhookPort;
  delay: SalesBotDelayPort;
  condition: SalesBotConditionPort;
}

export interface SalesBotRuntimeContext {
  leadId?: string;
  conversationId?: string;
  data?: Record<string, unknown>;
}

export type SalesBotRunResult =
  | { status: 'completed' }
  | { status: 'paused'; blockId: string; reason: string }
  | { status: 'failed'; blockId?: string; reason: string };

const stringConfig = (block: SalesBotBlock, key: string) => String(block.config[key] ?? '').trim();

const unconfiguredCrmActionPort: CrmActionPort = {
  moveStage: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
  assignOwner: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
  createTask: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
  updateField: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
  addTag: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
  removeTag: async () => notConfiguredResult('CRM ainda não conectado ao runtime do SalesBot.'),
};

export const unconfiguredSalesBotRuntimeDependencies: SalesBotRuntimeDependencies = {
  crm: unconfiguredCrmActionPort,
  ai: {
    invoke: async () => notConfiguredResult('Agente IA ainda não conectado ao runtime.'),
    pause: async () => notConfiguredResult('Agente IA ainda não conectado ao runtime.'),
    getStatus: async () => 'not_found',
  },
  chain: {
    start: async () => notConfiguredResult('Encadeamento ainda não conectado ao runtime.'),
    pause: async () => notConfiguredResult('Encadeamento ainda não conectado ao runtime.'),
    resume: async () => notConfiguredResult('Encadeamento ainda não conectado ao runtime.'),
    getStatus: async () => 'not_found',
  },
  message: { send: async () => notConfiguredResult('Canal de mensagem ainda não conectado.') },
  webhook: { invoke: async () => notConfiguredResult('Executor de webhook ainda não conectado.') },
  delay: { schedule: async () => notConfiguredResult('Agendador de espera ainda não conectado.') },
  condition: {
    evaluate: async () => ({ status: 'not_configured', reason: 'Avaliador de condições ainda não conectado.' }),
  },
};

const haltOnCommand = (
  executionId: string,
  block: SalesBotBlock,
  result: AutomationCommandResult,
): SalesBotRunResult | null => {
  if (result.status === 'accepted') return null;
  const reason = result.reason ?? 'Ação não executada.';
  if (result.status === 'not_configured') {
    updateExecution(executionId, { status: 'paused', currentBlockId: block.id, resumeMode: 'retry_current', action: reason });
    return { status: 'paused', blockId: block.id, reason };
  }
  finishExecution(executionId, 'failed', reason);
  return { status: 'failed', blockId: block.id, reason };
};

async function executeBlock(
  executionId: string,
  block: SalesBotBlock,
  context: SalesBotRuntimeContext,
  deps: SalesBotRuntimeDependencies,
): Promise<SalesBotRunResult | null> {
  const data = context.data ?? {};
  const leadId = context.leadId;
  const conversationId = context.conversationId;

  if (block.type === 'trigger') return null;
  if (block.type === 'finish') {
    finishExecution(executionId, 'completed');
    return { status: 'completed' };
  }

  if (block.type === 'condition') {
    const result = await deps.condition.evaluate({ expression: stringConfig(block, 'expression'), context: data });
    if (result.status === 'not_configured') {
      updateExecution(executionId, { status: 'paused', currentBlockId: block.id, resumeMode: 'retry_current', action: result.reason });
      return { status: 'paused', blockId: block.id, reason: result.reason };
    }
    if (result.status === 'failed') {
      finishExecution(executionId, 'failed', result.reason);
      return { status: 'failed', blockId: block.id, reason: result.reason };
    }
    if (!result.matched) {
      finishExecution(executionId, 'completed');
      return { status: 'completed' };
    }
    return null;
  }

  if (block.type === 'delay') {
    const result = await deps.delay.schedule({ executionId, duration: stringConfig(block, 'duration') });
    const halted = haltOnCommand(executionId, block, result);
    if (halted) return halted;
    const reason = `Aguardando ${stringConfig(block, 'duration')}.`;
    updateExecution(executionId, { status: 'paused', currentBlockId: block.id, resumeMode: 'next_block', action: reason });
    return { status: 'paused', blockId: block.id, reason };
  }

  let result: AutomationCommandResult;
  switch (block.type) {
    case 'message':
      result = await deps.message.send({ leadId, conversationId, message: stringConfig(block, 'message'), context: data });
      break;
    case 'ai_agent':
      updateExecution(executionId, { aiAgentId: stringConfig(block, 'agentId') });
      result = await deps.ai.invoke({ agentId: stringConfig(block, 'agentId'), leadId, conversationId, context: data });
      break;
    case 'move_stage':
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para mover etapa.' };
      else result = await deps.crm.moveStage({ leadId, stageId: stringConfig(block, 'stageId') });
      break;
    case 'assign_owner':
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para atribuir responsável.' };
      else result = await deps.crm.assignOwner({ leadId, userId: stringConfig(block, 'userId') });
      break;
    case 'create_task':
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para criar tarefa.' };
      else result = await deps.crm.createTask({ leadId, title: stringConfig(block, 'title') });
      break;
    case 'update_field':
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para alterar campo.' };
      else result = await deps.crm.updateField({ leadId, fieldId: stringConfig(block, 'fieldId'), value: block.config.fieldValue });
      break;
    case 'tag': {
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para alterar tag.' };
      else if (stringConfig(block, 'operation') === 'remove') result = await deps.crm.removeTag({ leadId, tagId: stringConfig(block, 'tagId') });
      else result = await deps.crm.addTag({ leadId, tagId: stringConfig(block, 'tagId') });
      break;
    }
    case 'webhook':
      result = await deps.webhook.invoke({ url: stringConfig(block, 'url'), method: stringConfig(block, 'method') || 'POST', payload: data });
      break;
    case 'chain_flow':
      result = await deps.chain.start({ botId: stringConfig(block, 'botId'), leadId, conversationId, context: data });
      break;
    default:
      result = { status: 'rejected', reason: `Bloco ${block.type} não suportado pelo runtime.` };
  }

  return haltOnCommand(executionId, block, result);
}

export async function runSalesBotExecution(
  executionId: string,
  context: SalesBotRuntimeContext = {},
  deps: SalesBotRuntimeDependencies = unconfiguredSalesBotRuntimeDependencies,
): Promise<SalesBotRunResult> {
  const execution = listSalesBotExecutions().find((item) => item.id === executionId);
  if (!execution) return { status: 'failed', reason: 'Execução não encontrada.' };
  const bot = getSalesBot(execution.botId);
  if (!bot) {
    finishExecution(executionId, 'failed', 'SalesBot não encontrado.');
    return { status: 'failed', reason: 'SalesBot não encontrado.' };
  }

  let startIndex = 0;
  if (execution.currentBlockId) {
    const currentIndex = bot.blocks.findIndex((block) => block.id === execution.currentBlockId);
    if (currentIndex >= 0) startIndex = currentIndex + (execution.resumeMode === 'next_block' ? 1 : 0);
  }

  updateExecution(executionId, { status: 'running', resumeMode: undefined, error: undefined, action: 'Execução iniciada/retomada.' });

  try {
    for (let index = startIndex; index < bot.blocks.length; index += 1) {
      const block = bot.blocks[index];
      updateExecution(executionId, { currentBlockId: block.id, resumeMode: undefined, action: `Executando: ${block.label}` });
      const halted = await executeBlock(executionId, block, context, deps);
      if (halted) return halted;
    }
    finishExecution(executionId, 'completed');
    return { status: 'completed' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Falha inesperada durante a execução.';
    finishExecution(executionId, 'failed', reason);
    return { status: 'failed', reason };
  }
}
