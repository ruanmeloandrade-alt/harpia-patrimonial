import { requireSupabase } from '../../core/supabase/client';

export type MetaFormSummary = {
  id: string;
  name?: string;
  status?: string;
};

export type MetaPageSummary = {
  id: string;
  name?: string;
};

export type MetaConnectionSummary = {
  id: string;
  status: string;
  external_account_id?: string | null;
  account_label?: string | null;
  connected_at?: string | null;
  last_health_at?: string | null;
  last_event_at?: string | null;
  last_error_at?: string | null;
  last_error_code?: string | null;
  metadata?: Record<string, unknown>;
  updated_at?: string;
};

type MetaControlResult = {
  ok: boolean;
  message?: string;
  graphVersion?: string;
  connectionId?: string;
  disconnected?: boolean;
  page?: MetaPageSummary;
  forms?: MetaFormSummary[];
  selectedFormIds?: string[];
  connections?: MetaConnectionSummary[];
};

async function invokeMeta(body: Record<string, unknown>): Promise<MetaControlResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('meta-lead-control', { body });

  if (error) {
    throw new Error(error.message || 'Falha ao acessar a integração Meta.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida da integração Meta.');
  }

  const result = data as MetaControlResult;
  if (result.ok === false) {
    throw new Error(result.message || 'A ação da integração Meta não foi concluída.');
  }
  return result;
}

export async function loadMetaStatus() {
  return invokeMeta({ action: 'status' });
}

export async function inspectMetaPage(pageId: string, pageAccessToken: string) {
  return invokeMeta({
    action: 'inspect',
    pageId: pageId.trim(),
    pageAccessToken: pageAccessToken.trim(),
  });
}

export async function connectMetaPage(
  pageId: string,
  pageAccessToken: string,
  formIds: string[] = [],
) {
  return invokeMeta({
    action: 'connect',
    pageId: pageId.trim(),
    pageAccessToken: pageAccessToken.trim(),
    formIds,
  });
}

export async function disconnectMetaPage(pageId: string) {
  return invokeMeta({
    action: 'disconnect',
    pageId: pageId.trim(),
  });
}
