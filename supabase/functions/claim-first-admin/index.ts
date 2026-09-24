import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ACTIVATION_SHA256 = 'd781f5f8eaa5fe930443ebef35c0561e544efddeac10ebb43328516264fcf181';

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const authorization = req.headers.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return response({ ok: false, message: 'Sessão ausente.' }, 401);

  const body = await req.json().catch(() => ({}));
  const activationCode = String(body.activationCode || '').trim();
  if (!activationCode || await sha256(activationCode) !== ACTIVATION_SHA256) {
    return response({ ok: false, message: 'Código de ativação inválido.' }, 403);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return response({ ok: false, message: 'Configuração do servidor incompleta.' }, 500);

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return response({ ok: false, message: 'Sessão inválida.' }, 401);

  const { count: internalCount, error: countError } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('account_type', 'internal')
    .eq('is_active', true);
  if (countError) return response({ ok: false, message: 'Não foi possível validar a ativação.' }, 500);
  if ((internalCount ?? 0) > 0) return response({ ok: false, message: 'O primeiro administrador já foi ativado.' }, 409);

  const { data: group, error: groupError } = await admin
    .from('permission_groups')
    .select('id')
    .eq('slug', 'administrador')
    .eq('is_active', true)
    .maybeSingle();
  if (groupError || !group?.id) return response({ ok: false, message: 'Grupo Administrador não encontrado.' }, 500);

  const userId = userData.user.id;
  const { error: profileError } = await admin
    .from('user_profiles')
    .update({ account_type: 'internal', is_active: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) return response({ ok: false, message: 'Não foi possível ativar o perfil interno.' }, 500);

  const { error: membershipError } = await admin
    .from('user_group_memberships')
    .upsert({ user_id: userId, group_id: group.id }, { onConflict: 'user_id,group_id' });
  if (membershipError) return response({ ok: false, message: 'Não foi possível aplicar as permissões administrativas.' }, 500);

  return response({ ok: true }, 200);
});