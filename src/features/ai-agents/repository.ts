import { createF05Id, readStoredList, writeStoredList } from '../automations/f05Storage';
import { listAIProviderProfiles } from '../integrations/aiProviderRepository';
import type { AIAgentDefinition, AIAgentStatus } from './types';

const STORAGE_KEY = 'harpia:f05:ai-agents';
const now = () => new Date().toISOString();

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
  const updated = { ...current, ...patch, updatedAt: now() };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteAIAgent(id: string): void {
  writeStoredList(STORAGE_KEY, listAIAgents().filter((item) => item.id !== id));
}

export function setAIAgentStatus(id: string, status: AIAgentStatus): AIAgentDefinition {
  if (status === 'active') {
    const agent = listAIAgents().find((item) => item.id === id);
    if (!agent) throw new Error('Agente IA não encontrado.');
    if (!agent.providerProfileId) throw new Error('Selecione um perfil de provedor IA antes de ativar o agente.');
    const profile = listAIProviderProfiles().find((item) => item.id === agent.providerProfileId);
    if (!profile || profile.status !== 'ready' || !profile.apiKeyConfigured) {
      throw new Error('O perfil de provedor IA precisa estar pronto e com chave API configurada.');
    }
  }
  return updateAIAgent(id, { status });
}
