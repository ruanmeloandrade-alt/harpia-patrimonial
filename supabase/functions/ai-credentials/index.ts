import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  if (req.method !== 'POST') return json(405, { ok: false, message: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return json(500, { ok: false, message: 'Configuração segura do servidor incompleta.' });
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller.user) return json(401, { ok: false, message: 'Sessão inválida.' });

  const { data: permissionRows, error: permissionError } = await callerClient
    .from('current_user_permissions')
    .select('permission_key')
    .eq('permission_key', 'integrations.manage');

  if (permissionError) return json(403, { ok: false, message: 'Não foi possível validar a permissão de integrações.' });
  if (!(permissionRows ?? []).some((item: { permission_key: string }) => item.permission_key === 'integrations.manage')) {
    return json(403, { ok: false, message: 'Sem permissão para gerenciar credenciais de integrações.' });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '').trim();
  const profileId = String(body.profileId || '').trim();
  if (!profileId || profileId.length > 200) return json(400, { ok: false, message: 'Perfil de IA inválido.' });

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'save') {
    const apiKey = String(body.apiKey || '').trim();
    if (apiKey.length < 8) return json(400, { ok: false, message: 'Chave API inválida.' });

    const { data, error } = await admin.rpc('f05_store_ai_secret', {
      p_profile_id: profileId,
      p_secret: apiKey,
      p_actor: caller.user.id,
    });

    if (error || !data) return json(500, { ok: false, message: 'Não foi possível armazenar a credencial com segurança.' });
    return json(200, { ok: true, secretRef: String(data) });
  }

  if (action === 'remove') {
    const { data, error } = await admin.rpc('f05_remove_ai_secret', { p_profile_id: profileId });
    if (error) return json(500, { ok: false, message: 'Não foi possível remover a credencial.' });
    return json(200, { ok: true, removed: Boolean(data) });
  }

  return json(400, { ok: false, message: 'Ação inválida.' });
});
