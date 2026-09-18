#!/usr/bin/env node
// Source completeness: did every number a data sheet publishes reach the tables?
//
// For each source cited by measurements and published as a PDF, the document is fetched into .cache/sources/
// (once), checked against the SHA-256 in sources.csv, and its text read line by line. Every "number unit"
// statement (°C, MPa, GPa, %, g/cm³, kJ/m², J/m, HRM, Shore) is matched against the numbers the tables already
// hold for that source: measurement raw, normalized and uncertainty values, and the print profiles citing it.
// What matches nothing is listed for review: an untranscribed result, or a number that is not a result (a
// chart axis, a print setting, a test condition).
//
// The reading itself is scripts/lib/pdf-text.mjs, which caches a document's text by digest. This run used to
// extract every PDF twice, once for the numbers and once for the labels, and again on the next run; at 156
// documents that was most of the time it took, and the import ahead has ten times as many.
//
// Usage: npm run audit:sources [-- --source <SourceID>] [--offline]
// Writes docs/audits/2026-09-14-transfer-verification/source-completeness.csv and prints a per-source summary.
// Needs network on first run; not part of verify.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { documentText, allLines, joinDigits, statementRe, CONDITION_BEFORE, RANGE, LABELS } from '../lib/pdf-text.mjs';

const args = process.argv.slice(2);
const only = args.includes('--source') ? args[args.indexOf('--source') + 1] : null;
const offline = args.includes('--offline');
const cacheDir = join(projectRoot, '.cache/sources');
const outDir = join(projectRoot, 'docs/audits/2026-09-14-transfer-verification');
mkdirSync(cacheDir, { recursive: true });

const rows = (name) => readCsv(join(projectRoot, 'data/tables', `${name}.csv`)).records.map((r) => r.values);
const sources = rows('sources');
const measurements = rows('measurements');
const profiles = rows('profiles');
const profileNotes = rows('profile_notes');

/** Numbers the tables hold for a source, as they would be printed. */
function knownNumbers(sourceId) {
  const known = new Set();
  const add = (v) => {
    const n = Number(String(v ?? '').replace(',', '.'));
    if (Number.isFinite(n)) for (const x of [n, n * 1000, n / 1000]) known.add(Number(x.toPrecision(6)));
  };
  for (const r of measurements.filter((m) => m.SourceID === sourceId)) {
    for (const f of ['Raw numeric', 'Raw uncertainty ±', 'Raw upper bound', 'Normalized value', 'Normalized uncertainty ±', 'Normalized upper bound', 'Test load MPa']) add(r[f]);
    // Conditions the row records (annealing, test temperature, print settings) are known numbers too.
    for (const f of ['Raw value', 'Standard / load', 'Post-processing', 'Test temperature', 'Moisture condition', 'Specimen / print parameters', 'Notes']) {
      for (const m of String(r[f] ?? '').matchAll(/\d+(?:[.,]\d+)?/g)) add(m[0]);
    }
  }
  const cited = new Set();
  for (const r of profiles.filter((p) => p.SourceID === sourceId || String(p['H2C SourceID'] ?? '').includes(sourceId))) {
    cited.add(r.ProfileID);
    for (const v of Object.values(r)) for (const m of String(v ?? '').matchAll(/\d+(?:[.,]\d+)?/g)) add(m[0]);
  }
  // What a source says about cooling, speed or storage humidity is a profile note since m44 (D69); those numbers
  // are recorded too, and without them the audit reports every one of them as untranscribed.
  for (const r of profileNotes.filter((n) => cited.has(n.ProfileID))) {
    for (const m of String(r.Text ?? '').matchAll(/\d+(?:[.,]\d+)?/g)) add(m[0]);
  }
  return known;
}

async function fetchPdf(source) {
  const path = join(cacheDir, `${source.SourceID}.pdf`);
  if (!existsSync(path)) {
    if (offline) return { error: 'not cached' };
    const res = await fetch(source.URL, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch((e) => ({ ok: false, statusText: e.message }));
    if (!res.ok) return { error: `download failed: ${res.status ?? ''} ${res.statusText}` };
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  }
  const bytes = readFileSync(path);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (/^[0-9a-f]{64}$/.test(source.SHA256) && sha !== source.SHA256) return { error: `document changed: SHA-256 ${sha.slice(0, 12)}, recorded ${source.SHA256.slice(0, 12)}` };
  return { bytes, sha };
}

const STATEMENT = statementRe();

const labelFindings = [];

const findings = [];
const summary = [];
for (const source of sources.filter((s) => (!only || s.SourceID === only) && /\.pdf(\?|$)/i.test(s.URL) && measurements.some((m) => m.SourceID === s.SourceID))) {
  const doc = await fetchPdf(source);
  if (doc.error) { summary.push({ source: source.SourceID, status: doc.error, statements: 0, unmatched: 0 }); continue; }
  const known = knownNumbers(source.SourceID);
  let statements = 0, unmatched = 0;
  const document = await documentText(doc.bytes, { sha: doc.sha });
  for (const { page, text } of allLines(document)) {
    const line = joinDigits(text);
    for (const m of line.matchAll(STATEMENT)) {
      const before = line.slice(Math.max(0, m.index - 3), m.index);
      if (RANGE.test(before + m[1])) continue; // the upper end of a range is a setting, not a result
      if (CONDITION_BEFORE.test(line.slice(0, m.index))) continue;
      statements++;
      const value = Number(m[1]);
      if (known.has(Number(value.toPrecision(6)))) continue;
      unmatched++;
      findings.push({ SourceID: source.SourceID, Page: page, Value: m[1], Uncertainty: m[2] ?? '', Unit: m[3].replace(/\s/g, ''), Line: line.slice(0, 200) });
    }
  }
  const text = allLines(document).map((l) => l.text.replace(/(\p{L}) (?=\p{L})/gu, '$1 ')).join('\n');
  const properties = new Set(measurements.filter((m) => m.SourceID === source.SourceID).map((m) => m.Property));
  for (const [label, inText, property] of LABELS) {
    const squeezed = text.replace(/(?<=\b\p{L}) (?=\p{L}{1,3}\b)/gu, ''); // "T ensile", "Den sity"
    if ((inText.test(text) || inText.test(squeezed)) && ![...properties].some((p) => property.test(p))) {
      const line = text.split('\n').find((l) => inText.test(l)) ?? squeezed.split('\n').find((l) => inText.test(l)) ?? '';
      labelFindings.push({ SourceID: source.SourceID, Label: label, Line: line.slice(0, 160) });
    }
  }
  summary.push({ source: source.SourceID, status: 'read', statements, unmatched });
}

if (!only) {
  writeFileSync(join(outDir, 'source-completeness.csv'), csvText(['SourceID', 'Page', 'Value', 'Uncertainty', 'Unit', 'Line'], findings));
  writeFileSync(join(outDir, 'source-completeness-labels.csv'), csvText(['SourceID', 'Label', 'Line'], labelFindings));
}
if (only) for (const f of labelFindings) console.log(`  label "${f.Label}" named but no row: ${f.Line}`);
for (const s of summary.filter((x) => x.status !== 'read' || x.unmatched)) console.log(`${String(s.unmatched).padStart(4)} of ${String(s.statements).padStart(3)}  ${s.source}${s.status === 'read' ? '' : `  (${s.status})`}`);
if (only) for (const f of findings) console.log(`  p. ${f.Page}  ${f.Value}${f.Uncertainty ? ` ± ${f.Uncertainty}` : ''} ${f.Unit}  | ${f.Line}`);
const read = summary.filter((s) => s.status === 'read');
console.log(`${read.length} documents read, ${summary.length - read.length} not read; ${read.reduce((a, s) => a + s.statements, 0)} statements, ${findings.length} not in the tables; ${labelFindings.length} named properties with no row`);
