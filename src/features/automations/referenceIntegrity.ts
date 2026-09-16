import { readStoredList } from './f05Storage';

const SALESBOTS_KEY = 'harpia:f05:salesbots';
const AUTOMATIONS_KEY = 'harpia:f05:automations';
const AI_AGENTS_KEY = 'harpia:f05:ai-agents';

type GenericBlock = { type?: string; config?: Record<string, unknown> };
type GenericAction = { type?: string; config?: Record<string, unknown> };
type StoredSalesBot = { id: string; name?: string; status?: string; blocks?: GenericBlock[] };
type StoredAutomation = { id: string; name?: string; status?: string; actions?: GenericAction[] };
type StoredAIAgent = { id: string; name?: string; status?: string; providerProfileId?: string };

export interface F05Reference {
  kind: 'salesbot' | 'automation' | 'ai_agent';
  id: string;
  name: string;
  status: string;
}

const text = (value: unknown) => String(value ?? '').trim();

function bots() {
  return readStoredList<StoredSalesBot>(SALESBOTS_KEY);
}

function automations() {
  return readStoredList<StoredAutomation>(AUTOMATIONS_KEY);
}

function agents() {
  return readStoredList<StoredAIAgent>(AI_AGENTS_KEY);
}

function ref(kind: F05Reference['kind'], item: { id: string; name?: string; status?: string }): F05Reference {
  return { kind, id: item.id, name: text(item.name) || item.id, status: text(item.status) || 'draft' };
}

export function findSalesBotReferences(botId: string): F05Reference[] {
  const fromBots = bots()
    .filter((bot) => bot.id !== botId && (bot.blocks ?? []).some((block) => block.type === 'chain_flow' && text(block.config?.botId) === botId))
    .map((bot) => ref('salesbot', bot));

  const fromAutomations = automations()
    .filter((automation) => (automation.actions ?? []).some((action) => action.type === 'start_salesbot' && text(action.config?.botId) === botId))
    .map((automation) => ref('automation', automation));

  return [...fromBots, ...fromAutomations];
}

export function findActiveSalesBotReferences(botId: string): F05Reference[] {
  return findSalesBotReferences(botId).filter((item) => item.status === 'active');
}

export function findAIAgentReferences(agentId: string): F05Reference[] {
  const fromBots = bots()
    .filter((bot) => (bot.blocks ?? []).some((block) => block.type === 'ai_agent' && text(block.config?.agentId) === agentId))
    .map((bot) => ref('salesbot', bot));

  const fromAutomations = automations()
    .filter((automation) => (automation.actions ?? []).some((action) => action.type === 'invoke_ai' && text(action.config?.agentId) === agentId))
    .map((automation) => ref('automation', automation));

  return [...fromBots, ...fromAutomations];
}

export function findActiveAIAgentReferences(agentId: string): F05Reference[] {
  return findAIAgentReferences(agentId).filter((item) => item.status === 'active');
}

export function findAIProviderReferences(profileId: string): F05Reference[] {
  return agents()
    .filter((agent) => text(agent.providerProfileId) === profileId)
    .map((agent) => ref('ai_agent', agent));
}

export function findActiveAIProviderReferences(profileId: string): F05Reference[] {
  return findAIProviderReferences(profileId).filter((item) => item.status === 'active');
}

export function formatF05References(items: F05Reference[]): string {
  return items.map((item) => `${item.name} (${item.status})`).join(', ');
}
