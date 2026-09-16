import { useMemo } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { useAppRouter } from '../core/router/router';
import { Front02IntegrationShell } from '../features/public-site';
import type { Front04LeadConversionEventPort } from '../features/public-site/front04ConversionAdapter';
import { usePlatformRuntime } from './PlatformRuntime';
import { SupabaseClientAreaDataSource } from './integrations/clientAreaDataSource';
import { ingestPublicLead } from './integrations/publicLeadIngest';

export function IntegratedPublicExperience() {
  const auth = useAuth();
  const { navigate } = useAppRouter();
  const runtime = usePlatformRuntime();
  const clientAreaDataSource = useMemo(() => new SupabaseClientAreaDataSource(), []);

  const crmIngest = useMemo(() => async (event: Front04LeadConversionEventPort) => {
    const clientId = auth.profile?.account_type === 'client' && auth.profile.is_active
      ? auth.user?.id
      : undefined;
    return ingestPublicLead({
      ...event,
      metadata: {
        ...(event.metadata ?? {}),
        ...(clientId ? { clientId } : {}),
      },
    });
  }, [auth.profile?.account_type, auth.profile?.is_active, auth.user?.id]);

  return (
    <Front02IntegrationShell
      auth={{
        user: auth.user ? { id: auth.user.id, email: auth.user.email } : null,
        profile: auth.profile ? {
          full_name: auth.profile.full_name,
          whatsapp: auth.profile.whatsapp,
          account_type: auth.profile.account_type,
          is_active: auth.profile.is_active,
        } : null,
        isAuthenticated: auth.isAuthenticated,
        isInternalUser: auth.isInternalUser,
      }}
      requestLogin={() => navigate('/entrar')}
      catalogService={runtime.publicCatalogService}
      crmIngest={crmIngest}
      favoritesStore={runtime.favoritesStore}
      clientAreaDataSource={clientAreaDataSource}
      internalAreaHref="/interno"
    />
  );
}
