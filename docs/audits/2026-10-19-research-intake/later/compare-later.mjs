#!/usr/bin/env node
// The research intake, stage 8: the research package's later copies of registered sheets (relation "later-copy-of", 97
// documents the research agent fetched again on 2026-10-19 whose bytes differ from the registered ones). They are not
// registered (D131: a later copy checks a held record; it is not a new source unless it prints something new that
// decides). Each copy's bytes are hash-checked, kept in the document cache (.cache/later-copies/) and read into its text
// cache; then every live record that cites the registered sheet is looked for on the copy, as the quality round did
// (2026-10-07-quality-round/later/compare-later.mjs): a measurement is confirmed when its raw number is on a line of the
// copy with a word of its property or label, or on any line; a profile cell when each of its numbers is (a cell in words
// when its first word is on a line with the field's own word). An image-only copy is read in its optical text (ingest:ocr-pass
// run on it first). What is not confirmed is listed for a reader.
//
//   node docs/audits/2026-10-19-research-intake/later/compare-later.mjs   writes later/compare.csv and later/summary.md
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../../../build/src/csv.js';
import { documentText, sha256, cacheDir } from '../../../../scripts/lib/pdf-text.mjs';
import { ocrSidecar } from '../../../../scripts/ingest/read-common.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const PACKAGE = '/Users/farid/Documents/H2C-v2.1-Review-2026-09-27/filament-atlas-research/output';
const rows = (p) => readCsv(p).records.map((r) => r.values);
const docs = rows(join(PACKAGE, 'documents.csv')).filter((d) => /^later-copy-of /.test(d.relation));
const sources = new Map(rows(join(ROOT, 'data/tables/sources.csv')).map((s) => [s.SourceID, s]));
const meas = rows(join(ROOT, 'data/tables/measurements.csv')).filter((m) => !/^Retired/.test(m['Data status']));
const profs = rows(join(ROOT, 'data/tables/profiles.csv')).filter((p) => !/Retired/.test(p.Profile ?? ''));
const nums = (s) => [...String(s ?? '').replace(/(\d)\s*[-–~]\s*(\d)/g, '$1 $2').replace(/(\d),(\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2').matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
const word = (label) => String(label ?? '').toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3).slice(0, 4);

const store = cacheDir('later-copies');
mkdirSync(store, { recursive: true });
const out = [], copies = [];
for (const d of docs) {
  const of = d.relation.replace(/^later-copy-of /, '').trim();
  const src = sources.get(of);
  const bytes = readFileSync(join(PACKAGE, d.file));
  if (sha256(bytes) !== d.sha256) throw new Error(`${d.doc_id}: the file does not hash to ${d.sha256}`);
  if (!existsSync(join(store, d.sha256))) copyFileSync(join(PACKAGE, d.file), join(store, d.sha256));
  const same = src?.SHA256 === d.sha256;
  copies.push({ doc: d.doc_id, of, sha256: d.sha256, url: d.url, accessed: d.accessed, registered: src ? 'yes' : 'no', sameBytes: same ? 'yes' : 'no' });
  if (!src || same) continue;
  const text = await documentText(bytes, { sha: d.sha256 });
  // An image-only copy is read in its optical text (npm run ingest:ocr-pass, kept beside the text layer).
  const ocr = ocrSidecar(d.sha256);
  const lines = [...text.pages.flatMap((p) => p.lines.map((l) => l.text)), ...(ocr ? [...ocr.values()].flat() : [])];
  const lineNums = lines.map((l) => [l, nums(l)]);
  const has = (n, words) => lineNums.some(([l, ns]) => ns.includes(n) && (!words.length || words.some((w) => l.toLowerCase().includes(w))));
  for (const m of meas.filter((x) => x.SourceID === of)) {
    const n = Number(m['Raw numeric']);
    const ok = Number.isFinite(n) && (has(n, word(m.Property)) || has(n, word(m.Locator)) || has(n, []));
    out.push({ SourceID: of, Record: m.MeasurementID, Table: 'measurements', Field: m.Property, Held: m['Raw value'], status: ok ? 'confirmed' : 'unconfirmed', copy: d.sha256, doc: d.doc_id });
  }
  for (const p of profs.filter((x) => x.SourceID === of)) {
    for (const f of ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Drying']) {
      const cell = p[f];
      if (!cell || /^Not /.test(cell)) continue;
      const ns = nums(cell);
      const fieldWord = { 'Nozzle °C': 'nozzle', 'Bed °C': 'bed', 'Chamber °C': 'chamber', Drying: 'dry' }[f];
      const ok = ns.length ? ns.every((n) => has(n, [])) : lines.some((l) => l.toLowerCase().includes(cell.toLowerCase().split(/[^a-z]+/)[0]) && (l.toLowerCase().includes(fieldWord) || /enclos/i.test(l)));
      out.push({ SourceID: of, Record: p.ProfileID, Table: 'profiles', Field: f, Held: cell, status: ok ? 'confirmed' : 'unconfirmed', copy: d.sha256, doc: d.doc_id });
    }
  }
}
writeFileSync(join(HERE, 'copies.csv'), csvText(['doc', 'of', 'sha256', 'url', 'accessed', 'registered', 'sameBytes'], copies));
writeFileSync(join(HERE, 'compare.csv'), csvText(['SourceID', 'Record', 'Table', 'Field', 'Held', 'status', 'copy', 'doc'], out));
const count = (f) => out.filter(f).length;
const unconfirmedSources = [...new Set(out.filter((r) => r.status === 'unconfirmed').map((r) => r.SourceID))];
const summary = { copies: copies.length, compared: copies.filter((c) => c.registered === 'yes' && c.sameBytes === 'no').length, records: out.length, confirmed: count((r) => r.status === 'confirmed'), unconfirmed: count((r) => r.status === 'unconfirmed'), unconfirmedSources: unconfirmedSources.length };
console.log(JSON.stringify(summary));
