import { AppRouter } from './app/AppRouter';
import { AuthProvider } from './core/auth/AuthProvider';
import { RouterProvider } from './core/router/router';

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </RouterProvider>
  );
}
