import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { db } from './db.js';

export type ConnectorStatus =
  | 'not_connected'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'reauth_required'
  | 'error';

export type IncomingMessageInput = {
  externalMessageId: string;
  threadId: string;
  phone: string;
  displayName?: string;
  type: 'text' | 'audio' | 'image' | 'video' | 'document' | 'form';
  text?: string;
  receivedAt: string;
  attachment?: {
    name?: string;
    mimeType?: string;
    storageBucket?: string;
    storagePath?: string;
    size?: number;
    providerMediaId?: string;
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
};

type ConnectionPatch = {
  accountLabel?: string | null;
  connectedAt?: string | null;
  lastHealthAt?: string | null;
  lastEventAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorCode?: string | null;
  metadata?: Record<string, unknown>;
};

async function getConnection() {
  const { data, error } = await db
    .from('integration_connections')
    .select('id,status,metadata')
    .eq('provider', 'whatsapp')
    .eq('external_account_id', config.sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureConnection() {
  const existing = await getConnection();
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('integration_connections')
    .insert({
      provider: 'whatsapp',
      status: 'not_connected',
      external_account_id: config.sessionId,
      account_label: 'WhatsApp Web',
      metadata: {
        transport: 'whatsapp_web',
        sessionId: config.sessionId,
      },
      created_at: now,
      updated_at: now,
    })
    .select('id,status,metadata')
    .single();

  if (error) throw error;
  return data;
}

export async function setConnectionStatus(
  status: ConnectorStatus,
  patch: ConnectionPatch = {},
) {
  const connection = await ensureConnection();
  const now = new Date().toISOString();

  const metadata = {
    ...(connection.metadata && typeof connection.metadata === 'object'
      ? connection.metadata as Record<string, unknown>
      : {}),
    ...(patch.metadata ?? {}),
    transport: 'whatsapp_web',
    sessionId: config.sessionId,
  };

  const { error } = await db
    .from('integration_connections')
    .update({
      status,
      account_label: patch.accountLabel ?? undefined,
      connected_at: patch.connectedAt ?? undefined,
      last_health_at: patch.lastHealthAt ?? undefined,
      last_event_at: patch.lastEventAt ?? undefined,
      last_error_at: patch.lastErrorAt ?? undefined,
      last_error_code: patch.lastErrorCode ?? undefined,
      metadata,
      revision: Number((connection as { revision?: number }).revision ?? 0) + 1,
      updated_at: now,
    })
    .eq('id', connection.id);

  if (error) throw error;
  return connection.id as string;
}

export async function heartbeat() {
  const now = new Date().toISOString();
  await setConnectionStatus('connected', {
    lastHealthAt: now,
  });
}

export async function recordIntegrationEvent(input: {
  eventType: string;
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const connection = await ensureConnection();
  const occurredAt = new Date().toISOString();

  const { error } = await db
    .from('integration_events')
    .insert({
      connection_id: connection.id,
      provider: 'whatsapp',
      event_type: input.eventType,
      external_id: input.externalId ?? null,
      success: input.success,
      attempt: 1,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage?.slice(0, 1000) ?? null,
      metadata: input.metadata ?? {},
      occurred_at: occurredAt,
    });

  if (error) throw error;

  await setConnectionStatus(
    input.success ? 'connected' : 'degraded',
    input.success
      ? { lastEventAt: occurredAt, lastHealthAt: occurredAt }
      : {
        lastErrorAt: occurredAt,
        lastErrorCode: input.errorCode ?? 'connector_error',
      },
  );
}

export async function upsertChannelAccount(input: {
  phoneNumber: string;
  displayName?: string;
  connectorVersion?: string;
}) {
  const connection = await ensureConnection();
  const externalAccountId = input.phoneNumber.replace(/\D/g, '');
  const now = new Date().toISOString();

  const { data: existing, error: readError } = await db
    .from('inbox_channel_accounts')
    .select('id')
    .eq('provider', 'whatsapp_web')
    .eq('external_account_id', externalAccountId)
    .maybeSingle();

  if (readError) throw readError;

  if (existing?.id) {
    const { error } = await db
      .from('inbox_channel_accounts')
      .update({
        connection_id: connection.id,
        channel: 'whatsapp',
        phone_number: input.phoneNumber,
        display_name: input.displayName ?? null,
        status: 'connected',
        last_heartbeat_at: now,
        last_event_at: now,
        connector_version: input.connectorVersion ?? null,
        updated_at: now,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id as string;
  }

  const { data, error } = await db
    .from('inbox_channel_accounts')
    .insert({
      connection_id: connection.id,
      channel: 'whatsapp',
      provider: 'whatsapp_web',
      external_account_id: externalAccountId,
      phone_number: input.phoneNumber,
      display_name: input.displayName ?? null,
      status: 'connected',
      last_heartbeat_at: now,
      last_event_at: now,
      connector_version: input.connectorVersion ?? null,
      metadata: {},
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function ingestIncomingMessage(input: IncomingMessageInput) {
  const { data, error } = await db.rpc('admin_ingest_whatsapp_message', {
    p_external_message_id: input.externalMessageId,
    p_thread_id: input.threadId,
    p_phone: input.phone,
    p_display_name: input.displayName ?? null,
    p_type: input.type,
    p_text: input.text ?? null,
    p_received_at: input.receivedAt,
    p_attachment: input.attachment ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) throw error;
  return data as {
    duplicate: boolean;
    leadId: string;
    conversationId: string;
    messageId: string;
  };
}

export async function uploadInboundMedia(input: {
  externalMessageId: string;
  bytes: Buffer;
  mimeType: string;
  fileName?: string;
}) {
  const date = new Date();
  const safeName = (input.fileName || 'media')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(-120);
  const path = [
    config.sessionId,
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    `${input.externalMessageId}-${randomUUID()}-${safeName}`,
  ].join('/');

  const { error } = await db.storage
    .from('inbox-media')
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) throw error;

  return {
    storageBucket: 'inbox-media',
    storagePath: path,
    size: input.bytes.length,
    mimeType: input.mimeType,
  };
}

export async function getConversationDestination(conversationId: string) {
  const { data, error } = await db
    .from('inbox_conversations')
    .select('external_thread_id,provider')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  if (data.provider !== 'whatsapp_web' || !data.external_thread_id) {
    throw new Error('Conversa não pertence ao transporte WhatsApp Web.');
  }

  return String(data.external_thread_id);
}
