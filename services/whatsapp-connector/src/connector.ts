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
  downloadOutboundMedia,
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
  attachment?: {
    name?: string;
    mimeType?: string;
    size?: number;
    storageBucket?: string;
    storagePath?: string;
  };
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

  constructor(readonly sessionId: string) {}
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
  private socketGeneration = 0;

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

  async createGroup(conversationId: string, subject: string) {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('WhatsApp Web não está conectado.');
    }

    const cleanSubject = subject.trim().slice(0, 100);
    if (!cleanSubject) throw new Error('Nome do grupo é obrigatório.');

    const destination = await getConversationDestination(this.sessionId, conversationId);
    const startedAt = Date.now();

    try {
      const result = await this.socket.groupCreate(cleanSubject, [destination]);
      const groupId = result?.id;
      if (!groupId) throw new Error('WhatsApp não confirmou a criação do grupo.');

      await recordIntegrationEvent(this.sessionId, {
        eventType: 'group_created',
        success: true,
        externalId: groupId,
        latencyMs: Date.now() - startedAt,
        metadata: { conversationId, subject: cleanSubject },
      });

      return { groupId, subject: cleanSubject };
    } catch (error) {
      await recordIntegrationEvent(this.sessionId, {
        eventType: 'group_create_failed',
        success: false,
        errorCode: 'group_create_failed',
        errorMessage: error instanceof Error ? error.message : 'Falha ao criar grupo.',
        latencyMs: Date.now() - startedAt,
        metadata: { conversationId, subject: cleanSubject },
      }).catch(() => undefined);
      throw error;
    }
  }

  async start() {
    if (this.starting || this.socket) return this.snapshot();

    this.starting = true;
    this.manualStop = false;
    this.clearReconnectTimer();
    this.status = 'connecting';
    await setConnectionStatus(this.sessionId, 'connecting', {
      lastErrorCode: null,
      metadata: { qrAvailable: false, disconnectedByUser: false },
    });

    try {
      this.authState = await createDatabaseAuthState(this.sessionId);

      const generation = ++this.socketGeneration;
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
        syncFullHistory: true,
        shouldSyncHistoryMessage: () => true,
        generateHighQualityLinkPreview: false,
      });

      this.socket = socket;
      this.bindSocket(socket, generation);
      return this.snapshot();
    } catch (error) {
      this.socket = null;
      this.status = 'error';
      const message = error instanceof Error ? error.message : 'Falha ao iniciar WhatsApp Web.';
      await setConnectionStatus(this.sessionId, 'error', {
        lastErrorAt: new Date().toISOString(),
        lastErrorCode: 'startup_failed',
      }).catch(() => undefined);
      await recordIntegrationEvent(this.sessionId, {
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
      const oldSocket = this.socket;
      this.socket = null;
      this.socketGeneration += 1;
      try {
        oldSocket.end(new Error('manual reconnect'));
      } catch {
        // O socket pode já estar encerrado.
      }
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
    this.socketGeneration += 1;

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

    await setConnectionStatus(this.sessionId, 'not_connected', {
      lastHealthAt: new Date().toISOString(),
      metadata: { qrAvailable: false, disconnectedByUser: true },
    });
    await recordIntegrationEvent(this.sessionId, {
      eventType: 'manual_disconnect',
      success: true,
    });
  }

  async shutdown() {
    this.manualStop = true;
    this.clearReconnectTimer();
    this.stopHeartbeat();
    this.qr = null;

    const socket = this.socket;
    this.socket = null;
    this.socketGeneration += 1;

    if (socket) {
      try {
        socket.end(new Error('connector process shutdown'));
      } catch {
        // O processo pode estar encerrando depois do socket já ter fechado.
      }
    }

    if (this.status === 'connected' || this.status === 'connecting') {
      this.status = 'degraded';
      await setConnectionStatus(this.sessionId, 'degraded', {
        lastHealthAt: new Date().toISOString(),
        lastErrorCode: 'process_shutdown',
        metadata: { qrAvailable: false },
      }).catch(() => undefined);
    }
  }

  async send(input: SendInput) {
    if (!this.socket || this.status !== 'connected') {
      throw new Error('WhatsApp Web não está conectado.');
    }

    const destination = await getConversationDestination(this.sessionId, input.conversationId);
    const startedAt = Date.now();

    try {
      let payload: Record<string, unknown>;
      const text = input.text?.trim() || undefined;

      if (input.type === 'text') {
        if (!text) throw new Error('Mensagem de texto vazia.');
        payload = { text };
      } else if (input.type === 'form') {
        throw new Error('Formulário ainda não é suportado pelo transporte WhatsApp Web.');
      } else {
        const attachment = input.attachment;
        if (!attachment?.storageBucket || !attachment.storagePath) {
          throw new Error('Referência segura da mídia não informada.');
        }

        const media = await downloadOutboundMedia({
          storageBucket: attachment.storageBucket,
          storagePath: attachment.storagePath,
          mimeType: attachment.mimeType,
          name: attachment.name,
        });

        if (input.type === 'image') {
          payload = {
            image: media.bytes,
            mimetype: media.mimeType,
            caption: text,
          };
        } else if (input.type === 'video') {
          payload = {
            video: media.bytes,
            mimetype: media.mimeType,
            caption: text,
          };
        } else if (input.type === 'audio') {
          payload = {
            audio: media.bytes,
            mimetype: media.mimeType,
            ptt: media.mimeType === 'audio/ogg',
          };
        } else {
          payload = {
            document: media.bytes,
            mimetype: media.mimeType,
            fileName: media.fileName,
            caption: text,
          };
        }
      }

      const response = await this.socket.sendMessage(destination, payload as never);
      const externalMessageId = response?.key?.id;
      if (!externalMessageId) throw new Error('WhatsApp confirmou envio sem ID externo.');

      await recordIntegrationEvent(this.sessionId, {
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
      await recordIntegrationEvent(this.sessionId, {
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

  private bindSocket(socket: Socket, generation: number) {
    socket.ev.on('creds.update', async () => {
      if (generation !== this.socketGeneration) return;
      try {
        await this.authState?.saveCreds();
      } catch (error) {
        logger.error({ error }, 'Falha ao persistir credenciais atualizadas do WhatsApp.');
        this.status = 'degraded';
        await setConnectionStatus(this.sessionId, 'degraded', {
          lastErrorAt: new Date().toISOString(),
          lastErrorCode: 'auth_persist_failed',
        }).catch(() => undefined);
      }
    });

    socket.ev.on('connection.update', async (update) => {
      if (generation !== this.socketGeneration) return;
      this.lastProtocolEventAt = new Date().toISOString();

      if (update.qr) {
        this.qr = update.qr;
        this.status = 'connecting';
        await setConnectionStatus(this.sessionId, 'connecting', {
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
          await upsertChannelAccount(this.sessionId, {
            phoneNumber,
            displayName: socket.user?.name || undefined,
            connectorVersion: 'baileys-7.0.0-rc14',
          }).catch((error) => logger.error({ error }, 'Falha ao registrar conta do canal.'));
        }

        const now = new Date().toISOString();
        await setConnectionStatus(this.sessionId, 'connected', {
          accountLabel: phoneNumber ? `+${phoneNumber}` : 'WhatsApp Web',
          connectedAt: now,
          lastHealthAt: now,
          lastEventAt: now,
          lastErrorCode: null,
          metadata: { qrAvailable: false, disconnectedByUser: false },
        });

        await recordIntegrationEvent(this.sessionId, {
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

          await recordIntegrationEvent(this.sessionId, {
            eventType: 'connection_logged_out',
            success: false,
            errorCode: 'logged_out',
            errorMessage: 'A sessão do WhatsApp foi revogada e precisa de novo pareamento.',
          }).catch(() => undefined);
          await setConnectionStatus(this.sessionId, 'reauth_required', {
            lastErrorAt: new Date().toISOString(),
            lastErrorCode: 'logged_out',
            metadata: { qrAvailable: false },
          });
          return;
        }

        if (this.manualStop) return;

        this.status = 'degraded';
        await recordIntegrationEvent(this.sessionId, {
          eventType: 'connection_closed',
          success: false,
          errorCode: statusCode ? `wa_${statusCode}` : 'connection_closed',
          errorMessage: 'Conexão com WhatsApp Web foi encerrada.',
        }).catch(() => undefined);
        this.scheduleReconnect();
      }
    });

    socket.ev.on('messaging-history.set', async (event) => {
      if (generation !== this.socketGeneration) return;

      this.lastProtocolEventAt = new Date().toISOString();
      const historyMessages = Array.isArray(event.messages) ? event.messages.slice(0, 1000) : [];
      const lidPnMappings = Array.isArray(event.lidPnMappings) ? event.lidPnMappings : [];
      if (lidPnMappings.length > 0) {
        await socket.signalRepository.lidMapping.storeLIDPNMappings(lidPnMappings).catch((error) => {
          logger.warn({ error, count: lidPnMappings.length }, 'Falha ao persistir mapeamentos LID/PN do histórico.');
        });
      }

      await recordIntegrationEvent(this.sessionId, {
        eventType: 'history_sync_received',
        success: true,
        metadata: {
          messageCount: historyMessages.length,
          contactCount: Array.isArray(event.contacts) ? event.contacts.length : 0,
          chatCount: Array.isArray(event.chats) ? event.chats.length : 0,
          lidPnMappingCount: lidPnMappings.length,
          isLatest: event.isLatest ?? null,
          syncType: 'syncType' in event ? event.syncType ?? null : null,
        },
      }).catch(() => undefined);

      let ingested = 0;
      let failed = 0;

      for (const message of historyMessages) {
        try {
          await this.handleIncomingMessage(socket, message, 'messaging-history.set');
          ingested += 1;
        } catch (error) {
          failed += 1;
          const externalId = message.key.id || undefined;
          logger.error({ error, externalId }, 'Falha ao ingerir mensagem do histórico.');
          await recordIntegrationEvent(this.sessionId, {
            eventType: 'history_message_ingest_failed',
            success: false,
            externalId,
            errorCode: 'history_ingest_failed',
            errorMessage: error instanceof Error ? error.message : 'Falha ao ingerir mensagem do histórico.',
          }).catch(() => undefined);
        }
      }

      await recordIntegrationEvent(this.sessionId, {
        eventType: 'history_sync_ingested',
        success: failed === 0,
        errorCode: failed > 0 ? 'history_partial_failure' : undefined,
        errorMessage: failed > 0 ? 'Parte do histórico não pôde ser ingerida.' : undefined,
        metadata: { ingested, failed, total: historyMessages.length },
      }).catch(() => undefined);
    });

    socket.ev.on('messages.upsert', async (event) => {
      if (generation !== this.socketGeneration) return;
      if (event.type !== 'notify' && event.type !== 'append') return;

      this.lastProtocolEventAt = new Date().toISOString();
      const requestId = typeof event.requestId === 'string' ? event.requestId : undefined;
      const eventSource = requestId
        ? `messages.upsert.${event.type}.request`
        : event.type === 'append'
          ? 'messages.upsert.append'
          : 'messages.upsert.notify';

      for (const message of event.messages) {
        try {
          await this.handleIncomingMessage(socket, message, eventSource);
        } catch (error) {
          const externalId = message.key.id || undefined;
          logger.error({ error, externalId }, 'Falha ao ingerir mensagem recebida.');
          await recordIntegrationEvent(this.sessionId, {
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

  private async handleIncomingMessage(socket: Socket, message: WAMessage, source = 'messages.upsert') {
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
      await recordIntegrationEvent(this.sessionId, {
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
        ...await uploadInboundMedia(this.sessionId, {
          externalMessageId,
          bytes,
          mimeType: info.mimeType,
          fileName: info.fileName,
        }),
        name: info.fileName,
        providerMediaId: externalMessageId,
      };
    }

    const result = await ingestIncomingMessage(this.sessionId, {
      externalMessageId,
      threadId: pnJid,
      phone,
      displayName: message.pushName || undefined,
      type,
      text: extractText(normalizedContent),
      receivedAt: timestampFromMessage(message),
      attachment,
      metadata: {
        source,
      },
    });

    await recordIntegrationEvent(this.sessionId, {
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
      void heartbeat(this.sessionId).catch((error) => {
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
