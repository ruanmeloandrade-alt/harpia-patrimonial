import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PERMISSIONS = ['automations.manage', 'salesbot.manage'];

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

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

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function safeUrl(raw: string) {
  const url = new URL(raw);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new Error('Webhook precisa usar HTTPS.');
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname === '::1'
    || hostname.startsWith('fc')
    || hostname.startsWith('fd')
    || hostname.startsWith('fe80:')
    || isPrivateIpv4(hostname)
  ) throw new Error('Webhook privado/interno não é permitido.');
  return url.toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !publicKey || !authorization) {
    return respond({ status: 'rejected', reason: 'Configuração do servidor incompleta.' }, 500);
  }

  const caller = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return respond({ status: 'rejected', reason: 'Sessão inválida.' }, 401);

  const [{ data: profile }, { data: permissionRows, error: permissionError }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').in('permission_key', PERMISSIONS),
  ]);
  if (permissionError || profile?.account_type !== 'internal' || profile?.is_active !== true || !(permissionRows ?? []).length) {
    return respond({ status: 'rejected', reason: 'Sem permissão para executar webhook.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const method = String(body.method || 'POST').trim().toUpperCase();
  const rawUrl = String(body.url || '').trim();
  const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
  if (!rawUrl) return respond({ status: 'rejected', reason: 'Endpoint obrigatório.' }, 400);
  if (!ALLOWED_METHODS.has(method)) return respond({ status: 'rejected', reason: 'Método de webhook não permitido.' }, 400);

  try {
    const url = safeUrl(rawUrl);
    const external = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Harpia-Automation/1.0' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (!external.ok) {
      return respond({ status: 'rejected', reason: `Webhook respondeu HTTP ${external.status}.` }, 502);
    }
    return respond({ status: 'accepted', data: { httpStatus: external.status } });
  } catch (error) {
    return respond({
      status: 'rejected',
      reason: error instanceof Error ? error.message : 'Falha ao executar webhook.',
    }, 502);
  }
});
