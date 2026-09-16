import { requireSupabase } from '../../core/supabase/client';
import type { CrmState } from '../../features/crm/domain';
import { createEmptyCrmState } from '../../features/crm/domain';
import type { CrmRepository } from '../../features/crm/repository';
import type { InboxState } from '../../features/inbox/domain';
import { createEmptyInboxState } from '../../features/inbox/domain';
import type { InboxRepository } from '../../features/inbox/repository';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function normalizeCrm(value: unknown): CrmState {
  if (!value || typeof value !== 'object') return createEmptyCrmState();
  const state = value as Partial<CrmState>;
  return {
    version: 1,
    pipelines: Array.isArray(state.pipelines) ? state.pipelines : [],
    stages: Array.isArray(state.stages) ? state.stages : [],
    leads: Array.isArray(state.leads) ? state.leads : [],
    tags: Array.isArray(state.tags) ? state.tags : [],
    customFieldDefinitions: Array.isArray(state.customFieldDefinitions) ? state.customFieldDefinitions : [],
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    history: Array.isArray(state.history) ? state.history : [],
  };
}

function normalizeInbox(value: unknown): InboxState {
  if (!value || typeof value !== 'object') return createEmptyInboxState();
  const state = value as Partial<InboxState>;
  return {
    version: 1,
    conversations: Array.isArray(state.conversations) ? state.conversations : [],
    messages: Array.isArray(state.messages) ? state.messages : [],
  };
}

function same(valueA: unknown, valueB: unknown) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

function crmRemoteOnlyAddedLeads(base: CrmState, remote: CrmState) {
  if (!same(base.pipelines, remote.pipelines)
    || !same(base.stages, remote.stages)
    || !same(base.tags, remote.tags)
    || !same(base.customFieldDefinitions, remote.customFieldDefinitions)
    || !same(base.tasks, remote.tasks)) return false;

  const remoteLeads = new Map(remote.leads.map((lead) => [lead.id, lead]));
  if (base.leads.some((lead) => !same(lead, remoteLeads.get(lead.id)))) return false;
  const remoteHistory = new Map(remote.history.map((entry) => [entry.id, entry]));
  if (base.history.some((entry) => !same(entry, remoteHistory.get(entry.id)))) return false;
  return true;
}

function mergeRemoteLeadAdditions(local: CrmState, remote: CrmState): CrmState {
  const localLeadIds = new Set(local.leads.map((lead) => lead.id));
  const localHistoryIds = new Set(local.history.map((entry) => entry.id));
  return {
    ...clone(local),
    leads: [...local.leads, ...remote.leads.filter((lead) => !localLeadIds.has(lead.id))],
    history: [...local.history, ...remote.history.filter((entry) => !localHistoryIds.has(entry.id))],
  };
}

async function readModule(module: 'crm' | 'inbox') {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('platform_module_state')
    .select('state,revision')
    .eq('module', module)
    .single();
  if (error) throw error;
  return { state: data.state as unknown, revision: Number(data.revision ?? 0) };
}

async function saveModule(module: 'crm' | 'inbox', state: unknown, expectedRevision: number) {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase.rpc('save_platform_module_state', {
    p_module: module,
    p_state: state,
    p_expected_revision: expectedRevision,
  });
  if (error) throw error;
  return data === null ? null : Number(data);
}

function persistenceError(module: string, error: unknown) {
  const detail = error instanceof Error ? error.message : 'Falha de persistência compartilhada.';
  console.error(`[${module}] persistence failed`, error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:persistence-error', { detail: { module, message: detail } }));
  }
}

export class SupabaseCrmRepository implements CrmRepository {
  private memory: CrmState;
  private base: CrmState;
  private revision: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(initialState: CrmState, revision: number) {
    this.memory = clone(initialState);
    this.base = clone(initialState);
    this.revision = revision;
  }

  load(): CrmState { return clone(this.memory); }

  save(state: CrmState): void {
    const pending = normalizeCrm(state);
    this.memory = clone(pending);
    this.queue = this.queue
      .then(() => this.persist(pending))
      .catch((error) => persistenceError('crm', error));
  }

  clear(): void { this.save(createEmptyCrmState()); }

  async whenIdle() { await this.queue; }

  private async persist(pending: CrmState) {
    let nextRevision = await saveModule('crm', pending, this.revision);
    let stateToCommit = pending;

    if (nextRevision === null) {
      const latest = await readModule('crm');
      const remote = normalizeCrm(latest.state);
      if (!crmRemoteOnlyAddedLeads(this.base, remote)) {
        throw new Error('O CRM foi alterado por outra sessão. Recarregue antes de salvar novamente.');
      }
      stateToCommit = mergeRemoteLeadAdditions(pending, remote);
      nextRevision = await saveModule('crm', stateToCommit, latest.revision);
      if (nextRevision === null) throw new Error('O CRM mudou novamente durante a sincronização. Recarregue a página.');
    }

    this.memory = clone(stateToCommit);
    this.base = clone(stateToCommit);
    this.revision = nextRevision;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('harpia:crm-updated'));
  }
}

export class SupabaseInboxRepository implements InboxRepository {
  private memory: InboxState;
  private revision: number;
  private queue: Promise<void> = Promise.resolve();

  constructor(initialState: InboxState, revision: number) {
    this.memory = clone(initialState);
    this.revision = revision;
  }

  load(): InboxState { return clone(this.memory); }

  save(state: InboxState): void {
    const pending = normalizeInbox(state);
    this.memory = clone(pending);
    this.queue = this.queue
      .then(async () => {
        const nextRevision = await saveModule('inbox', pending, this.revision);
        if (nextRevision === null) throw new Error('A Inbox foi alterada por outra sessão. Recarregue antes de salvar novamente.');
        this.revision = nextRevision;
      })
      .catch((error) => persistenceError('inbox', error));
  }

  clear(): void { this.save(createEmptyInboxState()); }
  async whenIdle() { await this.queue; }
}

export async function hydrateSharedCrmRepository() {
  const row = await readModule('crm');
  return new SupabaseCrmRepository(normalizeCrm(row.state), row.revision);
}

export async function hydrateSharedInboxRepository() {
  const row = await readModule('inbox');
  return new SupabaseInboxRepository(normalizeInbox(row.state), row.revision);
}
