// Reader round (GOALS, "Decided on 2026-10-04", item 2): makers' own pages and guides for materials with two sources or
// fewer, admitted through the import pipeline as batch b41 (a bounded exception to the import pause, like b34 to b40).
// Ten documents for ten existing products: seven archived 3DXTECH and Flashforge product pages and two Fillamentum
// print guides, for the print settings they print (nozzle, bed, chamber or enclosure, drying, nozzle hardness) that the
// registered sheets do not, or print differently (a differing statement is a second profile from its own source,
// never an overwrite). No measurement enters. The packet pins every proposal, original and expected grade by digest.
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

const migration = 'm340-batch-b41-maker-pages', date = '2026-10-04';
const at = join(projectRoot, 'docs/audits/2026-10-04-reader-round');
const PACKET_SHA256 = 'ec66322462d46b58d77b386962c05eb5759a07c6e5025a6b1b70fe92a87101de';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'ingest/b41-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes), agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);

process.env.H2C_INGEST_ROOT = join(at, 'ingest'); process.env.H2C_PROPOSALS = join(at, 'ingest/proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../ingest/apply.mjs');
const { locate } = await import('../data/source-store.mjs');
const proposals = proposalsOf('b41');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);

const original = openTables();
for (const g of p.ExpectedGrades) if (!agrees(original.get('grades', g.GradeID), g)) throw Error(`${migration}: grade ${g.GradeID} moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'ingest/proposals/b41', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: original of ${d.Source.SourceID} is ${o.bytes}; restore it (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
  const s = original.find('sources', d.Source.SourceID);
  if (s && !agrees(s, d.Source)) throw Error(`${migration}: applied source ${d.Source.SourceID} moved`);
  if (s) for (const f of d.ProposedProfiles) {
    const row = original.rows('profiles').find((r) => r.SourceID === f.row.SourceID && r.Locator === f.row.Locator);
    if (!agrees(row, f.row)) throw Error(`${migration}: previously admitted profile moved`);
  }
}
const problems = guard(proposals, worldOf());
if (problems.length) throw Error(JSON.stringify(problems, null, 1));

/** A live "Print setup" Gap beside settings that now exist is superseded, never edited (D72, the m141 pattern). */
function coverage(t) {
  const records = [];
  for (const old of p.ExpectedCoverage) {
    const current = t.get('coverage', old.CoverageID);
    if (current.Status === 'Superseded') continue;
    if (!agrees(current, old)) throw Error(`${migration}: coverage ${old.CoverageID} moved`);
    const doc = p.Documents.find((d) => d.Source['Applicable grades'] && t.get('grades', d.Source['Applicable grades']).MaterialID === old.MaterialID);
    const id = t.nextId('coverage');
    t.append('coverage', { CoverageID: id, MaterialID: old.MaterialID, GradeID: old.GradeID, Domain: 'Print setup', Status: 'Evidence recorded', 'Manufacturer count': 'Not applicable',
      Finding: `Print settings published by the maker's own product page (${doc.Source.SourceID}, ${doc.Source.Revision}): nozzle, bed, chamber and drying statements (${migration}, ${date}).` });
    t.set('coverage', old.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${old.Status}"): ${old.Finding}`, { expect: old.Finding });
    t.set('coverage', old.CoverageID, 'Status', 'Superseded', { expect: old.Status });
    records.push({ id, supersedes: old.CoverageID });
  }
  return records;
}

// Rehearse on a copy of the tables: the schema gate, the lint (no new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b41-rehearse-'));
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
