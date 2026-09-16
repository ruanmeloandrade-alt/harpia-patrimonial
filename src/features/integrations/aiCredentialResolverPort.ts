export type AICredentialResolveResult =
  | { status: 'resolved'; apiKey: string }
  | { status: 'not_configured'; reason: string }
  | { status: 'not_found'; reason: string };

/**
 * Porta exclusivamente server-side. A implementação deve ler o segredo pelo
 * secretRef no cofre seguro; a chave bruta nunca deve ser enviada ao browser.
 */
export interface AICredentialResolverPort {
  resolveApiKey(input: { profileId: string; secretRef: string }): Promise<AICredentialResolveResult>;
}

export const unconfiguredAICredentialResolver: AICredentialResolverPort = {
  async resolveApiKey() {
    return {
      status: 'not_configured',
      reason: 'Resolvedor server-side de credenciais ainda não está conectado ao cofre seguro.',
    };
  },
};
