import { useCallback, useEffect, useState } from 'react';
import type { ClientAreaDataState, ClientAreaDataView } from './ClientArea';

export interface ClientAreaDataSourcePort {
  load(clientId: string): Promise<ClientAreaDataView>;
}

const emptyData: ClientAreaDataView = { interests: [], history: [] };

/**
 * Porta de leitura para interesses e histórico do cliente.
 * A fonte concreta pode vir do CRM ou de outra camada integrada, desde que
 * entregue apenas dados reais vinculados ao clientId autenticado.
 */
export function useClientAreaData(options: {
  clientId: string | null;
  source?: ClientAreaDataSourcePort;
}): ClientAreaDataState & { reload: () => Promise<void> } {
  const { clientId, source } = options;
  const [state, setState] = useState<ClientAreaDataState>({ data: emptyData });

  const reload = useCallback(async () => {
    if (!clientId || !source) {
      setState({ data: emptyData });
      return;
    }

    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await source.load(clientId);
      setState({ data, loading: false, error: '' });
    } catch (cause) {
      setState({
        data: emptyData,
        loading: false,
        error: cause instanceof Error ? cause.message : 'Não foi possível carregar os dados da área do cliente.',
      });
    }
  }, [clientId, source]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
