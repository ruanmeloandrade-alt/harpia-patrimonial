import { Boom } from '@hapi/boom';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  getContentType,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  normalizeMessageContent,
  type WAMessage,
} from '@whiskeysockets/baileys';
import { createDatabaseAuthState } from './authStore.js';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  getConversationDestination,
  heartbeat,
  ingestIncomingMessage,
  recordIntegrationEvent,
  setConnectionStatus,
  uploadInboundMedia,
  upsertChannelAccount,
} from './repository.js';

type Socket = ReturnType<typeof makeWASocket>;

type SendInput = {
  conversationId: string;
  type: 'text' | 'audio' | 'image' | 'video' | 'document' | 'form';
  text?: string;
};

export type ConnectorSnapshot = {
  status: 'not_connected' | 'connecting' | 'connected' | 'degraded' | 'reauth_required' | 'error';
  qrAvailable: boolean;
  phoneNumber?: string;
  lastProtocolEventAt?: string;
  reconnectAttempt: number;
};

function timestampFromMessage(message: WAMessage) {
  const raw = message.messageTimestamp;
  const seconds = typeof raw === 'number'
    ? raw
    : Number(raw?.toString?.() || 0);
  return new Date((Number.isFinite(seconds) && seconds > 0 ? seconds : Date.now() / 1000) * 1000).toISOString();
}

function phoneFromPnJid(jid: string) {
  const normalized = jidNormalizedUser(jid);
  if (!normalized.endsWith('@s.whatsapp.net')) return '';
  return normalized.split('@')[0]?.replace(/\D/g, '') || '';
}

async function resolvePnJid(socket: Socket, ...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = jidNormalizedUser(candidate);
    if (normalized.endsWith('@s.whatsapp.net')) return normalized;
  }

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = jidNormalizedUser(candidate);
    if (!normalized.endsWith('@lid')) continue;
    const pn = await socket.signalRepository.lidMapping.getPNForLID(normalized);
    if (pn) return jidNormalizedUser(pn);
  }

  return undefined;
}

function extractText(content: ReturnType<typeof normalizeMessageContent>) {
  if (!content) return undefined;
  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;
  if (content.imageMessage?.caption) return content.imageMessage.caption;
  if (content.videoMessage?.caption) return content.videoMessage.caption;
  if (content.documentMessage?.caption) return content.documentMessage.caption;
  return undefined;
}

function classifyMessage(content: ReturnType<typeof normalizeMessageContent>) {
  const type = getContentType(content);
  if (type === 'imageMessage') return 'image' as const;
  if (type === 'videoMessage') return 'video' as const;
  if (type === 'audioMessage') return 'audio' as const;
  if (type === 'documentMessage') return 'document' as const;
  if (type === 'conversation' || type === 'extendedTextMessage') return 'text' as const;
  return null;
}

function mediaInfo(content: ReturnType<typeof normalizeMessageContent>, type: 'audio' | 'image' | 'video' | 'document') {
  if (!content) return null;
  const media = type === 'image'
    ? content.imageMessage
    : type === 'video'
      ? content.videoMessage
      : type === 'audio'
        ? content.audioMessage
        : content.documentMessage;

  if (!media) return null;

  return {
    mimeType: media.mimetype || 'application/octet-stream',
    fileName: 'fileName' in media && media.fileName ? media.fileName : undefined,
  };
}

export class WhatsAppConnector {
  private socket: Socket | null = null;
  private authState: Awaited<ReturnType<typeof createDatabaseAuthState>> | null = null;
  private qr: string | null = null;
  private phoneNumber: string | undefined;
  private status: ConnectorSnapshot['status'] = 'not_connected';
  private lastProtocolEventAt: string | undefined;
  private manualStop = false;
  private starting = false;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  snapshot(): ConnectorSnapshot {
    return {
      status: this.status,
      qrAvailable: Boolean(this.qr),
      phoneNumber: this.phoneNumber,
      lastProtocolEventAt: this.lastProtocolEventAt,
      reconnectAttempt: this.reconnectAttempt,
    };
  }

  currentQr() {
    return this.qr;
  }

  async start() {
    if (this.starting || this.socket) return this.snapshot();

    this.starting = true;
    this.manualStop = false;
    this.clearReconnectTimer();
    this.status = 'connecting';
    await setConnectionStatus('connecting', {
      lastErrorCode: null,
      metadata: { qrAvailable: false },
    });

    try {
      this.authState = await createDatabaseAuthState(config.sessionId);

      const socket = makeWASocket({
        auth: {
          creds: this.authState.state.creds,
          keys: makeCacheableSignalKeyStore(
            this.authState.state.keys as never,
            logger.child({ module: 'baileys-keys' }) as never,
          ),
        },
        logger: logger.child({ module: 'baileys' }) as never,
        browser: Browsers.ubuntu('Harpia Patrimonial'),
        markOnlineOnConnect: false,
        syncFullHistory: false,
        shouldSyncHistoryMessage: () => false,
        generateHighQualityLinkPreview: false,
      });

      this.socket = socket;
      this.bindSocket(socket);
      return this.snapshot();
    } catch (error) {
      this.socket = null;
      this.status = 'error';
      const message = error instanceof Error ? error.message : 'Falha ao iniciar WhatsApp Web.';
      await setConnectionStatus('error', {
        lastErrorAt: new Date().toISOString(),
        lastErrorCode: 'startup_failed',
      }).catch(() => undefined);
      await recordIntegrationEvent({
        eventType: 'connector_start',
        success: false,
        errorCode: 'startup_failed',
        errorMessage: message,
      }).catch(() => undefined);
      this.scheduleReconnect();
      throw error;
    } finally {
      this.starting = false;
    }
  }

  async reconnect() {
    this.manualStop = false;
    this.clearReconnectTimer();
    this.stopHeartbeat();

    if (this.socket) {
      try {
        this.socket.end(new Error('manual reconnect'));
      } catch {
        // O socket pode já estar encerrado.
      }
      this.socket = null;
    }

    return this.start();
  }

  async disconnect() {
    this.manualStop = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.qr = null;

    const socket = this.socket;
    this.socket = null;

    if (socket) {
      try {
        await socket.logout();
      } catch (error) {
        logger.warn({ error }, 'Falha ao encerrar sessão no WhatsApp. O estado local ainda será removido.');
      }
    }

    await this.authState?.clear();
    this.authState = null;
    this.phoneNumber = undefined;
    this.status = 'not_connected';
    this.reconnectAttempt = 0;

    await setConnectionStatus('not_connected', {
      lastHealthAt: new Date().toISOString(),
      metadata: { qrAvailable: false, disconnectedByUser: true },
    });
    await recordIntegrationEvent({
      eventType: 'manual_disconnect',
      success: true,
    });
  }

  async send(input: SendInput) {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('WhatsApp Web não está conectado.');
    }
    if (input.type !== 'text') {
      throw new Error('Envio de mídia ainda não está habilitado no conector.');
    }

    const text = input.text?.trim();
    if (!text) throw new Error('Mensagem de texto vazia.');

    const destination = await getConversationDestination(input.conversationId);
    const startedAt = Date.now();

    try {
      const response = await this.socket.sendMessage(destination, { text });
      const externalMessageId = response?.key?.id;
      if (!externalMessageId) throw new Error('WhatsApp confirmou envio sem ID externo.');

      await recordIntegrationEvent({
        eventType: 'message_sent',
        success: true,
        externalId: externalMessageId,
        latencyMs: Date.now() - startedAt,
        metadata: { conversationId: input.conversationId, type: input.type },
      });

      return {
        externalMessageId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      await recordIntegrationEvent({
        eventType: 'message_send_failed',
        success: false,
        errorCode: 'send_failed',
        errorMessage: error instanceof Error ? error.message : 'Falha ao enviar mensagem.',
        latencyMs: Date.now() - startedAt,
        metadata: { conversationId: input.conversationId, type: input.type },
      }).catch(() => undefined);
      throw error;
    }
  }

  private bindSocket(socket: Socket) {
    socket.ev.on('creds.update', async () => {
      try {
        await this.authState?.saveCreds();
      } catch (error) {
        logger.error({ error }, 'Falha ao persistir credenciais atualizadas do WhatsApp.');
        this.status = 'degraded';
        await setConnectionStatus('degraded', {
          lastErrorAt: new Date().toISOString(),
          lastErrorCode: 'auth_persist_failed',
        }).catch(() => undefined);
      }
    });

    socket.ev.on('connection.update', async (update) => {
      this.lastProtocolEventAt = new Date().toISOString();

      if (update.qr) {
        this.qr = update.qr;
        this.status = 'connecting';
        await setConnectionStatus('connecting', {
          lastHealthAt: this.lastProtocolEventAt,
          metadata: { qrAvailable: true },
        }).catch((error) => logger.error({ error }, 'Falha ao registrar QR disponível.'));
      }

      if (update.connection === 'open') {
        this.qr = null;
        this.status = 'connected';
        this.reconnectAttempt = 0;

        const userPnJid = await resolvePnJid(
          socket,
          socket.user?.id,
          socket.user?.lid,
        );
        const phoneNumber = userPnJid ? phoneFromPnJid(userPnJid) : '';
        this.phoneNumber = phoneNumber || undefined;

        if (phoneNumber) {
          await upsertChannelAccount({
            phoneNumber,
            displayName: socket.user?.name || undefined,
            connectorVersion: 'baileys-7.0.0-rc14',
          }).catch((error) => logger.error({ error }, 'Falha ao registrar conta do canal.'));
        }

        const now = new Date().toISOString();
        await setConnectionStatus('connected', {
          accountLabel: phoneNumber ? `+${phoneNumber}` : 'WhatsApp Web',
          connectedAt: now,
          lastHealthAt: now,
          lastEventAt: now,
          lastErrorCode: null,
          metadata: { qrAvailable: false },
        });

        await recordIntegrationEvent({
          eventType: 'connection_open',
          success: true,
          metadata: { hasPhoneNumber: Boolean(phoneNumber) },
        });

        this.startHeartbeat();
      }

      if (update.connection === 'close') {
        this.stopHeartbeat();
        this.socket = null;
        this.qr = null;

        const disconnectError = update.lastDisconnect?.error as {
          output?: { statusCode?: number };
        } | Error | undefined;
        const statusCode = disconnectError
          ? ('output' in disconnectError && disconnectError.output?.statusCode
            ? disconnectError.output.statusCode
            : new Boom(disconnectError as Error).output.statusCode)
          : undefined;
        const loggedOut = statusCode === DisconnectReason.loggedOut;

        if (loggedOut) {
          this.manualStop = true;
          this.status = 'reauth_required';
          await this.authState?.clear().catch(() => undefined);
          this.authState = null;

          await recordIntegrationEvent({
            eventType: 'connection_logged_out',
            success: false,
            errorCode: 'logged_out',
            errorMessage: 'A sessão do WhatsApp foi revogada e precisa de novo pareamento.',
          }).catch(() => undefined);
          await setConnectionStatus('reauth_required', {
            lastErrorAt: new Date().toISOString(),
            lastErrorCode: 'logged_out',
            metadata: { qrAvailable: false },
          });
          return;
        }

        if (this.manualStop) return;

        this.status = 'degraded';
        await recordIntegrationEvent({
          eventType: 'connection_closed',
          success: false,
          errorCode: statusCode ? `wa_${statusCode}` : 'connection_closed',
          errorMessage: 'Conexão com WhatsApp Web foi encerrada.',
        }).catch(() => undefined);
        this.scheduleReconnect();
      }
    });

    socket.ev.on('messages.upsert', async (event) => {
      if ((event as { requestId?: unknown }).requestId) {
        logger.warn('Evento messages.upsert com requestId descartado.');
        return;
      }
      if (event.type !== 'notify') return;

      this.lastProtocolEventAt = new Date().toISOString();

      for (const message of event.messages) {
        try {
          await this.handleIncomingMessage(socket, message);
        } catch (error) {
          const externalId = message.key.id || undefined;
          logger.error({ error, externalId }, 'Falha ao ingerir mensagem recebida.');
          await recordIntegrationEvent({
            eventType: 'message_ingest_failed',
            success: false,
            externalId,
            errorCode: 'ingest_failed',
            errorMessage: error instanceof Error ? error.message : 'Falha ao ingerir mensagem.',
          }).catch(() => undefined);
        }
      }
    });
  }

  private async handleIncomingMessage(socket: Socket, message: WAMessage) {
    if (!message.message || message.key.fromMe) return;

    const remoteJid = message.key.remoteJid;
    const externalMessageId = message.key.id;
    if (!remoteJid || !externalMessageId) return;
    if (remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us') || remoteJid.endsWith('@newsletter')) return;

    const normalizedContent = normalizeMessageContent(message.message);
    const type = classifyMessage(normalizedContent);
    if (!type) return;

    const pnJid = await resolvePnJid(
      socket,
      message.key.participantAlt,
      message.key.remoteJidAlt,
      message.key.participant,
      remoteJid,
    );
    const phone = pnJid ? phoneFromPnJid(pnJid) : '';

    if (!phone || !pnJid) {
      await recordIntegrationEvent({
        eventType: 'message_address_unresolved',
        success: false,
        externalId: externalMessageId,
        errorCode: 'lid_unresolved',
        errorMessage: 'Mensagem recebida sem mapeamento disponível entre LID e número de telefone.',
        metadata: {
          addressingMode: message.key.addressingMode ?? null,
          hasRemoteJidAlt: Boolean(message.key.remoteJidAlt),
          hasParticipantAlt: Boolean(message.key.participantAlt),
        },
      });
      return;
    }

    const startedAt = Date.now();
    let attachment: Awaited<ReturnType<typeof uploadInboundMedia>> & {
      name?: string;
      providerMediaId?: string;
    } | undefined;

    if (type !== 'text') {
      const info = mediaInfo(normalizedContent, type);
      if (!info) throw new Error('Metadados de mídia ausentes.');

      const bytes = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: logger.child({ module: 'baileys-media' }) as never,
          reuploadRequest: socket.updateMediaMessage,
        },
      ) as Buffer;

      attachment = {
        ...await uploadInboundMedia({
          externalMessageId,
          bytes,
          mimeType: info.mimeType,
          fileName: info.fileName,
        }),
        name: info.fileName,
        providerMediaId: externalMessageId,
      };
    }

    const result = await ingestIncomingMessage({
      externalMessageId,
      threadId: pnJid,
      phone,
      displayName: message.pushName || undefined,
      type,
      text: extractText(normalizedContent),
      receivedAt: timestampFromMessage(message),
      attachment,
      metadata: {
        source: 'messages.upsert',
      },
    });

    await recordIntegrationEvent({
      eventType: result.duplicate ? 'message_duplicate' : 'message_received',
      success: true,
      externalId: externalMessageId,
      latencyMs: Date.now() - startedAt,
      metadata: {
        conversationId: result.conversationId,
        messageId: result.messageId,
        type,
        duplicate: result.duplicate,
      },
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || this.status !== 'connected') return;
      void heartbeat().catch((error) => {
        logger.error({ error }, 'Falha ao registrar heartbeat.');
        this.status = 'degraded';
      });
    }, config.heartbeatMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect() {
    if (this.manualStop || this.reconnectTimer) return;

    this.reconnectAttempt += 1;
    const delay = Math.min(60_000, 1_000 * 2 ** Math.min(this.reconnectAttempt - 1, 6));

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.start().catch((error) => {
        logger.error({ error }, 'Tentativa de reconexão falhou.');
      });
    }, delay);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
}
