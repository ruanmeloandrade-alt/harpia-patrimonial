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
        <img className="brandbook-auth-logo" src="/assets/brand/harpia-logo-horizontal-white-cropped.png" alt="Hárpia Patrimonial & Co." />
        <div className="brandbook-auth-message">
          <p className="eyebrow">HÁRPIA PATRIMONIAL & CO.</p>
          <h1>Decisões que atravessam gerações.</h1>
          <p className="lead">Uma tradição familiar desde 1986. Aconselhamos pessoas e famílias com inteligência patrimonial, discrição e visão de longo prazo.</p>
        </div>
        <p className="tiny">Preservar. Expandir. Perpetuar.</p>
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
