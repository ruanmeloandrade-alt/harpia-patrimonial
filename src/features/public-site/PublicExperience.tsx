import { useEffect, useMemo, useState } from 'react';
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

function navigatePublic(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function PublicExperience(props: PublicExperienceProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setMobileOpen(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const currentLabel = useMemo(
    () => navigation.find((item) => item.path === path)?.label ?? (path.startsWith('/imoveis/') ? 'Imóvel' : 'Menu'),
    [path],
  );

  return (
    <>
      <PublicSiteApp {...props} />

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
    </>
  );
}
