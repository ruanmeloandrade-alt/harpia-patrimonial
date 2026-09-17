import { FormEvent, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { useAppRouter } from '../../core/router/router';
import { AuthCard } from './AuthCard';

export interface ClientRegistrationEvent {
  fullName: string;
  email: string;
  whatsapp: string;
}

export interface RegisterPageProps {
  onClientRegistered?: (event: ClientRegistrationEvent) => void | Promise<void>;
}

export function RegisterPage({ onClientRegistered }: RegisterPageProps = {}) {
  const auth = useAuth();
  const { navigate } = useAppRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);

    const normalizedRegistration = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsapp: whatsapp.trim(),
    };
    const result = await auth.signUpClient({ ...normalizedRegistration, password });

    if (!result.ok) {
      setBusy(false);
      return setError(result.message || 'Não foi possível criar sua conta.');
    }

    let crmSyncFailed = false;
    if (onClientRegistered) {
      try {
        await onClientRegistered(normalizedRegistration);
      } catch (syncError) {
        crmSyncFailed = true;
        console.error('[auth] client CRM sync failed', syncError);
      }
    }

    setBusy(false);

    if (result.needsEmailConfirmation) {
      const confirmationMessage = result.message || 'Confirme seu e-mail para continuar.';
      return setMessage(
        crmSyncFailed
          ? `${confirmationMessage} O cadastro foi criado, mas o atendimento ainda não foi sincronizado com o CRM.`
          : confirmationMessage,
      );
    }

    navigate('/cliente', { replace: true });
  }

  return (
    <AuthCard eyebrow="CADASTRO RÁPIDO" title="Crie sua conta" description="Leva menos de um minuto. Usaremos seus dados para salvar seus interesses e agilizar o atendimento." onSubmit={submit} submitLabel="Criar minha conta" busy={busy} error={!auth.configurationReady ? 'O backend dedicado da Hárpia ainda não foi conectado.' : error} message={message} footerText="Já possui conta?" footerHref="/entrar" footerLabel="Entrar">
      <label className="field"><span>Nome completo</span><input autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
      <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label className="field"><span>WhatsApp</span><input type="tel" autoComplete="tel" placeholder="(21) 99999-9999" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} required /></label>
      <label className="field"><span>Senha</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
    </AuthCard>
  );
}
