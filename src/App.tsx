import { useEffect } from 'react';
import { AppRouter } from './app/AppRouter';
import { PlatformRuntimeProvider } from './app/PlatformRuntime';
import { AuthProvider } from './core/auth/AuthProvider';
import { RouterProvider } from './core/router/router';
import { AppErrorBoundary } from './shared/components/AppErrorBoundary';

const actionableSelector = [
  'button',
  '.button',
  '.btn',
  '[role="button"]',
  'input[type="submit"]',
  'input[type="button"]',
].join(',');

const positiveActionPattern = /salvar|adicionar|criar|publicar|ativar|confirmar|enviar|aplicar|conectar|duplicar|avançar|continuar/i;
const destructiveActionPattern = /excluir|remover|apagar|desativar|cancelar|desconectar/i;

function useGlobalInteractionFeedback() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const control = event.target.closest(actionableSelector) as HTMLElement | null;
      if (!control) return;
      if (control.matches(':disabled,[aria-disabled="true"]')) return;

      const label = [
        control.textContent,
        control.getAttribute('aria-label'),
        control instanceof HTMLInputElement ? control.value : '',
      ].filter(Boolean).join(' ').trim();

      const feedbackClass = destructiveActionPattern.test(label)
        ? 'ui-clicked-danger'
        : positiveActionPattern.test(label)
          ? 'ui-clicked-positive'
          : 'ui-clicked';

      control.classList.remove('ui-clicked', 'ui-clicked-positive', 'ui-clicked-danger');
      void control.offsetWidth;
      control.classList.add(feedbackClass);

      window.setTimeout(() => {
        control.classList.remove('ui-clicked', 'ui-clicked-positive', 'ui-clicked-danger');
      }, 420);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);
}

export default function App() {
  useGlobalInteractionFeedback();

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
