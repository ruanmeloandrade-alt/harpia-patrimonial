import { CATALOG_CHANGED_EVENT, type CatalogRepository } from './catalogRepository';
import type { CatalogItemDraft, CatalogQuery, CatalogStatus } from './types';

export interface CatalogRealtimeChannel {
  on(
    type: 'postgres_changes',
    filter: { event: '*'; schema: 'public'; table: 'catalog_items' },
    callback: () => void,
  ): CatalogRealtimeChannel;
  subscribe(): CatalogRealtimeChannel;
}

export interface CatalogRealtimeSupabaseClient {
  channel(name: string): CatalogRealtimeChannel;
  removeChannel(channel: CatalogRealtimeChannel): unknown;
}

function channelId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `harpia-catalog-${crypto.randomUUID()}`;
  }
  return `harpia-catalog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Decorator do repositório interno que acrescenta sincronização entre sessões.
 * O canal só nasce quando o repositório interno é efetivamente lido/assinado.
 * O serviço público usa o repositório base e não abre Realtime para visitantes.
 */
export class RealtimeCatalogRepository implements CatalogRepository {
  private readonly listeners = new Set<() => void>();
  private channel: CatalogRealtimeChannel | null = null;
  private disposed = false;

  constructor(
    private readonly inner: CatalogRepository,
    private readonly client: CatalogRealtimeSupabaseClient,
  ) {}

  private ensureChannel() {
    if (this.disposed || this.channel) return;
    this.channel = this.client
      .channel(channelId())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_items' },
        () => this.notifyRealtimeChange(),
      )
      .subscribe();
  }

  private stopChannel() {
    if (!this.channel) return;
    const current = this.channel;
    this.channel = null;
    void this.client.removeChannel(current);
  }

  private notifyRealtimeChange() {
    if (this.disposed) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CATALOG_CHANGED_EVENT));
    }
    this.listeners.forEach((listener) => listener());
  }

  list(query?: CatalogQuery) {
    this.ensureChannel();
    return this.inner.list(query);
  }

  getById(id: string) {
    this.ensureChannel();
    return this.inner.getById(id);
  }

  create(input: CatalogItemDraft) {
    this.ensureChannel();
    return this.inner.create(input);
  }

  update(id: string, input: Partial<CatalogItemDraft>) {
    this.ensureChannel();
    return this.inner.update(id, input);
  }

  setStatus(id: string, status: CatalogStatus) {
    this.ensureChannel();
    return this.inner.setStatus(id, status);
  }

  duplicate(id: string) {
    this.ensureChannel();
    return this.inner.duplicate(id);
  }

  remove(id: string) {
    this.ensureChannel();
    return this.inner.remove(id);
  }

  subscribe(listener: () => void): () => void {
    if (this.disposed) return () => undefined;
    this.listeners.add(listener);
    this.ensureChannel();
    return () => this.listeners.delete(listener);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    this.stopChannel();
  }
}
