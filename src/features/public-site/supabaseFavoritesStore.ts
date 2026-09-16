import type { PublicFavoriteReference, PublicFavoritesStorePort } from './usePublicFavoritesBridge';

interface SupabaseErrorLike {
  code?: string;
  message: string;
}

interface SupabaseResult<T> {
  data: T | null;
  error: SupabaseErrorLike | null;
}

interface SupabaseSelectBuilder<T> extends PromiseLike<SupabaseResult<T>> {
  eq(column: string, value: string): SupabaseSelectBuilder<T>;
  order(column: string, options: { ascending: boolean }): SupabaseSelectBuilder<T>;
}

interface SupabaseDeleteBuilder extends PromiseLike<SupabaseResult<unknown>> {
  eq(column: string, value: string): SupabaseDeleteBuilder;
}

interface ClientFavoriteRow {
  item_id: string;
  item_slug: string;
}

interface ClientFavoriteInsert {
  client_id: string;
  item_id: string;
  item_slug: string;
}

interface ClientFavoritesTablePort {
  select(columns: 'item_id,item_slug'): SupabaseSelectBuilder<ClientFavoriteRow[]>;
  insert(value: ClientFavoriteInsert): PromiseLike<SupabaseResult<unknown>>;
  delete(): SupabaseDeleteBuilder;
}

/**
 * Shape mínima do client Supabase compartilhado pela Frente01.
 *
 * Não importamos `@supabase/supabase-js` na Frente02 para não criar um segundo
 * cliente, uma segunda configuração ou dependência paralela. Depois do merge,
 * o integrador deve passar o client oficial da Frente01.
 */
export interface SupabaseFavoritesClientPort {
  from(table: 'client_favorites'): ClientFavoritesTablePort;
}

function throwIfError(error: SupabaseErrorLike | null, fallback: string) {
  if (!error) return;
  throw new Error(error.message || fallback);
}

function assertUuid(value: string, label: string) {
  const normalized = value.trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(normalized)) throw new Error(`${label} inválido para persistência de favoritos.`);
  return normalized;
}

/**
 * Implementa `PublicFavoritesStorePort` sobre `public.client_favorites`, schema
 * oficial versionado pela Frente01 e já existente no Supabase da Hárpia.
 */
export function createSupabaseFavoritesStore(
  client: SupabaseFavoritesClientPort,
): PublicFavoritesStorePort {
  return {
    async list(clientId) {
      const safeClientId = assertUuid(clientId, 'Cliente');
      const result = await client
        .from('client_favorites')
        .select('item_id,item_slug')
        .eq('client_id', safeClientId)
        .order('created_at', { ascending: false });

      throwIfError(result.error, 'Não foi possível carregar os favoritos.');

      return (result.data ?? []).map((row): PublicFavoriteReference => ({
        itemId: row.item_id,
        itemSlug: row.item_slug,
      }));
    },

    async add(clientId, item) {
      const safeClientId = assertUuid(clientId, 'Cliente');
      const safeItemId = assertUuid(item.itemId, 'Imóvel');
      const itemSlug = item.itemSlug.trim();
      if (!itemSlug) throw new Error('Slug do imóvel inválido para persistência de favoritos.');

      const result = await client.from('client_favorites').insert({
        client_id: safeClientId,
        item_id: safeItemId,
        item_slug: itemSlug,
      });

      // A chave composta torna a adição idempotente. Uma corrida entre dois
      // cliques pode retornar unique_violation sem representar perda de estado.
      if (result.error?.code === '23505') return;
      throwIfError(result.error, 'Não foi possível salvar o imóvel.');
    },

    async remove(clientId, itemId) {
      const safeClientId = assertUuid(clientId, 'Cliente');
      const safeItemId = assertUuid(itemId, 'Imóvel');
      const result = await client
        .from('client_favorites')
        .delete()
        .eq('client_id', safeClientId)
        .eq('item_id', safeItemId);

      throwIfError(result.error, 'Não foi possível remover o imóvel dos favoritos.');
    },
  };
}
