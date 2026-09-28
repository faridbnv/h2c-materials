#!/usr/bin/env node
// A second witness for a product whose sheet does not say what it is made of: the maker's own product page.
//
//   npm run ingest:witness                 fetch the product page of every reading still marked unread
//   npm run ingest:witness -- --doc <key>  one product's page
//   npm run ingest:witness -- --doc <key> --url <url>   a document the maker published that a search found (R089):
//                                          a product page or a PDF, fetched and hashed as a witness like any other
//   npm run ingest:witness -- --doc <key> --url <url> --stage <file> --sha <sha256> --accessed <date> --by <who>
//                                          the same document from the copy saved when it was read (R084): the bytes
//                                          are the file's, and they must hash to the digest the reader recorded
//   npm run ingest:witness -- --from <manifest.csv>   many staged copies at once; columns file, url, doc, for,
//                                          provider, manufacturer, product, sha256, accessed, by ("for" names a
//                                          SourceID registered before the V2 import, whose sheet has no ledger row)
//
// R075 and R077 said the sheet answers what the name does not, and for two documents in three it does not: the
// sheet prints the numbers and never the polymer. The owner chose, for those, the maker's own product page — the
// URL the ledger already holds beside the document — fetched and hashed like any document (D35), and read with
// the same rules the sheet was read with. Nothing enters from memory: the witness is bytes with a digest, and the
// reading it gives is quoted with the page it came from.
//
// The page is a document in the ledger's terms and is recorded as one: a row of its own, keyed by its URL, with
// its digest and its text cached where every other document's is. It is `duplicate-of` the product's document
// with the kind `product-page`, which keeps it out of every batch (a page is not a data sheet to propose from)
// and says exactly what it is for. Two requests at a time per host, spaced: these are makers' shops.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { sha256, cacheDir, documentText } from '../lib/pdf-text.mjs';
import { HEADER, readLedger } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const PER_HOST = 2, SPACING_MS = 600;
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && !String(process.argv[i + 1] ?? '--').startsWith('--') ? process.argv[i + 1] : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The witness page the ledger holds for a document, if one was fetched. */
export const witnessOf = (docKey, ledger) => ledger.find((r) => r.duplicate_kind === 'product-page' && r.duplicate_of === docKey && r.sha256) ?? null;

/** The readings still marked unread whose ledger row names a product page that is not the document itself. */
function wanting(ledger, only = null) {
  const path = join(AUDIT, 'readings/readings.csv');
  if (!existsSync(path)) return [];
  const byKey = new Map(ledger.map((r) => [r.doc_key, r]));
  const out = [];
  for (const r of readCsv(path).records.map((x) => x.values)) {
    if (r.Strength !== 'unread' || (only && r['Doc key'] !== only)) continue;
    const row = byKey.get(r['Doc key']);
    const page = row?.source_page_url;
    if (!row || !page || page === row.url || /\.pdf(\?|$)/i.test(page)) continue;
    if (witnessOf(row.doc_key, ledger)) continue;
    out.push({ row, page });
  }
  return out;
}

async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': AGENT, Accept: 'text/html,*/*' }, redirect: 'follow' })
      .catch((e) => ({ ok: false, status: 0, statusText: e.message }));
    if (response.ok) return { bytes: Buffer.from(await response.arrayBuffer()), type: response.headers?.get('content-type') ?? '' };
    if (![408, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) return { error: `HTTP ${response.status || 0} ${response.statusText ?? ''}`.trim() };
    await sleep(attempt * 2000);
  }
  return { error: 'unreachable' };
}

/**
 * The ledger row of a witness. A page the ledger already names is keyed by itself, as before; one a search found may
 * witness several products of one maker (a range page), so it is keyed by the product it witnesses as well. A staged
 * copy says who saved it and when, and is dated by that reading, not by the day it was staged.
 */
export function witnessRow({ row, page, found = false, staged = null, today = new Date().toISOString().slice(0, 10), reread = false }) {
  const forKey = row.doc_key || (staged?.forSource ? `source:${staged.forSource}` : '');
  // A page the ledger already holds from another day's reading, with other bytes, is a second reading of it: keyed by
  // the day it was read, so neither reading replaces the other.
  return {
    doc_key: found ? `${page}#witness-for=${forKey}${reread ? `&read=${staged.accessed}` : ''}` : page, provider: row.provider, provider_kind: row.provider_kind, brand: row.brand, manufacturer: row.manufacturer,
    product_raw: row.product_raw, url: page, source_page_url: page, format: 'HTML', language: row.language ?? 'Not stated',
    mechanical_evidence: 'Not applicable', variants: '',
    discovery: staged ? `a document the maker published, saved by ${staged.by} on ${staged.accessed} and staged from that copy (R084, R089)`
      : found ? 'a document the maker published, found by a search and fetched as a witness (R089)' : 'product page, fetched as a second witness (completion plan, phase C)',
    registered_source_id: '', registered_by: '', duplicate_of: row.doc_key ?? '', duplicate_kind: 'product-page', primary: 'FALSE', batch: '',
    checked: staged?.accessed ?? today, updated: today,
  };
}

/** A staged copy is the document only if its bytes hash to the digest recorded when it was read. */
export function stagedBytes(bytes, expected, name) {
  const sha = sha256(bytes);
  if (expected && sha !== String(expected).toLowerCase()) throw new Error(`${name} hashes to ${sha}, not the ${expected} recorded when it was read: it is not that copy`);
  return sha;
}

async function witness({ row, page, found = false, staged = null, reread = false }) {
  const today = new Date().toISOString().slice(0, 10);
  const base = witnessRow({ row, page, found, staged, today, reread });
  const got = staged ? { bytes: staged.bytes, type: 'a staged copy' } : await get(page);
  if (got.error) return { ...base, sha256: '', access_status: got.error, status: 'unreachable', status_note: `the product page could not be fetched: ${got.error}` };
  const sha = staged ? stagedBytes(got.bytes, staged.sha, staged.name) : sha256(got.bytes);
  const isPdf = got.bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const path = cacheDir('sources/by-sha', `${sha}.${isPdf ? 'pdf' : 'html'}`);
  if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, got.bytes); }
  const text = await documentText(got.bytes, { sha });
  const lines = (text.pages ?? []).reduce((n, p) => n + (p.lines ?? []).length, 0);
  const of = row.doc_key || `source ${staged?.forSource}, registered before the V2 import (its sheet has no ledger row)`;
  return { ...base, sha256: sha, format: isPdf ? 'PDF' : 'HTML', access_status: `${isPdf ? 'document' : 'page'} ${staged ? `staged (${staged.name})` : `fetched (${got.type || 'text/html'})`}`, status: 'duplicate-of',
    status_note: `the maker's ${isPdf ? 'document' : 'page'} for ${of}, ${lines} line(s) of text; a witness for what the sheet does not say` };
}

/** The documents a manifest names, each staged against the product it witnesses. */
function fromManifest(path, ledger) {
  const dir = dirname(resolve(path));
  return readCsv(path).records.map((r) => r.values).map((m) => {
    const row = m.doc ? ledger.find((r) => r.doc_key === m.doc) : { doc_key: '', provider: m.provider, provider_kind: 'manufacturer', brand: m.manufacturer, manufacturer: m.manufacturer, product_raw: m.product, language: 'Not stated' };
    if (!row) throw new Error(`${path}: no ledger row is keyed ${m.doc}`);
    if (!m.doc && !m.for) throw new Error(`${path}: ${m.file} names neither a ledger row (doc) nor a registered source (for)`);
    const file = resolve(dir, m.file);
    return { row, page: m.url, found: true, staged: { bytes: readFileSync(file), name: basename(file), sha: m.sha256, accessed: m.accessed, by: m.by, forSource: m.for || null } };
  });
}

if (process.argv[1]?.endsWith('witness.mjs')) {
  const ledger = readLedger();
  const explicit = arg('url'), stage = arg('stage'), manifest = arg('from');
  if (explicit && !arg('doc')) { console.error('--url witnesses one product: --doc <key> --url <url>'); process.exit(2); }
  if (stage && (!explicit || !arg('sha') || !arg('accessed') || !arg('by'))) { console.error('a staged copy names its page and its reading: --doc <key> --url <url> --stage <file> --sha <sha256> --accessed <date> --by <who>'); process.exit(2); }
  const target = explicit ? ledger.find((r) => r.doc_key === arg('doc')) : null;
  if (explicit && !target) { console.error(`no ledger row is keyed ${arg('doc')}`); process.exit(2); }
  const todo = manifest ? fromManifest(manifest, ledger)
    : stage ? [{ row: target, page: explicit, found: true, staged: { bytes: readFileSync(stage), name: basename(stage), sha: arg('sha'), accessed: arg('accessed'), by: arg('by') } }]
      : explicit ? [{ row: target, page: explicit, found: true }] : wanting(ledger, arg('doc'));
  if (!todo.length) { console.log('every unread reading with a product page already has its witness'); process.exit(0); }
  // A copy staged again is the same row: a re-run is a no-op, and a different copy under that key is refused.
  const byKey = new Map(ledger.map((r) => [r.doc_key, r]));
  const fresh = todo.filter((t) => {
    if (!t.staged) return true;
    const sha = String(t.staged.sha).toLowerCase();
    const held = byKey.get(witnessRow(t).doc_key);
    if (!held || held.sha256 === sha) return !held;
    t.reread = true;
    const again = byKey.get(witnessRow(t).doc_key);
    if (again && again.sha256 !== sha) throw new Error(`${witnessRow(t).doc_key} is already witnessed by ${again.sha256}; a staged copy replaces nothing`);
    return !again;
  });
  const byHost = new Map();
  for (const t of fresh) { let host = ''; try { host = new URL(t.page).hostname; } catch { host = '?'; } (byHost.get(host) ?? byHost.set(host, []).get(host)).push(t); }
  const done = [];
  await Promise.all([...byHost.values()].map(async (queue) => {
    const workers = Array.from({ length: Math.min(PER_HOST, queue.length) }, async () => {
      while (queue.length) { const t = queue.shift(); done.push(await witness(t)); if (!t.staged) await sleep(SPACING_MS); }
    });
    await Promise.all(workers);
  }));
  const known = new Set(ledger.map((r) => r.doc_key));
  const rows = [...ledger, ...done.filter((r) => !known.has(r.doc_key))];
  if (done.length) writeFileSync(LEDGER, csvText(HEADER, rows));
  const ok = done.filter((r) => r.sha256).length;
  console.log(`${done.length} witness document(s) ${manifest || stage ? 'staged' : 'fetched'}: ${ok} hashed and cached, ${done.length - ok} unreachable -> ledger${todo.length - fresh.length ? `; ${todo.length - fresh.length} already in the ledger` : ''}`);
}
