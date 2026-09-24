import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function providerCandidates(apiKey: string): Array<'openai' | 'anthropic' | 'google_gemini'> {
  if (apiKey.startsWith('sk-ant-')) return ['anthropic'];
  if (apiKey.startsWith('AIza')) return ['google_gemini'];
  if (apiKey.startsWith('sk-')) return ['openai'];
  return ['openai', 'anthropic', 'google_gemini'];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function uniqueSorted(models: string[]) {
  return [...new Set(models.filter(Boolean))].sort((a, b) => a.localeCompare(b)).slice(0, 100);
}

async function inspectOpenAI(apiKey: string) {
  const result = await fetchWithTimeout('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!result.ok) return null;
  const body = await result.json().catch(() => ({})) as { data?: Array<{ id?: string }> };
  const models = uniqueSorted((body.data ?? [])
    .map((item) => String(item.id || ''))
    .filter((id) => /^(gpt-|o[0-9]|chatgpt-|codex)/i.test(id)));
  return { provider: 'openai' as const, providerLabel: 'OpenAI', models };
}

async function inspectAnthropic(apiKey: string) {
  const result = await fetchWithTimeout('https://api.anthropic.com/v1/models?limit=100', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!result.ok) return null;
  const body = await result.json().catch(() => ({})) as { data?: Array<{ id?: string }> };
  const models = uniqueSorted((body.data ?? [])
    .map((item) => String(item.id || ''))
    .filter((id) => id.toLowerCase().includes('claude')));
  return { provider: 'anthropic' as const, providerLabel: 'Anthropic / Claude', models };
}

async function inspectGemini(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const result = await fetchWithTimeout(url, {});
  if (!result.ok) return null;
  const body = await result.json().catch(() => ({})) as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
  };
  const models = uniqueSorted((body.models ?? [])
    .filter((item) => (item.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((item) => String(item.name || '').replace(/^models\//, ''))
    .filter((id) => id.toLowerCase().includes('gemini')));
  return { provider: 'google_gemini' as const, providerLabel: 'Google Gemini', models };
}

async function inspectApiKey(apiKey: string) {
  for (const provider of providerCandidates(apiKey)) {
    try {
      const result = provider === 'openai'
        ? await inspectOpenAI(apiKey)
        : provider === 'anthropic'
          ? await inspectAnthropic(apiKey)
          : await inspectGemini(apiKey);
      if (result && result.models.length > 0) return result;
    } catch {
      // Tenta o próximo provedor sem expor detalhes da chave ou da resposta externa.
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serverKey || !authorization) {
    return response({ status: 'rejected', reason: 'Configuração segura do servidor incompleta.' }, 500);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) {
    return response({ status: 'rejected', reason: 'Sessão inválida.' }, 401);
  }

  const [{ data: profile, error: profileError }, { data: permissionRows, error: permissionError }] = await Promise.all([
    caller.from('user_profiles').select('account_type,is_active').eq('id', identity.user.id).maybeSingle(),
    caller.from('current_user_permissions').select('permission_key').eq('permission_key', 'integrations.manage'),
  ]);

  if (profileError || permissionError) {
    return response({ status: 'rejected', reason: 'Não foi possível validar a autorização.' }, 403);
  }

  if (profile?.account_type !== 'internal' || profile?.is_active !== true || !(permissionRows ?? []).length) {
    return response({ status: 'rejected', reason: 'Sem permissão para gerenciar credenciais de IA.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const admin = createClient(supabaseUrl, serverKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'inspect') {
    const apiKey = String(body.apiKey || '').trim();
    if (!apiKey) return response({ status: 'rejected', reason: 'Chave API obrigatória.' }, 400);
    const inspection = await inspectApiKey(apiKey);
    if (!inspection) {
      return response({
        status: 'rejected',
        reason: 'A chave não foi validada como OpenAI, Anthropic/Claude ou Google Gemini, ou o provedor não retornou modelos disponíveis.',
      }, 400);
    }
    return response({ status: 'identified', ...inspection });
  }

  const profileId = String(body.profileId || '').trim();
  if (!profileId) return response({ status: 'rejected', reason: 'Perfil de IA obrigatório.' }, 400);

  if (action === 'save') {
    const apiKey = String(body.apiKey || '').trim();
    if (!apiKey) return response({ status: 'rejected', reason: 'Chave API obrigatória.' }, 400);

    const { data, error } = await admin.rpc('admin_store_ai_credential', {
      p_profile_id: profileId,
      p_api_key: apiKey,
    });
    if (error || !data) {
      return response({ status: 'rejected', reason: error?.message || 'Não foi possível armazenar a credencial.' }, 500);
    }

    return response({ status: 'stored', secretRef: String(data) });
  }

  if (action === 'remove') {
    const secretRef = body.secretRef ? String(body.secretRef) : null;
    const { error } = await admin.rpc('admin_delete_ai_credential', {
      p_profile_id: profileId,
      p_secret_ref: secretRef,
    });
    if (error) return response({ status: 'rejected', reason: error.message }, 500);
    return response({ status: 'stored', secretRef: '' });
  }

  return response({ status: 'rejected', reason: 'Ação inválida.' }, 400);
});
