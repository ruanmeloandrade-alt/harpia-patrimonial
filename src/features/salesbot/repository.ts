import { listAIAgents } from '../ai-agents/repository';
import { createF05Id, readStoredList, writeStoredList, writeStoredListConfirmed } from '../automations/f05Storage';
import { findActiveSalesBotReferences, findSalesBotReferences, formatF05References } from '../automations/referenceIntegrity';
import type { SalesBotBlock, SalesBotDefinition, SalesBotStatus } from './types';
import { validateSalesBot } from './validation';

const STORAGE_KEY = 'harpia:f05:salesbots';
const now = () => new Date().toISOString();

const makeStartBlock = (): SalesBotBlock => ({
  id: createF05Id('block'),
  type: 'trigger',
  label: 'Iniciar SalesBot',
  config: { event: 'manual' },
});

const normalizeBot = (bot: SalesBotDefinition): SalesBotDefinition => {
  const startIndex = bot.blocks.findIndex((block) => block.type === 'trigger');
  if (startIndex === 0) {
    const start = bot.blocks[0];
    if (start.label === 'Iniciar SalesBot' && start.config.event) return bot;
    return {
      ...bot,
      blocks: [{ ...start, label: 'Iniciar SalesBot', config: { ...start.config, event: start.config.event || 'manual' } }, ...bot.blocks.slice(1)],
    };
  }
  if (startIndex > 0) {
    const start = bot.blocks[startIndex];
    return {
      ...bot,
      blocks: [
        { ...start, label: 'Iniciar SalesBot', config: { ...start.config, event: start.config.event || 'manual' } },
        ...bot.blocks.filter((_, index) => index !== startIndex),
      ],
    };
  }
  return { ...bot, blocks: [makeStartBlock(), ...bot.blocks] };
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
  const copy: SalesBotDefinition = {
    ...source,
    id: createF05Id('bot'),
    name: `${source.name} — cópia`,
    status: 'draft',
    blocks: source.blocks.map((block) => ({ ...block, id: createF05Id('block'), config: { ...block.config } })),
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
  const nextBlock = { ...block, id: createF05Id('block') };
  const blocks = [...current.blocks];
  blocks.splice(afterIndex + 1, 0, nextBlock);
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
  patch: Partial<Pick<SalesBotBlock, 'label' | 'config'>>,
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
  return updateSalesBot(id, { blocks: current.blocks.filter((item) => item.id !== blockId) });
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
