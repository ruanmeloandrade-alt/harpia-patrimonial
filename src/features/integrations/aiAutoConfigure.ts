import { requireSupabase } from '../../core/supabase/client';

export type AIAutoConfigureResult = {
  ok: boolean;
  provider?: 'openai' | 'anthropic' | 'google_gemini';
  providerLabel?: string;
  model?: string;
  profileId?: string;
  message?: string;
};

export async function configureAIKey(apiKey: string): Promise<AIAutoConfigureResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('ai-key-autoconfigure', {
    body: { apiKey: apiKey.trim() },
  });

  if (error) throw new Error(error.message || 'Não foi possível configurar a IA.');
  if (!data || typeof data !== 'object') throw new Error('Resposta inválida da configuração de IA.');

  const result = data as AIAutoConfigureResult;
  if (!result.ok) throw new Error(result.message || 'A chave de IA não pôde ser configurada.');
  return result;
}
