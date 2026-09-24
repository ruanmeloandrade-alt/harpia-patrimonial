import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { WhatsAppConnector } from './connector.js';
import { logger } from './logger.js';

const connector = new WhatsAppConnector();
const PAIRING_TOKEN_SHA256 = '91e7fd19410906389f111a731792d38486da6374917112d2b055dc41f8ffc321';

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
    || constantTimeMatch(candidate, derivedControlToken());
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

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  const method = request.method || 'GET';
  const url = new URL(request.url || '/', 'http://localhost');

  if (url.pathname === '/health' && method === 'GET') {
    const snapshot = connector.snapshot();
    sendJson(response, 200, {
      ok: true,
      process: 'up',
      connectorStatus: snapshot.status,
      qrAvailable: snapshot.qrAvailable,
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

    const qr = connector.currentQr();
    sendJson(response, qr ? 200 : 404, qr
      ? { ok: true, qr }
      : { ok: false, message: 'QR indisponível neste momento.' });
    return;
  }

  if (!url.pathname.startsWith('/v1/')) {
    sendJson(response, 404, { ok: false, message: 'Rota não encontrada.' });
    return;
  }

  if (!requireControlToken(request, response)) return;

  if (url.pathname === '/v1/status' && method === 'GET') {
    sendJson(response, 200, {
      ok: true,
      ...connector.snapshot(),
    });
    return;
  }

  if (url.pathname === '/v1/qr' && method === 'GET') {
    const qr = connector.currentQr();
    sendJson(response, qr ? 200 : 404, qr
      ? { ok: true, qr }
      : { ok: false, message: 'QR indisponível neste momento.' });
    return;
  }

  if (url.pathname === '/v1/connect' && method === 'POST') {
    const snapshot = await connector.start();
    sendJson(response, 202, { ok: true, ...snapshot });
    return;
  }

  if (url.pathname === '/v1/reconnect' && method === 'POST') {
    const snapshot = await connector.reconnect();
    sendJson(response, 202, { ok: true, ...snapshot });
    return;
  }

  if (url.pathname === '/v1/disconnect' && method === 'POST') {
    await connector.disconnect();
    sendJson(response, 200, { ok: true, ...connector.snapshot() });
    return;
  }

  if (url.pathname === '/v1/send' && method === 'POST') {
    const body = await readJson(request);
    const conversationId = String(body.conversationId || '').trim();
    const type = String(body.type || 'text') as 'text' | 'audio' | 'image' | 'video' | 'document' | 'form';
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

    const result = await connector.send({
      conversationId,
      type,
      text,
      attachment,
    });

    sendJson(response, 200, {
      ok: true,
      ...result,
    });
    return;
  }

  sendJson(response, 405, { ok: false, message: 'Método não permitido.' });
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
  logger.info({ port: config.port }, 'WhatsApp connector iniciado.');
  void connector.start().catch((error) => {
    logger.error({ error }, 'Conector iniciou sem sessão ativa.');
  });
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Encerrando WhatsApp connector.');
  server.close();

  await connector.shutdown();

  const timer = setTimeout(() => process.exit(1), 10_000);
  timer.unref();

  server.closeAllConnections();
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });
