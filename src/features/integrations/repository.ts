import { readStoredList, writeStoredList } from '../automations/f05Storage';
import { INTEGRATION_DEFAULTS, type IntegrationConfig, type IntegrationKind } from './types';

const STORAGE_KEY = 'harpia:f05:integrations';

export function listIntegrations(): IntegrationConfig[] {
  const saved = readStoredList<IntegrationConfig>(STORAGE_KEY);
  if (saved.length === 0) return INTEGRATION_DEFAULTS;
  return INTEGRATION_DEFAULTS.map((fallback) => saved.find((item) => item.id === fallback.id) ?? fallback);
}

export function updateIntegration(id: IntegrationKind, patch: Partial<Pick<IntegrationConfig, 'status' | 'notes'>>): IntegrationConfig {
  const items = listIntegrations();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Integração não encontrada.');
  const updated: IntegrationConfig = { ...current, ...patch, updatedAt: new Date().toISOString() };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}
