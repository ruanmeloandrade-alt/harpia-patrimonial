import { AuthProvider, useAuth } from './core/auth/AuthProvider';
import { RouterProvider } from './core/router/router';
import { FullPageState } from './shared/components/FullPageState';

function CoreBoot() {
  const auth = useAuth();
  return <FullPageState eyebrow="FRENTE 01 · NÚCLEO" title="Fundação da plataforma ativa" description={auth.configurationReady ? 'Backend configurado. A camada de autenticação e sessão está pronta para receber as interfaces.' : 'A camada de autenticação e sessão está pronta. Falta apenas conectar o projeto Supabase dedicado da Hárpia.'} />;
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <CoreBoot />
      </AuthProvider>
    </RouterProvider>
  );
}
