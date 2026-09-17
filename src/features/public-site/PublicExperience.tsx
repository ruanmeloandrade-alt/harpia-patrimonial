import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import PublicSiteApp, {
  type PublicAuthBridge,
  type PublicFavoritesBridge,
  type PublicSiteConversion,
} from './PublicSiteApp';
import type { PublicCatalogReader } from '../public-catalog/contracts';
import {
  ClientAreaDataProvider,
  type ClientAreaDataState,
} from '../client-area/ClientArea';
import {
  emitFront02LocationChange,
  FRONT02_LOCATION_EVENT,
  matchesFront02PublicRoute,
  normalizeFront02PublicPath,
} from './routes';
import './public-experience.css';
import './public-polish.css';

interface PublicExperienceProps {
  catalog?: PublicCatalogReader;
  auth?: PublicAuthBridge;
  favorites?: PublicFavoritesBridge;
  clientAreaData?: ClientAreaDataState;
  onConversion?: (event: PublicSiteConversion) => boolean | void | Promise<boolean | void>;
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

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Hárpia Patrimonial & Co. | Inteligência patrimonial',
    description: 'Inteligência patrimonial aplicada a negócios imobiliários, investimentos e decisões que atravessam gerações.',
  },
  '/imoveis': {
    title: 'Imóveis | Hárpia Patrimonial & Co.',
    description: 'Consulte os imóveis e oportunidades publicados no catálogo da Hárpia Patrimonial & Co.',
  },
  '/sobre': {
    title: 'Sobre | Hárpia Patrimonial & Co.',
    description: 'Conheça a proposta da Hárpia Patrimonial & Co. e sua atuação em inteligência patrimonial e negócios imobiliários.',
  },
  '/investimentos': {
    title: 'Investimentos | Hárpia Patrimonial & Co.',
    description: 'Oportunidades imobiliárias analisadas dentro de uma visão mais ampla de patrimônio, preservação e expansão.',
  },
  '/leiloes': {
    title: 'Leilões & Flipping | Hárpia Patrimonial & Co.',
    description: 'Estratégia para aquisição, transformação e operação de ativos imobiliários em leilões e flipping.',
  },
  '/assessoria-juridica': {
    title: 'Assessoria Jurídica | Hárpia Patrimonial & Co.',
    description: 'Apoio jurídico integrado às decisões e operações imobiliárias atendidas pela Hárpia.',
  },
  '/arquitetura': {
    title: 'Arquitetura | Hárpia Patrimonial & Co.',
    description: 'Arquitetura, reformas e soluções relacionadas ao patrimônio, ao espaço e ao bem viver.',
  },
  '/vender': {
    title: 'Quero vender meu imóvel | Hárpia Patrimonial & Co.',
    description: 'Envie os dados iniciais do seu imóvel para iniciar um atendimento de venda com a equipe Hárpia.',
  },
  '/alugar': {
    title: 'Quero alugar meu imóvel | Hárpia Patrimonial & Co.',
    description: 'Envie os dados iniciais do seu imóvel para iniciar um atendimento de locação com a equipe Hárpia.',
  },
  '/cliente': {
    title: 'Área do cliente | Hárpia Patrimonial & Co.',
    description: 'Acesse seus imóveis salvos, interesses e atalhos de atendimento da Hárpia Patrimonial & Co.',
  },
};

function metadataForPath(path: string) {
  if (routeMetadata[path]) return routeMetadata[path];
  if (path.startsWith('/imoveis/')) {
    return {
      title: 'Detalhe do imóvel | Hárpia Patrimonial & Co.',
      description: 'Consulte os detalhes de um imóvel publicado no catálogo da Hárpia Patrimonial & Co.',
    };
  }
  return {
    title: 'Página não encontrada | Hárpia Patrimonial & Co.',
    description: 'O endereço informado não pertence à experiência pública da Hárpia Patrimonial & Co.',
  };
}

function navigatePublic(path: string) {
  window.history.pushState({}, '', path);
  emitFront02LocationChange();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function PublicExperience(props: PublicExperienceProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useState(() => normalizeFront02PublicPath(window.location.pathname));
  const [pendingConversion, setPendingConversion] = useState<PublicSiteConversion | null>(null);
  const [contactBusy, setContactBusy] = useState(false);
  const [contactError, setContactError] = useState('');
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const contactNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onLocationChange = () => {
      const nextPath = normalizeFront02PublicPath(window.location.pathname);
      setPath(nextPath);
      setMobileOpen(false);

      if (nextPath !== window.location.pathname && matchesFront02PublicRoute(nextPath)) {
        window.history.replaceState({}, '', `${nextPath}${window.location.search}`);
      }
    };

    window.addEventListener('popstate', onLocationChange);
    window.addEventListener(FRONT02_LOCATION_EVENT, onLocationChange);
    onLocationChange();
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener(FRONT02_LOCATION_EVENT, onLocationChange);
    };
  }, []);

  useEffect(() => {
    const metadata = metadataForPath(path);
    const previousTitle = document.title;
    const existingDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = existingDescription?.content;
    const description = existingDescription ?? document.createElement('meta');

    document.title = metadata.title;
    if (!existingDescription) {
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = metadata.description;

    return () => {
      document.title = previousTitle;
      if (existingDescription) {
        existingDescription.content = previousDescription ?? '';
      } else {
        description.remove();
      }
    };
  }, [path]);

  useEffect(() => {
    if (!mobileOpen && !pendingConversion) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTarget = window.requestAnimationFrame(() => {
      if (pendingConversion) contactNameRef.current?.focus();
      else if (mobileOpen) mobileCloseRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (pendingConversion && !contactBusy) {
        setPendingConversion(null);
        return;
      }
      if (mobileOpen) setMobileOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(focusTarget);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [contactBusy, mobileOpen, pendingConversion]);

  const currentLabel = useMemo(
    () => navigation.find((item) => item.path === path)?.label ?? (path.startsWith('/imoveis/') ? 'Imóvel' : 'Menu'),
    [path],
  );

  const forwardConversion = async (event: PublicSiteConversion): Promise<boolean> => {
    if (!props.onConversion) throw new Error('Atendimento ainda não conectado.');

    const resolvedName = event.contact?.name?.trim() || props.auth?.currentClient?.name?.trim();
    const resolvedWhatsapp = event.contact?.whatsapp?.trim() || props.auth?.currentClient?.whatsapp?.trim();

    if (!resolvedName || !resolvedWhatsapp) {
      setContactError('');
      setPendingConversion(event);
      return false;
    }

    const accepted = await props.onConversion(event);
    return accepted !== false;
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
      const accepted = await props.onConversion({
        ...pendingConversion,
        contact: {
          name,
          email: email || undefined,
          whatsapp,
        },
      });
      if (accepted === false) {
        setContactError('Não foi possível registrar seu contato agora.');
        return;
      }
      setPendingConversion(null);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : 'Não foi possível registrar seu contato agora.');
    } finally {
      setContactBusy(false);
    }
  };

  if (!matchesFront02PublicRoute(path)) {
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
      <ClientAreaDataProvider value={props.clientAreaData}>
        <PublicSiteApp
          {...props}
          onConversion={props.onConversion ? forwardConversion : undefined}
        />
      </ClientAreaDataProvider>

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
              <button ref={mobileCloseRef} type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu">
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
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  if (!props.onConversion) return;
                  void forwardConversion({
                    source: 'site-publico',
                    action: 'solicitar-atendimento',
                    page: path,
                    service: 'Atendimento consultivo',
                  });
                }}
              >
                Ser Atendido Agora!
              </button>
              <button type="button" onClick={() => navigatePublic('/vender')}>Quero vender meu imóvel</button>
              <button type="button" onClick={() => navigatePublic('/alugar')}>Quero alugar meu imóvel</button>
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
            aria-describedby="public-contact-description"
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
            <p id="public-contact-description">
              Precisamos apenas dos dados essenciais para registrar seu interesse e encaminhar o atendimento com contexto.
            </p>

            <form className="public-contact-form" onSubmit={submitPendingConversion} aria-busy={contactBusy}>
              <label>
                <span>Nome</span>
                <input
                  ref={contactNameRef}
                  name="name"
                  autoComplete="name"
                  required
                  disabled={contactBusy}
                  defaultValue={pendingConversion.contact?.name ?? props.auth?.currentClient?.name ?? ''}
                />
              </label>
              <label>
                <span>WhatsApp</span>
                <input
                  name="whatsapp"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  disabled={contactBusy}
                  defaultValue={pendingConversion.contact?.whatsapp ?? props.auth?.currentClient?.whatsapp ?? ''}
                />
              </label>
              <label>
                <span>E-mail <small>opcional</small></span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  disabled={contactBusy}
                  defaultValue={pendingConversion.contact?.email ?? props.auth?.currentClient?.email ?? ''}
                />
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
