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
    .select('id,status,metadata,revision')
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

  const patchValue = <K extends keyof ConnectionPatch>(key: K): ConnectionPatch[K] | undefined => (
    Object.prototype.hasOwnProperty.call(patch, key) ? patch[key] : undefined
  );

  const { error } = await db
    .from('integration_connections')
    .update({
      status,
      account_label: patchValue('accountLabel'),
      connected_at: patchValue('connectedAt'),
      last_health_at: patchValue('lastHealthAt'),
      last_event_at: patchValue('lastEventAt'),
      last_error_at: patchValue('lastErrorAt'),
      last_error_code: patchValue('lastErrorCode'),
      metadata,
      revision: Number((connection as { revision?: number }).revision ?? 0) + 1,
      updated_at: now,
    })
    .eq('id', connection.id);

  if (error) throw error;

  const channelUpdate = {
    status,
    last_heartbeat_at: patchValue('lastHealthAt'),
    last_event_at: patchValue('lastEventAt'),
    last_error_at: patchValue('lastErrorAt'),
    last_error_code: patchValue('lastErrorCode'),
    updated_at: now,
  };

  const { error: channelError } = await db
    .from('inbox_channel_accounts')
    .update(channelUpdate)
    .eq('connection_id', connection.id)
    .eq('provider', 'whatsapp_web');

  if (channelError) throw channelError;

  const conversationStatus = status === 'connected'
    ? 'connected'
    : status === 'degraded' || status === 'error'
      ? 'error'
      : 'not_connected';

  const { data: channelAccounts, error: channelAccountReadError } = await db
    .from('inbox_channel_accounts')
    .select('id')
    .eq('connection_id', connection.id)
    .eq('provider', 'whatsapp_web');

  if (channelAccountReadError) throw channelAccountReadError;

  const channelAccountIds = (channelAccounts ?? []).map((item) => item.id as string);
  if (channelAccountIds.length > 0) {
    const { error: conversationError } = await db
      .from('inbox_conversations')
      .update({
        transport_status: conversationStatus,
        updated_at: now,
      })
      .eq('provider', 'whatsapp_web')
      .in('channel_account_id', channelAccountIds);

    if (conversationError) throw conversationError;
  }

  return connection.id as string;
}

export async function heartbeat() {
  const now = new Date().toISOString();
  await setConnectionStatus('connected', {
    lastHealthAt: now,
    lastErrorAt: null,
    lastErrorCode: null,
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
      ? {
        lastEventAt: occurredAt,
        lastHealthAt: occurredAt,
        lastErrorAt: null,
        lastErrorCode: null,
      }
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
  const normalizedMimeType = input.mimeType.split(';')[0]?.trim().toLowerCase() || 'application/octet-stream';
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
      contentType: normalizedMimeType,
      upsert: false,
    });

  if (error) throw error;

  return {
    storageBucket: 'inbox-media',
    storagePath: path,
    size: input.bytes.length,
    mimeType: normalizedMimeType,
  };
}

export async function downloadOutboundMedia(input: {
  storageBucket: string;
  storagePath: string;
  mimeType?: string;
  name?: string;
}) {
  if (input.storageBucket !== 'inbox-media') {
    throw new Error('Bucket de mídia não autorizado.');
  }
  if (!input.storagePath.startsWith('outbound/')) {
    throw new Error('Caminho de mídia de saída inválido.');
  }

  const { data, error } = await db.storage
    .from(input.storageBucket)
    .download(input.storagePath);

  if (error || !data) {
    throw new Error(error?.message || 'Mídia de saída não encontrada.');
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) {
    throw new Error('Mídia de saída vazia ou acima de 25 MB.');
  }

  return {
    bytes,
    mimeType: input.mimeType || data.type || 'application/octet-stream',
    fileName: input.name || input.storagePath.split('/').pop() || 'arquivo',
  };
}

export async function getConversationDestination(conversationId: string) {
  const connection = await ensureConnection();
  const { data, error } = await db
    .from('inbox_conversations')
    .select('external_thread_id,provider,channel_account_id')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  if (data.provider !== 'whatsapp_web' || !data.external_thread_id || !data.channel_account_id) {
    throw new Error('Conversa não pertence a uma conta WhatsApp conectada.');
  }

  const { data: account, error: accountError } = await db
    .from('inbox_channel_accounts')
    .select('id')
    .eq('id', data.channel_account_id)
    .eq('connection_id', connection.id)
    .eq('provider', 'whatsapp_web')
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account) {
    throw new Error('Esta conversa está vinculada a outra conta WhatsApp.');
  }

  return String(data.external_thread_id);
}
