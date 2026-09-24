import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { AppLink, useAppRouter } from '../../core/router/router';
import { AuthCard } from './AuthCard';

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

    const result = await auth.signIn({ email, password });
    setBusy(false);
    if (!result.ok) setError(result.message || 'Não foi possível entrar.');
    else navigate(returnTo, { replace: true });
  }

  return (
    <AuthCard
      eyebrow={internal ? 'ÁREA INTERNA' : 'MINHA CONTA'}
      title={internal ? 'Acesso da equipe' : 'Acesse sua conta'}
      description={internal ? 'Entre com as credenciais criadas pela administração da Hárpia.' : 'Seus imóveis salvos e interesses ficam reunidos aqui.'}
      onSubmit={submit}
      submitLabel="Entrar"
      busy={busy}
      error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error}
      footerText={internal ? 'Não é da equipe?' : 'Ainda não possui conta?'}
      footerHref={internal ? '/' : registrationHref}
      footerLabel={internal ? 'Voltar ao site' : 'Criar conta'}
    >
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
      <AppLink className="auth-helper-link" href="/recuperar-senha">Esqueci minha senha</AppLink>
    </AuthCard>
  );
}
