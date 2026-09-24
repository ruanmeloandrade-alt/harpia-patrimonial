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

    const prepared = await supabase.functions.invoke('whatsapp-transport', {
      body: {
        action: 'prepare',
        conversationId: message.conversationId,
      },
    });

    if (prepared.error) {
      throw new Error(prepared.error.message || 'Não foi possível preparar a conversa no WhatsApp.');
    }

    const sent = await supabase.functions.invoke('whatsapp-transport', {
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
      throw new Error(sent.error.message || 'Não foi possível enviar a mensagem pelo WhatsApp.');
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
