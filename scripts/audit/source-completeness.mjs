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
// Usage: npm run audit:sources [-- --source <SourceID>] [--offline]
// Writes docs/audits/2026-09-14-transfer-verification/source-completeness.csv and prints a per-source summary.
// Needs network on first run; not part of verify.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';

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
  for (const r of profiles.filter((p) => p.SourceID === sourceId || String(p['H2C SourceID'] ?? '').includes(sourceId))) {
    for (const v of Object.values(r)) for (const m of String(v ?? '').matchAll(/\d+(?:[.,]\d+)?/g)) add(m[0]);
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
  return { bytes };
}

async function pdfLines(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, verbosity: 0 }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    const lines = new Map();
    for (const it of items) { const y = Math.round(it.transform[5]); if (!lines.has(y)) lines.set(y, []); lines.get(y).push([it.transform[4], it.str]); }
    for (const [, parts] of [...lines].sort((a, b) => b[0] - a[0])) {
      const text = parts.sort((a, b) => a[0] - b[0]).map((p) => p[1]).join(' ').replace(/\s+/g, ' ').trim();
      if (text) out.push({ page: n, text });
    }
  }
  return out;
}

// Extraction splits digits ("1 05 °C", "2 433 .4 ± 79.4"); join them before reading numbers.
// A standard's designation ("ISO 75", "GB/T 1633") is not a value; it is taken out first so that joining split
// digits cannot glue it onto the number that follows.
const STANDARD = /\b(?:I\s?S\s?O|ASTM\s?D?|GB\s?\/\s?T|DIN|IEC|UL|D(?=\s?\d{3}))\s?\d+(?:\s?[-–.:/]\s?\d+)*/g;
const joinDigits = (s) => s.replace(STANDARD, ' § ').replace(/(\d) (?=\d)/g, '$1').replace(/(\d) ?\. ?(?=\d)/g, '$1.').replace(/\bO\.(?=\d)/g, '0.');
const UNIT = String.raw`([°˚º]\s?C|℃|MPa|Mpa|MP\s?a|GPa|%|g\s?/\s?cm\s?3|g\s?/\s?cm³|g\s?/\s?cc|kJ\s?/\s?m|J\s?/\s?m|HRM|Shore)`;
// A rate ("10°C/min"), a humidity ("70% RH") or a condition ("at 23°C") is not a result.
const STATEMENT = new RegExp(String.raw`(?<![\d.\-–])(\d+(?:\.\d+)?)(?:\s?±\s?(\d+(?:\.\d+)?))?\s?(?:\(\s?)?${UNIT}(?!\s?\/\s?min|\s?RH|\w)`, 'g');
const CONDITION_BEFORE = /\bat\s?$/i;
const RANGE = /\d\s?[-–~]\s?\d/;

// Label pass: numbers can be printed in any order or without a unit ("ISO 527 MPa 48", "Specific Gravity 1.22"),
// so a property the document names but the source has no row of is listed too, whatever its number looks like.
const LABELS = [
  ['density', /\b(density|specific\s?gravity)\b/i, /^Density$/],
  ['tensile strength', /tensile\s?(strength|stress)|stress\s?at\s?(yield|break)/i, /^Tensile (strength|yield|break)/],
  ['tensile modulus', /(tensile|young'?’?s|elastic)\s?(e-)?modulus|modulus\s?of\s?elasticity/i, /^Tensile modulus$/],
  ['elongation', /elongation|strain\s?at/i, /^(Elongation|Tensile strain)/],
  ['flexural', /flexural|bending/i, /^Flexural/],
  ['impact', /impact|charpy|izod/i, /(Charpy|Izod|Impact)/],
  ['heat deflection', /heat\s?(deflection|distortion)|deflection\s?temp|\bHDT\b/i, /^HDT$/],
  ['vicat', /vicat|vicar/i, /^Vicat/],
  ['glass transition', /glass\s?transition|\bTg\b/i, /^Glass transition/],
  ['melting', /melting\s?(temp|point)|\bTm\b/i, /^Melting temperature$/],
  ['hardness', /hardness|shore\s?[AD]\b/i, /^Hardness$/],
  ['water absorption', /water\s?absorp|moisture\s?absorp/i, /^Water absorption$/],
  ['melt flow', /melt\s?(flow|index|volume)|\bMFR\b|\bMFI\b|\bMVR\b/i, /^Melt (mass|volume)-flow rate$/],
];
const labelFindings = [];

const findings = [];
const summary = [];
for (const source of sources.filter((s) => (!only || s.SourceID === only) && /\.pdf(\?|$)/i.test(s.URL) && measurements.some((m) => m.SourceID === s.SourceID))) {
  const doc = await fetchPdf(source);
  if (doc.error) { summary.push({ source: source.SourceID, status: doc.error, statements: 0, unmatched: 0 }); continue; }
  const known = knownNumbers(source.SourceID);
  let statements = 0, unmatched = 0;
  for (const { page, text } of await pdfLines(doc.bytes)) {
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
  const text = (await pdfLines(doc.bytes)).map((l) => l.text.replace(/(\p{L}) (?=\p{L})/gu, '$1 ')).join('\n');
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
