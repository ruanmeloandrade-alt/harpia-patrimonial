import { requireSupabase } from '../../core/supabase/client';

export type AIBrainSourceType = 'text' | 'pdf' | 'image';
export type AIBrainSourceStatus = 'processing' | 'ready' | 'error';

export interface AIBrainSource {
  id: string;
  sourceType: AIBrainSourceType;
  title: string;
  textContent?: string;
  storageBucket?: string;
  storagePath?: string;
  mimeType?: string;
  sizeBytes?: number;
  status: AIBrainSourceStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const mapSource = (row: any): AIBrainSource => ({
  id: String(row.id),
  sourceType: row.source_type as AIBrainSourceType,
  title: String(row.title || ''),
  textContent: row.text_content ? String(row.text_content) : undefined,
  storageBucket: row.storage_bucket ? String(row.storage_bucket) : undefined,
  storagePath: row.storage_path ? String(row.storage_path) : undefined,
  mimeType: row.mime_type ? String(row.mime_type) : undefined,
  sizeBytes: row.size_bytes == null ? undefined : Number(row.size_bytes),
  status: row.status as AIBrainSourceStatus,
  errorMessage: row.error_message ? String(row.error_message) : undefined,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

export async function loadAIBrain() {
  const supabase = requireSupabase();
  const [{ data: config, error: configError }, { data: sources, error: sourcesError }] = await Promise.all([
    supabase.from('ai_brain_config').select('company_context,updated_at').eq('id', true).single(),
    supabase.from('ai_brain_sources').select('*').order('created_at', { ascending: false }),
  ]);

  if (configError) throw configError;
  if (sourcesError) throw sourcesError;

  return {
    companyContext: String(config?.company_context || ''),
    updatedAt: String(config?.updated_at || ''),
    sources: (sources ?? []).map(mapSource),
  };
}

export async function saveCompanyContext(companyContext: string) {
  const supabase = requireSupabase();
  const { data: identity } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('ai_brain_config')
    .update({
      company_context: companyContext.trim(),
      updated_at: new Date().toISOString(),
      updated_by: identity.user?.id ?? null,
    })
    .eq('id', true);
  if (error) throw error;
}

export async function addBrainTextSource(input: { title: string; text: string }) {
  const supabase = requireSupabase();
  const { data: identity } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('ai_brain_sources')
    .insert({
      source_type: 'text',
      title: input.title.trim(),
      text_content: input.text.trim(),
      status: 'ready',
      created_by: identity.user?.id ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return mapSource(data);
}

function sourceTypeForFile(file: File): AIBrainSourceType {
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'text/plain') return 'text';
  throw new Error('Use PDF, TXT, JPG, PNG ou WEBP.');
}

export async function uploadBrainFile(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Arquivo acima de 10 MB.');
  const sourceType = sourceTypeForFile(file);
  const supabase = requireSupabase();
  const { data: identity } = await supabase.auth.getUser();
  if (!identity.user) throw new Error('Sessão inválida.');

  if (sourceType === 'text') {
    return addBrainTextSource({ title: file.name, text: await file.text() });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-120);
  const path = `${identity.user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from('ai-brain').upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('ai_brain_sources')
    .insert({
      source_type: sourceType,
      title: file.name,
      storage_bucket: 'ai-brain',
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      status: 'processing',
      created_by: identity.user.id,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from('ai-brain').remove([path]).catch(() => undefined);
    throw error;
  }

  const source = mapSource(data);
  const { error: processError } = await supabase.functions.invoke('ai-brain-process-source', {
    body: { sourceId: source.id },
  });
  if (processError) throw new Error(processError.message || 'Arquivo enviado, mas o processamento falhou.');
  return source;
}

export async function removeBrainSource(source: AIBrainSource) {
  const supabase = requireSupabase();
  if (source.storageBucket && source.storagePath) {
    await supabase.storage.from(source.storageBucket).remove([source.storagePath]);
  }
  const { error } = await supabase.from('ai_brain_sources').delete().eq('id', source.id);
  if (error) throw error;
}

export async function buildAIBrainRuntimeContext() {
  const brain = await loadAIBrain();
  return {
    companyContext: brain.companyContext,
    sources: brain.sources
      .filter((source) => source.status === 'ready')
      .map((source) => ({
        id: source.id,
        type: source.sourceType,
        title: source.title,
        content: source.textContent || '',
      })),
  };
}
