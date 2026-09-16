import { FormEvent, MouseEvent, useEffect, useMemo, useState } from 'react';
import { ClientArea, type ClientProfileView } from '../client-area/ClientArea';
import {
  emptyPublicCatalogReader,
  type PublicCatalogFilters,
  type PublicCatalogItem,
  type PublicCatalogReader,
} from '../public-catalog/contracts';
import './public-site.css';

export interface PublicSiteConversion {
  source: string;
  action: string;
  page: string;
  service?: string;
  propertyId?: string;
  propertySlug?: string;
  contact?: {
    name?: string;
    email?: string;
    whatsapp?: string;
  };
  metadata?: Record<string, string | number | boolean>;
}

export interface PublicAuthBridge {
  currentClient: ClientProfileView | null;
  requestLogin: (reason: string) => void;
}

export interface PublicFavoritesBridge {
  items: PublicCatalogItem[];
  isFavorite: (itemId: string) => boolean;
  toggle: (item: PublicCatalogItem) => void | Promise<void>;
}

interface PublicSiteAppProps {
  catalog?: PublicCatalogReader;
  auth?: PublicAuthBridge;
  favorites?: PublicFavoritesBridge;
  onConversion?: (event: PublicSiteConversion) => void | Promise<void>;
  internalAreaHref?: string;
}

type OwnerIntent = 'vender' | 'alugar';

type InstitutionalPageKey = 'sobre' | 'investimentos' | 'leiloes' | 'assessoria-juridica' | 'arquitetura';

const institutionalPages: Record<
  InstitutionalPageKey,
  { kicker: string; title: string; lead: string; body: string[] }
> = {
  sobre: {
    kicker: 'Desde 1986',
    title: 'Inteligência patrimonial para decisões que atravessam gerações.',
    lead:
      'A Hárpia Patrimonial & Co. é um escritório de inteligência patrimonial especializado em negócios imobiliários.',
    body: [
      'Enquanto o mercado negocia imóveis, a Hárpia orienta e gere decisões. O patrimônio é tratado como um organismo vivo, construído ao longo do tempo e transmitido através das escolhas certas.',
      'O compromisso é aconselhar e recomendar a decisão mais adequada, não apenas viabilizar a venda de um imóvel.',
      'A marca une inteligência patrimonial, bem viver, espírito explorador e tradição para construir relações duradouras e patrimônios que permanecem.',
    ],
  },
  investimentos: {
    kicker: 'Investimentos',
    title: 'Imóveis como parte de uma estratégia patrimonial mais ampla.',
    lead:
      'A Hárpia atua com investimentos patrimoniais e negócios imobiliários orientados por contexto, objetivo e horizonte de decisão.',
    body: [
      'A proposta é analisar oportunidades dentro de uma visão de preservação, expansão e perpetuação do patrimônio.',
      'As oportunidades publicadas aparecerão nesta área a partir do catálogo real da plataforma, sem ofertas fictícias.',
    ],
  },
  leiloes: {
    kicker: 'Leilões & flipping',
    title: 'Aquisição, transformação e estratégia em operações imobiliárias.',
    lead:
      'A operação da Hárpia contempla leilões e flipping, incluindo aquisição, reforma e posterior venda quando esse modelo fizer sentido para o cliente.',
    body: [
      'O atendimento combina leitura da oportunidade imobiliária com suporte das especialidades envolvidas em cada operação.',
      'Detalhes comerciais e oportunidades específicas serão exibidos somente quando houver dados reais cadastrados.',
    ],
  },
  'assessoria-juridica': {
    kicker: 'Assessoria Jurídica',
    title: 'Segurança jurídica integrada à jornada imobiliária.',
    lead:
      'A assessoria jurídica faz parte da proposta de atendimento da Hárpia para apoiar decisões e operações imobiliárias.',
    body: [
      'Documentos e tratativas operacionais continuam prioritariamente pelo atendimento da equipe e pelo WhatsApp nesta primeira versão.',
      'A área pública apresenta o serviço sem transformar o portal do cliente em uma central documental complexa.',
    ],
  },
  arquitetura: {
    kicker: 'Arquitetura',
    title: 'Visão de patrimônio também passa pela forma de viver o imóvel.',
    lead:
      'A experiência da Hárpia contempla arquitetura, reformas e obras como partes possíveis de uma solução patrimonial completa.',
    body: [
      'A parceria com a DUMU Arquitetura será destacada na experiência pública conforme os materiais reais e conteúdos finais forem incorporados.',
      'A estrutura está preparada para receber imagens, projetos e conteúdos aprovados sem inventar portfólio.',
    ],
  },
};

function formatCurrency(value: number | null) {
  if (value === null) return 'Valor sob consulta';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
}

function currentPath() {
  return typeof window === 'undefined' ? '/' : window.location.pathname;
}

export default function PublicSiteApp({
  catalog = emptyPublicCatalogReader,
  auth,
  favorites,
  onConversion,
  internalAreaHref = '/interno',
}: PublicSiteAppProps) {
  const [route, setRoute] = useState(currentPath);
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [notice, setNotice] = useState('');
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retentionSeen, setRetentionSeen] = useState(false);
  const [filters, setFilters] = useState<PublicCatalogFilters>({});

  useEffect(() => {
    const pop = () => setRoute(currentPath());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError('');
    catalog
      .listPublished(filters)
      .then((result) => {
        if (active) setItems(result);
      })
      .catch(() => {
        if (active) setCatalogError('Não foi possível carregar o catálogo agora.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [catalog, filters]);

  useEffect(() => {
    const onMouseLeave = (event: globalThis.MouseEvent) => {
      if (event.clientY <= 8 && !retentionSeen && route !== '/cliente') {
        setRetentionSeen(true);
        setRetentionOpen(true);
      }
    };
    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, [retentionSeen, route]);

  const navigate = (path: string) => {
    if (path === route) return;
    window.history.pushState({}, '', path);
    setRoute(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const intercept = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(path);
  };

  const requestLogin = (reason: string) => {
    if (auth) {
      auth.requestLogin(reason);
      return;
    }
    setNotice('Login e cadastro aguardam a integração do contrato de autenticação da Frente01.');
  };

  const emitConversion = async (event: PublicSiteConversion) => {
    if (!onConversion) {
      setNotice('Atendimento e criação de lead aguardam integração com CRM/WhatsApp. Nenhuma mensagem foi simulada.');
      return;
    }
    await onConversion(event);
  };

  const requestService = (service: string) =>
    emitConversion({ source: 'site-publico', action: 'solicitar-atendimento', page: route, service });

  const purposes = useMemo(() => Array.from(new Set(items.map((item) => item.purpose))).sort(), [items]);
  const cities = useMemo(() => Array.from(new Set(items.map((item) => item.city))).sort(), [items]);
  const locations = useMemo(() => Array.from(new Set(items.map((item) => item.location))).sort(), [items]);
  const lifestyleTags = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.lifestyleTags ?? []))).sort(),
    [items],
  );

  const propertySlug = route.startsWith('/imoveis/') ? decodeURIComponent(route.replace('/imoveis/', '')) : '';

  return (
    <div className="harpia-public">
      <header className="public-header">
        <a className="brand" href="/" onClick={intercept('/')} aria-label="Hárpia Patrimonial - início">
          <span className="brand-mark">H</span>
          <span>
            <strong>HÁRPIA</strong>
            <small>PATRIMONIAL & CO.</small>
          </span>
        </a>
        <nav className="public-nav" aria-label="Navegação principal">
          <a href="/sobre" onClick={intercept('/sobre')}>Sobre</a>
          <a href="/investimentos" onClick={intercept('/investimentos')}>Investimentos</a>
          <a href="/leiloes" onClick={intercept('/leiloes')}>Leilões</a>
          <a href="/assessoria-juridica" onClick={intercept('/assessoria-juridica')}>Assessoria Jurídica</a>
          <a href="/arquitetura" onClick={intercept('/arquitetura')}>Arquitetura</a>
        </nav>
        <div className="header-actions">
          <a className="quiet-link" href={internalAreaHref}>Área Interna</a>
          <button className="header-cta" type="button" onClick={() => requestService('Atendimento consultivo')}>
            Ser Atendido Agora!
          </button>
        </div>
      </header>

      {notice && (
        <div className="integration-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Fechar aviso">×</button>
        </div>
      )}

      {route === '/' && (
        <HomePage
          items={items}
          loading={loading}
          error={catalogError}
          lifestyleTags={lifestyleTags}
          onNavigate={navigate}
          onService={requestService}
          onFavorite={(item) => {
            if (!auth?.currentClient) return requestLogin('favoritar-imovel');
            if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.');
            return favorites.toggle(item);
          }}
          isFavorite={(id) => favorites?.isFavorite(id) ?? false}
        />
      )}

      {route === '/imoveis' && (
        <CatalogPage
          items={items}
          loading={loading}
          error={catalogError}
          filters={filters}
          purposes={purposes}
          cities={cities}
          locations={locations}
          onFilters={setFilters}
          onOpen={(slug) => navigate(`/imoveis/${encodeURIComponent(slug)}`)}
          onFavorite={(item) => {
            if (!auth?.currentClient) return requestLogin('favoritar-imovel');
            if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.');
            return favorites.toggle(item);
          }}
          isFavorite={(id) => favorites?.isFavorite(id) ?? false}
        />
      )}

      {propertySlug && (
        <PropertyDetail
          slug={propertySlug}
          catalog={catalog}
          isFavorite={(id) => favorites?.isFavorite(id) ?? false}
          onBack={() => navigate('/imoveis')}
          onFavorite={(item) => {
            if (!auth?.currentClient) return requestLogin('favoritar-imovel');
            if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.');
            return favorites.toggle(item);
          }}
          onService={(item) =>
            emitConversion({
              source: 'site-publico',
              action: 'atendimento-imovel',
              page: route,
              service: 'Atendimento consultivo',
              propertyId: item.id,
              propertySlug: item.slug,
            })
          }
        />
      )}

      {(['sobre', 'investimentos', 'leiloes', 'assessoria-juridica', 'arquitetura'] as InstitutionalPageKey[]).map(
        (key) =>
          route === `/${key}` && (
            <InstitutionalPage key={key} page={institutionalPages[key]} onService={() => requestService(institutionalPages[key].kicker)} />
          ),
      )}

      {(route === '/vender' || route === '/alugar') && (
        <OwnerCapture
          intent={route === '/vender' ? 'vender' : 'alugar'}
          onSubmit={(payload) =>
            emitConversion({
              source: 'captacao-proprietario',
              action: payload.intent,
              page: route,
              service: payload.intent === 'vender' ? 'Venda de imóvel' : 'Locação de imóvel',
              contact: payload.contact,
              metadata: {
                city: payload.city,
                propertyType: payload.propertyType,
              },
            })
          }
        />
      )}

      {route === '/cliente' && (
        <ClientArea
          profile={auth?.currentClient ?? null}
          favorites={favorites?.items ?? []}
          onRequestLogin={() => requestLogin('area-do-cliente')}
          onOpenProperty={(slug) => navigate(`/imoveis/${encodeURIComponent(slug)}`)}
          onGoToCatalog={() => navigate('/imoveis')}
          onRequestService={requestService}
        />
      )}

      <footer className="public-footer">
        <div>
          <strong>HÁRPIA PATRIMONIAL & CO.</strong>
          <p>Inteligência patrimonial especializada em negócios imobiliários.</p>
        </div>
        <div className="footer-links">
          <a href="/imoveis" onClick={intercept('/imoveis')}>Imóveis</a>
          <a href="/vender" onClick={intercept('/vender')}>Quero vender meu imóvel</a>
          <a href="/alugar" onClick={intercept('/alugar')}>Quero alugar meu imóvel</a>
          <a href="/cliente" onClick={intercept('/cliente')}>Área do cliente</a>
        </div>
      </footer>

      {retentionOpen && (
        <div className="retention-backdrop" role="presentation" onMouseDown={() => setRetentionOpen(false)}>
          <section className="retention-modal" role="dialog" aria-modal="true" aria-labelledby="retention-title" onMouseDown={(e) => e.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setRetentionOpen(false)} aria-label="Fechar">×</button>
            <p className="section-kicker">Antes de sair</p>
            <h2 id="retention-title">Não encontrou o imóvel ou a oportunidade certa?</h2>
            <p>Conte o que procura. A proposta da Hárpia é orientar a decisão, não apenas mostrar uma lista de imóveis.</p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setRetentionOpen(false);
                requestService('Retenção de comprador');
              }}
            >
              Quero ser atendido
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function HomePage({
  items,
  loading,
  error,
  lifestyleTags,
  onNavigate,
  onService,
  onFavorite,
  isFavorite,
}: {
  items: PublicCatalogItem[];
  loading: boolean;
  error: string;
  lifestyleTags: string[];
  onNavigate: (path: string) => void;
  onService: (service: string) => void;
  onFavorite: (item: PublicCatalogItem) => void | Promise<void>;
  isFavorite: (id: string) => boolean;
}) {
  return (
    <main>
      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="hero-kicker">Inteligência patrimonial · tradição desde 1986</p>
          <h1>Decisões imobiliárias pensadas para o presente e para o que permanece.</h1>
          <p>
            A Hárpia orienta negócios imobiliários, investimentos e decisões patrimoniais com uma visão que vai além da transação.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => onNavigate('/imoveis')}>Explorar imóveis</button>
            <button className="secondary-button" type="button" onClick={() => onService('Atendimento consultivo')}>Falar com a Hárpia</button>
          </div>
        </div>
        <aside className="hero-search" aria-label="Busca de imóveis">
          <p className="section-kicker">Encontre uma oportunidade</p>
          <h2>Busque no catálogo publicado.</h2>
          <p>Finalidade, cidade, localização, lançamentos e faixa de preço são definidos a partir do inventário real.</p>
          <button className="search-launcher" type="button" onClick={() => onNavigate('/imoveis')}>Abrir busca de imóveis <span>→</span></button>
        </aside>
      </section>

      <section className="manifesto section-shell">
        <p className="section-kicker">Hárpia Patrimonial & Co.</p>
        <blockquote>“Enquanto o mercado negocia imóveis, nós orientamos e gerimos decisões.”</blockquote>
        <p>Patrimônio é mais do que o que se possui. É a capacidade de transformar recursos em liberdade, escolhas em legado e imóveis em ativos que atravessam gerações.</p>
      </section>

      <section className="section-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Catálogo</p>
            <h2>Imóveis e oportunidades publicados</h2>
          </div>
          <button className="text-button" type="button" onClick={() => onNavigate('/imoveis')}>Ver catálogo completo</button>
        </div>
        <PropertyGrid items={items.slice(0, 6)} loading={loading} error={error} onOpen={(slug) => onNavigate(`/imoveis/${encodeURIComponent(slug)}`)} onFavorite={onFavorite} isFavorite={isFavorite} />
      </section>

      <section className="lifestyle-section section-shell">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Encontre pelo estilo de vida</p>
            <h2>O imóvel certo também depende de como você quer viver.</h2>
          </div>
        </div>
        {lifestyleTags.length === 0 ? (
          <div className="empty-state">
            <strong>As categorias aparecerão com o catálogo real.</strong>
            <p>A experiência já está preparada para usar classificações reais dos imóveis publicados, sem categorias fictícias.</p>
          </div>
        ) : (
          <div className="lifestyle-tags">{lifestyleTags.map((tag) => <button key={tag} type="button" onClick={() => onNavigate('/imoveis')}>{tag}</button>)}</div>
        )}
      </section>

      <section className="service-grid section-shell">
        {[
          ['Investimentos', 'Estratégia imobiliária dentro de uma visão patrimonial.', '/investimentos'],
          ['Leilões & flipping', 'Aquisição, transformação e operação de ativos imobiliários.', '/leiloes'],
          ['Assessoria Jurídica', 'Apoio jurídico integrado à jornada imobiliária.', '/assessoria-juridica'],
          ['Arquitetura', 'Arquitetura, reformas e soluções ligadas ao bem viver.', '/arquitetura'],
        ].map(([title, copy, path]) => (
          <article className="service-card" key={title}>
            <p className="section-kicker">Serviço</p>
            <h3>{title}</h3>
            <p>{copy}</p>
            <button className="text-button" type="button" onClick={() => onNavigate(path)}>Conhecer <span>→</span></button>
          </article>
        ))}
      </section>

      <section className="duo-section section-shell">
        <article>
          <p className="section-kicker">DUMU Arquitetura</p>
          <h2>Patrimônio, espaço e bem viver.</h2>
          <p>A experiência está preparada para destacar a parceria com a DUMU Arquitetura assim que as imagens e materiais finais forem incorporados.</p>
          <button className="text-button" type="button" onClick={() => onNavigate('/arquitetura')}>Ver arquitetura</button>
        </article>
        <article>
          <p className="section-kicker">Atendimento consultivo</p>
          <h2>Não é só encontrar um imóvel. É entender a decisão.</h2>
          <p>A principal proposta da Hárpia é orientar o cliente com visão integrada dos aspectos imobiliários, patrimoniais e dos serviços envolvidos.</p>
          <button className="primary-button" type="button" onClick={() => onService('Atendimento consultivo')}>Ser atendido agora</button>
        </article>
      </section>

      <section className="owner-strip section-shell">
        <div><p className="section-kicker">Proprietários</p><h2>Quer vender ou alugar um imóvel?</h2><p>Envie os dados iniciais e a equipe assume o atendimento manual.</p></div>
        <div className="hero-actions"><button className="secondary-button" type="button" onClick={() => onNavigate('/vender')}>Quero vender</button><button className="secondary-button" type="button" onClick={() => onNavigate('/alugar')}>Quero alugar</button></div>
      </section>
    </main>
  );
}

function CatalogPage({ items, loading, error, filters, purposes, cities, locations, onFilters, onOpen, onFavorite, isFavorite }: {
  items: PublicCatalogItem[];
  loading: boolean;
  error: string;
  filters: PublicCatalogFilters;
  purposes: string[];
  cities: string[];
  locations: string[];
  onFilters: (filters: PublicCatalogFilters) => void;
  onOpen: (slug: string) => void;
  onFavorite: (item: PublicCatalogItem) => void | Promise<void>;
  isFavorite: (id: string) => boolean;
}) {
  return (
    <main className="section-shell catalog-page">
      <div className="page-intro"><p className="section-kicker">Catálogo Hárpia</p><h1>Imóveis publicados</h1><p className="section-lead">Os filtros refletem somente dados reais disponibilizados pelo catálogo interno.</p></div>
      <div className="filter-grid">
        <label>Finalidade<select value={filters.purpose ?? ''} onChange={(e) => onFilters({ ...filters, purpose: e.target.value || undefined })}><option value="">Todas</option>{purposes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Cidade<select value={filters.city ?? ''} onChange={(e) => onFilters({ ...filters, city: e.target.value || undefined, location: undefined })}><option value="">Todas</option>{cities.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Localização<select value={filters.location ?? ''} onChange={(e) => onFilters({ ...filters, location: e.target.value || undefined })}><option value="">Todas</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Lançamento<select value={filters.launch === undefined ? '' : String(filters.launch)} onChange={(e) => onFilters({ ...filters, launch: e.target.value === '' ? undefined : e.target.value === 'true' })}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></label>
        <label>Preço mínimo<input inputMode="numeric" value={filters.minPrice ?? ''} placeholder="R$ 250.000" onChange={(e) => onFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label>Preço máximo<input inputMode="numeric" value={filters.maxPrice ?? ''} placeholder="R$ 20.000.000" onChange={(e) => onFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })} /></label>
      </div>
      <PropertyGrid items={items} loading={loading} error={error} onOpen={onOpen} onFavorite={onFavorite} isFavorite={isFavorite} />
    </main>
  );
}

function PropertyGrid({ items, loading, error, onOpen, onFavorite, isFavorite }: {
  items: PublicCatalogItem[];
  loading: boolean;
  error: string;
  onOpen: (slug: string) => void;
  onFavorite: (item: PublicCatalogItem) => void | Promise<void>;
  isFavorite: (id: string) => boolean;
}) {
  if (loading) return <div className="loading-state">Carregando catálogo…</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (items.length === 0) return <div className="empty-state"><strong>Nenhum imóvel publicado neste momento.</strong><p>Assim que o catálogo interno publicar dados reais, eles aparecerão automaticamente aqui.</p></div>;
  return <div className="property-grid">{items.map((item) => <article className="property-card" key={item.id}><div className="property-media">{item.media.find((media) => media.type === 'image') ? <img src={item.media.find((media) => media.type === 'image')?.url} alt={item.media.find((media) => media.type === 'image')?.alt ?? item.title} /> : <span>Imagem não disponível</span>}<button className="favorite-button" type="button" aria-label={isFavorite(item.id) ? 'Remover dos favoritos' : 'Salvar imóvel'} onClick={() => onFavorite(item)}>{isFavorite(item.id) ? '♥' : '♡'}</button></div><div className="property-body"><small>{item.propertyType} · {item.purpose}</small><h3>{item.title}</h3><p>{item.location}, {item.city}</p><strong>{formatCurrency(item.price)}</strong><div className="property-meta">{item.privateAreaM2 ? <span>{item.privateAreaM2} m²</span> : null}{item.bedrooms ? <span>{item.bedrooms} quartos</span> : null}{item.parkingSpaces ? <span>{item.parkingSpaces} vagas</span> : null}</div><button className="text-button" type="button" onClick={() => onOpen(item.slug)}>Ver detalhes <span>→</span></button></div></article>)}</div>;
}

function PropertyDetail({ slug, catalog, isFavorite, onBack, onFavorite, onService }: {
  slug: string;
  catalog: PublicCatalogReader;
  isFavorite: (id: string) => boolean;
  onBack: () => void;
  onFavorite: (item: PublicCatalogItem) => void | Promise<void>;
  onService: (item: PublicCatalogItem) => void | Promise<void>;
}) {
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    catalog.getPublishedBySlug(slug).then((result) => active && setItem(result)).catch(() => active && setError('Não foi possível carregar este imóvel.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [catalog, slug]);
  if (loading) return <main className="section-shell"><div className="loading-state">Carregando imóvel…</div></main>;
  if (error) return <main className="section-shell"><div className="error-state">{error}</div></main>;
  if (!item) return <main className="section-shell"><div className="empty-state"><strong>Imóvel não encontrado ou não publicado.</strong><p>O catálogo público só exibe itens reais em estado publicado.</p><button className="secondary-button" type="button" onClick={onBack}>Voltar ao catálogo</button></div></main>;
  const images = item.media.filter((media) => media.type === 'image');
  const videos = item.media.filter((media) => media.type === 'video');
  return <main className="section-shell property-detail"><button className="text-button" type="button" onClick={onBack}>← Voltar ao catálogo</button><div className="detail-hero"><div className="detail-copy"><p className="section-kicker">{item.propertyType} · {item.purpose}</p><h1>{item.title}</h1><p>{item.location}, {item.city}</p><strong className="detail-price">{formatCurrency(item.price)}</strong><div className="hero-actions"><button className="primary-button" type="button" onClick={() => onService(item)}>Quero atendimento</button><button className="secondary-button" type="button" onClick={() => onFavorite(item)}>{isFavorite(item.id) ? 'Remover dos favoritos' : 'Salvar imóvel'}</button></div></div><div className="detail-cover">{images[0] ? <img src={images[0].url} alt={images[0].alt ?? item.title} /> : <span>Imagem não disponível</span>}</div></div><div className="detail-grid"><article><p className="section-kicker">Sobre o imóvel</p><h2>Características</h2><p>{item.description || 'Descrição ainda não cadastrada no catálogo publicado.'}</p><div className="feature-list">{item.features?.length ? item.features.map((feature) => <span key={feature}>{feature}</span>) : <span>Características detalhadas ainda não cadastradas.</span>}</div></article><aside className="detail-facts"><strong>Informações</strong>{item.privateAreaM2 ? <span>Área privativa: {item.privateAreaM2} m²</span> : null}{item.bedrooms ? <span>Quartos: {item.bedrooms}</span> : null}{item.suites ? <span>Suítes: {item.suites}</span> : null}{item.bathrooms ? <span>Banheiros: {item.bathrooms}</span> : null}{item.parkingSpaces ? <span>Vagas: {item.parkingSpaces}</span> : null}<span>Status: {item.status === 'sold' ? 'Vendido' : 'Publicado'}</span>{item.development ? <span>Empreendimento: {item.development.title}{item.development.unitLabel ? ` · ${item.development.unitLabel}` : ''}</span> : null}</aside></div>{images.length > 1 && <div className="detail-gallery">{images.slice(1).map((image) => <img key={image.url} src={image.url} alt={image.alt ?? item.title} />)}</div>}{videos.length > 0 && <div className="video-list">{videos.map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer">Abrir vídeo do imóvel</a>)}</div>}</main>;
}

function InstitutionalPage({ page, onService }: { page: { kicker: string; title: string; lead: string; body: string[] }; onService: () => void }) {
  return <main className="institutional-page section-shell"><div className="page-intro"><p className="section-kicker">{page.kicker}</p><h1>{page.title}</h1><p className="section-lead">{page.lead}</p></div><div className="institutional-body">{page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><button className="primary-button" type="button" onClick={onService}>Solicitar atendimento</button></main>;
}

function OwnerCapture({ intent, onSubmit }: { intent: OwnerIntent; onSubmit: (payload: { intent: OwnerIntent; city: string; propertyType: string; contact: { name: string; email: string; whatsapp: string } }) => void | Promise<void> }) {
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await onSubmit({ intent, city: String(data.get('city') ?? ''), propertyType: String(data.get('propertyType') ?? ''), contact: { name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''), whatsapp: String(data.get('whatsapp') ?? '') } });
    setSubmitted(true);
  };
  return <main className="owner-page section-shell"><div className="page-intro"><p className="section-kicker">Captação de proprietário</p><h1>Quero {intent === 'vender' ? 'vender' : 'alugar'} meu imóvel</h1><p className="section-lead">Envie os dados iniciais. Nesta primeira versão, a equipe Hárpia conduz o processo manualmente.</p></div><form className="owner-form" onSubmit={handleSubmit}><label>Nome<input name="name" autoComplete="name" required /></label><label>E-mail<input name="email" type="email" autoComplete="email" required /></label><label>WhatsApp<input name="whatsapp" inputMode="tel" autoComplete="tel" required /></label><label>Cidade<input name="city" required /></label><label>Tipo de imóvel<input name="propertyType" required /></label><button className="primary-button" type="submit">Enviar solicitação</button>{submitted ? <p className="form-feedback">Solicitação registrada na interface. O encaminhamento real depende do contrato de CRM/WhatsApp configurado.</p> : null}</form></main>;
}
