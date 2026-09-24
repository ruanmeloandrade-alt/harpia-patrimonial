import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESERVED_METADATA_KEYS = new Set([
  'clientid', 'userid', 'user_id', 'accounttype', 'account_type', 'role', 'permissions', 'isadmin', 'is_admin',
]);
const INTEREST_TYPES = new Set(['property', 'product', 'service', 'other']);

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

function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (depth >= 3) return undefined;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1)).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      if (RESERVED_METADATA_KEYS.has(key.toLowerCase())) continue;
      const sanitized = sanitizeValue(item, depth + 1);
      if (sanitized !== undefined) output[key.slice(0, 80)] = sanitized;
    }
    return output;
  }
  return undefined;
}

function normalizeInterest(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const type = clean(source.type, 30);
  if (!INTEREST_TYPES.has(type)) return null;
  const referenceId = clean(source.referenceId, 180);
  const label = clean(source.label, 240);
  return {
    type,
    ...(referenceId ? { referenceId } : {}),
    ...(label ? { label } : {}),
  };
}

function normalizeWhatsapp(value: unknown) {
  const raw = clean(value, 40);
  if (!raw) return '';
  if (/[A-Za-z]/.test(raw)) return '';
  let digits = raw.replace(/\D/g, '');
  const explicitInternational = /^\s*(\+|00)/.test(raw);
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!explicitInternational && (digits.length === 10 || digits.length === 11)) digits = '55' + digits;
  if (digits.length < 8 || digits.length > 15) return '';
  return digits;
}

function normalizeOccurredAt(value: unknown) {
  const candidate = clean(value, 80);
  if (!candidate) return new Date().toISOString();
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const publicKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !serverKey) return response({ ok: false, message: 'Servidor indisponível.' }, 503);

  const body = await req.json().catch(() => ({}));
  const contact = body.contact && typeof body.contact === 'object' ? body.contact as Record<string, unknown> : {};
  const name = clean(contact.name, 180);
  const email = clean(contact.email, 320);
  const whatsapp = normalizeWhatsapp(contact.whatsapp);
  const origin = clean(body.origin || 'site', 120) || 'site';
  const action = clean(body.action, 120);
  const page = clean(body.page, 500);
  const occurredAt = normalizeOccurredAt(body.occurredAt);
  const interest = normalizeInterest(body.interest);
  const sanitizedMetadata = sanitizeValue(body.metadata) as Record<string, unknown> | undefined;
  const metadata: Record<string, unknown> = sanitizedMetadata ?? {};

  if (!name || !whatsapp) return response({ ok: false, message: 'Nome e WhatsApp são obrigatórios.' }, 400);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return response({ ok: false, message: 'E-mail inválido.' }, 400);

  const authorization = req.headers.get('Authorization');
  if (authorization && publicKey) {
    const caller = createClient(supabaseUrl, publicKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: identity } = await caller.auth.getUser();
    if (identity.user) {
      const { data: profile } = await caller
        .from('user_profiles')
        .select('account_type,is_active')
        .eq('id', identity.user.id)
        .maybeSingle();
      if (profile?.account_type === 'client' && profile?.is_active === true) metadata.clientId = identity.user.id;
    }
  }

  const admin = createClient(supabaseUrl, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.rpc('admin_ingest_public_lead', {
    p_name: name,
    p_email: email || null,
    p_whatsapp: whatsapp,
    p_origin: origin,
    p_action: action || null,
    p_page: page || null,
    p_interest: interest,
    p_occurred_at: occurredAt,
    p_metadata: metadata,
  });

  if (error || !data) {
    return response({ ok: false, message: error?.message || 'Não foi possível registrar o atendimento.' }, 500);
  }

  const workerCall = fetch(`${supabaseUrl}/functions/v1/automation-event-worker`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${serverKey}`, 'Content-Type': 'application/json' },
    body: '{}',
  }).catch((workerError) => console.error('automation-event-worker failed', workerError));

  const edgeRuntime = (globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } }).EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(workerCall);
  else await workerCall;

  return response({
    ok: true,
    leadId: String(data),
    created: true,
    automationQueued: true,
    automaticMessageSent: false,
  }, 201);
});
