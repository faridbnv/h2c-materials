#!/usr/bin/env node
// Migration m488 (2026-10-20), batch b50: the documents of the second research package (2026-10-19, round 2) that carry
// data a record will cite, admitted through the import pipeline, and the six products the research found (research
// intake 2, stage 2; docs/audits/2026-10-20-research-intake-2/).
//
// The research agent saved and hashed every document; Claude Opus 5.5 chose the documents that carry data
// (ingest/intake.mjs), staged them by digest into the round's ledger (ingest:witness --from), read the image-only pages
// optically beside them (ingest:ocr-pass), checked each one's identifying line on its cached text and wrote the proposals
// (ingest/build-b50.mjs, which pins the packet here). 18 documents enter:
// - six products, each a third product of a material one short of a page or a product for a thin home: Kexcelled THE K8
//   OBC (M086, OBC), Filamentive Hemp PLA (M152, PLA-NF; its data sheet and its store page, which prints its recipe),
//   QIDI PPS-GF20 (M074, PPS-GF), Forward AM Ultrafuse PP GF30 (M084, PP-GF), and Sakata 3D's PA-NT and PA-CF15 (M164,
//   M165: copolyamides whose maker names no monomers);
// - statements for products the catalogue holds: AzureFilm's own ASA data sheet (05.24) and product page, Prusa's ASA
//   article, LEHVOSS's LUVOCOM 3F brochure, Raise3D's fibre-reinforced white paper, Polymaker's PolyMide PA12-CF
//   information sheet, Eryone's carbon-fibre PLA page, eSUN's ePLA-CF safety data sheet and Fiberlogy's current R PP
//   sheet;
// - two documents kept to corroborate: Essentium's PA-CF safety data sheet (PA 6/66, the filing m490 makes) and
//   Polymaker's Panchroma Matte page ("PolyTerra PLA", its former name).
// Their values and settings enter through the reading tools in the next migration (m489); this one registers them.
// The batch is guarded and rehearsed as every batch is (scripts/ingest/apply.mjs: hashes, reviews, the schema gate, no new
// lint finding, the core build) before anything is written. A re-run is a no-op.
//
//   node scripts/migrate/m488-batch-b50-research-intake-2.mjs [--dry-run]
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { checkData } from '../../build/src/schema.js';
import { readCsv, csvText } from '../../build/src/csv.js';
import { lintData, findingKey } from '../../build/src/lint-rules.js';
import { loadTables, snapshotDate } from '../../build/src/load.js';
import { buildDatabase } from '../../build/src/pipeline.js';

const migration = 'm488-batch-b50-research-intake-2', date = '2026-10-20';
const at = join(projectRoot, 'docs/audits/2026-10-20-research-intake-2/ingest');
const PACKET_SHA256 = '0e0d6b4988c2965a2ed97c107c71a4b0c909923a6b2ef3098ed098bc5388798d';
const hash = (b) => createHash('sha256').update(b).digest('hex');
const bytes = readFileSync(join(at, 'b50-packet.json')), digest = hash(bytes);
if (digest !== PACKET_SHA256) throw Error(`${migration}: changed packet`);
const p = JSON.parse(bytes);

// The round's own ledger and proposals: the documents were staged there, and applied is written there.
process.env.H2C_INGEST_ROOT = at;
process.env.H2C_PROPOSALS = join(at, 'proposals');
const { proposalsOf, guard, worldOf, writeBatch, markApplied } = await import('../../scripts/ingest/apply.mjs');
const { locate } = await import('../../scripts/data/source-store.mjs');

const proposals = proposalsOf('b50');
if (proposals.length !== p.Documents.length) throw Error(`${migration}: proposal inventory moved`);
for (const d of p.Documents) {
  if (hash(readFileSync(join(at, 'proposals/b50', d.File))) !== d.ProposalSHA256) throw Error(`${migration}: proposal ${d.File} moved`);
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
      const row = Object.fromEntries(header.map((h) => [h, h === 'Value' ? v.Value : v[h] ?? '']));
      const i = rows.findIndex((r) => r.Value.localeCompare(v.Value, 'en', { sensitivity: 'base' }) > 0);
      rows.splice(i < 0 ? rows.length : i, 0, row);
    }
    if (rows.length !== before) { writeFileSync(file, csvText(header, rows)); added += rows.length - before; }
  }
  return added;
}

// Rehearse on a copy of the tables: the batch, then the schema gate, the lint (no new finding) and the core build,
// before anything is written.
const dir = mkdtempSync(join(tmpdir(), 'h2c-b50-rehearse-'));
let rehearsal;
try {
  cpSync(join(projectRoot, 'data'), join(dir, 'data'), { recursive: true }); cpSync(join(projectRoot, 'schema'), join(dir, 'schema'), { recursive: true });
  const vocab = addVocabulary(dir);
  const problems = guard(proposals, worldOf(dir));
  if (problems.length) throw Error(JSON.stringify(problems, null, 1));
  const t = openTables(dir), log = writeBatch(t, proposals, { migration, date, root: dir }); t.save();
  const gate = checkData(join(dir, 'data'), join(dir, 'schema')); if (gate.issues.length) throw Error(JSON.stringify(gate.issues));
  const tables = Object.fromEntries(Object.keys(gate.schemas).map((n) => { const { header, records } = readCsv(join(dir, 'data/tables', `${n}.csv`)); return [n, { header, rows: records.map((r) => r.values) }]; }));
  const baseline = new Set(readCsv(join(dir, 'data/review/accepted-findings.csv')).records.map((r) => findingKey({ code: r.values.Code, table: r.values.Table, record: r.values.Record, field: r.values.Field ?? '' })));
  // A document registered here is cited by the records the next migration (m489, the readings) writes from it, in the
  // same commit: until then it is uncited, which is the one finding this batch leaves to m489. The new products have no
  // value yet for the same reason.
  const lint = lintData(tables, gate.schemas).filter((f) => !baseline.has(findingKey(f)) && !(f.code === 'SOURCE-UNCITED' && /-INTAKE-20261020-/.test(f.record)));
  if (lint.length) throw Error(JSON.stringify(lint, null, 1));
  const wb = loadTables(join(dir, 'data')), issues = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'apply', estimates: false }).issues.filter((i) => i.level === 'error');
  if (issues.length) throw Error(JSON.stringify(issues, null, 1));
  rehearsal = { vocab, log: log.length };
} finally { rmSync(dir, { recursive: true, force: true }); }
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration, packet: digest, rehearsal, written: false }, null, 2)); process.exit(0); }

const vocab = addVocabulary(projectRoot);
const t = openTables(), log = writeBatch(t, proposals, { migration, date }), applied = markApplied(proposals, t);
if (log.length || applied) t.save();
console.log(JSON.stringify({ migration, packet: digest, vocab, log, applied }, null, 2));
