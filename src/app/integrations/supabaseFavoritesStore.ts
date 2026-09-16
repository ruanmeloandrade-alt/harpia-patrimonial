import { requireSupabase } from '../../core/supabase/client';
import type {
  PublicFavoriteReference,
  PublicFavoritesStorePort,
} from '../../features/public-site/usePublicFavoritesBridge';

export class SupabaseFavoritesStore implements PublicFavoritesStorePort {
  async list(clientId: string): Promise<PublicFavoriteReference[]> {
    const supabase = requireSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== clientId) {
      throw new Error('Sessão inválida para carregar favoritos.');
    }

    const { data, error } = await supabase
      .from('client_favorites')
      .select('item_id,item_slug')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: { item_id: string; item_slug: string }) => ({
      itemId: row.item_id,
      itemSlug: row.item_slug,
    }));
  }

  async add(clientId: string, item: PublicFavoriteReference): Promise<void> {
    const supabase = requireSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== clientId) {
      throw new Error('Sessão inválida para salvar favorito.');
    }

    const { error } = await supabase
      .from('client_favorites')
      .upsert({
        client_id: clientId,
        item_id: item.itemId,
        item_slug: item.itemSlug,
      }, { onConflict: 'client_id,item_id' });

    if (error) throw error;
  }

  async remove(clientId: string, itemId: string): Promise<void> {
    const supabase = requireSupabase();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== clientId) {
      throw new Error('Sessão inválida para remover favorito.');
    }

    const { error } = await supabase
      .from('client_favorites')
      .delete()
      .eq('client_id', clientId)
      .eq('item_id', itemId);

    if (error) throw error;
  }
}
