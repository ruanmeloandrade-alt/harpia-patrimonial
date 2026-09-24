import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import pdf from 'npm:pdf-parse@1.1.1';

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function out(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: jsonHeaders });
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

function base64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function extractOpenAI(raw: any) {
  if (typeof raw?.output_text === 'string') return raw.output_text;
  const parts = Array.isArray(raw?.output) ? raw.output.flatMap((item: any) => item?.content ?? []) : [];
  return parts.map((part: any) => part?.text).filter((v: unknown) => typeof v === 'string').join('\n');
}

async function imageToContext(input: {
  provider: string;
  model: string;
  apiKey: string;
  mimeType: string;
  bytes: Uint8Array;
}) {
  const encoded = base64(input.bytes);
  const prompt = 'Analise esta imagem como material de contexto de uma empresa. Extraia textos visíveis, produtos, serviços, regras, informações comerciais e fatos úteis. Responda somente com uma descrição objetiva em português para ser armazenada na base de conhecimento.';

  if (input.provider === 'openai' || input.provider === 'openai_codex') {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify({
        model: input.model,
        input: [{
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            { type: 'input_image', image_url: `data:${input.mimeType};base64,${encoded}` },
          ],
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) throw new Error(raw?.error?.message || `OpenAI HTTP ${response.status}`);
    return extractOpenAI(raw).trim();
  }

  if (input.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: 1600,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: input.mimeType, data: encoded } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    const raw = await response.json().catch(() => null);
    if (!response.ok) throw new Error(raw?.error?.message || `Anthropic HTTP ${response.status}`);
    return Array.isArray(raw?.content) ? raw.content.map((x: any) => x?.text).filter(Boolean).join('\n').trim() : '';
  }

  if (input.provider === 'google_gemini') {
    const model = input.model.replace(/^models\//, '');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: input.mimeType, data: encoded } },
            ],
          }],
        }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const raw = await response.json().catch(() => null);
    if (!response.ok) throw new Error(raw?.error?.message || `Gemini HTTP ${response.status}`);
    return (raw?.candidates ?? [])
      .flatMap((c: any) => c?.content?.parts ?? [])
      .map((p: any) => p?.text)
      .filter((v: unknown) => typeof v === 'string')
      .join('\n')
      .trim();
  }

  throw new Error('O provedor atual não oferece processamento visual nesta integração.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: jsonHeaders });
  if (req.method !== 'POST') return out(405, { ok: false, message: 'Método não permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');
  if (!supabaseUrl || !publishableKey || !serviceKey || !authorization) {
    return out(500, { ok: false, message: 'Configuração segura incompleta.' });
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: identity, error: identityError } = await caller.auth.getUser();
  if (identityError || !identity.user) return out(401, { ok: false, message: 'Sessão inválida.' });

  const { data: permissions } = await caller
    .from('current_user_permissions')
    .select('permission_key')
    .eq('permission_key', 'ai.manage');
  if (!(permissions ?? []).length) return out(403, { ok: false, message: 'Sem permissão para alterar o cérebro da IA.' });

  const body = await req.json().catch(() => ({}));
  const sourceId = String(body.sourceId || '').trim();
  if (!sourceId) return out(400, { ok: false, message: 'sourceId obrigatório.' });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: source, error: sourceError } = await admin
    .from('ai_brain_sources')
    .select('*')
    .eq('id', sourceId)
    .single();

  if (sourceError || !source) return out(404, { ok: false, message: 'Fonte não encontrada.' });
  if (!source.storage_bucket || !source.storage_path) return out(400, { ok: false, message: 'Fonte sem arquivo.' });

  try {
    const { data: blob, error: downloadError } = await admin.storage
      .from(source.storage_bucket)
      .download(source.storage_path);
    if (downloadError || !blob) throw new Error(downloadError?.message || 'Não foi possível abrir o arquivo.');

    const bytes = new Uint8Array(await blob.arrayBuffer());
    let textContent = '';

    if (source.source_type === 'pdf') {
      const parsed = await pdf(Buffer.from(bytes));
      textContent = String(parsed?.text || '').replace(/\u0000/g, '').trim();
      if (!textContent) throw new Error('O PDF não possui texto extraível.');
    } else if (source.source_type === 'image') {
      const { data: storageRow, error: profileLoadError } = await admin
        .from('f05_shared_storage')
        .select('value')
        .eq('storage_key', 'harpia:f05:ai-provider-profiles')
        .single();
      if (profileLoadError) throw profileLoadError;

      const profiles = Array.isArray(storageRow?.value) ? storageRow.value : [];
      const profile: any = profiles.find((item: any) => item?.status === 'ready' && item?.apiKeyConfigured && item?.secretRef);
      if (!profile) throw new Error('Configure primeiro uma chave de IA em Integrações para processar imagens.');

      const { data: apiKey, error: secretError } = await admin.rpc('admin_resolve_ai_credential', {
        p_profile_id: profile.id,
        p_secret_ref: profile.secretRef,
      });
      if (secretError || !apiKey) throw new Error('Credencial da IA não disponível.');

      textContent = await imageToContext({
        provider: String(profile.provider),
        model: String(profile.model),
        apiKey: String(apiKey),
        mimeType: String(source.mime_type || 'image/jpeg'),
        bytes,
      });
      if (!textContent) throw new Error('A IA não conseguiu extrair contexto da imagem.');
    } else {
      textContent = new TextDecoder().decode(bytes).trim();
    }

    const { error: updateError } = await admin
      .from('ai_brain_sources')
      .update({
        text_content: textContent.slice(0, 120000),
        status: 'ready',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId);
    if (updateError) throw updateError;

    return out(200, { ok: true, sourceId, characters: textContent.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao processar arquivo.';
    await admin.from('ai_brain_sources').update({
      status: 'error',
      error_message: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq('id', sourceId);
    return out(422, { ok: false, message });
  }
});
