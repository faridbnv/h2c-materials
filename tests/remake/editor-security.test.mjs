// WP-13: the editor service's rules (02 section 10). A request without the launch token, with a wrong Host or a wrong Origin is refused
// and reaches nothing; no CORS header is ever sent; the service listens on 127.0.0.1 and nowhere else; the page gets a strict
// Content-Security-Policy; nothing a request names is ever joined to a folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { connect } from 'node:net';
import { networkInterfaces } from 'node:os';
import { dropTemplate } from './write-helpers.mjs';
import { raw, startFixture } from './editor-helpers.mjs';
import { createGuard } from '../../apps/editor/server/security.ts';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startService } from '../../apps/editor/server/service.ts';

let fixture;
let dist;
before(async () => {
  // A built interface of two tiny files, so the static routes can be tried without building the real one.
  dist = mkdtempSync(join(tmpdir(), 'atlas-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Editor</title><script type="module" src="/assets/app.js"></script>');
  writeFileSync(join(dist, 'assets', 'app.js'), 'export {};');
  fixture = await startFixture({ store: false });
  await fixture.service.close();
  fixture.service = await startService({ ...fixture.options, distDir: dist });
});
after(async () => {
  await fixture.cleanup();
  rmSync(dist, { recursive: true, force: true });
  dropTemplate();
});

const port = () => fixture.service.port;
const host = () => `127.0.0.1:${port()}`;
const token = () => fixture.service.token;
const origin = () => `http://${host()}`;

// ---------------------------------------------------------------- the bind address

test('the service listens on 127.0.0.1 and on no other address', () => {
  assert.equal(fixture.service.address, '127.0.0.1');
  const bound = fixture.service.server.address();
  assert.equal(typeof bound, 'object');
  assert.equal(bound.address, '127.0.0.1');
  assert.equal(bound.family, 'IPv4');
  assert.ok(bound.port > 0 && bound.port !== 80, 'a port the system picked');
});

test('the port does not answer on this computer\'s other addresses', async (t) => {
  const others = Object.values(networkInterfaces()).flat().filter((i) => i !== undefined && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  if (others.length === 0) { t.skip('this computer has no non-loopback IPv4 address to try'); return; }
  for (const address of others) {
    const outcome = await new Promise((resolve) => {
      const socket = connect({ host: address, port: port(), timeout: 2000 });
      socket.once('connect', () => { socket.destroy(); resolve('connected'); });
      socket.once('timeout', () => { socket.destroy(); resolve('timeout'); });
      socket.once('error', (error) => resolve(error.code));
    });
    assert.notEqual(outcome, 'connected', `${address}:${port()} must not accept connections`);
  }
});

test('the service refuses to start if the system bound it to another address (the guard is in the code, not only in the call)', async () => {
  const source = (await import('node:fs')).readFileSync(new URL('../../apps/editor/server/service.ts', import.meta.url), 'utf8');
  assert.match(source, /server\.listen\(options\.port \?\? 0, '127\.0\.0\.1'/);
  assert.match(source, /bound\.address !== '127\.0\.0\.1'/);
  assert.doesNotMatch(source, /0\.0\.0\.0|'::'/);
});

// ---------------------------------------------------------------- the launch token

test('an API request without the token is refused, and so is one with a wrong token', async () => {
  const none = await raw(port(), { path: '/api/state', headers: { host: host() } });
  assert.equal(none.status, 401);
  assert.equal(none.json.error, 'session-ended');
  assert.doesNotMatch(none.text, /snapshotDigest/, 'a refusal carries no data');
  for (const wrong of ['x', token().slice(0, -1), `${token()}x`, token().toUpperCase() === token() ? 'Z' : token().toUpperCase(), '']) {
    const response = await raw(port(), { path: '/api/state', headers: { host: host(), 'x-editor-token': wrong } });
    assert.equal(response.status, 401, `token ${JSON.stringify(wrong.slice(0, 6))}`);
  }
  assert.equal((await fixture.call('/api/state')).status, 200);
});

test('the token is not in the page, not in a file the page loads, and not in any answer to a request without it', async () => {
  for (const path of ['/', '/assets/app.js']) {
    const response = await raw(port(), { path, headers: { host: host() } });
    assert.equal(response.status, 200, path);
    assert.ok(!response.text.includes(token()), path);
    assert.ok(!JSON.stringify(response.headers).includes(token()), path);
  }
});

test('every API route needs the token (a request with none reaches no handler)', async () => {
  const paths = ['/api/state', '/api/products?q=pla', '/api/products/G001-01', '/api/measurements/V000001', '/api/sources/X/pages/1', '/api/drafts', '/api/conflicts', '/api/backups'];
  for (const path of paths) assert.equal((await raw(port(), { path, headers: { host: host() } })).status, 401, path);
  for (const path of ['/api/corrections', '/api/impact', '/api/export', '/api/restore', '/api/backups', '/api/conflicts/X/resolve']) {
    const response = await raw(port(), { method: 'POST', path, headers: { host: host(), origin: origin(), 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401, path);
  }
});

// ---------------------------------------------------------------- Host

test('a wrong Host is refused on every request, with or without the token (DNS rebinding)', async () => {
  const hosts = ['evil.example', `evil.example:${port()}`, `127.0.0.1:${port() + 1}`, '127.0.0.1', `[::1]:${port()}`, `0.0.0.0:${port()}`, `localhost.evil.example:${port()}`];
  for (const wrong of hosts) {
    for (const path of ['/', '/assets/app.js', '/api/state']) {
      const response = await raw(port(), { path, headers: { host: wrong, 'x-editor-token': token() } });
      assert.equal(response.status, 421, `Host ${JSON.stringify(wrong)} ${path}`);
      assert.ok(!response.text.includes('snapshotDigest'));
    }
  }
});

test('Host 127.0.0.1:<port> and localhost:<port> are both ours', async () => {
  for (const name of [`127.0.0.1:${port()}`, `localhost:${port()}`, `LOCALHOST:${port()}`]) {
    assert.equal((await raw(port(), { path: '/api/state', headers: { host: name, 'x-editor-token': token() } })).status, 200, name);
  }
});

// ---------------------------------------------------------------- Origin

test('a wrong Origin is refused even with the right token', async () => {
  for (const wrong of ['http://evil.example', `http://evil.example:${port()}`, 'null', `https://127.0.0.1:${port()}`, `http://127.0.0.1:${port() + 1}`, `http://localhost.evil.example:${port()}`]) {
    const get = await raw(port(), { path: '/api/state', headers: { host: host(), 'x-editor-token': token(), origin: wrong } });
    assert.equal(get.status, 403, `GET with Origin ${wrong}`);
    const post = await raw(port(), { method: 'POST', path: '/api/backups', headers: { host: host(), 'x-editor-token': token(), origin: wrong, 'content-type': 'application/json' }, body: '{}' });
    assert.equal(post.status, 403, `POST with Origin ${wrong}`);
  }
});

test('a request that changes anything must carry an Origin that is ours', async () => {
  const withoutOrigin = await raw(port(), { method: 'POST', path: '/api/backups', headers: { host: host(), 'x-editor-token': token(), 'content-type': 'application/json' }, body: '{}' });
  assert.equal(withoutOrigin.status, 403);
  const own = await raw(port(), { method: 'POST', path: '/api/backups', headers: { host: host(), 'x-editor-token': token(), origin: origin(), 'content-type': 'application/json' }, body: '{}' });
  assert.equal(own.status, 200);
  const localhostOrigin = await raw(port(), { method: 'POST', path: '/api/backups', headers: { host: `localhost:${port()}`, 'x-editor-token': token(), origin: `http://localhost:${port()}`, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(localhostOrigin.status, 200);
});

test('a browser that says the request came from another site is refused (Fetch Metadata)', async () => {
  for (const site of ['cross-site', 'same-site']) {
    const response = await raw(port(), { path: '/api/state', headers: { host: host(), 'x-editor-token': token(), 'sec-fetch-site': site } });
    assert.equal(response.status, 403, site);
  }
  assert.equal((await raw(port(), { path: '/api/state', headers: { host: host(), 'x-editor-token': token(), 'sec-fetch-site': 'same-origin' } })).status, 200);
});

// ---------------------------------------------------------------- no CORS

test('no answer carries a CORS header, and a preflight is refused', async () => {
  const answers = [
    await fixture.call('/api/state'),
    await raw(port(), { path: '/api/state', headers: { host: host() } }),
    await raw(port(), { path: '/api/state', headers: { host: 'evil.example' } }),
    await raw(port(), { path: '/', headers: { host: host(), origin: 'http://evil.example' } }),
    await raw(port(), { path: '/api/state', headers: { host: host(), 'x-editor-token': token(), origin: 'http://evil.example' } }),
    await raw(port(), { method: 'OPTIONS', path: '/api/state', headers: { host: host(), origin: 'http://evil.example', 'access-control-request-method': 'GET' } }),
  ];
  for (const answer of answers) {
    const names = Object.keys(answer.headers).filter((name) => name.startsWith('access-control-'));
    assert.deepEqual(names, [], `status ${answer.status}`);
  }
  assert.equal(answers.at(-1).status, 405);
  assert.equal((await raw(port(), { method: 'PUT', path: '/api/state', headers: { host: host(), 'x-editor-token': token(), origin: origin() } })).status, 405);
});

// ---------------------------------------------------------------- the page, the policy and what a request may name

test('the page and every answer carry a strict Content-Security-Policy and no-store', async () => {
  for (const answer of [await raw(port(), { path: '/', headers: { host: host() } }), await fixture.call('/api/state'), await raw(port(), { path: '/api/state', headers: { host: host() } })]) {
    const policy = answer.headers['content-security-policy'];
    assert.match(policy, /default-src 'none'/);
    assert.match(policy, /script-src 'self'(;|$)/);
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval|\*|https?:/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.equal(answer.headers['cache-control'], 'no-store');
    assert.equal(answer.headers['x-content-type-options'], 'nosniff');
  }
});

test('a path cannot leave the interface folder: only the files listed at start are served', async () => {
  for (const path of ['/../package.json', '/%2e%2e/package.json', '/assets/../../package.json', '/..%2fpackage.json', '/assets/%2e%2e/%2e%2e/package.json', '/index.html/', '/assets', '/assets/', '/server/service.ts', '/\\..\\package.json', '//etc/passwd']) {
    const response = await raw(port(), { path, headers: { host: host() } });
    assert.ok(response.status === 404 || response.status === 400, `${path} gave ${response.status}`);
    assert.ok(!response.text.includes('"name"') && !response.text.includes('root:'), path);
  }
});

test('a request body must be JSON, small and valid', async () => {
  const headers = { host: host(), 'x-editor-token': token(), origin: origin() };
  assert.equal((await raw(port(), { method: 'POST', path: '/api/corrections', headers: { ...headers, 'content-type': 'text/plain' }, body: '{}' })).status, 400);
  assert.equal((await raw(port(), { method: 'POST', path: '/api/corrections', headers: { ...headers, 'content-type': 'application/json' }, body: '{not json' })).status, 400);
  const big = await raw(port(), { method: 'POST', path: '/api/corrections', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'x'.repeat(100_000) }) });
  assert.equal(big.status, 400);
  assert.equal((await raw(port(), { method: 'POST', path: '/api/corrections', headers: { ...headers, 'content-type': 'application/json' }, body: '{}' })).status, 400);
});

test('an ID in a path is checked before it is used', async () => {
  for (const id of ['..', 'a%2f..%2fb', 'a%20b', 'x'.repeat(200), '%00']) {
    const response = await fixture.call(`/api/measurements/${id}`);
    assert.ok([400, 404].includes(response.status), `${id} gave ${response.status}`);
  }
});

// ---------------------------------------------------------------- the guard itself

test('the guard compares tokens in constant time and treats a repeated header as wrong', () => {
  const guard = createGuard(5000, 'secret-token');
  assert.equal(guard.checkApi('GET', { 'x-editor-token': 'secret-token' }).ok, true);
  assert.equal(guard.checkApi('GET', { 'x-editor-token': ['secret-token', 'secret-token'] }).ok, false);
  assert.equal(guard.checkHost({ host: ['127.0.0.1:5000'] }).ok, false);
  assert.equal(guard.checkHost({ host: '127.0.0.1:5000' }).ok, true);
  assert.equal(guard.checkHost({}).ok, false);
});
