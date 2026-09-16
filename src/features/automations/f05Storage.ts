export interface F05SharedStorageBackend {
  save(key: string, value: unknown[]): Promise<void>;
}

const memory = new Map<string, unknown[]>();
let backend: F05SharedStorageBackend | null = null;
let ready = false;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function persistenceError(key: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha ao persistir estado compartilhado da Frente05.';
  console.error(`[f05:${key}] persistence failed`, error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:persistence-error', {
      detail: { module: 'front05', key, message },
    }));
  }
}

export function configureF05SharedStorage(input: {
  values: Record<string, unknown[]>;
  backend: F05SharedStorageBackend;
}) {
  memory.clear();
  Object.entries(input.values).forEach(([key, value]) => {
    memory.set(key, Array.isArray(value) ? clone(value) : []);
  });
  backend = input.backend;
  ready = true;
}

export function resetF05SharedStorage() {
  memory.clear();
  backend = null;
  ready = false;
}

export function isF05SharedStorageReady() {
  return ready;
}

export function readStoredList<T>(key: string): T[] {
  const value = memory.get(key);
  return Array.isArray(value) ? clone(value as T[]) : [];
}

export function replaceStoredListFromRemote<T>(key: string, value: T[]): void {
  memory.set(key, clone(value) as unknown[]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:f05-remote-refresh', { detail: { key } }));
  }
}

export function writeStoredList<T>(key: string, value: T[]): void {
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
