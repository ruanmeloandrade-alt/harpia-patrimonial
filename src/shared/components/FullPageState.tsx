import { AppLink } from '../../core/router/router';

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
};

export function FullPageState({ eyebrow = 'HÁRPIA PATRIMONIAL & CO.', title, description, actionHref, actionLabel }: Props) {
  return (
    <main className="state-page">
      <section className="state-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? <p className="muted state-copy">{description}</p> : null}
        {actionHref && actionLabel ? <AppLink className="button button-primary" href={actionHref}>{actionLabel}</AppLink> : null}
      </section>
    </main>
  );
}
