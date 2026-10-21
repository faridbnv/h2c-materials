// A small static server for the browser suite (WP-22; pack 07 section 7.1): one built site, mounted at several base paths at
// once, answering the way GitHub Pages does. The same files are served under /h2c-materials/ (like the live site) and under
// /h2c-material-temp-page/ (like the preview), so a page that only works at the root, or only at one path, fails here.
//
//   - gzip for text types and Cache-Control: public, max-age=600, as Pages sends them
//   - a folder address serves its index.html; /base without its slash redirects to /base/
//   - a missing file under a base is a 404 with the site's own 404.html when it has one (Pages does that), plain text otherwise
//   - anything outside every base is a 404 with no body worth reading: the suite must never pass because the root answered
//   - a path that leaves the site (.., encoded slashes, NUL) is a 400 and is never looked up
//   - every request is logged, so a test can say which address answered what
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { extname, join, resolve, sep } from 'node:path';

export const BASE_PATHS = Object.freeze(['/h2c-materials/', '/h2c-material-temp-page/']);

const TYPES = new Map(Object.entries({
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.csv': 'text/csv; charset=utf-8',
  '.zip': 'application/zip', '.xml': 'application/xml',
}));
const COMPRESSIBLE = /^(text\/|application\/(json|xml)|image\/svg)/;
export const CACHE_CONTROL = 'public, max-age=600';

const assertBase = (base) => {
  if (!/^\/[A-Za-z0-9._~-]+(\/[A-Za-z0-9._~-]+)*\/$/.test(base)) throw new Error(`base path "${base}" must start and end with a slash and hold plain segments`);
};

/**
 * Start the server. `site` is the folder to serve; `bases` the paths it is mounted at; `port` 0 picks a free one.
 * Resolves to { origin, port, requests, close }. `requests` holds { method, path, status } for every request answered.
 */
export async function startServer({ site, bases = BASE_PATHS, port = 0, host = '127.0.0.1' }) {
  const root = resolve(site);
  if (!existsSync(join(root, 'index.html'))) throw new Error(`${root} has no index.html: nothing to serve`);
  for (const base of bases) assertBase(base);
  const requests = [];
  const gz = new Map();   // file -> { mtimeMs, body } : a file is compressed once

  const answer = (res, req, status, headers, body) => {
    requests.push({ method: req.method, path: req.url, status });
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  const plain = (res, req, status, text) => answer(res, req, status, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }, `${text}\n`);

  function serveFile(req, res, file, status = 200) {
    const type = TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
    const st = statSync(file);
    const headers = { 'content-type': type, 'cache-control': status === 200 ? CACHE_CONTROL : 'no-store', 'last-modified': st.mtime.toUTCString(), vary: 'Accept-Encoding' };
    if (status === 200 && req.headers['if-modified-since'] && Date.parse(req.headers['if-modified-since']) >= Math.floor(st.mtimeMs / 1000) * 1000) return answer(res, req, 304, headers);
    if (COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
      let hit = gz.get(file);
      if (!hit || hit.mtimeMs !== st.mtimeMs) { hit = { mtimeMs: st.mtimeMs, body: gzipSync(readFileSync(file), { level: 6 }) }; gz.set(file, hit); }
      return answer(res, req, status, { ...headers, 'content-encoding': 'gzip', 'content-length': hit.body.length }, hit.body);
    }
    requests.push({ method: req.method, path: req.url, status });
    res.writeHead(status, { ...headers, 'content-length': st.size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).pipe(res);
  }

  const server = createServer((req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return plain(res, req, 405, 'Method not allowed');
      const url = new URL(req.url ?? '/', 'http://localhost');
      let path;
      try { path = decodeURIComponent(url.pathname); } catch { return plain(res, req, 400, 'Bad request'); }
      if (path.includes('\0') || path.split('/').includes('..') || /%2f/i.test(url.pathname)) return plain(res, req, 400, 'Bad request');
      const base = bases.find((b) => path.startsWith(b) || path === b.slice(0, -1));
      if (!base) return plain(res, req, 404, 'Not found: this server mounts the site only under its base paths');
      if (path === base.slice(0, -1)) return answer(res, req, 301, { location: `${base}${url.search}`, 'cache-control': 'no-store' });
      let file = resolve(root, path.slice(base.length));
      if (file !== root && !file.startsWith(root + sep)) return plain(res, req, 400, 'Bad request');
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (existsSync(file) && statSync(file).isFile()) return serveFile(req, res, file);
      const notFound = join(root, '404.html');
      if (existsSync(notFound)) return serveFile(req, res, notFound, 404);
      return plain(res, req, 404, 'Not found');
    } catch (error) {
      return plain(res, req, 500, `The test server failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  await new Promise((done, fail) => { server.once('error', fail); server.listen(port, host, done); });
  const address = server.address();
  const actual = typeof address === 'object' && address ? address.port : port;
  return {
    origin: `http://${host}:${actual}`, port: actual, bases, requests,
    close: () => new Promise((done) => { server.closeAllConnections(); server.close(() => done(undefined)); }),
  };
}
