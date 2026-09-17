import { useMemo } from 'react';
import { ClientArea, type ClientAreaDataState } from '../client-area/ClientArea';
import { useClientAreaData, type ClientAreaDataSourcePort } from '../client-area/useClientAreaData';
import { createFront03PublicCatalogReader, type Front03PublicCatalogServicePort } from '../public-catalog/front03Adapter';
import { createFront01PublicAuthBridge, type Front01AuthContextPort } from './front01AuthAdapter';
import { usePublicFavoritesBridge, type PublicFavoritesStorePort } from './usePublicFavoritesBridge';

export interface Front02ClientAccountShellProps {
  auth: Front01AuthContextPort;
  requestLogin: (reason: string) => void;
  catalogService: Front03PublicCatalogServicePort;
  favoritesStore: PublicFavoritesStorePort;
  clientAreaDataSource?: ClientAreaDataSourcePort;
  onNavigate: (path: string) => void;
  onRequestService: (service: string) => void;
}

/**
 * Conteúdo da rota protegida `/conta`.
 *
 * A guarda e a sessão pertencem à Frente01. Este shell apenas compõe a
 * experiência pessoal da Frente02 com catálogo, favoritos e dados reais da
 * conta, sem criar autenticação, persistência ou fonte de dados paralelas.
 */
export function Front02ClientAccountShell({
  auth,
  requestLogin,
  catalogService,
  favoritesStore,
  clientAreaDataSource,
  onNavigate,
  onRequestService,
}: Front02ClientAccountShellProps) {
  const catalog = useMemo(
    () => createFront03PublicCatalogReader(catalogService),
    [catalogService],
  );

  const authBridge = useMemo(
    () => createFront01PublicAuthBridge({ auth, requestLogin }),
    [auth, requestLogin],
  );

  const clientId = auth.isAuthenticated
    && auth.user
    && auth.profile?.account_type === 'client'
    && auth.profile.is_active
    ? auth.user.id
    : null;

  const clientAreaData = useClientAreaData({
    clientId,
    source: clientAreaDataSource,
  });

  const favorites = usePublicFavoritesBridge({
    clientId,
    catalog,
    store: favoritesStore,
  });

  const accountData: ClientAreaDataState = {
    data: clientAreaData.data,
    loading: Boolean(clientAreaData.loading || favorites.loading),
    error: [clientAreaData.error, favorites.error].filter(Boolean).join(' · '),
    reload: async () => {
      await Promise.all([clientAreaData.reload(), favorites.reload()]);
    },
  };

  return (
    <ClientArea
      profile={authBridge.currentClient}
      favorites={favorites.bridge.items}
      data={accountData.data}
      dataLoading={accountData.loading}
      dataError={accountData.error}
      onReloadData={accountData.reload}
      onRequestLogin={() => requestLogin('area-do-cliente')}
      onOpenProperty={(slug) => onNavigate(`/imoveis/${encodeURIComponent(slug)}`)}
      onGoToCatalog={() => onNavigate('/imoveis')}
      onRequestService={onRequestService}
    />
  );
}
