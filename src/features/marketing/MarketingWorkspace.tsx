import { useState } from 'react';
import './marketing.css';

type MarketingTab = 'overview' | 'content' | 'traffic' | 'tracking' | 'email' | 'sms' | 'integrations';

const tabs: Array<{ id: MarketingTab; label: string }> = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'content', label: 'Planejador de conteúdo' },
  { id: 'traffic', label: 'Gestão de tráfego' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'email', label: 'E-mail marketing' },
  { id: 'sms', label: 'SMS marketing' },
  { id: 'integrations', label: 'Integrações' },
];

function PhaseBadge() {
  return <span className="marketing-phase-badge">Segunda fase</span>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="marketing-empty">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function MetricCard({ label, hint }: { label: string; hint: string }) {
  return (
    <article className="marketing-metric">
      <div className="marketing-metric__top">
        <span>{label}</span>
        <PhaseBadge />
      </div>
      <strong>0</strong>
      <small>{hint}</small>
    </article>
  );
}

function Overview() {
  return (
    <>
      <section className="marketing-metrics">
        <MetricCard label="Conteúdos planejados" hint="Nenhum calendário operacional conectado." />
        <MetricCard label="Campanhas ativas" hint="Gestão de tráfego será ativada na segunda fase." />
        <MetricCard label="Eventos rastreados" hint="Tracking ainda sem fontes conectadas." />
        <MetricCard label="Envios no período" hint="E-mail e SMS ainda indisponíveis operacionalmente." />
      </section>

      <section className="marketing-grid marketing-grid--two">
        <article className="marketing-panel">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-kicker">Central de marketing</span>
              <h2>Plano da segunda fase</h2>
              <p>O front fica pronto agora e as integrações reais entram somente na segunda fase.</p>
            </div>
            <PhaseBadge />
          </div>
          <div className="marketing-roadmap">
            <div><span>01</span><div><strong>Conteúdo com IA</strong><p>Planejamento editorial, calendário, ideias, briefing, copy e reaproveitamento de conteúdo.</p></div></div>
            <div><span>02</span><div><strong>Tráfego com IA</strong><p>Planejamento de campanhas, leitura de performance, alertas, hipóteses e recomendações.</p></div></div>
            <div><span>03</span><div><strong>Tracking</strong><p>Gestão de páginas, pixels, tags, UTMs, eventos, fontes e integridade de mensuração.</p></div></div>
            <div><span>04</span><div><strong>Relacionamento</strong><p>E-mail marketing e SMS com segmentação, campanhas, jornadas e métricas.</p></div></div>
          </div>
        </article>

        <article className="marketing-panel">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-kicker">Prontidão</span>
              <h2>Integrações previstas</h2>
              <p>Todas visíveis agora, sem conexão operacional nesta fase.</p>
            </div>
          </div>
          <div className="marketing-stack">
            {['Meta Ads e Lead Ads', 'Facebook e Instagram', 'Gmail / provedor de e-mail', 'Provedor de SMS', 'Google Analytics / Tag Manager', 'Páginas e domínios'].map((item) => (
              <div className="marketing-integration-line" key={item}>
                <span>{item}</span>
                <PhaseBadge />
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function ContentPlanner() {
  return (
    <section className="marketing-panel">
      <div className="marketing-section-heading">
        <div>
          <span className="marketing-kicker">Planejador de conteúdo com IA</span>
          <h2>Calendário editorial e produção</h2>
          <p>A IA vai apoiar estratégia, pauta, copy, formato, canal, briefing e reaproveitamento.</p>
        </div>
        <PhaseBadge />
      </div>

      <div className="marketing-toolbar">
        <select disabled aria-label="Canal"><option>Todos os canais</option></select>
        <select disabled aria-label="Período"><option>Este mês</option></select>
        <button disabled>Gerar planejamento com IA</button>
        <button className="marketing-button--secondary" disabled>Novo conteúdo</button>
      </div>

      <div className="marketing-calendar">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <strong key={day}>{day}</strong>)}
        {Array.from({ length: 35 }).map((_, index) => <div key={index} className="marketing-calendar__cell"><span>{index < 31 ? index + 1 : ''}</span></div>)}
      </div>

      <EmptyState title="Nenhum conteúdo planejado" description="O calendário está pronto para receber conteúdos quando a segunda fase for ativada." />
    </section>
  );
}

function TrafficManagement() {
  return (
    <>
      <section className="marketing-metrics">
        <MetricCard label="Investimento" hint="Sem conta de anúncios ativa." />
        <MetricCard label="Impressões" hint="Sem fonte de mídia conectada." />
        <MetricCard label="Leads atribuídos" hint="Tracking de mídia será ativado na segunda fase." />
        <MetricCard label="Custo por lead" hint="Sem dados operacionais para calcular." />
      </section>

      <section className="marketing-grid marketing-grid--two">
        <article className="marketing-panel">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-kicker">Gestão de tráfego com IA</span>
              <h2>Copiloto de mídia</h2>
              <p>Leitura de performance, diagnóstico, recomendações, orçamento e hipóteses de otimização.</p>
            </div>
            <PhaseBadge />
          </div>
          <div className="marketing-ai-box">
            <span>IA de tráfego</span>
            <strong>Aguardando fontes de mídia</strong>
            <p>Quando ativado, o copiloto usará dados reais das contas conectadas. Nenhuma recomendação fictícia será exibida.</p>
            <button disabled>Analisar campanhas</button>
          </div>
        </article>

        <article className="marketing-panel">
          <div className="marketing-section-heading">
            <div>
              <span className="marketing-kicker">Campanhas</span>
              <h2>Operação de mídia</h2>
              <p>Visão consolidada das campanhas e seus principais indicadores.</p>
            </div>
          </div>
          <EmptyState title="Nenhuma campanha conectada" description="Meta e demais plataformas de mídia ficam reservadas para a segunda fase." />
        </article>
      </section>
    </>
  );
}

function Tracking() {
  return (
    <section className="marketing-panel">
      <div className="marketing-section-heading">
        <div>
          <span className="marketing-kicker">Tracking centralizado</span>
          <h2>Páginas, pixels, tags e eventos</h2>
          <p>Controle das propriedades digitais e da saúde da mensuração em um único lugar.</p>
        </div>
        <PhaseBadge />
      </div>

      <div className="marketing-tracking-grid">
        {[
          ['Sites e páginas', 'Domínios, landing pages e páginas adicionais.'],
          ['Pixels', 'Meta Pixel e demais pixels de mídia.'],
          ['Analytics', 'Google Analytics e propriedades de mensuração.'],
          ['Tag Manager', 'Containers, tags e status de publicação.'],
          ['Eventos', 'PageView, Lead, Contact, Purchase e eventos personalizados.'],
          ['UTMs', 'Padrões de origem, mídia, campanha, conteúdo e termo.'],
        ].map(([title, description]) => (
          <article className="marketing-tracking-card" key={title}>
            <div><strong>{title}</strong><PhaseBadge /></div>
            <p>{description}</p>
            <span>Não configurado</span>
          </article>
        ))}
      </div>

      <EmptyState title="Nenhuma propriedade rastreada" description="A estrutura visual está pronta. As fontes e eventos reais entram somente na segunda fase." />
    </section>
  );
}

function EmailMarketing() {
  return (
    <section className="marketing-grid marketing-grid--two">
      <article className="marketing-panel">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-kicker">E-mail marketing</span>
            <h2>Campanhas e jornadas</h2>
            <p>Criação, segmentação, agendamento, métricas e automações de relacionamento.</p>
          </div>
          <PhaseBadge />
        </div>
        <div className="marketing-toolbar">
          <button disabled>Nova campanha</button>
          <button className="marketing-button--secondary" disabled>Nova jornada</button>
        </div>
        <EmptyState title="Nenhuma campanha de e-mail" description="A operação poderá usar Gmail ou outro provedor compatível quando a segunda fase for ativada." />
      </article>

      <article className="marketing-panel">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-kicker">Canal</span>
            <h2>Integração de e-mail</h2>
            <p>Autenticação, remetente, reputação e limites de envio serão configurados depois.</p>
          </div>
        </div>
        <div className="marketing-provider-card">
          <div className="marketing-provider-icon">G</div>
          <div><strong>Gmail / Google Workspace</strong><p>Não conectado</p></div>
          <PhaseBadge />
        </div>
        <button disabled>Conectar conta</button>
      </article>
    </section>
  );
}

function SmsMarketing() {
  return (
    <section className="marketing-grid marketing-grid--two">
      <article className="marketing-panel">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-kicker">SMS marketing</span>
            <h2>Campanhas, listas e automações</h2>
            <p>Envios transacionais e campanhas com segmentação e acompanhamento.</p>
          </div>
          <PhaseBadge />
        </div>
        <div className="marketing-toolbar">
          <button disabled>Nova campanha SMS</button>
          <button className="marketing-button--secondary" disabled>Importar lista</button>
        </div>
        <EmptyState title="Nenhuma campanha SMS" description="Nenhum provedor de SMS está conectado nesta fase." />
      </article>

      <article className="marketing-panel">
        <div className="marketing-section-heading">
          <div>
            <span className="marketing-kicker">Canal</span>
            <h2>Gateway de SMS</h2>
            <p>O provedor será definido na segunda fase de implementação.</p>
          </div>
        </div>
        <div className="marketing-provider-card">
          <div className="marketing-provider-icon">SMS</div>
          <div><strong>Provedor de SMS</strong><p>Não conectado</p></div>
          <PhaseBadge />
        </div>
        <button disabled>Configurar provedor</button>
      </article>
    </section>
  );
}

function MarketingIntegrations() {
  const items = [
    ['Meta Ads', 'Campanhas, conjuntos, anúncios e métricas.'],
    ['Meta Lead Ads', 'Formulários, leads e atribuição.'],
    ['Facebook', 'Ativos, páginas e conteúdo.'],
    ['Instagram', 'Conta, conteúdo e mídia.'],
    ['Gmail / Workspace', 'Envio e operação de e-mail marketing.'],
    ['SMS', 'Gateway para campanhas e automações.'],
    ['Google Analytics', 'Mensuração de comportamento e conversões.'],
    ['Google Tag Manager', 'Gestão de tags e eventos.'],
  ];

  return (
    <section className="marketing-panel">
      <div className="marketing-section-heading">
        <div>
          <span className="marketing-kicker">Ecossistema</span>
          <h2>Integrações de marketing</h2>
          <p>O mapa de integrações já fica visível na interface, mas nenhuma destas conexões será ativada na primeira fase.</p>
        </div>
        <PhaseBadge />
      </div>
      <div className="marketing-integration-grid">
        {items.map(([name, description]) => (
          <article key={name} className="marketing-integration-card">
            <div className="marketing-integration-card__top">
              <strong>{name}</strong>
              <PhaseBadge />
            </div>
            <p>{description}</p>
            <div className="marketing-integration-status"><span /> Não conectado</div>
            <button disabled>Configurar</button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MarketingWorkspace() {
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');

  return (
    <div className="marketing-shell">
      <header className="marketing-hero">
        <div>
          <span className="marketing-kicker">Hárpia Patrimonial</span>
          <div className="marketing-title-row">
            <h1>Marketing</h1>
            <PhaseBadge />
          </div>
          <p>Planejamento, mídia, tracking e relacionamento preparados para a segunda fase da plataforma.</p>
        </div>
        <div className="marketing-hero-status">
          <span>Estado do módulo</span>
          <strong>Front-end preparado</strong>
          <small>Operação e integrações desativadas na fase atual.</small>
        </div>
      </header>

      <nav className="marketing-tabs" aria-label="Seções de marketing">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'is-active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="marketing-phase-notice">
        <PhaseBadge />
        <div>
          <strong>Módulo preparado, ainda não operacional.</strong>
          <p>Esta área será ativada na segunda fase. Os controles que dependem de IA, mídia, Gmail, SMS, Meta ou tracking permanecem bloqueados até a implementação das integrações.</p>
        </div>
      </div>

      {activeTab === 'overview' && <Overview />}
      {activeTab === 'content' && <ContentPlanner />}
      {activeTab === 'traffic' && <TrafficManagement />}
      {activeTab === 'tracking' && <Tracking />}
      {activeTab === 'email' && <EmailMarketing />}
      {activeTab === 'sms' && <SmsMarketing />}
      {activeTab === 'integrations' && <MarketingIntegrations />}
    </div>
  );
}
