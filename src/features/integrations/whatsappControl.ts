import { requireSupabase } from '../../core/supabase/client';

export type WhatsAppControlAction =
  | 'status'
  | 'qr'
  | 'connect'
  | 'reconnect'
  | 'disconnect';

export type WhatsAppControlResult = {
  ok: boolean;
  status?: string;
  qrAvailable?: boolean;
  phoneNumber?: string;
  svg?: string;
  message?: string;
};

export async function controlWhatsApp(action: WhatsAppControlAction): Promise<WhatsAppControlResult> {
  const supabase = requireSupabase();

  const { data, error } = await supabase.functions.invoke('whatsapp-connector-control', {
    body: { action },
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

export async function connectAndLoadWhatsAppQr() {
  await controlWhatsApp('connect');

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }

    try {
      const qr = await controlWhatsApp('qr');
      if (qr.svg) return qr.svg;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('QR ainda não está disponível.');
    }
  }

  throw lastError ?? new Error('O conector iniciou, mas o QR ainda não ficou disponível.');
}
