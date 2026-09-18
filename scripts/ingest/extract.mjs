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
  let twins = 0;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (agreement(all[i].print, all[j].print) < 0.9) continue;
      // The manufacturer's copy is the one that stays; between two of a kind, the first by document key.
      const [primary, copy] = all[i].row.provider_kind === 'retailer' && all[j].row.provider_kind !== 'retailer' ? [all[j].row, all[i].row] : [all[i].row, all[j].row];
      if (copy.duplicate_of) continue;
      copy.duplicate_of = primary.doc_key;
      copy.duplicate_kind = 'text-twin';
      copy.status = 'duplicate-of';
      copy.status_note = `prints the same numbers as ${primary.doc_key} (${primary.provider})`;
      twins++;
    }
  }
  writeFileSync(LEDGER, csvText(HEADER, rows));
  const counts = new Map();
  for (const r of wanted) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1]).map(([s, n]) => `  ${String(n).padStart(4)}  ${s}`).join('\n'));
  if (twins) console.log(`  ${twins} twin(s) found by the numbers they print`);
}
