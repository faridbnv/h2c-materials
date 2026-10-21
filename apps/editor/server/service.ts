// The editor's local HTTP service (02 sections 5 and 10). It listens on 127.0.0.1 only, on a port the system picks, checks the Host of
// every request and the token and Origin of every API request, sends no CORS header, and answers only the routes below. It serves the
// built interface (apps/editor/dist) from an allow-list of files it listed at start; no path a request names is ever joined to a folder.
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ConflictAction, CorrectionRequest, ExportRequest, Cells, ApiError,
} from '../shared/api.ts';
import { Editor, RestartNeeded } from './editor.ts';
import type { EditorOptions } from './editor.ts';
import { SECURITY_HEADERS, createGuard, newToken } from './security.ts';
import type { Guard } from './security.ts';

export const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url));
const MAX_BODY = 64 * 1024;
const MAX_IMAGE = 20 * 1024 * 1024;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const HEX64 = /^[0-9a-f]{64}$/;
/** The only cells the correction form changes: the printed value, its number and the normalized value, together. */
const CORRECTABLE = ['Raw value', 'Raw numeric', 'Normalized value'] as const;

const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

export interface ServiceOptions extends EditorOptions {
  /** Where the built interface is (default apps/editor/dist). */
  readonly distDir?: string;
  /** A fixed port, for a test of the guard; default is a port the system picks. */
  readonly port?: number;
  /** A fixed token, for a test; default is a fresh random secret. */
  readonly token?: string;
}

export interface Service {
  readonly editor: Editor;
  readonly port: number;
  readonly address: string;
  readonly token: string;
  /** Where to point a browser: the token travels in the fragment, which a browser never sends to a server. */
  readonly launchUrl: string;
  readonly server: Server;
  close(): Promise<void>;
}

// ---------------------------------------------------------------- answers

function reply(res: ServerResponse, status: number, type: string, text: string): void {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type, 'Content-Length': Buffer.byteLength(text) });
  res.end(text);
}

const send = (res: ServerResponse, status: number, body: unknown): void => reply(res, status, 'application/json; charset=utf-8', JSON.stringify(body));

const sendPlain = (res: ServerResponse, status: number, message: string): void => reply(res, status, 'text/plain; charset=utf-8', message);

const fail = (res: ServerResponse, status: number, error: string, message: string): void => send(res, status, { error, message } satisfies ApiError);

class BadRequest extends Error {}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const type = req.headers['content-type'] ?? '';
  if (!/^application\/json(?:;|$)/i.test(type)) throw new BadRequest('The request must be JSON.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const piece = Buffer.from(chunk);
    size += piece.length;
    if (size > MAX_BODY) throw new BadRequest('The request is too large.');
    chunks.push(piece);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new BadRequest('The request is not valid JSON.'); }
}

// ---------------------------------------------------------------- reading a request

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function str(value: unknown, what: string, max: number, { empty = false } = {}): string {
  if (typeof value !== 'string' || value.length > max || (!empty && value.trim() === '')) throw new BadRequest(`${what} is missing or too long.`);
  return value;
}

function cellsFrom(value: unknown, what: string): Cells {
  if (!isRecord(value) || Object.keys(value).length > 12) throw new BadRequest(`${what} must be a set of cells.`);
  return Object.fromEntries(Object.entries(value).map(([name, cell]) => {
    if (name.length > 80 || (cell !== null && (typeof cell !== 'string' || cell.length > 500))) throw new BadRequest(`${what}: ${name} is not a cell.`);
    return [name, cell];
  }));
}

function correctionFrom(body: unknown): CorrectionRequest {
  if (!isRecord(body) || !isRecord(body.evidence) || !isRecord(body.base)) throw new BadRequest('The correction is incomplete.');
  const measurementId = str(body.measurementId, 'The measurement', 81);
  if (!ID.test(measurementId)) throw new BadRequest('The measurement is not an ID.');
  const set = cellsFrom(body.set, 'The new values');
  const names = Object.keys(set);
  if (names.length === 0 || names.some((n) => !CORRECTABLE.some((c) => c === n))) throw new BadRequest(`A correction changes ${CORRECTABLE.join(', ')} and nothing else.`);
  const page = wholePage(body.evidence.page);
  const snapshotDigest = str(body.base.snapshotDigest, 'The base', 64);
  if (!HEX64.test(snapshotDigest)) throw new BadRequest('The base is not a digest.');
  return {
    measurementId, set, expect: cellsFrom(body.expect, 'The values you saw'),
    reason: str(body.reason, 'The reason', 2000).trim(),
    evidence: { page, locator: str(body.evidence.locator, 'The locator', 200, { empty: true }).trim(), quote: str(body.evidence.quote, 'The quote', 2000).trim() },
    base: { snapshotDigest, commit: str(body.base.commit, 'The commit', 80) },
  };
}

function exportFrom(body: unknown): ExportRequest {
  if (!isRecord(body)) throw new BadRequest('The export is incomplete.');
  return { title: str(body.title, 'The title', 120).trim() };
}

function actionFrom(body: unknown): ConflictAction {
  const action = isRecord(body) ? body.action : undefined;
  if (action === 'apply-mine' || action === 'discard') return action;
  throw new BadRequest('Choose apply-mine or discard.');
}

function wholePage(page: unknown): number {
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1 || page > 10_000) throw new BadRequest('The page must be a whole number from 1.');
  return page;
}

/** A page number named in a path, which is text. */
const pageFrom = (text: string | undefined): number => wholePage(Number(text));

// ---------------------------------------------------------------- routes

type Handler = (editor: Editor, req: IncomingMessage, res: ServerResponse, params: readonly string[], url: URL) => Promise<void>;

interface Route { readonly method: 'GET' | 'POST'; readonly pattern: RegExp; readonly handler: Handler }

function idParam(value: string | undefined): string {
  if (value === undefined || !ID.test(value)) throw new BadRequest('That is not an ID.');
  return value;
}

/**
 * Send a page image. The file can vanish between the lookup and the read (the store is a folder on this computer), so a failed `stat` is
 * a missing page, and a read that fails after the headers went is the end of this response only: the stream's error is handled here,
 * because an unhandled one would take the whole editor down.
 */
export function sendImage(res: ServerResponse, path: string | null): void {
  let size: number | null = null;
  try { size = path === null ? null : statSync(path).size; } catch { /* gone: answered as not found below */ }
  if (path === null || size === null || size > MAX_IMAGE) { fail(res, 404, 'not-found', 'There is no image of that page on this computer.'); return; }
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'image/png', 'Content-Length': size });
  const stream = createReadStream(path);
  stream.on('error', () => { stream.destroy(); res.destroy(); });
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

const ROUTES: readonly Route[] = [
  { method: 'GET', pattern: /^\/api\/state$/, handler: async (e, _q, res) => send(res, 200, await e.state()) },
  { method: 'GET', pattern: /^\/api\/products$/, handler: async (e, _q, res, _p, url) => send(res, 200, await e.search((url.searchParams.get('q') ?? '').slice(0, 100))) },
  {
    method: 'GET', pattern: /^\/api\/products\/([^/]+)$/,
    handler: async (e, _q, res, [id]) => {
      const detail = await e.product(idParam(id));
      if (detail === null) fail(res, 404, 'not-found', 'There is no such product.'); else send(res, 200, detail);
    },
  },
  {
    method: 'GET', pattern: /^\/api\/measurements\/([^/]+)$/,
    handler: async (e, _q, res, [id]) => {
      const detail = await e.measurement(idParam(id));
      if (detail === null) fail(res, 404, 'not-found', 'There is no such value.'); else send(res, 200, detail);
    },
  },
  {
    method: 'GET', pattern: /^\/api\/sources\/([^/]+)\/pages\/(\d+)$/,
    handler: async (e, _q, res, [id, page]) => {
      const found = await e.sourcePage(idParam(id), pageFrom(page));
      if (found === null) fail(res, 404, 'not-found', 'That page is not on this computer.'); else send(res, 200, found);
    },
  },
  {
    method: 'GET', pattern: /^\/api\/sources\/([^/]+)\/pages\/(\d+)\/image$/,
    handler: async (e, _q, res, [id, page]) => {
      const path = await e.sourceImage(idParam(id), pageFrom(page));
      sendImage(res, path);
    },
  },
  { method: 'POST', pattern: /^\/api\/corrections$/, handler: async (e, req, res) => send(res, 200, await e.correct(correctionFrom(await readJson(req)))) },
  { method: 'GET', pattern: /^\/api\/drafts$/, handler: async (e, _q, res) => send(res, 200, await e.drafts()) },
  { method: 'GET', pattern: /^\/api\/conflicts$/, handler: async (e, _q, res) => send(res, 200, await e.conflicts()) },
  {
    method: 'POST', pattern: /^\/api\/conflicts\/([^/]+)\/resolve$/,
    handler: async (e, req, res, [id]) => send(res, 200, await e.resolveConflict(idParam(id), actionFrom(await readJson(req)))),
  },
  { method: 'POST', pattern: /^\/api\/impact$/, handler: async (e, req, res) => { await readJson(req); send(res, 200, await e.previewImpact()); } },
  { method: 'GET', pattern: /^\/api\/backups$/, handler: async (e, _q, res) => send(res, 200, await e.backups()) },
  { method: 'POST', pattern: /^\/api\/backups$/, handler: async (e, req, res) => { await readJson(req); send(res, 200, await e.backupNow()); } },
  {
    method: 'POST', pattern: /^\/api\/restore$/,
    handler: async (e, req, res) => {
      const body = await readJson(req);
      send(res, 200, await e.restore(isRecord(body) ? str(body.name, 'The backup', 200) : ''));
    },
  },
  { method: 'POST', pattern: /^\/api\/export$/, handler: async (e, req, res) => send(res, 200, await e.prepareReview(exportFrom(await readJson(req)).title)) },
];

function matchRoute(method: string, pathname: string): { readonly handler: Handler; readonly params: readonly string[] } | null {
  for (const candidate of ROUTES) {
    if (candidate.method !== method) continue;
    const match = candidate.pattern.exec(pathname);
    if (match !== null) return { handler: candidate.handler, params: match.slice(1) };
  }
  return null;
}

// ---------------------------------------------------------------- the interface files

interface StaticFile { readonly path: string; readonly type: string }

function listStatic(distDir: string): ReadonlyMap<string, StaticFile> {
  const files = new Map<string, StaticFile>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path, `${prefix}${entry.name}/`);
      else {
        const type = TYPES[extname(entry.name)];
        if (type !== undefined) files.set(`/${prefix}${entry.name}`, { path, type });
      }
    }
  };
  if (existsSync(distDir)) walk(distDir, '');
  const index = files.get('/index.html');
  if (index !== undefined) files.set('/', index);
  return files;
}

// ---------------------------------------------------------------- the server

async function route(editor: Editor, guard: Guard, files: ReadonlyMap<string, StaticFile>, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = guard.checkHost(req.headers);
  if (!host.ok) { sendPlain(res, host.status, host.reason); return; }
  const method = req.method ?? '';
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') { sendPlain(res, 405, 'This method is not allowed.'); return; }
  const raw = req.url ?? '/';
  if (raw.length > 2000 || !raw.startsWith('/')) { sendPlain(res, 400, 'Bad request.'); return; }
  const url = new URL(raw, 'http://127.0.0.1');

  if (url.pathname.startsWith('/api/')) {
    const verdict = guard.checkApi(method, req.headers);
    if (!verdict.ok) { fail(res, verdict.status, verdict.status === 401 ? 'session-ended' : 'refused', verdict.reason); return; }
    const found = matchRoute(method, url.pathname);
    if (found === null) { fail(res, 404, 'not-found', 'There is no such request.'); return; }
    try {
      await found.handler(editor, req, res, found.params, url);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      if (error instanceof BadRequest) { fail(res, 400, 'bad-request', error.message); return; }
      if (error instanceof RestartNeeded) { fail(res, 503, 'restart-needed', error.message); return; }
      console.error(error);
      fail(res, 500, 'failed', 'The editor could not do that. Details are in the terminal where it runs.');
    }
    return;
  }

  if (method === 'POST') { sendPlain(res, 405, 'This method is not allowed.'); return; }
  const file = files.get(url.pathname);
  if (file === undefined) {
    if (url.pathname === '/' && files.size === 0) { sendPlain(res, 503, 'The editor interface is not built yet. Start the editor with: npm run editor'); return; }
    sendPlain(res, 404, 'Not found.');
    return;
  }
  const body = readFileSync(file.path);
  res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': file.type, 'Content-Length': body.length });
  res.end(method === 'HEAD' ? undefined : body);
}

export async function startService(options: ServiceOptions = {}): Promise<Service> {
  const editor = await Editor.open(options);
  const token = options.token ?? newToken();
  const files = listStatic(options.distDir ?? DIST_DIR);
  let guard: Guard | null = null;
  const server = createServer((req, res) => {
    if (guard === null) { sendPlain(res, 503, 'Starting.'); return; }
    route(editor, guard, files, req, res).catch((error: unknown) => {
      console.error(error);
      if (!res.headersSent) sendPlain(res, 500, 'The editor could not do that.');
      else res.destroy();
    });
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = 300_000;
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port ?? 0, '127.0.0.1', resolve);
  });
  const bound = server.address();
  if (bound === null || typeof bound === 'string' || bound.address !== '127.0.0.1') {
    server.close();
    throw new Error(`the editor must listen on 127.0.0.1 only, but the system bound ${JSON.stringify(bound)}`);
  }
  const { address, port } = bound;
  guard = createGuard(port, token);
  return {
    editor, port, address, token, launchUrl: `http://127.0.0.1:${port}/#token=${token}`, server,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await editor.close();
    },
  };
}
