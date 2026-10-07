// Quality round 2026-10-07 (items 3, 9, 12 and 14 of its plan; D134), batch b45: five documents admitted through the
// import pipeline.
// - Polymaker's Panchroma CoPE data sheet V5.4, which R-POLYMAKER-COPE-TDS-V5-4 recorded not retrieved (HTTP 404, 2026-09-13):
//   the Internet Archive holds the file (captured 2025-11-04), and it enters as a source of its own, with its tables, for
//   CoPE's one product (M091 held six values). The not-retrieved row stays as it was, and its Access note names the copy.
// - Kimya TPC-ESD's data sheet and DREMC PBT GF's data sheet and product page: second products for two thin materials
//   (TPC-ESD and PBT-GF each held one), found by the round's search (docs/audits/2026-10-07-quality-round/web/thin-leads.csv).
// - purefil GreenTEC's sheet, held for its identity until the owner's ruling R179: a product of PLA blend (M168), whose
//   table is Extrudr GreenTEC's, so it shares that sheet's formulation key (D119).
// A Claude Sonnet reader transcribed the documents (ingest/b45-readings.json); Claude Opus reviewed every row
// (ingest/build-b45.mjs: an Izod row named for its method, two slips of a unit or a standard, a 0 % strain at break flagged,
// a block of test-bar settings kept out of the profiles). The packet pins every proposal and original by digest and lists
// what is not admitted (a DREMC support page whose settings contradict its product, Tullomer, whose documents name no
// polymer, and documents fetched again that are earlier editions or products the catalogue does not hold).
//
// The maker "DREMC" is added to schema/vocab/manufacturers.csv (the packet's NewVocabulary); the rehearsal sees it, and a
// re-run adds nothing. Safe to run after other migrations: it pins a product by its identity, takes every identifier from
// nextId, and expects nothing of rows it did not write.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv, csvText } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm406-batch-b45-quality-round', date = '2026-10-07';
const at = join(projectRoot, 'docs/audits/2026-10-07-quality-round');
const PACKET_SHA256 = 'c03b7da8033aed528c67dd60f244e9a7306f130ff78fe17c88c0244b07e91c74';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'ingest/b45-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

process.env.H2C_INGEST_ROOT = join(at, 'ingest'); process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../ingest/apply.mjs');
const { locate } = await import('../data/source-store.mjs');

/** The vocabulary values the packet names, added in a tree (the checkout, or a rehearsal copy). */
function addVocabulary(root) {
  let added = 0;
  for (const name of new Set(p.NewVocabulary.map((v) => v.Vocabulary))) {
    const file = join(root, `schema/vocab/${name}.csv`);
    const { header, records } = readCsv(file);
    const rows = records.map((r) => r.values);
    const before = rows.length;
    for (const v of p.NewVocabulary.filter((x) => x.Vocabulary === name)) {
      if (rows.some((r) => r.Value === v.Value)) continue;
      const row = Object.fromEntries(header.map((h) => [h, h === 'Value' ? v.Value : h === 'Meaning' ? v.Meaning : v[h] ?? '']));
      const i = rows.findIndex((r) => r.Value.localeCompare(v.Value, 'en', { sensitivity: 'base' }) > 0);
      rows.splice(i < 0 ? rows.length : i, 0, row);
    }
    if (rows.length !== before) { writeFileSync(file, csvText(header, rows)); added += rows.length - before; }
  }
  return added;
}

const proposals = proposalsOf('b45');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
const original = openTables();
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'ingest/proposals/b45', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: original of ${d.Source.SourceID} is ${o.bytes}; restore it (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
  for (const g of d.Grades.filter((x) => x.GradeID)) {
    const now = original.get('grades', g.GradeID);
    if (!now || now.Manufacturer !== g.Manufacturer || now['Product name'] !== g['Product name']) throw Error(`${migration}: grade ${g.GradeID} is no longer ${g.Manufacturer} ${g['Product name']}`);
  }
}
// The proposals carry an existing grade's row of the day they were read; the guard reads the grade as it stands.
for (const proposal of proposals) for (const g of proposal.grades) if (g.row.GradeID) g.row = { ...original.get('grades', g.row.GradeID) };

/** The not-retrieved CoPE row names the copy that entered (its digest and SourceID never change). */
const COPE_MISSING = 'R-POLYMAKER-COPE-TDS-V5-4';
function copeNote(t) {
  const copy = p.Documents.find((d) => d.Source.URL.endsWith('Panchroma-CoPE_TDS_EN_V5.4.pdf'))?.Source.SourceID;
  const row = t.get('sources', COPE_MISSING);
  const add = ` The same file (V5.4) entered on ${date} as ${copy}, from the Internet Archive's capture of this address (${migration}).`;
  if (!copy || row['Access note'].includes(copy)) return 0;
  t.set('sources', COPE_MISSING, 'Access note', `${row['Access note']}${add}`, { expect: row['Access note'], migration });
  return 1;
}

// Rehearse on a copy of the tables: the schema gate, the lint (no new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b45-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const vocab = addVocabulary(dir);
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), noted = copeNote(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f))); if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { vocab, log, noted };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const vocab = addVocabulary(projectRoot);
const t = openTables(), log = writeBatch(t, proposals, { migration, date }), noted = copeNote(t), applied = markApplied(proposals, t);
if (log.length || noted || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, vocab, log, noted, applied, written: log.length + noted }, null, 2));
