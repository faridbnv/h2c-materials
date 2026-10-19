#!/usr/bin/env node
// Migration m442 (2026-10-18), batch b46: FormFutura CarbonFil's data sheet of 23-8-2024, admitted through the import
// pipeline (the screening review's change C14, finding F26; D149). Read on its page image by Claude Opus 5.5
// (docs/audits/2026-10-18-screening-build/ingest/build-b46.mjs, which writes the proposal and the packet this pins).
//
// The sheet was fetched by the V2 import on 2026-09-17 (3DJake's copy) and registered under S-PET-TDS-CarbonFil as a
// revision of the sheet already held. It is a later revision with other values: "CarbonFil is a 15% carbon fiber
// reinforced PETG based 3D printer filament", specific gravity 1,32 g/cm3 (the earlier, undated revision says 20 % and
// 1.19), a tensile strength at break of 45 MPa, an elongation at break of 4,9 %, a Vicat of 80 °C, and its print settings.
// It enters as a source of its own (a later revision is a new source, OPEN-PROBLEMS §34.3), on the product it describes,
// and the earlier revision's rows stay.
//
// Which document speaks for the product: the later revision (a ruling for this pair, OPEN-PROBLEMS §37.3). The build
// prefers a product's own data sheet among values of one standing (products.js, preference), and a grade's own sheet is
// its SourceID, so G024-21's SourceID moves to the 2024 revision: where both revisions print a property the 2024 figure
// is the product's, and where only the earlier one does (its tensile modulus of 9495 MPa, melt volume rate, water
// absorption) that figure stays the product's, as before. The grade's Composition / filler takes the 2024 sentence, with
// the earlier revision's 20 % beside it.
//
// The batch is guarded and rehearsed as every batch is (scripts/ingest/apply.mjs: the schema gate, no new lint finding,
// the core build) before anything is written, and the ledger row of the document says applied. A re-run is a no-op.
//
//   node scripts/migrate/m442-batch-b46-carbonfil-2024.mjs [--dry-run]
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm442-batch-b46-carbonfil-2024', date = '2026-10-18';
const at = join(projectRoot, 'docs/audits/2026-10-18-screening-build/ingest');
const PACKET_SHA256 = 'ecc15c02bb20e9608fd825476dec71b1037f7a8fbba9d496d008e795d7589ba5';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b46-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../../scripts/ingest/apply.mjs');
const { locate } = await import('../../scripts/data/source-store.mjs');

const GRADE = 'G024-21';
const [doc] = p.Documents;
const NEW_SOURCE = doc.Source.SourceID;
const COMPOSITION_BEFORE = '10% more impact resistant, which is a remarkable feature for carbon-fibre reinforced filament. (p. 1, as the sheet states it)';
const COMPOSITION = `Carbon fibre in PETG: "CarbonFil is a 15% carbon fiber reinforced PETG based 3D printer filament" (${NEW_SOURCE}, the data sheet of 23-8-2024, p. 1, as the sheet states it); the earlier, undated revision (S-PET-TDS-CarbonFil) says "reinforced with 20% ultra-light and relatively long stringer carbon fibres".`;

const proposals = proposalsOf('b46');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
const original = openTables();
if (hash(readFileSync(join(at, 'proposals/b46', doc.File))) !== doc.ProposalSHA256) throw Error(`${migration}: proposal ${doc.File} moved`);
const o = locate(doc.OriginalSHA256, NEW_SOURCE);
if (o.bytes !== 'present') throw Error(`${migration}: the CarbonFil 2024 sheet is ${o.bytes}; restore it (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
const g = original.get('grades', GRADE);
if (g.Manufacturer !== 'FormFutura' || g['Product name'] !== 'CarbonFil') throw Error(`${migration}: grade ${GRADE} is no longer FormFutura CarbonFil`);
// The proposal carries the grade's row of the day it was read; the guard reads the grade as it stands.
for (const proposal of proposals) for (const x of proposal.grades) if (x.row.GradeID) x.row = { ...original.get('grades', x.row.GradeID) };

/** The later revision speaks for the product: the grade's own sheet and its composition. */
function precedence(t) {
  let n = 0;
  const grade = t.get('grades', GRADE);
  if (grade.SourceID !== NEW_SOURCE) { t.set('grades', GRADE, 'SourceID', NEW_SOURCE, { expect: 'S-PET-TDS-CarbonFil', migration }); n++; }
  if (grade['Composition / filler'] !== COMPOSITION) { t.set('grades', GRADE, 'Composition / filler', COMPOSITION, { expect: COMPOSITION_BEFORE, migration }); n++; }
  return n;
}

// Rehearse on a copy of the tables: the schema gate, the lint (no new finding) and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b46-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), set = precedence(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
  // The earlier revision's specific gravity of 1.19 is a finding of the filled-density check until m443 settles it.
  const unexpected = lint.filter((f) => !(f.code === 'MEAS-PHYSICS-FILLED-DENSITY' && ['V009831', 'V015320'].includes(f.record)));
  if (unexpected.length) throw Error(JSON.stringify(unexpected, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { log, set };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const t = openTables(), log = writeBatch(t, proposals, { migration, date }), set = precedence(t), applied = markApplied(proposals, t);
if (log.length || set || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, log, set, applied, written: log.length + set }, null, 2));
