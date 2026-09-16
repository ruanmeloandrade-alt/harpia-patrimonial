import { Component, type ErrorInfo, type ReactNode } from 'react';

interface PublicExperienceBoundaryProps {
  children: ReactNode;
}

interface PublicExperienceBoundaryState {
  failed: boolean;
}

/**
 * Última barreira da experiência pública.
 *
 * Evita tela branca quando uma URL externa malformada (por exemplo, percent-
 * encoding inválido em `/imoveis/:slug`) ou outro erro de renderização escapa
 * das validações locais. Não mascara integrações: o fallback permite voltar ao
 * início ou ao catálogo por navegação completa, recriando o estado da árvore.
 */
export class PublicExperienceBoundary extends Component<
  PublicExperienceBoundaryProps,
  PublicExperienceBoundaryState
> {
  state: PublicExperienceBoundaryState = { failed: false };

  static getDerivedStateFromError(): PublicExperienceBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // O produto ainda não possui uma porta compartilhada de observabilidade.
    // Não simulamos logging remoto nesta frente.
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="public-not-found">
        <div className="public-not-found__card">
          <p>NÃO FOI POSSÍVEL ABRIR ESTA PÁGINA</p>
          <h1>O endereço informado não pôde ser processado com segurança.</h1>
          <span>Use um dos acessos abaixo para continuar na experiência pública.</span>
          <div>
            <a href="/">Ir para o início</a>
            <a href="/imoveis">Ver imóveis</a>
          </div>
        </div>
      </main>
    );
  }
}
