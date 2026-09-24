import { isSupabaseConfigured, requireSupabase, supabase } from '../../core/supabase/client';

export type CalendarItemKind = 'task' | 'meeting';
export type CalendarItemStatus = 'open' | 'completed' | 'cancelled';
export type GoogleSyncStatus = 'not_requested' | 'pending' | 'synced' | 'error' | 'not_connected';

export interface CalendarItem {
  id: string;
  kind: CalendarItemKind;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  assigneeId?: string;
  assigneeLabel?: string;
  leadId?: string;
  guestEmails: string[];
  location?: string;
  status: CalendarItemStatus;
  source: 'manual' | 'crm' | 'salesbot' | 'google';
  syncToGoogle: boolean;
  googleSyncStatus: GoogleSyncStatus;
  googleCalendarId?: string;
  googleEventId?: string;
  googleMeetUrl?: string;
  googleHtmlLink?: string;
  googleSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarItemInput {
  kind: CalendarItemKind;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  assigneeId?: string;
  assigneeLabel?: string;
  guestEmails?: string[];
  location?: string;
  syncToGoogle?: boolean;
  googleSyncStatus?: GoogleSyncStatus;
}

export interface GoogleCalendarConnection {
  status: 'not_connected' | 'connecting' | 'connected' | 'degraded' | 'reauth_required' | 'error';
  accountLabel?: string;
  updatedAt?: string;
  oauthReady: boolean;
}

function mapItem(row: any): CalendarItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description ?? '',
    startAt: row.start_at,
    endAt: row.end_at,
    allDay: row.all_day,
    assigneeId: row.assignee_id ?? undefined,
    assigneeLabel: row.assignee_label ?? undefined,
    leadId: row.lead_id ?? undefined,
    guestEmails: row.guest_emails ?? [],
    location: row.location ?? undefined,
    status: row.status,
    source: row.source,
    syncToGoogle: row.sync_to_google,
    googleSyncStatus: row.google_sync_status,
    googleCalendarId: row.google_calendar_id ?? undefined,
    googleEventId: row.google_event_id ?? undefined,
    googleMeetUrl: row.google_meet_url ?? undefined,
    googleHtmlLink: row.google_html_link ?? undefined,
    googleSyncError: row.google_sync_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCalendarItems(fromIso: string, toIso: string): Promise<CalendarItem[]> {
  const client = requireSupabase() as any;
  const { data, error } = await client
    .from('calendar_items')
    .select('*')
    .lt('start_at', toIso)
    .gt('end_at', fromIso)
    .order('start_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapItem);
}

export async function createCalendarItem(input: CalendarItemInput): Promise<CalendarItem> {
  const client = requireSupabase() as any;
  const { data, error } = await client
    .from('calendar_items')
    .insert({
      kind: input.kind,
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      start_at: input.startAt,
      end_at: input.endAt,
      assignee_id: input.assigneeId || null,
      assignee_label: input.assigneeLabel?.trim() || null,
      guest_emails: input.guestEmails ?? [],
      location: input.location?.trim() || null,
      status: 'open',
      source: 'manual',
      sync_to_google: Boolean(input.syncToGoogle),
      google_sync_status: input.googleSyncStatus ?? (input.syncToGoogle ? 'pending' : 'not_requested'),
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapItem(data);
}

export async function setCalendarItemStatus(id: string, status: CalendarItemStatus): Promise<void> {
  const client = requireSupabase() as any;
  const { error } = await client
    .from('calendar_items')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCalendarItem(id: string): Promise<void> {
  const client = requireSupabase() as any;
  const { error } = await client.from('calendar_items').delete().eq('id', id);
  if (error) throw error;
}

export async function loadGoogleCalendarConnection(): Promise<GoogleCalendarConnection> {
  const client = requireSupabase() as any;
  const { data, error } = await client
    .from('integration_connections')
    .select('status,account_label,metadata,updated_at')
    .eq('provider', 'google_calendar')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  if (!row) return { status: 'not_connected', oauthReady: false };

  return {
    status: row.status,
    accountLabel: row.account_label ?? undefined,
    updatedAt: row.updated_at,
    oauthReady: row.metadata?.oauth_ready === true,
  };
}

export async function requestGoogleCalendarSync(itemId: string): Promise<void> {
  const client = requireSupabase() as any;
  const { error } = await client.functions.invoke('calendar-google-sync', {
    body: { itemId },
  });
  if (error) throw error;
}

export function subscribeCalendarItems(listener: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => undefined;
  const channel = supabase
    .channel('harpia-calendar-items')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'calendar_items' },
      listener,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
