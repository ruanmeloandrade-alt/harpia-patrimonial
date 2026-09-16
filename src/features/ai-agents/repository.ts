import { createF05Id, readStoredList, writeStoredList } from '../automations/f05Storage';
import { findActiveAIAgentReferences, findAIAgentReferences, formatF05References } from '../automations/referenceIntegrity';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import type { AIAgentDefinition, AIAgentStatus } from './types';

const STORAGE_KEY = 'harpia:f05:ai-agents';
const now = () => new Date().toISOString();

const isProviderReady = (agent: AIAgentDefinition) => {
  if (!agent.providerProfileId) return false;
  const profile = listAIProviderProfiles().find((item) => item.id === agent.providerProfileId);
  return Boolean(profile && profile.status === 'ready' && profile.apiKeyConfigured && profile.secretRef);
};

export function listAIAgents(): AIAgentDefinition[] {
  return readStoredList<AIAgentDefinition>(STORAGE_KEY)
    .map((agent) => ({ ...agent, providerProfileId: agent.providerProfileId ?? '' }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createAIAgent(name: string): AIAgentDefinition {
  const timestamp = now();
  const agent: AIAgentDefinition = {
    id: createF05Id('agent'),
    name: name.trim(),
    role: '',
    instructions: '',
    rules: '',
    context: '',
    accessScopes: [],
    activationPoints: [],
    providerProfileId: '',
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [agent, ...listAIAgents()]);
  return agent;
}

export function updateAIAgent(id: string, patch: Partial<Omit<AIAgentDefinition, 'id' | 'createdAt'>>): AIAgentDefinition {
  const items = listAIAgents();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Agente IA não encontrado.');
  let updated: AIAgentDefinition = { ...current, ...patch, updatedAt: now() };

  if (current.status === 'active' && patch.status === undefined && !isProviderReady(updated)) {
    updated = { ...updated, status: 'paused' };
  }

  if (current.status === 'active' && updated.status !== 'active') {
    const activeReferences = findActiveAIAgentReferences(id);
    if (activeReferences.length > 0) {
      throw new Error(`Pause primeiro os recursos ativos que dependem deste agente IA: ${formatF05References(activeReferences)}.`);
    }
  }

  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteAIAgent(id: string): void {
  const current = listAIAgents().find((item) => item.id === id);
  if (!current) throw new Error('Agente IA não encontrado.');
  const references = findAIAgentReferences(id);
  if (references.length > 0) {
    throw new Error(`Este agente IA ainda é referenciado por: ${formatF05References(references)}.`);
  }
  writeStoredList(STORAGE_KEY, listAIAgents().filter((item) => item.id !== id));
}

export function setAIAgentStatus(id: string, status: AIAgentStatus): AIAgentDefinition {
  const agent = listAIAgents().find((item) => item.id === id);
  if (!agent) throw new Error('Agente IA não encontrado.');
  if (status === 'active' && !isProviderReady(agent)) {
    throw new Error('O perfil de provedor IA precisa estar pronto e com chave API segura configurada.');
  }
  return updateAIAgent(id, { status });
}
