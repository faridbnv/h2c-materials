#!/usr/bin/env node
// A second witness for a product whose sheet does not say what it is made of: the maker's own product page.
//
//   npm run ingest:witness                 fetch the product page of every reading still marked unread
//   npm run ingest:witness -- --doc <key>  one product's page
//   npm run ingest:witness -- --doc <key> --url <url>   a document the maker published that a search found (R089):
//                                          a product page or a PDF, fetched and hashed as a witness like any other
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

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

async function witness({ row, page, found = false }) {
  const got = await get(page);
  const today = new Date().toISOString().slice(0, 10);
  const base = {
    // A page the ledger already names is keyed by itself, as before. One a search found may witness several
    // products of one maker (a range page), so it is keyed by the product it witnesses as well.
    doc_key: found ? `${page}#witness-for=${row.doc_key}` : page, provider: row.provider, provider_kind: row.provider_kind, brand: row.brand, manufacturer: row.manufacturer,
    product_raw: row.product_raw, url: page, source_page_url: page, format: 'HTML', language: row.language ?? 'Not stated',
    mechanical_evidence: 'Not applicable', variants: '',
    discovery: found ? 'a document the maker published, found by a search and fetched as a witness (R089)' : 'product page, fetched as a second witness (completion plan, phase C)',
    registered_source_id: '', registered_by: '', duplicate_of: row.doc_key, duplicate_kind: 'product-page', primary: 'FALSE', batch: '',
    checked: today, updated: today,
  };
  if (got.error) return { ...base, sha256: '', access_status: got.error, status: 'unreachable', status_note: `the product page could not be fetched: ${got.error}` };
  const sha = sha256(got.bytes);
  const isPdf = got.bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const path = cacheDir('sources/by-sha', `${sha}.${isPdf ? 'pdf' : 'html'}`);
  if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, got.bytes); }
  const text = await documentText(got.bytes, { sha });
  const lines = (text.pages ?? []).reduce((n, p) => n + (p.lines ?? []).length, 0);
  return { ...base, sha256: sha, format: isPdf ? 'PDF' : 'HTML', access_status: `${isPdf ? 'document' : 'page'} fetched (${got.type || 'text/html'})`, status: 'duplicate-of',
    status_note: `the maker's product page for ${row.doc_key}, ${lines} line(s) of text; a witness for what the sheet does not say` };
}

if (process.argv[1]?.endsWith('witness.mjs')) {
  const ledger = readLedger();
  const explicit = arg('url');
  if (explicit && !arg('doc')) { console.error('--url witnesses one product: --doc <key> --url <url>'); process.exit(2); }
  const target = explicit ? ledger.find((r) => r.doc_key === arg('doc')) : null;
  if (explicit && !target) { console.error(`no ledger row is keyed ${arg('doc')}`); process.exit(2); }
  const todo = explicit ? [{ row: target, page: explicit, found: true }] : wanting(ledger, arg('doc'));
  if (!todo.length) { console.log('every unread reading with a product page already has its witness'); process.exit(0); }
  const byHost = new Map();
  for (const t of todo) { let host = ''; try { host = new URL(t.page).hostname; } catch { host = '?'; } (byHost.get(host) ?? byHost.set(host, []).get(host)).push(t); }
  const done = [];
  await Promise.all([...byHost.values()].map(async (queue) => {
    const workers = Array.from({ length: Math.min(PER_HOST, queue.length) }, async () => {
      while (queue.length) { const t = queue.shift(); done.push(await witness(t)); await sleep(SPACING_MS); }
    });
    await Promise.all(workers);
  }));
  const known = new Set(ledger.map((r) => r.doc_key));
  const rows = [...ledger, ...done.filter((r) => !known.has(r.doc_key))];
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const ok = done.filter((r) => r.sha256).length;
  console.log(`${done.length} product page(s) fetched: ${ok} hashed and cached, ${done.length - ok} unreachable -> ledger`);
}
