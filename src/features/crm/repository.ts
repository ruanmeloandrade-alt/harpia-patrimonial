import { CrmState, createEmptyCrmState } from './domain';

export const CRM_STORAGE_KEY = 'harpia.crm.v1';
export const CRM_UPDATED_EVENT = 'harpia:crm-updated';

let crmPersistenceBarrier: Promise<void> = Promise.resolve();

export interface CrmRepository {
  load(): CrmState;
  save(state: CrmState): void;
  clear(): void;
}

export const cloneCrmState = (state: CrmState): CrmState => JSON.parse(JSON.stringify(state)) as CrmState;

export const normalizeCrmState = (value: unknown): CrmState => {
  if (!value || typeof value !== 'object') return createEmptyCrmState();

  const candidate = value as Partial<CrmState>;
  return {
    version: 1,
    pipelines: Array.isArray(candidate.pipelines) ? candidate.pipelines : [],
    stages: Array.isArray(candidate.stages) ? candidate.stages : [],
    leads: Array.isArray(candidate.leads) ? candidate.leads : [],
    tags: Array.isArray(candidate.tags) ? candidate.tags : [],
    customFieldDefinitions: Array.isArray(candidate.customFieldDefinitions)
      ? candidate.customFieldDefinitions
      : [],
    tasks: Array.isArray(candidate.tasks) ? candidate.tasks : [],
    history: Array.isArray(candidate.history) ? candidate.history : [],
  };
};

export const setCrmPersistenceBarrier = (barrier: Promise<void>): void => {
  crmPersistenceBarrier = barrier;
};

export const waitForCrmPersistence = async (): Promise<void> => {
  await crmPersistenceBarrier;
};

export const notifyCrmUpdated = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CRM_UPDATED_EVENT));
};

export class BrowserCrmRepository implements CrmRepository {
  private memoryState: CrmState = createEmptyCrmState();

  constructor(private readonly storage: Storage | null = BrowserCrmRepository.resolveStorage()) {}

  static resolveStorage(): Storage | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  load(): CrmState {
    if (!this.storage) return cloneCrmState(this.memoryState);

    try {
      const raw = this.storage.getItem(CRM_STORAGE_KEY);
      if (!raw) return createEmptyCrmState();
      return normalizeCrmState(JSON.parse(raw));
    } catch {
      return createEmptyCrmState();
    }
  }

  save(state: CrmState): void {
    const safeState = normalizeCrmState(state);
    this.memoryState = cloneCrmState(safeState);

    if (this.storage) {
      try {
        this.storage.setItem(CRM_STORAGE_KEY, JSON.stringify(safeState));
      } catch {
        // A aplicação continua funcional em memória quando o navegador bloqueia storage.
      }
    }

    setCrmPersistenceBarrier(Promise.resolve());
    notifyCrmUpdated();
  }

  clear(): void {
    this.memoryState = createEmptyCrmState();
    if (this.storage) {
      try {
        this.storage.removeItem(CRM_STORAGE_KEY);
      } catch {
        // Nada a fazer: o estado em memória já foi limpo.
      }
    }
    setCrmPersistenceBarrier(Promise.resolve());
    notifyCrmUpdated();
  }
}
