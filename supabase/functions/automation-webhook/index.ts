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

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
}

function isIpv4(value: string) {
  const parts = value.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function isPrivateOrReservedIpv4(value: string) {
  if (!isIpv4(value)) return false;
  const parts = value.split('.').map(Number);
  const [a, b, c] = parts;

  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIpv6(value: string) {
  const address = normalizeHostname(value);
  if (!address.includes(':')) return false;
  if (address === '::' || address === '::1') return true;
  if (address.startsWith('fc') || address.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(address)) return true;
  if (address.startsWith('ff')) return true;
  if (address.startsWith('2001:db8:') || address === '2001:db8::') return true;

  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isPrivateOrReservedIpv4(mapped[1]);
  return false;
}

function assertPublicAddress(address: string) {
  const normalized = normalizeHostname(address);
  if (isPrivateOrReservedIpv4(normalized) || isPrivateOrReservedIpv6(normalized)) {
    throw new Error('Webhook privado/interno não é permitido.');
  }
}

async function resolveAndValidateHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  if (!normalized) throw new Error('Hostname inválido.');
  if (
    normalized === 'localhost'
    || normalized.endsWith('.localhost')
    || normalized.endsWith('.local')
  ) throw new Error('Webhook privado/interno não é permitido.');

  if (isIpv4(normalized) || normalized.includes(':')) {
    assertPublicAddress(normalized);
    return;
  }

  const [ipv4Result, ipv6Result] = await Promise.allSettled([
    Deno.resolveDns(normalized, 'A'),
    Deno.resolveDns(normalized, 'AAAA'),
  ]);
  const addresses = [
    ...(ipv4Result.status === 'fulfilled' ? ipv4Result.value : []),
    ...(ipv6Result.status === 'fulfilled' ? ipv6Result.value : []),
  ];

  if (!addresses.length) throw new Error('Não foi possível resolver o endpoint do webhook.');
  addresses.forEach(assertPublicAddress);
}

async function safeUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Webhook precisa usar HTTPS.');
  if (url.username || url.password) throw new Error('Credenciais na URL do webhook não são permitidas.');
  await resolveAndValidateHostname(url.hostname);
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
    const url = await safeUrl(rawUrl);
    const external = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Harpia-Automation/1.0' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
      redirect: 'manual',
    });
    if (external.status >= 300 && external.status < 400) {
      return respond({ status: 'rejected', reason: 'Redirecionamentos de webhook não são permitidos.' }, 502);
    }
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
