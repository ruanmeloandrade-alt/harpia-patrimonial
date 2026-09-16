import { useCallback, useEffect, useMemo, useState } from 'react';
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
  reload: () => Promise<void>;
}

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

  const reload = useCallback(async () => {
    if (!clientId) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const references = await store.list(clientId);
      const resolved = await Promise.all(
        references.map((reference) => catalog.getPublishedBySlug(reference.itemSlug)),
      );
      setItems(resolved.filter((item): item is PublicCatalogItem => Boolean(item)));
    } catch (cause) {
      setItems([]);
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os favoritos.');
    } finally {
      setLoading(false);
    }
  }, [catalog, clientId, store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const favoriteIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const bridge = useMemo<PublicFavoritesBridge>(() => ({
    items,
    isFavorite(itemId) {
      return favoriteIds.has(itemId);
    },
    async toggle(item) {
      if (!clientId) {
        setError('É necessário entrar na conta para salvar imóveis.');
        return;
      }

      setError('');
      const exists = favoriteIds.has(item.id);

      try {
        if (exists) {
          await store.remove(clientId, item.id);
          setItems((current) => current.filter((candidate) => candidate.id !== item.id));
          return;
        }

        await store.add(clientId, { itemId: item.id, itemSlug: item.slug });
        setItems((current) => current.some((candidate) => candidate.id === item.id) ? current : [...current, item]);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar este favorito.');
      }
    },
  }), [clientId, favoriteIds, items, store]);

  return { bridge, loading, error, reload };
}
