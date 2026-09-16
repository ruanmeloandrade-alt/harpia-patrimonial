export { default as PublicExperience } from './PublicExperience';
export { default as PublicSiteApp } from './PublicSiteApp';

export type {
  PublicAuthBridge,
  PublicFavoritesBridge,
  PublicSiteConversion,
} from './PublicSiteApp';

export type {
  PublicCatalogFilters,
  PublicCatalogItem,
  PublicCatalogMedia,
  PublicCatalogReader,
  PublicCatalogStatus,
} from '../public-catalog/contracts';

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
