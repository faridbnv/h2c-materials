#!/usr/bin/env node
// The import ledger: one row per document in the research inventory, and what has happened to it.
//
// The owner's research (docs/audits/2026-09-18-v2-import/research/) lists the public filament data sheets of 43
// providers, as two sheets: a preferred link per provider, brand and named grade, and the language and revision
// variants behind them. This turns both into one CSV the pipeline can drive and a person can read, reconciled
// against the source register so a document already in sources.csv is known to be.
//
// The ledger is the programme's memory. Re-running never loses a row's status: a document that has been fetched,
// proposed or applied keeps that, and only what the workbooks say about it is refreshed.
//
//   npm run ingest:inventory                 rebuild the ledger from the workbooks, keeping every status
//   npm run ingest:inventory -- --status     print where the programme stands, by provider and by status
//
// Writes docs/audits/2026-09-18-v2-import/ledger.csv (committed) and STATUS.md beside it.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';

const XLSX = createRequire(import.meta.url)('xlsx');
const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');
const LEDGER = join(AUDIT, 'ledger.csv');
const INVENTORY = join(AUDIT, 'research/H2C-Filament-TDS-Inventory.xlsx');

export const HEADER = ['doc_key', 'sha256', 'provider', 'provider_kind', 'brand', 'manufacturer', 'product_raw',
  'url', 'source_page_url', 'format', 'access_status', 'language', 'mechanical_evidence', 'variants', 'discovery',
  'registered_source_id', 'registered_by', 'duplicate_of', 'duplicate_kind', 'primary', 'batch', 'status',
  'status_note', 'checked', 'updated'];

/** A sheet as objects, finding the header row by a column the sheet must have. */
function sheetRows(book, name, marker) {
  const grid = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false, defval: '' });
  const at = grid.findIndex((row) => row.includes(marker));
  if (at < 0) throw new Error(`${name}: no header row containing "${marker}"`);
  const header = grid[at].map((h) => String(h).trim());
  return grid.slice(at + 1).filter((row) => row.some((c) => String(c).trim()))
    .map((row) => Object.fromEntries(header.map((h, i) => [h, String(row[i] ?? '').trim()])));
}

const keyOf = (row) => row['Document identifier'] || `url:${createHash('sha1').update(row['Full TDS URL'] ?? '').digest('hex').slice(0, 16)}`;

/** The manufacturers vocabulary, by every spelling that means a value. */
function manufacturerIndex() {
  const path = join(projectRoot, 'schema/vocab/manufacturers.csv');
  const key = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '');
  const index = new Map();
  for (const { values } of readCsv(path).records) {
    index.set(key(values.Value), values.Value);
    for (const alias of String(values.Aliases ?? '').split(';').map((a) => a.trim()).filter(Boolean)) index.set(key(alias), values.Value);
  }
  return (...names) => {
    for (const name of names) {
      const hit = index.get(key(name));
      if (hit) return hit;
      // "Polymaker / Fiberon", "Essentium / Nexa3D": the inventory writes a provider as a pair.
      for (const part of String(name ?? '').split(/[/,]/)) { const p = index.get(key(part)); if (p) return p; }
    }
    return '';
  };
}

/** What the source register already holds, by document digest prefix and by URL. */
function registered() {
  const byDigest = new Map(), byUrl = new Map();
  for (const { values } of readCsv(join(projectRoot, 'data/tables/sources.csv')).records) {
    if (/^[0-9a-f]{64}$/.test(values.SHA256)) byDigest.set(values.SHA256.slice(0, 16), values);
    byUrl.set(values.URL, values);
  }
  return { byDigest, byUrl };
}

export function buildLedger() {
  if (!existsSync(INVENTORY)) throw new Error(`no inventory workbook at ${INVENTORY}`);
  const book = XLSX.readFile(INVENTORY);
  const providers = sheetRows(book, 'Providers', 'Entity');
  const main = sheetRows(book, 'Filament TDS', 'Provider / publishing site');
  const links = sheetRows(book, 'Document links', 'Provider / publishing site');
  const kindOf = new Map(providers.map((p) => [p.Entity, /retail/i.test(p.Type) ? 'retailer' : 'manufacturer']));
  const canonical = manufacturerIndex();
  const { byDigest, byUrl } = registered();

  const rows = new Map();
  for (const [sheet, list] of [['main', main], ['links', links]]) {
    for (const r of list) {
      const key = keyOf(r);
      const url = r['Full TDS URL'] ?? '';
      const source = byUrl.get(url) ?? byDigest.get(r['Document identifier'] ?? '');
      const row = {
        doc_key: key,
        sha256: /^[0-9a-f]{64}$/.test(source?.SHA256 ?? '') ? source.SHA256 : '',
        provider: r['Provider / publishing site'] ?? '',
        provider_kind: kindOf.get(r['Provider / publishing site'] ?? '') ?? 'manufacturer',
        brand: r.Brand ?? '',
        manufacturer: canonical(r.Brand, r['Provider / publishing site']),
        product_raw: r['Filament / grade'] ?? '',
        url,
        source_page_url: r['Full source-page URL'] ?? '',
        format: r['Document format'] ?? '',
        access_status: r['Access status'] ?? '',
        language: r.Language ?? '',
        mechanical_evidence: r['Mechanical evidence'] ?? '',
        variants: r['Other variants'] ?? '',
        discovery: r['Discovery source'] ?? '',
        registered_source_id: source?.SourceID ?? '',
        registered_by: source ? (byUrl.has(url) ? 'url' : 'sha') : '',
        duplicate_of: '', duplicate_kind: '', primary: sheet === 'main' ? 'TRUE' : 'FALSE',
        batch: '', status: source ? 'registered' : 'inventoried', status_note: '',
        checked: r.Checked ?? '', updated: '',
      };
      // The same document can appear on both sheets and under several providers; the main sheet's row wins, and a
      // retailer's copy never displaces a manufacturer's.
      const seen = rows.get(key);
      if (!seen) { rows.set(key, row); continue; }
      const better = (a, b) => (a.primary === 'TRUE' && b.primary !== 'TRUE') || (a.provider_kind === 'manufacturer' && b.provider_kind === 'retailer');
      if (better(row, seen)) rows.set(key, { ...row, primary: seen.primary === 'TRUE' ? 'TRUE' : row.primary });
      else if (row.provider !== seen.provider) seen.status_note = `also listed by ${[...new Set([...(seen.status_note.match(/also listed by (.+)/)?.[1]?.split('; ') ?? []), row.provider])].join('; ')}`;
    }
  }
  return [...rows.values()].sort((a, b) => a.provider.localeCompare(b.provider) || a.product_raw.localeCompare(b.product_raw) || a.doc_key.localeCompare(b.doc_key));
}

/** The ledger as it stands, so a rebuild never loses what happened to a document. */
export const readLedger = () => (existsSync(LEDGER) ? readCsv(LEDGER).records.map((r) => r.values) : []);

const KEEP = ['sha256', 'manufacturer', 'duplicate_of', 'duplicate_kind', 'batch', 'status', 'status_note', 'updated'];
const PROGRESS = ['inventoried', 'registered'];   // a status the workbooks may overwrite; anything later is ours

export function merge(fresh, existing) {
  const before = new Map(existing.map((r) => [r.doc_key, r]));
  return fresh.map((row) => {
    const was = before.get(row.doc_key);
    if (!was) return row;
    const kept = Object.fromEntries(KEEP.filter((f) => was[f]).map((f) => [f, was[f]]));
    // A document the register has picked up since the last rebuild moves on from "inventoried"; one the pipeline
    // has carried further keeps where it got to.
    if (PROGRESS.includes(was.status)) delete kept.status;
    return { ...row, ...kept };
  });
}

function statusReport(rows) {
  const byStatus = new Map(), byProvider = new Map();
  for (const r of rows) {
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    if (!byProvider.has(r.provider)) byProvider.set(r.provider, new Map());
    const p = byProvider.get(r.provider);
    p.set(r.status, (p.get(r.status) ?? 0) + 1);
  }
  const statuses = [...byStatus.keys()].sort();
  const lines = ['# Version 2 import: where it stands', '',
    `Generated by \`npm run ingest:inventory -- --status\`. ${rows.length} documents.`, '',
    `| Provider | Documents | ${statuses.join(' | ')} |`, `|---|---:|${statuses.map(() => '---:|').join('')}`];
  for (const [provider, counts] of [...byProvider].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))) {
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    lines.push(`| ${provider} | ${total} | ${statuses.map((s) => counts.get(s) ?? '').join(' | ')} |`);
  }
  lines.push('', `| Status | Documents |`, '|---|---:|', ...statuses.map((s) => `| ${s} | ${byStatus.get(s)} |`), '');
  return lines.join('\n');
}

if (process.argv[1]?.endsWith('inventory.mjs')) {
  const rows = merge(buildLedger(), readLedger());
  writeFileSync(LEDGER, csvText(HEADER, rows));
  writeFileSync(join(AUDIT, 'STATUS.md'), statusReport(rows));
  const registered = rows.filter((r) => r.registered_source_id).length;
  console.log(`${rows.length} documents -> ${LEDGER.replace(projectRoot + '/', '')}`);
  console.log(`  ${registered} already in the source register, ${rows.length - registered} not`);
  if (process.argv.includes('--status')) console.log(`\n${statusReport(rows)}`);
}
