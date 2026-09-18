#!/usr/bin/env node
// Reading the fetched documents: their text, cached by digest, and which of them are the same sheet twice.
//
// Two documents are the same sheet when they print the same numbers. A retailer's copy of a manufacturer's TDS is
// usually a different file (re-exported, re-compressed, a different revision banner) with an identical table, so
// the digest cannot see it and the words alone are noisy. The numbers are the fingerprint: every "number unit"
// statement on the page, as a sorted multiset. Two documents whose multisets agree, and that print enough numbers
// for the agreement to mean something, are one sheet.
//
//   npm run ingest:extract -- --provider "3D-Fuel"     read every fetched document of a provider
//   npm run ingest:extract -- --batch b06
//   npm run ingest:extract -- --all                    everything fetched and not yet read
//   npm run ingest:extract -- ... --refresh            read again, ignoring the cache
//
// Writes .cache/text/<sha>.json (gitignored) and records twins in the ledger. Nothing here touches data/.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { documentText, allLines, joinDigits, statementRe, cacheDir } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const LEDGER = join(projectRoot, 'docs/audits/2026-09-18-v2-import/ledger.csv');
const MIN_STATEMENTS = 8;   // below this, two sheets agreeing about their numbers is a coincidence

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);

export const documentPath = (sha) => ['pdf', 'html'].map((ext) => cacheDir('sources/by-sha', `${sha}.${ext}`)).find(existsSync) ?? null;

/** The numbers a document prints, as a sorted multiset: its fingerprint. */
export function fingerprint(text) {
  const statements = [];
  for (const { text: line } of allLines(text)) {
    for (const m of joinDigits(line).matchAll(statementRe())) statements.push(`${m[1]}${m[3].replace(/\s/g, '')}`);
  }
  return statements.sort();
}

/** How much two fingerprints agree, as a share of the smaller one. */
export function agreement(a, b) {
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  for (const v of a) counts.set(v, (counts.get(v) ?? 0) + 1);
  let shared = 0;
  for (const v of b) { const n = counts.get(v) ?? 0; if (n > 0) { counts.set(v, n - 1); shared++; } }
  return shared / Math.min(a.length, b.length);
}

if (process.argv[1]?.endsWith('extract.mjs')) {
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const provider = arg('provider'), batch = arg('batch');
  if (!provider && !batch && !flag('all')) { console.error('name what to read: --provider, --batch or --all'); process.exit(2); }
  const wanted = rows.filter((r) => r.sha256 && documentPath(r.sha256)
    && (provider ? r.provider === provider || r.manufacturer === provider : true)
    && (batch ? r.batch === batch : true));
  if (!wanted.length) { console.log('nothing fetched to read'); process.exit(0); }

  const prints = new Map();
  let read = 0, failed = 0;
  for (const row of wanted) {
    const path = documentPath(row.sha256);
    try {
      const text = await documentText(readFileSync(path), { sha: row.sha256, refresh: flag('refresh') });
      const print = fingerprint(text);
      prints.set(row.doc_key, { row, print, pages: text.pages.length });
      if (row.status === 'fetched' || row.status === 'fetched-page') {
        row.status = print.length ? 'extracted' : 'needs-ocr';
        row.status_note = print.length ? '' : `${text.pages.length} page(s) with no readable text: a scan`;
      }
      read++;
    } catch (e) {
      row.status = 'unreadable';
      row.status_note = e.message.slice(0, 120);
      failed++;
    }
    process.stdout.write(`\r${read + failed} of ${wanted.length} read`);
  }
  process.stdout.write('\n');

  // Twins, against everything already read rather than only this run.
  const all = [...prints.values()].filter((p) => p.print.length >= MIN_STATEMENTS);
  const byKey = new Map(rows.map((r) => [r.doc_key, r]));
  const named = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Documents that print the same numbers, gathered into clusters rather than paired off. Pairing left a copy
  // pointing at another copy, because whether a document is the one that stays is only known once the whole
  // cluster is known.
  const head = new Map();
  const find = (k) => { while (head.get(k) && head.get(k) !== k) k = head.get(k); return k; };
  const union = (a, b) => { const x = find(a), y = find(b); if (x !== y) head.set(x, y); };
  for (const p of all) head.set(p.row.doc_key, p.row.doc_key);
  for (const r of rows) if (r.duplicate_kind === 'text-twin' && head.has(r.doc_key) && head.has(r.duplicate_of)) union(r.doc_key, r.duplicate_of);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (agreement(all[i].print, all[j].print) >= 0.9) union(all[i].row.doc_key, all[j].row.doc_key);
    }
  }
  const clusters = new Map();
  for (const p of all) {
    const k = find(p.row.doc_key);
    if (!clusters.has(k)) clusters.set(k, []);
    clusters.get(k).push(p.row);
  }

  let twins = 0, checks = 0;
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    // The sheet that stays is the maker's own, and the one the inventory listed as the preferred link; between two
    // of a kind, the first by document key. Everything else in the cluster is that sheet again.
    const rank = (r) => (r.provider_kind === 'manufacturer' ? 0 : 1) * 10 + (r.primary === 'TRUE' ? 0 : 1);
    const keep = [...members].sort((a, b) => rank(a) - rank(b) || a.doc_key.localeCompare(b.doc_key))[0];
    keep.duplicate_of = '';
    keep.duplicate_kind = '';
    if (keep.status === 'duplicate-of') keep.status = 'extracted';
    for (const copy of members) {
      if (copy === keep) continue;
      copy.duplicate_of = keep.doc_key;
      // Two products whose sheets print the same numbers are usually one sheet served twice. Where the names
      // differ they may instead be two products a maker tests once and sells twice, and that is a reading of the
      // sheet, not a rule: it is queued rather than consolidated, so nothing is dropped in silence.
      if (named(copy.product_raw) === named(keep.product_raw)) {
        copy.duplicate_kind = 'text-twin';
        copy.status = 'duplicate-of';
        copy.status_note = `the same sheet as ${keep.doc_key} (${keep.provider})`;
        twins++;
      } else {
        copy.duplicate_kind = 'same-numbers';
        copy.status = 'twin-check';
        copy.status_note = `prints the same numbers as ${keep.doc_key} (${keep.provider}, "${keep.product_raw}"), under another name: one sheet served twice, or two products tested once?`;
        checks++;
      }
    }
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const counts = new Map();
  for (const r of wanted) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1]).map(([s, n]) => `  ${String(n).padStart(4)}  ${s}`).join('\n'));
  if (twins) console.log(`  ${twins} document(s) are a sheet already read, by the numbers they print`);
  if (checks) console.log(`  ${checks} print the same numbers under another product name, queued as twin-check`);
}
