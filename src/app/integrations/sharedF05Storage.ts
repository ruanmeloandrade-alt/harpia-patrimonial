import { requireSupabase } from '../../core/supabase/client';
import {
  configureF05SharedStorage,
  replaceStoredListFromRemote,
  writeStoredListConfirmed,
  type F05SharedStorageBackend,
} from '../../features/automations/f05Storage';

interface StorageRow {
  storage_key: string;
  value: unknown;
  revision: number | string;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function normalizeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? clone(value) : [];
}


type LegacySalesBotBlock = {
  id?: string;
  kind?: string;
  data?: Record<string, unknown>;
  nextBlockId?: string | null;
  falseNextBlockId?: string | null;
  routes?: Record<string, string>;
};

type LegacySalesBot = {
  id?: string;
  name?: string;
  isActive?: boolean;
  startBlockId?: string;
  createdAt?: string;
  updatedAt?: string;
  blocks?: LegacySalesBotBlock[];
};

type LegacyAIAgent = {
  id?: string;
  name?: string;
  role?: string;
  prompt?: string;
  rules?: string;
  status?: string;
};

function readBrowserArray(key: string): unknown[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const nonEmptyString = (value: unknown) => typeof value === 'string' ? value.trim() : '';

function convertLegacyAgents(items: unknown[]) {
  const now = new Date().toISOString();
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const legacy = item as LegacyAIAgent;
    const id = nonEmptyString(legacy.id);
    const name = nonEmptyString(legacy.name);
    if (!id || !name) return [];
    const statusText = nonEmptyString(legacy.status).toLowerCase();
    return [{
      id,
      name,
      role: nonEmptyString(legacy.role),
      instructions: nonEmptyString(legacy.prompt),
      rules: nonEmptyString(legacy.rules),
      context: '',
      accessScopes: [],
      activationPoints: [],
      providerProfileId: '',
      status: statusText === 'rascunho' || statusText === 'draft' ? 'draft' : 'paused',
      createdAt: now,
      updatedAt: now,
    }];
  });
}

function legacyActionBlock(block: LegacySalesBotBlock) {
  const data = block.data ?? {};
  const action = nonEmptyString(data.actionType);
  if (action === 'change_stage') {
    return { type: 'move_stage', config: { stageId: nonEmptyString(data.stageId ?? data.stage) } };
  }
  if (action === 'change_owner') {
    return { type: 'assign_owner', config: { userId: nonEmptyString(data.userId ?? data.owner ?? data.assignee) } };
  }
  if (action === 'create_task') {
    return { type: 'create_task', config: { title: nonEmptyString(data.title ?? data.text) } };
  }
  if (action === 'set_field') {
    return {
      type: 'update_field',
      config: {
        fieldId: nonEmptyString(data.fieldId ?? data.field),
        fieldValue: data.value === undefined ? null : data.value as string | number | boolean | string[] | null,
      },
    };
  }
  if (action === 'set_tag') {
    return {
      type: 'tag',
      config: {
        operation: nonEmptyString(data.tagAction) === 'remove' ? 'remove' : 'add',
        tagId: nonEmptyString(data.tagId ?? data.tag),
      },
    };
  }
  return null;
}

function convertLegacySalesBots(items: unknown[]) {
  const now = new Date().toISOString();
  return items.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const legacy = item as LegacySalesBot;
    const id = nonEmptyString(legacy.id);
    const name = nonEmptyString(legacy.name);
    const rawBlocks = Array.isArray(legacy.blocks) ? legacy.blocks : [];
    if (!id || !name || rawBlocks.length === 0) return [];

    const byId = new Map(rawBlocks.map((block) => [nonEmptyString(block.id), block]));
    let current = byId.get(nonEmptyString(legacy.startBlockId))
      ?? rawBlocks.find((block) => block.kind === 'inicio')
      ?? rawBlocks[0];

    const ordered: LegacySalesBotBlock[] = [];
    const visited = new Set<string>();
    let safeForActivation = true;

    while (current) {
      const currentId = nonEmptyString(current.id);
      if (!currentId || visited.has(currentId)) {
        safeForActivation = false;
        break;
      }
      visited.add(currentId);
      ordered.push(current);
      const hasBranch = Boolean(current.falseNextBlockId)
        || Boolean(current.routes && Object.keys(current.routes).length > 0)
        || ['condicao', 'validacao', 'distribuicao'].includes(nonEmptyString(current.kind));
      if (hasBranch) safeForActivation = false;
      const nextId = nonEmptyString(current.nextBlockId);
      current = nextId ? byId.get(nextId) : undefined;
    }

    if (visited.size !== rawBlocks.length) safeForActivation = false;

    const blocks: Array<{
      id: string;
      type: string;
      label: string;
      config: Record<string, unknown>;
    }> = [];

    for (const [index, block] of ordered.entries()) {
      const blockId = nonEmptyString(block.id) || `legacy_block_${index}`;
      const kind = nonEmptyString(block.kind);
      const data = block.data ?? {};
      let mapped: { type: string; config: Record<string, unknown> } | null = null;

      if (kind === 'inicio') mapped = { type: 'trigger', config: { event: 'manual' } };
      else if (kind === 'mensagem') mapped = { type: 'message', config: { message: nonEmptyString(data.text) } };
      else if (kind === 'espera' && nonEmptyString(data.pauseType || 'timer') === 'timer') {
        mapped = { type: 'delay', config: { duration: nonEmptyString(data.duration) || '5m' } };
      } else if (kind === 'ia') {
        mapped = { type: 'ai_agent', config: { agentId: nonEmptyString(data.agentId) } };
        safeForActivation = false;
      } else if (kind === 'acao') {
        mapped = legacyActionBlock(block);
      } else if (kind === 'iniciar-salesbot') {
        mapped = { type: 'chain_flow', config: { botId: nonEmptyString(data.botId) } };
      } else if (kind === 'encerrar-bot') {
        mapped = { type: 'finish', config: {} };
      } else if (kind === 'webhook') {
        mapped = {
          type: 'webhook',
          config: {
            method: nonEmptyString(data.method) || 'POST',
            url: nonEmptyString(data.url),
          },
        };
      }

      if (!mapped) {
        safeForActivation = false;
        continue;
      }

      if (Object.values(mapped.config).some((value) => typeof value === 'string' && !value.trim())
        && mapped.type !== 'trigger'
        && mapped.type !== 'finish') {
        safeForActivation = false;
      }

      blocks.push({
        id: blockId,
        type: mapped.type,
        label: nonEmptyString(data.label) || (
          mapped.type === 'trigger' ? 'Iniciar SalesBot'
            : mapped.type === 'finish' ? 'Encerrar bot'
              : kind || 'Bloco'
        ),
        config: mapped.config,
      });
    }

    if (!blocks.some((block) => block.type === 'trigger')) {
      blocks.unshift({
        id: `legacy_trigger_${id}`,
        type: 'trigger',
        label: 'Iniciar SalesBot',
        config: { event: 'manual' },
      });
    }

    return [{
      id,
      name,
      description: safeForActivation
        ? 'Migrado automaticamente do construtor anterior.'
        : 'Migrado do construtor anterior. Revise o fluxo antes de ativar porque havia blocos ou ramificações do formato legado.',
      status: legacy.isActive && safeForActivation ? 'active' : legacy.isActive ? 'paused' : 'draft',
      blocks,
      createdAt: nonEmptyString(legacy.createdAt) || now,
      updatedAt: nonEmptyString(legacy.updatedAt) || now,
    }];
  });
}

async function migrateBrowserF05IfRemoteEmpty(values: Record<string, unknown[]>) {
  const migrations: Array<{ key: string; value: unknown[] }> = [];

  if ((values['harpia:f05:salesbots'] ?? []).length === 0) {
    const currentLocal = readBrowserArray('harpia:f05:salesbots');
    const legacyLocal = readBrowserArray('harpia_salesbots_v3');
    const candidate = currentLocal.length > 0 ? currentLocal : convertLegacySalesBots(legacyLocal);
    if (candidate.length > 0) migrations.push({ key: 'harpia:f05:salesbots', value: candidate });
  }

  if ((values['harpia:f05:ai-agents'] ?? []).length === 0) {
    const currentLocal = readBrowserArray('harpia:f05:ai-agents');
    const legacyLocal = readBrowserArray('harpia_demo_ai_agents_v1');
    const candidate = currentLocal.length > 0 ? currentLocal : convertLegacyAgents(legacyLocal);
    if (candidate.length > 0) migrations.push({ key: 'harpia:f05:ai-agents', value: candidate });
  }

  for (const migration of migrations) {
    try {
      await writeStoredListConfirmed(migration.key, migration.value);
    } catch (error) {
      console.warn(`[f05] não foi possível migrar ${migration.key}`, error);
    }
  }
}

class SupabaseF05SharedStorageBackend implements F05SharedStorageBackend {
  private readonly revisions = new Map<string, number>();
  private readonly queues = new Map<string, Promise<void>>();

  constructor(rows: StorageRow[]) {
    rows.forEach((row) => this.revisions.set(row.storage_key, Number(row.revision ?? 0)));
  }

  async save(key: string, value: unknown[]): Promise<void> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    const task = previous
      .catch(() => undefined)
      .then(() => this.persist(key, value));
    this.queues.set(key, task);
    await task;
  }

  private async persist(key: string, value: unknown[]) {
    const supabase = requireSupabase() as any;
    const expectedRevision = this.revisions.get(key);
    if (expectedRevision === undefined) {
      throw new Error(`Estado compartilhado não autorizado ou inexistente para ${key}.`);
    }

    const { data, error } = await supabase.rpc('save_f05_shared_storage', {
      p_storage_key: key,
      p_value: value,
      p_expected_revision: expectedRevision,
    });
    if (error) throw error;

    if (data === null) {
      const { data: latest, error: latestError } = await supabase
        .from('f05_shared_storage')
        .select('value,revision')
        .eq('storage_key', key)
        .maybeSingle();
      if (latestError) throw latestError;
      if (latest) {
        this.revisions.set(key, Number(latest.revision ?? 0));
        replaceStoredListFromRemote(key, normalizeArray(latest.value));
      }
      const remoteRevision = latest?.revision === undefined ? 'desconhecida' : String(latest.revision);
      throw new Error(`O módulo foi alterado por outra sessão (revisão ${remoteRevision}). O estado remoto foi restaurado; revise antes de salvar novamente.`);
    }

    this.revisions.set(key, Number(data));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('harpia:f05-updated', { detail: { key } }));
    }
  }
}

export async function hydrateSharedF05Storage() {
  const supabase = requireSupabase() as any;
  const { data, error } = await supabase
    .from('f05_shared_storage')
    .select('storage_key,value,revision');
  if (error) throw error;

  const rows = (data ?? []) as StorageRow[];
  const values: Record<string, unknown[]> = {};
  rows.forEach((row) => {
    values[row.storage_key] = normalizeArray(row.value);
  });

  configureF05SharedStorage({
    values,
    backend: new SupabaseF05SharedStorageBackend(rows),
  });

  await migrateBrowserF05IfRemoteEmpty(values);
}
