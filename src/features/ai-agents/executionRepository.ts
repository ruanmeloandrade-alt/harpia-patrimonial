import { createF05Id, readStoredList, writeStoredList } from '../automations/f05Storage';
import type { AIAgentExecutionLog, AIAgentExecutionStatus } from './executionTypes';

const STORAGE_KEY = 'harpia:f05:ai-agent-executions';

export function listAIAgentExecutions(): AIAgentExecutionLog[] {
  return readStoredList<AIAgentExecutionLog>(STORAGE_KEY).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function startAIAgentExecution(input: {
  agentId: string;
  providerProfileId: string;
  leadId?: string;
  conversationId?: string;
}): AIAgentExecutionLog {
  const item: AIAgentExecutionLog = {
    id: createF05Id('ai-execution'),
    agentId: input.agentId,
    providerProfileId: input.providerProfileId,
    leadId: input.leadId,
    conversationId: input.conversationId,
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  writeStoredList(STORAGE_KEY, [item, ...listAIAgentExecutions()]);
  return item;
}

export function updateAIAgentExecution(
  id: string,
  patch: Partial<Pick<AIAgentExecutionLog, 'status' | 'finishedAt' | 'error'>>,
): AIAgentExecutionLog {
  const items = listAIAgentExecutions();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Execução de IA não encontrada.');
  const updated = { ...current, ...patch };
  writeStoredList(STORAGE_KEY, items.map((item) => item.id === id ? updated : item));
  return updated;
}

export function finishAIAgentExecution(
  id: string,
  status: Exclude<AIAgentExecutionStatus, 'running' | 'paused'>,
  error?: string,
): AIAgentExecutionLog {
  return updateAIAgentExecution(id, { status, error, finishedAt: new Date().toISOString() });
}

export function clearAIAgentExecutionLogs(): void {
  writeStoredList<AIAgentExecutionLog>(STORAGE_KEY, []);
}
