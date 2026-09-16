import { requireSupabase } from '../../core/supabase/client';
import type { ClientAreaDataSourcePort } from '../../features/client-area/useClientAreaData';
import type { ClientAreaDataView } from '../../features/client-area/ClientArea';

export class SupabaseClientAreaDataSource implements ClientAreaDataSourcePort {
  async load(clientId: string): Promise<ClientAreaDataView> {
    const supabase = requireSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (sessionError || !session || session.user.id !== clientId) {
      throw new Error('Sessão de cliente inválida.');
    }

    const { data, error } = await supabase.functions.invoke('client-area-data', {
      body: {},
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.message || 'Não foi possível carregar a área do cliente.');

    return {
      interests: Array.isArray(data.data?.interests) ? data.data.interests : [],
      history: Array.isArray(data.data?.history) ? data.data.history : [],
    };
  }
}
