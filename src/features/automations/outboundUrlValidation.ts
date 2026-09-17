const normalizeHostname = (hostname: string) => hostname.trim().toLowerCase().replace(/^\[/, '').replace(/\]$/, '').replace(/\.$/, '');

function isIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
}

function isPrivateOrReservedIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (!isIpv4(hostname)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIpv6(hostname: string) {
  const host = normalizeHostname(hostname);
  if (!host.includes(':')) return false;
  if (host === '::1' || host === '::') return true;
  if (host.startsWith('fc') || host.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(host)) return true;
  if (host.startsWith('ff')) return true;
  if (host.startsWith('2001:db8:') || host === '2001:db8::') return true;

  const mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  return mapped ? isPrivateOrReservedIpv4(mapped[1]) : false;
}

export function validateSafeOutboundUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'endpoint inválido.';
  }

  if (url.protocol !== 'https:') return 'endpoint precisa usar HTTPS.';
  if (url.username || url.password) return 'credenciais embutidas na URL não são permitidas.';

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) return 'endpoint sem host.';
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || isPrivateOrReservedIpv4(hostname)
    || isPrivateOrReservedIpv6(hostname)
  ) {
    return 'endpoint local/privado/reservado não é permitido.';
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
