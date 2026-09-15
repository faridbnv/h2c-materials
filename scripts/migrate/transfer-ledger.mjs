#!/usr/bin/env node
// Transfer ledger: every cell of the retired workbooks, as Excel stored it (native value, not the
// displayed text), compared with where that fact lives now: its CSV cell, or for a column the migration
// replaced with a calculation, the value the build calculates.
//
// Every cell lands in exactly one class, and every class is counted in ledger-summary.json. Cells whose
// class changes something a reader could notice (a stale cache, a precision loss, a rounded median, a
// reordered list, a canonicalized or cleaned value) are listed one by one in ledger.csv with both values.
// Any "unexplained" cell fails the run.
//
//   node scripts/migrate/transfer-ledger.mjs [output-dir]
//   (default docs/audits/2026-09-14-transfer-verification)

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readWorkbookNative, readReferenceNative } from '../../build/src/legacy/extract-workbook.js';
import { REFERENCE_PROPERTIES } from '../../build/src/reference-properties.js';
import { loadTables, loadReference, snapshotDate, TABLES } from '../../build/src/load.js';
import { compile } from '../../build/src/compile.js';
import { csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { BASE_COMMIT, CONVERSION_END_COMMIT } from './commits.mjs';
import { cleanText } from './text-cleanup.mjs';
import { diffTables } from '../data/diff-lib.mjs';
import { loadSchemas } from '../../build/src/schema.js';

// Data edits after the conversion (source corrections and additions) are not transfer differences. They are
// listed by `npm run data:diff -- <CONVERSION_END_COMMIT>` and classed here by that diff, not one by one.
const editedAfter = new Map();
{
  const { tables: schemas } = loadSchemas(join(projectRoot, 'schema'));
  const read = (side, name) => {
    if (side === 'to') { try { return readFileSync(join(projectRoot, 'data/tables', `${name}.csv`), 'utf8'); } catch { return null; } }
    try { return execFileSync('git', ['show', `${CONVERSION_END_COMMIT}:data/tables/${name}.csv`], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 }); } catch { return null; }
  };
  for (const c of diffTables(schemas, read)) editedAfter.set(`${c.table}\u0000${c.record}\u0000${c.field ?? ''}`, c.action);
}
const EDITED_CLASS = `edited after the conversion (npm run data:diff -- ${CONVERSION_END_COMMIT})`;
const ADDED_CLASS = `added after the conversion (npm run data:diff -- ${CONVERSION_END_COMMIT})`;

const outDir = resolve(process.argv[2] ?? join(projectRoot, 'docs/audits/2026-09-14-transfer-verification'));
const git = (args) => execFileSync('git', args, { cwd: projectRoot, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
const native = readWorkbookNative(git(['show', `${BASE_COMMIT}:data/H2C_FDM_Material_Database.xlsx`]));
const nativeRef = readReferenceNative(git(['show', `${BASE_COMMIT}:data/Generic_Materials_Reference.xlsx`]));
const wb = loadTables(join(projectRoot, 'data'));
const { db } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'ledger' });

const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/;
const MISSING = /^(Not published|Not applicable|Not available in sampled Canadian market|Insufficient comparable data)$/;
const ids = (v) => (v == null ? [] : String(v).split(/[;,]/).map((s) => s.trim()).filter((s) => s && !MISSING.test(s)));
const serialToDate = (n) => new Date(Math.round((n - 25569) * 86400000)).toISOString().slice(0, 10);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameDecimal = (a, b) => Number(Number(a).toPrecision(12)) === Number(Number(b).toPrecision(12));

// Classes that change nothing a reader could notice are counted, not listed: identical values written in
// canonical form, caches that match their formula, and calculations that reproduce the stored value.
const COUNTED_ONLY = /^(equal|display padding removed|date serial written as a date|formula cached text, current|derived(?: or linked)?: .*(equal|same identifiers, same order|same order|same missing state|no per-kg price)\b(?!.*to the cent))/;
const counts = {};
const ledger = [];
function record(sheet, row, id, column, cell, now, cls, note = '') {
  const k = `${sheet}\u0000${cls}`;
  counts[k] = (counts[k] ?? 0) + 1;
  if (!COUNTED_ONLY.test(cls)) {
    ledger.push({ sheet, row, record: id, column, class: cls, workbook: cell == null ? '' : String(cell.v), displayed: cell?.w?.trim() ?? '', now: now == null ? '' : String(now), note });
  }
}

// ------------------------------------------------------------------ kept columns: native cell vs CSV cell

function classifyKept(sheet, column, cell, csv, rowCells) {
  if (!cell) return csv == null ? 'equal' : 'unexplained';
  if (csv == null) return 'unexplained';
  const { v, t, f, w } = cell;
  if (t === 'b') return csv === (v ? 'TRUE' : 'FALSE') ? 'equal' : 'unexplained';
  if (t === 's') {
    const text = String(v).trim();
    if (text === csv) return f ? formulaCache(sheet, column, f, rowCells, text) : 'equal';
    if (column === 'Headline sample' && text === '0' && csv === 'FALSE') return 'boolean made canonical (m01)';
    if (/^\d{4}-\d{2}-\d{2} 00:00:00$/.test(text) && text.slice(0, 10) === csv) return 'date made canonical (m01)';
    if (NUMBER_RE.test(text) && NUMBER_RE.test(csv) && Number(text) === Number(csv)) return 'number stored as text made canonical (m01)';
    if (cleanText(text) === csv) return 'text cleanup (m07)';
    return 'unexplained';
  }
  if (t === 'n') {
    if (/date/i.test(column) && serialToDate(v) === csv) return 'date serial written as a date';
    if (!NUMBER_RE.test(csv)) {
      // A formula whose cached result the build read as text is handled under t 's'; a number here must stay a number.
      return 'unexplained';
    }
    const n = Number(csv);
    if (n === v) return (w ?? '').trim() === csv ? 'equal' : 'display padding removed (m01)';
    // A formula result like 2878.3 x 0.001 = 2.8783000000000003 is the decimal 2.8783: equal at 12 digits.
    if (sameDecimal(n, v)) return 'equal but for floating-point noise in the formula result';
    const shown = Number(String(w ?? '').replace(/[, ]/g, ''));
    if (Number.isFinite(shown) && shown === n) return 'PRECISION LOSS: display rounding';
    return 'unexplained';
  }
  return 'unexplained';
}

// The Properties normalized columns were IF(AND(ISNUMBER(raw), status<>"Unresolved unit / layout"), raw*factor,
// "Not applicable"). Excel did not recalculate after scripted edits, so some caches say what the formula no
// longer would. The build always read the cache, and the CSV keeps what the build read; this says which.
function formulaCache(sheet, column, f, cells, text) {
  const raw = { 'Normalized value': 'Raw numeric', 'Normalized uncertainty ±': 'Raw uncertainty ±', 'Normalized upper bound': 'Raw upper bound' }[column];
  if (sheet !== 'Properties' || !raw) return 'formula cached text, as the build read it';
  const numeric = cells[raw]?.t === 'n' && cells['Data status']?.v !== 'Unresolved unit / layout';
  const expected = numeric ? null : 'Not applicable';
  return expected === text ? 'formula cached text, current' : 'formula cached text, STALE: kept as the build read it';
}

// ------------------------------------------------------------------ replaced columns: native cell vs calculation

const material = new Map(db.materials.map((m) => [m.id, m]));
const price = new Map(db.prices.map((p) => [p.id, p]));
const HEADLINE_COLUMNS = { 'Density kg/m³': 'density', 'Tensile modulus XY GPa': 'tensileModulusXY', 'Tensile strength XY MPa': 'tensileStrengthXY', 'Elongation at break XY %': 'elongationXY', 'HDT 0.45 MPa °C': 'hdt045' };
const LIST_COLUMNS = {
  'Mechanical evidence': (m) => m.headlineEvidence.mechanical, 'Thermal evidence': (m) => m.headlineEvidence.thermal,
  'Price evidence': (m) => m.headline.priceCADkg.priceIds ?? [], GradeIDs: (m) => m.gradeIds,
  'Printing evidence': (m) => m.printingEvidence, 'H2C evidence': (m) => m.identity.h2cEvidence,
  'Use evidence': (m) => m.evidenceIds.use, 'Durability evidence': (m) => m.evidenceIds.durability, 'Safety evidence': (m) => m.evidenceIds.safety,
};

function classifyReplaced(sheet, column, cell, id) {
  const v = cell?.v;
  if (sheet === 'Materials') {
    const m = material.get(id);
    if (HEADLINE_COLUMNS[column]) {
      const h = m.headline[HEADLINE_COLUMNS[column]];
      if (typeof v === 'number') return [h.known && h.value === v ? 'derived: headline read from its measurement, equal' : h.known && sameDecimal(h.value, v) ? 'derived: headline read from its measurement, equal but for floating-point noise' : 'unexplained', h.known ? h.value : h.text];
      return [!h.known && h.text === String(v).trim() ? 'derived: no headline selection, same missing state' : 'unexplained', h.known ? h.value : h.text];
    }
    if (column === 'Price CAD/kg') {
      const h = m.headline.priceCADkg;
      if (typeof v !== 'number') return [!h.known && h.text === String(v).trim() ? 'derived: no price sample, same missing state' : 'unexplained', h.known ? h.value : h.text];
      if (h.known && h.value === v) return ['derived: median of the sample, equal', h.value];
      if (h.known && Math.abs(h.value - v) < 0.005 + 1e-9) return ['derived: median rounded to the cent (m03, listed)', h.value];
      return ['unexplained', h.known ? h.value : h.text];
    }
    if (LIST_COLUMNS[column]) {
      const now = LIST_COLUMNS[column](m);
      return [same(ids(v), now) ? 'derived or linked: same identifiers, same order' : 'unexplained', now.join('; ')];
    }
    if (column === 'Environmental evidence') {
      const now = m.evidenceIds.environmental;
      if (same(ids(v), now)) return ['derived: own environmental records, same order', now.join('; ')];
      return [same([...ids(v)].sort(), [...now].sort()) ? 'derived: own environmental records, table order (m05, listed)' : 'unexplained', now.join('; ')];
    }
    const axis = { 'Nozzle guidance': 'nozzle', 'Bed guidance': 'bed', 'Chamber guidance': 'chamber' }[column];
    if (axis) {
      const text = String(v).trim();
      return [text === m.guidance[axis] ? 'derived: first cited profile, equal' : cleanText(text) === m.guidance[axis] ? 'derived: first cited profile, equal after text cleanup (m07)' : 'unexplained', m.guidance[axis]];
    }
  }
  if (sheet === 'Prices CA' && column === 'Regular CAD/kg') {
    const p = price.get(id);
    if (typeof v === 'number') return [p.regularPerKg != null && Math.abs(p.regularPerKg - v) < 0.005 + 1e-9 ? (p.regularPerKg === v ? 'derived: list price / net mass, equal' : 'derived: list price / net mass to the cent (display showed the same)') : 'unexplained', p.regularPerKg];
    return [p.regularPerKg == null && String(v).trim() === 'Not applicable' ? 'derived: not eligible, no per-kg price' : 'unexplained', p.regularPerKg];
  }
  return ['unexplained: no rule for a replaced column', ''];
}

// ------------------------------------------------------------------ walk every cell

const csvBySheet = Object.fromEntries(TABLES.map(({ sheet }) => [sheet, wb[sheet]]));
const fileOf = Object.fromEntries(TABLES.map(({ file, sheet }) => [sheet, file]));
for (const [sheet, { header, rows }] of Object.entries(native)) {
  const csv = csvBySheet[sheet];
  const key = sheet === 'Method' ? 'Topic' : header[0];
  const csvRows = new Map(csv.rows.map((r) => [r[key], r]));
  const nativeIds = new Set();
  for (const row of rows) {
    const id = String(row.cells[key]?.v ?? '').trim();
    nativeIds.add(id);
    const now = csvRows.get(id);
    if (!now) { record(sheet, row.__row, id, '(row)', null, null, 'unexplained', 'row missing from CSV'); continue; }
    for (const column of header) {
      const cell = row.cells[column];
      if (csv.header.includes(column)) {
        let cls = classifyKept(sheet, column, cell, now[column], row.cells);
        if (cls === 'unexplained' && editedAfter.get(`${fileOf[sheet]}\u0000${id}\u0000${column}`) === 'Edited') cls = EDITED_CLASS;
        record(sheet, row.__row, id, column, cell, now[column], cls);
      } else {
        const [cls, value] = classifyReplaced(sheet, column, cell, id);
        record(sheet, row.__row, id, column, cell, value, cls);
      }
    }
  }
  for (const r of csv.rows) {
    if (nativeIds.has(r[key])) continue;
    const added = editedAfter.get(`${fileOf[sheet]}\u0000${r[key]}\u0000`) === 'Added';
    record(sheet, '', r[key], '(row)', null, 'added', added ? ADDED_CLASS : 'unexplained', added ? '' : 'CSV row not in the workbook');
  }
  for (const column of csv.header.filter((h) => !header.includes(h))) {
    counts[`${sheet}\u0000added column: ${column}`] = csv.rows.length;
  }
}

// Reference envelopes: native min/max numbers vs CSV.
const refCsv = new Map(loadReference(join(projectRoot, 'data')).map((r) => [r.name, r]));
for (const [name, { row, props }] of Object.entries(nativeRef)) {
  const now = refCsv.get(name);
  if (!now) { record('Reference', row, name, '(row)', null, null, 'unexplained', 'row missing from CSV'); continue; }
  for (const p of REFERENCE_PROPERTIES) for (const side of ['min', 'max']) {
    const v = props[p.key][side];
    const csvValue = now.properties[p.key]?.[side] ?? null;
    const cell = v == null ? null : { v, w: props[p.key][`${side}Text`] };
    const cls = v == null ? (csvValue == null ? 'equal' : 'unexplained') : (Number(v) === csvValue ? 'equal' : sameDecimal(v, csvValue) ? 'equal but for floating-point noise in the formula result' : (Number(String(cell.w).replace(/[, ]/g, '')) === csvValue ? 'PRECISION LOSS: display rounding' : 'unexplained'));
    record('Reference', row, name, `${p.key} ${side}`, cell, csvValue, cls);
  }
}

// ------------------------------------------------------------------ write

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'ledger.csv'), csvText(['sheet', 'row', 'record', 'column', 'class', 'workbook', 'displayed', 'now', 'note'], ledger));
const summary = {};
for (const [k, n] of Object.entries(counts)) { const [sheet, cls] = k.split('\u0000'); (summary[sheet] ??= {})[cls] = n; }
const totals = {};
for (const bySheet of Object.values(summary)) for (const [cls, n] of Object.entries(bySheet)) if (!cls.startsWith('added column')) totals[cls] = (totals[cls] ?? 0) + n;
writeFileSync(join(outDir, 'ledger-summary.json'), JSON.stringify({ baseCommit: BASE_COMMIT, cells: Object.values(totals).reduce((a, b) => a + b, 0), totals, bySheet: summary }, null, 2) + '\n');

for (const [cls, n] of Object.entries(totals).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(7)}  ${cls}`);
const bad = ledger.filter((l) => l.class.startsWith('unexplained'));
const loss = ledger.filter((l) => l.class.startsWith('PRECISION LOSS'));
for (const l of [...bad, ...loss].slice(0, 30)) console.log(`  ${l.class}: ${l.sheet} ${l.record} ${l.column}: workbook ${l.workbook} (shown ${l.displayed}) now ${l.now} ${l.note}`);
console.log(`ledger -> ${join(outDir, 'ledger.csv')} (${ledger.length} non-equal cells; ${bad.length} unexplained; ${loss.length} precision losses)`);
if (bad.length) process.exitCode = 1;
