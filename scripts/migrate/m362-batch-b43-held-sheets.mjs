// Gap round 2 (GOALS, "Decided on 2026-10-05, gap round 2", item 4), batch b43: the held data sheets the import's text reader
// could not read, now read page by page from their page images (a table per layer height, a column per print orientation,
// Japanese and Spanish labels, a mis-mapped text layer, four products in one table) and admitted through the import
// pipeline (a bounded exception to the import pause, like b34 to b42). Ten documents for twelve new products; three held
// sheets are not admitted (the packet's NotAdmitted: Stratasys ST-130 and Diran 410MF07 wait on the owner for a home,
// and FKuR's Fibrolon sheet names no filament). The packet pins every proposal and original by digest.
//
// Vocabulary values are added by this migration (the packet's NewVocabulary): the maker "Smart Materials 3D"
// (manufacturers.csv) for the Smartfil FLEX 77A grade, and the test standards the sheets print that standards.csv lacks; the
// rehearsal sees them, and a re-run adds nothing.
//
// Safe to run after other migrations: it takes the materials the packet names from the tables as they stand, takes every
// identifier from nextId, and expects nothing of rows it did not write.
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

const migration = 'm362-batch-b43-held-sheets', date = '2026-10-05';
const at = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2');
const PACKET_SHA256 = '62ae6e7aef286924352e81570e7d9eb276ee8c5e44e7f307e49fc883e39897d2';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'ingest/b43-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

// The proposals folder is this audit's; the ledger stays the V2 import's (markApplied says these documents applied).
process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../ingest/apply.mjs');
const { locate } = await import('../data/source-store.mjs');

/** The vocabulary values the packet names (a maker, test standards the sheets print), added in a tree (the checkout, or a rehearsal copy). */
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
      const at = rows.findIndex((r) => r.Value.localeCompare(v.Value, 'en', { sensitivity: 'base' }) > 0);
      rows.splice(at < 0 ? rows.length : at, 0, row);
    }
    if (rows.length !== before) { writeFileSync(file, csvText(header, rows)); added += rows.length - before; }
  }
  return added;
}

const proposals = proposalsOf('b43');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
const original = openTables();
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'ingest/proposals/b43', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: original of ${d.Source.SourceID} is ${o.bytes}; restore it (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
  for (const g of d.NewGrades) if (!original.get('materials', g.MaterialID)) throw Error(`${migration}: ${g.MaterialID} is no longer a material`);
}
// A guard that reads the vocabulary sees the new maker: a rehearsal copy carries it, the checkout gets it when written.
const problems = guard(proposals, worldOf());
if (problems.length) throw Error(JSON.stringify(problems, null, 1));

/** A live "Print setup" or measurement Gap beside records that now exist is untrue (COVERAGE-UNTRUE): superseded, never edited (D72, the m141 pattern). */
function coverage(t) {
  const records = [];
  const materials = new Map();
  for (const d of p.Documents) for (const g of d.NewGrades) {
    const grade = t.rows('grades').find((x) => x.Manufacturer === g.Manufacturer && x['Product name'] === g['Product name']);
    if (!grade) continue;
    materials.set(grade.MaterialID, [...(materials.get(grade.MaterialID) ?? []), d.Source.SourceID]);
  }
  const wants = p.Documents.some((d) => d.Profiles > 0);
  if (!wants) return records;
  for (const old of t.rows('coverage').filter((c) => materials.has(c.MaterialID) && c.Domain === 'Print setup' && c.Status === 'Gap')) {
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: old.MaterialID, GradeID: old.GradeID, Domain: 'Print setup', Status: 'Evidence recorded', 'Manufacturer count': 'Not applicable',
      Finding: `Print settings published by a maker's own data sheet (${materials.get(old.MaterialID).join(', ')}): ${migration}, ${date}.` });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    records.push({ id, supersedes: old.CoverageID });
  }
  return records;
}

// Rehearse on a copy of the tables: the schema gate, the lint (no new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b43-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  addVocabulary(dir);
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), judgments = coverage(t); t.save();
  if (process.env.B43_DEBUG) console.error(log.filter((l) => l.startsWith('accepted') || /^measurement V01457[5-9]|^measurement V01458[0-3]/.test(l)).join('\n'));
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues, null, 1));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f))); if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { log: log.length, accepted: log.filter((l) => l.startsWith('accepted')), grades: log.filter((l) => l.startsWith('grade ')), values: log.filter((l) => l.startsWith('measurement ')).length, profiles: log.filter((l) => l.startsWith('profile ')).length, judgments };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

addVocabulary(projectRoot);
const t = openTables(), log = writeBatch(t, proposals, { migration, date }), judgments = coverage(t), applied = markApplied(proposals, t);
if (log.length || judgments.length || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, log, judgments, applied, written: log.length + judgments.length }, null, 2));
