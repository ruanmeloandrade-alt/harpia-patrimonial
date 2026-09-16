export interface F05SharedStorageBackend {
  save(key: string, value: unknown[]): Promise<void>;
}

const memory = new Map<string, unknown[]>();
const writeGeneration = new Map<string, number>();
let backend: F05SharedStorageBackend | null = null;
let sharedReady = false;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function emitStorageUpdated(key: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('harpia:f05-updated', { detail: { key } }));
}

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
  writeGeneration.clear();
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
  writeGeneration.clear();
  backend = null;
  sharedReady = false;
}

export function isF05SharedStorageReady() {
  return sharedReady;
}

/**
 * Substitui o valor local pelo snapshot autoritativo carregado do backend.
 * Incrementar a geração invalida rollbacks assíncronos de escritas anteriores,
 * impedindo que uma falha atrasada sobrescreva o estado remoto restaurado.
 */
export function replaceStoredListFromRemote<T>(key: string, value: T[]): void {
  const generation = (writeGeneration.get(key) ?? 0) + 1;
  writeGeneration.set(key, generation);
  memory.set(key, clone(value) as unknown[]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:f05-remote-refresh', { detail: { key } }));
  }
  emitStorageUpdated(key);
}

/**
 * Notifica workspaces quando o snapshot compartilhado termina de hidratar,
 * quando há refresh remoto ou quando a sessão conclui/recupera uma escrita.
 */
export function subscribeF05StorageEvents(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => listener();
  window.addEventListener('harpia:f05-storage-ready', handler);
  window.addEventListener('harpia:f05-updated', handler);
  window.addEventListener('harpia:f05-remote-refresh', handler);
  return () => {
    window.removeEventListener('harpia:f05-storage-ready', handler);
    window.removeEventListener('harpia:f05-updated', handler);
    window.removeEventListener('harpia:f05-remote-refresh', handler);
  };
}

export function readStoredList<T>(key: string): T[] {
  if (sharedReady) {
    const value = memory.get(key);
    return Array.isArray(value) ? clone(value as T[]) : [];
  }
  return readLocal<T>(key);
}

function beginSharedWrite<T>(key: string, value: T[]) {
  const safe = clone(value);
  const previous = clone((memory.get(key) ?? []) as unknown[]);
  const generation = (writeGeneration.get(key) ?? 0) + 1;
  writeGeneration.set(key, generation);
  memory.set(key, safe as unknown[]);
  return { safe: safe as unknown[], previous, generation };
}

async function persistSharedWrite(
  key: string,
  safe: unknown[],
  previous: unknown[],
  generation: number,
): Promise<void> {
  if (!backend) return;
  try {
    await backend.save(key, safe);
    if (writeGeneration.get(key) === generation) emitStorageUpdated(key);
  } catch (error) {
    // Só desfaz esta alteração se nenhuma escrita/recarga mais nova tiver ocorrido.
    // Um replaceStoredListFromRemote incrementa a geração e preserva o snapshot
    // autoritativo recebido do backend em caso de conflito de revisão.
    if (writeGeneration.get(key) === generation) {
      memory.set(key, previous);
      emitStorageUpdated(key);
    }
    persistenceError(key, error);
    throw error;
  }
}

export function writeStoredList<T>(key: string, value: T[]): void {
  if (!sharedReady) {
    writeLocal(key, value);
    return;
  }

  const pending = beginSharedWrite(key, value);
  void persistSharedWrite(key, pending.safe, pending.previous, pending.generation).catch(() => undefined);
}

/**
 * Variante para operações críticas que precisam aguardar confirmação do backend
 * (por exemplo, sincronizar metadados de perfil com uma credencial no Vault).
 */
export async function writeStoredListConfirmed<T>(key: string, value: T[]): Promise<void> {
  if (!sharedReady) {
    writeLocal(key, value);
    return;
  }

  const pending = beginSharedWrite(key, value);
  await persistSharedWrite(key, pending.safe, pending.previous, pending.generation);
}

export function createF05Id(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
