import { useAuth } from '../../core/auth/AuthProvider';
import { AppLink } from '../../core/router/router';

export function ClientAccountShell() {
  const auth = useAuth();
  return (
    <main className="client-account-page">
      <header className="client-header">
        <div><p className="eyebrow dark">HÁRPIA PATRIMONIAL & CO.</p><strong>Minha conta</strong></div>
        <div className="client-actions"><AppLink className="button button-ghost-dark" href="/">Voltar ao site</AppLink><button className="button button-dark" onClick={() => auth.signOut()}>Sair</button></div>
      </header>
      <section className="client-welcome">
        <p className="eyebrow dark">ÁREA DO CLIENTE</p>
        <h1>Olá, {auth.profile?.full_name?.split(' ')[0] || 'cliente'}.</h1>
        <p className="muted">Sua conta reúne seus interesses, favoritos e atalhos para os serviços Hárpia.</p>
      </section>
      <section className="account-grid">
        <article className="info-card"><span>Nome</span><strong>{auth.profile?.full_name || '—'}</strong></article>
        <article className="info-card"><span>E-mail</span><strong>{auth.user?.email || '—'}</strong></article>
        <article className="info-card"><span>WhatsApp</span><strong>{auth.profile?.whatsapp || '—'}</strong></article>
        <article className="info-card"><span>Status</span><strong>{auth.profile?.is_active ? 'Conta ativa' : 'Aguardando ativação'}</strong></article>
      </section>
    </main>
  );
}
