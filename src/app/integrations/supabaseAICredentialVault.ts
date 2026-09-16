import { requireSupabase } from '../../core/supabase/client';
import type {
  AICredentialSaveResult,
  AICredentialVaultPort,
} from '../../features/integrations/aiCredentialPort';

type VaultResponse =
  | { status: 'stored'; secretRef: string }
  | { status: 'rejected'; reason: string }
  | { status: 'not_configured'; reason: string };

function normalizeResult(data: unknown): AICredentialSaveResult {
  if (!data || typeof data !== 'object') {
    return { status: 'rejected', reason: 'Resposta inválida do cofre seguro.' };
  }
  const result = data as VaultResponse;
  if (result.status === 'stored') return { status: 'stored', secretRef: result.secretRef || '' };
  if (result.status === 'not_configured') return result;
  return { status: 'rejected', reason: result.reason || 'Operação recusada pelo cofre seguro.' };
}

export class SupabaseAICredentialVault implements AICredentialVaultPort {
  async saveApiKey(input: { profileId: string; apiKey: string }): Promise<AICredentialSaveResult> {
    const supabase = requireSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) return { status: 'rejected', reason: 'Sessão interna inválida.' };

    const { data, error } = await supabase.functions.invoke('ai-credential-vault', {
      body: { action: 'save', profileId: input.profileId, apiKey: input.apiKey },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) return { status: 'rejected', reason: error.message };
    return normalizeResult(data);
  }

  async removeApiKey(input: { profileId: string; secretRef?: string }): Promise<AICredentialSaveResult> {
    const supabase = requireSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (sessionError || !token) return { status: 'rejected', reason: 'Sessão interna inválida.' };

    const { data, error } = await supabase.functions.invoke('ai-credential-vault', {
      body: { action: 'remove', profileId: input.profileId, secretRef: input.secretRef },
      headers: { Authorization: `Bearer ${token}` },
    });
    if (error) return { status: 'rejected', reason: error.message };
    return normalizeResult(data);
  }
}
