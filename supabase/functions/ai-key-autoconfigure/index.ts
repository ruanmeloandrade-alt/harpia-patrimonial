import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Provider = 'openai' | 'anthropic' | 'google_gemini';

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

function preferredOpenAIModel(ids: string[]) {
  const usable = ids.filter((id) =>
    /^gpt-/i.test(id)
    && !/(image|audio|transcrib|realtime|search|embedding|tts)/i.test(id)
  );
  const score = (id: string) => {
    if (id === 'gpt-5.6-luna') return 1000;
    if (id === 'gpt-5.6-terra') return 990;
    if (id === 'gpt-5.6-sol') return 980;
    if (/^gpt-5\.6/i.test(id)) return 950;
    if (/^gpt-5/i.test(id)) return 900;
    if (/^gpt-4\.1-mini/i.test(id)) return 800;
    if (/^gpt-4\.1/i.test(id)) return 780;
    if (/^gpt-4o-mini/i.test(id)) return 700;
    return 100;
  };
  return usable.sort((a, b) => score(b) - score(a) || a.localeCompare(b))[0];
}

function preferredAnthropicModel(ids: string[]) {
  const usable = ids.filter((id) => /^claude-/i.test(id));
  const score = (id: string) => {
    if (/sonnet/i.test(id)) return 1000;
    if (/haiku/i.test(id)) return 900;
    if (/opus/i.test(id)) return 800;
    return 100;
  };
  return usable.sort((a, b) => score(b) - score(a) || b.localeCompare(a))[0];
}

function preferredGeminiModel(models: Array<Record<string, unknown>>) {
  const usable = models
    .filter((item) => {
      const methods = Array.isArray(item.supportedGenerationMethods)
        ? item.supportedGenerationMethods.map(String)
        : [];
      return methods.includes('generateContent');
    })
    .map((item) => String(item.baseModelId || item.name || '').replace(/^models\//, ''))
    .filter((id) => /^gemini-/i.test(id) && !/(embedding|live|tts|image|robotics|computer-use)/i.test(id));

  const score = (id: string) => {
    if (/flash/i.test(id) && !/lite/i.test(id)) return 1000;
    if (/pro/i.test(id)) return 900;
    if (/flash-lite/i.test(id)) return 800;
    return 100;
  };
  return usable.sort((a, b) => score(b) - score(a) || b.localeCompare(a))[0];
}

async function probeOpenAI(apiKey: string) {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
  const model = preferredOpenAIModel((raw?.data ?? []).map((item) => String(item.id || '')).filter(Boolean));
  return model ? { provider: 'openai' as const, model } : null;
}

async function probeAnthropic(apiKey: string) {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null) as { data?: Array<{ id?: string }> } | null;
  const model = preferredAnthropicModel((raw?.data ?? []).map((item) => String(item.id || '')).filter(Boolean));
  return model ? { provider: 'anthropic' as const, model } : null;
}

async function probeGemini(apiKey: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    { signal: AbortSignal.timeout(12000) },
  );
  if (!res.ok) return null;
  const raw = await res.json().catch(() => null) as { models?: Array<Record<string, unknown>> } | null;
  const model = preferredGeminiModel(raw?.models ?? []);
  return model ? { provider: 'google_gemini' as const, model } : null;
}

async function detectProvider(apiKey: string): Promise<{ provider: Provider; model: string }> {
  const normalized = apiKey.trim();
  const ordered = normalized.startsWith('sk-ant-')
    ? [probeAnthropic, probeOpenAI, probeGemini]
    : normalized.startsWith('AIza')
      ? [probeGemini, probeOpenAI, probeAnthropic]
      : [probeOpenAI, probeAnthropic, probeGemini];

  for (const probe of ordered) {
    try {
      const result = await probe(normalized);
      if (result) return result;
    } catch {
      // Tenta o próximo provedor sem expor a chave.
    }
  }

  throw new Error('A chave não foi reconhecida como OpenAI, Claude/Anthropic ou Gemini, ou não possui acesso a modelos de texto.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ ok: false, message: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serverKey || !authorization) {
    return response({ ok: false, message: 'Configuração segura do servidor incompleta.' }, 500);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return response({ ok: false, message: 'Sessão inválida.' }, 401);

  const [{ data: profile }, { data: permissionRows }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').eq('permission_key', 'integrations.manage'),
  ]);

  if (profile?.account_type !== 'internal' || profile?.is_active !== true || !(permissionRows ?? []).length) {
    return response({ ok: false, message: 'Sem permissão para configurar IA.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const apiKey = String(body.apiKey || '').trim();
  if (!apiKey || apiKey.length < 10 || apiKey.length > 500) {
    return response({ ok: false, message: 'Informe uma chave de API válida.' }, 400);
  }

  let detected: { provider: Provider; model: string };
  try {
    detected = await detectProvider(apiKey);
  } catch (error) {
    return response({ ok: false, message: error instanceof Error ? error.message : 'Chave de IA inválida.' }, 400);
  }

  const admin = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const profileId = 'ai-provider-default';
  const { data: secretRef, error: secretError } = await admin.rpc('admin_store_ai_credential', {
    p_profile_id: profileId,
    p_api_key: apiKey,
  });

  if (secretError || !secretRef) {
    return response({ ok: false, message: secretError?.message || 'Não foi possível armazenar a credencial com segurança.' }, 500);
  }

  const now = new Date().toISOString();
  const providerLabel = detected.provider === 'openai'
    ? 'OpenAI'
    : detected.provider === 'anthropic'
      ? 'Claude / Anthropic'
      : 'Google Gemini';

  const providerProfile = {
    id: profileId,
    name: 'IA principal',
    provider: detected.provider,
    model: detected.model,
    baseUrl: '',
    status: 'ready',
    apiKeyConfigured: true,
    secretRef: String(secretRef),
    notes: `Detectado automaticamente: ${providerLabel}`,
    createdAt: now,
    updatedAt: now,
  };

  const storageKey = 'harpia:f05:ai-provider-profiles';
  const { data: storageRow } = await admin
    .from('f05_shared_storage')
    .select('revision')
    .eq('storage_key', storageKey)
    .maybeSingle();

  const nextRevision = Number(storageRow?.revision ?? 0) + 1;
  const { error: storageError } = await admin
    .from('f05_shared_storage')
    .upsert({
      storage_key: storageKey,
      value: [providerProfile],
      revision: nextRevision,
      updated_at: now,
      updated_by: identity.user.id,
    }, { onConflict: 'storage_key' });

  if (storageError) {
    return response({ ok: false, message: 'A chave foi protegida, mas o perfil de IA não pôde ser sincronizado.' }, 500);
  }

  return response({
    ok: true,
    provider: detected.provider,
    providerLabel,
    model: detected.model,
    profileId,
  });
});
