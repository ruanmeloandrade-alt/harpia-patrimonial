import { useEffect, useState } from 'react';

export const PERSISTENCE_ERROR_EVENT = 'harpia:persistence-error';

export type PersistenceModule = 'crm' | 'inbox';

export interface PersistenceErrorNoticeProps {
  modules: readonly PersistenceModule[];
}

export function PersistenceErrorNotice({ modules }: PersistenceErrorNoticeProps) {
  const [message, setMessage] = useState('');
  const moduleKey = modules.join('|');

  useEffect(() => {
    if (typeof window === 'undefined') return () => undefined;
    const acceptedModules = new Set(moduleKey.split('|'));

    const handlePersistenceError = (event: Event) => {
      const detail = (event as CustomEvent<{ module?: string; message?: string }>).detail;
      if (!detail?.module || !acceptedModules.has(detail.module)) return;
      setMessage(
        detail.message?.trim()
          || 'Não foi possível confirmar a gravação no banco compartilhado. Recarregue antes de continuar.',
      );
    };

    window.addEventListener(PERSISTENCE_ERROR_EVENT, handlePersistenceError);
    return () => window.removeEventListener(PERSISTENCE_ERROR_EVENT, handlePersistenceError);
  }, [moduleKey]);

  if (!message) return null;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        margin: '12px auto',
        maxWidth: 1440,
        padding: '12px 14px',
        border: '1px solid #c6533f',
        borderRadius: 12,
        background: '#fff2ef',
        color: '#6f2419',
      }}
    >
      <div>
        <strong>Falha ao salvar</strong>
        <div style={{ marginTop: 4 }}>{message}</div>
      </div>
      <button
        type="button"
        onClick={() => setMessage('')}
        aria-label="Fechar aviso de falha ao salvar"
        style={{
          border: 0,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          fontWeight: 700,
        }}
      >
        Fechar
      </button>
    </div>
  );
}
