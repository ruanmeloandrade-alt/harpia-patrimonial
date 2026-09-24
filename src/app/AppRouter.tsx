import { ClientRoute, InternalRoute } from '../core/auth/guards';
import { PERMISSIONS } from '../core/auth/permissions';
import { Navigate, useAppRouter } from '../core/router/router';
import { LoginPage } from '../features/auth/LoginPage';
import { RecoverPasswordPage } from '../features/auth/RecoverPasswordPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { matchesFront02PublicRoute } from '../features/public-site';
import { FullPageState } from '../shared/components/FullPageState';
import { InternalShell } from '../shared/components/InternalShell';
import { IntegratedPublicExperience } from './IntegratedPublicExperience';
import { ingestPublicLead } from './integrations/publicLeadIngest';
import {
  IntegratedAIAgents,
  IntegratedAutomations,
  IntegratedCalendar,
  IntegratedCatalog,
  IntegratedCalendar,
  IntegratedCrm,
  IntegratedDashboard,
  IntegratedExecutionLogs,
  IntegratedInbox,
  IntegratedMarketing,
  IntegratedSalesBot,
  IntegratedSettings,
} from './IntegratedInternalModules';

export function AppRouter() {
  const { pathname } = useAppRouter();

  if (pathname === '/entrar') return <LoginPage />;
  if (pathname === '/cadastro') {
    return (
      <RegisterPage
        onClientRegistered={async ({ fullName, email, whatsapp }) => {
          await ingestPublicLead({
            contact: { name: fullName, email, whatsapp },
            origin: 'site',
            action: 'account_created',
            page: '/cadastro',
            occurredAt: new Date().toISOString(),
            metadata: { source: 'client-signup' },
          });
        }}
      />
    );
  }
  if (pathname === '/recuperar-senha') return <RecoverPasswordPage />;
  if (pathname === '/nova-senha') return <ResetPasswordPage />;
  if (pathname === '/conta') {
    return (
      <ClientRoute>
        <Navigate to="/cliente" />
      </ClientRoute>
    );
  }
  if (pathname === '/interno/entrar') return <LoginPage internal />;

  if (matchesFront02PublicRoute(pathname)) return <IntegratedPublicExperience />;

  if (pathname.startsWith('/interno')) {
    let page = <IntegratedDashboard />;
    let permission: string | undefined = PERMISSIONS.DASHBOARD_VIEW;
    let permissions: string[] | undefined;

    if (pathname === '/interno/catalogo') {
      page = <IntegratedCatalog />;
      permission = undefined;
      permissions = [PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.CATALOG_PUBLISH];
    } else if (pathname === '/interno/crm') {
      page = <IntegratedCrm />;
      permission = undefined;
      permissions = [PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_MANAGE];
    } else if (pathname === '/interno/calendario') {
      page = <IntegratedCalendar />;
      permission = undefined;
      permissions = [PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_MANAGE];
    } else if (pathname === '/interno/calendario') {
      page = <IntegratedCalendar />;
      permission = undefined;
      permissions = [PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_MANAGE];
    } else if (pathname === '/interno/inbox') {
      page = <IntegratedInbox />;
      permission = undefined;
      permissions = [PERMISSIONS.INBOX_VIEW, PERMISSIONS.INBOX_MANAGE];
    } else if (pathname === '/interno/salesbot') {
      page = <IntegratedSalesBot />;
      permission = undefined;
      permissions = [PERMISSIONS.SALESBOT_VIEW, PERMISSIONS.SALESBOT_MANAGE];
    } else if (pathname === '/interno/automatize') {
      page = <IntegratedAutomations />;
      permission = undefined;
      permissions = [PERMISSIONS.AUTOMATIONS_VIEW, PERMISSIONS.AUTOMATIONS_MANAGE];
    } else if (pathname === '/interno/agentes-ia') {
      page = <IntegratedAIAgents />;
      permission = undefined;
      permissions = [PERMISSIONS.AI_VIEW, PERMISSIONS.AI_MANAGE];
    } else if (pathname === '/interno/execucoes') {
      page = <IntegratedExecutionLogs />;
      permission = undefined;
      permissions = [
        PERMISSIONS.SALESBOT_VIEW,
        PERMISSIONS.SALESBOT_MANAGE,
        PERMISSIONS.AUTOMATIONS_VIEW,
        PERMISSIONS.AUTOMATIONS_MANAGE,
        PERMISSIONS.AI_VIEW,
        PERMISSIONS.AI_MANAGE,
      ];
    } else if (pathname === '/interno/marketing') {
      page = <IntegratedMarketing />;
      permission = undefined;
      permissions = undefined;
    } else if (pathname === '/interno/integracoes') {
      page = <IntegratedSettings initialTab="integrations" />;
      permission = undefined;
      permissions = [PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_MANAGE];
    } else if (pathname === '/interno/usuarios' || pathname === '/interno/permissoes') {
      page = <IntegratedSettings initialTab="users" />;
      permission = undefined;
      permissions = [PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE, PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE];
    } else if (pathname === '/interno/configuracoes') {
      page = <IntegratedSettings />;
      permission = undefined;
      permissions = undefined;
    } else if (pathname !== '/interno') {
      return <FullPageState title="Página não encontrada" actionHref="/interno" actionLabel="Voltar ao painel" />;
    }

    return (
      <InternalRoute permission={permission} permissions={permissions}>
        <InternalShell>{page}</InternalShell>
      </InternalRoute>
    );
  }

  return <FullPageState title="Página não encontrada" description="O endereço acessado não existe nesta versão da plataforma." actionHref="/" actionLabel="Voltar ao início" />;
}
