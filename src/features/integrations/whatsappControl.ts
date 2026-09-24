import { requireSupabase } from '../../core/supabase/client';

export type WhatsAppControlAction =
  | 'list'
  | 'create'
  | 'status'
  | 'qr'
  | 'connect'
  | 'reconnect'
  | 'disconnect';

export type WhatsAppSession = {
  sessionId: string;
  status: string;
  qrAvailable?: boolean;
  phoneNumber?: string;
  accountLabel?: string;
  connectedAt?: string;
  lastHealthAt?: string;
  lastEventAt?: string;
  lastErrorAt?: string;
  lastErrorCode?: string | null;
};

export type WhatsAppControlResult = {
  ok: boolean;
  sessionId?: string;
  status?: string;
  qrAvailable?: boolean;
  phoneNumber?: string;
  svg?: string;
  sessions?: WhatsAppSession[];
  message?: string;
};

export async function controlWhatsApp(
  action: WhatsAppControlAction,
  sessionId?: string,
): Promise<WhatsAppControlResult> {
  const supabase = requireSupabase();

  const { data, error } = await supabase.functions.invoke('whatsapp-connector-control', {
    body: {
      action,
      ...(sessionId ? { sessionId } : {}),
    },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao acessar o conector WhatsApp.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida do conector WhatsApp.');
  }

  const result = data as WhatsAppControlResult;
  if (result.ok === false) {
    throw new Error(result.message || 'Ação do WhatsApp não foi concluída.');
  }

  return result;
}

export async function listWhatsAppSessions(): Promise<WhatsAppSession[]> {
  const result = await controlWhatsApp('list');
  return result.sessions ?? [];
}

export async function createWhatsAppSession(): Promise<WhatsAppSession> {
  const result = await controlWhatsApp('create');
  if (!result.sessionId) throw new Error('O conector não retornou a nova sessão.');

  return {
    sessionId: result.sessionId,
    status: result.status || 'connecting',
    qrAvailable: result.qrAvailable,
    phoneNumber: result.phoneNumber,
  };
}

export async function connectAndLoadWhatsAppQr(sessionId?: string) {
  await controlWhatsApp('connect', sessionId);

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }

    try {
      const qr = await controlWhatsApp('qr', sessionId);
      if (qr.svg) return qr.svg;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('QR ainda não está disponível.');
    }
  }

  throw lastError ?? new Error('O conector iniciou, mas o QR ainda não ficou disponível.');
}
