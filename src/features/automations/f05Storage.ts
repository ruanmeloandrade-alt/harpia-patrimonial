export interface F05SharedStorageBackend {
  save(key: string, value: unknown[]): Promise<void>;
}

const memory = new Map<string, unknown[]>();
let backend: F05SharedStorageBackend | null = null;
let sharedReady = false;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function persistenceError(key: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha ao persistir estado compartilhado da Frente05.';
  console.error(`[f05:${key}] persistence failed`, error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:persistence-error', {
      detail: { module: 'front05', key, message },
    }));
  }
}

function readLocal<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocal<T>(key: string, value: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Ativa persistência compartilhada (ex.: Supabase) e hidrata o snapshot atual.
 * Depois desta chamada, localStorage deixa de ser a fonte de verdade da F05.
 */
export function configureF05SharedStorage(input: {
  values: Record<string, unknown[]>;
  backend: F05SharedStorageBackend;
}) {
  memory.clear();
  Object.entries(input.values).forEach(([key, value]) => {
    memory.set(key, Array.isArray(value) ? clone(value) : []);
  });
  backend = input.backend;
  sharedReady = true;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:f05-storage-ready'));
  }
}

export function resetF05SharedStorage() {
  memory.clear();
  backend = null;
  sharedReady = false;
}

export function isF05SharedStorageReady() {
  return sharedReady;
}

export function readStoredList<T>(key: string): T[] {
  if (sharedReady) {
    const value = memory.get(key);
    return Array.isArray(value) ? clone(value as T[]) : [];
  }
  return readLocal<T>(key);
}

export function writeStoredList<T>(key: string, value: T[]): void {
  if (!sharedReady) {
    writeLocal(key, value);
    return;
  }

  const safe = clone(value);
  memory.set(key, safe as unknown[]);
  if (!backend) return;
  void backend.save(key, safe as unknown[]).catch((error) => persistenceError(key, error));
}

export function createF05Id(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
