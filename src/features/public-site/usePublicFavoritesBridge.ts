import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PublicCatalogItem, PublicCatalogReader } from '../public-catalog/contracts';
import type { PublicFavoritesBridge } from './PublicSiteApp';

export interface PublicFavoriteReference {
  itemId: string;
  itemSlug: string;
}

export interface PublicFavoritesStorePort {
  list(clientId: string): Promise<PublicFavoriteReference[]>;
  add(clientId: string, item: PublicFavoriteReference): Promise<void>;
  remove(clientId: string, itemId: string): Promise<void>;
}

export interface PublicFavoritesBridgeState {
  bridge: PublicFavoritesBridge;
  loading: boolean;
  error: string;
  clearError: () => void;
  reload: () => Promise<void>;
}

const emptyItems: PublicCatalogItem[] = [];

/**
 * Liga a experiência de favoritos da Frente02 a uma persistência real fornecida
 * pelo integrador. A Frente02 não cria localStorage nem tabela paralela.
 *
 * O armazenamento concreto deve garantir vínculo entre clientId real e itemId
 * real, além de RLS/autorização quando aplicável.
 */
export function usePublicFavoritesBridge(options: {
  clientId: string | null;
  catalog: PublicCatalogReader;
  store: PublicFavoritesStorePort;
}): PublicFavoritesBridgeState {
  const { clientId, catalog, store } = options;
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);
  const activeClientRef = useRef(clientId);
  const itemsClientRef = useRef<string | null>(null);
  const pendingOperationsRef = useRef(new Set<string>());
  activeClientRef.current = clientId;

  const clearError = useCallback(() => setError(''), []);

  const reload = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    const requestClientId = clientId;

    if (!requestClientId) {
      itemsClientRef.current = null;
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }

    const changedClient = itemsClientRef.current !== requestClientId;
    itemsClientRef.current = requestClientId;
    if (changedClient) setItems([]);
    setLoading(true);
    setError('');

    try {
      const references = await store.list(requestClientId);
      const resolved = await Promise.all(
        references.map(async (reference) => {
          const byId = await catalog.getPublishedBySlug(reference.itemId);
          if (byId) return byId;
          if (!reference.itemSlug || reference.itemSlug === reference.itemId) return null;
          return catalog.getPublishedBySlug(reference.itemSlug);
        }),
      );
      if (requestVersion !== requestVersionRef.current || activeClientRef.current !== requestClientId) return;
      itemsClientRef.current = requestClientId;
      setItems(resolved.filter((item): item is PublicCatalogItem => Boolean(item)));
    } catch (cause) {
      if (requestVersion !== requestVersionRef.current || activeClientRef.current !== requestClientId) return;
      itemsClientRef.current = requestClientId;
      setItems([]);
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os favoritos.');
    } finally {
      if (requestVersion === requestVersionRef.current && activeClientRef.current === requestClientId) {
        setLoading(false);
      }
    }
  }, [catalog, clientId, store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const belongsToCurrentClient = itemsClientRef.current === clientId;
  const visibleItems = belongsToCurrentClient ? items : emptyItems;
  const visibleError = belongsToCurrentClient ? error : '';
  const visibleLoading = belongsToCurrentClient ? loading : Boolean(clientId);
  const favoriteIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);

  const bridge = useMemo<PublicFavoritesBridge>(() => ({
    items: visibleItems,
    isFavorite(itemId) {
      return favoriteIds.has(itemId);
    },
    async toggle(item) {
      if (!clientId) {
        setError('É necessário entrar na conta para salvar imóveis.');
        return;
      }

      const operationClientId = clientId;
      const operationKey = `${operationClientId}:${item.id}`;
      if (pendingOperationsRef.current.has(operationKey)) return;

      pendingOperationsRef.current.add(operationKey);
      ++requestVersionRef.current;
      setLoading(false);
      setError('');
      const exists = favoriteIds.has(item.id);
      const operationOwnsCurrentItems = itemsClientRef.current === operationClientId;

      try {
        if (exists) {
          await store.remove(operationClientId, item.id);
          if (activeClientRef.current !== operationClientId) return;
          itemsClientRef.current = operationClientId;
          setItems((current) => {
            const base = operationOwnsCurrentItems ? current : emptyItems;
            return base.filter((candidate) => candidate.id !== item.id);
          });
          return;
        }

        await store.add(operationClientId, { itemId: item.id, itemSlug: item.slug });
        if (activeClientRef.current !== operationClientId) return;
        itemsClientRef.current = operationClientId;
        setItems((current) => {
          const base = operationOwnsCurrentItems ? current : emptyItems;
          return base.some((candidate) => candidate.id === item.id) ? base : [...base, item];
        });
      } catch (cause) {
        if (activeClientRef.current !== operationClientId) return;
        setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar este favorito.');
      } finally {
        pendingOperationsRef.current.delete(operationKey);
      }
    },
  }), [clientId, favoriteIds, store, visibleItems]);

  return { bridge, loading: visibleLoading, error: visibleError, clearError, reload };
}
