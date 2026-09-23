import { isSupabaseConfigured, supabase } from '../../core/supabase/client';
import { readStoredList, writeStoredList } from '../automations/f05Storage';
import {
  INTEGRATION_DEFAULTS,
  type IntegrationConfig,
  type IntegrationKind,
  type OperationalIntegrationStatus,
} from './types';

const STORAGE_KEY = 'harpia:f05:integrations';
const BACKEND_PROVIDERS = new Set<IntegrationKind>(['whatsapp', 'meta']);

type IntegrationConnectionRow = {
  provider: string;
  status: OperationalIntegrationStatus;
  external_account_id: string | null;
  account_label: string | null;
  connected_at: string | null;
  last_health_at: string | null;
  last_event_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
  updated_at: string;
};

function localConfig(): IntegrationConfig[] {
  const saved = readStoredList<IntegrationConfig>(STORAGE_KEY);
  return INTEGRATION_DEFAULTS.map((fallback) => {
    const stored = saved.find((item) => item.id === fallback.id);
    return stored
      ? {
        ...fallback,
        notes: stored.notes ?? fallback.notes,
        updatedAt: stored.updatedAt,
      }
      : fallback;
  });
}

export function listIntegrations(): IntegrationConfig[] {
  return localConfig();
}

export async function loadIntegrations(): Promise<IntegrationConfig[]> {
  const items = localConfig();
  if (!isSupabaseConfigured || !supabase) return items;

  const { data, error } = await supabase
    .from('integration_connections')
    .select('provider,status,external_account_id,account_label,connected_at,last_health_at,last_event_at,last_error_at,last_error_code,updated_at')
    .in('provider', ['whatsapp', 'meta'])
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const latestByProvider = new Map<string, IntegrationConnectionRow>();
  for (const row of (data ?? []) as IntegrationConnectionRow[]) {
    if (!latestByProvider.has(row.provider)) latestByProvider.set(row.provider, row);
  }

  return items.map((item) => {
    if (!BACKEND_PROVIDERS.has(item.id)) return item;
    const connection = latestByProvider.get(item.id);
    if (!connection) return { ...item, status: 'not_connected' };

    return {
      ...item,
      status: connection.status,
      externalAccountId: connection.external_account_id ?? undefined,
      accountLabel: connection.account_label ?? undefined,
      connectedAt: connection.connected_at ?? undefined,
      lastHealthAt: connection.last_health_at ?? undefined,
      lastEventAt: connection.last_event_at ?? undefined,
      lastErrorAt: connection.last_error_at ?? undefined,
      lastErrorCode: connection.last_error_code ?? undefined,
      updatedAt: connection.updated_at,
    };
  });
}

export function updateIntegrationNotes(id: IntegrationKind, notes: string): IntegrationConfig {
  const items = localConfig();
  const current = items.find((item) => item.id === id);
  if (!current) throw new Error('Integração não encontrada.');

  const updated: IntegrationConfig = {
    ...current,
    notes,
    updatedAt: new Date().toISOString(),
  };

  writeStoredList(
    STORAGE_KEY,
    items.map((item) => (item.id === id ? updated : item)),
  );
  return updated;
}

export function subscribeIntegrationConnections(listener: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const channel = supabase
    .channel('harpia-integration-connections')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'integration_connections' },
      listener,
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
