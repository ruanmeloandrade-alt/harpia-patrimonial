import { PropsWithChildren } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { PERMISSIONS } from '../../core/auth/permissions';
import { AppLink, useAppRouter } from '../../core/router/router';

type NavItem = {
  href: string;
  label: string;
  permission?: string;
  permissions?: string[];
};

const links: NavItem[] = [
  { href: '/interno', label: 'Visão geral', permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/interno/catalogo', label: 'Catálogo', permissions: [PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.CATALOG_PUBLISH] },
  { href: '/interno/crm', label: 'CRM', permission: PERMISSIONS.CRM_MANAGE },
  { href: '/interno/inbox', label: 'Inbox', permission: PERMISSIONS.INBOX_MANAGE },
  { href: '/interno/salesbot', label: 'SalesBot', permissions: [PERMISSIONS.SALESBOT_VIEW, PERMISSIONS.SALESBOT_MANAGE] },
  { href: '/interno/automatize', label: 'Automatize', permissions: [PERMISSIONS.AUTOMATIONS_VIEW, PERMISSIONS.AUTOMATIONS_MANAGE] },
  { href: '/interno/agentes-ia', label: 'Agentes IA', permissions: [PERMISSIONS.AI_VIEW, PERMISSIONS.AI_MANAGE] },
  {
    href: '/interno/execucoes',
    label: 'Execuções',
    permissions: [
      PERMISSIONS.SALESBOT_VIEW,
      PERMISSIONS.SALESBOT_MANAGE,
      PERMISSIONS.AUTOMATIONS_VIEW,
      PERMISSIONS.AUTOMATIONS_MANAGE,
      PERMISSIONS.AI_VIEW,
      PERMISSIONS.AI_MANAGE,
    ],
  },
  { href: '/interno/integracoes', label: 'Integrações', permissions: [PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_MANAGE] },
  { href: '/interno/usuarios', label: 'Usuários', permission: PERMISSIONS.USERS_VIEW },
  { href: '/interno/permissoes', label: 'Funções e permissões', permission: PERMISSIONS.ROLES_VIEW },
  { href: '/interno/configuracoes', label: 'Configurações', permission: PERMISSIONS.SETTINGS_VIEW },
];

export function InternalShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { pathname, navigate } = useAppRouter();

  const canSee = (item: NavItem) => {
    if (item.permissions?.length) return item.permissions.some(auth.hasPermission);
    if (item.permission) return auth.hasPermission(item.permission);
    return true;
  };

  async function logout() {
    await auth.signOut();
    navigate('/interno/entrar', { replace: true });
  }

  return (
    <div className="internal-layout">
      <aside className="sidebar">
        <div><p className="brand-kicker">HÁRPIA</p><strong className="brand-title">Patrimonial & Co.</strong><p className="brand-subtitle">Núcleo operacional</p></div>
        <nav className="sidebar-nav" aria-label="Navegação interna">
          {links.filter(canSee).map((item) => <AppLink key={item.href} href={item.href} className={pathname === item.href ? 'nav-link active' : 'nav-link'}>{item.label}</AppLink>)}
        </nav>
        <div className="sidebar-footer"><div className="user-chip"><span className="avatar-dot">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'H'}</span><div><strong>{auth.profile?.full_name || 'Equipe Hárpia'}</strong><span>{auth.user?.email}</span></div></div><button className="button button-ghost button-block" onClick={logout}>Sair</button></div>
      </aside>
      <main className="internal-main">{children}</main>
    </div>
  );
}
