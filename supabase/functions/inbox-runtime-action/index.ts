import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function namedKey(name: string): string | undefined {
  const raw = Deno.env.get(name);
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
  if (req.method !== 'POST') return response({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceKey || !authorization) {
    return response({ status: 'rejected', reason: 'Configuração interna incompleta.' }, 503);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: identity, error: identityError }, { data: permissions, error: permissionError }] = await Promise.all([
    caller.auth.getUser(),
    caller
      .from('current_user_permissions')
      .select('permission_key')
      .in('permission_key', ['inbox.manage', 'salesbot.manage', 'ai.manage']),
  ]);

  if (identityError || !identity.user) return response({ status: 'rejected', reason: 'Sessão inválida.' }, 401);
  if (permissionError) return response({ status: 'rejected', reason: 'Não foi possível validar permissões.' }, 403);

  const { data: profile, error: profileError } = await caller
    .from('user_profiles')
    .select('account_type,is_active')
    .eq('id', identity.user.id)
    .maybeSingle();

  if (profileError || profile?.account_type !== 'internal' || profile?.is_active !== true) {
    return response({ status: 'rejected', reason: 'Conta interna ativa obrigatória.' }, 403);
  }

  const allowed = new Set((permissions ?? []).map((row: any) => String(row.permission_key)));
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '').trim();
  const id = String(body.id || '').trim();
  const leadId = body.leadId ? String(body.leadId) : undefined;
  const conversationId = body.conversationId ? String(body.conversationId) : undefined;
  const context = body.context && typeof body.context === 'object' && !Array.isArray(body.context)
    ? body.context
    : {};

  if (!id) return response({ status: 'rejected', reason: 'Seleção obrigatória.' }, 400);
  if (action === 'start_salesbot' && !allowed.has('salesbot.manage') && !allowed.has('inbox.manage')) {
    return response({ status: 'rejected', reason: 'Sem permissão para iniciar SalesBot.' }, 403);
  }
  if (action === 'invoke_ai' && !allowed.has('ai.manage') && !allowed.has('inbox.manage')) {
    return response({ status: 'rejected', reason: 'Sem permissão para iniciar Agente IA.' }, 403);
  }
  if (!['start_salesbot', 'invoke_ai'].includes(action)) {
    return response({ status: 'rejected', reason: 'Ação inválida.' }, 400);
  }

  const internal = await fetch(`${supabaseUrl}/functions/v1/f05-runtime-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(action === 'start_salesbot'
      ? { action, botId: id, leadId, conversationId, context }
      : { action, agentId: id, leadId, conversationId, context }),
    redirect: 'manual',
    signal: AbortSignal.timeout(45000),
  });

  const result = await internal.json().catch(() => null);
  if (!result || typeof result !== 'object') {
    return response({ status: 'rejected', reason: `Runtime respondeu HTTP ${internal.status} sem payload válido.` }, 502);
  }

  return response(result as Record<string, unknown>, internal.ok ? 200 : internal.status);
});
