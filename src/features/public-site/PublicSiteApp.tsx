import { FormEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { formatCurrency as formatConfiguredCurrency } from '../settings/regional-runtime';
import { ClientArea, type ClientProfileView } from '../client-area/ClientArea';
import {
  emptyPublicCatalogReader,
  type PublicCatalogFilterOptions,
  type PublicCatalogFilters,
  type PublicCatalogItem,
  type PublicCatalogReader,
} from '../public-catalog/contracts';
import { hasCatalogFilters, readCatalogFilters, writeCatalogFilters } from './catalogQuery';
import { HomeCatalogSearch } from './HomeCatalogSearch';
import {
  emitFront02LocationChange,
  FRONT02_LOCATION_EVENT,
  normalizeFront02PublicPath,
} from './routes';
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
  onConversion?: (event: PublicSiteConversion) => boolean | void | Promise<boolean | void>;
  internalAreaHref?: string;
}

type OwnerIntent = 'vender' | 'alugar';
type InstitutionalPageKey = 'sobre' | 'investimentos' | 'leiloes' | 'assessoria-juridica' | 'arquitetura';

type InstitutionalPage = {
  kicker: string;
  title: string;
  lead: string;
  body: string[];
};

const institutionalPages: Record<InstitutionalPageKey, InstitutionalPage> = {
  sobre: {
    kicker: 'Desde 1986',
    title: 'Inteligência patrimonial para decisões que atravessam gerações.',
    lead: 'A Hárpia Patrimonial & Co. é um escritório de inteligência patrimonial especializado em negócios imobiliários.',
    body: [
      'Enquanto o mercado negocia imóveis, a Hárpia orienta e gere decisões. O patrimônio é tratado como um organismo vivo, construído ao longo do tempo e transmitido através das escolhas certas.',
      'O compromisso é aconselhar e recomendar a decisão mais adequada, não apenas viabilizar a venda de um imóvel.',
      'A marca une inteligência patrimonial, bem viver, espírito explorador e tradição para construir relações duradouras e patrimônios que permanecem.',
    ],
  },
  investimentos: {
    kicker: 'Investimentos',
    title: 'Imóveis como parte de uma estratégia patrimonial mais ampla.',
    lead: 'A Hárpia atua com investimentos patrimoniais e negócios imobiliários orientados por contexto, objetivo e horizonte de decisão.',
    body: [
      'A proposta é analisar oportunidades dentro de uma visão de preservação, expansão e perpetuação do patrimônio.',
      'As oportunidades publicadas aparecerão nesta área a partir do catálogo real da plataforma, sem ofertas fictícias.',
    ],
  },
  leiloes: {
    kicker: 'Leilões & flipping',
    title: 'Aquisição, transformação e estratégia em operações imobiliárias.',
    lead: 'A operação da Hárpia contempla leilões e flipping, incluindo aquisição, reforma e posterior venda quando esse modelo fizer sentido para o cliente.',
    body: [
      'O atendimento combina leitura da oportunidade imobiliária com suporte das especialidades envolvidas em cada operação.',
      'Detalhes comerciais e oportunidades específicas serão exibidos somente quando houver dados reais cadastrados.',
    ],
  },
  'assessoria-juridica': {
    kicker: 'Assessoria Jurídica',
    title: 'Segurança jurídica integrada à jornada imobiliária.',
    lead: 'A assessoria jurídica faz parte da proposta de atendimento da Hárpia para apoiar decisões e operações imobiliárias.',
    body: [
      'Documentos e tratativas operacionais continuam prioritariamente pelo atendimento da equipe e pelo WhatsApp nesta primeira versão.',
      'A área pública apresenta o serviço sem transformar o portal do cliente em uma central documental complexa.',
    ],
  },
  arquitetura: {
    kicker: 'Arquitetura',
    title: 'Visão de patrimônio também passa pela forma de viver o imóvel.',
    lead: 'A experiência da Hárpia contempla arquitetura, reformas e obras como partes possíveis de uma solução patrimonial completa.',
    body: [
      'A parceria com a DUMU Arquitetura será destacada na experiência pública conforme os materiais reais e conteúdos finais forem incorporados.',
      'A estrutura está preparada para receber imagens, projetos e conteúdos aprovados sem inventar portfólio.',
    ],
  },
};

const emptyFilterOptions: PublicCatalogFilterOptions = {
  purposes: [],
  cities: [],
  locations: [],
  locationsByCity: {},
  lifestyleTags: [],
  minPrice: null,
  maxPrice: null,
};

function formatCurrency(value: number | null) {
  return value === null ? 'Sob consulta' : formatConfiguredCurrency(value, 0);
}

function publicFinalPrice(item: PublicCatalogItem) {
  if (item.price === null || !item.discountType || item.discountValue === undefined) return item.price;
  if (item.discountType === 'percentage') return Math.max(0, item.price * (1 - item.discountValue / 100));
  return Math.max(0, item.price - item.discountValue);
}

function currentLocation() {
  if (typeof window === 'undefined') return { pathname: '/', search: '' };
  return {
    pathname: normalizeFront02PublicPath(window.location.pathname || '/'),
    search: window.location.search,
  };
}

function decodePropertySlug(route: string): string | null {
  if (!route.startsWith('/imoveis/')) return '';
  const encoded = route.replace('/imoveis/', '');
  try {
    const decoded = decodeURIComponent(encoded).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function decodeProductSlug(route: string): string | null {
  if (!route.startsWith('/produtos/')) return '';
  const encoded = route.replace('/produtos/', '');
  try {
    const decoded = decodeURIComponent(encoded).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function deriveFilterOptions(items: PublicCatalogItem[]): PublicCatalogFilterOptions {
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const prices = items.map((item) => item.price).filter((value): value is number => value !== null);
  const locationsByCity = items.reduce<Record<string, string[]>>((accumulator, item) => {
    const city = item.city.trim();
    const location = item.location.trim();
    if (!city || !location) return accumulator;
    accumulator[city] = unique([...(accumulator[city] ?? []), location]);
    return accumulator;
  }, {});

  return {
    purposes: unique(items.map((item) => item.purpose)),
    cities: unique(items.map((item) => item.city)),
    locations: unique(items.map((item) => item.location)),
    locationsByCity,
    lifestyleTags: unique(items.flatMap((item) => item.lifestyleTags ?? [])),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

function RetentionDialog({ onClose, onAccept }: { onClose: () => void; onAccept: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="retention-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="retention-modal" role="dialog" aria-modal="true" aria-labelledby="retention-title" aria-describedby="retention-description" onMouseDown={(event) => event.stopPropagation()}>
        <button ref={closeRef} className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        <p className="section-kicker">Antes de sair</p>
        <h2 id="retention-title">Não encontrou o imóvel ou a oportunidade certa?</h2>
        <p id="retention-description">Conte o que procura. A proposta da Hárpia é orientar a decisão, não apenas mostrar uma lista de imóveis.</p>
        <button className="primary-button" type="button" onClick={onAccept}>Quero ser atendido</button>
      </section>
    </div>
  );
}

export default function PublicSiteApp({ catalog = emptyPublicCatalogReader, auth, favorites, onConversion, internalAreaHref = '/interno' }: PublicSiteAppProps) {
  const initialLocation = currentLocation();
  const [route, setRoute] = useState(initialLocation.pathname);
  const [items, setItems] = useState<PublicCatalogItem[]>([]);
  const [homeProducts, setHomeProducts] = useState<PublicCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [productError, setProductError] = useState('');
  const [notice, setNotice] = useState('');
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retentionSeen, setRetentionSeen] = useState(false);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [filters, setFilters] = useState<PublicCatalogFilters>(() => initialLocation.pathname === '/imoveis' ? readCatalogFilters(initialLocation.search) : {});
  const [filterOptions, setFilterOptions] = useState<PublicCatalogFilterOptions>(emptyFilterOptions);

  useEffect(() => {
    const syncLocation = () => {
      const location = currentLocation();
      setRoute(location.pathname);
      setFilters(location.pathname === '/imoveis' ? readCatalogFilters(location.search) : {});
    };
    window.addEventListener('popstate', syncLocation);
    window.addEventListener(FRONT02_LOCATION_EVENT, syncLocation);
    return () => {
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener(FRONT02_LOCATION_EVENT, syncLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadOptions = async () => {
      try {
        if (catalog.getFilterOptions) {
          const options = await catalog.getFilterOptions();
          if (active) setFilterOptions(options);
          return;
        }
        const allItems = await catalog.listPublished({ itemType: 'property' });
        if (active) setFilterOptions(deriveFilterOptions(allItems));
      } catch {
        try {
          const allItems = await catalog.listPublished({ itemType: 'property' });
          if (active) setFilterOptions(deriveFilterOptions(allItems));
        } catch {
          if (active) setFilterOptions(emptyFilterOptions);
        }
      }
    };
    void loadOptions();
    return () => { active = false; };
  }, [catalog, catalogRevision]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCatalogError('');
    const query: PublicCatalogFilters = route === '/imoveis'
      ? { ...filters, itemType: 'property' }
      : route === '/produtos'
        ? { itemType: 'product' }
        : { itemType: 'property' };
    catalog.listPublished(query)
      .then((result) => { if (active) setItems(result); })
      .catch(() => { if (active) setCatalogError('Não foi possível carregar o catálogo agora.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [catalog, catalogRevision, filters, route]);

  useEffect(() => {
    let active = true;
    setProductLoading(true);
    setProductError('');
    catalog.listPublished({ itemType: 'product' })
      .then((result) => { if (active) setHomeProducts(result); })
      .catch(() => { if (active) setProductError('Não foi possível carregar os produtos agora.'); })
      .finally(() => { if (active) setProductLoading(false); });
    return () => { active = false; };
  }, [catalog, catalogRevision]);

  useEffect(() => {
    if (route !== '/imoveis') return;
    const next = `/imoveis${writeCatalogFilters(filters)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === next) return;
    window.history.replaceState({}, '', next);
    emitFront02LocationChange();
  }, [filters, route]);

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

  const reloadCatalog = () => setCatalogRevision((revision) => revision + 1);

  const navigate = (path: string) => {
    const target = new URL(path, window.location.origin);
    const current = `${window.location.pathname}${window.location.search}`;
    const next = `${target.pathname}${target.search}`;
    if (current === next) return;
    window.history.pushState({}, '', next);
    emitFront02LocationChange();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const intercept = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(path);
  };

  const requestLogin = (reason: string) => {
    if (auth) return auth.requestLogin(reason);
    setNotice('Login e cadastro aguardam a integração do contrato de autenticação da Frente01.');
  };

  const emitConversion = async (event: PublicSiteConversion): Promise<boolean> => {
    if (!onConversion) {
      setNotice('Atendimento e criação de lead aguardam integração com CRM/WhatsApp. Nenhuma mensagem foi simulada.');
      return false;
    }
    try {
      const accepted = await onConversion(event);
      return accepted !== false;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Não foi possível registrar o atendimento agora.');
      return false;
    }
  };

  const requestService = (service: string) => { void emitConversion({ source: 'site-publico', action: 'solicitar-atendimento', page: route, service }); };
  const propertySlug = decodePropertySlug(route);
  const productSlug = decodeProductSlug(route);

  return (
    <div className="harpia-public">
      <header className="public-header">
        <a className="brand" href="/" onClick={intercept('/')} aria-label="Hárpia Patrimonial - início"><span className="brand-mark">H</span><span><strong>HÁRPIA</strong><small>PATRIMONIAL & CO.</small></span></a>
        <nav className="public-nav" aria-label="Navegação principal">
          <a href="/sobre" onClick={intercept('/sobre')}>Sobre</a><a href="/produtos" onClick={intercept('/produtos')}>Produtos</a><a href="/investimentos" onClick={intercept('/investimentos')}>Investimentos</a><a href="/leiloes" onClick={intercept('/leiloes')}>Leilões</a><a href="/assessoria-juridica" onClick={intercept('/assessoria-juridica')}>Assessoria Jurídica</a><a href="/arquitetura" onClick={intercept('/arquitetura')}>Arquitetura</a>
        </nav>
        <div className="header-actions">
          <a className="quiet-link" href="/cliente" onClick={intercept('/cliente')}>Minha conta</a>
          <a className="quiet-link" href={internalAreaHref}>Área Interna</a>
          <button className="header-cta" type="button" onClick={() => requestService('Atendimento consultivo')}>Ser Atendido Agora!</button>
        </div>
      </header>

      {notice && <div className="integration-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Fechar aviso">×</button></div>}

      {route === '/' && <HomePage items={items} products={homeProducts} loading={loading} productLoading={productLoading} error={catalogError} productError={productError} filterOptions={filterOptions} onNavigate={navigate} onService={requestService} onRetry={reloadCatalog} onFavorite={(item) => { if (!auth?.currentClient) return requestLogin('favoritar-imovel'); if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.'); return favorites.toggle(item); }} isFavorite={(id) => favorites?.isFavorite(id) ?? false} />}

      {route === '/imoveis' && <CatalogPage items={items} loading={loading} error={catalogError} filters={filters} options={filterOptions} onFilters={setFilters} onOpen={(slug) => navigate(`/imoveis/${encodeURIComponent(slug)}`)} onRetry={reloadCatalog} onFavorite={(item) => { if (!auth?.currentClient) return requestLogin('favoritar-imovel'); if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.'); return favorites.toggle(item); }} isFavorite={(id) => favorites?.isFavorite(id) ?? false} />}

      {route === '/produtos' && <ProductCatalogPage items={items} loading={loading} error={catalogError} onOpen={(slug) => navigate(`/produtos/${encodeURIComponent(slug)}`)} onRetry={reloadCatalog} />}

      {propertySlug === null && <main className="section-shell property-detail"><div className="error-state"><strong>Endereço de imóvel inválido.</strong><p>Volte ao catálogo e escolha um imóvel publicado.</p><button className="secondary-button" type="button" onClick={() => navigate('/imoveis')}>Voltar ao catálogo</button></div></main>}

      {typeof propertySlug === 'string' && propertySlug && <PropertyDetail slug={propertySlug} catalog={catalog} isFavorite={(id) => favorites?.isFavorite(id) ?? false} onBack={() => navigate('/imoveis')} onNavigate={navigate} onFavorite={(item) => { if (!auth?.currentClient) return requestLogin('favoritar-imovel'); if (!favorites) return setNotice('Persistência de favoritos aguarda integração da conta com o catálogo real.'); return favorites.toggle(item); }} onService={(item) => emitConversion({ source: 'site-publico', action: 'atendimento-imovel', page: route, service: 'Atendimento consultivo', propertyId: item.id, propertySlug: item.slug })} />}

      {productSlug === null && <main className="section-shell property-detail"><div className="error-state"><strong>Endereço de produto inválido.</strong><p>Volte aos produtos e escolha um item publicado.</p><button className="secondary-button" type="button" onClick={() => navigate('/produtos')}>Voltar aos produtos</button></div></main>}

      {typeof productSlug === 'string' && productSlug && <ProductDetail slug={productSlug} catalog={catalog} onBack={() => navigate('/produtos')} onService={(item) => emitConversion({ source: 'site-publico', action: 'atendimento-produto', page: route, service: item.title, metadata: { productId: item.id, productSlug: item.slug } })} />}

      {(['sobre', 'investimentos', 'leiloes', 'assessoria-juridica', 'arquitetura'] as InstitutionalPageKey[]).map((key) => route === `/${key}` && <InstitutionalPage key={key} page={institutionalPages[key]} onService={() => requestService(institutionalPages[key].kicker)} />)}

      {(route === '/vender' || route === '/alugar') && <OwnerCapture intent={route === '/vender' ? 'vender' : 'alugar'} onSubmit={(payload) => emitConversion({ source: 'captacao-proprietario', action: payload.intent, page: route, service: payload.intent === 'vender' ? 'Venda de imóvel' : 'Locação de imóvel', contact: payload.contact, metadata: { city: payload.city, propertyType: payload.propertyType } })} />}

      {route === '/cliente' && <ClientArea profile={auth?.currentClient ?? null} favorites={favorites?.items ?? []} onRequestLogin={() => requestLogin('area-do-cliente')} onOpenProperty={(slug) => navigate(`/imoveis/${encodeURIComponent(slug)}`)} onGoToCatalog={() => navigate('/imoveis')} onRequestService={requestService} />}

      <footer className="public-footer"><div><strong>HÁRPIA PATRIMONIAL & CO.</strong><p>Inteligência patrimonial especializada em negócios imobiliários.</p></div><div className="footer-links"><a href="/imoveis" onClick={intercept('/imoveis')}>Imóveis</a><a href="/produtos" onClick={intercept('/produtos')}>Produtos</a><a href="/vender" onClick={intercept('/vender')}>Quero vender meu imóvel</a><a href="/alugar" onClick={intercept('/alugar')}>Quero alugar meu imóvel</a><a href="/cliente" onClick={intercept('/cliente')}>Área do cliente</a></div></footer>

      {retentionOpen && <RetentionDialog onClose={() => setRetentionOpen(false)} onAccept={() => { setRetentionOpen(false); requestService('Retenção de comprador'); }} />}
    </div>
  );
}

function HomePage({ items, products, loading, productLoading, error, productError, filterOptions, onNavigate, onService, onRetry, onFavorite, isFavorite }: { items: PublicCatalogItem[]; products: PublicCatalogItem[]; loading: boolean; productLoading: boolean; error: string; productError: string; filterOptions: PublicCatalogFilterOptions; onNavigate: (path: string) => void; onService: (service: string) => void; onRetry: () => void; onFavorite: (item: PublicCatalogItem) => void | Promise<void>; isFavorite: (id: string) => boolean; }) {
  return (
    <main>
      <section className="hero section-shell"><div className="hero-copy"><p className="hero-kicker">Inteligência patrimonial · tradição desde 1986</p><h1>Decisões imobiliárias pensadas para o presente e para o que permanece.</h1><p>A Hárpia orienta negócios imobiliários, investimentos e decisões patrimoniais com uma visão que vai além da transação.</p><div className="hero-actions"><button className="primary-button" type="button" onClick={() => onNavigate('/imoveis')}>Explorar imóveis</button><button className="secondary-button" type="button" onClick={() => onService('Atendimento consultivo')}>Falar com a Hárpia</button></div></div><aside className="hero-search" aria-label="Busca de imóveis"><HomeCatalogSearch options={filterOptions} onNavigate={onNavigate} /></aside></section>
      <section className="manifesto section-shell"><p className="section-kicker">Hárpia Patrimonial & Co.</p><blockquote>“Enquanto o mercado negocia imóveis, nós orientamos e gerimos decisões.”</blockquote><p>Patrimônio é mais do que o que se possui. É a capacidade de transformar recursos em liberdade, escolhas em legado e imóveis em ativos que atravessam gerações.</p></section>
      <section className="section-shell"><div className="section-heading"><div><p className="section-kicker">Catálogo</p><h2>Imóveis e oportunidades publicados</h2></div><button className="text-button" type="button" onClick={() => onNavigate('/imoveis')}>Ver catálogo completo</button></div><PropertyGrid items={items.slice(0, 6)} loading={loading} error={error} onOpen={(slug) => onNavigate(`/imoveis/${encodeURIComponent(slug)}`)} onRetry={onRetry} onFavorite={onFavorite} isFavorite={isFavorite} /></section>
      {products.length > 0 || productLoading || productError ? <section className="section-shell"><div className="section-heading"><div><p className="section-kicker">Produtos</p><h2>Produtos disponíveis</h2></div><button className="text-button" type="button" onClick={() => onNavigate('/produtos')}>Ver todos os produtos</button></div><ProductGrid items={products.slice(0, 6)} loading={productLoading} error={productError} onOpen={(slug) => onNavigate(`/produtos/${encodeURIComponent(slug)}`)} onRetry={onRetry} /></section> : null}
      <section className="lifestyle-section section-shell"><div className="section-heading"><div><p className="section-kicker">Encontre pelo estilo de vida</p><h2>O imóvel certo também depende de como você quer viver.</h2></div></div>{filterOptions.lifestyleTags.length === 0 ? <div className="empty-state"><strong>As categorias aparecerão com o catálogo real.</strong><p>A experiência já está preparada para usar classificações reais dos imóveis publicados, sem categorias fictícias.</p></div> : <div className="lifestyle-tags">{filterOptions.lifestyleTags.map((tag) => <button key={tag} type="button" onClick={() => onNavigate(`/imoveis?estilo=${encodeURIComponent(tag)}`)}>{tag}</button>)}</div>}</section>
      <section className="service-grid section-shell">{[['Investimentos', 'Estratégia imobiliária dentro de uma visão patrimonial.', '/investimentos'], ['Leilões & flipping', 'Aquisição, transformação e operação de ativos imobiliários.', '/leiloes'], ['Assessoria Jurídica', 'Apoio jurídico integrado à jornada imobiliária.', '/assessoria-juridica'], ['Arquitetura', 'Arquitetura, reformas e soluções ligadas ao bem viver.', '/arquitetura']].map(([title, copy, path]) => <article className="service-card" key={title}><p className="section-kicker">Serviço</p><h3>{title}</h3><p>{copy}</p><button className="text-button" type="button" onClick={() => onNavigate(path)}>Conhecer <span>→</span></button></article>)}</section>
      <section className="duo-section section-shell"><article><p className="section-kicker">DUMU Arquitetura</p><h2>Patrimônio, espaço e bem viver.</h2><p>A experiência está preparada para destacar a parceria com a DUMU Arquitetura assim que as imagens e materiais finais forem incorporados.</p><button className="text-button" type="button" onClick={() => onNavigate('/arquitetura')}>Ver arquitetura</button></article><article><p className="section-kicker">Atendimento consultivo</p><h2>Não é só encontrar um imóvel. É entender a decisão.</h2><p>A principal proposta da Hárpia é orientar o cliente com visão integrada dos aspectos imobiliários, patrimoniais e dos serviços envolvidos.</p><button className="primary-button" type="button" onClick={() => onService('Atendimento consultivo')}>Ser atendido agora</button></article></section>
      <section className="owner-strip section-shell"><div><p className="section-kicker">Proprietários</p><h2>Quer vender ou alugar um imóvel?</h2><p>Envie os dados iniciais e a equipe assume o atendimento manual.</p></div><div className="hero-actions"><button className="secondary-button" type="button" onClick={() => onNavigate('/vender')}>Quero vender</button><button className="secondary-button" type="button" onClick={() => onNavigate('/alugar')}>Quero alugar</button></div></section>
    </main>
  );
}

function CatalogPage({ items, loading, error, filters, options, onFilters, onOpen, onRetry, onFavorite, isFavorite }: { items: PublicCatalogItem[]; loading: boolean; error: string; filters: PublicCatalogFilters; options: PublicCatalogFilterOptions; onFilters: (filters: PublicCatalogFilters) => void; onOpen: (slug: string) => void; onRetry: () => void; onFavorite: (item: PublicCatalogItem) => void | Promise<void>; isFavorite: (id: string) => boolean; }) {
  const locationOptions = filters.city && options.locationsByCity
    ? options.locationsByCity[filters.city] ?? []
    : options.locations;
  const noLocationsForCity = Boolean(filters.city) && locationOptions.length === 0;

  return <main className="section-shell catalog-page"><div className="page-intro"><p className="section-kicker">Catálogo Hárpia</p><h1>Imóveis publicados</h1><p className="section-lead">Os filtros refletem somente dados reais disponibilizados pelo catálogo interno.</p></div><div className="filter-grid"><label>Finalidade<select value={filters.purpose ?? ''} onChange={(event) => onFilters({ ...filters, purpose: event.target.value || undefined })}><option value="">Todas</option>{options.purposes.map((value) => <option key={value}>{value}</option>)}</select></label><label>Cidade<select value={filters.city ?? ''} onChange={(event) => onFilters({ ...filters, city: event.target.value || undefined, location: undefined })}><option value="">Todas</option>{options.cities.map((value) => <option key={value}>{value}</option>)}</select></label><label>Localização<select value={filters.location ?? ''} disabled={noLocationsForCity} onChange={(event) => onFilters({ ...filters, location: event.target.value || undefined })}><option value="">{noLocationsForCity ? 'Sem localizações publicadas' : 'Todas'}</option>{locationOptions.map((value) => <option key={value}>{value}</option>)}</select></label><label>Lançamento<select value={filters.launch === undefined ? '' : String(filters.launch)} onChange={(event) => onFilters({ ...filters, launch: event.target.value === '' ? undefined : event.target.value === 'true' })}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></label><label>Preço mínimo<input type="number" min="0" inputMode="numeric" value={filters.minPrice ?? ''} placeholder={options.minPrice === null ? 'Sem mínimo' : formatCurrency(options.minPrice)} onChange={(event) => onFilters({ ...filters, minPrice: event.target.value ? Number(event.target.value) : undefined })} /></label><label>Preço máximo<input type="number" min="0" inputMode="numeric" value={filters.maxPrice ?? ''} placeholder={options.maxPrice === null ? 'Sem máximo' : formatCurrency(options.maxPrice)} onChange={(event) => onFilters({ ...filters, maxPrice: event.target.value ? Number(event.target.value) : undefined })} /></label>{options.lifestyleTags.length > 0 && <label>Estilo de vida<select value={filters.lifestyleTag ?? ''} onChange={(event) => onFilters({ ...filters, lifestyleTag: event.target.value || undefined })}><option value="">Todos</option>{options.lifestyleTags.map((value) => <option key={value}>{value}</option>)}</select></label>}</div><div className="catalog-toolbar" aria-live="polite"><span>{loading ? 'Atualizando resultados…' : `${items.length} ${items.length === 1 ? 'resultado' : 'resultados'}`}</span>{hasCatalogFilters(filters) && <button className="text-button" type="button" onClick={() => onFilters({})}>Limpar filtros</button>}</div><PropertyGrid items={items} loading={loading} error={error} onOpen={onOpen} onRetry={onRetry} onFavorite={onFavorite} isFavorite={isFavorite} /></main>;
}

function PropertyGrid({ items, loading, error, onOpen, onRetry, onFavorite, isFavorite }: { items: PublicCatalogItem[]; loading: boolean; error: string; onOpen: (slug: string) => void; onRetry: () => void; onFavorite: (item: PublicCatalogItem) => void | Promise<void>; isFavorite: (id: string) => boolean; }) {
  if (loading) return <div className="loading-state">Carregando catálogo…</div>;
  if (error) return <div className="error-state"><strong>Não foi possível carregar o catálogo.</strong><span>{error}</span><button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button></div>;
  if (items.length === 0) return <div className="empty-state"><strong>Nenhum imóvel encontrado.</strong><p>Revise os filtros ou aguarde novos imóveis publicados no catálogo real.</p></div>;
  return <div className="property-grid">{items.map((item) => { const cover = item.media.find((media) => media.type === 'image'); const saved = isFavorite(item.id); return <article className="property-card" key={item.id}><div className="property-media">{cover ? <img src={cover.url} alt={cover.alt ?? item.title} loading="lazy" /> : <span>Imagem não disponível</span>}<button className="favorite-button" type="button" aria-pressed={saved} aria-label={saved ? 'Remover dos favoritos' : 'Salvar imóvel'} onClick={() => onFavorite(item)}>{saved ? '♥' : '♡'}</button></div><div className="property-body"><small>{item.propertyType} · {item.purpose}</small><h3>{item.title}</h3><p>{item.location}, {item.city}</p><strong>{formatCurrency(item.price)}</strong><div className="property-meta">{item.privateAreaM2 ? <span>{item.privateAreaM2} m²</span> : null}{item.bedrooms ? <span>{item.bedrooms} quartos</span> : null}{item.parkingSpaces ? <span>{item.parkingSpaces} vagas</span> : null}<span>{item.status === 'sold' ? 'Vendido' : 'Publicado'}</span></div><button className="text-button" type="button" onClick={() => onOpen(item.slug)}>Ver detalhes <span>→</span></button></div></article>; })}</div>;
}

function ProductCatalogPage({ items, loading, error, onOpen, onRetry }: { items: PublicCatalogItem[]; loading: boolean; error: string; onOpen: (slug: string) => void; onRetry: () => void; }) {
  return (
    <main className="section-shell catalog-page">
      <div className="page-intro">
        <p className="section-kicker">Produtos</p>
        <h1>Produtos disponíveis</h1>
        <p className="section-lead">Somente produtos marcados como visíveis na área interna aparecem aqui.</p>
      </div>
      <div className="catalog-toolbar" aria-live="polite">
        <span>{loading ? 'Atualizando produtos...' : `${items.length} ${items.length === 1 ? 'produto' : 'produtos'}`}</span>
      </div>
      <ProductGrid items={items} loading={loading} error={error} onOpen={onOpen} onRetry={onRetry} />
    </main>
  );
}

function ProductGrid({ items, loading, error, onOpen, onRetry }: { items: PublicCatalogItem[]; loading: boolean; error: string; onOpen: (slug: string) => void; onRetry: () => void; }) {
  if (loading) return <div className="loading-state">Carregando produtos...</div>;
  if (error) return <div className="error-state"><strong>Não foi possível carregar os produtos.</strong><span>{error}</span><button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button></div>;
  if (items.length === 0) return <div className="empty-state"><strong>Nenhum produto disponível.</strong><p>Os produtos aparecem aqui quando forem marcados como visíveis na área interna.</p></div>;

  return (
    <div className="property-grid">
      {items.map((item) => {
        const cover = item.media.find((media) => media.type === 'image');
        const finalPrice = publicFinalPrice(item);
        const hasDiscount = item.price !== null && finalPrice !== item.price;
        return (
          <article className="property-card" key={item.id}>
            <div className="property-media">
              {cover ? <img src={cover.url} alt={cover.alt ?? item.title} loading="lazy" /> : <span>Imagem não disponível</span>}
            </div>
            <div className="property-body">
              <small>Produto</small>
              <h3>{item.title}</h3>
              {item.description ? <p>{item.description}</p> : null}
              {hasDiscount ? <small style={{ textDecoration: 'line-through' }}>{formatCurrency(item.price)}</small> : null}
              <strong>{formatCurrency(finalPrice)}</strong>
              {item.tags?.length ? <div className="property-meta">{item.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
              <button className="text-button" type="button" onClick={() => onOpen(item.slug)}>Ver produto <span>→</span></button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProductDetail({ slug, catalog, onBack, onService }: { slug: string; catalog: PublicCatalogReader; onBack: () => void; onService: (item: PublicCatalogItem) => void | Promise<boolean>; }) {
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    catalog.getPublishedBySlug(slug)
      .then((result) => {
        if (!active) return;
        setItem(result && result.itemType !== 'property' ? result : null);
      })
      .catch(() => { if (active) setError('Não foi possível carregar este produto.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [catalog, revision, slug]);

  if (loading) return <main className="section-shell"><div className="loading-state">Carregando produto...</div></main>;
  if (error) return <main className="section-shell"><div className="error-state"><strong>Não foi possível carregar este produto.</strong><span>{error}</span><button className="secondary-button" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button><button className="text-button" type="button" onClick={onBack}>Voltar aos produtos</button></div></main>;
  if (!item) return <main className="section-shell"><div className="empty-state"><strong>Produto não encontrado ou não publicado.</strong><p>Somente produtos marcados como visíveis aparecem no site.</p><button className="secondary-button" type="button" onClick={onBack}>Voltar aos produtos</button></div></main>;

  const images = item.media.filter((media) => media.type === 'image');
  const videos = item.media.filter((media) => media.type === 'video');
  const finalPrice = publicFinalPrice(item);
  const hasDiscount = item.price !== null && finalPrice !== item.price;

  return (
    <main className="section-shell property-detail">
      <button className="text-button" type="button" onClick={onBack}>← Voltar aos produtos</button>
      <div className="detail-hero">
        <div className="detail-copy">
          <p className="section-kicker">Produto</p>
          <h1>{item.title}</h1>
          {hasDiscount ? <small style={{ textDecoration: 'line-through' }}>{formatCurrency(item.price)}</small> : null}
          <strong className="detail-price">{formatCurrency(finalPrice)}</strong>
          {item.tags?.length ? <div className="feature-list">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => void onService(item)}>Quero saber mais</button>
          </div>
        </div>
        <div className="detail-cover">
          {images[0] ? <img src={images[0].url} alt={images[0].alt ?? item.title} /> : <span>Imagem não disponível</span>}
        </div>
      </div>

      <div className="detail-grid">
        <article>
          <p className="section-kicker">Sobre o produto</p>
          <h2>Descrição</h2>
          <p>{item.description || 'Descrição ainda não cadastrada.'}</p>
        </article>
        <aside className="detail-facts">
          <strong>Informações</strong>
          {item.code ? <span>Código: {item.code}</span> : null}
          <span>Status: Disponível</span>
        </aside>
      </div>

      {images.length > 1 && (
        <div className="detail-gallery">
          {images.slice(1).map((image) => <img loading="lazy" key={image.url} src={image.url} alt={image.alt ?? item.title} />)}
        </div>
      )}

      {videos.length > 0 && (
        <div className="video-list">
          {videos.map((video) => <video key={video.url} controls preload="metadata" src={video.url} />)}
        </div>
      )}
    </main>
  );
}

function PropertyDetail({ slug, catalog, isFavorite, onBack, onNavigate, onFavorite, onService }: { slug: string; catalog: PublicCatalogReader; isFavorite: (id: string) => boolean; onBack: () => void; onNavigate: (path: string) => void; onFavorite: (item: PublicCatalogItem) => void | Promise<void>; onService: (item: PublicCatalogItem) => void | Promise<boolean>; }) {
  const [item, setItem] = useState<PublicCatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    catalog.getPublishedBySlug(slug)
      .then((result) => { if (active) setItem(result); })
      .catch(() => { if (active) setError('Não foi possível carregar este imóvel.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [catalog, revision, slug]);

  if (loading) return <main className="section-shell"><div className="loading-state">Carregando imóvel…</div></main>;
  if (error) return <main className="section-shell"><div className="error-state"><strong>Não foi possível carregar este imóvel.</strong><span>{error}</span><button className="secondary-button" type="button" onClick={() => setRevision((value) => value + 1)}>Tentar novamente</button><button className="text-button" type="button" onClick={onBack}>Voltar ao catálogo</button></div></main>;
  if (!item) return <main className="section-shell"><div className="empty-state"><strong>Imóvel não encontrado ou não publicado.</strong><p>O catálogo público só exibe itens reais em estado publicado.</p><button className="secondary-button" type="button" onClick={onBack}>Voltar ao catálogo</button></div></main>;
  const images = item.media.filter((media) => media.type === 'image'); const videos = item.media.filter((media) => media.type === 'video');
  return <main className="section-shell property-detail"><button className="text-button" type="button" onClick={onBack}>← Voltar ao catálogo</button><div className="detail-hero"><div className="detail-copy"><p className="section-kicker">{item.propertyType} · {item.purpose}</p><h1>{item.title}</h1><p>{item.location}, {item.city}</p><strong className="detail-price">{formatCurrency(item.price)}</strong><div className="hero-actions"><button className="primary-button" type="button" onClick={() => void onService(item)}>Quero atendimento</button><button className="secondary-button" type="button" aria-pressed={isFavorite(item.id)} onClick={() => onFavorite(item)}>{isFavorite(item.id) ? 'Remover dos favoritos' : 'Salvar imóvel'}</button></div></div><div className="detail-cover">{images[0] ? <img src={images[0].url} alt={images[0].alt ?? item.title} /> : <span>Imagem não disponível</span>}</div></div><div className="detail-grid"><article><p className="section-kicker">Sobre o imóvel</p><h2>Características</h2><p>{item.description || 'Descrição ainda não cadastrada no catálogo publicado.'}</p><div className="feature-list">{item.features?.length ? item.features.map((feature) => <span key={feature}>{feature}</span>) : <span>Características detalhadas ainda não cadastradas.</span>}</div></article><aside className="detail-facts"><strong>Informações</strong>{item.privateAreaM2 ? <span>Área privativa: {item.privateAreaM2} m²</span> : null}{item.bedrooms ? <span>Quartos: {item.bedrooms}</span> : null}{item.suites ? <span>Suítes: {item.suites}</span> : null}{item.bathrooms ? <span>Banheiros: {item.bathrooms}</span> : null}{item.parkingSpaces ? <span>Vagas: {item.parkingSpaces}</span> : null}<span>Status: {item.status === 'sold' ? 'Vendido' : 'Publicado'}</span>{item.development ? <span>Empreendimento: {item.development.title}{item.development.unitLabel ? ` · ${item.development.unitLabel}` : ''}</span> : null}</aside></div>{images.length > 1 && <div className="detail-gallery">{images.slice(1).map((image) => <img loading="lazy" key={image.url} src={image.url} alt={image.alt ?? item.title} />)}</div>}{videos.length > 0 && <div className="video-list">{videos.map((video) => <a key={video.url} href={video.url} target="_blank" rel="noreferrer">Abrir vídeo do imóvel</a>)}</div>}<section className="property-related-services"><div><p className="section-kicker">Serviços relacionados</p><h2>Uma decisão imobiliária pode envolver mais do que o imóvel.</h2></div><div>{[['Investimentos', '/investimentos'], ['Assessoria Jurídica', '/assessoria-juridica'], ['Arquitetura', '/arquitetura']].map(([label, path]) => <button type="button" key={path} onClick={() => onNavigate(path)}><strong>{label}</strong><span>Conhecer serviço →</span></button>)}</div></section></main>;
}

function InstitutionalPage({ page, onService }: { page: InstitutionalPage; onService: () => void }) { return <main className="institutional-page section-shell"><div className="page-intro"><p className="section-kicker">{page.kicker}</p><h1>{page.title}</h1><p className="section-lead">{page.lead}</p></div><div className="institutional-body">{page.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><button className="primary-button" type="button" onClick={onService}>Solicitar atendimento</button></main>; }

function OwnerCapture({ intent, onSubmit }: { intent: OwnerIntent; onSubmit: (payload: { intent: OwnerIntent; city: string; propertyType: string; contact: { name: string; email: string; whatsapp: string } }) => Promise<boolean>; }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle'); const [feedback, setFeedback] = useState('');
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setStatus('busy'); setFeedback(''); const accepted = await onSubmit({ intent, city: String(data.get('city') ?? '').trim(), propertyType: String(data.get('propertyType') ?? '').trim(), contact: { name: String(data.get('name') ?? '').trim(), email: String(data.get('email') ?? '').trim(), whatsapp: String(data.get('whatsapp') ?? '').trim() } }); if (!accepted) { setStatus('error'); setFeedback('A solicitação ainda não foi encaminhada. Tente novamente quando o atendimento estiver disponível.'); return; } form.reset(); setStatus('success'); setFeedback('Solicitação registrada com sucesso. A equipe poderá continuar o atendimento com o contexto enviado.'); };
  return <main className="owner-page section-shell"><div className="page-intro"><p className="section-kicker">Captação de proprietário</p><h1>Quero {intent === 'vender' ? 'vender' : 'alugar'} meu imóvel</h1><p className="section-lead">Envie os dados iniciais. Nesta primeira versão, a equipe Hárpia conduz o processo manualmente.</p></div><form className="owner-form" onSubmit={handleSubmit} aria-busy={status === 'busy'}><label>Nome<input name="name" autoComplete="name" required disabled={status === 'busy'} /></label><label>E-mail <small>opcional</small><input name="email" type="email" autoComplete="email" disabled={status === 'busy'} /></label><label>WhatsApp<input name="whatsapp" inputMode="tel" autoComplete="tel" required disabled={status === 'busy'} /></label><label>Cidade<input name="city" required disabled={status === 'busy'} /></label><label>Tipo de imóvel<input name="propertyType" required disabled={status === 'busy'} /></label><button className="primary-button" type="submit" disabled={status === 'busy'}>{status === 'busy' ? 'Enviando…' : 'Enviar solicitação'}</button>{feedback ? <p className={status === 'error' ? 'form-feedback form-feedback--error' : 'form-feedback'} role={status === 'error' ? 'alert' : 'status'}>{feedback}</p> : null}</form></main>;
}
