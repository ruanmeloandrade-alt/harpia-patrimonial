import { createF05Id, readStoredList, writeStoredList } from '../automations/f05Storage';
import type { AIProviderKind, AIProviderProfile, AIProviderProfileStatus } from './aiProviderTypes';

const STORAGE_KEY = 'harpia:f05:ai-provider-profiles';
const now = () => new Date().toISOString();

export function listAIProviderProfiles(): AIProviderProfile[] {
  return readStoredList<AIProviderProfile>(STORAGE_KEY).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createAIProviderProfile(input: { name: string; provider: AIProviderKind }): AIProviderProfile {
  const timestamp = now();
  const profile: AIProviderProfile = {
    id: createF05Id('ai-provider'),
    name: input.name.trim(),
    provider: input.provider,
    model: '',
    baseUrl: '',
    status: 'draft',
    apiKeyConfigured: false,
    notes: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [profile, ...listAIProviderProfiles()]);
  return profile;
}

export function updateAIProviderProfile(
  id: string,
  patch: Partial<Omit<AIProviderProfile, 'id' | 'createdAt'>>,
): AIProviderProfile {
  const items = listAIProviderProfiles();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Perfil de IA não encontrado.');
  const updated: AIProviderProfile = { ...current, ...patch, updatedAt: now() };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteAIProviderProfile(id: string): void {
  writeStoredList(STORAGE_KEY, listAIProviderProfiles().filter((item) => item.id !== id));
}

export function setAIProviderProfileStatus(id: string, status: AIProviderProfileStatus): AIProviderProfile {
  return updateAIProviderProfile(id, { status });
}

export function validateAIProviderProfile(profile: AIProviderProfile): string[] {
  const issues: string[] = [];
  if (!profile.name.trim()) issues.push('Nome do perfil é obrigatório.');
  if (!profile.model.trim()) issues.push('Modelo é obrigatório.');
  if (profile.provider === 'custom' && !profile.baseUrl.trim()) issues.push('Endpoint é obrigatório para provedor customizado.');
  if (!profile.apiKeyConfigured) issues.push('Chave API ainda não foi configurada.');
  return issues;
}
