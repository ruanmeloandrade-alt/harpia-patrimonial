import { listAIAgents } from '../ai-agents/repository';
import { createF05Id, readStoredList, writeStoredList, writeStoredListConfirmed } from '../automations/f05Storage';
import { findActiveSalesBotReferences, findSalesBotReferences, formatF05References } from '../automations/referenceIntegrity';
import type { SalesBotBlock, SalesBotBlockConfigValue, SalesBotBlockType, SalesBotDefinition, SalesBotStatus } from './types';
import { validateSalesBot } from './validation';

const STORAGE_KEY = 'harpia:f05:salesbots';
const now = () => new Date().toISOString();

const IMPORTABLE_BLOCK_TYPES = new Set<SalesBotBlockType>([
  'trigger',
  'condition',
  'delay',
  'message',
  'reaction',
  'internal_comment',
  'action',
  'validation',
  'ai_agent',
  'distribution',
  'finish',
  'chain_flow',
  'move_stage',
  'assign_owner',
  'create_task',
  'update_field',
  'tag',
  'webhook',
]);

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function importConfigValue(value: unknown): SalesBotBlockConfigValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const items = value.map(importConfigValue);
    if (items.some((item) => item === undefined)) return undefined;
    return items as SalesBotBlockConfigValue[];
  }
  const source = recordValue(value);
  if (!source) return undefined;
  const result: Record<string, SalesBotBlockConfigValue> = {};
  for (const [key, item] of Object.entries(source)) {
    const normalized = importConfigValue(item);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}

function importConfig(value: unknown): Record<string, SalesBotBlockConfigValue> {
  const source = recordValue(value);
  if (!source) return {};
  const config: Record<string, SalesBotBlockConfigValue> = {};
  Object.entries(source).forEach(([key, item]) => {
    const normalized = importConfigValue(item);
    if (normalized !== undefined) config[key] = normalized;
  });
  return config;
}

function importedType(source: Record<string, unknown>): SalesBotBlockType | null {
  const type = String(source.type ?? '').trim() as SalesBotBlockType;
  if (IMPORTABLE_BLOCK_TYPES.has(type)) return type;

  const legacy = String(source.kind ?? '').trim();
  const legacyMap: Record<string, SalesBotBlockType> = {
    inicio: 'trigger',
    mensagem: 'message',
    'enviar-mensagem': 'message',
    espera: 'delay',
    pausar: 'delay',
    reacao: 'reaction',
    comentario: 'internal_comment',
    acao: 'action',
    condicao: 'condition',
    validacao: 'validation',
    ia: 'ai_agent',
    distribuicao: 'distribution',
    'iniciar-salesbot': 'chain_flow',
    'encerrar-bot': 'finish',
  };
  return legacyMap[legacy] ?? null;
}

function importedLegacyConfig(source: Record<string, unknown>, type: SalesBotBlockType): Record<string, SalesBotBlockConfigValue> {
  const data = recordValue(source.data) ?? {};
  const importedData = importConfig(data);
  if (type === 'trigger') return { event: 'manual' };
  if (type === 'message') {
    const buttons = Array.isArray(data.buttons)
      ? data.buttons.map((item, index) => {
        const row = recordValue(item);
        return {
          id: String(row?.id ?? `button-${index + 1}`),
          label: String(row?.label ?? item ?? '').trim() || `Botão ${index + 1}`,
        };
      })
      : [];
    return { ...importedData, message: String(data.text ?? data.message ?? ''), buttons };
  }
  if (type === 'delay') {
    return {
      ...importedData,
      duration: String(data.duration ?? '1m'),
      pauseMode: String(data.pauseType ?? data.pauseMode ?? 'timer'),
    };
  }
  if (type === 'reaction') return { ...importedData, emoji: String(data.emoji ?? '👍') };
  if (type === 'internal_comment') return { ...importedData, text: String(data.text ?? '') };
  if (type === 'action') return { ...importedData, actionType: String(data.actionType ?? '') };
  if (type === 'condition') return importedData;
  if (type === 'validation') return { ...importedData, validationType: String(data.validationType ?? '') };
  if (type === 'ai_agent') return { ...importedData, agentId: String(data.agentId ?? '') };
  if (type === 'distribution') return importedData;
  if (type === 'chain_flow') return { ...importedData, botId: String(data.botId ?? '') };
  return importedData;
}

const makeStartBlock = (): SalesBotBlock => ({
  id: createF05Id('block'),
  type: 'trigger',
  label: 'Iniciar SalesBot',
  config: { event: 'manual' },
  x: 80,
  y: 90,
  nextBlockId: null,
  falseNextBlockId: null,
  routes: {},
});

const withCanvasDefaults = (blocks: SalesBotBlock[]): SalesBotBlock[] => {
  const normalized = blocks.map((block, index) => {
    const hadNextField = Object.prototype.hasOwnProperty.call(block, 'nextBlockId');
    return {
      ...block,
      x: Number.isFinite(block.x) ? Number(block.x) : 80 + (index % 4) * 330,
      y: Number.isFinite(block.y) ? Number(block.y) : 70 + Math.floor(index / 4) * 260,
      nextBlockId: hadNextField ? block.nextBlockId ?? null : (block.type !== 'finish' ? blocks[index + 1]?.id ?? null : null),
      falseNextBlockId: block.falseNextBlockId ?? null,
      routes: block.routes ?? {},
    };
  });
  const ids = new Set(normalized.map((block) => block.id));
  return normalized.map((block) => ({
    ...block,
    nextBlockId: block.nextBlockId && ids.has(block.nextBlockId) ? block.nextBlockId : null,
    falseNextBlockId: block.falseNextBlockId && ids.has(block.falseNextBlockId) ? block.falseNextBlockId : null,
    routes: Object.fromEntries(Object.entries(block.routes ?? {}).filter(([, target]) => !target || ids.has(target))),
  }));
};

const normalizeBot = (bot: SalesBotDefinition): SalesBotDefinition => {
  const startIndex = bot.blocks.findIndex((block) => block.type === 'trigger');
  if (startIndex === 0) {
    const start = bot.blocks[0];
    return {
      ...bot,
      blocks: withCanvasDefaults([
        { ...start, label: 'Iniciar SalesBot', config: { ...start.config, event: start.config.event || 'manual' } },
        ...bot.blocks.slice(1),
      ]),
    };
  }
  if (startIndex > 0) {
    const start = bot.blocks[startIndex];
    return {
      ...bot,
      blocks: withCanvasDefaults([
        { ...start, label: 'Iniciar SalesBot', config: { ...start.config, event: start.config.event || 'manual' } },
        ...bot.blocks.filter((_, index) => index !== startIndex),
      ]),
    };
  }
  return { ...bot, blocks: withCanvasDefaults([makeStartBlock(), ...bot.blocks]) };
};

export function listSalesBots(): SalesBotDefinition[] {
  const stored = readStoredList<SalesBotDefinition>(STORAGE_KEY);
  const normalized = stored.map(normalizeBot);
  const changed = normalized.some((bot, index) => JSON.stringify(bot.blocks) !== JSON.stringify(stored[index]?.blocks));
  if (changed) writeStoredList(STORAGE_KEY, normalized);
  return normalized.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSalesBot(id: string): SalesBotDefinition | undefined {
  return listSalesBots().find((bot) => bot.id === id);
}

const chainTargets = (bot: SalesBotDefinition) => bot.blocks
  .filter((block) => block.type === 'chain_flow')
  .map((block) => String(block.config.botId ?? '').trim())
  .filter(Boolean);

function hasReachableChainCycle(candidate: SalesBotDefinition, storedBots: SalesBotDefinition[]): boolean {
  const graph = new Map(storedBots.map((bot) => [bot.id, bot]));
  graph.set(candidate.id, candidate);
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (botId: string): boolean => {
    if (visiting.has(botId)) return true;
    if (visited.has(botId)) return false;
    const bot = graph.get(botId);
    if (!bot) return false;

    visiting.add(botId);
    for (const targetId of chainTargets(bot)) {
      if (graph.has(targetId) && visit(targetId)) return true;
    }
    visiting.delete(botId);
    visited.add(botId);
    return false;
  };

  return visit(candidate.id);
}

function validateSalesBotReferences(bot: SalesBotDefinition): string[] {
  const issues: string[] = [];
  const agents = listAIAgents();
  const bots = listSalesBots();

  bot.blocks.forEach((block) => {
    if (block.type === 'ai_agent') {
      const agentId = String(block.config.agentId ?? '').trim();
      if (agentId) {
        const agent = agents.find((item) => item.id === agentId);
        if (!agent) issues.push(`${block.label}: agente IA não encontrado.`);
        else if (agent.status !== 'active') issues.push(`${block.label}: agente IA precisa estar ativo.`);
      }
    }
    if (block.type === 'chain_flow') {
      const targetId = String(block.config.botId ?? '').trim();
      if (targetId === bot.id) issues.push(`${block.label}: o fluxo não pode encadear a si mesmo.`);
      else if (targetId) {
        const target = bots.find((item) => item.id === targetId);
        if (!target) issues.push(`${block.label}: SalesBot encadeado não encontrado.`);
        else if (target.status !== 'active') issues.push(`${block.label}: SalesBot encadeado precisa estar ativo.`);
      }
    }
  });

  if (hasReachableChainCycle(bot, bots)) {
    issues.push('Encadeamento de SalesBots contém um ciclo. Remova o caminho circular antes de ativar.');
  }

  return issues;
}

export function validateSalesBotForActivation(bot: SalesBotDefinition): string[] {
  return [...validateSalesBot(bot), ...validateSalesBotReferences(bot)];
}

export function createSalesBot(input: { name: string; description?: string }): SalesBotDefinition {
  const timestamp = now();
  const bot: SalesBotDefinition = {
    id: createF05Id('bot'),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    status: 'draft',
    blocks: [makeStartBlock()],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [bot, ...listSalesBots()]);
  return bot;
}

export async function createSalesBotConfirmed(input: { name: string; description?: string }): Promise<SalesBotDefinition> {
  const timestamp = now();
  const bot: SalesBotDefinition = {
    id: createF05Id('bot'),
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    status: 'draft',
    blocks: [makeStartBlock()],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await writeStoredListConfirmed(STORAGE_KEY, [bot, ...listSalesBots()]);
  return bot;
}

export function updateSalesBot(
  id: string,
  patch: Partial<Pick<SalesBotDefinition, 'name' | 'description' | 'status' | 'blocks'>>,
): SalesBotDefinition {
  const items = listSalesBots();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('SalesBot não encontrado.');
  let updated: SalesBotDefinition = normalizeBot({ ...current, ...patch, updatedAt: now() });

  if (current.status === 'active' && patch.status === undefined && validateSalesBotForActivation(updated).length > 0) {
    updated = { ...updated, status: 'paused' };
  }

  if (current.status === 'active' && updated.status !== 'active') {
    const activeReferences = findActiveSalesBotReferences(id);
    if (activeReferences.length > 0) {
      throw new Error(`Pause primeiro os recursos ativos que dependem deste SalesBot: ${formatF05References(activeReferences)}.`);
    }
  }

  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteSalesBot(id: string): void {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const references = findSalesBotReferences(id);
  if (references.length > 0) {
    throw new Error(`Este SalesBot ainda é referenciado por: ${formatF05References(references)}.`);
  }
  writeStoredList(STORAGE_KEY, listSalesBots().filter((item) => item.id !== id));
}

export function duplicateSalesBot(id: string): SalesBotDefinition {
  const source = getSalesBot(id);
  if (!source) throw new Error('SalesBot não encontrado.');
  const timestamp = now();
  const idMap = new Map(source.blocks.map((block) => [block.id, createF05Id('block')]));
  const copy: SalesBotDefinition = {
    ...source,
    id: createF05Id('bot'),
    name: `${source.name} cópia`,
    status: 'draft',
    blocks: source.blocks.map((block) => ({
      ...block,
      id: idMap.get(block.id)!,
      config: JSON.parse(JSON.stringify(block.config)) as SalesBotBlock['config'],
      nextBlockId: block.nextBlockId ? idMap.get(block.nextBlockId) ?? null : null,
      falseNextBlockId: block.falseNextBlockId ? idMap.get(block.falseNextBlockId) ?? null : null,
      routes: Object.fromEntries(Object.entries(block.routes ?? {}).map(([key, target]) => [key, target ? idMap.get(target) ?? null : null])),
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [copy, ...listSalesBots()]);
  return copy;
}

export function setSalesBotStatus(id: string, status: SalesBotStatus): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  if (status === 'active') {
    const issues = validateSalesBotForActivation(current);
    if (issues.length > 0) throw new Error(issues.join(' '));
  }
  return updateSalesBot(id, { status });
}

export function addSalesBotBlock(id: string, block: Omit<SalesBotBlock, 'id'>): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  return updateSalesBot(id, { blocks: [...current.blocks, { ...block, id: createF05Id('block') }] });
}

export function insertSalesBotBlockAfter(id: string, afterBlockId: string, block: Omit<SalesBotBlock, 'id'>): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const afterIndex = current.blocks.findIndex((item) => item.id === afterBlockId);
  if (afterIndex < 0) throw new Error('Bloco de origem não encontrado.');
  const source = current.blocks[afterIndex];
  const oldNext = source.nextBlockId ?? current.blocks[afterIndex + 1]?.id ?? null;
  const nextBlock: SalesBotBlock = {
    ...block,
    id: createF05Id('block'),
    x: (source.x ?? 80) + 270,
    y: source.y ?? 90,
    nextBlockId: oldNext,
    falseNextBlockId: null,
    routes: {},
  };
  const blocks = current.blocks.map((item) => item.id === source.id ? { ...item, nextBlockId: nextBlock.id } : item);
  blocks.splice(afterIndex + 1, 0, nextBlock);
  return updateSalesBot(id, { blocks });
}

export function insertSalesBotBlockFromOutput(
  id: string,
  sourceBlockId: string,
  branch: 'next' | 'false' | `route:${string}`,
  block: Omit<SalesBotBlock, 'id'>,
): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const sourceIndex = current.blocks.findIndex((item) => item.id === sourceBlockId);
  if (sourceIndex < 0) throw new Error('Bloco de origem não encontrado.');
  const source = current.blocks[sourceIndex];

  const branchIndex = branch === 'false'
    ? 1
    : branch.startsWith('route:')
      ? Math.max(1, Object.keys(source.routes ?? {}).indexOf(branch.slice(6)) + 1)
      : 0;
  const created: SalesBotBlock = {
    ...block,
    id: createF05Id('block'),
    x: (source.x ?? 80) + 360,
    y: Math.max(30, (source.y ?? 70) + branchIndex * 190),
    nextBlockId: null,
    falseNextBlockId: null,
    routes: {},
  };

  const updatedSource: SalesBotBlock = {
    ...source,
    routes: { ...(source.routes ?? {}) },
  };
  if (branch === 'false') updatedSource.falseNextBlockId = created.id;
  else if (branch.startsWith('route:')) updatedSource.routes![branch.slice(6)] = created.id;
  else updatedSource.nextBlockId = created.id;

  const blocks = current.blocks.map((item) => item.id === source.id ? updatedSource : item);
  blocks.splice(sourceIndex + 1, 0, created);
  return updateSalesBot(id, { blocks });
}

export function duplicateSalesBotBlock(id: string, blockId: string): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const block = current.blocks.find((item) => item.id === blockId);
  if (!block) throw new Error('Bloco não encontrado.');
  if (block.type === 'trigger') return current;
  return insertSalesBotBlockAfter(id, blockId, { type: block.type, label: block.label, config: { ...block.config } });
}

export function updateSalesBotBlock(
  id: string,
  blockId: string,
  patch: Partial<Pick<SalesBotBlock, 'label' | 'config' | 'x' | 'y' | 'nextBlockId' | 'falseNextBlockId' | 'routes'>>,
): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const exists = current.blocks.some((block) => block.id === blockId);
  if (!exists) throw new Error('Bloco não encontrado.');
  return updateSalesBot(id, {
    blocks: current.blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block),
  });
}

export function removeSalesBotBlock(id: string, blockId: string): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const block = current.blocks.find((item) => item.id === blockId);
  if (!block) throw new Error('Bloco não encontrado.');
  if (block.type === 'trigger') return current;
  const replacement = block.nextBlockId ?? null;
  const blocks = current.blocks
    .filter((item) => item.id !== blockId)
    .map((item) => ({
      ...item,
      nextBlockId: item.nextBlockId === blockId ? replacement : item.nextBlockId,
      falseNextBlockId: item.falseNextBlockId === blockId ? null : item.falseNextBlockId,
      routes: Object.fromEntries(Object.entries(item.routes ?? {}).map(([key, target]) => [key, target === blockId ? null : target])),
    }));
  return updateSalesBot(id, { blocks });
}

export async function importSalesBot(
  input: unknown,
  fallbackName = 'SalesBot importado',
): Promise<SalesBotDefinition> {
  const root = Array.isArray(input) ? input[0] : input;
  const source = recordValue(root);
  if (!source || !Array.isArray(source.blocks)) throw new Error('Arquivo de SalesBot inválido.');

  const rawBlocks = source.blocks.map(recordValue);
  if (rawBlocks.some((block) => !block)) throw new Error('O arquivo contém blocos inválidos.');

  const sourceIds = rawBlocks.map((block, index) => String(block?.id ?? `legacy-${index}`));
  const idMap = new Map(sourceIds.map((sourceId) => [sourceId, createF05Id('block')]));

  const blocks = rawBlocks.map((block, index): SalesBotBlock => {
    const current = block!;
    const type = importedType(current);
    if (!type) throw new Error(`Tipo de bloco não suportado na importação: ${String(current.type ?? current.kind ?? 'desconhecido')}.`);

    const sourceId = sourceIds[index];
    const config = current.config !== undefined
      ? importConfig(current.config)
      : importedLegacyConfig(current, type);
    const sourceRoutes = recordValue(current.routes) ?? {};

    return {
      id: idMap.get(sourceId)!,
      type,
      label: String(current.label ?? recordValue(current.data)?.label ?? (type === 'trigger' ? 'Iniciar SalesBot' : 'Bloco')),
      config,
      x: Number.isFinite(Number(current.x)) ? Number(current.x) : undefined,
      y: Number.isFinite(Number(current.y)) ? Number(current.y) : undefined,
      nextBlockId: current.nextBlockId ? idMap.get(String(current.nextBlockId)) ?? null : null,
      falseNextBlockId: current.falseNextBlockId ? idMap.get(String(current.falseNextBlockId)) ?? null : null,
      routes: Object.fromEntries(
        Object.entries(sourceRoutes).map(([key, target]) => [
          key,
          target ? idMap.get(String(target)) ?? null : null,
        ]),
      ),
    };
  });

  const timestamp = now();
  const imported = normalizeBot({
    id: createF05Id('bot'),
    name: String(source.name ?? source.nome ?? fallbackName).trim() || fallbackName,
    description: String(source.description ?? '').trim(),
    status: 'draft',
    blocks,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await writeStoredListConfirmed(STORAGE_KEY, [imported, ...listSalesBots()]);
  return imported;
}

export function moveSalesBotBlock(id: string, blockId: string, direction: -1 | 1): SalesBotDefinition {
  const current = getSalesBot(id);
  if (!current) throw new Error('SalesBot não encontrado.');
  const index = current.blocks.findIndex((block) => block.id === blockId);
  const target = index + direction;
  if (index <= 0 || target <= 0 || target >= current.blocks.length) return current;
  const blocks = [...current.blocks];
  [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
  return updateSalesBot(id, { blocks });
}
