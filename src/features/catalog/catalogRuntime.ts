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
 *
 * O serviço público usa o repositório Supabase base. O repositório interno é
 * decorado com Realtime e só abre canal quando realmente utilizado pela área interna.
 * O Storage recebe o repositório base para evitar apagar objetos ainda referenciados
 * por itens ativos ou históricos do catálogo.
 */
export function createCatalogRuntime(client: CatalogRuntimeSupabaseClient): CatalogRuntime {
  const baseRepository = new SupabaseCatalogRepository(client);
  const repository = new RealtimeCatalogRepository(baseRepository, client);

  return {
    repository,
    publicCatalogService: new PublicCatalogService(baseRepository),
    mediaStorage: new SupabaseCatalogMediaStorage(client, baseRepository),
    dispose: () => repository.dispose(),
  };
}
