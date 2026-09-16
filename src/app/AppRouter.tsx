import { ClientRoute, InternalRoute } from '../core/auth/guards';
import { PERMISSIONS } from '../core/auth/permissions';
import { Navigate, useAppRouter } from '../core/router/router';
import { LoginPage } from '../features/auth/LoginPage';
import { RecoverPasswordPage } from '../features/auth/RecoverPasswordPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { PermissionsPage } from '../features/permissions/PermissionsPage';
import { CoreSettingsPage } from '../features/settings/core/CoreSettingsPage';
import { UsersPage } from '../features/users/UsersPage';
import { FullPageState } from '../shared/components/FullPageState';
import { InternalShell } from '../shared/components/InternalShell';
import { IntegratedPublicExperience } from './IntegratedPublicExperience';
import {
  IntegratedAIAgents,
  IntegratedAutomations,
  IntegratedCatalog,
  IntegratedCrm,
  IntegratedDashboard,
  IntegratedExecutionLogs,
  IntegratedInbox,
  IntegratedIntegrations,
  IntegratedSalesBot,
} from './IntegratedInternalModules';

const PUBLIC_EXACT_ROUTES = new Set([
  '/',
  '/sobre',
  '/investimentos',
  '/leiloes',
  '/assessoria-juridica',
  '/arquitetura',
  '/imoveis',
  '/vender',
  '/alugar',
  '/cliente',
]);

function isPublicRoute(pathname: string) {
  return PUBLIC_EXACT_ROUTES.has(pathname) || /^\/imoveis\/[^/]+$/.test(pathname);
}

export function AppRouter() {
  const { pathname } = useAppRouter();

  if (pathname === '/entrar') return <LoginPage />;
  if (pathname === '/cadastro') return <RegisterPage />;
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

  if (isPublicRoute(pathname)) return <IntegratedPublicExperience />;

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
      permission = PERMISSIONS.CRM_MANAGE;
    } else if (pathname === '/interno/inbox') {
      page = <IntegratedInbox />;
      permission = PERMISSIONS.INBOX_MANAGE;
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
    } else if (pathname === '/interno/integracoes') {
      page = <IntegratedIntegrations />;
      permission = undefined;
      permissions = [PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_MANAGE];
    } else if (pathname === '/interno/usuarios') {
      page = <UsersPage />;
      permission = PERMISSIONS.USERS_VIEW;
    } else if (pathname === '/interno/permissoes') {
      page = <PermissionsPage />;
      permission = PERMISSIONS.ROLES_VIEW;
    } else if (pathname === '/interno/configuracoes') {
      page = <CoreSettingsPage />;
      permission = PERMISSIONS.SETTINGS_VIEW;
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
