import type { Session, User } from '@supabase/supabase-js';

export type AccountType = 'client' | 'internal';

export type UserProfile = {
  id: string;
  full_name: string;
  whatsapp: string | null;
  account_type: AccountType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SignUpClientInput = {
  fullName: string;
  email: string;
  whatsapp: string;
  password: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type AuthResult = {
  ok: boolean;
  message?: string;
  needsEmailConfirmation?: boolean;
};

export type AuthContextValue = {
  configurationReady: boolean;
  loading: boolean;
  recoveryMode: boolean;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  permissions: ReadonlySet<string>;
  isAuthenticated: boolean;
  isInternalUser: boolean;
  hasPermission: (permission: string) => boolean;
  signUpClient: (input: SignUpClientInput) => Promise<AuthResult>;
  signIn: (input: SignInInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};
