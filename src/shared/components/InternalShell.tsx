import { PropsWithChildren, useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { PERMISSIONS } from '../../core/auth/permissions';
import { AppLink, useAppRouter } from '../../core/router/router';
import { getOrganizationSettings, applyOrganizationRegionalPreferences } from '../../features/settings/core/settings-service';
import { applyUserAppearance, getUserPreferences } from '../../features/settings/user-preferences-service';
import { NotificationCenter } from '../../features/notifications/NotificationCenter';
import { installRuntimeLocaleObserver } from '../../features/settings/runtime-preferences';
import './internal-shell.css';

type NavItem = {
  href: string;
  label: string;
  permission?: string;
  permissions?: string[];
  phaseTwo?: boolean;
};

const links: NavItem[] = [
  { href: '/interno', label: 'Visão geral', permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/interno/catalogo', label: 'Produtos', permissions: [PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.CATALOG_PUBLISH] },
  { href: '/interno/crm', label: 'CRM', permissions: [PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_MANAGE] },
  { href: '/interno/inbox', label: 'Inbox', permissions: [PERMISSIONS.INBOX_VIEW, PERMISSIONS.INBOX_MANAGE] },
  { href: '/interno/salesbot', label: 'SalesBot', permissions: [PERMISSIONS.SALESBOT_VIEW, PERMISSIONS.SALESBOT_MANAGE] },
  { href: '/interno/automatize', label: 'Automatize', permissions: [PERMISSIONS.AUTOMATIONS_VIEW, PERMISSIONS.AUTOMATIONS_MANAGE] },
  { href: '/interno/agentes-ia', label: 'Agentes IA', permissions: [PERMISSIONS.AI_VIEW, PERMISSIONS.AI_MANAGE] },
  { href: '/interno/marketing', label: 'Marketing', phaseTwo: true },
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
  { href: '/interno/configuracoes', label: 'Configurações' },
];

export function InternalShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { pathname, navigate } = useAppRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => installRuntimeLocaleObserver(), []);



  useEffect(() => {
    let mounted = true;
    let media: MediaQueryList | null = null;
    let handleChange: (() => void) | null = null;

    void getOrganizationSettings()
      .then((settings) => {
        if (mounted) applyOrganizationRegionalPreferences(settings.preferences);
      })
      .catch(() => undefined);

    const userId = auth.user?.id;
    if (userId) {
      void getUserPreferences(userId)
        .then((preferences) => {
          if (!mounted) return;
          applyUserAppearance(preferences);
          if (preferences.theme === 'system' && typeof window !== 'undefined') {
            media = window.matchMedia('(prefers-color-scheme: dark)');
            handleChange = () => applyUserAppearance(preferences);
            media.addEventListener('change', handleChange);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
      if (media && handleChange) media.removeEventListener('change', handleChange);
    };
  }, [auth.user?.id]);

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
          {links.filter(canSee).map((item) => (
            <AppLink
              key={item.href}
              href={item.href}
              className={(
                pathname === item.href
                || (item.href === '/interno/configuracoes' && ['/interno/integracoes', '/interno/usuarios', '/interno/permissoes'].includes(pathname))
              ) ? 'nav-link active' : 'nav-link'}
              onClick={() => setMobileOpen(false)}
            >
              <span>{item.label}</span>
              {item.phaseTwo ? <span className="nav-phase-badge">2ª fase</span> : null}
            </AppLink>
          ))}
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
      <main className="internal-main">{children}</main><NotificationCenter />
    </div>
  );
}
