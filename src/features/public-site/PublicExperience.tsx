import { FormEvent, useEffect, useMemo, useState } from 'react';
import PublicSiteApp, {
  type PublicAuthBridge,
  type PublicFavoritesBridge,
  type PublicSiteConversion,
} from './PublicSiteApp';
import type { PublicCatalogReader } from '../public-catalog/contracts';
import './public-experience.css';

interface PublicExperienceProps {
  catalog?: PublicCatalogReader;
  auth?: PublicAuthBridge;
  favorites?: PublicFavoritesBridge;
  onConversion?: (event: PublicSiteConversion) => void | Promise<void>;
  internalAreaHref?: string;
}

const navigation = [
  { label: 'Início', path: '/' },
  { label: 'Imóveis', path: '/imoveis' },
  { label: 'Sobre', path: '/sobre' },
  { label: 'Investimentos', path: '/investimentos' },
  { label: 'Leilões', path: '/leiloes' },
  { label: 'Assessoria Jurídica', path: '/assessoria-juridica' },
  { label: 'Arquitetura', path: '/arquitetura' },
  { label: 'Área do cliente', path: '/cliente' },
];

const auxiliaryPublicPaths = ['/vender', '/alugar'];

function normalizePath(path: string) {
  if (path === '/') return path;
  return path.replace(/\/+$/, '') || '/';
}

function isKnownPublicPath(path: string) {
  const normalized = normalizePath(path);
  return (
    navigation.some((item) => item.path === normalized) ||
    auxiliaryPublicPaths.includes(normalized) ||
    /^\/imoveis\/[^/]+$/.test(normalized)
  );
}

function navigatePublic(path: string) {
  window.history.pushState({}, '', path);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function PublicExperience(props: PublicExperienceProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));
  const [pendingConversion, setPendingConversion] = useState<PublicSiteConversion | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const history = window.history;
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    const emitNavigation = () => window.dispatchEvent(new PopStateEvent('popstate'));

    history.pushState = function pushState(...args: Parameters<History['pushState']>) {
      originalPushState.apply(history, args);
      emitNavigation();
    };

    history.replaceState = function replaceState(...args: Parameters<History['replaceState']>) {
      originalReplaceState.apply(history, args);
      emitNavigation();
    };

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = normalizePath(window.location.pathname);
      setPath(nextPath);
      setMobileOpen(false);

      if (nextPath !== window.location.pathname && isKnownPublicPath(nextPath)) {
        window.history.replaceState({}, '', nextPath);
      }
    };

    window.addEventListener('popstate', onPopState);
    onPopState();
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const currentLabel = useMemo(
    () => navigation.find((item) => item.path === path)?.label ?? (path.startsWith('/imoveis/') ? 'Imóvel' : 'Menu'),
    [path],
  );

  const forwardConversion = async (event: PublicSiteConversion) => {
    if (!props.onConversion) return;

    const eventHasName = Boolean(event.contact?.name?.trim());
    const authenticatedClientHasName = Boolean(props.auth?.currentClient?.name?.trim());

    if (!eventHasName && !authenticatedClientHasName) {
      setContactError('');
      setPendingConversion(event);
      return;
    }

    await props.onConversion(event);
  };

  const submitPendingConversion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pendingConversion || !props.onConversion) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const whatsapp = String(form.get('whatsapp') ?? '').trim();

    if (!name || !whatsapp) {
      setContactError('Informe seu nome e WhatsApp para continuar.');
      return;
    }

    setContactBusy(true);
    setContactError('');

    try {
      await props.onConversion({
        ...pendingConversion,
        contact: {
          name,
          email: email || undefined,
          whatsapp,
        },
      });
      setPendingConversion(null);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Não foi possível registrar seu contato agora.');
    } finally {
      setContactBusy(false);
    }
  };

  if (!isKnownPublicPath(path)) {
    return (
      <main className="public-not-found">
        <div className="public-not-found__card">
          <p>PÁGINA NÃO ENCONTRADA</p>
          <h1>Este endereço não faz parte da experiência pública da Hárpia.</h1>
          <span>Volte ao início ou consulte os imóveis publicados.</span>
          <div>
            <button type="button" onClick={() => navigatePublic('/')}>Ir para o início</button>
            <button type="button" onClick={() => navigatePublic('/imoveis')}>Ver imóveis</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <PublicSiteApp
        {...props}
        onConversion={props.onConversion ? forwardConversion : undefined}
      />

      <button
        className="mobile-public-menu-trigger"
        type="button"
        aria-expanded={mobileOpen}
        aria-controls="mobile-public-menu"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span>
        <span>{currentLabel}</span>
      </button>

      {mobileOpen && (
        <div className="mobile-public-menu-backdrop" onMouseDown={() => setMobileOpen(false)}>
          <nav
            id="mobile-public-menu"
            className="mobile-public-menu"
            aria-label="Navegação pública mobile"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mobile-public-menu__heading">
              <div>
                <strong>HÁRPIA</strong>
                <small>PATRIMONIAL & CO.</small>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
                ×
              </button>
            </div>

            <div className="mobile-public-menu__links">
              {navigation.map((item) => (
                <button
                  type="button"
                  key={item.path}
                  className={path === item.path ? 'is-active' : undefined}
                  onClick={() => navigatePublic(item.path)}
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>

            <div className="mobile-public-menu__owner-actions">
              <button type="button" onClick={() => navigatePublic('/vender')}>
                Quero vender meu imóvel
              </button>
              <button type="button" onClick={() => navigatePublic('/alugar')}>
                Quero alugar meu imóvel
              </button>
            </div>

            <a className="mobile-public-menu__internal" href={props.internalAreaHref ?? '/interno'}>
              Acessar Área Interna
            </a>
          </nav>
        </div>
      )}

      {pendingConversion && (
        <div
          className="public-contact-backdrop"
          role="presentation"
          onMouseDown={() => !contactBusy && setPendingConversion(null)}
        >
          <section
            className="public-contact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-contact-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="public-contact-modal__close"
              type="button"
              aria-label="Fechar"
              disabled={contactBusy}
              onClick={() => setPendingConversion(null)}
            >
              ×
            </button>

            <p className="public-contact-modal__kicker">Atendimento Hárpia</p>
            <h2 id="public-contact-title">Deixe seu contato para continuarmos.</h2>
            <p>
              Precisamos apenas dos dados essenciais para registrar seu interesse e encaminhar o atendimento com contexto.
            </p>

            <form className="public-contact-form" onSubmit={submitPendingConversion}>
              <label>
                <span>Nome</span>
                <input name="name" autoComplete="name" required disabled={contactBusy} />
              </label>
              <label>
                <span>WhatsApp</span>
                <input name="whatsapp" autoComplete="tel" inputMode="tel" required disabled={contactBusy} />
              </label>
              <label>
                <span>E-mail <small>opcional</small></span>
                <input name="email" type="email" autoComplete="email" disabled={contactBusy} />
              </label>

              {contactError && <p className="public-contact-form__error" role="alert">{contactError}</p>}

              <button className="public-contact-form__submit" type="submit" disabled={contactBusy}>
                {contactBusy ? 'Registrando…' : 'Continuar atendimento'}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
