import type { AIAgentCommandPort, AutomationCommandResult, CrmActionPort, SalesBotCommandPort } from '../automations/contracts';
import { notConfiguredResult } from '../automations/contracts';
import { getSalesBot, updateSalesBotBlock } from './repository';
import { finishExecution, listSalesBotExecutions, updateExecution } from './executionRepository';
import type { SalesBotBlock, SalesBotBlockConfigValue } from './types';
import { salesBotDelayDurationToMs } from './validation';

export interface SalesBotMessageButton {
  id: string;
  label: string;
}

export interface SalesBotMessagePort {
  send(input: {
    leadId?: string;
    conversationId?: string;
    message: string;
    buttons?: SalesBotMessageButton[];
    context: Record<string, unknown>;
  }): Promise<AutomationCommandResult>;
}

export interface SalesBotWebhookPort {
  invoke(input: { url: string; method: string; payload: Record<string, unknown> }): Promise<AutomationCommandResult>;
}

export interface SalesBotDelayPort {
  schedule(input: { executionId: string; duration: string; resumeAt: string }): Promise<AutomationCommandResult>;
}

export type SalesBotConditionResult =
  | { status: 'matched'; matched: boolean }
  | { status: 'not_configured'; reason: string }
  | { status: 'failed'; reason: string };

export interface SalesBotConditionPort {
  evaluate(input: { expression: string; context: Record<string, unknown> }): Promise<SalesBotConditionResult>;
}

export interface SalesBotActionPort {
  execute(input: {
    actionType: string;
    leadId?: string;
    conversationId?: string;
    config: Record<string, SalesBotBlockConfigValue>;
    context: Record<string, unknown>;
  }): Promise<AutomationCommandResult>;
}

export interface SalesBotRuntimeDependencies {
  crm: CrmActionPort;
  ai: AIAgentCommandPort;
  chain: SalesBotCommandPort;
  message: SalesBotMessagePort;
  webhook: SalesBotWebhookPort;
  delay: SalesBotDelayPort;
  condition: SalesBotConditionPort;
  action: SalesBotActionPort;
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

type ContinueResult = { kind: 'continue'; nextId: string | null };
type HaltResult =
  | { kind: 'paused'; result: SalesBotRunResult }
  | { kind: 'completed'; result: SalesBotRunResult }
  | { kind: 'failed'; result: SalesBotRunResult };
type BlockResult = ContinueResult | HaltResult;

const stringConfig = (block: SalesBotBlock, key: string) => String(block.config[key] ?? '').trim();

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);

const configRows = (value: SalesBotBlockConfigValue | undefined): Array<Record<string, SalesBotBlockConfigValue>> =>
  Array.isArray(value)
    ? value.filter((item): item is Record<string, SalesBotBlockConfigValue> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : [];

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
  action: {
    execute: async () => notConfiguredResult('Executor de ações ainda não conectado.'),
  },
};

function pauseExecution(
  executionId: string,
  block: SalesBotBlock,
  reason: string,
  context: Record<string, unknown>,
  resumeMode: 'retry_current' | 'next_block' = 'retry_current',
  resumeAt?: string,
): HaltResult {
  updateExecution(executionId, {
    status: 'paused',
    currentBlockId: block.id,
    resumeMode,
    resumeAt,
    resumeClaimToken: undefined,
    resumeClaimedUntil: undefined,
    runtimeContext: context,
    action: reason,
  });
  return { kind: 'paused', result: { status: 'paused', blockId: block.id, reason } };
}

function failExecution(executionId: string, block: SalesBotBlock, reason: string): HaltResult {
  finishExecution(executionId, 'failed', reason);
  return { kind: 'failed', result: { status: 'failed', blockId: block.id, reason } };
}

function haltOnCommand(
  executionId: string,
  block: SalesBotBlock,
  result: AutomationCommandResult,
  context: Record<string, unknown>,
): HaltResult | null {
  if (result.status === 'accepted') return null;
  const reason = result.reason ?? 'Ação não executada.';
  if (result.status === 'not_configured') return pauseExecution(executionId, block, reason, context);
  return failExecution(executionId, block, reason);
}

function pathValue(context: Record<string, unknown>, path: string): unknown {
  return path.split('.').filter(Boolean).reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined;
    return (current as Record<string, unknown>)[key];
  }, context);
}

function inboundText(context: Record<string, unknown>): string {
  const candidates = [
    context.message,
    context.text,
    context.lastMessageText,
    pathValue(context, 'inbound.text'),
    pathValue(context, 'message.text'),
  ];
  const value = candidates.find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value.trim() : '';
}

function selectedButtonId(context: Record<string, unknown>, buttons: SalesBotMessageButton[]): string {
  const candidates = [
    context.salesBotButtonId,
    context.selectedButtonId,
    context.buttonId,
    context.buttonResponseId,
    pathValue(context, 'inbound.buttonId'),
  ];
  const explicit = candidates.find((item) => typeof item === 'string' && item.trim());
  if (typeof explicit === 'string') return explicit.trim();

  const text = inboundText(context).toLocaleLowerCase('pt-BR');
  if (!text) return '';
  const byLabel = buttons.find((button) => button.label.trim().toLocaleLowerCase('pt-BR') === text);
  if (byLabel) return byLabel.id;

  const asIndex = Number(text);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= buttons.length) return buttons[asIndex - 1].id;
  return '';
}

function validationMatches(type: string, value: string, block: SalesBotBlock): boolean {
  if (type === 'number') return value.trim() !== '' && Number.isFinite(Number(value));
  if (type === 'exact_number') return Number(value) === Number(block.config.value);
  if (type === 'range') {
    const number = Number(value);
    return Number.isFinite(number) && number >= Number(block.config.min) && number <= Number(block.config.max);
  }
  if (type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  if (type === 'phone') return value.replace(/\D/g, '').length >= 10;
  if (type === 'exact_text' || type === 'letter') return value.trim().toLocaleLowerCase('pt-BR') === String(block.config.value ?? '').trim().toLocaleLowerCase('pt-BR');
  if (type === 'regex') {
    try { return new RegExp(String(block.config.value ?? '')).test(value); } catch { return false; }
  }
  if (type === 'length') return value.length === Number(block.config.value);
  if (type === 'not_equals') return value.trim() !== String(block.config.value ?? '').trim();
  if (type === 'contains') return value.toLocaleLowerCase('pt-BR').includes(String(block.config.value ?? '').toLocaleLowerCase('pt-BR'));
  if (type === 'not_contains') return !value.toLocaleLowerCase('pt-BR').includes(String(block.config.value ?? '').toLocaleLowerCase('pt-BR'));
  return false;
}

function conditionExpression(rule: Record<string, SalesBotBlockConfigValue>): string {
  const field = String(rule.field ?? 'message');
  const operator = String(rule.operator ?? 'contains');
  const value = String(rule.value ?? '');
  let path = field;
  if (field === 'leadSource') path = 'source';
  if (field === 'leadTag') path = 'tagIds';
  if (field === 'currentStage') path = 'stageId';
  if (field === 'customField') path = `customFields.${String(rule.customFieldId ?? '')}`;
  if (operator === 'exists') return `exists ${path}`;
  if (operator === 'not_contains') return `${path} contains ${JSON.stringify(value)}`;
  return `${path} ${operator} ${JSON.stringify(value)}`;
}

async function evaluateCondition(
  block: SalesBotBlock,
  context: Record<string, unknown>,
  deps: SalesBotRuntimeDependencies,
): Promise<{ ok: true; matched: boolean } | { ok: false; reason: string; notConfigured?: boolean }> {
  const rules = configRows(block.config.rules);
  if (!rules.length) {
    const expression = stringConfig(block, 'expression');
    const result = await deps.condition.evaluate({ expression, context });
    if (result.status === 'matched') return { ok: true, matched: result.matched };
    return { ok: false, reason: result.reason, notConfigured: result.status === 'not_configured' };
  }

  const matches: boolean[] = [];
  for (const rule of rules) {
    const expression = conditionExpression(rule);
    const result = await deps.condition.evaluate({ expression, context });
    if (result.status !== 'matched') {
      return { ok: false, reason: result.reason, notConfigured: result.status === 'not_configured' };
    }
    const operator = String(rule.operator ?? '');
    matches.push(operator === 'not_contains' ? !result.matched : result.matched);
  }
  return {
    ok: true,
    matched: block.config.logic === 'any' ? matches.some(Boolean) : matches.every(Boolean),
  };
}

function routeForDistribution(block: SalesBotBlock): string | null {
  const options = configRows(block.config.options);
  if (!options.length) return null;
  const cursor = Number(block.config.rotationIndex ?? 0);
  const index = Number.isFinite(cursor) && cursor >= 0 ? cursor % options.length : 0;
  const chosen = options[index];
  const id = String(chosen.id ?? '');
  updateSalesBotBlock(
    String(block.config.__botId ?? ''),
    block.id,
    { config: { ...block.config, rotationIndex: (index + 1) % options.length } },
  );
  return block.routes?.[id] ?? null;
}

async function executeBlock(
  executionId: string,
  botId: string,
  block: SalesBotBlock,
  context: SalesBotRuntimeContext,
  deps: SalesBotRuntimeDependencies,
): Promise<BlockResult> {
  const data = context.data ?? {};
  context.data = data;
  const leadId = context.leadId;
  const conversationId = context.conversationId;

  if (block.type === 'trigger') return { kind: 'continue', nextId: block.nextBlockId ?? null };
  if (block.type === 'finish') {
    finishExecution(executionId, 'completed');
    return { kind: 'completed', result: { status: 'completed' } };
  }

  if (block.type === 'condition') {
    const evaluated = await evaluateCondition(block, data, deps);
    if (!evaluated.ok) {
      if (evaluated.notConfigured) return pauseExecution(executionId, block, evaluated.reason, data);
      return failExecution(executionId, block, evaluated.reason);
    }
    return { kind: 'continue', nextId: evaluated.matched ? block.nextBlockId ?? null : block.falseNextBlockId ?? null };
  }

  if (block.type === 'validation') {
    const text = inboundText(data);
    if (!text) return pauseExecution(executionId, block, 'Aguardando resposta para validar.', data);
    const matched = validationMatches(stringConfig(block, 'validationType'), text, block);
    return { kind: 'continue', nextId: matched ? block.nextBlockId ?? null : block.falseNextBlockId ?? null };
  }

  if (block.type === 'delay') {
    const mode = stringConfig(block, 'pauseMode') || 'timer';
    if (mode !== 'timer') {
      const event = String(data.salesBotEvent ?? data.event ?? '');
      const requiredEvents: Record<string, string[]> = {
        customer_reply: ['customer_reply', 'message_received'],
        audio_open: ['audio_open'],
        audio_close: ['audio_close', 'audio_completed'],
        video_open: ['video_open'],
        video_close: ['video_close', 'video_completed'],
        during_business: ['outside_business'],
        outside_business: ['during_business'],
      };
      if (!(requiredEvents[mode] ?? []).includes(event)) {
        return pauseExecution(executionId, block, 'Aguardando o evento configurado na pausa.', data);
      }
      return { kind: 'continue', nextId: block.nextBlockId ?? null };
    }

    const duration = stringConfig(block, 'duration');
    const durationMs = salesBotDelayDurationToMs(duration);
    if (durationMs === null) return failExecution(executionId, block, 'Duração de espera inválida.');
    const resumeAt = new Date(Date.now() + durationMs).toISOString();
    const result = await deps.delay.schedule({ executionId, duration, resumeAt });
    const halted = haltOnCommand(executionId, block, result, data);
    if (halted) return halted;
    return pauseExecution(executionId, block, `Aguardando ${duration}.`, data, 'next_block', resumeAt);
  }

  if (block.type === 'message') {
    const buttons: SalesBotMessageButton[] = configRows(block.config.buttons)
      .map((button) => ({ id: String(button.id ?? ''), label: String(button.label ?? '') }))
      .filter((button) => button.id && button.label);

    if (buttons.length) {
      const awaiting = asRecord(data.salesBotAwaitingButton);
      if (String(awaiting.blockId ?? '') === block.id) {
        const buttonId = selectedButtonId(data, buttons);
        if (buttonId && block.routes?.[buttonId]) {
          delete data.salesBotAwaitingButton;
          data.salesBotButtonId = buttonId;
          return { kind: 'continue', nextId: block.routes[buttonId] ?? null };
        }
        if (data.salesBotContinueWithoutClick === true) {
          delete data.salesBotAwaitingButton;
          return { kind: 'continue', nextId: block.nextBlockId ?? null };
        }
        return pauseExecution(executionId, block, 'Aguardando o cliente escolher um botão.', data);
      }
    }

    const result = await deps.message.send({
      leadId,
      conversationId,
      message: stringConfig(block, 'message'),
      buttons,
      context: data,
    });
    const halted = haltOnCommand(executionId, block, result, data);
    if (halted) return halted;

    if (buttons.length) {
      data.salesBotAwaitingButton = { blockId: block.id, buttons };
      return pauseExecution(executionId, block, 'Aguardando o cliente escolher um botão.', data);
    }
    return { kind: 'continue', nextId: block.nextBlockId ?? null };
  }

  if (block.type === 'distribution') {
    const options = configRows(block.config.options);
    if (!options.length) return failExecution(executionId, block, 'Distribuição sem opções.');
    const cursor = Number(block.config.rotationIndex ?? 0);
    const index = Number.isFinite(cursor) && cursor >= 0 ? cursor % options.length : 0;
    const optionId = String(options[index].id ?? '');
    updateSalesBotBlock(botId, block.id, {
      config: { ...block.config, rotationIndex: (index + 1) % options.length },
    });
    return { kind: 'continue', nextId: block.routes?.[optionId] ?? null };
  }

  if (block.type === 'reaction' || block.type === 'internal_comment' || block.type === 'action') {
    const actionType = block.type === 'reaction'
      ? 'reaction'
      : block.type === 'internal_comment'
        ? 'internal_comment'
        : stringConfig(block, 'actionType');
    const result = await deps.action.execute({
      actionType,
      leadId,
      conversationId,
      config: block.config,
      context: data,
    });
    const halted = haltOnCommand(executionId, block, result, data);
    if (halted) return halted;
    return { kind: 'continue', nextId: block.nextBlockId ?? null };
  }

  let result: AutomationCommandResult;
  switch (block.type) {
    case 'ai_agent': {
      const agentId = stringConfig(block, 'agentId');
      updateExecution(executionId, { aiAgentId: agentId });
      result = await deps.ai.invoke({ agentId, leadId, conversationId, context: data });
      if (result.status === 'accepted' && result.data) {
        data.ai = {
          ...asRecord(data.ai),
          lastAgentId: agentId,
          lastOutput: result.data.output,
          lastResult: result.data,
        };
      }
      break;
    }
    case 'move_stage':
      result = leadId
        ? await deps.crm.moveStage({ leadId, stageId: stringConfig(block, 'stageId') })
        : { status: 'rejected', reason: 'Lead obrigatório para mover etapa.' };
      break;
    case 'assign_owner':
      result = leadId
        ? await deps.crm.assignOwner({ leadId, userId: stringConfig(block, 'userId') })
        : { status: 'rejected', reason: 'Lead obrigatório para atribuir responsável.' };
      break;
    case 'create_task':
      result = leadId
        ? await deps.crm.createTask({ leadId, title: stringConfig(block, 'title') })
        : { status: 'rejected', reason: 'Lead obrigatório para criar tarefa.' };
      break;
    case 'update_field':
      result = leadId
        ? await deps.crm.updateField({ leadId, fieldId: stringConfig(block, 'fieldId'), value: block.config.fieldValue })
        : { status: 'rejected', reason: 'Lead obrigatório para alterar campo.' };
      break;
    case 'tag': {
      const operation = stringConfig(block, 'operation').toLowerCase();
      if (!leadId) result = { status: 'rejected', reason: 'Lead obrigatório para alterar tag.' };
      else if (operation === 'remove') result = await deps.crm.removeTag({ leadId, tagId: stringConfig(block, 'tagId') });
      else result = await deps.crm.addTag({ leadId, tagId: stringConfig(block, 'tagId') });
      break;
    }
    case 'webhook':
      result = await deps.webhook.invoke({
        url: stringConfig(block, 'url'),
        method: (stringConfig(block, 'method') || 'POST').toUpperCase(),
        payload: data,
      });
      break;
    case 'chain_flow':
      result = await deps.chain.start({
        botId: stringConfig(block, 'botId'),
        leadId,
        conversationId,
        context: data,
      });
      break;
    default:
      result = { status: 'rejected', reason: `Bloco ${block.type} não suportado pelo runtime.` };
  }

  const halted = haltOnCommand(executionId, block, result, data);
  if (halted) return halted;
  updateExecution(executionId, { runtimeContext: data });
  return { kind: 'continue', nextId: block.nextBlockId ?? null };
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

  const byId = new Map(bot.blocks.map((block) => [block.id, block]));
  const start = bot.blocks.find((block) => block.type === 'trigger') ?? bot.blocks[0];
  if (!start) {
    finishExecution(executionId, 'failed', 'SalesBot sem bloco inicial.');
    return { status: 'failed', reason: 'SalesBot sem bloco inicial.' };
  }

  const runtimeData = context.data ?? execution.runtimeContext ?? {};
  context.data = runtimeData;

  let currentId = start.id;
  if (execution.currentBlockId) {
    if (execution.resumeMode === 'retry_current') {
      currentId = execution.currentBlockId;
    } else if (execution.resumeMode === 'next_block') {
      const current = byId.get(execution.currentBlockId);
      currentId = current?.nextBlockId ?? '';
    }
  }

  updateExecution(executionId, {
    status: 'running',
    runtimeContext: runtimeData,
    resumeMode: undefined,
    resumeAt: undefined,
    resumeClaimToken: undefined,
    resumeClaimedUntil: undefined,
    error: undefined,
    action: 'Execução iniciada/retomada.',
  });

  const visitCount = new Map<string, number>();
  try {
    while (currentId) {
      const block = byId.get(currentId);
      if (!block) {
        const reason = 'O fluxo aponta para um bloco inexistente.';
        finishExecution(executionId, 'failed', reason);
        return { status: 'failed', reason };
      }

      const count = (visitCount.get(block.id) ?? 0) + 1;
      visitCount.set(block.id, count);
      if (count > 50) {
        const reason = 'O SalesBot entrou em um ciclo sem condição de saída.';
        finishExecution(executionId, 'failed', reason);
        return { status: 'failed', blockId: block.id, reason };
      }

      updateExecution(executionId, {
        currentBlockId: block.id,
        runtimeContext: runtimeData,
        action: `Executando: ${block.label}`,
      });

      const outcome = await executeBlock(executionId, bot.id, block, context, deps);
      if (outcome.kind !== 'continue') return outcome.result;
      currentId = outcome.nextId ?? '';
    }

    finishExecution(executionId, 'completed');
    return { status: 'completed' };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Falha inesperada durante a execução.';
    finishExecution(executionId, 'failed', reason);
    return { status: 'failed', reason };
  }
}
