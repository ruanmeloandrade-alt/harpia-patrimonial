export { default as PublicExperience } from './PublicExperience';
export { default as PublicSiteApp } from './PublicSiteApp';
export {
  Front02IntegrationShell,
  type Front02IntegrationShellProps,
} from './Front02IntegrationShell';

export type {
  PublicAuthBridge,
  PublicFavoritesBridge,
  PublicSiteConversion,
} from './PublicSiteApp';

export type {
  PublicCatalogFilterOptions,
  PublicCatalogFilters,
  PublicCatalogItem,
  PublicCatalogMedia,
  PublicCatalogReader,
  PublicCatalogStatus,
} from '../public-catalog/contracts';

export {
  ClientAreaDataProvider,
  type ClientAreaDataState,
  type ClientAreaDataView,
  type ClientHistoryView,
  type ClientInterestView,
  type ClientProfileView,
} from '../client-area/ClientArea';
export {
  useClientAreaData,
  type ClientAreaDataSourcePort,
} from '../client-area/useClientAreaData';

export { emptyPublicCatalogReader } from '../public-catalog/contracts';
export {
  createFront03PublicCatalogReader,
  type Front03PublicCatalogServicePort,
  type Front03PublishedItem,
} from '../public-catalog/front03Adapter';
export {
  createFront04ConversionHandler,
  type Front04LeadConversionEventPort,
  type Front04LeadConversionIngestPort,
  type Front04LeadConversionResultPort,
  type PublicConversionHandlingResult,
} from './front04ConversionAdapter';
export {
  createFront01PublicAuthBridge,
  type Front01AuthContextPort,
} from './front01AuthAdapter';
export {
  createWhatsAppContinuation,
  type WhatsAppContinuationOptions,
} from './whatsappContinuation';
export {
  createPublicConversionPipeline,
  type PublicConversionPipelineOptions,
} from './conversionPipeline';
export {
  usePublicFavoritesBridge,
  type PublicFavoriteReference,
  type PublicFavoritesBridgeState,
  type PublicFavoritesStorePort,
} from './usePublicFavoritesBridge';
export {
  hasCatalogFilters,
  normalizeCatalogFilters,
  readCatalogFilters,
  writeCatalogFilters,
} from './catalogQuery';

/**
 * Rotas de propriedade da Frente02. O roteador global pertence à Frente01;
 * esta lista existe apenas para a integração registrar o conjunto correto
 * sem duplicar descoberta de rotas ou mover ownership.
 */
export const publicRouteManifest = [
  '/',
  '/sobre',
  '/investimentos',
  '/leiloes',
  '/assessoria-juridica',
  '/arquitetura',
  '/imoveis',
  '/imoveis/:slug',
  '/vender',
  '/alugar',
  '/cliente',
] as const;
