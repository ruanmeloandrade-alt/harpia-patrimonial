import { PublicCatalogService } from './publicCatalog';
import { SupabaseCatalogMediaStorage, type CatalogStorageSupabaseClient } from './catalogMediaStorage';
import { SupabaseCatalogRepository, type CatalogSupabaseClient } from './supabaseCatalogRepository';

export type CatalogRuntimeSupabaseClient = CatalogSupabaseClient & CatalogStorageSupabaseClient;

export interface CatalogRuntime {
  repository: SupabaseCatalogRepository;
  publicCatalogService: PublicCatalogService;
  mediaStorage: SupabaseCatalogMediaStorage;
}

/**
 * Monta todos os adapters de produção da Frente03 usando a mesma instância
 * do cliente Supabase oficial da plataforma.
 *
 * A composição global continua pertencendo à Frente01; este factory apenas
 * evita que repository, serviço público e Storage sejam instanciados com
 * clientes diferentes ou com configurações duplicadas.
 */
export function createCatalogRuntime(client: CatalogRuntimeSupabaseClient): CatalogRuntime {
  const repository = new SupabaseCatalogRepository(client);
  return {
    repository,
    publicCatalogService: new PublicCatalogService(repository),
    mediaStorage: new SupabaseCatalogMediaStorage(client),
  };
}
