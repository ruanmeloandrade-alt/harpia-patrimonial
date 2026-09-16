import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXECUTION_PERMISSIONS = ['ai.manage', 'inbox.manage', 'automations.manage', 'salesbot.manage'];

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

function normalizeBase(value: string) {
  return value.trim().replace(/\/$/, '');
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

function assertSafeExternalUrl(value: string) {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') throw new Error('Endpoint IA precisa usar HTTPS.');
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname === '::1'
    || hostname.startsWith('fc')
    || hostname.startsWith('fd')
    || hostname.startsWith('fe80:')
    || isPrivateIpv4(hostname)
  ) {
    throw new Error('Endpoint IA privado/interno não é permitido.');
  }
  return url.toString();
}

type ProviderKind = 'openai' | 'openai_codex' | 'anthropic' | 'google_gemini' | 'custom';

type ProviderProfile = {
  id: string;
  name: string;
  provider: ProviderKind;
  model: string;
  baseUrl: string;
  status: string;
  apiKeyConfigured: boolean;
  secretRef?: string;
};

function providerRequest(profile: ProviderProfile, apiKey: string, instructions: string, input: string) {
  if (profile.provider === 'openai' || profile.provider === 'openai_codex') {
    const base = normalizeBase(profile.baseUrl || 'https://api.openai.com');
    const endpoint = base.endsWith('/responses') ? base : base.endsWith('/v1') ? `${base}/responses` : `${base}/v1/responses`;
    return {
      url: assertSafeExternalUrl(endpoint),
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: profile.model, instructions: instructions || undefined, input }),
      },
    };
  }

  if (profile.provider === 'anthropic') {
    const base = normalizeBase(profile.baseUrl || 'https://api.anthropic.com');
    const endpoint = base.endsWith('/v1/messages') ? base : base.endsWith('/v1') ? `${base}/messages` : `${base}/v1/messages`;
    return {
      url: assertSafeExternalUrl(endpoint),
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
    const base = normalizeBase(profile.baseUrl || 'https://generativelanguage.googleapis.com');
    const endpoint = base.endsWith('/interactions') ? base : base.endsWith('/v1beta') ? `${base}/interactions` : `${base}/v1beta/interactions`;
    const composedInput = instructions.trim() ? `${instructions.trim()}\n\n${input}` : input;
    return {
      url: assertSafeExternalUrl(endpoint),
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ model: profile.model, input: composedInput }),
      },
    };
  }

  if (profile.provider === 'custom') {
    if (!profile.baseUrl.trim()) throw new Error('Endpoint do provedor customizado não configurado.');
    return {
      url: assertSafeExternalUrl(profile.baseUrl.trim()),
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: profile.model, instructions, input }),
      },
    };
  }

  throw new Error('Provedor IA não suportado.');
}

function extractText(provider: ProviderKind, raw: any): string {
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
    if (Array.isArray(raw?.outputs)) {
      return raw.outputs.map((item: any) => item?.text ?? item?.content?.text).filter((value: unknown) => typeof value === 'string').join('\n');
    }
    if (Array.isArray(raw?.steps)) {
      return raw.steps.flatMap((step: any) => step?.content ?? []).map((item: any) => item?.text).filter((value: unknown) => typeof value === 'string').join('\n');
    }
    return '';
  }
  const custom = raw?.output_text ?? raw?.text ?? raw?.output ?? raw?.message?.content ?? '';
  return typeof custom === 'string' ? custom : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ status: 'failed', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  // O RPC do Vault valida o claim service_role. Preferimos a chave JWT legada enquanto esse contrato existir.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization) {
    return response({ status: 'failed', reason: 'Configuração segura do servidor incompleta.' }, 500);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return response({ status: 'failed', reason: 'Sessão inválida.' }, 401);

  const [{ data: userProfile, error: userProfileError }, { data: permissions, error: permissionError }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').in('permission_key', EXECUTION_PERMISSIONS),
  ]);
  if (userProfileError || permissionError) return response({ status: 'failed', reason: 'Não foi possível validar autorização.' }, 403);
  if (userProfile?.account_type !== 'internal' || userProfile?.is_active !== true || !(permissions ?? []).length) {
    return response({ status: 'failed', reason: 'Sem permissão para executar agente IA.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const profileId = String(body.profileId || '').trim();
  const instructions = String(body.instructions || '');
  const explicitInput = String(body.input || '');
  const context = body.context && typeof body.context === 'object' ? body.context : {};
  const input = explicitInput.trim() || JSON.stringify(context);

  if (!profileId) return response({ status: 'failed', reason: 'Perfil IA obrigatório.' }, 400);
  if (!input.trim()) return response({ status: 'failed', reason: 'Entrada do agente IA obrigatória.' }, 400);
  if (instructions.length > 50000 || input.length > 100000) {
    return response({ status: 'failed', reason: 'Entrada excede o limite seguro de execução.' }, 413);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: storageRow, error: storageError } = await admin
    .from('f05_shared_storage')
    .select('value')
    .eq('storage_key', 'harpia:f05:ai-provider-profiles')
    .single();
  if (storageError) return response({ status: 'failed', reason: 'Não foi possível carregar o perfil IA.' }, 500);

  const profiles = Array.isArray(storageRow?.value) ? storageRow.value as ProviderProfile[] : [];
  const profile = profiles.find((item) => item?.id === profileId);
  if (!profile) return response({ status: 'not_configured', reason: 'Perfil IA não encontrado no estado compartilhado.' }, 404);
  if (profile.status !== 'ready' || !profile.apiKeyConfigured || !profile.secretRef || !profile.model?.trim()) {
    return response({ status: 'not_configured', reason: 'Perfil IA ainda não está pronto para execução.' }, 409);
  }

  const { data: apiKey, error: secretError } = await admin.rpc('admin_resolve_ai_credential', {
    p_profile_id: profile.id,
    p_secret_ref: profile.secretRef,
  });
  if (secretError || !apiKey) {
    return response({ status: 'not_configured', reason: 'Credencial segura não foi encontrada para este perfil.' }, 409);
  }

  try {
    const request = providerRequest(profile, String(apiKey), instructions, input);
    const providerResponse = await fetch(request.url, request.init);
    const raw = await providerResponse.json().catch(() => null);
    if (!providerResponse.ok) {
      const detail = typeof raw?.error?.message === 'string' ? raw.error.message : `HTTP ${providerResponse.status}`;
      return response({ status: 'failed', reason: `Falha no provedor IA: ${detail}` }, 502);
    }
    const output = extractText(profile.provider, raw).trim();
    if (!output) return response({ status: 'failed', reason: 'O provedor respondeu sem texto utilizável.' }, 502);
    return response({
      status: 'completed',
      output,
      metadata: { provider: profile.provider, model: profile.model },
    });
  } catch (error) {
    return response({
      status: 'failed',
      reason: error instanceof Error ? error.message : 'Falha inesperada ao executar provedor IA.',
    }, 500);
  }
});
