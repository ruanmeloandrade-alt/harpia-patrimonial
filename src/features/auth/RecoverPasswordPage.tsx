import { FormEvent, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { AuthCard } from './AuthCard';

export function RecoverPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await auth.requestPasswordReset(email);
    setBusy(false);
    if (!result.ok) setError(result.message || 'Não foi possível iniciar a recuperação.');
    else setMessage(result.message || 'Confira seu e-mail.');
  }

  return (
    <AuthCard eyebrow="RECUPERAR ACESSO" title="Redefina sua senha" description="Informe o e-mail da sua conta para receber o link de recuperação." onSubmit={submit} submitLabel="Enviar link" busy={busy} error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error} message={message} footerText="Lembrou a senha?" footerHref="/entrar" footerLabel="Voltar ao login">
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
    </AuthCard>
  );
}
