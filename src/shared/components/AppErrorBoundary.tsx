import { Component, ErrorInfo, ReactNode } from 'react';
import { FullPageState } from './FullPageState';

type Props = { children: ReactNode };
type State = { hasError: boolean; errorMessage?: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Falha inesperada na interface.',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[app] uncaught render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <FullPageState
          eyebrow="ERRO DA APLICAÇÃO"
          title="Não foi possível carregar esta área"
          description="A plataforma encontrou uma falha inesperada. Recarregue a página; se o problema continuar, registre o contexto para revisão técnica."
          actionHref="/"
          actionLabel="Voltar ao início"
        />
      );
    }

    return this.props.children;
  }
}
