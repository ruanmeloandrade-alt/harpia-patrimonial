import type {
  InboxTransportPort,
  OutgoingTransportMessage,
} from '../../features/inbox/domain';
import type { AutomationCommandResult } from '../../features/automations/contracts';
import type { SalesBotMessagePort } from '../../features/salesbot/runtime';
import { requireSupabase } from '../../core/supabase/client';

type WhatsAppSendResult = {
  ok?: boolean;
  externalMessageId?: string;
  sentAt?: string;
  message?: string;
};

async function invokeWhatsAppText(conversationId: string, text: string): Promise<WhatsAppSendResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('whatsapp-transport', {
    body: {
      action: 'send',
      conversationId,
      type: 'text',
      text,
    },
  });

  if (error) {
    throw new Error(error.message || 'Falha ao enviar pelo WhatsApp Web.');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida do transporte WhatsApp.');
  }

  return data as WhatsAppSendResult;
}

function isTransportUnavailable(message: string) {
  return /não está conectado|não foi configurado|heartbeat|reconex|indisponível|failed to send a request/i.test(message);
}

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

    const result = await invokeWhatsAppText(message.conversationId, message.text?.trim() ?? '');

    if (!result.ok || !result.externalMessageId) {
      throw new Error(result.message || 'O WhatsApp não confirmou o envio.');
    }

    return {
      externalMessageId: result.externalMessageId,
      sentAt: result.sentAt,
    };
  }
}

export class SupabaseSalesBotWhatsAppMessagePort implements SalesBotMessagePort {
  async send(input: {
    leadId?: string;
    conversationId?: string;
    message: string;
    context: Record<string, unknown>;
  }): Promise<AutomationCommandResult> {
    if (!input.conversationId) {
      return { status: 'rejected', reason: 'Conversa obrigatória para enviar mensagem.' };
    }

    const message = input.message.trim();
    if (!message) {
      return { status: 'rejected', reason: 'Mensagem vazia.' };
    }

    try {
      const result = await invokeWhatsAppText(input.conversationId, message);
      if (result.ok && result.externalMessageId) {
        return {
          status: 'accepted',
          data: {
            externalMessageId: result.externalMessageId,
            sentAt: result.sentAt ?? null,
          },
        };
      }

      const reason = result.message || 'O WhatsApp não confirmou o envio.';
      return {
        status: isTransportUnavailable(reason) ? 'not_configured' : 'rejected',
        reason,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Transporte WhatsApp indisponível.';
      return {
        status: isTransportUnavailable(reason) ? 'not_configured' : 'rejected',
        reason,
      };
    }
  }
}
