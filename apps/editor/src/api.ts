// Talking to the editor's service. The launch token arrives in the address after the `#` (a browser never sends that part to a
// server), is kept for this tab only and is sent on every request in a header. A refusal for want of it means the session has ended.
import type { ApiError } from '../shared/api.ts';

const TOKEN_KEY = 'atlas-editor-token';

function readToken(): string | null {
  const fromAddress = new URLSearchParams(window.location.hash.slice(1)).get('token');
  try {
    if (fromAddress !== null && fromAddress !== '') {
      sessionStorage.setItem(TOKEN_KEY, fromAddress);
      history.replaceState(null, '', window.location.pathname);
      return fromAddress;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return fromAddress;
  }
}

let token = readToken();

// A new launch address opened in this tab (the editor was started again): take its token by loading the page afresh.
window.addEventListener('hashchange', () => {
  if (new URLSearchParams(window.location.hash.slice(1)).has('token')) {
    readToken();
    window.location.reload();
  }
});

/** The service no longer accepts this page (no token, a wrong one, or the service was started again). */
export class SessionEnded extends Error {
  constructor() {
    super('This editor session has ended. Start it again with `npm run editor`.');
    this.name = 'SessionEnded';
  }
}

/** A request the service answered with an error that is not a refusal of the write service: the message is the person's to read. */
export class Failure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Failure';
  }
}

const isApiError = (value: unknown): value is ApiError => typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string';

export async function api<T>(path: string, body?: unknown): Promise<T> {
  if (token === null) throw new SessionEnded();
  const headers = { 'x-editor-token': token };
  const init: RequestInit = body === undefined
    ? { headers }
    : { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(body) };
  let response: Response;
  try { response = await fetch(path, init); } catch { throw new Failure('The editor service is not answering. Is `npm run editor` still running?'); }
  if (response.status === 401) { token = null; throw new SessionEnded(); }
  // The service's own JSON, whose shapes are shared/api.ts: the type is the caller's to name.
  const parsed = await response.json().catch(() => null);
  if (!response.ok) throw new Failure(isApiError(parsed) ? parsed.message : `The editor could not do that (${response.status}).`);
  return parsed;
}

/** A page image the store holds, as an address the page may show. */
export async function imageUrl(path: string): Promise<string> {
  if (token === null) throw new SessionEnded();
  const response = await fetch(path, { headers: { 'x-editor-token': token } });
  if (response.status === 401) { token = null; throw new SessionEnded(); }
  if (!response.ok) throw new Failure('There is no image of that page on this computer.');
  return URL.createObjectURL(await response.blob());
}
