import { PropsWithChildren } from 'react';
import { Navigate } from '../router/router';
import { useAuth } from './AuthProvider';
import { FullPageState } from '../../shared/components/FullPageState';

export function ClientRoute({ children }: PropsWithChildren) {
  const auth = useAuth();
  if (auth.loading) return <FullPageState title="Carregando sua conta" />;
  if (!auth.configurationReady) return <FullPageState eyebrow="CONFIGURAÇÃO" title="Backend ainda não conectado" description="A interface está pronta para receber o projeto Supabase dedicado da Hárpia." />;
  if (!auth.isAuthenticated) return <Navigate to="/entrar" />;
  if (!auth.profile) return <FullPageState title="Carregando perfil" />;
  if (auth.profile.account_type === 'internal') return <Navigate to="/interno" />;
  if (!auth.profile.is_active) return <FullPageState eyebrow="CONTA INATIVA" title="Seu acesso está temporariamente indisponível" description="Entre em contato com a Hárpia para verificar sua conta." actionHref="/" actionLabel="Voltar ao site" />;
  return <>{children}</>;
}

export function InternalRoute({ permission, children }: PropsWithChildren<{ permission?: string }>) {
  const auth = useAuth();
  if (auth.loading) return <FullPageState title="Validando acesso" />;
  if (!auth.configurationReady) return <FullPageState eyebrow="CONFIGURAÇÃO" title="Backend ainda não conectado" description="A área interna será liberada assim que o projeto Supabase dedicado estiver configurado." />;
  if (!auth.isAuthenticated) return <Navigate to="/interno/entrar" />;
  if (!auth.profile) return <FullPageState title="Carregando perfil" />;
  if (!auth.isInternalUser) return <FullPageState eyebrow="ACESSO RESTRITO" title="Esta conta não possui acesso interno" description="Use a área do cliente ou entre com uma conta da equipe Hárpia." actionHref="/conta" actionLabel="Ir para minha conta" />;
  if (permission && !auth.hasPermission(permission)) return <FullPageState eyebrow="SEM PERMISSÃO" title="Você não pode acessar este módulo" description="Solicite ao administrador uma permissão adicional para esta função." actionHref="/interno" actionLabel="Voltar ao painel" />;
  return <>{children}</>;
}
