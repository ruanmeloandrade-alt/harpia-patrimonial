import { InboxState, createEmptyInboxState } from './domain';

export const INBOX_STORAGE_KEY = 'harpia.inbox.v1';
export const INBOX_UPDATED_EVENT = 'harpia:inbox-updated';

export interface InboxRepository {
  load(): InboxState;
  save(state: InboxState): void;
  clear(): void;
}

export const cloneInboxState = (state: InboxState): InboxState => JSON.parse(JSON.stringify(state)) as InboxState;

export const normalizeInboxState = (value: unknown): InboxState => {
  if (!value || typeof value !== 'object') return createEmptyInboxState();
  const candidate = value as Partial<InboxState>;
  return {
    version: 1,
    conversations: Array.isArray(candidate.conversations) ? candidate.conversations : [],
    messages: Array.isArray(candidate.messages) ? candidate.messages : [],
  };
};

export const notifyInboxUpdated = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INBOX_UPDATED_EVENT));
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
    if (!this.storage) return cloneInboxState(this.memoryState);
    try {
      const raw = this.storage.getItem(INBOX_STORAGE_KEY);
      if (!raw) return createEmptyInboxState();
      return normalizeInboxState(JSON.parse(raw));
    } catch {
      return createEmptyInboxState();
    }
  }

  save(state: InboxState): void {
    const safeState = normalizeInboxState(state);
    this.memoryState = cloneInboxState(safeState);
    if (this.storage) {
      try {
        this.storage.setItem(INBOX_STORAGE_KEY, JSON.stringify(safeState));
      } catch {
        // Mantém operação local em memória quando storage não está disponível.
      }
    }
    notifyInboxUpdated();
  }

  clear(): void {
    this.memoryState = createEmptyInboxState();
    if (this.storage) {
      try {
        this.storage.removeItem(INBOX_STORAGE_KEY);
      } catch {
        // Estado em memória já está limpo.
      }
    }
    notifyInboxUpdated();
  }
}
