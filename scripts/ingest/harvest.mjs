#!/usr/bin/env node
// A page that lists documents is an index, and the documents it lists are the documents.
//
//   npm run ingest:harvest -- --provider "BASF Forward AM / Ultrafuse"
//   npm run ingest:harvest -- --doc <doc_key>
//   npm run ingest:harvest -- --provider X --dry-run     what it would add, and nothing written
//
// BASF's hub serves a product page whose data sheets are a file browser drawn after the page loads: capture it
// in a browser (ingest:capture) and its text turns out to be a list — "ExtendedTDS_Ultrafuse_ASA_V2.1.pdf,
// 286 KB" — with a download link per entry. Sixteen pages the ledger called unreadable are indexes of about
// thirty data sheets.
//
// So this reads the entries out of a captured page and writes a ledger row per document, keyed by the file the
// index names, with the index recorded as where it was found. Nothing is fetched here: the rows enter as
// `inventoried` and `ingest:fetch` fetches them like any other document, which keeps one path from a URL to
// bytes to a digest. The index itself becomes what it is — a page that lists documents and publishes none.
//
// The entries are read from the page's own markup, not from a guess about the plugin that drew it: an anchor
// that carries a file name in its title and a download identifier in its href is a document the page offers.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { csvText, readCsv } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { cacheDir } from '../lib/pdf-text.mjs';
import { HEADER } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : null; };
const flag = (name) => process.argv.includes(`--${name}`);

/**
 * The documents a captured page offers: every anchor whose title names a file and whose href carries the
 * identifier the page downloads it by. A preview link and a download link of one file share that identifier,
 * so the file is listed once, with the download form of its link.
 */
export function entriesOf(html) {
  const text = String(html).replace(/&amp;/g, '&');
  const byId = new Map();
  for (const m of text.matchAll(/href="([^"]*action=shareonedrive-(?:preview|download)[^"]*)"[^>]*title="([^"]+?\.(?:pdf|PDF))(?:\s*\([^)]*\))?"/g)) {
    const [, href, name] = m;
    const id = /[?&]id=([^&"]+)/.exec(href)?.[1];
    if (!id || byId.has(id)) continue;
    const download = href.includes('shareonedrive-download') ? href
      : `${href.replace('shareonedrive-preview', 'shareonedrive-download')}&dl=1`;
    byId.set(id, { id, name, url: download });
  }
  return [...byId.values()];
}

/** A document key of the same shape the inventory uses for a row it found by its URL. */
const keyFor = (url) => `url:${createHash('sha1').update(url).digest('hex').slice(0, 16)}`;

if (process.argv[1]?.endsWith('harvest.mjs')) {
  const provider = arg('provider'), doc = arg('doc');
  if (!provider && !doc) { console.error('name what to harvest: --provider or --doc'); process.exit(2); }
  const rows = readCsv(LEDGER).records.map((r) => r.values);
  const known = new Set(rows.map((r) => r.url));
  const wanted = rows.filter((r) => (doc ? r.doc_key === doc : r.provider === provider || r.manufacturer === provider)
    && r.access_status === 'captured in a browser' && r.sha256);
  if (!wanted.length) { console.log('nothing captured to harvest from'); process.exit(0); }

  const date = new Date().toISOString().slice(0, 10);
  const added = [];
  let indexes = 0;
  for (const row of wanted) {
    const path = cacheDir('sources/by-sha', `${row.sha256}.html`);
    if (!existsSync(path)) { console.log(`  ?  ${row.product_raw}: no cached capture`); continue; }
    const entries = entriesOf(readFileSync(path, 'utf8'));
    if (!entries.length) continue;
    indexes++;
    for (const e of entries) {
      if (known.has(e.url)) continue;
      known.add(e.url);
      added.push({
        doc_key: keyFor(e.url), sha256: '', provider: row.provider, provider_kind: row.provider_kind,
        brand: row.brand, manufacturer: row.manufacturer,
        // The file the index names is the product's own name for the document, which is more than the page said.
        product_raw: `${row.product_raw} — ${e.name.replace(/\.pdf$/i, '')}`,
        url: e.url, source_page_url: row.url, format: 'PDF', access_status: 'listed by the maker’s file index',
        language: row.language, mechanical_evidence: '', variants: '',
        discovery: `harvested ${date} from ${row.doc_key}, the maker's file index for this product`,
        registered_source_id: '', registered_by: '', duplicate_of: '', duplicate_kind: '', primary: 'TRUE',
        batch: '', status: 'inventoried', status_note: '', checked: date, updated: date,
      });
    }
    row.status = 'not-a-data-sheet';
    row.status_note = `an index, not a sheet: the page lists ${entries.length} document(s) and publishes no value of its own (harvested ${date})`;
    row.updated = date;
  }
  if (!flag('dry-run') && added.length) writeFileSync(LEDGER, csvText(HEADER, [...rows, ...added]));
  console.log(`${indexes} index page(s), ${added.length} document(s) ${flag('dry-run') ? 'would be added' : 'added'}`);
  for (const a of added.slice(0, 40)) console.log(`  ${a.product_raw}`);
  if (added.length > 40) console.log(`  ... and ${added.length - 40} more`);
  if (added.length && !flag('dry-run')) console.log(`next: npm run ingest:fetch -- --provider "${provider ?? added[0].provider}"`);
}
