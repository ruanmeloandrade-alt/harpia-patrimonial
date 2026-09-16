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
 * Decorator do repositório de produção que acrescenta sincronização entre sessões.
 * Mutações locais continuam emitindo `harpia:catalog-changed` pelo adapter base;
 * alterações recebidas pelo Supabase Realtime disparam o mesmo evento, mantendo
 * Catálogo e Dashboard desacoplados da implementação do canal.
 */
export class RealtimeCatalogRepository implements CatalogRepository {
  private readonly listeners = new Set<() => void>();
  private readonly channel: CatalogRealtimeChannel;
  private disposed = false;

  constructor(
    private readonly inner: CatalogRepository,
    private readonly client: CatalogRealtimeSupabaseClient,
  ) {
    this.channel = client
      .channel(channelId())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'catalog_items' },
        () => this.notifyRealtimeChange(),
      )
      .subscribe();
  }

  private notifyRealtimeChange() {
    if (this.disposed) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CATALOG_CHANGED_EVENT));
    }
    this.listeners.forEach((listener) => listener());
  }

  list(query?: CatalogQuery) {
    return this.inner.list(query);
  }

  getById(id: string) {
    return this.inner.getById(id);
  }

  create(input: CatalogItemDraft) {
    return this.inner.create(input);
  }

  update(id: string, input: Partial<CatalogItemDraft>) {
    return this.inner.update(id, input);
  }

  setStatus(id: string, status: CatalogStatus) {
    return this.inner.setStatus(id, status);
  }

  duplicate(id: string) {
    return this.inner.duplicate(id);
  }

  remove(id: string) {
    return this.inner.remove(id);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.listeners.clear();
    void this.client.removeChannel(this.channel);
  }
}
