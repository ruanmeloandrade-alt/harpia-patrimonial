import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import type { AuthContextValue, AuthResult, SignInInput, SignUpClientInput, UserProfile } from './types';

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeError(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Não foi possível concluir a operação.';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<ReadonlySet<string>>(new Set());

  const loadIdentity = useCallback(async (nextUser: User | null) => {
    if (!supabase || !nextUser) {
      setProfile(null);
      setPermissions(new Set());
      return;
    }

    const [{ data: profileData, error: profileError }, { data: permissionData, error: permissionError }] = await Promise.all([
      supabase.from('user_profiles').select('id,full_name,whatsapp,account_type,is_active,created_at,updated_at').eq('id', nextUser.id).maybeSingle(),
      supabase.from('current_user_permissions').select('permission_key'),
    ]);

    if (profileError) throw profileError;
    if (permissionError) throw permissionError;

    setProfile((profileData as UserProfile | null) ?? null);
    setPermissions(new Set((permissionData ?? []).flatMap((item) => item.permission_key ? [item.permission_key] : [])));
  }, []);

  const adoptSession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    await loadIdentity(nextSession?.user ?? null);
  }, [loadIdentity]);

  const refreshProfile = useCallback(async () => {
    await loadIdentity(user);
  }, [loadIdentity, user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    async function bootstrap() {
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (error) throw error;
        if (!active) return;
        await adoptSession(data.session);
      } catch (error) {
        console.error('[auth] bootstrap failed', error);
        if (active) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setPermissions(new Set());
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      queueMicrotask(() => {
        loadIdentity(nextSession?.user ?? null).catch((error) => console.error('[auth] identity refresh failed', error));
      });
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [adoptSession, loadIdentity]);

  const signUpClient = useCallback(async (input: SignUpClientInput): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'Backend ainda não conectado.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            full_name: input.fullName.trim(),
            whatsapp: input.whatsapp.trim(),
          },
          emailRedirectTo: `${window.location.origin}/conta`,
        },
      });
      if (error) throw error;
      if (data.session) await adoptSession(data.session);
      return {
        ok: true,
        needsEmailConfirmation: Boolean(data.user && !data.session),
        message: data.session ? 'Conta criada com sucesso.' : 'Conta criada. Confirme seu e-mail para concluir o acesso.',
      };
    } catch (error) {
      return { ok: false, message: normalizeError(error) };
    }
  }, [adoptSession]);

  const signIn = useCallback(async (input: SignInInput): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'Backend ainda não conectado.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email.trim().toLowerCase(),
        password: input.password,
      });
      if (error) throw error;
      await adoptSession(data.session);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: normalizeError(error) };
    }
  }, [adoptSession]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setRecoveryMode(false);
    await adoptSession(null);
  }, [adoptSession]);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'Backend ainda não conectado.' };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/nova-senha`,
      });
      if (error) throw error;
      return { ok: true, message: 'Enviamos as instruções de recuperação para o seu e-mail.' };
    } catch (error) {
      return { ok: false, message: normalizeError(error) };
    }
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, message: 'Backend ainda não conectado.' };
    if (password.length < 8) return { ok: false, message: 'A nova senha precisa ter pelo menos 8 caracteres.' };
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryMode(false);
      return { ok: true, message: 'Senha atualizada com sucesso.' };
    } catch (error) {
      return { ok: false, message: normalizeError(error) };
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    configurationReady: isSupabaseConfigured,
    loading,
    recoveryMode,
    session,
    user,
    profile,
    permissions,
    isAuthenticated: Boolean(user),
    isInternalUser: profile?.account_type === 'internal' && profile.is_active,
    hasPermission: (permission) => permissions.has(permission),
    signUpClient,
    signIn,
    signOut,
    requestPasswordReset,
    updatePassword,
    refreshProfile,
  }), [loading, permissions, profile, recoveryMode, refreshProfile, requestPasswordReset, session, signIn, signOut, signUpClient, updatePassword, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
