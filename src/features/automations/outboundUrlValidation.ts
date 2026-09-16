const normalizeHostname = (hostname: string) => hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  return false;
}

function isPrivateIpv6(hostname: string) {
  const host = normalizeHostname(hostname);
  return host === '::1'
    || host === '::'
    || host.startsWith('fc')
    || host.startsWith('fd')
    || host.startsWith('fe80:');
}

export function validateSafeOutboundUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'endpoint inválido.';
  }

  if (url.protocol !== 'https:') return 'endpoint precisa usar HTTPS.';

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) return 'endpoint sem host.';
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || isPrivateIpv4(hostname)
    || isPrivateIpv6(hostname)
  ) {
    return 'endpoint local/privado não é permitido.';
  }

  return null;
}

export const ALLOWED_OUTBOUND_WEBHOOK_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function validateOutboundWebhookMethod(raw: unknown): string | null {
  const method = String(raw ?? 'POST').trim().toUpperCase() || 'POST';
  return (ALLOWED_OUTBOUND_WEBHOOK_METHODS as readonly string[]).includes(method)
    ? null
    : `método ${method} não é permitido.`;
}
