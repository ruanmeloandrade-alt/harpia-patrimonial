import { ClientRoute, InternalRoute } from '../core/auth/guards';
import { AppLink, useAppRouter } from '../core/router/router';
import { ClientAccountShell } from '../features/auth/ClientAccountShell';
import { LoginPage } from '../features/auth/LoginPage';
import { RecoverPasswordPage } from '../features/auth/RecoverPasswordPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { PermissionsPage } from '../features/permissions/PermissionsPage';
import { CoreSettingsPage } from '../features/settings/core/CoreSettingsPage';
import { UsersPage } from '../features/users/UsersPage';
import { FullPageState } from '../shared/components/FullPageState';
import { InternalShell } from '../shared/components/InternalShell';
import { InternalHome } from './InternalHome';

function PublicPlaceholder() {
  return (
    <main className="public-placeholder">
      <div className="public-topline"><span>HÁRPIA PATRIMONIAL & CO.</span><div><AppLink href="/entrar">Minha conta</AppLink><AppLink className="button button-light" href="/interno/entrar">Área interna</AppLink></div></div>
      <section className="public-hero"><p className="eyebrow">INTELIGÊNCIA PATRIMONIAL · DESDE 1986</p><h1>Patrimônio atravessa gerações.</h1><p>Inteligência imobiliária e patrimonial para decisões que atravessam gerações.</p><div className="hero-actions"><AppLink className="button button-light" href="/cadastro">Criar conta</AppLink><AppLink className="button button-outline-light" href="/entrar">Entrar</AppLink></div></section>
    </main>
  );
}

export function AppRouter() {
  const { pathname } = useAppRouter();

  if (pathname === '/') return <PublicPlaceholder />;
  if (pathname === '/entrar') return <LoginPage />;
  if (pathname === '/cadastro') return <RegisterPage />;
  if (pathname === '/recuperar-senha') return <RecoverPasswordPage />;
  if (pathname === '/nova-senha') return <ResetPasswordPage />;
  if (pathname === '/conta') return <ClientRoute><ClientAccountShell /></ClientRoute>;
  if (pathname === '/interno/entrar') return <LoginPage internal />;

  if (pathname.startsWith('/interno')) {
    let page = <InternalHome />;
    let permission: string | undefined;
    if (pathname === '/interno/usuarios') { page = <UsersPage />; permission = 'users.view'; }
    else if (pathname === '/interno/permissoes') { page = <PermissionsPage />; permission = 'roles.view'; }
    else if (pathname === '/interno/configuracoes') { page = <CoreSettingsPage />; permission = 'settings.view'; }
    else if (pathname !== '/interno') return <FullPageState title="Página não encontrada" actionHref="/interno" actionLabel="Voltar ao painel" />;
    return <InternalRoute permission={permission}><InternalShell>{page}</InternalShell></InternalRoute>;
  }

  return <FullPageState title="Página não encontrada" description="O endereço acessado não existe nesta versão da plataforma." actionHref="/" actionLabel="Voltar ao início" />;
}
