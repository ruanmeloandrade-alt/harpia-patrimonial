import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const STORAGE_KEY = 'harpia:f05:ai-provider-profiles';
const EXECUTION_PERMISSIONS = [
  'ai.manage',
  'salesbot.manage',
  'automations.manage',
  'inbox.manage',
  'crm.manage',
];

type ProviderKind = 'openai' | 'openai_codex' | 'anthropic' | 'google_gemini' | 'custom';

type ProviderProfile = {
  id: string;
  provider: ProviderKind;
  model: string;
  baseUrl: string;
  status: 'draft' | 'ready' | 'disabled';
  apiKeyConfigured: boolean;
  secretRef?: string;
};

function json(body: Record<string, unknown>, status = 200) {
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

function normalizeBase(value: string) {
  return value.trim().replace(/\/$/, '');
}

function isPrivateIpv4(host: string) {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 10 || parts[0] === 127 || parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function assertSafeOutboundUrl(raw: string) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new Error('Endpoint de IA precisa usar HTTPS.');
  if (host === 'localhost' || host === '::1' || host.endsWith('.local') || isPrivateIpv4(host)) {
    throw new Error('Endpoint privado/local não é permitido no runtime de IA.');
  }
  return url.toString();
}

function providerUrl(profile: ProviderProfile) {
  const configured = normalizeBase(profile.baseUrl || '');
  if (profile.provider === 'openai' || profile.provider === 'openai_codex') {
    const base = configured || 'https://api.openai.com/v1';
    return assertSafeOutboundUrl(base.endsWith('/responses') ? base : `${base}/responses`);
  }
  if (profile.provider === 'anthropic') {
    const base = configured || 'https://api.anthropic.com';
    return assertSafeOutboundUrl(base.endsWith('/v1/messages') ? base : `${base}/v1/messages`);
  }
  if (profile.provider === 'google_gemini') {
    const base = configured || 'https://generativelanguage.googleapis.com';
    return assertSafeOutboundUrl(base.endsWith('/v1beta/interactions') ? base : `${base}/v1beta/interactions`);
  }
  if (!configured) throw new Error('Endpoint do provedor customizado não configurado.');
  return assertSafeOutboundUrl(configured);
}

function buildProviderRequest(profile: ProviderProfile, apiKey: string, instructions: string, input: string) {
  const url = providerUrl(profile);
  if (profile.provider === 'openai' || profile.provider === 'openai_codex') {
    return {
      url,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: profile.model, instructions: instructions || undefined, input }),
      },
    };
  }
  if (profile.provider === 'anthropic') {
    return {
      url,
      init: {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: profile.model,
          max_tokens: 2048,
          system: instructions || undefined,
          messages: [{ role: 'user', content: input }],
        }),
      },
    };
  }
  if (profile.provider === 'google_gemini') {
    return {
      url,
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          model: profile.model,
          input: instructions.trim() ? `${instructions.trim()}\n\n${input}` : input,
        }),
      },
    };
  }
  return {
    url,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: profile.model, instructions, input }),
    },
  };
}

function extractOutput(provider: ProviderKind, raw: any): string {
  if (provider === 'openai' || provider === 'openai_codex') {
    if (typeof raw?.output_text === 'string') return raw.output_text;
    const parts = Array.isArray(raw?.output) ? raw.output.flatMap((item: any) => item?.content ?? []) : [];
    return parts.map((part: any) => part?.text).filter((value: unknown) => typeof value === 'string').join('\n');
  }
  if (provider === 'anthropic') {
    return Array.isArray(raw?.content)
      ? raw.content.map((item: any) => item?.text).filter((value: unknown) => typeof value === 'string').join('\n')
      : '';
  }
  if (provider === 'google_gemini') {
    if (typeof raw?.output_text === 'string') return raw.output_text;
    if (Array.isArray(raw?.steps)) {
      return raw.steps
        .flatMap((step: any) => step?.content ?? [])
        .map((item: any) => item?.text)
        .filter((value: unknown) => typeof value === 'string')
        .join('\n');
    }
    return '';
  }
  const custom = raw?.output_text ?? raw?.text ?? raw?.output ?? raw?.message?.content;
  return typeof custom === 'string' ? custom : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ status: 'failed', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serverKey = namedKey('SUPABASE_SECRET_KEYS') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !publishableKey || !serverKey || !authorization) {
    return json({ status: 'not_configured', reason: 'Runtime seguro do servidor está incompleto.' }, 500);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return json({ status: 'failed', reason: 'Sessão inválida.' }, 401);

  const [{ data: profile, error: profileError }, { data: permissionRows, error: permissionError }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').in('permission_key', EXECUTION_PERMISSIONS),
  ]);
  if (profileError || permissionError) return json({ status: 'failed', reason: 'Não foi possível validar autorização.' }, 403);
  if (profile?.account_type !== 'internal' || profile?.is_active !== true || !(permissionRows ?? []).length) {
    return json({ status: 'failed', reason: 'Sem permissão operacional para executar agente IA.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const providerProfileId = String(body.profileId || '').trim();
  const instructions = String(body.instructions || '');
  const input = String(body.input || '');
  if (!providerProfileId) return json({ status: 'failed', reason: 'Perfil de provedor obrigatório.' }, 400);
  if (instructions.length > 100_000 || input.length > 200_000) {
    return json({ status: 'failed', reason: 'Entrada excede o limite do runtime.' }, 413);
  }

  const admin = createClient(supabaseUrl, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: storageRow, error: storageError } = await admin
    .from('f05_shared_storage')
    .select('value')
    .eq('storage_key', STORAGE_KEY)
    .maybeSingle();
  if (storageError) return json({ status: 'failed', reason: 'Não foi possível carregar perfis de IA.' }, 500);

  const profiles = Array.isArray(storageRow?.value) ? storageRow.value as ProviderProfile[] : [];
  const providerProfile = profiles.find((item) => item.id === providerProfileId);
  if (!providerProfile) return json({ status: 'not_configured', reason: 'Perfil de provedor IA não encontrado.' }, 404);
  if (providerProfile.status !== 'ready' || !providerProfile.apiKeyConfigured || !providerProfile.secretRef || !providerProfile.model?.trim()) {
    return json({ status: 'not_configured', reason: 'Perfil de provedor/modelo ainda não está pronto.' }, 409);
  }

  const { data: apiKey, error: credentialError } = await admin.rpc('admin_resolve_ai_credential', {
    p_profile_id: providerProfile.id,
    p_secret_ref: providerProfile.secretRef,
  });
  if (credentialError || !apiKey) {
    return json({ status: 'not_configured', reason: 'Credencial segura do provedor não pôde ser resolvida.' }, 409);
  }

  try {
    const request = buildProviderRequest(providerProfile, String(apiKey), instructions, input);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    const response = await fetch(request.url, { ...request.init, signal: controller.signal });
    clearTimeout(timer);
    const raw = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = typeof raw?.error?.message === 'string' ? raw.error.message : `HTTP ${response.status}`;
      return json({ status: 'failed', reason: `Falha no provedor IA: ${detail}` }, 502);
    }
    const output = extractOutput(providerProfile.provider, raw).trim();
    if (!output) return json({ status: 'failed', reason: 'O provedor respondeu sem texto utilizável.' }, 502);
    return json({
      status: 'completed',
      output,
      metadata: { provider: providerProfile.provider, model: providerProfile.model },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Falha inesperada no runtime de IA.';
    return json({ status: 'failed', reason }, 500);
  }
});
