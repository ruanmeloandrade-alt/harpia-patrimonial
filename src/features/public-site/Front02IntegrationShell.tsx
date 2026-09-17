import { useMemo, useState } from 'react';
import type { ClientAreaDataState } from '../client-area/ClientArea';
import { useClientAreaData, type ClientAreaDataSourcePort } from '../client-area/useClientAreaData';
import { createFront03PublicCatalogReader, type Front03PublicCatalogServicePort } from '../public-catalog/front03Adapter';
import PublicExperience from './PublicExperience';
import type { PublicSiteConversion } from './PublicSiteApp';
import { PublicExperienceBoundary } from './PublicExperienceBoundary';
import { createFront01PublicAuthBridge, type Front01AuthContextPort } from './front01AuthAdapter';
import {
  createFront04ConversionHandler,
  type Front04LeadConversionIngestPort,
} from './front04ConversionAdapter';
import { createPublicConversionPipeline } from './conversionPipeline';
import {
  usePublicFavoritesBridge,
  type PublicFavoritesStorePort,
} from './usePublicFavoritesBridge';
import { createWhatsAppContinuation } from './whatsappContinuation';

export interface Front02IntegrationShellProps {
  auth: Front01AuthContextPort;
  requestLogin: (reason: string) => void;
  catalogService: Front03PublicCatalogServicePort;
  crmIngest?: Front04LeadConversionIngestPort;
  favoritesStore?: PublicFavoritesStorePort;
  clientAreaDataSource?: ClientAreaDataSourcePort;
  whatsappPhone?: string;
  internalAreaHref?: string;
}

interface ComposedExperienceProps extends Front02IntegrationShellProps {
  clientId: string | null;
}

function ComposedExperience(props: ComposedExperienceProps) {
  const [conversionNotice, setConversionNotice] = useState('');

  const catalog = useMemo(
    () => createFront03PublicCatalogReader(props.catalogService),
    [props.catalogService],
  );

  const authBridge = useMemo(
    () => createFront01PublicAuthBridge({ auth: props.auth, requestLogin: props.requestLogin }),
    [props.auth, props.requestLogin],
  );

  const clientAreaData = useClientAreaData({
    clientId: props.clientId,
    source: props.clientAreaDataSource,
  });

  const capture = useMemo(
    () => props.crmIngest
      ? createFront04ConversionHandler({
          ingest: props.crmIngest,
          getCurrentClient: () => authBridge.currentClient,
        })
      : undefined,
    [authBridge, props.crmIngest],
  );

  const whatsapp = useMemo(() => {
    if (!props.whatsappPhone) return undefined;

    try {
      return createWhatsAppContinuation({ phone: props.whatsappPhone });
    } catch {
      // Número ausente/inválido não pode derrubar o site nem impedir o lead.
      // O pipeline continua registrando no CRM e apenas omite a continuação.
      return undefined;
    }
  }, [props.whatsappPhone]);

  const conversionPipeline = useMemo(
    () => capture
      ? createPublicConversionPipeline({
          capture,
          continueToWhatsApp: whatsapp,
        })
      : undefined,
    [capture, whatsapp],
  );

  const onConversion = useMemo(
    () => conversionPipeline
      ? async (event: PublicSiteConversion): Promise<true> => {
          const accepted = await conversionPipeline(event);
          if (event.source !== 'captacao-proprietario') {
            setConversionNotice('Atendimento registrado com sucesso. A equipe da Hárpia recebeu seu contexto.');
          }
          return accepted;
        }
      : undefined,
    [conversionPipeline],
  );

  if (!props.favoritesStore) {
    return (
      <PublicExperienceBoundary>
        <>
          {conversionNotice ? (
            <div className="integration-notice" role="status" aria-live="polite">
              <span>{conversionNotice}</span>
              <button type="button" onClick={() => setConversionNotice('')} aria-label="Fechar confirmação de atendimento">×</button>
            </div>
          ) : null}
          <PublicExperience
            catalog={catalog}
            auth={authBridge}
            clientAreaData={clientAreaData}
            onConversion={onConversion}
            internalAreaHref={props.internalAreaHref}
          />
        </>
      </PublicExperienceBoundary>
    );
  }

  return (
    <ExperienceWithFavorites
      catalog={catalog}
      authBridge={authBridge}
      clientAreaData={clientAreaData}
      onConversion={onConversion}
      conversionNotice={conversionNotice}
      onDismissConversionNotice={() => setConversionNotice('')}
      clientId={props.clientId}
      store={props.favoritesStore}
      internalAreaHref={props.internalAreaHref}
    />
  );
}

function ExperienceWithFavorites({
  catalog,
  authBridge,
  clientAreaData,
  onConversion,
  conversionNotice,
  onDismissConversionNotice,
  clientId,
  store,
  internalAreaHref,
}: {
  catalog: ReturnType<typeof createFront03PublicCatalogReader>;
  authBridge: ReturnType<typeof createFront01PublicAuthBridge>;
  clientAreaData: ReturnType<typeof useClientAreaData>;
  onConversion?: ReturnType<typeof createPublicConversionPipeline>;
  conversionNotice: string;
  onDismissConversionNotice: () => void;
  clientId: string | null;
  store: PublicFavoritesStorePort;
  internalAreaHref?: string;
}) {
  const favorites = usePublicFavoritesBridge({ clientId, catalog, store });

  const accountData: ClientAreaDataState = {
    data: clientAreaData.data,
    loading: Boolean(clientAreaData.loading || favorites.loading),
    error: [clientAreaData.error, favorites.error].filter(Boolean).join(' · '),
    reload: async () => {
      await Promise.all([clientAreaData.reload(), favorites.reload()]);
    },
  };

  return (
    <PublicExperienceBoundary>
      <>
        {favorites.error ? (
          <div className="integration-notice" role="alert" aria-live="assertive">
            <span>{favorites.error}</span>
            <button type="button" onClick={favorites.clearError} aria-label="Fechar aviso de favoritos">×</button>
          </div>
        ) : conversionNotice ? (
          <div className="integration-notice" role="status" aria-live="polite">
            <span>{conversionNotice}</span>
            <button type="button" onClick={onDismissConversionNotice} aria-label="Fechar confirmação de atendimento">×</button>
          </div>
        ) : null}
        <PublicExperience
          catalog={catalog}
          auth={authBridge}
          favorites={favorites.bridge}
          clientAreaData={accountData}
          onConversion={onConversion}
          internalAreaHref={internalAreaHref}
        />
      </>
    </PublicExperienceBoundary>
  );
}

/**
 * Ponto único de composição da Frente02 para o pente-fino.
 *
 * Não cria serviços pertencentes às outras frentes: recebe os ports reais e
 * apenas monta adapters/hooks da experiência pública.
 */
export function Front02IntegrationShell(props: Front02IntegrationShellProps) {
  const clientId = props.auth.isAuthenticated
    && props.auth.user
    && props.auth.profile?.account_type === 'client'
    && props.auth.profile.is_active
    ? props.auth.user.id
    : null;

  return <ComposedExperience {...props} clientId={clientId} />;
}
