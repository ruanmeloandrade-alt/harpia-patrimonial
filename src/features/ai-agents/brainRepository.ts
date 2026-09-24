import { requireSupabase } from '../../core/supabase/client';

export type AIBrainSourceType = 'text' | 'pdf' | 'image';
export type AIBrainSourceStatus = 'processing' | 'ready' | 'error';

export interface AIBrainSource {
  id: string;
  source_type: AIBrainSourceType;
  title: string;
  text_content: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: AIBrainSourceStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIBrainSnapshot {
  companyContext: string;
  sources: AIBrainSource[];
}

export type UploadStage = 'uploading' | 'registering' | 'processing' | 'ready';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const normalizeMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'application/pdf';
  if (extension === 'txt') return 'text/plain';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return '';
};

const getUserId = async () => {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Sua sessão expirou. Entre novamente para alterar o Cérebro.');
  return data.user.id;
};

const asUntyped = () => requireSupabase() as any;

export async function loadAIBrain(): Promise<AIBrainSnapshot> {
  const client = asUntyped();
  const [configResult, sourcesResult] = await Promise.all([
    client.from('ai_brain_config').select('company_context').eq('id', true).single(),
    client.from('ai_brain_sources').select('*').order('created_at', { ascending: false }),
  ]);

  if (configResult.error) throw configResult.error;
  if (sourcesResult.error) throw sourcesResult.error;

  return {
    companyContext: String(configResult.data?.company_context ?? ''),
    sources: (sourcesResult.data ?? []) as AIBrainSource[],
  };
}

export async function saveAIBrainContext(companyContext: string): Promise<void> {
  const client = asUntyped();
  const userId = await getUserId();
  const { error } = await client
    .from('ai_brain_config')
    .update({
      company_context: companyContext.slice(0, 120000),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', true);

  if (error) throw error;
}

export async function addAIBrainTextSource(title: string, text: string): Promise<AIBrainSource> {
  const cleanTitle = title.trim().slice(0, 200);
  const cleanText = text.trim().slice(0, 120000);
  if (!cleanTitle || !cleanText) throw new Error('Informe um título e o conteúdo da fonte.');

  const client = asUntyped();
  const userId = await getUserId();
  const { data, error } = await client
    .from('ai_brain_sources')
    .insert({
      source_type: 'text',
      title: cleanTitle,
      text_content: cleanText,
      status: 'ready',
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as AIBrainSource;
}

export async function uploadAIBrainFile(file: File, onStage?: (stage: UploadStage) => void): Promise<AIBrainSource> {
  if (file.size <= 0) throw new Error('O arquivo está vazio.');
  if (file.size > MAX_FILE_BYTES) throw new Error('O arquivo deve ter no máximo 10 MB.');

  const mimeType = normalizeMimeType(file);
  if (!ACCEPTED_MIME_TYPES.has(mimeType)) {
    throw new Error('Use um arquivo PDF, TXT, JPG, PNG ou WEBP.');
  }

  if (mimeType === 'text/plain') {
    onStage?.('processing');
    const text = (await file.text()).trim();
    if (!text) throw new Error('O arquivo TXT está vazio.');
    const source = await addAIBrainTextSource(file.name, text);
    onStage?.('ready');
    return source;
  }

  const client = asUntyped();
  const userId = await getUserId();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120) || 'arquivo';
  const storagePath = `${userId}/${crypto.randomUUID()}-${safeName}`;
  const sourceType: AIBrainSourceType = mimeType === 'application/pdf' ? 'pdf' : 'image';

  onStage?.('uploading');
  const { error: uploadError } = await client.storage
    .from('ai-brain')
    .upload(storagePath, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  onStage?.('registering');
  const { data: created, error: createError } = await client
    .from('ai_brain_sources')
    .insert({
      source_type: sourceType,
      title: file.name.slice(0, 200),
      storage_bucket: 'ai-brain',
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: file.size,
      status: 'processing',
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (createError || !created) {
    await client.storage.from('ai-brain').remove([storagePath]);
    throw createError ?? new Error('Não foi possível registrar a fonte.');
  }

  onStage?.('processing');
  const { data: processed, error: processError } = await client.functions.invoke('ai-brain-process-source', {
    body: { sourceId: created.id },
  });

  if (processError) {
    await client
      .from('ai_brain_sources')
      .update({
        status: 'error',
        error_message: processError.message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', created.id);
    throw processError;
  }

  if (processed?.ok === false) {
    throw new Error(String(processed.message || 'Não foi possível processar o arquivo.'));
  }

  const { data: ready, error: reloadError } = await client
    .from('ai_brain_sources')
    .select('*')
    .eq('id', created.id)
    .single();

  if (reloadError) throw reloadError;
  onStage?.('ready');
  return ready as AIBrainSource;
}

export async function deleteAIBrainSource(source: AIBrainSource): Promise<void> {
  const client = asUntyped();

  if (source.storage_bucket && source.storage_path) {
    const { error: storageError } = await client.storage
      .from(source.storage_bucket)
      .remove([source.storage_path]);
    if (storageError) throw storageError;
  }

  const { error } = await client.from('ai_brain_sources').delete().eq('id', source.id);
  if (error) throw error;
}
