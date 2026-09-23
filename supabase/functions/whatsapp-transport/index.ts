import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function bearerValue(authorization: string | null) {
  const prefix = 'Bearer ';
  if (!authorization?.startsWith(prefix)) return '';
  return authorization.slice(prefix.length);
}

async function canSend(authorization: string) {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (serviceRoleKey && bearerValue(authorization) === serviceRoleKey) return true;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !publishableKey) return false;

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return false;

  const { data, error } = await caller
    .from('current_user_permissions')
    .select('permission_key')
    .eq('permission_key', 'inbox.manage');

  if (error) return false;
  return (data ?? []).some((row: { permission_key: string | null }) => row.permission_key === 'inbox.manage');
}

async function callConnector(payload: Record<string, unknown>) {
  const baseUrl = Deno.env.get('WHATSAPP_CONNECTOR_URL')?.trim().replace(/\/+$/, '');
  const token = Deno.env.get('WHATSAPP_CONNECTOR_TOKEN')?.trim();

  if (!baseUrl || !token) {
    return {
      status: 503,
      payload: { ok: false, message: 'Conector WhatsApp ainda não foi configurado no backend.' },
    };
  }

  const response = await fetch(`${baseUrl}/v1/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20_000),
  });

  return {
    status: response.status,
    payload: await response.json().catch(() => ({
      ok: false,
      message: 'Resposta inválida do conector WhatsApp.',
    })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond(405, { ok: false, message: 'Método não permitido.' });

  const authorization = req.headers.get('Authorization');
  if (!authorization) return respond(401, { ok: false, message: 'Sessão ausente.' });
  if (!await canSend(authorization)) return respond(403, { ok: false, message: 'Sem permissão para enviar pela Inbox.' });

  const body = await req.json().catch(() => ({}));
  const conversationId = String(body.conversationId || '').trim();
  const type = String(body.type || 'text').trim();
  const text = typeof body.text === 'string' ? body.text : undefined;

  if (!conversationId) return respond(400, { ok: false, message: 'conversationId é obrigatório.' });
  if (!['text', 'audio', 'image', 'video', 'document', 'form'].includes(type)) {
    return respond(400, { ok: false, message: 'Tipo de mensagem inválido.' });
  }

  try {
    const result = await callConnector({ conversationId, type, text });
    return respond(result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enviar pelo conector WhatsApp.';
    return respond(502, { ok: false, message });
  }
});
