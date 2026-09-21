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
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const KEEP = ['sha256', 'manufacturer', 'duplicate_of', 'duplicate_kind', 'batch', 'status', 'status_note', 'updated', 'registered_source_id', 'registered_by'];
// A status the workbooks may overwrite: "inventoried" is where a document starts, and a rebuild that finds its
// URL in the source register moves it on. Anything the pipeline wrote is the pipeline's. That includes a
// "registered" the pipeline set itself — by digest, or because the maker's product already has a grade — which
// a workbook that knows nothing about the tables must not reset: it did, once, and put seventy-seven documents
// back into the queue they had just left.
const PROGRESS = ['inventoried'];

export function merge(fresh, existing) {
  const before = new Map(existing.map((r) => [r.doc_key, r]));
  return fresh.map((row) => {
    const was = before.get(row.doc_key);
    if (!was) return row;
    const kept = Object.fromEntries(KEEP.filter((f) => was[f]).map((f) => [f, was[f]]));
    // A document the register has picked up since the last rebuild moves on from "inventoried"; one the pipeline
    // has carried further keeps where it got to. A "registered" the workbook itself set (registered_by "url")
    // may still be refreshed by the workbook.
    if (PROGRESS.includes(was.status) || (was.status === 'registered' && was.registered_by === 'url')) {
      delete kept.status; delete kept.registered_source_id; delete kept.registered_by;
    }
    return { ...row, ...kept };
  });
}

/** How many rows each table holds, so the figures in this report are the database's own and never a memory. */
function databaseCounts() {
  const out = {};
  for (const name of ['materials', 'grades', 'measurements', 'sources', 'profiles', 'profile_notes', 'headlines']) {
    const path = join(projectRoot, 'data/tables', `${name}.csv`);
    out[name] = existsSync(path) ? readCsv(path).records.length : 0;
  }
  return out;
}

/** Every batch that has landed, from its own README: the migration that applied it and the date it names. */
function batchesApplied() {
  const dir = join(AUDIT, 'batches');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).filter((d) => existsSync(join(dir, d, 'README.md'))).sort()) {
    const text = readFileSync(join(dir, name, 'README.md'), 'utf8');
    const applied = /Applied\s+(\d{4}-\d{2}-\d{2})\s+by\s+`([^`]+)`/.exec(text);
    out.push({ batch: name, title: (text.match(/^#\s*(.+)$/m)?.[1] ?? name).replace(/^Batch\s+/i, ''), date: applied?.[1] ?? '', migration: applied?.[2] ?? '' });
  }
  return out;
}

/** The parity table as the last full run recorded it, if there has been one. */
function parityTable() {
  const path = join(AUDIT, 'census/parity.csv');
  if (!existsSync(path)) return [];
  return readCsv(path).records.map((r) => r.values);
}

// A column of numbers reads right-aligned and a column of words reads left-aligned, so the rule is the column's
// own content rather than its position: the third column of a table is as often a list of makers as a count.
const table = (header, rows) => [
  `| ${header.join(' | ')} |`,
  `|${header.map((h, i) => (rows.length && rows.every((r) => /^[\d,. %]*$/.test(String(r[i] ?? ''))) ? '---:' : '---')).join('|')}|`,
  ...rows.map((r) => `| ${r.join(' | ')} |`),
];

function statusReport(rows) {
  const count = (list, by) => { const m = new Map(); for (const r of list) m.set(by(r), (m.get(by(r)) ?? 0) + 1); return m; };
  const byStatus = count(rows, (r) => r.status);
  const held = rows.filter((r) => r.status === 'held');
  const byReason = count(held, (r) => (r.status_note.match(/^held: (\S+)/) ?? [])[1] ?? 'unstated');
  const db = databaseCounts();
  const n = (v) => v.toLocaleString('en-GB');

  const out = ['# Where the import stands', '',
    'Generated by `npm run ingest:inventory -- --status`; nothing here is written by hand, so no figure on this page',
    'can go stale without the command that made it saying so.', '',
    '## The database', '',
    ...table(['Table', 'Rows'], Object.entries(db).map(([k, v]) => [k.replace(/_/g, ' '), n(v)])), '',
    '## The corpus', '', `${n(rows.length)} documents in the ledger.`, '',
    ...table(['Status', 'Documents'], [...byStatus].sort((a, b) => b[1] - a[1]).map(([s, c]) => [s, n(c)])), ''];

  if (held.length) {
    out.push('### Why a document is waiting', '',
      'A held document is one the pipeline has read and not entered. The reason is the ledger\'s, one of a fixed few,',
      'and each says what would free it (`scripts/ingest/batch.mjs`).', '',
      ...table(['Reason', 'Documents', 'Where'],
        [...byReason].sort((a, b) => b[1] - a[1]).map(([reason, c]) => {
          const mine = count(held.filter((r) => r.status_note.startsWith(`held: ${reason}`)), (r) => r.provider);
          return [`\`${reason}\``, n(c), [...mine].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, k]) => `${p} ${k}`).join(', ')];
        })), '');
  }
  // The research inventory, reconciled: what became of every document it listed (the rows the pipeline added later
  // — witnesses, harvested and staged documents — are not the inventory's). Each document ends in one of four
  // places, and the fourth says on whom it waits.
  const later = /^(product page, fetched|a document the maker published|harvested |staged )/;
  const listed = rows.filter((r) => !later.test(r.discovery ?? ''));
  const place = (r) => (r.status === 'applied' ? 'applied'
    : ['duplicate-of', 'registered', 'safety-data-sheet', 'not-a-data-sheet', 'skipped', 'rejected'].includes(r.status) ? 'settled: a copy, a product already recorded, or not a data sheet'
      : r.status === 'deferred' ? 'deferred past V2, the gap named'
        : r.status === 'gated' ? 'open: gated (the owner)'
          : r.status === 'unreachable' ? 'open: unreachable, retried at the Wayback Machine'
            : /^held: ruling/.test(r.status_note ?? '') ? 'open: an identity question for the owner'
              : `open: ${r.status}${/^held: (\S+)/.test(r.status_note ?? '') ? ` (${r.status_note.match(/^held: (\S+)/)[1]})` : ''}`);
  const places = count(listed, place);
  out.push('## The research inventory, reconciled', '',
    `${n(listed.length)} of the ledger's documents came from the research inventory; the rest are witnesses, harvested and`,
    'staged documents the pipeline added. Where each of the inventory\'s ended:', '',
    ...table(['Where', 'Documents'], [...places].sort((a, b) => b[1] - a[1]).map(([k, c]) => [k, n(c)])), '');

  const ready = rows.filter((r) => r.status === 'extracted');
  if (ready.length) {
    const mine = count(ready, (r) => r.provider);
    out.push(`### Read, nothing holding them: ${n(ready.length)}`, '',
      [...mine].sort((a, b) => b[1] - a[1]).map(([p, k]) => `${p} ${k}`).join(', '), '');
  }

  const parity = parityTable();
  if (parity.length) {
    out.push('## The reader', '',
      'Every value somebody transcribed by hand before this programme, read again by the reader and compared. A',
      'maker\'s layout is proved here before any sheet of theirs that nobody has transcribed is proposed.', '',
      ...table(['Maker', 'Sheets', 'Reproduced', 'Parity'],
        parity.map((r) => [r.Provider, r.Sheets, `${r.Found} of ${r.Recorded}`, `${r.Parity}%`])), '',
      '```bash', 'npm run ingest:propose -- --compare --all', '```', '');
  }

  const batches = batchesApplied();
  if (batches.length) {
    out.push('## Batches', '',
      ...table(['Batch', 'What it was', 'Applied'],
        batches.map((b) => [`[${b.batch}](batches/${b.batch}/README.md)`, b.title, b.migration ? `${b.migration}, ${b.date}` : 'not recorded'])), '');
  }

  out.push('## By provider', '',
    ...table(['Provider', 'Documents', ...[...byStatus.keys()].sort()],
      [...count(rows, (r) => r.provider)].sort((a, b) => b[1] - a[1]).map(([provider, total]) => {
        const mine = count(rows.filter((r) => r.provider === provider), (r) => r.status);
        return [provider, n(total), ...[...byStatus.keys()].sort().map((st) => (mine.get(st) ? n(mine.get(st)) : ''))];
      })), '');
  return out.join('\n');
}

if (process.argv[1]?.endsWith('inventory.mjs')) {
  // --status reports; it does not rebuild. A report that rewrote the ledger on the way to printing it was how
  // the inventory came to reset what the pipeline had decided, and a session that only wanted a figure got a
  // changed queue for it.
  if (process.argv.includes('--status')) {
    const rows = readLedger();
    writeFileSync(join(AUDIT, 'STATUS.md'), statusReport(rows));
    console.log(statusReport(rows));
  } else {
    const rows = merge(buildLedger(), readLedger());
    writeFileSync(LEDGER, csvText(HEADER, rows));
    writeFileSync(join(AUDIT, 'STATUS.md'), statusReport(rows));
    const registered = rows.filter((r) => r.registered_source_id).length;
    console.log(`${rows.length} documents -> ${LEDGER.replace(projectRoot + '/', '')}`);
    console.log(`  ${registered} already in the source register, ${rows.length - registered} not`);
  }
}
