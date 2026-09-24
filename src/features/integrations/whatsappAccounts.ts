import { requireSupabase } from '../../core/supabase/client';

export type WhatsAppChannelAccount = {
  id: string;
  sessionId: string;
  phoneNumber: string | null;
  displayName: string | null;
  status: string;
  responsibleUserId: string | null;
  lastHeartbeatAt: string | null;
};

export async function listWhatsAppChannelAccounts(): Promise<WhatsAppChannelAccount[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('inbox_channel_accounts')
    .select('id,phone_number,display_name,status,responsible_user_id,last_heartbeat_at,integration_connections!inner(external_account_id)')
    .eq('provider', 'whatsapp_web')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    sessionId: String(row.integration_connections?.external_account_id || ''),
    phoneNumber: row.phone_number ? String(row.phone_number) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    status: String(row.status || 'not_connected'),
    responsibleUserId: row.responsible_user_id ? String(row.responsible_user_id) : null,
    lastHeartbeatAt: row.last_heartbeat_at ? String(row.last_heartbeat_at) : null,
  }));
}

export async function assignWhatsAppResponsible(accountId: string, userId?: string) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('inbox_channel_accounts')
    .update({ responsible_user_id: userId || null })
    .eq('id', accountId);

  if (error) throw error;
}
