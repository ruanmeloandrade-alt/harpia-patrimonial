import { PropsWithChildren, useEffect, useState } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { PERMISSIONS } from '../../core/auth/permissions';
import { AppLink, useAppRouter } from '../../core/router/router';
import { getOrganizationSettings, applyOrganizationRegionalPreferences } from '../../features/settings/core/settings-service';
import { applyUserAppearance, getUserPreferences } from '../../features/settings/user-preferences-service';
import { NotificationCenter } from '../../features/notifications/NotificationCenter';
import { installRuntimeLocaleObserver } from '../../features/settings/runtime-preferences';
import './internal-shell.css';

const SIDEBAR_COLLAPSED_KEY = 'harpia.internal.sidebar.collapsed';

export function InternalShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { pathname, navigate } = useAppRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  });
  const [crmOpen, setCrmOpen] = useState(() => ['/interno/crm', '/interno/salesbot', '/interno/agentes-ia'].includes(pathname));
  const [settingsOpen, setSettingsOpen] = useState(() => ['/interno/configuracoes', '/interno/integracoes', '/interno/usuarios', '/interno/permissoes'].includes(pathname));

  const canSeeAny = (permissions: string[]) => permissions.some(auth.hasPermission);
  const canSeeCrm = canSeeAny([
    PERMISSIONS.CRM_VIEW,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.SALESBOT_VIEW,
    PERMISSIONS.SALESBOT_MANAGE,
    PERMISSIONS.AI_VIEW,
    PERMISSIONS.AI_MANAGE,
  ]);
  const canSeeInbox = canSeeAny([PERMISSIONS.INBOX_VIEW, PERMISSIONS.INBOX_MANAGE]);
  const canSeeCatalog = canSeeAny([PERMISSIONS.CATALOG_VIEW, PERMISSIONS.CATALOG_MANAGE, PERMISSIONS.CATALOG_PUBLISH]);
  const canSeeCalendar = canSeeAny([PERMISSIONS.CALENDAR_VIEW, PERMISSIONS.CALENDAR_MANAGE]);

  useEffect(() => {
    setMobileOpen(false);
    if (['/interno/crm', '/interno/salesbot', '/interno/agentes-ia'].includes(pathname)) setCrmOpen(true);
    if (['/interno/configuracoes', '/interno/integracoes', '/interno/usuarios', '/interno/permissoes'].includes(pathname)) setSettingsOpen(true);
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

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      if (!next) {
        if (['/interno/crm', '/interno/salesbot', '/interno/agentes-ia'].includes(pathname)) setCrmOpen(true);
        if (['/interno/configuracoes', '/interno/integracoes', '/interno/usuarios', '/interno/permissoes'].includes(pathname)) setSettingsOpen(true);
      }
      return next;
    });
  };

  const openGroup = (group: 'crm' | 'settings') => {
    if (desktopCollapsed) {
      setDesktopCollapsed(false);
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '0');
    }
    if (group === 'crm') setCrmOpen((value) => !value);
    else setSettingsOpen((value) => !value);
  };

  async function logout() {
    await auth.signOut();
    navigate('/interno/entrar', { replace: true });
  }

  const crmActive = ['/interno/crm', '/interno/salesbot', '/interno/agentes-ia'].includes(pathname);
  const settingsActive = ['/interno/configuracoes', '/interno/integracoes', '/interno/usuarios', '/interno/permissoes'].includes(pathname);

  return (
    <div className={desktopCollapsed ? 'internal-layout internal-layout--collapsed' : 'internal-layout'}>
      <aside className={desktopCollapsed ? 'sidebar sidebar--collapsed' : 'sidebar'}>
        <div className="sidebar-mobile-heading">
          <div className="sidebar-brand-row">
            <AppLink href="/interno" className="sidebar-brand-link" title="Hárpia Patrimonial">
              <img className="sidebar-logo" src="/harpia-logo-white.svg" alt="Hárpia Patrimonial & Co." />
              <span className="sidebar-brand-mark" aria-hidden="true">H</span>
            </AppLink>
            <button
              className="sidebar-collapse-toggle"
              type="button"
              onClick={toggleDesktopSidebar}
              aria-label={desktopCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
              title={desktopCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <span aria-hidden="true">{desktopCollapsed ? '›' : '‹'}</span>
            </button>
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
          {auth.hasPermission(PERMISSIONS.DASHBOARD_VIEW) ? (
            <AppLink href="/interno" title="Dashboard" className={pathname === '/interno' ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon" aria-hidden="true">▦</span>
              <span className="nav-label">Dashboard</span>
            </AppLink>
          ) : null}

          {canSeeCatalog ? (
            <AppLink href="/interno/catalogo" title="Imóveis" className={pathname === '/interno/catalogo' ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon" aria-hidden="true">⌂</span>
              <span className="nav-label">Imóveis</span>
            </AppLink>
          ) : null}

          {canSeeCrm ? (
            <div className={crmOpen && !desktopCollapsed ? 'nav-group open' : 'nav-group'}>
              <button
                className={crmActive ? 'nav-link nav-group-trigger active' : 'nav-link nav-group-trigger'}
                type="button"
                title="CRM"
                aria-expanded={crmOpen && !desktopCollapsed}
                onClick={() => openGroup('crm')}
              >
                <span className="nav-icon" aria-hidden="true">◇</span>
                <span className="nav-label">CRM</span>
                <span className="nav-chevron" aria-hidden="true">›</span>
              </button>
              <div className="nav-sub">
                {canSeeAny([PERMISSIONS.CRM_VIEW, PERMISSIONS.CRM_MANAGE]) ? (
                  <AppLink href="/interno/crm" className={pathname === '/interno/crm' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Funis de vendas</AppLink>
                ) : null}
                {canSeeAny([PERMISSIONS.SALESBOT_VIEW, PERMISSIONS.SALESBOT_MANAGE]) ? (
                  <AppLink href="/interno/salesbot" className={pathname === '/interno/salesbot' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>SalesBot</AppLink>
                ) : null}
                {canSeeAny([PERMISSIONS.AI_VIEW, PERMISSIONS.AI_MANAGE]) ? (
                  <AppLink href="/interno/agentes-ia" className={pathname === '/interno/agentes-ia' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Agentes IA</AppLink>
                ) : null}
              </div>
            </div>
          ) : null}

          {canSeeInbox ? (
            <AppLink href="/interno/inbox" title="Inbox" className={pathname === '/interno/inbox' ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon" aria-hidden="true">✉</span>
              <span className="nav-label">Inbox</span>
            </AppLink>
          ) : null}

          {canSeeCalendar ? (
            <AppLink href="/interno/calendario" title="Calendário" className={pathname === '/interno/calendario' ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>
              <span className="nav-icon" aria-hidden="true">◷</span>
              <span className="nav-label">Calendário</span>
            </AppLink>
          ) : null}

          <AppLink href="/interno/marketing" title="Marketing" className={pathname === '/interno/marketing' ? 'nav-link active' : 'nav-link'} onClick={() => setMobileOpen(false)}>
            <span className="nav-icon" aria-hidden="true">◎</span>
            <span className="nav-label">Marketing</span>
            <span className="nav-phase-badge">2ª fase</span>
          </AppLink>

          <div className={settingsOpen && !desktopCollapsed ? 'nav-group open' : 'nav-group'}>
            <button
              className={settingsActive ? 'nav-link nav-group-trigger active' : 'nav-link nav-group-trigger'}
              type="button"
              title="Configurações"
              aria-expanded={settingsOpen && !desktopCollapsed}
              onClick={() => openGroup('settings')}
            >
              <span className="nav-icon" aria-hidden="true">⚙</span>
              <span className="nav-label">Configurações</span>
              <span className="nav-chevron" aria-hidden="true">›</span>
            </button>
            <div className="nav-sub">
              <AppLink href="/interno/configuracoes" className={pathname === '/interno/configuracoes' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Geral</AppLink>
              {canSeeAny([PERMISSIONS.INTEGRATIONS_VIEW, PERMISSIONS.INTEGRATIONS_MANAGE]) ? (
                <AppLink href="/interno/integracoes" className={pathname === '/interno/integracoes' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Integrações</AppLink>
              ) : null}
              {canSeeAny([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE]) ? (
                <AppLink href="/interno/usuarios" className={pathname === '/interno/usuarios' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Usuários</AppLink>
              ) : null}
              {canSeeAny([PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_MANAGE]) ? (
                <AppLink href="/interno/permissoes" className={pathname === '/interno/permissoes' ? 'nav-sub-link active' : 'nav-sub-link'} onClick={() => setMobileOpen(false)}>Permissões</AppLink>
              ) : null}
            </div>
          </div>
        </nav>

        <div className={mobileOpen ? 'sidebar-footer sidebar-footer--open' : 'sidebar-footer'}>
          <div className="user-chip" title={auth.user?.email ?? ''}>
            <span className="avatar-dot">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'H'}</span>
            <div>
              <strong>{auth.profile?.full_name || 'Equipe Hárpia'}</strong>
              <span>{auth.user?.email}</span>
            </div>
          </div>
          <button className="button button-ghost button-block sidebar-logout" onClick={logout} title="Sair">
            <span aria-hidden="true">↪</span>
            <span className="nav-label">Sair</span>
          </button>
        </div>
      </aside>
      <main className="internal-main">{children}</main>
      <NotificationCenter />
    </div>
  );
}
