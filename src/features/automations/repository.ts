import { createF05Id, readStoredList, writeStoredList } from './f05Storage';
import type { AutomationAction, AutomationDefinition, AutomationStatus } from './types';

const STORAGE_KEY = 'harpia:f05:automations';
const now = () => new Date().toISOString();

export function listAutomations(): AutomationDefinition[] {
  return readStoredList<AutomationDefinition>(STORAGE_KEY).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createAutomation(name: string): AutomationDefinition {
  const timestamp = now();
  const item: AutomationDefinition = {
    id: createF05Id('automation'),
    name: name.trim(),
    description: '',
    status: 'draft',
    trigger: { event: 'lead.created', conditions: [] },
    actions: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  writeStoredList(STORAGE_KEY, [item, ...listAutomations()]);
  return item;
}

export function updateAutomation(id: string, patch: Partial<Omit<AutomationDefinition, 'id' | 'createdAt'>>): AutomationDefinition {
  const items = listAutomations();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  const updated = { ...current, ...patch, updatedAt: now() };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function deleteAutomation(id: string): void {
  writeStoredList(STORAGE_KEY, listAutomations().filter((item) => item.id !== id));
}

export function setAutomationStatus(id: string, status: AutomationStatus): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  if (status === 'active' && current.actions.length === 0) throw new Error('Adicione pelo menos uma ação antes de ativar a automação.');
  return updateAutomation(id, { status });
}

export function addAutomationAction(id: string, action: Omit<AutomationAction, 'id'>): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  return updateAutomation(id, { actions: [...current.actions, { ...action, id: createF05Id('action') }] });
}

export function updateAutomationAction(id: string, actionId: string, config: AutomationAction['config']): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  if (!current.actions.some((action) => action.id === actionId)) throw new Error('Ação não encontrada.');
  return updateAutomation(id, {
    actions: current.actions.map((action) => action.id === actionId ? { ...action, config } : action),
  });
}

export function removeAutomationAction(id: string, actionId: string): AutomationDefinition {
  const current = listAutomations().find((item) => item.id === id);
  if (!current) throw new Error('Automação não encontrada.');
  return updateAutomation(id, { actions: current.actions.filter((action) => action.id !== actionId) });
}
