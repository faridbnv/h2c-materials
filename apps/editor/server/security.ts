// The editor service's request rules (02 section 10): a launch token on every API request, the Host header on every request, the
// Origin header where a browser sends one, no CORS headers at all, and a strict Content-Security-Policy. A request that fails a rule
// gets a short plain answer and reaches nothing.
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

export const TOKEN_HEADER = 'x-editor-token';

export type Verdict = { readonly ok: true } | { readonly ok: false; readonly status: number; readonly reason: string };

/** A fresh secret for one launch: 256 random bits. */
export const newToken = (): string => randomBytes(32).toString('base64url');

/** The names a request may use for this service: `127.0.0.1:<port>` or `localhost:<port>`, which is what blocks DNS rebinding. */
export function allowedHosts(port: number): readonly string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`];
}

function sameToken(given: string | undefined, token: string): boolean {
  if (given === undefined) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const single = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? undefined : value);

export interface Guard {
  /** Every request: the Host header must be one of ours. */
  checkHost(headers: IncomingHttpHeaders): Verdict;
  /** An API request: the Origin, when present, must be ours, and a request that changes anything must carry one; then the token. */
  checkApi(method: string, headers: IncomingHttpHeaders): Verdict;
}

export function createGuard(port: number, token: string): Guard {
  const hosts = allowedHosts(port);
  const origins = hosts.map((host) => `http://${host}`);
  return {
    checkHost(headers) {
      const host = single(headers.host);
      return host !== undefined && hosts.includes(host.toLowerCase()) ? { ok: true } : { ok: false, status: 421, reason: 'This address is not one the editor answers to.' };
    },
    checkApi(method, headers) {
      const origin = single(headers.origin);
      if (origin !== undefined && !origins.includes(origin)) return { ok: false, status: 403, reason: 'This request comes from another page.' };
      if (method !== 'GET' && method !== 'HEAD' && origin === undefined) return { ok: false, status: 403, reason: 'A change must come from the editor page.' };
      // A browser that says the request is not from this page (Fetch Metadata) is refused even when it forgot the Origin.
      const site = single(headers['sec-fetch-site']);
      if (site !== undefined && site !== 'same-origin' && site !== 'none') return { ok: false, status: 403, reason: 'This request comes from another page.' };
      if (!sameToken(single(headers[TOKEN_HEADER]), token)) return { ok: false, status: 401, reason: 'This editor session has ended.' };
      return { ok: true };
    },
  };
}

/** What every answer carries. No `Access-Control-*` header is ever set: another origin is never allowed to read an answer. */
export const SECURITY_HEADERS: OutgoingHttpHeaders = {
  'Content-Security-Policy': [
    "default-src 'none'", "script-src 'self'", "style-src 'self'", "img-src 'self' blob:", "connect-src 'self'", "font-src 'self'",
    "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "object-src 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cache-Control': 'no-store',
  'X-Frame-Options': 'DENY',
};
