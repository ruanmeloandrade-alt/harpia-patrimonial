import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Json = Record<string, unknown>;
type MetaForm = { id: string; name?: string; status?: string };
type MetaPage = { id: string; name?: string };
type MetaAppConfig = { app_id?: string; app_secret?: string; webhook_verify_token?: string };

function respond(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers });
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

function graphVersion() {
  const configured = String(Deno.env.get('META_GRAPH_VERSION') || '').trim();
  return /^v\d+\.\d+$/.test(configured) ? configured : 'v26.0';
}

async function requirePermission(authorization: string, permission: 'integrations.view' | 'integrations.manage') {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS')
    || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
    || Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !publishableKey) throw new Error('Configuração do Supabase incompleta.');

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return false;

  const accepted = permission === 'integrations.manage'
    ? ['integrations.manage']
    : ['integrations.view', 'integrations.manage'];

  const { data, error } = await caller
    .from('current_user_permissions')
    .select('permission_key')
    .in('permission_key', accepted);

  if (error) return false;
  return (data ?? []).some((row: { permission_key: string | null }) =>
    row.permission_key && accepted.includes(row.permission_key),
  );
}

async function graphRequest(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  params: Record<string, string> = {},
) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path.replace(/^\/+/, '')}`);
  url.searchParams.set('access_token', token);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, {
    method,
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json().catch(() => null) as Json | null;
  if (!response.ok || !payload) {
    const error = payload?.error as Json | undefined;
    const message = typeof error?.message === 'string'
      ? error.message
      : `Meta Graph respondeu HTTP ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

async function inspectPage(pageId: string, token: string) {
  const [pagePayload, formsPayload] = await Promise.all([
    graphRequest(pageId, token, 'GET', { fields: 'id,name' }),
    graphRequest(`${pageId}/leadgen_forms`, token, 'GET', { fields: 'id,name,status', limit: '100' }),
  ]);

  const page = pagePayload as unknown as MetaPage;
  if (!page.id || page.id !== pageId) throw new Error('O token informado não corresponde à Página selecionada.');

  const formsRaw = Array.isArray(formsPayload.data) ? formsPayload.data : [];
  const forms = formsRaw
    .filter((item): item is MetaForm => Boolean(item && typeof item === 'object' && typeof (item as MetaForm).id === 'string'))
    .map((item) => ({ id: item.id, name: item.name, status: item.status }));

  return { page, forms };
}

async function subscribeLeadgen(pageId: string, token: string) {
  const payload = await graphRequest(
    `${pageId}/subscribed_apps`,
    token,
    'POST',
    { subscribed_fields: 'leadgen' },
  );
  if (payload.success !== true) throw new Error('A Meta não confirmou a inscrição do webhook leadgen nesta Página.');
}

async function unsubscribeLeadgen(pageId: string, token: string) {
  const payload = await graphRequest(`${pageId}/subscribed_apps`, token, 'DELETE');
  return payload.success === true;
}

async function resolveAppConfig(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.rpc('admin_resolve_meta_app_config');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row && typeof row === 'object' ? row : null) as MetaAppConfig | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond(405, { ok: false, message: 'Método não permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond(401, { ok: false, message: 'Sessão ausente.' });

  const body = await req.json().catch(() => ({})) as Json;
  const action = String(body.action || '');

  if (!['status', 'configure_app', 'inspect', 'connect', 'disconnect'].includes(action)) {
    return respond(400, { ok: false, message: 'Ação inválida.' });
  }

  const permission = action === 'status' ? 'integrations.view' : 'integrations.manage';
  if (!await requirePermission(authorization, permission)) {
    return respond(403, { ok: false, message: 'Sem permissão para esta ação.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  if (!supabaseUrl || !serverKey) return respond(503, { ok: false, message: 'Configuração interna incompleta.' });

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const webhookCallback = `${supabaseUrl}/functions/v1/meta-lead-webhook`;

  try {
    if (action === 'status') {
      const [{ data, error }, appConfig] = await Promise.all([
        admin
          .from('integration_connections')
          .select('id,status,external_account_id,account_label,connected_at,last_health_at,last_event_at,last_error_at,last_error_code,metadata,updated_at')
          .eq('provider', 'meta')
          .order('updated_at', { ascending: false }),
        resolveAppConfig(admin),
      ]);

      if (error) throw error;
      return respond(200, {
        ok: true,
        graphVersion: graphVersion(),
        webhookCallback,
        appConfigured: Boolean(appConfig?.app_id && appConfig?.app_secret && appConfig?.webhook_verify_token),
        appId: appConfig?.app_id || null,
        connections: data ?? [],
      });
    }

    if (action === 'configure_app') {
      const appId = String(body.appId || '').trim();
      const appSecret = String(body.appSecret || '').trim();
      if (!appId || !appSecret) {
        return respond(400, { ok: false, message: 'App ID e App Secret da Meta são obrigatórios.' });
      }

      const { data, error } = await admin.rpc('admin_store_meta_app_config', {
        p_app_id: appId,
        p_app_secret: appSecret,
      });
      if (error || !data) throw error || new Error('Não foi possível salvar a configuração do App Meta.');

      const config = data as Json;
      return respond(200, {
        ok: true,
        appId: String(config.appId || appId),
        verifyToken: String(config.verifyToken || ''),
        webhookCallback,
        graphVersion: graphVersion(),
      });
    }

    const pageId = String(body.pageId || '').trim();
    if (!pageId) return respond(400, { ok: false, message: 'ID da Página Meta obrigatório.' });

    if (action === 'disconnect') {
      let unsubscribed = false;
      let warning = '';

      const { data: token } = await admin.rpc('admin_resolve_meta_page_token', { p_page_id: pageId });
      if (token) {
        try {
          unsubscribed = await unsubscribeLeadgen(pageId, String(token));
        } catch (error) {
          warning = error instanceof Error ? error.message : 'Não foi possível remover a inscrição na Meta.';
        }
      }

      const { data, error } = await admin.rpc('admin_disconnect_meta_page', { p_page_id: pageId });
      if (error) throw error;

      return respond(200, {
        ok: true,
        disconnected: Boolean(data),
        unsubscribed,
        ...(warning ? { warning } : {}),
      });
    }

    const pageAccessToken = String(body.pageAccessToken || '').trim();
    if (!pageAccessToken) {
      return respond(400, { ok: false, message: 'Token de acesso da Página obrigatório.' });
    }

    const inspected = await inspectPage(pageId, pageAccessToken);
    if (action === 'inspect') {
      return respond(200, { ok: true, graphVersion: graphVersion(), ...inspected });
    }

    const appConfig = await resolveAppConfig(admin);
    if (!appConfig?.app_id || !appConfig?.app_secret || !appConfig?.webhook_verify_token) {
      return respond(409, {
        ok: false,
        message: 'Configure primeiro o App ID e o App Secret da Meta para habilitar o webhook assinado.',
      });
    }

    const requestedIds = Array.isArray(body.formIds)
      ? body.formIds.map(String).map((value) => value.trim()).filter(Boolean)
      : [];
    const availableIds = new Set(inspected.forms.map((form) => form.id));
    const invalidIds = requestedIds.filter((id) => !availableIds.has(id));

    if (invalidIds.length) {
      return respond(400, {
        ok: false,
        message: 'Há formulários selecionados que não pertencem à Página.',
        invalidFormIds: invalidIds,
      });
    }

    const formIds = requestedIds.length ? requestedIds : inspected.forms.map((form) => form.id);

    await subscribeLeadgen(pageId, pageAccessToken);

    const { data: connectionId, error } = await admin.rpc('admin_store_meta_page_token', {
      p_page_id: pageId,
      p_page_name: inspected.page.name || null,
      p_page_access_token: pageAccessToken,
      p_form_ids: formIds,
      p_graph_version: graphVersion(),
    });

    if (error || !connectionId) throw error || new Error('Não foi possível salvar a conexão Meta.');

    return respond(200, {
      ok: true,
      connectionId: String(connectionId),
      graphVersion: graphVersion(),
      page: inspected.page,
      forms: inspected.forms,
      selectedFormIds: formIds,
      subscribedField: 'leadgen',
    });
  } catch (error) {
    return respond(502, {
      ok: false,
      message: error instanceof Error ? error.message : 'Falha ao acessar a Meta.',
    });
  }
});
