#!/usr/bin/env node
// Migration m478 (2026-10-20): the round's review of the materials-science rulings (D176), findings F1 and F4. Read by
// Claude Opus 5.5 (the round's materials-science track) on the cached sheets.
//
// F1. purefil's PVC-P sheet is not silent about the enclosure: p. 1, "Wir empfehlen die Verarbeitung von PVC-P
//     ausschliesslich auf geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter" (we recommend processing PVC-P only
//     on enclosed printers with an activated-carbon filter). Its profile from that sheet (P1469) held "Not published", so
//     the deciding chamber-need row of Flexible Elastomers (CN05) filled its chamber as within and PVC-P passed the indoor
//     prototype. An enclosure asked for is a statement and is never filled (D151): the sentence is recorded, typed
//     recommended (the parser reads no German; Parse review names the column). Its product page's profile (P1448) says
//     nothing of an enclosure and stays as it is.
// F4. The rubber limit's source (the Cambridge Materials Data Book) prints no PVC. A flexible-PVC compounder's table enters
//     through the import pipeline (batch b49-2, staged by digest): Fainplast's "PVC Flexible for Extrusion", flexible
//     compounds of Shore A 45 to 94 with 200 to 460 % elongation at break, the harder grades named "Semi rigid" from 96A.
//     PVC-P gets a limit of its own, CL03, citing it; it lands reported here and decides in m479, in a commit of its own,
//     where CL01 gives PVC-P up. And K-Resin KR03's page, which backs SBC's neat-density minimum (1010 kg/m³), is cited,
//     no longer a corroboration (SOURCE-UNCITED counts a polymer row's Basis since dca5e1eb).
// And the acceptance of HT100's density against PETG's range, stale since m474 moved it to CPE, is removed.
// The batch is guarded and rehearsed as every batch is, with the edits above. A re-run is a no-op.
//
//   node scripts/migrate/m478-review-fixes-pvc-p-and-sbc.mjs [--dry-run]
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';
import { settleFindings } from '../../scripts/lib/source-edits.mjs';

const migration = 'm478-review-fixes-pvc-p-and-sbc', date = '2026-10-20';
const at = join(projectRoot, 'docs/audits/2026-10-20-owner-rulings/science/ingest');
const PACKET_SHA256 = '9438b2d5638dd6feba4d6719670dedeeeb7bd41ae27ce93be5747b332e6957d9';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b49-2-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);
process.env.H2C_INGEST_ROOT = at;
process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../../scripts/ingest/apply.mjs');
const { locate } = await import('../../scripts/data/source-store.mjs');
const { onSheet } = await import('../../scripts/lib/sweep-shared.mjs');
const proposals = proposalsOf('b49-2');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'proposals/b49-2', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  if (locate(d.OriginalSHA256, d.Source.SourceID).bytes !== 'present') throw Error(`${migration}: ${d.Source.SourceID} has no bytes`);
}

const ENCLOSURE = 'Wir empfehlen die Verarbeitung von PVC-P ausschliesslich auf geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter.';
const CL03 = {
  LimitID: 'CL03', 'Target headline': 'tensileModulusXY', Kind: 'ceiling', Value: '0.5',
  'Applies to': 'Base polymer: PVC-P; Modifier / filler: Unfilled / unspecified', Status: 'reported',
  'Reason words': 'An unfilled plasticised PVC (PVC-P)', SourceID: 'R-FAINPLAST-PVC-FLEXIBLE-EXTRUSION',
  Basis: 'A plasticiser lowers PVC\'s glass transition below room temperature, and its small crystallites then hold the chains as a thermoplastic elastomer\'s hard blocks do: a flexible PVC is a rubber, sold by its Shore A hardness. Fainplast\'s table of flexible PVC compounds for hoses, gaskets and profiles (R-FAINPLAST-PVC-FLEXIBLE-EXTRUSION) prints them at Shore A 45 to 94 (ISO 868) with elongations at break of 200 to 460 % (ISO 527) and names its harder grades "Semi rigid" from 96A and 60 Shore D; the Shore A scale ends near 0.1 GPa (Gent\'s relation puts 95A near 0.04 GPa, as CL01\'s Basis says). The limit is CL01\'s 0.5 GPa, well above any Shore A material, and the test scatter is added before it fails anything. No flexible-PVC sheet found prints a tensile modulus (Fainplast, Teknor Apex, the IAPD table and the Danish EPA\'s plasticiser report print hardness, strength and stretch), so the limit rests on the hardness scale the class is sold by. purefil\'s PVC-P (M178) is its one product, Shore 94A (the owner\'s rulings, D176; m478, m479).',
};

function edits(t, root) {
  let n = 0;
  onSheet(t, 'R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil', ENCLOSURE.replace(/\.$/, ''), migration);
  const pr = t.get('profiles', 'P1469');
  if (pr.SourceID !== 'R-FABRU-PUREFIL-7782-Materialdatenblatt-PVC-P-purefil' || pr.GradeID !== 'G135-01') throw Error(`${migration}: P1469 is not purefil PVC-P's sheet profile`);
  if (pr.Enclosure !== ENCLOSURE) {
    t.set('profiles', 'P1469', 'Enclosure', ENCLOSURE, { expect: 'Not published', migration });
    t.set('profiles', 'P1469', 'Enclosure state', 'recommended', { expect: 'unknown', migration });
    t.set('profiles', 'P1469', 'Parse review', 'Fields: Enclosure state. The parser reads no German: the sheet recommends processing PVC-P "ausschliesslich auf geschlossenen 3D-Druckern mit integriertem Aktivkohlefilter" (only on enclosed printers with an activated-carbon filter), an enclosure asked for, which the chamber need never fills (D151; the owner\'s rulings\' review, m478).', { expect: 'Not applicable', migration });
    t.set('profiles', 'P1469', 'Locator', `${pr.Locator}; p. 1: Wir empfehlen die Verarbeitung von PVC-P ausschliesslich auf geschlossenen 3D-Druckern`, { expect: pr.Locator, migration });
    n++;
  }
  onSheet(t, 'R-FAINPLAST-PVC-FLEXIBLE-EXTRUSION', 'Compounds for the extrusion of hoses, gaskets | PK 9405 Fencing 1,29 94 | PK 96 Semi rigid extrusion | 60 (ShD)', migration);
  if (!t.find('class_limits', 'CL03')) { t.append('class_limits', CL03); n++; }
  const kr = t.get('sources', 'R-INEOS-KRESIN-KR03-PAGE');
  if (kr['Citation role'] === 'corroboration') { t.set('sources', 'R-INEOS-KRESIN-KR03-PAGE', 'Citation role', 'cited', { expect: 'corroboration', migration }); n++; }
  // m474 moved Spectrum PET-G HT100 to CPE, whose row names no source, so CL02 no longer judges its 1.18 g/cm³ against
  // PETG's range: the acceptance written for that finding no longer occurs.
  const { dropped } = settleFindings(t, { date, drop: [{ Code: 'CLASS-LIMIT-CONTRADICTED', Table: 'materials', Record: 'CL02 V002844', Field: '' }], root });
  return n + dropped;
}

const dir = mkdtempSync(join(tmpdir(), 'h2c-b49-2-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), set = edits(t, dir); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)));
  if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { log: log.length, set };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const t = openTables(), log = writeBatch(t, proposals, { migration, date }), set = edits(t, projectRoot), applied = markApplied(proposals, t);
if (log.length || set || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, log, set, applied }, null, 2));
