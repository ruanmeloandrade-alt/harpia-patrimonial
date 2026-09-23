import { requireSupabase } from '../../core/supabase/client';
import type {
  InboxConversation,
  InboxMessage,
  InboxState,
  MessageAttachment,
} from '../../features/inbox/domain';
import { createEmptyInboxState } from '../../features/inbox/domain';
import type { InboxRepository } from '../../features/inbox/repository';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function same(valueA: unknown, valueB: unknown) {
  return JSON.stringify(valueA) === JSON.stringify(valueB);
}

function persistenceError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Falha de persistência normalizada da Inbox.';
  console.error('[inbox] normalized persistence failed', error);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:persistence-error', {
      detail: { module: 'inbox', message },
    }));
  }
}

function notifyInboxUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('harpia:inbox-updated'));
  }
}

type ConversationRow = {
  id: string;
  lead_id: string;
  channel: InboxConversation['channel'];
  transport_status: InboxConversation['transportStatus'];
  external_thread_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  direction: InboxMessage['direction'];
  type: InboxMessage['type'];
  text_content: string | null;
  form_payload: Record<string, unknown> | null;
  delivery_status: InboxMessage['deliveryStatus'];
  external_message_id: string | null;
  created_at: string;
};

type AttachmentRow = {
  message_id: string;
  name: string | null;
  mime_type: string | null;
  url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  size_bytes: number | null;
};

function conversationFromRow(row: ConversationRow): InboxConversation {
  return {
    id: row.id,
    leadId: row.lead_id,
    channel: row.channel,
    transportStatus: row.transport_status,
    externalThreadId: row.external_thread_id ?? undefined,
    lastMessageAt: row.last_message_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function attachmentFromRow(row: AttachmentRow | undefined): MessageAttachment | undefined {
  if (!row) return undefined;
  return {
    name: row.name ?? undefined,
    mimeType: row.mime_type ?? undefined,
    url: row.url ?? undefined,
    size: row.size_bytes ?? undefined,
  };
}

async function resolvePrivateAttachmentUrl(row: AttachmentRow): Promise<AttachmentRow> {
  if (row.url || !row.storage_bucket || !row.storage_path) return row;

  const supabase = requireSupabase() as any;
  const { data, error } = await supabase.storage
    .from(row.storage_bucket)
    .createSignedUrl(row.storage_path, 60 * 60);

  if (error) {
    console.warn('[inbox] signed media url failed', {
      messageId: row.message_id,
      bucket: row.storage_bucket,
      error: error.message,
    });
    return row;
  }

  return {
    ...row,
    url: data?.signedUrl ?? null,
  };
}

function messageFromRow(row: MessageRow, attachment?: AttachmentRow): InboxMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    direction: row.direction,
    type: row.type,
    text: row.text_content ?? undefined,
    attachment: attachmentFromRow(attachment),
    formPayload: row.form_payload ?? undefined,
    deliveryStatus: row.delivery_status,
    externalMessageId: row.external_message_id ?? undefined,
    createdAt: row.created_at,
  };
}

function conversationToRow(conversation: InboxConversation) {
  return {
    id: conversation.id,
    lead_id: conversation.leadId,
    channel: conversation.channel,
    transport_status: conversation.transportStatus,
    external_thread_id: conversation.externalThreadId ?? null,
    last_message_at: conversation.lastMessageAt ?? null,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };
}

function messageToRow(message: InboxMessage) {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    direction: message.direction,
    type: message.type,
    text_content: message.text ?? null,
    form_payload: message.formPayload ?? null,
    delivery_status: message.deliveryStatus,
    external_message_id: message.externalMessageId ?? null,
    created_at: message.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function attachmentToRow(message: InboxMessage) {
  if (!message.attachment) return null;
  return {
    message_id: message.id,
    name: message.attachment.name ?? null,
    mime_type: message.attachment.mimeType ?? null,
    url: message.attachment.url ?? null,
    size_bytes: message.attachment.size ?? null,
  };
}

function changedIds<T extends { id: string }>(base: T[], pending: T[]) {
  const baseById = new Map(base.map((item) => [item.id, item]));
  return pending
    .filter((item) => !same(baseById.get(item.id), item))
    .map((item) => item.id);
}

function removedIds<T extends { id: string }>(base: T[], pending: T[]) {
  const pendingIds = new Set(pending.map((item) => item.id));
  return base.filter((item) => !pendingIds.has(item.id)).map((item) => item.id);
}

async function deleteByIds(table: string, ids: string[]) {
  if (ids.length === 0) return;
  const supabase = requireSupabase() as any;
  const { error } = await supabase.from(table).delete().in('id', ids);
  if (error) throw error;
}

export class SupabaseNormalizedInboxRepository implements InboxRepository {
  private memory: InboxState;
  private base: InboxState;
  private queue: Promise<void> = Promise.resolve();

  constructor(initialState: InboxState) {
    this.memory = clone(initialState);
    this.base = clone(initialState);
  }

  load(): InboxState {
    return clone(this.memory);
  }

  save(state: InboxState): void {
    const pending = clone(state);
    this.memory = clone(pending);
    this.queue = this.queue
      .then(() => this.persist(pending))
      .catch((error) => persistenceError(error));
  }

  clear(): void {
    this.save(createEmptyInboxState());
  }

  async whenIdle() {
    await this.queue;
  }

  private async persist(pending: InboxState) {
    const supabase = requireSupabase() as any;

    const removedMessageIds = removedIds(this.base.messages, pending.messages);
    const removedConversationIds = removedIds(this.base.conversations, pending.conversations);
    const changedConversationIds = new Set(changedIds(this.base.conversations, pending.conversations));
    const changedMessageIds = new Set(changedIds(this.base.messages, pending.messages));

    if (removedMessageIds.length > 0) {
      await deleteByIds('inbox_messages', removedMessageIds);
    }

    if (removedConversationIds.length > 0) {
      await deleteByIds('inbox_conversations', removedConversationIds);
    }

    const conversationsToPersist = pending.conversations
      .filter((conversation) => changedConversationIds.has(conversation.id))
      .map(conversationToRow);

    if (conversationsToPersist.length > 0) {
      const { error } = await supabase
        .from('inbox_conversations')
        .upsert(conversationsToPersist, { onConflict: 'id' });
      if (error) throw error;
    }

    const messagesToPersist = pending.messages
      .filter((message) => changedMessageIds.has(message.id))
      .map(messageToRow);

    if (messagesToPersist.length > 0) {
      const { error } = await supabase
        .from('inbox_messages')
        .upsert(messagesToPersist, { onConflict: 'id' });
      if (error) throw error;
    }

    const baseMessages = new Map(this.base.messages.map((message) => [message.id, message]));
    const attachmentChangedIds = pending.messages
      .filter((message) => {
        const previous = baseMessages.get(message.id);
        return !same(previous?.attachment, message.attachment);
      })
      .map((message) => message.id);

    if (attachmentChangedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('inbox_message_attachments')
        .delete()
        .in('message_id', attachmentChangedIds);
      if (deleteError) throw deleteError;

      const attachments = pending.messages
        .filter((message) => attachmentChangedIds.includes(message.id))
        .map(attachmentToRow)
        .filter((attachment): attachment is NonNullable<typeof attachment> => attachment !== null);

      if (attachments.length > 0) {
        const { error: insertError } = await supabase
          .from('inbox_message_attachments')
          .insert(attachments);
        if (insertError) throw insertError;
      }
    }

    this.base = clone(pending);
    notifyInboxUpdated();
  }
}

export async function hydrateNormalizedInboxRepository() {
  const supabase = requireSupabase() as any;

  const [conversationsResult, messagesResult, attachmentsResult] = await Promise.all([
    supabase
      .from('inbox_conversations')
      .select('id,lead_id,channel,transport_status,external_thread_id,last_message_at,created_at,updated_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('inbox_messages')
      .select('id,conversation_id,direction,type,text_content,form_payload,delivery_status,external_message_id,created_at')
      .order('created_at', { ascending: true }),
    supabase
      .from('inbox_message_attachments')
      .select('message_id,name,mime_type,url,storage_bucket,storage_path,size_bytes')
      .order('created_at', { ascending: true }),
  ]);

  if (conversationsResult.error) throw conversationsResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (attachmentsResult.error) throw attachmentsResult.error;

  const resolvedAttachments = await Promise.all(
    ((attachmentsResult.data ?? []) as AttachmentRow[]).map(resolvePrivateAttachmentUrl),
  );

  const attachmentsByMessage = new Map<string, AttachmentRow>();
  for (const row of resolvedAttachments) {
    if (!attachmentsByMessage.has(row.message_id)) attachmentsByMessage.set(row.message_id, row);
  }

  const state: InboxState = {
    version: 1,
    conversations: ((conversationsResult.data ?? []) as ConversationRow[]).map(conversationFromRow),
    messages: ((messagesResult.data ?? []) as MessageRow[])
      .map((row) => messageFromRow(row, attachmentsByMessage.get(row.id))),
  };

  return new SupabaseNormalizedInboxRepository(state);
}
