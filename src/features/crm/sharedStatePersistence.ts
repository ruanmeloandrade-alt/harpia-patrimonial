import type { CrmEventSink, CrmState } from './domain';
import {
  cloneCrmState,
  normalizeCrmState,
  notifyCrmUpdated,
  type CrmRepository,
} from './repository';
import { CrmService } from './service';
import type { InboxState } from '../inbox/domain';
import {
  cloneInboxState,
  normalizeInboxState,
  notifyInboxUpdated,
  type InboxRepository,
} from '../inbox/repository';
import { InboxService } from '../inbox/service';

export type SharedModuleName = 'crm' | 'inbox';

export interface SharedModuleStateSnapshot {
  state: unknown;
  revision: number;
}

/**
 * Contrato assíncrono mínimo para a persistência compartilhada criada pela Frente01.
 * Uma implementação Supabase deve ler `platform_module_state` e salvar via
 * RPC `save_platform_module_state`, retornando a nova revision ou null em conflito.
 */
export interface SharedModuleStatePort {
  load(module: SharedModuleName): Promise<SharedModuleStateSnapshot>;
  save(
    module: SharedModuleName,
    state: unknown,
    expectedRevision: number,
  ): Promise<number | null>;
}

export class SharedStateConflictError extends Error {
  constructor(module: SharedModuleName) {
    super(`O estado compartilhado de ${module.toUpperCase()} mudou em outra sessão. Recarregue antes de salvar novamente.`);
    this.name = 'SharedStateConflictError';
  }
}

export interface SharedStateRepositoryOptions {
  onPersistenceError?: (error: Error, module: SharedModuleName) => void;
}

abstract class SharedStateRepositoryBase<TState extends object> {
  private writeChain: Promise<void> = Promise.resolve();
  private lastPersistenceError: Error | null = null;

  protected constructor(
    protected readonly module: SharedModuleName,
    protected readonly port: SharedModuleStatePort,
    protected state: TState,
    protected revision: number,
    private readonly normalize: (value: unknown) => TState,
    private readonly clone: (value: TState) => TState,
    private readonly notify: () => void,
    private readonly options: SharedStateRepositoryOptions = {},
  ) {}

  protected readState(): TState {
    return this.clone(this.state);
  }

  protected writeState(value: TState): void {
    const safeState = this.normalize(value);
    this.state = this.clone(safeState);
    this.notify();
    this.enqueueRemoteSave(this.clone(safeState));
  }

  protected clearState(empty: TState): void {
    this.state = this.clone(empty);
    this.notify();
    this.enqueueRemoteSave(this.clone(empty));
  }

  async reload(): Promise<TState> {
    await this.flush().catch(() => undefined);
    const remote = await this.port.load(this.module);
    this.state = this.normalize(remote.state);
    this.revision = remote.revision;
    this.lastPersistenceError = null;
    this.notify();
    return this.readState();
  }

  async flush(): Promise<void> {
    await this.writeChain;
    if (this.lastPersistenceError) throw this.lastPersistenceError;
  }

  getRevision(): number {
    return this.revision;
  }

  getPersistenceError(): Error | null {
    return this.lastPersistenceError;
  }

  private enqueueRemoteSave(snapshot: TState): void {
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        const nextRevision = await this.port.save(
          this.module,
          snapshot,
          this.revision,
        );
        if (nextRevision === null) throw new SharedStateConflictError(this.module);
        this.revision = nextRevision;
        this.lastPersistenceError = null;
      })
      .catch((error: unknown) => {
        const normalizedError = error instanceof Error
          ? error
          : new Error(`Falha ao persistir ${this.module.toUpperCase()}.`);
        this.lastPersistenceError = normalizedError;
        this.options.onPersistenceError?.(normalizedError, this.module);
      });
  }
}

export class SharedStateCrmRepository
  extends SharedStateRepositoryBase<CrmState>
  implements CrmRepository {
  private constructor(
    port: SharedModuleStatePort,
    state: CrmState,
    revision: number,
    options?: SharedStateRepositoryOptions,
  ) {
    super(
      'crm',
      port,
      state,
      revision,
      normalizeCrmState,
      cloneCrmState,
      notifyCrmUpdated,
      options,
    );
  }

  static async create(
    port: SharedModuleStatePort,
    options?: SharedStateRepositoryOptions,
  ): Promise<SharedStateCrmRepository> {
    const remote = await port.load('crm');
    return new SharedStateCrmRepository(
      port,
      normalizeCrmState(remote.state),
      remote.revision,
      options,
    );
  }

  load(): CrmState {
    return this.readState();
  }

  save(state: CrmState): void {
    this.writeState(state);
  }

  clear(): void {
    this.clearState(normalizeCrmState(undefined));
  }
}

export class SharedStateInboxRepository
  extends SharedStateRepositoryBase<InboxState>
  implements InboxRepository {
  private constructor(
    port: SharedModuleStatePort,
    state: InboxState,
    revision: number,
    options?: SharedStateRepositoryOptions,
  ) {
    super(
      'inbox',
      port,
      state,
      revision,
      normalizeInboxState,
      cloneInboxState,
      notifyInboxUpdated,
      options,
    );
  }

  static async create(
    port: SharedModuleStatePort,
    options?: SharedStateRepositoryOptions,
  ): Promise<SharedStateInboxRepository> {
    const remote = await port.load('inbox');
    return new SharedStateInboxRepository(
      port,
      normalizeInboxState(remote.state),
      remote.revision,
      options,
    );
  }

  load(): InboxState {
    return this.readState();
  }

  save(state: InboxState): void {
    this.writeState(state);
  }

  clear(): void {
    this.clearState(normalizeInboxState(undefined));
  }
}

export interface Front04SharedRuntime {
  crmRepository: SharedStateCrmRepository;
  inboxRepository: SharedStateInboxRepository;
  crmService: CrmService;
  inboxService: InboxService;
  flush(): Promise<void>;
  reload(): Promise<void>;
}

export async function createFront04SharedRuntime(
  port: SharedModuleStatePort,
  options: SharedStateRepositoryOptions & { crmEventSinks?: CrmEventSink[] } = {},
): Promise<Front04SharedRuntime> {
  const [crmRepository, inboxRepository] = await Promise.all([
    SharedStateCrmRepository.create(port, options),
    SharedStateInboxRepository.create(port, options),
  ]);
  const crmService = new CrmService(crmRepository, options.crmEventSinks ?? []);
  const inboxService = new InboxService(inboxRepository);

  return {
    crmRepository,
    inboxRepository,
    crmService,
    inboxService,
    async flush() {
      await Promise.all([crmRepository.flush(), inboxRepository.flush()]);
    },
    async reload() {
      await Promise.all([crmRepository.reload(), inboxRepository.reload()]);
    },
  };
}
