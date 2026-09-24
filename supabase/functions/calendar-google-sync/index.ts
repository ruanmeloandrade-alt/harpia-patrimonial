// Versioned copy of the deployed calendar-google-sync Edge Function.
// The live function validates calendar.manage and prepares the exact
// Google Calendar event payload. OAuth transport remains intentionally
// pending until the Google connection is finalized.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers });
}

function namedKey(envName: string): string | undefined {
  const raw = Deno.env.get(envName);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json(405, { ok: false, code: 'method_not_allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !publishableKey || !authorization) {
    return json(500, { ok: false, code: 'configuration_incomplete' });
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return json(401, { ok: false, code: 'invalid_session' });

  const { data: permissions } = await caller
    .from('current_user_permissions')
    .select('permission_key')
    .eq('permission_key', 'calendar.manage');
  if (!(permissions ?? []).length) return json(403, { ok: false, code: 'calendar_manage_required' });

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId || '').trim();
  if (!itemId) return json(400, { ok: false, code: 'item_id_required' });

  const { data: item, error: itemError } = await caller
    .from('calendar_items')
    .select('*')
    .eq('id', itemId)
    .single();
  if (itemError || !item) return json(404, { ok: false, code: 'calendar_item_not_found' });

  const { data: connections } = await caller
    .from('integration_connections')
    .select('status,external_account_id,account_label,metadata,updated_at')
    .eq('provider', 'google_calendar')
    .order('updated_at', { ascending: false })
    .limit(1);

  const connection = connections?.[0] ?? null;
  const eventPayload = {
    summary: item.title,
    description: item.description || undefined,
    start: { dateTime: item.start_at },
    end: { dateTime: item.end_at },
    attendees: (item.guest_emails ?? []).map((email: string) => ({ email })),
    conferenceData: item.kind === 'meeting'
      ? { createRequest: { requestId: `harpia-${item.id}` } }
      : undefined,
  };

  if (!connection || connection.status !== 'connected' || connection.metadata?.oauth_ready !== true) {
    await caller.from('calendar_items').update({
      google_sync_status: 'not_connected',
      google_sync_error: 'Google Calendar ainda não conectado.',
      google_sync_requested_at: new Date().toISOString(),
    }).eq('id', item.id);

    return json(409, {
      ok: false,
      code: 'google_calendar_not_connected',
      prepared: {
        calendarId: connection?.metadata?.calendar_id || 'primary',
        conferenceDataVersion: item.kind === 'meeting' ? 1 : 0,
        sendUpdates: (item.guest_emails ?? []).length ? 'all' : 'none',
        event: eventPayload,
      },
    });
  }

  await caller.from('calendar_items').update({
    google_sync_status: 'pending',
    google_sync_error: null,
    google_sync_requested_at: new Date().toISOString(),
  }).eq('id', item.id);

  return json(501, {
    ok: false,
    code: 'google_oauth_transport_pending',
    prepared: {
      calendarId: connection.metadata?.calendar_id || 'primary',
      conferenceDataVersion: item.kind === 'meeting' ? 1 : 0,
      sendUpdates: (item.guest_emails ?? []).length ? 'all' : 'none',
      event: eventPayload,
    },
  });
});
