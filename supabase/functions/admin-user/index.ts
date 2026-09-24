import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

function normalizeWhatsapp(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (/[A-Za-z]/.test(raw)) throw new Error('WhatsApp inválido.');
  let digits = raw.replace(/\D/g, '');
  const explicitInternational = /^\s*(\+|00)/.test(raw);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!explicitInternational && (digits.length === 10 || digits.length === 11)) digits = '55' + digits;
  if (digits.length < 8 || digits.length > 15) throw new Error('WhatsApp inválido.');
  return digits;
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, message: 'Método não permitido.' }), { status: 405, headers: jsonHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return new Response(JSON.stringify({ ok: false, message: 'Configuração do servidor incompleta.' }), { status: 500, headers: jsonHeaders });
  }

  const callerClient = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: caller, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller.user) return new Response(JSON.stringify({ ok: false, message: 'Sessão inválida.' }), { status: 401, headers: jsonHeaders });

  const { data: permissionRows, error: permissionError } = await callerClient.from('current_user_permissions').select('permission_key').in('permission_key', ['users.manage', 'roles.manage']);
  if (permissionError) return new Response(JSON.stringify({ ok: false, message: 'Não foi possível validar as permissões.' }), { status: 403, headers: jsonHeaders });
  const callerPermissions = new Set((permissionRows ?? []).map((item: { permission_key: string }) => item.permission_key));
  if (!callerPermissions.has('users.manage')) return new Response(JSON.stringify({ ok: false, message: 'Sem permissão para criar usuários.' }), { status: 403, headers: jsonHeaders });

  const body = await req.json().catch(() => ({}));
  const fullName = String(body.fullName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  let whatsapp = '';
  try { whatsapp = normalizeWhatsapp(body.whatsapp); } catch { return new Response(JSON.stringify({ ok: false, message: 'WhatsApp inválido. Use DDI para números internacionais.' }), { status: 400, headers: jsonHeaders }); }
  const password = String(body.password || '');
  const groupId = body.groupId ? String(body.groupId) : null;

  if (!fullName || !email || password.length < 8) {
    return new Response(JSON.stringify({ ok: false, message: 'Nome, e-mail e senha com pelo menos 8 caracteres são obrigatórios.' }), { status: 400, headers: jsonHeaders });
  }
  if (groupId && !callerPermissions.has('roles.manage')) {
    return new Response(JSON.stringify({ ok: false, message: 'Sem permissão para atribuir grupos de acesso.' }), { status: 403, headers: jsonHeaders });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, whatsapp },
  });
  if (createError || !created.user) return new Response(JSON.stringify({ ok: false, message: createError?.message || 'Falha ao criar usuário.' }), { status: 400, headers: jsonHeaders });

  const { error: profileError } = await admin.from('user_profiles').update({ account_type: 'internal', is_active: true, full_name: fullName, whatsapp: whatsapp || null }).eq('id', created.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return new Response(JSON.stringify({ ok: false, message: 'Usuário criado, mas o perfil interno falhou. Operação revertida.' }), { status: 500, headers: jsonHeaders });
  }

  if (groupId) {
    const { error: membershipError } = await admin.from('user_group_memberships').insert({ user_id: created.user.id, group_id: groupId });
    if (membershipError) return new Response(JSON.stringify({ ok: true, userId: created.user.id, warning: 'Usuário criado, mas não foi possível associar o grupo.' }), { status: 201, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ ok: true, userId: created.user.id }), { status: 201, headers: jsonHeaders });
});
