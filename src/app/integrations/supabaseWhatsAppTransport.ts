import type {
  InboxTransportPort,
  MessageAttachment,
  MessageAttachmentUpload,
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

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const ALLOWED_MEDIA_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'video/mp4',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/octet-stream',
]);

function safeFileName(name: string) {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(-120) || 'arquivo';
}

async function invokeWhatsAppMessage(message: OutgoingTransportMessage): Promise<WhatsAppSendResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke('whatsapp-transport', {
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
          storageBucket: message.attachment.storageBucket,
          storagePath: message.attachment.storagePath,
        }
        : undefined,
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

  async uploadAttachment(input: MessageAttachmentUpload): Promise<MessageAttachment> {
    if (input.size <= 0 || input.size > MAX_MEDIA_BYTES) {
      throw new Error('O arquivo precisa ter no máximo 25 MB.');
    }
    if (!ALLOWED_MEDIA_MIME.has(input.mimeType)) {
      throw new Error('Formato de arquivo não suportado pela Inbox.');
    }

    const supabase = requireSupabase();
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `outbound/${new Date().toISOString().slice(0, 10)}/${id}-${safeFileName(input.name)}`;

    const { error } = await supabase.storage
      .from('inbox-media')
      .upload(path, input.body, {
        contentType: input.mimeType,
        upsert: false,
      });

    if (error) throw new Error(error.message || 'Falha ao enviar mídia para o armazenamento seguro.');

    return {
      name: input.name,
      mimeType: input.mimeType,
      size: input.size,
      storageBucket: 'inbox-media',
      storagePath: path,
    };
  }

  async send(message: OutgoingTransportMessage): Promise<{ externalMessageId: string; sentAt?: string }> {
    if (message.type !== 'text') {
      if (!message.attachment?.storageBucket || !message.attachment.storagePath) {
        throw new Error('Mídia não foi armazenada de forma segura antes do envio.');
      }
    }

    const result = await invokeWhatsAppMessage(message);

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
      const result = await invokeWhatsAppMessage({
        conversationId: input.conversationId,
        type: 'text',
        text: message,
      });
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
