import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(body: Record<string, unknown>, status = 200) {
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
  if (req.method !== 'POST') return response({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serverKey = namedKey('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serverKey || !authorization) {
    return response({ status: 'rejected', reason: 'Configuração segura do servidor incompleta.' }, 500);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) {
    return response({ status: 'rejected', reason: 'Sessão inválida.' }, 401);
  }

  const [{ data: profile, error: profileError }, { data: permissionRows, error: permissionError }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').eq('permission_key', 'integrations.manage'),
  ]);

  if (profileError || permissionError) {
    return response({ status: 'rejected', reason: 'Não foi possível validar a autorização.' }, 403);
  }

  if (profile?.account_type !== 'internal' || profile?.is_active !== true || !(permissionRows ?? []).length) {
    return response({ status: 'rejected', reason: 'Sem permissão para gerenciar credenciais de IA.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const profileId = String(body.profileId || '').trim();
  if (!profileId) return response({ status: 'rejected', reason: 'Perfil de IA obrigatório.' }, 400);

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'save') {
    const apiKey = String(body.apiKey || '').trim();
    if (!apiKey) return response({ status: 'rejected', reason: 'Chave API obrigatória.' }, 400);

    const { data, error } = await admin.rpc('admin_store_ai_credential', {
      p_profile_id: profileId,
      p_api_key: apiKey,
    });
    if (error || !data) {
      return response({ status: 'rejected', reason: error?.message || 'Não foi possível armazenar a credencial.' }, 500);
    }

    return response({ status: 'stored', secretRef: String(data) });
  }

  if (action === 'remove') {
    const secretRef = body.secretRef ? String(body.secretRef) : null;
    const { error } = await admin.rpc('admin_delete_ai_credential', {
      p_profile_id: profileId,
      p_secret_ref: secretRef,
    });
    if (error) return response({ status: 'rejected', reason: error.message }, 500);
    return response({ status: 'stored', secretRef: '' });
  }

  return response({ status: 'rejected', reason: 'Ação inválida.' }, 400);
});
