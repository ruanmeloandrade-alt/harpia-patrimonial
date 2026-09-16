export type AICredentialSaveResult =
  | { status: 'stored'; secretRef: string }
  | { status: 'not_configured'; reason: string }
  | { status: 'rejected'; reason: string };

export interface AICredentialVaultPort {
  saveApiKey(input: { profileId: string; apiKey: string }): Promise<AICredentialSaveResult>;
  removeApiKey(input: { profileId: string; secretRef?: string }): Promise<AICredentialSaveResult>;
}

/**
 * Adaptador padrão enquanto o backend/cofre seguro ainda não foi montado.
 * A chave nunca deve ser gravada em localStorage, código-fonte ou documentação.
 */
export const unconfiguredAICredentialVault: AICredentialVaultPort = {
  async saveApiKey() {
    return {
      status: 'not_configured',
      reason: 'Cofre seguro de credenciais ainda não está conectado. A chave não foi armazenada no navegador.',
    };
  },
  async removeApiKey() {
    return {
      status: 'not_configured',
      reason: 'Cofre seguro de credenciais ainda não está conectado.',
    };
  },
};
