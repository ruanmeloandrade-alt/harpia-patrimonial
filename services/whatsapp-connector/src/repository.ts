import { randomUUID } from 'node:crypto';
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
  type: 'text' | 'audio' | 'image' | 'video' | 'document';
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

async function getConnection(sessionId: string) {
  const { data, error } = await db
    .from('integration_connections')
    .select('id,status,metadata,revision,external_account_id,account_label,connected_at,last_health_at,last_event_at,last_error_at,last_error_code')
    .eq('provider', 'whatsapp')
    .eq('external_account_id', sessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureConnection(sessionId: string) {
  const existing = await getConnection(sessionId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const { data, error } = await db
    .from('integration_connections')
    .insert({
      provider: 'whatsapp',
      status: 'not_connected',
      external_account_id: sessionId,
      account_label: 'WhatsApp Web',
      metadata: {
        transport: 'whatsapp_web',
        sessionId,
      },
      created_at: now,
      updated_at: now,
    })
    .select('id,status,metadata,revision,external_account_id,account_label,connected_at,last_health_at,last_event_at,last_error_at,last_error_code')
    .single();

  if (error) throw error;
  return data;
}

export async function listWhatsAppSessions() {
  const { data, error } = await db
    .from('integration_connections')
    .select('id,status,metadata,external_account_id,account_label,connected_at,last_health_at,last_event_at,last_error_at,last_error_code,updated_at')
    .eq('provider', 'whatsapp')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function setConnectionStatus(
  sessionId: string,
  status: ConnectorStatus,
  patch: ConnectionPatch = {},
) {
  const connection = await ensureConnection(sessionId);
  const now = new Date().toISOString();

  const metadata = {
    ...(connection.metadata && typeof connection.metadata === 'object'
      ? connection.metadata as Record<string, unknown>
      : {}),
    ...(patch.metadata ?? {}),
    transport: 'whatsapp_web',
    sessionId,
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

  const { data: channelAccounts, error: channelReadError } = await db
    .from('inbox_channel_accounts')
    .select('id')
    .eq('connection_id', connection.id)
    .eq('provider', 'whatsapp_web');

  if (channelReadError) throw channelReadError;

  const accountIds = (channelAccounts ?? []).map((item) => String(item.id));

  if (accountIds.length > 0) {
    const { error: channelError } = await db
      .from('inbox_channel_accounts')
      .update(channelUpdate)
      .in('id', accountIds);

    if (channelError) throw channelError;

    const conversationStatus = status === 'connected'
      ? 'connected'
      : status === 'degraded' || status === 'error'
        ? 'error'
        : 'not_connected';

    const { error: conversationError } = await db
      .from('inbox_conversations')
      .update({
        transport_status: conversationStatus,
        updated_at: now,
      })
      .in('channel_account_id', accountIds);

    if (conversationError) throw conversationError;
  }

  return String(connection.id);
}

export async function heartbeat(sessionId: string) {
  const now = new Date().toISOString();
  await setConnectionStatus(sessionId, 'connected', {
    lastHealthAt: now,
    lastErrorAt: null,
    lastErrorCode: null,
  });
}

export async function recordIntegrationEvent(sessionId: string, input: {
  eventType: string;
  success: boolean;
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const connection = await ensureConnection(sessionId);
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
      metadata: {
        ...(input.metadata ?? {}),
        sessionId,
      },
      occurred_at: occurredAt,
    });

  if (error) throw error;

  await setConnectionStatus(
    sessionId,
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

export async function upsertChannelAccount(sessionId: string, input: {
  phoneNumber: string;
  displayName?: string;
  connectorVersion?: string;
}) {
  const connection = await ensureConnection(sessionId);
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
        phone_number: externalAccountId,
        display_name: input.displayName ?? null,
        status: 'connected',
        last_heartbeat_at: now,
        last_event_at: now,
        connector_version: input.connectorVersion ?? null,
        metadata: { sessionId },
        updated_at: now,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return String(existing.id);
  }

  const { data, error } = await db
    .from('inbox_channel_accounts')
    .insert({
      connection_id: connection.id,
      channel: 'whatsapp',
      provider: 'whatsapp_web',
      external_account_id: externalAccountId,
      phone_number: externalAccountId,
      display_name: input.displayName ?? null,
      status: 'connected',
      last_heartbeat_at: now,
      last_event_at: now,
      connector_version: input.connectorVersion ?? null,
      metadata: { sessionId },
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error) throw error;
  return String(data.id);
}

export async function getSessionChannelAccountId(sessionId: string) {
  const connection = await ensureConnection(sessionId);
  const { data, error } = await db
    .from('inbox_channel_accounts')
    .select('id')
    .eq('connection_id', connection.id)
    .eq('provider', 'whatsapp_web')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ? String(data.id) : undefined;
}

export async function getConversationSessionId(conversationId: string) {
  const { data: conversation, error: conversationError } = await db
    .from('inbox_conversations')
    .select('channel_account_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (conversationError) throw conversationError;
  if (!conversation?.channel_account_id) return undefined;

  const { data: account, error: accountError } = await db
    .from('inbox_channel_accounts')
    .select('connection_id')
    .eq('id', conversation.channel_account_id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account?.connection_id) return undefined;

  const { data: connection, error: connectionError } = await db
    .from('integration_connections')
    .select('external_account_id')
    .eq('id', account.connection_id)
    .eq('provider', 'whatsapp')
    .maybeSingle();

  if (connectionError) throw connectionError;
  return connection?.external_account_id ? String(connection.external_account_id) : undefined;
}

export async function ingestIncomingMessage(sessionId: string, input: IncomingMessageInput) {
  const channelAccountId = await getSessionChannelAccountId(sessionId);
  if (!channelAccountId) throw new Error('Conta WhatsApp da sessão não encontrada.');

  const { data, error } = await db.rpc('admin_ingest_whatsapp_message', {
    p_external_message_id: input.externalMessageId,
    p_thread_id: input.threadId,
    p_phone: input.phone,
    p_display_name: input.displayName ?? null,
    p_type: input.type,
    p_text: input.text ?? null,
    p_received_at: input.receivedAt,
    p_attachment: input.attachment ?? null,
    p_metadata: {
      ...(input.metadata ?? {}),
      sessionId,
    },
    p_channel_account_id: channelAccountId,
  });

  if (error) throw error;
  return data as {
    duplicate: boolean;
    leadId: string;
    conversationId: string;
    messageId: string;
  };
}

export async function uploadInboundMedia(sessionId: string, input: {
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
    sessionId,
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

export async function getConversationDestination(sessionId: string, conversationId: string) {
  const connection = await ensureConnection(sessionId);
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
  if (!account) throw new Error('Esta conversa está vinculada a outra conta WhatsApp.');

  return String(data.external_thread_id);
}


export async function listWhatsAppRecoveryCandidates(sessionId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db.rpc('admin_list_whatsapp_recovery_candidates', {
    p_session_id: sessionId,
    p_since: since,
    p_limit: 25,
  });

  if (error) throw error;

  return ((data ?? []) as Array<{
    external_message_id?: string | null;
    failed_at?: string | null;
    lid?: string | null;
    identity_updated_at?: string | null;
    seconds_after_identity?: number | string | null;
  }>).flatMap((row) => {
    const externalMessageId = String(row.external_message_id || '').trim();
    const lid = String(row.lid || '').replace(/\D/g, '');
    if (!externalMessageId || !lid) return [];
    return [{
      externalMessageId,
      failedAt: row.failed_at ? String(row.failed_at) : undefined,
      lid,
      identityUpdatedAt: row.identity_updated_at ? String(row.identity_updated_at) : undefined,
      secondsAfterIdentity: Number(row.seconds_after_identity ?? 0),
    }];
  });
}
