import { validateOutboundWebhookMethod, validateSafeOutboundUrl } from '../automations/outboundUrlValidation';
import type { SalesBotBlock, SalesBotBlockConfigValue, SalesBotDefinition } from './types';

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const asRecord = (value: SalesBotBlockConfigValue | undefined): Record<string, SalesBotBlockConfigValue> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, SalesBotBlockConfigValue>
    : null;

const asRecords = (value: SalesBotBlockConfigValue | undefined): Record<string, SalesBotBlockConfigValue>[] =>
  Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, SalesBotBlockConfigValue> => Boolean(item))
    : [];

const CONDITION_PATH = '[\\p{L}\\p{N}_.-]+';
const conditionExistsPrefix = new RegExp(`^exists\\s+${CONDITION_PATH}$`, 'iu');
const conditionExistsSuffix = new RegExp(`^${CONDITION_PATH}\\s+exists$`, 'iu');
const conditionComparison = new RegExp(`^${CONDITION_PATH}\\s*(contains|==|!=|>=|<=|=|>|<)\\s*.+$`, 'iu');
const delayDuration = /^(\\d+)\\s*(s|m|h|d|w)$/i;
const DELAY_UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function validateSalesBotConditionExpression(expression: string): boolean {
  const value = expression.trim();
  return conditionExistsPrefix.test(value) || conditionExistsSuffix.test(value) || conditionComparison.test(value);
}

export function salesBotDelayDurationToMs(duration: string): number | null {
  const match = duration.trim().match(delayDuration);
  if (!match) return null;
  const amount = Number(match[1]);
  const unitMs = DELAY_UNIT_MS[match[2].toLowerCase()];
  if (!Number.isSafeInteger(amount) || amount <= 0 || !unitMs) return null;
  const total = amount * unitMs;
  return Number.isSafeInteger(total) && total > 0 ? total : null;
}

export function validateSalesBotDelayDuration(duration: string): boolean {
  return salesBotDelayDurationToMs(duration) !== null;
}

function validateAction(block: SalesBotBlock, issues: string[]) {
  const actionType = String(block.config.actionType ?? '').trim();
  if (!actionType) {
    issues.push('Ação: selecione a ação que deve ser executada.');
    return;
  }

  const requiredByAction: Record<string, string[]> = {
    add_note: ['text'],
    create_task: ['title'],
    move_stage: ['stageId'],
    send_email: ['emailSubject'],
    update_field: ['fieldId'],
    set_tag: ['tagId'],
    complete_task: ['taskId'],
    link_product: ['productId'],
    assign_owner: ['userId'],
    conversation_status: ['conversationStatus'],
    webhook: ['url'],
    form: ['formId'],
    private_message: ['text'],
    notify_admins: ['text'],
  };
  for (const key of requiredByAction[actionType] ?? []) {
    if (!hasValue(block.config[key])) issues.push(`Ação: preencha ${key}.`);
  }

  if (actionType === 'webhook') {
    const url = String(block.config.url ?? '').trim();
    if (url) {
      const urlIssue = validateSafeOutboundUrl(url);
      if (urlIssue) issues.push(`Ação: ${urlIssue}`);
    }
    const methodIssue = validateOutboundWebhookMethod(block.config.method);
    if (methodIssue) issues.push(`Ação: ${methodIssue}`);
  }
}

export function validateSalesBotBlock(block: SalesBotBlock): string[] {
  const issues: string[] = [];

  if (block.type === 'trigger' && !hasValue(block.config.event)) {
    issues.push('Iniciar SalesBot: gatilho inicial inválido.');
  }

  if (block.type === 'message') {
    if (!hasValue(block.config.message)) issues.push('Mensagem: preencha a mensagem.');
    const buttons = asRecords(block.config.buttons);
    buttons.forEach((button, index) => {
      const id = String(button.id ?? '').trim();
      const label = String(button.label ?? '').trim() || `Botão ${index + 1}`;
      if (!id) issues.push(`Mensagem: o botão "${label}" está sem identificador.`);
      else if (!block.routes?.[id]) issues.push(`Mensagem: conecte a saída do botão "${label}".`);
    });
  }

  if (block.type === 'delay') {
    const pauseMode = String(block.config.pauseMode ?? 'timer');
    if (pauseMode === 'timer') {
      const duration = String(block.config.duration ?? '').trim();
      if (!duration) issues.push('Pausa: selecione a duração.');
      else if (!validateSalesBotDelayDuration(duration)) issues.push('Pausa: duração inválida.');
    }
  }

  if (block.type === 'reaction' && !hasValue(block.config.emoji)) {
    issues.push('Reagir à mensagem: selecione o emoji.');
  }

  if (block.type === 'internal_comment' && !hasValue(block.config.text)) {
    issues.push('Comentário interno: escreva o comentário.');
  }

  if (block.type === 'action') validateAction(block, issues);

  if (block.type === 'condition') {
    const rules = asRecords(block.config.rules);
    const legacyExpression = String(block.config.expression ?? '').trim();
    if (rules.length === 0 && !legacyExpression) {
      issues.push('Condição: adicione ao menos uma regra.');
    }
    if (legacyExpression && !validateSalesBotConditionExpression(legacyExpression)) {
      issues.push('Condição: regra inválida.');
    }
    if (!block.nextBlockId) issues.push('Condição: conecte a saída Sim.');
    if (!block.falseNextBlockId) issues.push('Condição: conecte a saída Não.');
  }

  if (block.type === 'validation') {
    if (!hasValue(block.config.validationType)) issues.push('Validação: selecione o tipo de validação.');
    if (!block.nextBlockId) issues.push('Validação: conecte a saída Válido.');
    if (!block.falseNextBlockId) issues.push('Validação: conecte a saída Inválido.');
  }

  if (block.type === 'ai_agent' && !hasValue(block.config.agentId)) {
    issues.push('Iniciar Agente IA: selecione o agente.');
  }

  if (block.type === 'distribution') {
    const options = asRecords(block.config.options);
    if (options.length === 0) issues.push('Distribuição: adicione ao menos uma opção.');
    options.forEach((option, index) => {
      const id = String(option.id ?? '').trim();
      const label = String(option.label ?? '').trim() || `Opção ${index + 1}`;
      if (!id) issues.push(`Distribuição: a opção "${label}" está sem identificador.`);
      else if (!block.routes?.[id]) issues.push(`Distribuição: conecte a saída "${label}".`);
    });
  }

  if (block.type === 'chain_flow' && !hasValue(block.config.botId)) {
    issues.push('Iniciar SalesBot: selecione o SalesBot de destino.');
  }

  if (block.type === 'move_stage' && !hasValue(block.config.stageId)) issues.push('Mudar etapa: selecione a etapa.');
  if (block.type === 'assign_owner' && !hasValue(block.config.userId)) issues.push('Mudar responsável: selecione o responsável.');
  if (block.type === 'create_task' && !hasValue(block.config.title)) issues.push('Criar tarefa: informe a tarefa.');
  if (block.type === 'update_field' && (!hasValue(block.config.fieldId) || !hasValue(block.config.fieldValue))) issues.push('Definir campo: informe campo e valor.');
  if (block.type === 'tag' && (!hasValue(block.config.operation) || !hasValue(block.config.tagId))) issues.push('Definir tag: informe operação e tag.');
  if (block.type === 'webhook') {
    const url = String(block.config.url ?? '').trim();
    if (!url) issues.push('Webhook/API: informe o endpoint.');
    if (url) {
      const urlIssue = validateSafeOutboundUrl(url);
      if (urlIssue) issues.push(`Webhook/API: ${urlIssue}`);
    }
    const methodIssue = validateOutboundWebhookMethod(block.config.method);
    if (methodIssue) issues.push(`Webhook/API: ${methodIssue}`);
  }

  return issues;
}

export function validateSalesBot(bot: SalesBotDefinition): string[] {
  const issues: string[] = [];
  if (!bot.name.trim()) issues.push('Nome do SalesBot é obrigatório.');
  if (bot.blocks.length === 0) issues.push('Adicione pelo menos um bloco antes de ativar o SalesBot.');
  if (bot.blocks[0]?.type !== 'trigger') issues.push('O primeiro bloco precisa ser Iniciar SalesBot.');

  const ids = new Set(bot.blocks.map((block) => block.id));
  bot.blocks.forEach((block) => {
    issues.push(...validateSalesBotBlock(block));
    if (block.type === 'chain_flow' && block.config.botId === bot.id) {
      issues.push('Iniciar SalesBot: o fluxo não pode iniciar a si mesmo.');
    }

    const targets = [
      block.nextBlockId,
      block.falseNextBlockId,
      ...Object.values(block.routes ?? {}),
    ].filter(Boolean) as string[];
    targets.forEach((target) => {
      if (!ids.has(target)) issues.push(`${block.label}: existe uma conexão apontando para um bloco inexistente.`);
    });
  });

  return [...new Set(issues)];
}
