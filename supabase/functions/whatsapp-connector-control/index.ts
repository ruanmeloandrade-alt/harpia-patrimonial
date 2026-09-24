import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import QRCode from 'npm:qrcode@1.5.4';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ControlAction =
  | 'list'
  | 'create'
  | 'status'
  | 'qr'
  | 'connect'
  | 'reconnect'
  | 'disconnect';

const DEFAULT_CONNECTOR_URL = 'https://harpia-patrimonial-production.up.railway.app';

async function derivedControlToken() {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (!serviceRoleKey) return '';

  const bytes = new TextEncoder().encode(`harpia-whatsapp-control-v1:${serviceRoleKey}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  let binary = '';
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function respond(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers });
}

async function requirePermission(
  authorization: string,
  permission: 'integrations.view' | 'integrations.manage',
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');

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

function serviceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuração do Supabase incompleta.');

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function issueControlNonce(action: string) {
  const raw = `nonce_${crypto.randomUUID()}_${crypto.randomUUID()}`;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)));
  const tokenHash = Array.from(digest).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const admin = serviceClient();

  const { error } = await admin
    .from('whatsapp_control_nonces')
    .insert({
      token_hash: tokenHash,
      action,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

  if (error) throw new Error(`Não foi possível autorizar o conector WhatsApp: ${error.message}`);
  return raw;
}

async function callConnector(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
) {
  const baseUrl = (Deno.env.get('WHATSAPP_CONNECTOR_URL')?.trim() || DEFAULT_CONNECTOR_URL).replace(/\/+$/, '');
  const nonceToken = await issueControlNonce(path.split('?')[0] || path);
  const configuredToken = Deno.env.get('WHATSAPP_CONNECTOR_TOKEN')?.trim() || '';
  const derivedToken = await derivedControlToken();
  const tokens = [...new Set([nonceToken, configuredToken, derivedToken].filter(Boolean))];

  if (!baseUrl || tokens.length === 0) {
    return {
      ok: false as const,
      status: 503,
      payload: { ok: false, message: 'Conector WhatsApp ainda não foi configurado no backend.' },
    };
  }

  const requestConnector = async (token: string) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });

    const payload = await response.json().catch(() => ({
      ok: false,
      message: 'Resposta inválida do conector WhatsApp.',
    }));

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  };

  let result = await requestConnector(tokens[0]);
  for (let index = 1; result.status === 401 && index < tokens.length; index += 1) {
    result = await requestConnector(tokens[index]);
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond(405, { ok: false, message: 'Método não permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond(401, { ok: false, message: 'Sessão ausente.' });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '') as ControlAction;
  const sessionId = String(body.sessionId || '').trim();

  if (!['list', 'create', 'status', 'qr', 'connect', 'reconnect', 'disconnect'].includes(action)) {
    return respond(400, { ok: false, message: 'Ação inválida.' });
  }

  const permission = action === 'list' || action === 'status'
    ? 'integrations.view'
    : 'integrations.manage';

  if (!await requirePermission(authorization, permission)) {
    return respond(403, { ok: false, message: 'Sem permissão para esta ação.' });
  }

  try {
    if (action === 'list') {
      const result = await callConnector('/v1/sessions', 'GET');
      return respond(result.status, result.payload);
    }

    if (action === 'create') {
      const result = await callConnector('/v1/sessions', 'POST');
      return respond(result.status, result.payload);
    }

    const query = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';

    if (action === 'status') {
      const result = await callConnector(`/v1/status${query}`, 'GET');
      return respond(result.status, result.payload);
    }

    if (action === 'qr') {
      const result = await callConnector(`/v1/qr${query}`, 'GET');
      if (!result.ok) return respond(result.status, result.payload);

      const rawQr = typeof (result.payload as { qr?: unknown }).qr === 'string'
        ? (result.payload as { qr: string }).qr
        : '';

      if (!rawQr) return respond(502, { ok: false, message: 'QR inválido retornado pelo conector.' });

      const svg = await QRCode.toString(rawQr, {
        type: 'svg',
        margin: 1,
        width: 320,
        errorCorrectionLevel: 'M',
      });

      return respond(200, {
        ok: true,
        sessionId: (result.payload as { sessionId?: string }).sessionId || sessionId,
        svg,
      });
    }

    const path = action === 'connect'
      ? '/v1/connect'
      : action === 'reconnect'
        ? '/v1/reconnect'
        : '/v1/disconnect';

    const result = await callConnector(path, 'POST', sessionId ? { sessionId } : {});
    return respond(result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao acessar o conector WhatsApp.';
    return respond(502, { ok: false, message });
  }
});
