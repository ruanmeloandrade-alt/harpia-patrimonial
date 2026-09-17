import type { AICredentialResolverPort } from './aiCredentialResolverPort';
import { unconfiguredAICredentialResolver } from './aiCredentialResolverPort';
import type { AIModelRuntimePort } from './aiRuntimePort';
import { invokeConfiguredProvider } from './providerAdapters';

/**
 * Runtime para uso no backend. Resolve a chave pelo secretRef e só então chama
 * o provedor. Não monte este runtime diretamente no navegador.
 */
export function createProviderAIModelRuntime(
  credentialResolver: AICredentialResolverPort = unconfiguredAICredentialResolver,
): AIModelRuntimePort {
  return {
    async invoke(input) {
      if (!input.profile.secretRef) {
        return { status: 'not_configured', reason: 'Perfil de IA não possui secretRef de credencial segura.' };
      }

      const credential = await credentialResolver.resolveApiKey({
        profileId: input.profile.id,
        secretRef: input.profile.secretRef,
      });

      if (credential.status !== 'resolved') {
        return { status: 'not_configured', reason: credential.reason };
      }

      try {
        const response = await invokeConfiguredProvider({
          profile: input.profile,
          apiKey: credential.apiKey,
          instructions: input.instructions,
          input: input.input ?? JSON.stringify(input.context ?? {}),
        });
        return {
          status: 'completed',
          output: response.output,
          metadata: { provider: input.profile.provider, model: input.profile.model },
        };
      } catch (error) {
        return {
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Falha inesperada ao chamar o provedor de IA.',
        };
      }
    },
    async cancel() {
      return {
        status: 'not_configured',
        reason: 'Cancelamento depende do executor/provider server-side utilizado.',
      };
    },
  };
}
