import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  if (req.method !== 'POST') return json({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return json({ ok: false, message: 'Configuração do servidor incompleta.' }, 500);
  }

  const callerClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: caller, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller.user) return json({ ok: false, message: 'Sessão inválida.' }, 401);

  const { data: permissionRows, error: permissionError } = await callerClient
    .from('current_user_permissions')
    .select('permission_key')
    .in('permission_key', ['users.manage', 'roles.manage']);

  if (permissionError) return json({ ok: false, message: 'Não foi possível validar as permissões.' }, 403);

  const callerPermissions = new Set((permissionRows ?? []).map((item: { permission_key: string }) => item.permission_key));
  if (!callerPermissions.has('users.manage')) return json({ ok: false, message: 'Sem permissão para criar usuários.' }, 403);

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const whatsapp = String(body.whatsapp || '').trim();
  const password = String(body.password || '');

  const legacyGroupId = body.groupId ? String(body.groupId) : '';
  const groupIds = [...new Set([
    ...(Array.isArray(body.groupIds) ? body.groupIds.map((value: unknown) => String(value)) : []),
    ...(legacyGroupId ? [legacyGroupId] : []),
  ].filter(Boolean))];

  const permissionOverrides = (Array.isArray(body.permissionOverrides) ? body.permissionOverrides : [])
    .map((row: Record<string, unknown>) => ({
      permission_id: String(row.permissionId || row.permission_id || ''),
      effect: String(row.effect || ''),
    }))
    .filter((row: { permission_id: string; effect: string }) => row.permission_id && (row.effect === 'allow' || row.effect === 'deny'));

  if (!fullName || !email || password.length < 8) {
    return json({ ok: false, message: 'Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.' }, 400);
  }

  if ((groupIds.length || permissionOverrides.length) && !callerPermissions.has('roles.manage')) {
    return json({ ok: false, message: 'Sem permissão para definir grupos ou permissões individuais.' }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (groupIds.length) {
    const { data: groups, error: groupError } = await admin
      .from('permission_groups')
      .select('id')
      .in('id', groupIds)
      .eq('is_active', true);

    if (groupError || (groups ?? []).length !== groupIds.length) {
      return json({ ok: false, message: 'Um ou mais grupos informados são inválidos ou estão inativos.' }, 400);
    }
  }

  if (permissionOverrides.length) {
    const permissionIds = [...new Set(permissionOverrides.map((row: { permission_id: string }) => row.permission_id))];
    const { data: permissions, error: permissionsError } = await admin
      .from('permissions')
      .select('id')
      .in('id', permissionIds);

    if (permissionsError || (permissions ?? []).length !== permissionIds.length) {
      return json({ ok: false, message: 'Uma ou mais permissões individuais são inválidas.' }, 400);
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, whatsapp },
  });

  if (createError || !created.user) {
    return json({ ok: false, message: createError?.message || 'Falha ao criar usuário.' }, 400);
  }

  const userId = created.user.id;
  const rollback = async (message: string) => {
    await admin.auth.admin.deleteUser(userId);
    return json({ ok: false, message }, 500);
  };

  const { error: profileError } = await admin
    .from('user_profiles')
    .update({
      account_type: 'internal',
      is_active: true,
      full_name: fullName,
      whatsapp: whatsapp || null,
    })
    .eq('id', userId);

  if (profileError) return await rollback('Usuário criado, mas o perfil interno falhou. Operação revertida.');

  if (groupIds.length) {
    const { error: membershipError } = await admin
      .from('user_group_memberships')
      .insert(groupIds.map((groupId: string) => ({ user_id: userId, group_id: groupId })));

    if (membershipError) return await rollback('Não foi possível aplicar os grupos iniciais. Operação revertida.');
  }

  if (permissionOverrides.length) {
    const { error: overrideError } = await admin
      .from('user_permission_overrides')
      .insert(permissionOverrides.map((row: { permission_id: string; effect: string }) => ({
        user_id: userId,
        permission_id: row.permission_id,
        effect: row.effect,
      })));

    if (overrideError) return await rollback('Não foi possível aplicar as permissões individuais. Operação revertida.');
  }

  return json({ ok: true, userId, accessApplied: true }, 201);
});
