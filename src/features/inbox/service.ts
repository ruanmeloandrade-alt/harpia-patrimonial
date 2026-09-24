import type {
  InboxConversation,
  InboxMessage,
  InboxState,
  InboxTransportPort,
  IncomingTransportMessage,
  MessageType,
  OutgoingTransportMessage,
} from './domain';
import { createConversationRecord } from './domain';
import type { InboxRepository } from './repository';
import type { CrmId } from '../crm/domain';
import { createCrmId, nowIso } from '../crm/domain';

export class InboxIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InboxIntegrityError';
  }
}

export class InboxService {
  private state: InboxState;

  constructor(
    private readonly repository: InboxRepository,
    private readonly transport?: InboxTransportPort,
  ) {
    this.state = repository.load();
  }

  snapshot(): InboxState {
    return JSON.parse(JSON.stringify(this.state)) as InboxState;
  }

  createConversation(leadId: CrmId): InboxConversation {
    const existing = this.state.conversations.find((item) => item.leadId === leadId);
    if (existing) return existing;

    const conversation = createConversationRecord(leadId);
    this.state.conversations.push(conversation);
    this.persist();
    return conversation;
  }

  setTransportConnected(conversationId: CrmId, connected: boolean, externalThreadId?: string): InboxConversation {
    const conversation = this.requireConversation(conversationId);
    if (connected && !this.transport) {
      throw new InboxIntegrityError('Não é possível marcar o canal como conectado sem transporte real configurado.');
    }

    conversation.transportStatus = connected ? 'connected' : 'not_connected';
    conversation.externalThreadId = connected ? externalThreadId : undefined;
    conversation.updatedAt = nowIso();
    this.persist();
    return conversation;
  }

  getMessages(conversationId: CrmId): InboxMessage[] {
    this.requireConversation(conversationId);
    return this.state.messages
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  ingestIncomingMessage(input: IncomingTransportMessage): InboxMessage {
    const conversation = this.requireConversation(input.conversationId);
    if (input.externalMessageId) {
      const duplicate = this.state.messages.find(
        (message) => message.conversationId === conversation.id
          && message.externalMessageId === input.externalMessageId,
      );
      if (duplicate) return duplicate;
    }

    const createdAt = input.receivedAt ?? nowIso();
    const message: InboxMessage = {
      id: createCrmId('message'),
      conversationId: conversation.id,
      direction: 'inbound',
      type: input.type,
      text: input.text,
      attachment: input.attachment,
      formPayload: input.formPayload,
      deliveryStatus: 'received',
      externalMessageId: input.externalMessageId,
      createdAt,
    };

    this.state.messages.push(message);
    conversation.lastMessageAt = createdAt;
    conversation.updatedAt = createdAt;
    this.persist();
    return message;
  }

  async sendMessage(input: OutgoingTransportMessage): Promise<InboxMessage> {
    const conversation = this.requireConversation(input.conversationId);
    if (!this.transport) {
      throw new InboxIntegrityError('Transporte WhatsApp indisponível. Nenhuma mensagem foi enviada.');
    }

    this.validateMessage(input.type, input.text, input.attachment, input.formPayload);
    const pending: InboxMessage = {
      id: createCrmId('message'),
      conversationId: conversation.id,
      direction: 'outbound',
      type: input.type,
      text: input.text,
      attachment: input.attachment,
      formPayload: input.formPayload,
      deliveryStatus: 'pending',
      createdAt: nowIso(),
    };
    this.state.messages.push(pending);
    this.persist();

    try {
      const result = await this.transport.send(input);
      pending.deliveryStatus = 'sent';
      pending.externalMessageId = result.externalMessageId;
      const sentAt = result.sentAt ?? nowIso();
      conversation.transportStatus = 'connected';
      conversation.lastMessageAt = sentAt;
      conversation.updatedAt = sentAt;
      this.persist();
      return pending;
    } catch (error) {
      pending.deliveryStatus = 'failed';
      conversation.transportStatus = 'error';
      conversation.updatedAt = nowIso();
      this.persist();
      throw error;
    }
  }

  private validateMessage(
    type: MessageType,
    text?: string,
    attachment?: OutgoingTransportMessage['attachment'],
    formPayload?: Record<string, unknown>,
  ): void {
    if (type === 'text' && !text?.trim()) throw new InboxIntegrityError('Digite uma mensagem.');
    if (['audio', 'image', 'video', 'document'].includes(type) && !attachment) {
      throw new InboxIntegrityError('O arquivo da mensagem não foi informado.');
    }
    if (type === 'form' && !formPayload) throw new InboxIntegrityError('O formulário não foi informado.');
  }

  private requireConversation(id: CrmId): InboxConversation {
    const conversation = this.state.conversations.find((item) => item.id === id);
    if (!conversation) throw new InboxIntegrityError('Conversa não encontrada.');
    return conversation;
  }

  private persist(): void {
    this.repository.save(this.state);
  }
}
