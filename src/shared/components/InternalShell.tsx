import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { PERMISSIONS } from '../../core/auth/permissions';
import { AppLink, useAppRouter } from '../../core/router/router';
import './internal-shell.css';

type NavItem = {
  href: string;
  label: string;
  permission?: string;
  permissions?: string[];
};

type NavGroup = {
  id: 'crm' | 'settings';
  label: string;
  items: NavItem[];
};

const primaryLinks: NavItem[] = [
  { href: '/interno', label: 'Dashboard', permission: PERMISSIONS.DASHBOARD_VIEW },
  {
    href: '/interno/catalogo',
    label: 'Produtos',
    permissions: [PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.CATALOG_PUBLISH],
  },
];

const crmGroup: NavGroup = {
  id: 'crm',
  label: 'CRM',
  items: [
    { href: '/interno/crm', label: 'Funis de vendas', permissions: [PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_MANAGE] },
    { href: '/interno/salesbot', label: 'SalesBot', permissions: [PERMISSIONS.SALESBOT_VIEW, PERMISSIONS.SALESBOT_MANAGE] },
    { href: '/interno/agentes-ia', label: 'Agentes IA', permissions: [PERMISSIONS.AI_VIEW, PERMISSIONS.AI_MANAGE] },
  ],
};

const secondaryLinks: NavItem[] = [
  { href: '/interno/inbox', label: 'Inbox', permissions: [PERMISSIONS.INBOX_VIEW, PERMISSIONS.INBOX_MANAGE] },
];

const settingsGroup: NavGroup = {
  id: 'settings',
  label: 'Configurações',
  items: [
    { href: '/interno/configuracoes', label: 'Geral', permission: PERMISSIONS.SETTINGS_VIEW },
    { href: '/interno/integracoes', label: 'Integrações', permissions: [PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_MANAGE] },
    { href: '/interno/usuarios', label: 'Usuários', permission: PERMISSIONS.USERS_VIEW },
    { href: '/interno/permissoes', label: 'Permissões', permission: PERMISSIONS.ROLES_VIEW },
  ],
};

export function InternalShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { pathname, navigate } = useAppRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<NavGroup['id'], boolean>>({
    crm: pathname.startsWith('/interno/crm')
      || pathname.startsWith('/interno/salesbot')
      || pathname.startsWith('/interno/agentes-ia'),
    settings: pathname.startsWith('/interno/configuracoes')
      || pathname.startsWith('/interno/integracoes')
      || pathname.startsWith('/interno/usuarios')
      || pathname.startsWith('/interno/permissoes'),
  });

  const canSee = (item: NavItem) => {
    if (item.permissions?.length) return item.permissions.some(auth.hasPermission);
    if (item.permission) return auth.hasPermission(item.permission);
    return true;
  };

  const visibleGroups = useMemo(() => {
    const normalize = (group: NavGroup) => ({
      ...group,
      items: group.items.filter(canSee),
    });
    return [normalize(crmGroup), normalize(settingsGroup)];
  }, [auth.permissions]);

  useEffect(() => {
    setMobileOpen(false);
    if (
      pathname.startsWith('/interno/crm')
      || pathname.startsWith('/interno/salesbot')
      || pathname.startsWith('/interno/agentes-ia')
    ) {
      setOpenGroups((current) => ({ ...current, crm: true }));
    }
    if (
      pathname.startsWith('/interno/configuracoes')
      || pathname.startsWith('/interno/integracoes')
      || pathname.startsWith('/interno/usuarios')
      || pathname.startsWith('/interno/permissoes')
    ) {
      setOpenGroups((current) => ({ ...current, settings: true }));
    }
  }, [pathname]);

  async function logout() {
    await auth.signOut();
    navigate('/interno/entrar', { replace: true });
  }

  const renderLink = (item: NavItem, nested = false) => (
    <AppLink
      key={item.href}
      href={item.href}
      className={[
        nested ? 'nav-link nav-link--nested' : 'nav-link',
        pathname === item.href ? 'active' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => setMobileOpen(false)}
    >
      {item.label}
    </AppLink>
  );

  const renderGroup = (group: NavGroup) => {
    if (group.items.length === 0) return null;
    const isOpen = openGroups[group.id];
    const hasActiveChild = group.items.some((item) => pathname === item.href);

    return (
      <div className={hasActiveChild ? 'nav-group nav-group--active' : 'nav-group'} key={group.id}>
        <button
          type="button"
          className={hasActiveChild ? 'nav-group__trigger active' : 'nav-group__trigger'}
          aria-expanded={isOpen}
          onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
        >
          <span>{group.label}</span>
          <span className={isOpen ? 'nav-group__chevron nav-group__chevron--open' : 'nav-group__chevron'} aria-hidden="true">›</span>
        </button>
        {isOpen && (
          <div className="nav-group__items">
            {group.items.map((item) => renderLink(item, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="internal-layout">
      <aside className="sidebar">
        <div className="sidebar-mobile-heading">
          <div>
            <p className="brand-kicker">HÁRPIA</p>
            <strong className="brand-title">Patrimonial & Co.</strong>
            <p className="brand-subtitle">Núcleo operacional</p>
          </div>
          <button
            className="sidebar-mobile-toggle"
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="internal-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            <span aria-hidden="true">☰</span>
            <span>{mobileOpen ? 'Fechar' : 'Menu'}</span>
          </button>
        </div>

        <nav
          id="internal-navigation"
          className={mobileOpen ? 'sidebar-nav sidebar-nav--open' : 'sidebar-nav'}
          aria-label="Navegação interna"
        >
          {primaryLinks.filter(canSee).map((item) => renderLink(item))}
          {renderGroup(visibleGroups[0])}
          {secondaryLinks.filter(canSee).map((item) => renderLink(item))}
          {renderGroup(visibleGroups[1])}
        </nav>

        <div className={mobileOpen ? 'sidebar-footer sidebar-footer--open' : 'sidebar-footer'}>
          <div className="user-chip">
            <span className="avatar-dot">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'H'}</span>
            <div>
              <strong>{auth.profile?.full_name || 'Equipe Hárpia'}</strong>
              <span>{auth.user?.email}</span>
            </div>
          </div>
          <button className="button button-ghost button-block" onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="internal-main">{children}</main>
    </div>
  );
}
