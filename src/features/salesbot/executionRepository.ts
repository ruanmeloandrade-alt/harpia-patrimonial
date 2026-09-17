import {
  createF05Id,
  readStoredList,
  writeStoredList,
  writeStoredListConfirmed,
} from '../automations/f05Storage';
import type { SalesBotExecutionLog, SalesBotExecutionStatus } from './types';

const STORAGE_KEY = 'harpia:f05:salesbot-executions';
const DEFAULT_RESUME_CLAIM_MS = 60_000;

export function listSalesBotExecutions(): SalesBotExecutionLog[] {
  return readStoredList<SalesBotExecutionLog>(STORAGE_KEY).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

function hasActiveResumeClaim(item: SalesBotExecutionLog, nowMs: number): boolean {
  if (!item.resumeClaimedUntil) return false;
  const claimedUntilMs = Date.parse(item.resumeClaimedUntil);
  return Number.isFinite(claimedUntilMs) && claimedUntilMs > nowMs;
}

export function listDueSalesBotExecutions(now = new Date()): SalesBotExecutionLog[] {
  const nowMs = now.getTime();
  return listSalesBotExecutions().filter((item) => {
    if (item.status !== 'paused' || item.resumeMode !== 'next_block' || !item.resumeAt) return false;
    if (hasActiveResumeClaim(item, nowMs)) return false;
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
  patch: Partial<Pick<
    SalesBotExecutionLog,
    | 'status'
    | 'currentBlockId'
    | 'resumeMode'
    | 'resumeAt'
    | 'resumeClaimToken'
    | 'resumeClaimedUntil'
    | 'runtimeContext'
    | 'error'
    | 'action'
    | 'aiAgentId'
    | 'finishedAt'
  >>,
): SalesBotExecutionLog {
  const items = listSalesBotExecutions();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Execução não encontrada.');
  const updated = { ...current, ...patch };
  writeStoredList(STORAGE_KEY, items.map((item) => (item.id === id ? updated : item)));
  return updated;
}

/**
 * Reserva uma execução pausada para uma única sessão antes da retomada.
 * Em storage compartilhado, a escrita confirmada usa optimistic locking: se
 * outra sessão ganhar a corrida, esta chamada falha e o snapshot remoto é
 * restaurado. O lease expira para evitar travamento permanente se a sessão
 * morrer antes de iniciar a execução.
 */
export async function claimPausedExecutionForResume(
  id: string,
  input: {
    runtimeContext?: Record<string, unknown>;
    now?: Date;
    leaseMs?: number;
  } = {},
): Promise<SalesBotExecutionLog | null> {
  const items = listSalesBotExecutions();
  const current = items.find((item) => item.id === id);
  if (!current || current.status !== 'paused') return null;

  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  if (hasActiveResumeClaim(current, nowMs)) return null;

  const leaseMs = Math.max(5_000, input.leaseMs ?? DEFAULT_RESUME_CLAIM_MS);
  const updated: SalesBotExecutionLog = {
    ...current,
    runtimeContext: input.runtimeContext ?? current.runtimeContext,
    resumeClaimToken: createF05Id('resume-claim'),
    resumeClaimedUntil: new Date(nowMs + leaseMs).toISOString(),
    action: 'Retomada reservada por uma sessão.',
  };

  await writeStoredListConfirmed(
    STORAGE_KEY,
    items.map((item) => (item.id === id ? updated : item)),
  );
  return updated;
}

export function finishExecution(id: string, status: Exclude<SalesBotExecutionStatus, 'running' | 'paused'>, error?: string) {
  return updateExecution(id, {
    status,
    error,
    resumeMode: undefined,
    resumeAt: undefined,
    resumeClaimToken: undefined,
    resumeClaimedUntil: undefined,
    runtimeContext: undefined,
    finishedAt: new Date().toISOString(),
  });
}

export function clearExecutionLogs(): void {
  writeStoredList<SalesBotExecutionLog>(STORAGE_KEY, []);
}
