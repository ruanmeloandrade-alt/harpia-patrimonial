import { AppRouter } from './app/AppRouter';
import { PlatformRuntimeProvider } from './app/PlatformRuntime';
import { AuthProvider } from './core/auth/AuthProvider';
import { RouterProvider } from './core/router/router';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider>
        <AuthProvider>
          <PlatformRuntimeProvider>
            <AppRouter />
          </PlatformRuntimeProvider>
        </AuthProvider>
      </RouterProvider>
    </AppErrorBoundary>
  );
}
