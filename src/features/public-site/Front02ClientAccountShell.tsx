import { useMemo } from 'react';
import { ClientArea } from '../client-area/ClientArea';
import { useClientAreaData, type ClientAreaDataSourcePort } from '../client-area/useClientAreaData';
import { createFront03PublicCatalogReader, type Front03PublicCatalogServicePort } from '../public-catalog/front03Adapter';
import { createFront01PublicAuthBridge, type Front01AuthContextPort } from './front01AuthAdapter';
import { usePublicFavoritesBridge, type PublicFavoritesStorePort } from './usePublicFavoritesBridge';
import './public-site.css';
import './public-polish.css';

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
 * Área rica do cliente para montagem dentro do `ClientRoute` da Frente01.
 *
 * O componente não cria sessão nem guarda de rota: a Frente01 continua sendo
 * responsável por proteger `/conta`. Aqui usamos somente a identidade que ela
 * já autenticou e as fontes reais das demais frentes.
 */
export function Front02ClientAccountShell(props: Front02ClientAccountShellProps) {
  const clientId = props.auth.isAuthenticated && props.auth.user
    ? props.auth.user.id
    : null;

  const catalog = useMemo(
    () => createFront03PublicCatalogReader(props.catalogService),
    [props.catalogService],
  );

  const authBridge = useMemo(
    () => createFront01PublicAuthBridge({
      auth: props.auth,
      requestLogin: props.requestLogin,
    }),
    [props.auth, props.requestLogin],
  );

  const favorites = usePublicFavoritesBridge({
    clientId,
    catalog,
    store: props.favoritesStore,
  });

  const accountData = useClientAreaData({
    clientId,
    source: props.clientAreaDataSource,
  });

  const loading = favorites.loading || Boolean(accountData.loading);
  const error = [favorites.error, accountData.error].filter(Boolean).join(' ');

  const reload = async () => {
    await Promise.all([
      favorites.reload(),
      accountData.reload(),
    ]);
  };

  return (
    <main className="harpia-public">
      <ClientArea
        profile={authBridge.currentClient}
        favorites={favorites.bridge.items}
        data={accountData.data}
        dataLoading={loading}
        dataError={error}
        onReloadData={reload}
        onRequestLogin={() => props.requestLogin('area-do-cliente')}
        onOpenProperty={(slug) => props.onNavigate(`/imoveis/${encodeURIComponent(slug)}`)}
        onGoToCatalog={() => props.onNavigate('/imoveis')}
        onRequestService={props.onRequestService}
      />
    </main>
  );
}
