// Reader round (GOALS, "Decided on 2026-10-04", item 2), the second maker-page batch b42: the makers' own pages and
// guides for products still missing a nozzle or bed temperature after the re-read, admitted through the import pipeline
// (a bounded exception to the import pause, like b34 to b41). Forty-six documents for forty-one existing products:
// FormFutura "General printing guidelines" pages (live, or the Internet Archive's capture where the page is gone),
// iSANMATE, 3DXTECH (Triton3D and the ESD-Flex archive), NinjaTek, BigRep, Fillamentum, SIDDAMENT and Spectrum product
// pages, and LEHVOSS's own current datasheet. Each enters for the print settings it prints (nozzle, bed, enclosure or
// chamber, drying, nozzle hardness, with the layer height, speed, cooling and retraction as notes) that the registered
// sheets leave unpublished; a differing statement is a second profile from its own source, never an overwrite. No
// measurement enters. The packet pins every proposal and original by digest.
//
// Safe to run after other migrations: it pins a product by its identity (grade, maker and product name), takes the grade's
// material from the tables as they stand, takes every identifier from nextId, and expects nothing of rows it did not write.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm352-batch-b42-maker-pages', date = '2026-10-04';
const at = join(projectRoot, 'docs/audits/2026-10-04-reader-round');
const PACKET_SHA256 = '55eba7e3157fdd97ad5974f87a62a2cd5ee4296b338f070b5a96ea85264df1aa';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'ingest/b42-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes), agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);

process.env.H2C_INGEST_ROOT = join(at, 'ingest'); process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../ingest/apply.mjs');
const { locate } = await import('../data/source-store.mjs');
const proposals = proposalsOf('b42');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);

const original = openTables();
// A product is known by its grade, maker and name; its material is whatever the tables say now (a product may have moved).
for (const g of p.ExpectedGrades) {
  const now = original.get('grades', g.GradeID);
  if (!now || now.Manufacturer !== g.Manufacturer || now['Product name'] !== g['Product name']) throw Error(`${migration}: grade ${g.GradeID} is no longer ${g.Manufacturer} ${g['Product name']}`);
}
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'ingest/proposals/b42', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: original of ${d.Source.SourceID} is ${o.bytes}; restore it (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
  const s = original.find('sources', d.Source.SourceID);
  if (s && !agrees(s, d.Source)) throw Error(`${migration}: applied source ${d.Source.SourceID} moved`);
  if (s) for (const f of d.ProposedProfiles) {
    const row = original.rows('profiles').find((r) => r.SourceID === f.row.SourceID && r.Locator === f.row.Locator);
    const { MaterialID: _m, ...raw } = f.row;
    if (!agrees(row, raw)) throw Error(`${migration}: previously admitted profile moved`);
  }
}
// The proposals carry the grade rows of the day they were read; the guard reads the grade as it stands.
for (const proposal of proposals) for (const g of proposal.grades) g.row = { ...original.get('grades', g.row.GradeID) };
const problems = guard(proposals, worldOf());
if (problems.length) throw Error(JSON.stringify(problems, null, 1));

/** A live "Print setup" Gap beside print settings that now exist is untrue (COVERAGE-UNTRUE): superseded, never edited (D72, the m141 pattern). */
function coverage(t) {
  const records = [];
  const materials = new Map();
  for (const d of p.Documents) {
    const m = t.get('grades', d.Source['Applicable grades']).MaterialID;
    materials.set(m, [...(materials.get(m) ?? []), d.Source.SourceID]);
  }
  for (const old of t.rows('coverage').filter((c) => materials.has(c.MaterialID) && c.Domain === 'Print setup' && c.Status === 'Gap')) {
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: old.MaterialID, GradeID: old.GradeID, Domain: 'Print setup', Status: 'Evidence recorded', 'Manufacturer count': 'Not applicable',
      Finding: `Print settings published by the makers' own product pages (${materials.get(old.MaterialID).join(', ')}): nozzle, bed, chamber and drying statements (${migration}, ${date}).` });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    records.push({ id, supersedes: old.CoverageID });
  }
  return records;
}

// Rehearse on a copy of the tables: the schema gate, the lint (no new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b42-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), judgments = coverage(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f))); if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { log, judgments };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const t = openTables(), log = writeBatch(t, proposals, { migration, date }), judgments = coverage(t), applied = markApplied(proposals, t);
if (log.length || judgments.length || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, log, judgments, applied, written: log.length + judgments.length }, null, 2));
