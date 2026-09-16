import { createF05Id, readStoredList, writeStoredList } from '../automations/f05Storage';
import type { SalesBotExecutionLog, SalesBotExecutionStatus } from './types';

const STORAGE_KEY = 'harpia:f05:salesbot-executions';

export function listSalesBotExecutions(): SalesBotExecutionLog[] {
  return readStoredList<SalesBotExecutionLog>(STORAGE_KEY).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function listDueSalesBotExecutions(now = new Date()): SalesBotExecutionLog[] {
  const nowMs = now.getTime();
  return listSalesBotExecutions().filter((item) => {
    if (item.status !== 'paused' || item.resumeMode !== 'next_block' || !item.resumeAt) return false;
    const resumeAtMs = Date.parse(item.resumeAt);
    return Number.isFinite(resumeAtMs) && resumeAtMs <= nowMs;
  });
}

export function startExecution(input: {
  botId: string;
  leadId?: string;
  conversationId?: string;
  runtimeContext?: Record<string, unknown>;
}): SalesBotExecutionLog {
  const log: SalesBotExecutionLog = {
    id: createF05Id('execution'),
    botId: input.botId,
    leadId: input.leadId,
    conversationId: input.conversationId,
    runtimeContext: input.runtimeContext,
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  writeStoredList(STORAGE_KEY, [log, ...listSalesBotExecutions()]);
  return log;
}

export function updateExecution(
  id: string,
  patch: Partial<Pick<SalesBotExecutionLog, 'status' | 'currentBlockId' | 'resumeMode' | 'resumeAt' | 'runtimeContext' | 'error' | 'action' | 'aiAgentId' | 'finishedAt'>>,
): SalesBotExecutionLog {
  const items = listSalesBotExecutions();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Execução não encontrada.');
  const updated = { ...current, ...patch };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

export function finishExecution(id: string, status: Exclude<SalesBotExecutionStatus, 'running' | 'paused'>, error?: string) {
  return updateExecution(id, {
    status,
    error,
    resumeMode: undefined,
    resumeAt: undefined,
    runtimeContext: undefined,
    finishedAt: new Date().toISOString(),
  });
}

export function clearExecutionLogs(): void {
  writeStoredList<SalesBotExecutionLog>(STORAGE_KEY, []);
}
