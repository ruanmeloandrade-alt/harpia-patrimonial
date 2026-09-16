import { validateOutboundWebhookMethod, validateSafeOutboundUrl } from '../automations/outboundUrlValidation';
import type { SalesBotBlock, SalesBotDefinition } from './types';

const requiredByType: Partial<Record<SalesBotBlock['type'], string[]>> = {
  trigger: ['event'],
  condition: ['expression'],
  delay: ['duration'],
  message: ['message'],
  ai_agent: ['agentId'],
  move_stage: ['stageId'],
  assign_owner: ['userId'],
  create_task: ['title'],
  update_field: ['fieldId', 'fieldValue'],
  tag: ['operation', 'tagId'],
  webhook: ['url'],
  chain_flow: ['botId'],
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const CONDITION_PATH = '[\\p{L}\\p{N}_.-]+';
const conditionExistsPrefix = new RegExp(`^exists\\s+${CONDITION_PATH}$`, 'iu');
const conditionExistsSuffix = new RegExp(`^${CONDITION_PATH}\\s+exists$`, 'iu');
const conditionComparison = new RegExp(`^${CONDITION_PATH}\\s*(contains|==|!=|>=|<=|=|>|<)\\s*.+$`, 'iu');

export function validateSalesBotConditionExpression(expression: string): boolean {
  const value = expression.trim();
  return conditionExistsPrefix.test(value) || conditionExistsSuffix.test(value) || conditionComparison.test(value);
}

export function validateSalesBotBlock(block: SalesBotBlock): string[] {
  const issues: string[] = [];
  for (const key of requiredByType[block.type] ?? []) {
    if (!hasValue(block.config[key])) issues.push(`${block.label}: preencha ${key}.`);
  }

  if (block.type === 'condition') {
    const expression = String(block.config.expression ?? '').trim();
    if (expression && !validateSalesBotConditionExpression(expression)) {
      issues.push(`${block.label}: condição inválida. Use campo = valor, !=, >, >=, <, <=, contains ou exists campo.`);
    }
  }

  if (block.type === 'tag') {
    const operation = String(block.config.operation ?? '').trim().toLowerCase();
    if (operation && operation !== 'add' && operation !== 'remove') {
      issues.push(`${block.label}: operação deve ser add ou remove.`);
    }
  }

  if (block.type === 'webhook') {
    const url = String(block.config.url ?? '').trim();
    if (url) {
      const urlIssue = validateSafeOutboundUrl(url);
      if (urlIssue) issues.push(`${block.label}: ${urlIssue}`);
    }
    const methodIssue = validateOutboundWebhookMethod(block.config.method);
    if (methodIssue) issues.push(`${block.label}: ${methodIssue}`);
  }

  return issues;
}

export function validateSalesBot(bot: SalesBotDefinition): string[] {
  const issues: string[] = [];
  if (!bot.name.trim()) issues.push('Nome do SalesBot é obrigatório.');
  if (bot.blocks.length === 0) issues.push('Adicione pelo menos um bloco antes de ativar o SalesBot.');

  bot.blocks.forEach((block) => {
    issues.push(...validateSalesBotBlock(block));
    if (block.type === 'chain_flow' && block.config.botId === bot.id) {
      issues.push(`${block.label}: o fluxo não pode encadear a si mesmo.`);
    }
  });

  return issues;
}
