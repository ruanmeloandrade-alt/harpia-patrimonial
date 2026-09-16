import { InboxState, createEmptyInboxState } from './domain';

export const INBOX_STORAGE_KEY = 'harpia.inbox.v1';

export interface InboxRepository {
  load(): InboxState;
  save(state: InboxState): void;
  clear(): void;
}

const cloneState = (state: InboxState): InboxState => JSON.parse(JSON.stringify(state)) as InboxState;

const normalizeState = (value: unknown): InboxState => {
  if (!value || typeof value !== 'object') return createEmptyInboxState();
  const candidate = value as Partial<InboxState>;
  return {
    version: 1,
    conversations: Array.isArray(candidate.conversations) ? candidate.conversations : [],
    messages: Array.isArray(candidate.messages) ? candidate.messages : [],
  };
};

export class BrowserInboxRepository implements InboxRepository {
  private memoryState: InboxState = createEmptyInboxState();

  constructor(private readonly storage: Storage | null = BrowserInboxRepository.resolveStorage()) {}

  static resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  load(): InboxState {
    if (!this.storage) return cloneState(this.memoryState);
    try {
      const raw = this.storage.getItem(INBOX_STORAGE_KEY);
      if (!raw) return createEmptyInboxState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return createEmptyInboxState();
    }
  }

  save(state: InboxState): void {
    const safeState = normalizeState(state);
    this.memoryState = cloneState(safeState);
    if (!this.storage) return;
    try {
      this.storage.setItem(INBOX_STORAGE_KEY, JSON.stringify(safeState));
    } catch {
      // Mantém operação local em memória quando storage não está disponível.
    }
  }

  clear(): void {
    this.memoryState = createEmptyInboxState();
    if (!this.storage) return;
    try {
      this.storage.removeItem(INBOX_STORAGE_KEY);
    } catch {
      // Estado em memória já está limpo.
    }
  }
}
