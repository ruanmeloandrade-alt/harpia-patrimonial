import type { ClientProfileView } from '../client-area/ClientArea';
import type { PublicAuthBridge } from './PublicSiteApp';

interface Front01UserPort {
  email?: string | null;
}

interface Front01ProfilePort {
  full_name: string;
  whatsapp: string | null;
  account_type: 'client' | 'internal';
  is_active: boolean;
}

export interface Front01AuthContextPort {
  user: Front01UserPort | null;
  profile: Front01ProfilePort | null;
  isAuthenticated: boolean;
  isInternalUser: boolean;
}

function toClientProfile(auth: Front01AuthContextPort): ClientProfileView | null {
  if (!auth.isAuthenticated || !auth.user || !auth.profile) return null;
  if (auth.profile.account_type !== 'client' || !auth.profile.is_active) return null;

  const email = auth.user.email?.trim();
  if (!email) return null;

  return {
    name: auth.profile.full_name,
    email,
    whatsapp: auth.profile.whatsapp ?? '',
  };
}

/**
 * Adapter entre o AuthContext da Frente01 e a experiência pública da Frente02.
 * A Frente02 não conhece Supabase e não cria uma segunda sessão.
 */
export function createFront01PublicAuthBridge(options: {
  auth: Front01AuthContextPort;
  requestLogin: (reason: string) => void;
}): PublicAuthBridge {
  return {
    currentClient: toClientProfile(options.auth),
    requestLogin: options.requestLogin,
  };
}
