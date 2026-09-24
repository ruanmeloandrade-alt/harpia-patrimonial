import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { WhatsAppConnector } from './connector.js';
import { logger } from './logger.js';
import {
  ensureConnection,
  getConversationSessionId,
  listWhatsAppSessions,
} from './repository.js';

const connectors = new Map<string, WhatsAppConnector>();
const PAIRING_TOKEN_SHA256 = '91e7fd19410906389f111a731792d38486da6374917112d2b055dc41f8ffc321';

function connectorFor(sessionId: string) {
  const clean = sessionId.trim();
  if (!clean) throw new Error('sessionId é obrigatório.');
  let connector = connectors.get(clean);
  if (!connector) {
    connector = new WhatsAppConnector(clean);
    connectors.set(clean, connector);
  }
  return connector;
}

function sendJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function derivedControlToken() {
  return createHash('sha256')
    .update(`harpia-whatsapp-control-v1:${config.supabaseServiceRoleKey}`)
    .digest('base64url');
}

function constantTimeMatch(candidateValue: string, expectedValue: string) {
  const candidate = Buffer.from(candidateValue);
  const expected = Buffer.from(expectedValue);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function safeTokenMatch(received: string | undefined) {
  if (!received) return false;
  const prefix = 'Bearer ';
  if (!received.startsWith(prefix)) return false;

  const candidate = received.slice(prefix.length);
  return constantTimeMatch(candidate, config.controlToken)
    || constantTimeMatch(candidate, derivedControlToken())
    || constantTimeMatch(candidate, config.supabaseServiceRoleKey);
}

async function readJson(request: IncomingMessage, maxBytes = 128 * 1024) {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new Error('Payload excede o limite permitido.');
    chunks.push(buffer);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

function requireControlToken(request: IncomingMessage, response: ServerResponse) {
  if (safeTokenMatch(request.headers.authorization)) return true;
  sendJson(response, 401, { ok: false, message: 'Não autorizado.' });
  return false;
}

async function sessionIdFromBodyOrUrl(request: IncomingMessage, url: URL) {
  const fromUrl = url.searchParams.get('sessionId')?.trim();
  if (fromUrl) return { sessionId: fromUrl, body: undefined as Record<string, unknown> | undefined };

  if (request.method === 'POST') {
    const body = await readJson(request);
    const fromBody = String(body.sessionId || '').trim();
    return { sessionId: fromBody || config.sessionId, body };
  }

  return { sessionId: config.sessionId, body: undefined as Record<string, unknown> | undefined };
}

async function listSessionPayload() {
  const rows = await listWhatsAppSessions();
  return rows.map((row) => {
    const sessionId = String(row.external_account_id || '');
    const memory = connectors.get(sessionId)?.snapshot();
    const metadata = row.metadata && typeof row.metadata === 'object'
      ? row.metadata as Record<string, unknown>
      : {};
    return {
      sessionId,
      status: memory?.status ?? row.status,
      qrAvailable: memory?.qrAvailable ?? Boolean(metadata.qrAvailable),
      phoneNumber: memory?.phoneNumber,
      accountLabel: row.account_label,
      connectedAt: row.connected_at,
      lastHealthAt: row.last_health_at,
      lastEventAt: row.last_event_at,
      lastErrorAt: row.last_error_at,
      lastErrorCode: row.last_error_code,
    };
  });
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const method = request.method || 'GET';
  const url = new URL(request.url || '/', 'http://localhost');

  if (url.pathname === '/health' && method === 'GET') {
    const sessions = await listSessionPayload().catch(() => []);
    const connected = sessions.filter((item) => item.status === 'connected').length;
    const connecting = sessions.filter((item) => item.status === 'connecting').length;
    sendJson(response, 200, {
      ok: true,
      process: 'up',
      connectorStatus: connected > 0 ? 'connected' : connecting > 0 ? 'connecting' : 'not_connected',
      connectedSessions: connected,
      sessionCount: sessions.length,
      qrAvailable: sessions.some((item) => item.qrAvailable),
      controlAuthVersion: 2,
    });
    return;
  }

  if (url.pathname === '/pair/qr' && method === 'GET') {
    const token = url.searchParams.get('t') || '';
    const tokenHash = createHash('sha256').update(token).digest('hex');
    if (!constantTimeMatch(tokenHash, PAIRING_TOKEN_SHA256)) {
      sendJson(response, 401, { ok: false, message: 'Não autorizado.' });
      return;
    }

    const sessionId = url.searchParams.get('sessionId')?.trim() || config.sessionId;
    const qr = connectorFor(sessionId).currentQr();
    sendJson(response, qr ? 200 : 404, qr
      ? { ok: true, sessionId, qr }
      : { ok: false, sessionId, message: 'QR indisponível neste momento.' });
    return;
  }

  if (!url.pathname.startsWith('/v1/')) {
    sendJson(response, 404, { ok: false, message: 'Rota não encontrada.' });
    return;
  }

  if (!requireControlToken(request, response)) return;

  if (url.pathname === '/v1/sessions' && method === 'GET') {
    sendJson(response, 200, { ok: true, sessions: await listSessionPayload() });
    return;
  }

  if (url.pathname === '/v1/sessions' && method === 'POST') {
    const body = await readJson(request);
    const requestedId = String(body.sessionId || '').trim();
    const sessionId = requestedId || `wa_${randomUUID()}`;
    await ensureConnection(sessionId);
    const connector = connectorFor(sessionId);
    const snapshot = await connector.start();
    sendJson(response, 201, { ok: true, sessionId, ...snapshot });
    return;
  }

  if (url.pathname === '/v1/status' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId')?.trim() || config.sessionId;
    sendJson(response, 200, {
      ok: true,
      sessionId,
      ...connectorFor(sessionId).snapshot(),
    });
    return;
  }

  if (url.pathname === '/v1/qr' && method === 'GET') {
    const sessionId = url.searchParams.get('sessionId')?.trim() || config.sessionId;
    const qr = connectorFor(sessionId).currentQr();
    sendJson(response, qr ? 200 : 404, qr
      ? { ok: true, sessionId, qr }
      : { ok: false, sessionId, message: 'QR indisponível neste momento.' });
    return;
  }

  if (['/v1/connect', '/v1/reconnect', '/v1/disconnect'].includes(url.pathname) && method === 'POST') {
    const { sessionId, body } = await sessionIdFromBodyOrUrl(request, url);
    const connector = connectorFor(sessionId);

    if (url.pathname === '/v1/connect') {
      const snapshot = await connector.start();
      sendJson(response, 202, { ok: true, sessionId, ...snapshot });
      return;
    }
    if (url.pathname === '/v1/reconnect') {
      const snapshot = await connector.reconnect();
      sendJson(response, 202, { ok: true, sessionId, ...snapshot });
      return;
    }

    void body;
    await connector.disconnect();
    sendJson(response, 200, { ok: true, sessionId, ...connector.snapshot() });
    return;
  }

  if (url.pathname === '/v1/send' && method === 'POST') {
    const body = await readJson(request);
    const conversationId = String(body.conversationId || '').trim();
    const type = String(body.type || 'text') as 'text' | 'audio' | 'image' | 'video' | 'document';
    const text = typeof body.text === 'string' ? body.text : undefined;
    const rawAttachment = body.attachment && typeof body.attachment === 'object' && !Array.isArray(body.attachment)
      ? body.attachment as Record<string, unknown>
      : undefined;
    const attachment = rawAttachment
      ? {
        name: typeof rawAttachment.name === 'string' ? rawAttachment.name : undefined,
        mimeType: typeof rawAttachment.mimeType === 'string' ? rawAttachment.mimeType : undefined,
        size: typeof rawAttachment.size === 'number' ? rawAttachment.size : undefined,
        storageBucket: typeof rawAttachment.storageBucket === 'string' ? rawAttachment.storageBucket : undefined,
        storagePath: typeof rawAttachment.storagePath === 'string' ? rawAttachment.storagePath : undefined,
      }
      : undefined;

    if (!conversationId) {
      sendJson(response, 400, { ok: false, message: 'conversationId é obrigatório.' });
      return;
    }

    const sessionId = await getConversationSessionId(conversationId);
    if (!sessionId) {
      sendJson(response, 409, { ok: false, message: 'A conversa não está vinculada a uma conta WhatsApp.' });
      return;
    }

    const result = await connectorFor(sessionId).send({
      conversationId,
      type,
      text,
      attachment,
    });

    sendJson(response, 200, {
      ok: true,
      sessionId,
      ...result,
    });
    return;
  }

  if (url.pathname === '/v1/group' && method === 'POST') {
    const body = await readJson(request);
    const conversationId = String(body.conversationId || '').trim();
    const subject = String(body.subject || '').trim();

    if (!conversationId || !subject) {
      sendJson(response, 400, { ok: false, message: 'conversationId e nome do grupo são obrigatórios.' });
      return;
    }

    const sessionId = await getConversationSessionId(conversationId);
    if (!sessionId) {
      sendJson(response, 409, { ok: false, message: 'A conversa não está vinculada a uma conta WhatsApp.' });
      return;
    }

    const result = await connectorFor(sessionId).createGroup(conversationId, subject);
    sendJson(response, 200, { ok: true, sessionId, ...result });
    return;
  }

  sendJson(response, 405, { ok: false, message: 'Método não permitido.' });
}

async function bootstrapConnectors() {
  const rows = await listWhatsAppSessions();
  const known = rows.length > 0 ? rows : [await ensureConnection(config.sessionId)];

  await Promise.all(known.map(async (row) => {
    const sessionId = String(row.external_account_id || config.sessionId);
    const metadata = row.metadata && typeof row.metadata === 'object'
      ? row.metadata as Record<string, unknown>
      : {};
    const explicitlyDisconnected = metadata.disconnectedByUser === true;

    if (explicitlyDisconnected) {
      connectorFor(sessionId);
      return;
    }

    try {
      await connectorFor(sessionId).start();
    } catch (error) {
      logger.error({ error, sessionId }, 'Sessão WhatsApp iniciou sem conexão ativa.');
    }
  }));
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error) => {
    const message = error instanceof Error ? error.message : 'Falha inesperada.';
    logger.error({
      error,
      method: request.method,
      path: request.url?.split('?')[0],
    }, 'Falha no endpoint interno do conector.');

    sendJson(response, 500, {
      ok: false,
      message,
    });
  });
});

server.listen(config.port, '0.0.0.0', () => {
  logger.info({ port: config.port }, 'WhatsApp connector multi-sessão iniciado.');
  void bootstrapConnectors().catch((error) => {
    logger.error({ error }, 'Falha ao restaurar sessões WhatsApp.');
  });
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Encerrando WhatsApp connector.');
  server.close();

  await Promise.all([...connectors.values()].map((connector) => connector.shutdown()));

  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();

  server.closeAllConnections();
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
