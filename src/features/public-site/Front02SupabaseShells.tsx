import { useMemo } from 'react';
import type { ClientAreaDataSourcePort } from '../client-area/useClientAreaData';
import type { Front03PublicCatalogServicePort } from '../public-catalog/front03Adapter';
import { Front02ClientAccountShell } from './Front02ClientAccountShell';
import { Front02IntegrationShell } from './Front02IntegrationShell';
import type { Front01AuthContextPort } from './front01AuthAdapter';
import { createFront02SupabasePorts, type Front02SupabaseClientPort } from './supabaseRuntime';

interface SharedSupabaseShellProps {
  auth: Front01AuthContextPort;
  supabaseClient: Front02SupabaseClientPort;
  catalogService: Front03PublicCatalogServicePort;
  requestLogin: (reason: string) => void;
}

export interface Front02SupabaseIntegrationShellProps extends SharedSupabaseShellProps {
  whatsappPhone?: string;
  internalAreaHref?: string;
}

/**
 * Shell público recomendado após o merge: recebe somente os serviços centrais
 * e deriva as portas reais da F2 a partir do MESMO client Supabase da F1.
 */
export function Front02SupabaseIntegrationShell(
  props: Front02SupabaseIntegrationShellProps,
) {
  const ports = useMemo(
    () => createFront02SupabasePorts(props.supabaseClient),
    [props.supabaseClient],
  );

  return (
    <Front02IntegrationShell
      auth={props.auth}
      requestLogin={props.requestLogin}
      catalogService={props.catalogService}
      crmIngest={ports.crmIngest}
      favoritesStore={ports.favoritesStore}
      clientAreaDataSource={ports.clientAreaDataSource}
      whatsappPhone={props.whatsappPhone}
      internalAreaHref={props.internalAreaHref}
    />
  );
}

export interface Front02SupabaseClientAccountShellProps extends SharedSupabaseShellProps {
  onNavigate: (path: string) => void;
  onRequestService: (service: string) => void;
  clientAreaDataSourceOverride?: ClientAreaDataSourcePort;
}

/**
 * Versão pronta para `/conta` dentro do `ClientRoute` da Frente01.
 * O override de dados existe apenas para futura fonte mais específica; por
 * padrão usa a Edge Function autenticada `client-area-data` já publicada.
 */
export function Front02SupabaseClientAccountShell(
  props: Front02SupabaseClientAccountShellProps,
) {
  const ports = useMemo(
    () => createFront02SupabasePorts(props.supabaseClient),
    [props.supabaseClient],
  );

  return (
    <Front02ClientAccountShell
      auth={props.auth}
      requestLogin={props.requestLogin}
      catalogService={props.catalogService}
      favoritesStore={ports.favoritesStore}
      clientAreaDataSource={props.clientAreaDataSourceOverride ?? ports.clientAreaDataSource}
      onNavigate={props.onNavigate}
      onRequestService={props.onRequestService}
    />
  );
}
