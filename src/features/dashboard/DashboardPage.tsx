import { useEffect, useMemo, useState } from 'react';
import { CATALOG_CHANGED_EVENT, LocalCatalogRepository, type CatalogRepository } from '../catalog/catalogRepository';
import {
  commercialAvailability,
  getDashboardSnapshot,
  type CommercialMetricsProvider,
  type DashboardSnapshot,
} from './dashboardService';
import './dashboard.css';

interface DashboardPageProps {
  catalogRepository?: CatalogRepository;
  commercialProvider?: CommercialMetricsProvider;
}

const initialSnapshot: DashboardSnapshot = {
  catalog: {
    active: 0,
    hiddenPublished: 0,
    inventoryCount: 0,
    drafts: 0,
    paused: 0,
    sold: 0,
    inventoryValue: 0,
    byCity: [],
    byPurpose: [],
  },
  commercial: {
    leads: 0,
    visits: 0,
    proposals: 0,
    negotiations: 0,
    sales: 0,
    pipelineValue: 0,
    ticket: 0,
    conversionRate: 0,
    leadOrigins: [],
    demandByRegion: [],
    performanceByProduct: [],
    nextActions: [],
  },
  commercialAvailability: commercialAvailability(),
  commercialSource: 'awaiting-crm',
};

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value > 1 ? value / 100 : value);
}

interface MetricCardProps {
  label: string;
  value: string | number;
  helper: string;
  accent?: boolean;
}

function MetricCard({ label, value, helper, accent = false }: MetricCardProps) {
  return (
    <article className={accent ? 'f03-metric-card f03-metric-card--accent' : 'f03-metric-card'}>
      <div className="f03-metric-card__top">
        <span>{label}</span>
        <i aria-hidden="true" />
      </div>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function EmptyVisual({ text }: { text: string }) {
  return (
    <div className="f03-empty-visual">
      <div className="f03-empty-visual__art" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <p>{text}</p>
    </div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number }>;
  emptyText: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="f03-dashboard-panel">
      <div className="f03-panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      {items.length ? (
        <div className="f03-distribution">
          {items.map((item) => (
            <div className="f03-distribution__row" key={item.label}>
              <div className="f03-distribution__label">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="f03-distribution__track" aria-hidden="true">
                <span style={{ width: `${Math.max((item.value / max) * 100, 4)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyVisual text={emptyText} />
      )}
    </section>
  );
}

export function DashboardPage({ catalogRepository, commercialProvider }: DashboardPageProps) {
  const catalog = useMemo(() => catalogRepository ?? new LocalCatalogRepository(), [catalogRepository]);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      setSnapshot(await getDashboardSnapshot(catalog, commercialProvider));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível atualizar os indicadores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [catalog, commercialProvider]);
  useEffect(() => {
    const listener = () => void reload();
    window.addEventListener(CATALOG_CHANGED_EVENT, listener);
    return () => window.removeEventListener(CATALOG_CHANGED_EVENT, listener);
  }, [catalog, commercialProvider]);
  useEffect(() => {
    if (!commercialProvider?.subscribe) return undefined;
    return commercialProvider.subscribe(() => void reload());
  }, [commercialProvider]);

  const crmConnected = snapshot.commercialSource === 'connected';

  return (
    <section className="f03-dashboard">
      <header className="f03-dashboard-header">
        <div>
          <p className="f03-dashboard-kicker">Painel operacional</p>
          <h1>Dashboard</h1>
          <p>Acompanhe vendas, produtos e movimentações da operação em um só lugar.</p>
        </div>

        <div className={crmConnected ? 'f03-source-pill connected' : 'f03-source-pill'}>
          <span className="f03-source-dot" />
          {loading ? 'Atualizando dados' : crmConnected ? 'CRM conectado' : 'Operação sem movimentação'}
        </div>
      </header>

      {error && (
        <div className="f03-dashboard-notice" role="alert">
          <strong>Não foi possível atualizar alguns indicadores.</strong>
          <span>O painel continua disponível e tentará sincronizar novamente.</span>
        </div>
      )}

      <div className="f03-metric-grid">
        <MetricCard
          label="Leads"
          value={snapshot.commercial.leads}
          helper="Contatos no CRM"
          accent
        />
        <MetricCard
          label="Produtos ativos"
          value={snapshot.catalog.active}
          helper="Itens publicados"
        />
        <MetricCard
          label="Propostas"
          value={snapshot.commercial.proposals}
          helper="Em acompanhamento"
        />
        <MetricCard
          label="Vendas"
          value={snapshot.commercial.sales}
          helper="Negócios concluídos"
        />
      </div>

      <div className="f03-dashboard-main-grid">
        <section className="f03-dashboard-panel f03-dashboard-panel--commercial">
          <div className="f03-panel-heading">
            <div>
              <h2>Resumo comercial</h2>
              <p>Indicadores principais do funil de vendas.</p>
            </div>
            <span className="f03-panel-badge">{crmConnected ? 'Tempo real' : 'Sem dados ainda'}</span>
          </div>

          <div className="f03-commercial-summary">
            <div><span>Visitas</span><strong>{snapshot.commercial.visits}</strong></div>
            <div><span>Negociações</span><strong>{snapshot.commercial.negotiations}</strong></div>
            <div><span>Pipeline</span><strong>{money(snapshot.commercial.pipelineValue)}</strong></div>
            <div><span>Conversão</span><strong>{percent(snapshot.commercial.conversionRate)}</strong></div>
          </div>

          <div className="f03-pipeline-visual" aria-label="Visão visual do funil comercial">
            {[
              ['Leads', snapshot.commercial.leads],
              ['Visitas', snapshot.commercial.visits],
              ['Propostas', snapshot.commercial.proposals],
              ['Negociações', snapshot.commercial.negotiations],
              ['Vendas', snapshot.commercial.sales],
            ].map(([label, value], index) => (
              <div className="f03-pipeline-step" key={String(label)}>
                <span className="f03-pipeline-step__index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="f03-dashboard-panel f03-dashboard-panel--inventory">
          <div className="f03-panel-heading">
            <div>
              <h2>Catálogo</h2>
              <p>Saúde dos produtos e serviços cadastrados.</p>
            </div>
          </div>

          <div className="f03-inventory-total">
            <span>Valor do estoque</span>
            <strong>{money(snapshot.catalog.inventoryValue)}</strong>
          </div>

          <div className="f03-inventory-status">
            <div><span>Ativos</span><strong>{snapshot.catalog.inventoryCount}</strong></div>
            <div><span>Rascunhos</span><strong>{snapshot.catalog.drafts}</strong></div>
            <div><span>Pausados</span><strong>{snapshot.catalog.paused}</strong></div>
            <div><span>Vendidos</span><strong>{snapshot.catalog.sold}</strong></div>
          </div>
        </section>
      </div>

      <div className="f03-dashboard-panels">
        <DistributionPanel
          title="Produtos por região"
          subtitle="Distribuição dos itens publicados."
          items={snapshot.catalog.byCity}
          emptyText="As regiões aparecerão aqui conforme os produtos forem cadastrados."
        />

        <DistributionPanel
          title="Origem dos leads"
          subtitle="Canais que estão trazendo oportunidades."
          items={snapshot.commercial.leadOrigins}
          emptyText="As origens dos leads aparecerão aqui conforme o CRM receber contatos."
        />

        <section className="f03-dashboard-panel">
          <div className="f03-panel-heading">
            <div>
              <h3>Próximas ações</h3>
              <p>Agenda comercial vinculada ao CRM.</p>
            </div>
          </div>

          {snapshot.commercial.nextActions.length ? (
            <div className="f03-action-list">
              {snapshot.commercial.nextActions.map((action) => (
                <div className="f03-action-row" key={action.id}>
                  <span>{action.label}</span>
                  <strong>{action.date ? new Date(action.date).toLocaleDateString('pt-BR') : 'Sem data'}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyVisual text="Nenhuma ação pendente. Novas tarefas aparecerão aqui automaticamente." />
          )}
        </section>
      </div>
    </section>
  );
}

export default DashboardPage;
