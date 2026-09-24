import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

function namedKey(name: string): string | undefined {
  const raw = Deno.env.get(name);
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed.default || Object.values(parsed)[0];
  } catch {
    return undefined;
  }
}

type ProviderProfile = {
  id: string;
  provider: string;
  status: string;
  apiKeyConfigured?: boolean;
  secretRef?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return response({ status: 'rejected', reason: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = namedKey('SUPABASE_PUBLISHABLE_KEYS') || Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || namedKey('SUPABASE_SECRET_KEYS');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !publishableKey || !serviceKey || !authorization) {
    return response({ status: 'rejected', reason: 'Configuração interna incompleta.' }, 503);
  }

  const caller = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [{ data: identity, error: identityError }, { data: permissions, error: permissionError }] = await Promise.all([
    caller.auth.getUser(),
    caller
      .from('current_user_permissions')
      .select('permission_key')
      .in('permission_key', ['inbox.view', 'inbox.manage', 'ai.manage']),
  ]);

  if (identityError || !identity.user) return response({ status: 'rejected', reason: 'Sessão inválida.' }, 401);
  if (permissionError || !(permissions ?? []).length) {
    return response({ status: 'rejected', reason: 'Sem permissão para transcrever áudio do Inbox.' }, 403);
  }

  const { data: profile } = await caller
    .from('user_profiles')
    .select('account_type,is_active')
    .eq('id', identity.user.id)
    .maybeSingle();

  if (profile?.account_type !== 'internal' || profile?.is_active !== true) {
    return response({ status: 'rejected', reason: 'Conta interna ativa obrigatória.' }, 403);
  }

  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId || '').trim();
  if (!messageId) return response({ status: 'rejected', reason: 'Mensagem obrigatória.' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: message, error: messageError } = await admin
    .from('inbox_messages')
    .select('id,type,form_payload')
    .eq('id', messageId)
    .maybeSingle();

  if (messageError || !message) return response({ status: 'rejected', reason: 'Mensagem não encontrada.' }, 404);
  if (message.type !== 'audio') return response({ status: 'rejected', reason: 'A mensagem selecionada não é um áudio.' }, 400);

  const { data: attachment, error: attachmentError } = await admin
    .from('inbox_message_attachments')
    .select('name,mime_type,storage_bucket,storage_path')
    .eq('message_id', messageId)
    .maybeSingle();

  if (attachmentError || !attachment?.storage_path) {
    return response({ status: 'rejected', reason: 'Arquivo do áudio não encontrado.' }, 404);
  }

  const bucket = attachment.storage_bucket || 'inbox-media';
  const { data: audioBlob, error: downloadError } = await admin.storage.from(bucket).download(attachment.storage_path);
  if (downloadError || !audioBlob) {
    return response({ status: 'rejected', reason: 'Não foi possível carregar o áudio.' }, 502);
  }

  const { data: storageRow, error: storageError } = await admin
    .from('f05_shared_storage')
    .select('value')
    .eq('storage_key', 'harpia:f05:ai-provider-profiles')
    .maybeSingle();

  if (storageError) return response({ status: 'rejected', reason: 'Não foi possível consultar o provedor de IA.' }, 500);
  const profiles = Array.isArray(storageRow?.value) ? storageRow.value as ProviderProfile[] : [];
  const openai = profiles.find((item) =>
    ['openai', 'openai_codex'].includes(item.provider)
    && item.status === 'ready'
    && item.apiKeyConfigured
    && item.secretRef
  );

  if (!openai) {
    return response({
      status: 'not_configured',
      reason: 'Configure um perfil OpenAI ativo em Configurações > IA para transcrever áudios.',
    }, 409);
  }

  const { data: apiKey, error: secretError } = await admin.rpc('admin_resolve_ai_credential', {
    p_profile_id: openai.id,
    p_secret_ref: openai.secretRef,
  });

  if (secretError || !apiKey) {
    return response({ status: 'not_configured', reason: 'Credencial OpenAI não disponível.' }, 409);
  }

  const form = new FormData();
  const filename = attachment.name || 'audio.webm';
  const mime = attachment.mime_type || audioBlob.type || 'audio/webm';
  form.append('file', new File([audioBlob], filename, { type: mime }));
  form.append('model', 'gpt-4o-mini-transcribe');
  form.append('language', 'pt');

  const providerResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${String(apiKey)}` },
    body: form,
    redirect: 'manual',
    signal: AbortSignal.timeout(60000),
  });

  if (providerResponse.status >= 300 && providerResponse.status < 400) {
    return response({ status: 'rejected', reason: 'Redirecionamento do provedor não permitido.' }, 502);
  }

  const raw = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    return response({
      status: 'rejected',
      reason: typeof raw?.error?.message === 'string' ? raw.error.message : `Falha na transcrição HTTP ${providerResponse.status}.`,
    }, 502);
  }

  const transcription = String(raw?.text || '').trim();
  if (!transcription) return response({ status: 'rejected', reason: 'A transcrição retornou vazia.' }, 502);

  const formPayload = message.form_payload && typeof message.form_payload === 'object'
    ? message.form_payload as Record<string, unknown>
    : {};

  const { error: updateError } = await admin
    .from('inbox_messages')
    .update({
      form_payload: { ...formPayload, transcription },
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (updateError) return response({ status: 'rejected', reason: 'Transcrição pronta, mas não foi possível salvar no Inbox.' }, 500);

  return response({ status: 'completed', transcription });
});
