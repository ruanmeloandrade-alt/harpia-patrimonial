import type { PublicCatalogItem } from '../public-catalog/contracts';

export interface ClientProfileView {
  name: string;
  email: string;
  whatsapp: string;
}

export interface ClientInterestView {
  id: string;
  label: string;
  type?: string;
  detail?: string;
}

export interface ClientHistoryView {
  id: string;
  title: string;
  detail?: string;
  occurredAt?: string;
  propertySlug?: string;
}

export interface ClientAreaDataView {
  interests: ClientInterestView[];
  history: ClientHistoryView[];
}

interface ClientAreaProps {
  profile: ClientProfileView | null;
  favorites: PublicCatalogItem[];
  data?: ClientAreaDataView;
  dataLoading?: boolean;
  dataError?: string;
  onRequestLogin: () => void;
  onOpenProperty: (slug: string) => void;
  onGoToCatalog: () => void;
  onRequestService: (service: string) => void;
}

function formatHistoryDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ClientArea({
  profile,
  favorites,
  data = { interests: [], history: [] },
  dataLoading = false,
  dataError = '',
  onRequestLogin,
  onOpenProperty,
  onGoToCatalog,
  onRequestService,
}: ClientAreaProps) {
  if (!profile) {
    return (
      <section className="client-gate section-shell" aria-labelledby="client-gate-title">
        <p className="section-kicker">Área do cliente</p>
        <h1 id="client-gate-title">Seu patrimônio, interesses e imóveis salvos em um só lugar.</h1>
        <p className="section-lead">
          Entre ou crie sua conta para salvar imóveis e manter seu contexto de interesse com a Hárpia.
        </p>
        <button className="primary-button" type="button" onClick={onRequestLogin}>
          Entrar ou criar conta
        </button>
      </section>
    );
  }

  return (
    <section className="client-area section-shell" aria-labelledby="client-area-title">
      <header className="client-area__header">
        <div>
          <p className="section-kicker">Área do cliente</p>
          <h1 id="client-area-title">Olá, {profile.name}.</h1>
          <p className="section-lead">Acompanhe seus imóveis salvos e acesse os serviços da Hárpia.</p>
        </div>
        <div className="profile-card" aria-label="Dados do perfil">
          <strong>{profile.name}</strong>
          <span>{profile.email}</span>
          <span>{profile.whatsapp}</span>
        </div>
      </header>

      {dataError ? <div className="error-state client-data-error" role="alert">{dataError}</div> : null}

      <div className="client-grid" aria-busy={dataLoading}>
        <article className="client-panel client-panel--wide">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Favoritos</p>
              <h2>Imóveis salvos</h2>
            </div>
            <button className="text-button" type="button" onClick={onGoToCatalog}>
              Ver catálogo
            </button>
          </div>

          {favorites.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum imóvel salvo ainda.</strong>
              <p>Explore o catálogo e salve oportunidades que façam sentido para seus objetivos.</p>
              <button className="secondary-button" type="button" onClick={onGoToCatalog}>
                Explorar imóveis
              </button>
            </div>
          ) : (
            <div className="favorite-list">
              {favorites.map((item) => (
                <button
                  className="favorite-row"
                  type="button"
                  key={item.id}
                  onClick={() => onOpenProperty(item.slug)}
                >
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.location}, {item.city}</small>
                  </span>
                  <span>Ver imóvel</span>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="client-panel">
          <p className="section-kicker">Interesses</p>
          <h2>Seu contexto patrimonial</h2>
          {dataLoading ? (
            <div className="loading-state empty-state--compact">Carregando interesses…</div>
          ) : data.interests.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <strong>Nenhum interesse registrado.</strong>
              <p>Os interesses aparecerão aqui quando houver dados reais vinculados à sua conta.</p>
            </div>
          ) : (
            <div className="client-record-list">
              {data.interests.map((interest) => (
                <div className="client-record" key={interest.id}>
                  <strong>{interest.label}</strong>
                  {interest.type ? <small>{interest.type}</small> : null}
                  {interest.detail ? <span>{interest.detail}</span> : null}
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="client-panel">
          <p className="section-kicker">Histórico</p>
          <h2>Itens e serviços relacionados</h2>
          {dataLoading ? (
            <div className="loading-state empty-state--compact">Carregando histórico…</div>
          ) : data.history.length === 0 ? (
            <div className="empty-state empty-state--compact">
              <strong>Sem histórico disponível.</strong>
              <p>Atividades reais vinculadas ao seu atendimento aparecerão neste espaço.</p>
            </div>
          ) : (
            <div className="client-record-list">
              {data.history.map((entry) => {
                const content = (
                  <>
                    <strong>{entry.title}</strong>
                    {entry.detail ? <span>{entry.detail}</span> : null}
                    {formatHistoryDate(entry.occurredAt) ? <small>{formatHistoryDate(entry.occurredAt)}</small> : null}
                  </>
                );

                return entry.propertySlug ? (
                  <button className="client-record client-record--button" type="button" key={entry.id} onClick={() => onOpenProperty(entry.propertySlug!)}>
                    {content}
                  </button>
                ) : (
                  <div className="client-record" key={entry.id}>{content}</div>
                );
              })}
            </div>
          )}
        </article>

        <article className="client-panel client-panel--wide">
          <p className="section-kicker">Serviços Hárpia</p>
          <h2>Conte com uma visão integrada do patrimônio.</h2>
          <div className="service-shortcuts">
            {['Investimentos', 'Leilões', 'Assessoria Jurídica', 'Arquitetura'].map((service) => (
              <button type="button" key={service} onClick={() => onRequestService(service)}>
                <strong>{service}</strong>
                <span>Solicitar atendimento</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
