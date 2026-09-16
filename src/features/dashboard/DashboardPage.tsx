import { useEffect, useMemo, useState } from 'react';
import { CATALOG_CHANGED_EVENT, LocalCatalogRepository, type CatalogRepository } from '../catalog/catalogRepository';
import {
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
    nextActions: [],
  },
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
  helper?: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="f03-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </article>
  );
}

function StatList({ items, emptyText }: { items: Array<{ label: string; value: number }>; emptyText: string }) {
  if (!items.length) return <div className="f03-dashboard-empty">{emptyText}</div>;
  return (
    <div className="f03-stat-list">
      {items.map((item) => (
        <div className="f03-stat-row" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
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
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o dashboard.');
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

  if (loading) {
    return <section className="f03-dashboard"><div className="f03-dashboard-message">Carregando métricas reais…</div></section>;
  }

  if (error) {
    return <section className="f03-dashboard"><div className="f03-dashboard-message f03-dashboard-error">{error}</div></section>;
  }

  const crmConnected = snapshot.commercialSource === 'connected';

  return (
    <section className="f03-dashboard">
      <header className="f03-dashboard-header">
        <div>
          <p className="f03-dashboard-kicker">Visão operacional</p>
          <h1>Dashboard</h1>
          <p>Métricas do catálogo vêm dos registros reais. Dados comerciais permanecem zerados até a conexão com o CRM.</p>
        </div>
        <div className={`f03-source-pill ${crmConnected ? 'connected' : ''}`}>
          <span className="f03-source-dot" />
          {crmConnected ? 'CRM conectado' : 'Aguardando CRM'}
        </div>
      </header>

      <div className="f03-metric-grid">
        <MetricCard label="Publicados" value={snapshot.catalog.active} helper="Elegíveis para o site público" />
        <MetricCard label="Rascunhos" value={snapshot.catalog.drafts} helper="Ainda não publicados" />
        <MetricCard label="Pausados" value={snapshot.catalog.paused} helper="Fora da exposição pública" />
        <MetricCard label="Vendidos" value={snapshot.catalog.sold} helper="Histórico preservado" />
        <MetricCard label="Valor do estoque" value={money(snapshot.catalog.inventoryValue)} helper="Soma dos itens não vendidos com preço informado" />
      </div>

      <section className="f03-dashboard-section">
        <div className="f03-section-heading">
          <h2>Comercial</h2>
          <p>{crmConnected ? 'Fonte: CRM integrado.' : 'Fonte ainda não integrada: valores reais indisponíveis, exibindo zero conforme regra do projeto.'}</p>
        </div>
        <div className="f03-commercial-grid">
          <MetricCard label="Leads" value={snapshot.commercial.leads} />
          <MetricCard label="Visitas" value={snapshot.commercial.visits} />
          <MetricCard label="Propostas" value={snapshot.commercial.proposals} />
          <MetricCard label="Negociações" value={snapshot.commercial.negotiations} />
          <MetricCard label="Vendas" value={snapshot.commercial.sales} />
          <MetricCard label="Pipeline / VGV" value={money(snapshot.commercial.pipelineValue)} />
          <MetricCard label="Ticket" value={money(snapshot.commercial.ticket)} />
          <MetricCard label="Conversão" value={percent(snapshot.commercial.conversionRate)} />
        </div>
      </section>

      <div className="f03-dashboard-panels">
        <section className="f03-dashboard-panel">
          <h3>Publicados por cidade</h3>
          <StatList items={snapshot.catalog.byCity} emptyText="Nenhum imóvel publicado. As cidades aparecerão a partir dos dados reais do catálogo." />
        </section>
        <section className="f03-dashboard-panel">
          <h3>Publicados por finalidade</h3>
          <StatList items={snapshot.catalog.byPurpose} emptyText="Sem itens publicados para consolidar finalidade." />
        </section>
        <section className="f03-dashboard-panel">
          <h3>Próximas ações</h3>
          {snapshot.commercial.nextActions.length ? (
            <div className="f03-stat-list">
              {snapshot.commercial.nextActions.map((action) => (
                <div className="f03-stat-row" key={action.id}>
                  <span>{action.label}</span>
                  <strong>{action.date ? new Date(action.date).toLocaleDateString('pt-BR') : '—'}</strong>
                </div>
              ))}
            </div>
          ) : <div className="f03-dashboard-empty">Nenhuma próxima ação real disponível.</div>}
        </section>
        <section className="f03-dashboard-panel">
          <h3>Origem dos leads</h3>
          <StatList items={snapshot.commercial.leadOrigins} emptyText="Aguardando dados reais do CRM." />
        </section>
        <section className="f03-dashboard-panel">
          <h3>Demanda por região</h3>
          <StatList items={snapshot.commercial.demandByRegion} emptyText="Aguardando dados reais do CRM." />
        </section>
        <section className="f03-dashboard-panel">
          <h3>Integridade dos dados</h3>
          <div className="f03-dashboard-empty">Sem dados demonstrativos. O módulo só consolida registros existentes nas fontes conectadas.</div>
        </section>
      </div>
    </section>
  );
}

export default DashboardPage;
