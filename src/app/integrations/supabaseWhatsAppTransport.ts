import type {
  InboxTransportPort,
  OutgoingTransportMessage,
} from '../../features/inbox/domain';
import { requireSupabase } from '../../core/supabase/client';

export class SupabaseWhatsAppTransport implements InboxTransportPort {
  async prepareConversation(conversationId: string): Promise<{ externalThreadId?: string }> {
    const supabase = requireSupabase();
    const { data, error } = await supabase.functions.invoke('whatsapp-transport', {
      body: {
        action: 'prepare',
        conversationId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao preparar a conversa para WhatsApp.');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Resposta inválida ao preparar a conversa para WhatsApp.');
    }

    const result = data as {
      ok?: boolean;
      threadId?: string;
      message?: string;
    };

    if (!result.ok || !result.threadId) {
      throw new Error(result.message || 'A conversa não pôde ser ativada no WhatsApp.');
    }

    return { externalThreadId: result.threadId };
  }

  async send(message: OutgoingTransportMessage): Promise<{ externalMessageId: string; sentAt?: string }> {
    if (message.type !== 'text') {
      throw new Error('Envio de mídia pelo WhatsApp Web ainda não está habilitado nesta etapa.');
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.functions.invoke('whatsapp-transport', {
      body: {
        action: 'send',
        conversationId: message.conversationId,
        type: message.type,
        text: message.text,
      },
    });

    if (error) {
      throw new Error(error.message || 'Falha ao enviar pelo WhatsApp Web.');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Resposta inválida do transporte WhatsApp.');
    }

    const result = data as {
      ok?: boolean;
      externalMessageId?: string;
      sentAt?: string;
      message?: string;
    };

    if (!result.ok || !result.externalMessageId) {
      throw new Error(result.message || 'O WhatsApp não confirmou o envio.');
    }

    return {
      externalMessageId: result.externalMessageId,
      sentAt: result.sentAt,
    };
  }
}
