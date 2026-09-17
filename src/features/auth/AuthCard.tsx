import { FormEvent, PropsWithChildren } from 'react';
import { AppLink } from '../../core/router/router';

type Props = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  message?: string | null;
  footerText: string;
  footerHref: string;
  footerLabel: string;
}>;

export function AuthCard({ eyebrow, title, description, onSubmit, submitLabel, busy, error, message, footerText, footerHref, footerLabel, children }: Props) {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div>
          <p className="eyebrow">HÁRPIA PATRIMONIAL & CO.</p>
          <h1>Patrimônio é decisão.</h1>
          <p className="lead">Uma experiência única para acompanhar oportunidades, serviços e decisões imobiliárias.</p>
        </div>
        <p className="tiny">Inteligência patrimonial desde 1986.</p>
      </section>
      <section className="auth-form-panel">
        <form className="auth-card" onSubmit={onSubmit}>
          <p className="eyebrow dark">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
          <div className="form-stack">{children}</div>
          {error ? <div className="alert alert-error">{error}</div> : null}
          {message ? <div className="alert alert-success">{message}</div> : null}
          <button className="button button-primary button-block" type="submit" disabled={busy}>{busy ? 'Aguarde...' : submitLabel}</button>
          <p className="auth-footer">{footerText} <AppLink href={footerHref}>{footerLabel}</AppLink></p>
        </form>
      </section>
    </main>
  );
}
