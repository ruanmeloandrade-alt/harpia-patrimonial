import { useCallback, useEffect, useRef, useState } from 'react';
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
  const requestVersionRef = useRef(0);
  const stateClientRef = useRef<string | null>(null);
  const stateSourceRef = useRef<ClientAreaDataSourcePort | undefined>(undefined);

  const reload = useCallback(async () => {
    const requestVersion = ++requestVersionRef.current;
    const requestClientId = clientId;
    const requestSource = source;

    if (!requestClientId || !requestSource) {
      stateClientRef.current = null;
      stateSourceRef.current = requestSource;
      setState({ data: emptyData });
      return;
    }

    const changedContext = stateClientRef.current !== requestClientId || stateSourceRef.current !== requestSource;
    stateClientRef.current = requestClientId;
    stateSourceRef.current = requestSource;
    setState((current) => ({
      data: changedContext ? emptyData : current.data,
      loading: true,
      error: '',
    }));

    try {
      const data = await requestSource.load(requestClientId);
      if (
        requestVersion !== requestVersionRef.current
        || clientId !== requestClientId
        || source !== requestSource
      ) return;
      stateClientRef.current = requestClientId;
      stateSourceRef.current = requestSource;
      setState({ data, loading: false, error: '' });
    } catch (cause) {
      if (
        requestVersion !== requestVersionRef.current
        || clientId !== requestClientId
        || source !== requestSource
      ) return;
      stateClientRef.current = requestClientId;
      stateSourceRef.current = requestSource;
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

  const belongsToCurrentContext = stateClientRef.current === clientId && stateSourceRef.current === source;
  const visibleState: ClientAreaDataState = belongsToCurrentContext
    ? state
    : {
        data: emptyData,
        loading: Boolean(clientId && source),
        error: '',
      };

  return { ...visibleState, reload };
}
