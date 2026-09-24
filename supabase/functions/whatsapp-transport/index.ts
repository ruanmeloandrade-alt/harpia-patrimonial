import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';


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

async function callConnector(path: '/v1/send' | '/v1/group', payload: Record<string, unknown>) {
  const baseUrl = (Deno.env.get('WHATSAPP_CONNECTOR_URL')?.trim() || DEFAULT_CONNECTOR_URL).replace(/\/+$/, '');
  const token = Deno.env.get('WHATSAPP_CONNECTOR_TOKEN')?.trim() || await derivedControlToken();

  if (!baseUrl || !token) {
    return {
      status: 503,
      payload: { ok: false, message: 'Conector WhatsApp ainda não foi configurado no backend.' },
    };
  }

  const response = await fetch(`${baseUrl}${path}`, {
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
  if (!await canSend(authorization)) return respond(403, { ok: false, message: 'Sem permissão para operar a Inbox.' });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'send').trim();
  const conversationId = String(body.conversationId || '').trim();

  if (!conversationId) return respond(400, { ok: false, message: 'conversationId é obrigatório.' });

  try {
    if (action === 'prepare') {
      const admin = serviceClient();
      const { data, error } = await admin.rpc('admin_prepare_whatsapp_conversation', {
        p_conversation_id: conversationId,
      });

      if (error) {
        const normalized = error.message.includes('not healthy')
          ? 'O WhatsApp não está conectado ou o heartbeat está desatualizado.'
          : error.message.includes('valid whatsapp')
            ? 'O lead não possui um WhatsApp válido.'
            : error.message.includes('already linked')
              ? 'Este número já está vinculado a outra conversa.'
              : error.message;

        return respond(409, { ok: false, message: normalized });
      }

      return respond(200, { ok: true, ...((data ?? {}) as Record<string, unknown>) });
    }

    if (action === 'group') {
      const subject = String(body.subject || '').trim();
      if (!subject) return respond(400, { ok: false, message: 'Nome do grupo é obrigatório.' });
      const result = await callConnector('/v1/group', { conversationId, subject });
      return respond(result.status, result.payload);
    }

    if (action !== 'send') {
      return respond(400, { ok: false, message: 'Ação inválida.' });
    }

    const type = String(body.type || 'text').trim();
    const text = typeof body.text === 'string' ? body.text : undefined;
    const attachment = body.attachment && typeof body.attachment === 'object' && !Array.isArray(body.attachment)
      ? body.attachment as Record<string, unknown>
      : undefined;
    const buttons = Array.isArray(body.buttons)
      ? body.buttons
        .map((item: unknown) => item && typeof item === 'object' && !Array.isArray(item)
          ? {
            id: String((item as Record<string, unknown>).id || '').trim(),
            label: String((item as Record<string, unknown>).label || '').trim(),
          }
          : null)
        .filter((item: { id: string; label: string } | null): item is { id: string; label: string } => Boolean(item?.id && item?.label))
        .slice(0, 10)
      : [];

    if (!['text', 'audio', 'image', 'video', 'document'].includes(type)) {
      return respond(400, { ok: false, message: 'Tipo de mensagem inválido.' });
    }

    const result = await callConnector('/v1/send', { conversationId, type, text, attachment, buttons });
    return respond(result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao operar o transporte WhatsApp.';
    return respond(502, { ok: false, message });
  }
});
