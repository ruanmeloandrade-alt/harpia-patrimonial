import { requireSupabase } from '../../core/supabase/client';
import {
  configureF05SharedStorage,
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
        .select('revision')
        .eq('storage_key', key)
        .maybeSingle();
      if (latestError) throw latestError;
      const remoteRevision = latest?.revision === undefined ? 'desconhecida' : String(latest.revision);
      throw new Error(`O módulo foi alterado por outra sessão (revisão ${remoteRevision}). Recarregue antes de salvar novamente.`);
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
}
