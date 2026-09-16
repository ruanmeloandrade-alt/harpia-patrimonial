import {
  createSupabaseClientAreaDataSource,
  createSupabasePublicLeadIngest,
  type SupabaseFunctionsClientPort,
} from './supabaseEdgeAdapters';
import {
  createSupabaseFavoritesStore,
  type SupabaseFavoritesClientPort,
} from './supabaseFavoritesStore';

export interface Front02SupabaseClientPort
  extends SupabaseFavoritesClientPort,
    SupabaseFunctionsClientPort {}

/**
 * Monta as três integrações Supabase já disponíveis para a Frente02 usando o
 * MESMO client oficial da Frente01: favoritos, ingestão pública de lead e dados
 * autenticados da área do cliente.
 */
export function createFront02SupabasePorts(client: Front02SupabaseClientPort) {
  return {
    favoritesStore: createSupabaseFavoritesStore(client),
    crmIngest: createSupabasePublicLeadIngest(client),
    clientAreaDataSource: createSupabaseClientAreaDataSource(client),
  };
}
