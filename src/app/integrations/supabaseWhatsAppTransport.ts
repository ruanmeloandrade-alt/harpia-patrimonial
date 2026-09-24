import { requireSupabase } from '../../core/supabase/client';
import type { InboxTransportPort, OutgoingTransportMessage } from '../../features/inbox/domain';

type TransportResponse = {
  ok?: boolean;
  externalMessageId?: string;
  sentAt?: string;
  message?: string;
};

export class SupabaseWhatsAppTransport implements InboxTransportPort {
  async send(message: OutgoingTransportMessage): Promise<{ externalMessageId: string; sentAt?: string }> {
    const supabase = requireSupabase() as any;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (sessionError || !accessToken) {
      throw new Error('Sua sessão expirou. Entre novamente para enviar mensagens pelo WhatsApp.');
    }

    const sent = await supabase.functions.invoke('whatsapp-transport', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        action: 'send',
        conversationId: message.conversationId,
        type: message.type,
        text: message.text,
        attachment: message.attachment
          ? {
              name: message.attachment.name,
              mimeType: message.attachment.mimeType,
              size: message.attachment.size,
              url: message.attachment.url,
            }
          : undefined,
        formPayload: message.formPayload,
        buttons: message.buttons,
      },
    });

    if (sent.error) {
      let detail = sent.error.message || 'Não foi possível enviar a mensagem pelo WhatsApp.';
      try {
        const payload = await sent.error.context?.json?.();
        if (payload?.message) detail = String(payload.message);
      } catch {
        // Mantém a mensagem original do invoke.
      }
      throw new Error(detail);
    }

    const result = sent.data as TransportResponse | null;
    if (!result?.ok || !result.externalMessageId) {
      throw new Error(result?.message || 'O WhatsApp não confirmou o envio da mensagem.');
    }

    return {
      externalMessageId: result.externalMessageId,
      sentAt: result.sentAt,
    };
  }
}
