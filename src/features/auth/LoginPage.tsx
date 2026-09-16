import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { AppLink, useAppRouter } from '../../core/router/router';
import { AuthCard } from './AuthCard';

export function LoginPage({ internal = false }: { internal?: boolean }) {
  const auth = useAuth();
  const { navigate } = useAppRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      navigate(internal ? '/interno' : '/conta', { replace: true });
    }
  }, [auth.isAuthenticated, auth.loading, internal, navigate]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const result = await auth.signIn({ email, password });
    setBusy(false);
    if (!result.ok) setError(result.message || 'Não foi possível entrar.');
    else navigate(internal ? '/interno' : '/conta', { replace: true });
  }

  return (
    <AuthCard
      eyebrow={internal ? 'ÁREA INTERNA' : 'MINHA CONTA'}
      title={internal ? 'Acesso da equipe' : 'Acesse sua conta'}
      description={internal ? 'Entre com suas credenciais de colaborador Hárpia.' : 'Seus imóveis salvos e interesses ficam reunidos aqui.'}
      onSubmit={submit}
      submitLabel="Entrar"
      busy={busy}
      error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error}
      footerText={internal ? 'Não é da equipe?' : 'Ainda não possui conta?'}
      footerHref={internal ? '/' : '/cadastro'}
      footerLabel={internal ? 'Voltar ao site' : 'Criar conta'}
    >
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
      <AppLink className="auth-helper-link" href="/recuperar-senha">Esqueci minha senha</AppLink>
    </AuthCard>
  );
}
