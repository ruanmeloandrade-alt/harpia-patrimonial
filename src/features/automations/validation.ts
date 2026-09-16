import type { AutomationAction, AutomationDefinition } from './types';

const requiredByAction: Partial<Record<AutomationAction['type'], string[]>> = {
  start_salesbot: ['botId'],
  invoke_ai: ['agentId'],
  create_task: ['title'],
  move_stage: ['stageId'],
  update_field: ['fieldId', 'value'],
  add_tag: ['tagId'],
  remove_tag: ['tagId'],
  assign_owner: ['userId'],
  webhook: ['url'],
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
};

export function validateAutomationAction(action: AutomationAction): string[] {
  const issues: string[] = [];
  for (const key of requiredByAction[action.type] ?? []) {
    if (!hasValue(action.config[key])) issues.push(`Ação ${action.type}: preencha ${key}.`);
  }

  if (action.type === 'webhook') {
    const url = String(action.config.url ?? '').trim();
    if (url) {
      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
      } catch {
        issues.push('Webhook/API: endpoint inválido.');
      }
    }
  }

  return issues;
}

export function validateAutomation(definition: AutomationDefinition): string[] {
  const issues: string[] = [];
  if (!definition.name.trim()) issues.push('Nome da automação é obrigatório.');
  if (definition.actions.length === 0) issues.push('Adicione pelo menos uma ação antes de ativar a automação.');

  definition.trigger.conditions.forEach((condition, index) => {
    if (!condition.field.trim()) issues.push(`Condição ${index + 1}: campo/evento é obrigatório.`);
    if (condition.operator !== 'exists' && !String(condition.value ?? '').trim()) {
      issues.push(`Condição ${index + 1}: valor é obrigatório para ${condition.operator}.`);
    }
  });

  definition.actions.forEach((action) => issues.push(...validateAutomationAction(action)));
  return issues;
}
