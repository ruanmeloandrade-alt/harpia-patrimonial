import { CrmId, IsoDateTime, createCrmId, nowIso } from '../crm/domain';

export type ConversationChannel = 'whatsapp' | 'email' | 'other';
export type TransportStatus = 'not_connected' | 'connected' | 'error';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageType = 'text' | 'audio' | 'image' | 'video' | 'document' | 'form';
export type MessageDeliveryStatus = 'received' | 'sent' | 'failed' | 'pending';

export interface InboxConversation {
  id: CrmId;
  leadId: CrmId;
  channel: ConversationChannel;
  transportStatus: TransportStatus;
  externalThreadId?: string;
  lastMessageAt?: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface MessageAttachment {
  name?: string;
  mimeType?: string;
  url?: string;
  size?: number;
  storageBucket?: string;
  storagePath?: string;
}

export interface MessageAttachmentUpload {
  name: string;
  mimeType: string;
  size: number;
  body: Blob;
}

export interface InboxMessage {
  id: CrmId;
  conversationId: CrmId;
  direction: MessageDirection;
  type: MessageType;
  text?: string;
  attachment?: MessageAttachment;
  formPayload?: Record<string, unknown>;
  deliveryStatus: MessageDeliveryStatus;
  externalMessageId?: string;
  createdAt: IsoDateTime;
}

export interface InboxState {
  version: 1;
  conversations: InboxConversation[];
  messages: InboxMessage[];
}

export interface IncomingTransportMessage {
  conversationId: CrmId;
  externalMessageId?: string;
  type: MessageType;
  text?: string;
  attachment?: MessageAttachment;
  formPayload?: Record<string, unknown>;
  receivedAt?: IsoDateTime;
}

export interface OutgoingTransportMessage {
  conversationId: CrmId;
  type: MessageType;
  text?: string;
  attachment?: MessageAttachment;
  formPayload?: Record<string, unknown>;
}

export interface InboxTransportPort {
  prepareConversation?(conversationId: CrmId): Promise<{ externalThreadId?: string }>;
  uploadAttachment?(input: MessageAttachmentUpload): Promise<MessageAttachment>;
  send(message: OutgoingTransportMessage): Promise<{ externalMessageId: string; sentAt?: IsoDateTime }>;
}

export const createEmptyInboxState = (): InboxState => ({
  version: 1,
  conversations: [],
  messages: [],
});

export const createConversationRecord = (
  leadId: CrmId,
  channel: ConversationChannel = 'whatsapp',
): InboxConversation => {
  const timestamp = nowIso();
  return {
    id: createCrmId('conversation'),
    leadId,
    channel,
    transportStatus: 'not_connected',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
