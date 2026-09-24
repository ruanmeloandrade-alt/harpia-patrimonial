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

type ControlAction = 'status' | 'qr' | 'connect' | 'reconnect' | 'disconnect';

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

async function callConnector(path: string, method: 'GET' | 'POST') {
  const baseUrl = (Deno.env.get('WHATSAPP_CONNECTOR_URL')?.trim() || DEFAULT_CONNECTOR_URL).replace(/\/+$/, '');
  const token = Deno.env.get('WHATSAPP_CONNECTOR_TOKEN')?.trim() || await derivedControlToken();

  if (!baseUrl || !token) {
    return {
      ok: false as const,
      status: 503,
      payload: { ok: false, message: 'Conector WhatsApp ainda não foi configurado no backend.' },
    };
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
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
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond(405, { ok: false, message: 'Método não permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond(401, { ok: false, message: 'Sessão ausente.' });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '') as ControlAction;

  if (!['status', 'qr', 'connect', 'reconnect', 'disconnect'].includes(action)) {
    return respond(400, { ok: false, message: 'Ação inválida.' });
  }

  const permission = action === 'status' ? 'integrations.view' : 'integrations.manage';
  if (!await requirePermission(authorization, permission)) {
    return respond(403, { ok: false, message: 'Sem permissão para esta ação.' });
  }

  try {
    if (action === 'status') {
      const result = await callConnector('/v1/status', 'GET');
      return respond(result.status, result.payload);
    }

    if (action === 'qr') {
      const result = await callConnector('/v1/qr', 'GET');
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

      return respond(200, { ok: true, svg });
    }

    const path = action === 'connect'
      ? '/v1/connect'
      : action === 'reconnect'
        ? '/v1/reconnect'
        : '/v1/disconnect';

    const result = await callConnector(path, 'POST');
    return respond(result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao acessar o conector WhatsApp.';
    return respond(502, { ok: false, message });
  }
});
