import { FormEvent, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { useAppRouter } from '../../core/router/router';
import { AuthCard } from './AuthCard';

export function ResetPasswordPage() {
  const auth = useAuth();
  const { navigate } = useAppRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) return setError('As senhas não coincidem.');
    setBusy(true);
    const result = await auth.updatePassword(password);
    setBusy(false);
    if (!result.ok) return setError(result.message || 'Não foi possível atualizar a senha.');
    navigate(auth.isInternalUser ? '/interno' : '/conta', { replace: true });
  }

  return (
    <AuthCard eyebrow="NOVA SENHA" title="Defina uma nova senha" description="Use pelo menos 8 caracteres e guarde sua senha em um local seguro." onSubmit={submit} submitLabel="Salvar nova senha" busy={busy} error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error} footerText="Não solicitou recuperação?" footerHref="/" footerLabel="Voltar ao site">
      <label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label className="field"><span>Confirmar nova senha</span><input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>
    </AuthCard>
  );
}
