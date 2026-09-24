import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { AppLink, useAppRouter } from '../../core/router/router';
import { AuthCard } from './AuthCard';
import { supabase } from '../../core/supabase/client';

function safePublicReturn(search: string) {
  const candidate = new URLSearchParams(search).get('retorno')?.trim();
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//') || candidate.startsWith('/interno')) {
    return '/cliente';
  }
  return candidate;
}

export function LoginPage({ internal = false }: { internal?: boolean }) {
  const auth = useAuth();
  const { navigate, search } = useAppRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationMode, setActivationMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const returnTo = useMemo(() => internal ? '/interno' : safePublicReturn(search), [internal, search]);
  const registrationHref = useMemo(
    () => returnTo === '/cliente' ? '/cadastro' : `/cadastro?retorno=${encodeURIComponent(returnTo)}`,
    [returnTo],
  );

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [auth.isAuthenticated, auth.loading, navigate, returnTo]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    if (internal && activationMode) {
      if (!supabase) {
        setBusy(false);
        setError('Backend da Hárpia não conectado.');
        return;
      }

      try {
        let sessionReady = false;
        const login = await auth.signIn({ email, password });
        if (login.ok) {
          sessionReady = true;
        } else {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { full_name: fullName.trim() || 'Administrador Hárpia' },
            },
          });
          if (signUpError) throw signUpError;
          sessionReady = Boolean(data.session);
          if (!sessionReady) {
            throw new Error('Conta criada. Confirme o e-mail e depois entre novamente para concluir a ativação.');
          }
        }

        if (!sessionReady) throw new Error('Não foi possível abrir a sessão administrativa.');

        const { error: claimError } = await (supabase as any).rpc('claim_first_admin', {
          p_activation_code: activationCode.trim(),
        });
        if (claimError) throw claimError;

        await auth.refreshProfile();
        setBusy(false);
        navigate('/interno', { replace: true });
        return;
      } catch (activationError) {
        setBusy(false);
        setError(activationError instanceof Error ? activationError.message : 'Não foi possível ativar o primeiro administrador.');
        return;
      }
    }

    const result = await auth.signIn({ email, password });
    setBusy(false);
    if (!result.ok) setError(result.message || 'Não foi possível entrar.');
    else navigate(returnTo, { replace: true });
  }

  return (
    <AuthCard
      eyebrow={internal ? 'ÁREA INTERNA' : 'MINHA CONTA'}
      title={internal ? 'Acesso da equipe' : 'Acesse sua conta'}
      description={internal ? 'Entre com suas credenciais de colaborador Hárpia.' : 'Seus imóveis salvos e interesses ficam reunidos aqui.'}
      onSubmit={submit}
      submitLabel={internal && activationMode ? 'Ativar administrador' : 'Entrar'}
      busy={busy}
      error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error}
      footerText={internal ? 'Não é da equipe?' : 'Ainda não possui conta?'}
      footerHref={internal ? '/' : registrationHref}
      footerLabel={internal ? 'Voltar ao site' : 'Criar conta'}
    >
      {internal && activationMode ? (
        <label className="field"><span>Nome do administrador</span><input type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
      ) : null}
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="field"><span>Senha</span><input type="password" autoComplete={activationMode ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
      {internal && activationMode ? (
        <label className="field"><span>Código de ativação</span><input type="text" autoComplete="off" value={activationCode} onChange={(event) => setActivationCode(event.target.value)} required /></label>
      ) : null}
      {!activationMode ? <AppLink className="auth-helper-link" href="/recuperar-senha">Esqueci minha senha</AppLink> : null}
      {internal ? (
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setActivationMode((value) => !value);
            setError(null);
          }}
        >
          {activationMode ? 'Já tenho acesso interno' : 'Ativar primeiro administrador'}
        </button>
      ) : null}
    </AuthCard>
  );
}
