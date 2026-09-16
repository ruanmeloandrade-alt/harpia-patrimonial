import { PublicCatalogService } from './publicCatalog';
import { SupabaseCatalogMediaStorage, type CatalogStorageSupabaseClient } from './catalogMediaStorage';
import { type CatalogRepository } from './catalogRepository';
import { RealtimeCatalogRepository, type CatalogRealtimeSupabaseClient } from './realtimeCatalogRepository';
import { SupabaseCatalogRepository, type CatalogSupabaseClient } from './supabaseCatalogRepository';

export type CatalogRuntimeSupabaseClient = CatalogSupabaseClient
  & CatalogStorageSupabaseClient
  & CatalogRealtimeSupabaseClient;

export interface CatalogRuntime {
  repository: CatalogRepository;
  publicCatalogService: PublicCatalogService;
  mediaStorage: SupabaseCatalogMediaStorage;
  dispose(): void;
}

/**
 * Monta todos os adapters de produção da Frente03 usando a mesma instância
 * do cliente Supabase oficial da plataforma.
 *
 * A composição global continua pertencendo à Frente01; este factory apenas
 * evita que repository, serviço público, Realtime e Storage sejam instanciados
 * com clientes diferentes ou com configurações duplicadas.
 */
export function createCatalogRuntime(client: CatalogRuntimeSupabaseClient): CatalogRuntime {
  const repository = new RealtimeCatalogRepository(
    new SupabaseCatalogRepository(client),
    client,
  );

  return {
    repository,
    publicCatalogService: new PublicCatalogService(repository),
    mediaStorage: new SupabaseCatalogMediaStorage(client),
    dispose: () => repository.dispose(),
  };
}
