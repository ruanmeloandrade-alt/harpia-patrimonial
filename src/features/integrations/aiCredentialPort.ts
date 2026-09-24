import type { AIProviderKind } from './aiProviderTypes';

export type AICredentialSaveResult =
  | { status: 'stored'; secretRef: string }
  | { status: 'not_configured'; reason: string }
  | { status: 'rejected'; reason: string };

export type AICredentialInspectResult =
  | {
      status: 'identified';
      provider: Exclude<AIProviderKind, 'custom' | 'openai_codex'>;
      providerLabel: string;
      models: string[];
    }
  | { status: 'not_configured'; reason: string }
  | { status: 'rejected'; reason: string };

export interface AICredentialVaultPort {
  inspectApiKey(input: { apiKey: string }): Promise<AICredentialInspectResult>;
  saveApiKey(input: { profileId: string; apiKey: string }): Promise<AICredentialSaveResult>;
  removeApiKey(input: { profileId: string; secretRef?: string }): Promise<AICredentialSaveResult>;
}

export const unconfiguredAICredentialVault: AICredentialVaultPort = {
  async inspectApiKey() {
    return {
      status: 'not_configured',
      reason: 'Validação segura de credenciais ainda não está conectada.',
    };
  },
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
