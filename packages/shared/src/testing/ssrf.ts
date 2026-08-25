import { isIP } from 'net';
import { resolve4, resolve6 } from 'dns/promises';

// ─── Blocked ranges ──────────────────────────────────────────
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'ip6-localhost',
  'ip6-loopback',
]);

// Cloud metadata endpoints
const BLOCKED_HOSTNAME_PATTERNS = [
  /^169\.254\.\d+\.\d+$/, // link-local / AWS metadata
  /^100\.64\.\d+\.\d+$/, // shared address space
  /metadata\.google\.internal$/i,
  /metadata\.azure\.com$/i,
  /169\.254\.169\.254/,
];

// Private & special IP CIDR blocks to block
const BLOCKED_IP_RANGES: Array<{ start: bigint; end: bigint; label: string }> =
  [
    // 10.0.0.0/8
    { start: ipToBigInt('10.0.0.0'), end: ipToBigInt('10.255.255.255'), label: 'Private (10.x.x.x)' },
    // 172.16.0.0/12
    { start: ipToBigInt('172.16.0.0'), end: ipToBigInt('172.31.255.255'), label: 'Private (172.16-31.x.x)' },
    // 192.168.0.0/16
    { start: ipToBigInt('192.168.0.0'), end: ipToBigInt('192.168.255.255'), label: 'Private (192.168.x.x)' },
    // 127.0.0.0/8
    { start: ipToBigInt('127.0.0.0'), end: ipToBigInt('127.255.255.255'), label: 'Loopback' },
    // 0.0.0.0/8
    { start: ipToBigInt('0.0.0.0'), end: ipToBigInt('0.255.255.255'), label: 'Unspecified' },
    // 169.254.0.0/16 – link-local (APIPA / metadata)
    { start: ipToBigInt('169.254.0.0'), end: ipToBigInt('169.254.255.255'), label: 'Link-local / Metadata' },
    // 100.64.0.0/10 – shared address space
    { start: ipToBigInt('100.64.0.0'), end: ipToBigInt('100.127.255.255'), label: 'Shared address space' },
    // 192.0.2.0/24 – documentation
    { start: ipToBigInt('192.0.2.0'), end: ipToBigInt('192.0.2.255'), label: 'Documentation' },
    // 198.51.100.0/24 – documentation
    { start: ipToBigInt('198.51.100.0'), end: ipToBigInt('198.51.100.255'), label: 'Documentation' },
    // 203.0.113.0/24 – documentation
    { start: ipToBigInt('203.0.113.0'), end: ipToBigInt('203.0.113.255'), label: 'Documentation' },
    // 240.0.0.0/4 – reserved
    { start: ipToBigInt('240.0.0.0'), end: ipToBigInt('255.255.255.255'), label: 'Reserved' },
  ];

function ipToBigInt(ip: string): bigint {
  const parts = ip.split('.').map(Number);
  return (
    (BigInt(parts[0]) << 24n) |
    (BigInt(parts[1]) << 16n) |
    (BigInt(parts[2]) << 8n) |
    BigInt(parts[3])
  );
}

function isIpv4InBlockedRange(ip: string): { blocked: boolean; reason: string } {
  const n = ipToBigInt(ip);
  for (const range of BLOCKED_IP_RANGES) {
    if (n >= range.start && n <= range.end) {
      return { blocked: true, reason: `IP ${ip} is in blocked range: ${range.label}` };
    }
  }
  return { blocked: false, reason: '' };
}

function isIpv6Blocked(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, '');
  // Loopback
  if (lower === '::1') return true;
  // Link-local fe80::/10
  if (lower.startsWith('fe80')) return true;
  // Unspecified ::
  if (lower === '::') return true;
  // IPv4-mapped ::ffff:x.x.x.x
  if (lower.startsWith('::ffff:')) return true;
  // Unique local fc00::/7
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  return false;
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIps?: string[];
}

/**
 * Validates a URL against SSRF threats.
 * - Checks URL scheme (only http/https allowed)
 * - Checks hostname against blocklists
 * - Resolves DNS and validates all resolved IPs
 */
export async function validateUrlForSsrf(rawUrl: string): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { safe: false, reason: `Protocol "${parsed.protocol}" is not allowed. Only http/https is permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block known hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `Hostname "${hostname}" is blocked (internal address)` };
  }

  // Block cloud metadata patterns
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      return { safe: false, reason: `Hostname "${hostname}" matches a blocked pattern (metadata/internal endpoint)` };
    }
  }

  // If the hostname is already an IP, validate it directly without DNS lookup
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const { blocked, reason } = isIpv4InBlockedRange(hostname);
    if (blocked) return { safe: false, reason };
    return { safe: true, resolvedIps: [hostname] };
  }
  if (ipVersion === 6) {
    if (isIpv6Blocked(hostname)) {
      return { safe: false, reason: `IPv6 address "${hostname}" is blocked (internal address)` };
    }
    return { safe: true, resolvedIps: [hostname] };
  }

  // DNS resolution — check all returned IPs
  const resolvedIps: string[] = [];
  try {
    const [v4Results, v6Results] = await Promise.allSettled([
      resolve4(hostname),
      resolve6(hostname),
    ]);

    if (v4Results.status === 'fulfilled') {
      resolvedIps.push(...v4Results.value);
    }
    if (v6Results.status === 'fulfilled') {
      resolvedIps.push(...v6Results.value);
    }

    if (resolvedIps.length === 0) {
      return { safe: false, reason: `Could not resolve hostname "${hostname}"` };
    }
  } catch (err) {
    return { safe: false, reason: `DNS resolution failed for "${hostname}"` };
  }

  // Validate every resolved IP
  for (const ip of resolvedIps) {
    const ipVer = isIP(ip);
    if (ipVer === 4) {
      const { blocked, reason } = isIpv4InBlockedRange(ip);
      if (blocked) return { safe: false, reason: `DNS rebinding detected: ${reason}` };
    } else if (ipVer === 6) {
      if (isIpv6Blocked(ip)) {
        return { safe: false, reason: `DNS rebinding detected: IPv6 "${ip}" resolves to blocked address` };
      }
    }
  }

  return { safe: true, resolvedIps };
}

/**
 * Throws SsrfError if the URL fails validation.
 */
export async function assertSafeUrl(url: string): Promise<void> {
  const result = await validateUrlForSsrf(url);
  if (!result.safe) {
    throw new SsrfError(result.reason ?? 'URL failed SSRF validation');
  }
}
