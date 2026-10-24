export type FlowBlock = { id: string; type: string; config?: Record<string, unknown>; nextBlockId?: string | null; falseNextBlockId?: string | null; routes?: Record<string, string | null> };

/** Only definitions predating the graph may fall back to array order. */
export function salesBotNextBlock(blocks: FlowBlock[], block: FlowBlock): string | null {
  const graph = blocks.some((item) => 'nextBlockId' in item || 'falseNextBlockId' in item || 'routes' in item);
  return graph ? block.nextBlockId ?? null : blocks[blocks.indexOf(block) + 1]?.id ?? null;
}

export function salesBotConditionRoute(block: FlowBlock, context: Record<string, unknown>, evaluate: (expression: string, context: Record<string, unknown>) => boolean | null): { matched: boolean; ruleId?: string } {
  const config = block.config ?? {};
  const rules = Array.isArray(config.rules) ? config.rules as Record<string, unknown>[] : [];
  if (!rules.length) {
    const matched = evaluate(String(config.expression ?? ''), context);
    if (matched === null) throw new Error('Condição inválida.');
    return { matched };
  }
  let all = true;
  for (const rule of rules) {
    const field = String(rule.field ?? 'message');
    const paths: Record<string, string> = { leadSource: 'source', leadTag: 'tagIds', currentStage: 'stageId', customField: `customFields.${String(rule.customFieldId ?? '')}` };
    const path = paths[field] ?? field;
    const operator = String(rule.operator ?? 'contains');
    const expression = operator === 'exists' ? `exists ${path}` : `${path} ${operator === 'not_contains' ? 'contains' : operator} ${JSON.stringify(String(rule.value ?? ''))}`;
    let matched = evaluate(expression, context);
    if (matched === null) throw new Error('Condição inválida.');
    if (operator === 'not_contains') matched = !matched;
    if (config.logic === 'any' && matched) return { matched: true, ruleId: String(rule.id ?? '') };
    all = all && matched;
  }
  return { matched: config.logic === 'any' ? false : all };
}
