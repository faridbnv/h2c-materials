#!/usr/bin/env node
// Fetching the documents the ledger lists: the bytes, their digest, and where each one went.
//
// A document is its bytes. Everything downstream is keyed by SHA-256, so the same file served from a manufacturer
// and from a retailer is one document, read once; a file that changed is a different key, not a stale entry. The
// ledger records the digest, and a second copy of it becomes `duplicate-of` rather than a second source.
//
// Politeness is deliberate: two requests at a time per host, spaced, with a few retries on the statuses that mean
// "later". This walks 43 publishers' libraries, and none of them owes us their bandwidth.
//
//   npm run ingest:fetch -- --provider "3D-Fuel"     every document of one provider
//   npm run ingest:fetch -- --batch b06              every document assigned to a batch
//   npm run ingest:fetch -- --doc <doc_key>          one document
//   npm run ingest:fetch -- --provider X --limit 5   the first few, to see what a library serves
//   npm run ingest:fetch -- ... --refetch            fetch again even where a digest is recorded
//
// Writes .cache/sources/by-sha/<sha>.<ext> and updates the ledger. Nothing here touches data/.

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { sha256, cacheDir } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PER_HOST = 2;
const SPACING_MS = 500;
const RETRY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const flag = (name) => process.argv.includes(`--${name}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * How a host serves a document. Most serve the file; some serve a viewer around it, and the adapter rewrites the
 * link to the file the viewer shows. A host that cannot be fetched at all says so, so the ledger records why
 * rather than a failure that looks like a network problem.
 */
export function adapter(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return { kind: 'invalid', reason: 'not a URL' }; }
  const host = parsed.hostname.replace(/^www\./, '');
  const drive = /drive\.google\.com$/.test(host) && /\/file\/d\/([^/]+)/.exec(parsed.pathname);
  if (drive) return { kind: 'pdf', host, url: `https://drive.google.com/uc?export=download&id=${drive[1]}` };
  if (/sharepoint\.com$/.test(host)) return { kind: 'pdf', host, url: url.includes('download=1') ? url : `${url}${url.includes('?') ? '&' : '?'}download=1` };
  if (/^isanmate\.com$/.test(host)) return { kind: 'manual', host, reason: 'the library disallows fetching tools; save each sheet from a browser and stage it' };
  if (/\.pdf(\?|$)/i.test(parsed.pathname + parsed.search)) return { kind: 'pdf', host, url };
  return { kind: 'page', host, url };
}

async function get(url, { tries = 3 } = {}) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: '*/*' }, redirect: 'follow' })
      .catch((e) => ({ ok: false, status: 0, statusText: e.message }));
    if (response.ok) return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers?.get('content-type') ?? '' };
    if (!RETRY_STATUS.has(response.status) || attempt === tries) return { error: `HTTP ${response.status || 0} ${response.statusText ?? ''}`.trim() };
    await sleep(attempt * 2000);
  }
  return { error: 'unreachable' };
}

/** One document: fetch, hash, store, and say what happened in the ledger's words. */
export async function fetchDocument(row, { digests, refetch = false }) {
  if (row.sha256 && !refetch) return { status: row.status === 'inventoried' ? 'fetched' : row.status, note: row.status_note };
  const how = adapter(row.url);
  if (how.kind === 'invalid' || how.kind === 'manual') return { status: how.kind === 'manual' ? 'needs-staging' : 'unreachable', note: how.reason };

  const got = await get(how.url);
  if (got.error) return { status: 'unreachable', note: `${got.error} on ${new Date().toISOString().slice(0, 10)}` };

  const isPdf = got.bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  if (how.kind === 'pdf' && !isPdf) {
    // A link that says .pdf and serves a page is a library that lost the file, or a consent wall.
    return { status: 'unreachable', note: `served ${got.type || 'something'} rather than a PDF` };
  }
  const sha = sha256(got.bytes);
  const twin = digests.get(sha);
  const extension = isPdf ? 'pdf' : 'html';
  const path = cacheDir('sources/by-sha', `${sha}.${extension}`);
  if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, got.bytes); }
  if (twin && twin !== row.doc_key) return { sha256: sha, status: 'duplicate-of', duplicate_of: twin, duplicate_kind: 'identical-sha', note: '' };
  digests.set(sha, row.doc_key);
  return { sha256: sha, status: isPdf ? 'fetched' : 'fetched-page', note: isPdf ? '' : `served ${got.type || 'a page'}; it is hashed as what was read` };
}

/** Run with at most `PER_HOST` requests in flight per host, spaced, and any number of hosts at once. */
async function run(rows, digests, refetch) {
  const byHost = new Map();
  for (const row of rows) {
    const host = adapter(row.url).host ?? 'unknown';
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(row);
  }
  const done = [];
  await Promise.all([...byHost.values()].map(async (queue) => {
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(PER_HOST, queue.length) }, async () => {
      while (index < queue.length) {
        const row = queue[index++];
        const result = await fetchDocument(row, { digests, refetch });
        Object.assign(row, result.sha256 ? result : { status: result.status, status_note: result.note ?? '' });
        if (result.note !== undefined) row.status_note = result.note ?? '';
        row.updated = new Date().toISOString().slice(0, 10);
        done.push(row);
        process.stdout.write(`\r${done.length} of ${rows.length} fetched`);
        await sleep(SPACING_MS);
      }
    }));
  }));
  process.stdout.write('\n');
  return done;
}

if (process.argv[1]?.endsWith('fetch.mjs')) {
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const provider = arg('provider'), batch = arg('batch'), doc = arg('doc'), limit = Number(arg('limit', '0'));
  const wanted = rows.filter((r) => (doc ? r.doc_key === doc : true)
    && (provider ? r.provider === provider || r.manufacturer === provider : true)
    && (batch ? r.batch === batch : true)
    && (flag('refetch') || !['fetched', 'fetched-page', 'duplicate-of', 'applied'].includes(r.status)));
  if (!provider && !batch && !doc) { console.error('name what to fetch: --provider, --batch or --doc'); process.exit(2); }
  const todo = limit ? wanted.slice(0, limit) : wanted;
  if (!todo.length) { console.log('nothing to fetch'); process.exit(0); }
  console.log(`${todo.length} document(s) to fetch, ${new Set(todo.map((r) => adapter(r.url).host)).size} host(s)`);

  const digests = new Map(rows.filter((r) => r.sha256).map((r) => [r.sha256, r.doc_key]));
  await run(todo, digests, flag('refetch'));
  writeFileSync(LEDGER, csvText(HEADER, rows));

  const counts = new Map();
  for (const r of todo) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  for (const [status, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${status}`);
  for (const r of todo.filter((r) => r.status === 'unreachable')) console.log(`        ${r.doc_key} ${r.product_raw}: ${r.status_note}`);
}
