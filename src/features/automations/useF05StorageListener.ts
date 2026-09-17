import { useEffect, useRef } from 'react';
import { subscribeF05StorageEvents } from './f05Storage';

/**
 * Mantém o callback mais recente sem recriar a assinatura em todo render.
 * Usado pelos workspaces para refletir hidratação, escrita confirmada e rollback.
 */
export function useF05StorageListener(listener: () => void) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => subscribeF05StorageEvents(() => listenerRef.current()), []);
}
