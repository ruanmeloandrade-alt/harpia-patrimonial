import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, x-bootstrap-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BOOTSTRAP_TOKEN_SHA256 = '7265782bced1521f48651b41ddac9ad83de8a6693d2698b45728deb3700388bf';

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const suppliedToken = req.headers.get('x-bootstrap-token') || '';
  if (!suppliedToken || await sha256(suppliedToken) !== BOOTSTRAP_TOKEN_SHA256) {
    return response({ ok: false, message: 'Token de ativação inválido.' }, 403);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return response({ ok: false, message: 'Configuração do servidor incompleta.' }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (listError) return response({ ok: false, message: 'Não foi possível validar o estado inicial.' }, 500);
  if ((usersPage?.users ?? []).length > 0) return response({ ok: false, message: 'A ativação inicial já foi concluída. Use o login normal.' }, 409);

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const whatsapp = String(body.whatsapp || '').trim();
  const password = String(body.password || '');

  if (!fullName || !email || password.length < 8) {
    return response({ ok: false, message: 'Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.' }, 400);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, whatsapp },
  });
  if (createError || !created.user) {
    return response({ ok: false, message: createError?.message || 'Não foi possível criar a primeira conta.' }, 400);
  }

  const userId = created.user.id;
  const rollback = async (message: string) => {
    await admin.auth.admin.deleteUser(userId);
    return response({ ok: false, message }, 500);
  };

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({ account_type: 'internal', is_active: true, full_name: fullName, whatsapp: whatsapp || null })
    .eq('id', userId);
  if (profileError) return await rollback('Falha ao ativar o perfil interno. Operação revertida.');

  const { data: adminGroup, error: groupError } = await admin
    .from('permission_groups')
    .select('id')
    .eq('slug', 'administrador')
    .eq('is_active', true)
    .maybeSingle();
  if (groupError || !adminGroup?.id) return await rollback('Grupo Administrador não encontrado. Operação revertida.');

  const { error: membershipError } = await admin
    .from('user_group_memberships')
    .insert({ user_id: userId, group_id: adminGroup.id });
  if (membershipError) return await rollback('Falha ao aplicar o acesso Administrador. Operação revertida.');

  return response({ ok: true, userId }, 201);
});
