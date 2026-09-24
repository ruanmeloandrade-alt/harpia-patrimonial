function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function readPort() {
  const raw = process.env.PORT?.trim() || '8080';
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT inválida.');
  }
  return port;
}

function readEncryptionKey() {
  const raw = required('WHATSAPP_SESSION_ENCRYPTION_KEY');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('WHATSAPP_SESSION_ENCRYPTION_KEY deve ser Base64 de exatamente 32 bytes.');
  }
  return key;
}

export const config = {
  port: readPort(),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  controlToken: required('WHATSAPP_CONNECTOR_TOKEN'),
  sessionId: process.env.WHATSAPP_SESSION_ID?.trim() || 'primary',
  sessionEncryptionKey: readEncryptionKey(),
  heartbeatMs: Math.max(15_000, Number(process.env.WHATSAPP_HEARTBEAT_MS || 30_000)),
};
