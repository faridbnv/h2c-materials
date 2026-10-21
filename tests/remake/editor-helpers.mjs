// Shared by the WP-13 tests (not a test itself): a small private source store, a sandbox workspace cloned from the shared template,
// and the editor service started on them. The store holds the one document the fixture cites (the page text, and a one-pixel image of
// page 1), in the layout of the real private store, so the service reads it the way it reads the real one.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startService } from '../../apps/editor/server/service.ts';
import { HASH, QUOTE, SOURCE, scratch } from './write-helpers.mjs';

export { QUOTE, SOURCE };

const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
/** The line that prints the tensile value WP-11's impact fixture lowers from 56 to 12 MPa. */
export const TENSILE_QUOTE = 'Tensile Strength, Break ISO 527 MPa 12';
const PAGE_LINES = [['Technical data sheet', 'Printed specimens', QUOTE, 'Melt flow 6 g/10 min', TENSILE_QUOTE], ['Storage and handling.']];

/** A private store with the fixture's document: `text/<sha>.json` and `pages/<sha>/o-1.png`. */
export function makeStore() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-store-'));
  mkdirSync(join(dir, 'text'));
  mkdirSync(join(dir, 'pages', HASH), { recursive: true });
  const pages = PAGE_LINES.map((lines, k) => ({ page: k + 1, lines: lines.map((text) => ({ text })) }));
  writeFileSync(join(dir, 'text', `${HASH}.json`), JSON.stringify({ sha: HASH, extractor: 'fixture', pages }));
  writeFileSync(join(dir, 'pages', HASH, 'o-1.png'), PIXEL);
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** One request with full control of its headers (fetch will not let a test choose Host). Returns { status, headers, text, json }. */
export function raw(port, { method = 'GET', path = '/', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

/** The editor service on a cloned sandbox workspace and the fixture store; `call` sends a correct, authorised request. */
export async function startFixture({ dataDir, impact, store = true, backupEveryMs = 0, now } = {}) {
  const sb = await scratch({ dataDir, store: null });
  sb.ws.close();
  const files = store ? makeStore() : null;
  // `env: {}` so that a test never reads the owner's real private store.
  const options = {
    workspaceDir: sb.dir, backupEveryMs, env: {},
    ...(dataDir === undefined ? {} : { dataDir }), ...(files === null ? {} : { sourceStore: files.dir }), ...(impact === undefined ? {} : { impact }), ...(now === undefined ? {} : { now }),
  };
  const fixture = { sb, files, options, service: await startService(options) };
  fixture.call = (path, { method = 'GET', body, headers = {} } = {}) => {
    const { port, token } = fixture.service;
    const base = { host: `127.0.0.1:${port}`, 'x-editor-token': token, ...(method === 'POST' ? { origin: `http://127.0.0.1:${port}`, 'content-type': 'application/json' } : {}) };
    return raw(port, { method, path, headers: { ...base, ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  };
  fixture.restart = async () => { await fixture.service.close(); fixture.service = await startService(options); };
  fixture.cleanup = async () => { await fixture.service.close(); files?.cleanup(); rmSync(sb.dir, { recursive: true, force: true }); };
  return fixture;
}

/** The correction of V000001's density to 1.25 g/cc that passes every guard, as the interface sends it. */
export async function densityCorrection(fixture, overrides = {}) {
  const detail = (await fixture.call('/api/measurements/V000001')).json;
  return {
    measurementId: 'V000001',
    expect: { 'Raw value': '1.24', 'Raw numeric': '1.24', 'Normalized value': '1240' },
    set: { 'Raw value': '1.25', 'Raw numeric': '1.25', 'Normalized value': '1250' },
    reason: 'Edition 2025-06 supersedes 2024-03.',
    evidence: { page: 1, locator: 'Table 1', quote: QUOTE },
    base: detail.base,
    ...overrides,
  };
}

/** WP-11's fixture correction as the interface sends it: V000002, the tensile break strength of ECOMAX PLA, 56 to 12 MPa. */
export async function tensileCorrection(fixture, overrides = {}) {
  const detail = (await fixture.call('/api/measurements/V000002')).json;
  return {
    measurementId: 'V000002',
    expect: { 'Raw value': '56', 'Raw numeric': '56', 'Normalized value': '56' },
    set: { 'Raw value': '12', 'Raw numeric': '12', 'Normalized value': '12' },
    reason: 'The data sheet prints 12 MPa for the break strength.',
    evidence: { page: 1, locator: 'p. 1: Tensile Strength, Break', quote: TENSILE_QUOTE },
    base: detail.base,
    ...overrides,
  };
}
