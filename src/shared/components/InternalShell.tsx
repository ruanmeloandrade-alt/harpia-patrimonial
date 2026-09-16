import { PropsWithChildren } from 'react';
import { useAuth } from '../../core/auth/AuthProvider';
import { PERMISSIONS } from '../../core/auth/permissions';
import { AppLink, useAppRouter } from '../../core/router/router';

const links = [
  { href: '/interno', label: 'Visão geral', permission: PERMISSIONS.DASHBOARD_VIEW },
  { href: '/interno/usuarios', label: 'Usuários', permission: PERMISSIONS.USERS_VIEW },
  { href: '/interno/permissoes', label: 'Funções e permissões', permission: PERMISSIONS.ROLES_VIEW },
  { href: '/interno/configuracoes', label: 'Configurações', permission: PERMISSIONS.SETTINGS_VIEW },
];

export function InternalShell({ children }: PropsWithChildren) {
  const auth = useAuth();
  const { pathname, navigate } = useAppRouter();

  async function logout() {
    await auth.signOut();
    navigate('/interno/entrar', { replace: true });
  }

  return (
    <div className="internal-layout">
      <aside className="sidebar">
        <div><p className="brand-kicker">HÁRPIA</p><strong className="brand-title">Patrimonial & Co.</strong><p className="brand-subtitle">Núcleo operacional</p></div>
        <nav className="sidebar-nav" aria-label="Navegação interna">
          {links.filter((item) => auth.hasPermission(item.permission)).map((item) => <AppLink key={item.href} href={item.href} className={pathname === item.href ? 'nav-link active' : 'nav-link'}>{item.label}</AppLink>)}
        </nav>
        <div className="sidebar-footer"><div className="user-chip"><span className="avatar-dot">{auth.profile?.full_name?.slice(0, 1).toUpperCase() || 'H'}</span><div><strong>{auth.profile?.full_name || 'Equipe Hárpia'}</strong><span>{auth.user?.email}</span></div></div><button className="button button-ghost button-block" onClick={logout}>Sair</button></div>
      </aside>
      <main className="internal-main">{children}</main>
    </div>
  );
}
