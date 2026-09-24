import type { ReactNode } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { PERMISSIONS } from '../core/auth/permissions';
import { CatalogAdminPage } from '../features/catalog/CatalogAdminPage';
import { CrmWorkspace } from '../features/crm/CrmWorkspace';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { InboxWorkspace } from '../features/inbox/InboxWorkspace';
import { SalesBotWorkspace } from '../features/salesbot/SalesBotWorkspace';
import { ExecutionLogsPanel } from '../features/salesbot/ExecutionLogsPanel';
import { listSalesBots } from '../features/salesbot/repository';
import { AIAgentsWorkspace } from '../features/ai-agents/AIAgentsWorkspace';
import { listAIAgents } from '../features/ai-agents/repository';
import { AutomationsWorkspace } from '../features/automations/AutomationsWorkspace';
import { IntegrationsWorkspace } from '../features/integrations/IntegrationsWorkspace';
import '../features/automations/front05.css';
import { FullPageState } from '../shared/components/FullPageState';
import { usePlatformRuntime } from './PlatformRuntime';

function OperationalGate({ children }: { children: ReactNode }) {
  const runtime = usePlatformRuntime();
  if (runtime.operationalLoading) return <FullPageState title="Carregando operação" description="Sincronizando CRM e Inbox com o banco compartilhado." />;
  if (runtime.operationalError) return <FullPageState title="Falha ao carregar operação" description={runtime.operationalError} actionHref="/interno" actionLabel="Voltar ao painel" />;
  return <>{children}</>;
}

function Front05Gate({ children }: { children: ReactNode }) {
  const runtime = usePlatformRuntime();
  if (runtime.f05Loading) return <FullPageState title="Carregando automações" description="Sincronizando SalesBot, Automatize, agentes de IA e integrações com o banco compartilhado." />;
  if (runtime.f05Error) return <FullPageState title="Falha ao carregar automações" description={runtime.f05Error} actionHref="/interno" actionLabel="Voltar ao painel" />;
  if (!runtime.f05Ready) return <FullPageState title="Automação indisponível" description="O estado compartilhado da automação ainda não foi carregado para esta sessão." actionHref="/interno" actionLabel="Voltar ao painel" />;
  return <>{children}</>;
}

export function IntegratedDashboard() {
  const runtime = usePlatformRuntime();
  return <DashboardPage catalogRepository={runtime.catalogRepository} commercialProvider={runtime.commercialMetricsProvider ?? undefined} />;
}

export function IntegratedCatalog() {
  const auth = useAuth();
  const runtime = usePlatformRuntime();
  return (
    <CatalogAdminPage
      repository={runtime.catalogRepository}
      mediaStorage={runtime.catalogMediaStorage ?? undefined}
      access={{
        canView: auth.hasPermission(PERMISSIONS.CATALOG_VIEW) || auth.hasPermission(PERMISSIONS.CATALOG_MANAGE) || auth.hasPermission(PERMISSIONS.CATALOG_PUBLISH),
        canManage: auth.hasPermission(PERMISSIONS.CATALOG_MANAGE),
        canPublish: auth.hasPermission(PERMISSIONS.CATALOG_PUBLISH),
      }}
    />
  );
}

export function IntegratedCrm() {
  const auth = useAuth();
  const runtime = usePlatformRuntime();
  return (
    <OperationalGate>
      {runtime.crmService
        ? (
          <CrmWorkspace
            service={runtime.crmService}
            assignees={runtime.assignees}
            canManage={auth.hasPermission(PERMISSIONS.CRM_MANAGE)}
            catalogRepository={runtime.catalogRepository}
          />
        )
        : <FullPageState title="CRM indisponível" description="A persistência compartilhada não foi carregada." />}
    </OperationalGate>
  );
}

export function IntegratedInbox() {
  const auth = useAuth();
  const runtime = usePlatformRuntime();
  const canReadSalesBots = auth.hasPermission(PERMISSIONS.SALESBOT_VIEW) || auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE);
  const canReadAiAgents = auth.hasPermission(PERMISSIONS.AI_VIEW) || auth.hasPermission(PERMISSIONS.AI_MANAGE);
  const salesBots = runtime.f05Ready && canReadSalesBots
    ? listSalesBots().filter((bot) => bot.status === 'active').map((bot) => ({ id: bot.id, name: bot.name }))
    : [];
  const aiAgents = runtime.f05Ready && canReadAiAgents
    ? listAIAgents().filter((agent) => agent.status === 'active').map((agent) => ({ id: agent.id, name: agent.name }))
    : [];

  return (
    <OperationalGate>
      {runtime.crmService && runtime.inboxService && runtime.inboxAutomationPort
        ? (
          <InboxWorkspace
            crmService={runtime.crmService}
            inboxService={runtime.inboxService}
            automationPort={runtime.inboxAutomationPort}
            assignees={runtime.assignees}
            salesBots={salesBots}
            aiAgents={aiAgents}
            canManageInbox={auth.hasPermission(PERMISSIONS.INBOX_MANAGE)}
            canManageCrm={auth.hasPermission(PERMISSIONS.CRM_MANAGE)}
            canManageSalesBot={auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE)}
            canManageAiAgent={auth.hasPermission(PERMISSIONS.AI_MANAGE)}
          />
        )
        : <FullPageState title="Inbox indisponível" description="CRM ou Inbox compartilhados não foram carregados." />}
    </OperationalGate>
  );
}

function Front05Shell({ children }: { children: ReactNode }) {
  return <div className="f05-shell"><div className="f05-shell__intro"><div><span className="f05-kicker">Hárpia Patrimonial</span><h1>Automação inteligente</h1><p>Configuração operacional sem dados fictícios e sem envio externo enquanto os canais não estiverem conectados.</p></div><div className="f05-readiness"><span>WhatsApp Web</span><strong>Status em Integrações</strong><span>Meta Lead Ads</span><strong>Status em Integrações</strong></div></div>{children}</div>;
}

function Front05Module({ children }: { children: ReactNode }) {
  return <Front05Gate><Front05Shell>{children}</Front05Shell></Front05Gate>;
}

export function IntegratedSalesBot() {
  const auth = useAuth();
  return <Front05Module><SalesBotWorkspace canManage={auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE)} /></Front05Module>;
}

export function IntegratedAutomations() {
  const auth = useAuth();
  return <Front05Module><AutomationsWorkspace canManage={auth.hasPermission(PERMISSIONS.AUTOMATIONS_MANAGE)} /></Front05Module>;
}

export function IntegratedAIAgents() {
  const auth = useAuth();
  return <Front05Module><AIAgentsWorkspace canManage={auth.hasPermission(PERMISSIONS.AI_MANAGE)} /></Front05Module>;
}

export function IntegratedExecutionLogs() {
  const auth = useAuth();
  const canManage = auth.hasPermission(PERMISSIONS.SALESBOT_MANAGE) || auth.hasPermission(PERMISSIONS.AI_MANAGE);
  return <Front05Module><ExecutionLogsPanel canManage={canManage} /></Front05Module>;
}

export function IntegratedIntegrations() {
  const auth = useAuth();
  const runtime = usePlatformRuntime();
  return <Front05Module><IntegrationsWorkspace credentialVault={runtime.credentialVault} canManage={auth.hasPermission(PERMISSIONS.INTEGRATIONS_MANAGE)} /></Front05Module>;
}
