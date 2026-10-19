#!/usr/bin/env node
// Migration m453 (2026-10-19), batch b48: the documents of the research package of 2026-10-19 that carry data a record
// will cite, admitted through the import pipeline, the four products the research found, the polymer references, and
// PolyTerra PLA+'s sheet moved to the product it describes (the research intake, stage 3;
// docs/audits/2026-10-19-research-intake/).
//
// The research agent saved and hashed every document; the intake's completion agent (Claude Sonnet) found the rest of
// the new products' documents; Claude Opus 5.5 chose the documents that carry data (ingest/intake.mjs), staged them by
// digest into the round's ledger (ingest:witness --from), checked each one's identifying line on its cached text and wrote
// the proposals (ingest/build-b48.mjs, which pins the packet here). 57 documents enter: makers' drying guides and product
// pages, the makers' safety data sheets that state a fibre load, the four products' data sheets and pages, Braskem's and
// Raise3D's chamber statements, and four producers' sheets for polymers.csv. Their values and settings enter through the
// reading tools in the next migration; this one registers them, with:
// - four products: Filamatrix Nylon Carbon Fiber (M165) and Nylon Glass Enhanced (M166, sold as "Nylon Glass Fiber"),
//   whose maker names no polyamide (their safety data sheets withhold it); Eumakers PA Nylon Glass Fiber (M166), whose
//   filament data sheet Eumakers serves from its own host, byte for byte the copy a retailer serves; and Polymaker Panchroma
//   Satin PLA (M001), "Formerly called PolyTerra™ PLA+", whose own sheet is the Panchroma range sheet V2.1 already
//   registered (R-POLYMAKER-PANCHROMA-TDS-V2-1, its Satin column);
// - PolyTerra PLA+'s sheet (S-POLYCN-PolyTerra-PLA-Plus-EN-V5-1), filed under PolyTerra PLA (G001-23) since the V2 import
//   (OPEN-PROBLEMS §12): its 13 values, its profile, its two statements and the toughened claim one of them bears (m386) move to Panchroma Satin PLA, the product it
//   describes, with their IDs (D86); Satin's own V2.1 sheet speaks for it where both print a property (D149);
// - polymers.csv: PCTG, HIPS, PA6/66 and PVB cite a producer's sheet now, each printing a density inside the row's range
//   (OPEN-PROBLEMS §38.4). No density, melting point, water uptake, morphology or as-printed cell changes: the estimate
//   stage reads them (D58, D138). PA6/66's sheet prints a melting range of 191-197 °C beside the row's 200; the Basis says
//   so and the cell stays.
// The batch is guarded and rehearsed as every batch is (scripts/ingest/apply.mjs: hashes, reviews, the schema gate, no new
// lint finding, the core build) together with the edits above, before anything is written; each edit names the cell it
// replaces, and every quoted line is checked on its cached, hash-checked sheet. A re-run is a no-op.
//
//   node scripts/migrate/m453-batch-b48-research-intake.mjs [--dry-run]
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv, csvText } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm453-batch-b48-research-intake', date = '2026-10-19';
const at = join(projectRoot, 'docs/audits/2026-10-19-research-intake/ingest');
const PACKET_SHA256 = 'a3df53300349b2c6b7431afdc515e27c3805c0b3c473b26c6966096fe3d877d8';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b48-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);
const { documents } = JSON.parse(readFileSync(join(at, 'b48-docs.json'), 'utf8'));
const sid = (id) => documents.find((d) => d.id === id).sourceId;

// The round's own ledger and proposals: the documents were staged there, and applied is written there.
process.env.H2C_INGEST_ROOT = at;
process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../ingest/apply.mjs');
const { locate } = await import('../data/source-store.mjs');
const { onSheet } = await import('../lib/sweep-shared.mjs');

const proposals = proposalsOf('b48');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'proposals/b48', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
  const o = locate(d.OriginalSHA256, d.Source.SourceID);
  if (o.bytes !== 'present') throw Error(`${migration}: ${d.Source.SourceID} is ${o.bytes}; restore the source store (npm run data:sources -- --restore "$H2C_SOURCE_BACKUP")`);
}

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
      const row = Object.fromEntries(header.map((h) => [h, h === 'Value' ? v.Value : h === 'Meaning' ? v.Meaning ?? '' : v[h] ?? '']));
      const i = rows.findIndex((r) => r.Value.localeCompare(v.Value, 'en', { sensitivity: 'base' }) > 0);
      rows.splice(i < 0 ? rows.length : i, 0, row);
    }
    if (rows.length !== before) { writeFileSync(file, csvText(header, rows)); added += rows.length - before; }
  }
  return added;
}

// ---- polymers.csv: the rows a producer's sheet now speaks for --------------------------------------------------------
const LEAD = 'Classification and typical values from polymer handbooks and resin data sheets, as compiled for the estimate model (docs/audits/2026-09-15-filtering-estimates-data/physics/). The document cited prints a density inside the range, not its ends.';
const POLYMERS = [
  { id: 'PCTG', doc: 'NEW-908c225fa945', add: (s) => `SK chemicals' safety data sheet for SKYGREEN JN200 (${s}), which calls its SKYGREEN J resins PCTG, prints a specific gravity of 1.23 (ASTM D792), p. 2. It prints no water absorption.`,
    quotes: ['SKYGREEN® J is a PCTG', 'Specific Gravity', '1.23'] },
  { id: 'HIPS', doc: 'NEW-f5e7bdf39ed1', add: (s) => `AmSty's data sheet for STYRON 478 (${s}), a high-impact polystyrene, prints a specific gravity of 1.04 (ASTM D-792), p. 1.`,
    quotes: ['High Impact Polystyrene', 'Specific Gravity', '1.04'] },
  { id: 'PA6/66', doc: 'NEW-3fe4ca7f8420', add: (s) => `BASF's safety data sheet for Ultramid C33 (${s}), a polyamide 6/66 copolymer as BASF's product page names it (${sid('NEW-73577e95a6a5')}), prints a density of 1.12 - 1.15 g/cm3 (EN ISO 1183-1) and a melting temperature of approx. 191 - 197 °C (DIN 53736), p. 4. The melting point cell (200) stays: a moved cell would move estimates (D58, D138).`,
    quotes: ['1.12 - 1.15 g/cm3', '191 - 197 °C'], also: { doc: 'NEW-73577e95a6a5', quotes: ['Ultramid® C33'] } },
  { id: 'PVB', doc: 'NEW-1c703cb952ff', add: (s) => `Eastman's data sheet for Butvar B-74 (${s}), a polyvinyl butyral resin, as a distributor serves it, prints a specific gravity of 1.100 at 23°/23°C, with no test method named, p. 1.`,
    quotes: ['polyvinyl butyral resin', 'Specific Gravity', '1.100'] },
];
function polymers(t) {
  let n = 0;
  for (const r of POLYMERS) {
    const source = sid(r.doc);
    onSheet(t, source, r.quotes.join(' | '), migration);
    if (r.also) onSheet(t, sid(r.also.doc), r.also.quotes.join(' | '), migration);
    const row = t.get('polymers', r.id);
    if (row.SourceID === source) continue;
    if (!/^Classification and typical values from polymer handbooks/.test(row.Basis)) throw Error(`${migration}: ${r.id}'s Basis is not the handbook's`);
    t.set('polymers', r.id, 'SourceID', source, { expect: 'Not recorded', migration });
    t.set('polymers', r.id, 'Basis', `${LEAD} ${r.add(source)}`, { expect: row.Basis, migration });
    n++;
  }
  return n;
}

// ---- PolyTerra PLA+'s sheet, on the product it describes ----------------------------------------------------------
const PLUS = 'S-POLYCN-PolyTerra-PLA-Plus-EN-V5-1', PANCHROMA = 'R-POLYMAKER-PANCHROMA-TDS-V2-1';
function satin(t) {
  const g = t.rows('grades').find((x) => x.Manufacturer === 'Polymaker' && x['Product name'] === 'Panchroma Satin PLA' && x.Status === 'active');
  if (!g) throw Error(`${migration}: Panchroma Satin PLA was not created`);
  onSheet(t, sid('NEW-38167ab03310'), 'Formerly called PolyTerra', migration);
  onSheet(t, PLUS, 'PolyTerra™ PLA+', migration);
  let n = 0;
  for (const table of ['measurements', 'profiles', 'evidence']) {
    const pk = t.schemas[table].primaryKey;
    for (const r of t.rows(table).filter((x) => x.SourceID === PLUS && x.GradeID === 'G001-23')) {
      t.set(table, r[pk], 'GradeID', g.GradeID, { expect: 'G001-23', migration });
      n++;
    }
  }
  // The toughened claim (m386) rests on PolyTerra PLA+'s statement Q00985, and goes with it.
  for (const c of t.rows('product_claims').filter((x) => x.GradeID === 'G001-23' && x.EvidenceID === 'Q00985')) {
    t.update('product_claims', { GradeID: 'G001-23', Claim: c.Claim, EvidenceID: 'Q00985' }, 'GradeID', g.GradeID, { expect: 'G001-23', migration });
    n++;
  }
  const plus = t.get('sources', PLUS);
  if (plus['Applicable grades'] === 'G001-23') { t.set('sources', PLUS, 'Applicable grades', g.GradeID, { expect: 'G001-23', migration }); n++; }
  const pan = t.get('sources', PANCHROMA);
  if (!pan['Applicable grades'].includes(g.GradeID)) { t.set('sources', PANCHROMA, 'Applicable grades', `${pan['Applicable grades']}; M001 / ${g.GradeID}`, { expect: pan['Applicable grades'], migration }); n++; }
  return n;
}

// Rehearse on a copy of the tables: the batch and the edits together, then the schema gate, the lint (no new finding)
// and the core build, before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b48-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const vocab = addVocabulary(dir);
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }), set = polymers(t), moved = satin(t); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  // A document registered here is cited by the records the next migration (m454, the readings) writes from it, in the
  // same commit: until then it is uncited, which is the one finding this batch leaves to m454.
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)) && !(f.code === 'SOURCE-UNCITED' && /-INTAKE-20261019-/.test(f.record)));
  if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { vocab, log: log.length, set, moved };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const vocab = addVocabulary(projectRoot);
const t = openTables(), log = writeBatch(t, proposals, { migration, date }), set = polymers(t), moved = satin(t), applied = markApplied(proposals, t);
if (log.length || set || moved || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, vocab, log, set, moved, applied }, null, 2));
