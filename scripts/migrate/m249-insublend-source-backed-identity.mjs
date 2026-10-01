// Source-backed identity correction; all published values and stable IDs remain.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { locate } from '../data/source-store.mjs';
import { moveGrade } from '../data/records.mjs';
const migration = 'm249-insublend-source-backed-identity';
const at = join(projectRoot, 'docs/audits/2026-09-30-coverage-expansion');
const bytes = readFileSync(join(at, 'insublend-identity-packet.json'));
const hash = createHash('sha256').update(bytes).digest('hex');
const review = JSON.parse(readFileSync(join(at, 'insublend-identity-review.json')));
if (hash !== 'fba6edc973dbeabfec60cdc2f0216ae3de3df21e6c0a3fc812c3c301ba9e3daa' || review.input_sha256 !== hash || review.overall_verdict !== 'APPROVE') throw Error(`${migration}: unreviewed identity packet`);
const p = JSON.parse(bytes), t = openTables();
const agrees = (row, expected) => row && Object.entries(expected).every(([k, v]) => row[k] === v);
const check = (row, expected, name) => { if (!agrees(row, expected)) throw Error(`${migration}: ${name} moved`); };
const current = t.get('grades', p.ExpectedGrade.GradeID);
const reapplied = agrees(current, p.ProposedGrade);
if (!reapplied) check(current, p.ExpectedGrade, current.GradeID);
for (const m of p.ExpectedMaterials) check(t.get('materials', m.MaterialID), m, m.MaterialID);
for (const s of [p.HistoricalSource, p.NewAdmittedSourceBeforeMove]) {
  check(t.get('sources', s.SourceID), s, s.SourceID);
  const original = locate(s.SHA256, s.SourceID);
  if (original.bytes !== 'present' || createHash('sha256').update(readFileSync(original.path)).digest('hex') !== s.SHA256) throw Error(`${migration}: reviewed original missing or changed`);
}
const materialId = reapplied ? p.ProposedGrade.MaterialID : p.ExpectedGrade.MaterialID;
for (const [table, oldRows] of Object.entries(p.ExpectedOwnedRecords)) {
  const key = t.schemas[table].primaryKey;
  const rows = t.rows(table).filter((r) => r.GradeID === current.GradeID);
  const added = table === 'evidence' ? p.NewAdmittedEvidenceBeforeMove : [];
  if (rows.length !== oldRows.length + added.length) throw Error(`${migration}: ${table} ownership population changed`);
  for (const old of oldRows) check(t.get(table, old[key]), { ...old, MaterialID: materialId }, old[key]);
  for (const raw of added) {
    const matches = rows.filter((r) => r.SourceID === raw.SourceID && r.Locator === raw.Locator);
    if (matches.length !== 1) throw Error(`${migration}: expected admitted source clause missing or duplicated`);
    check(matches[0], { ...raw, MaterialID: materialId }, matches[0][key]);
  }
}
for (const old of p.ExpectedPrintingLinks) {
  const row = t.rows('material_links').find((r) => r.RecordID === old.RecordID && r.Link === old.Link && r.MaterialID === materialId);
  check(row, { ...old, MaterialID: materialId }, old.RecordID);
}
if (!reapplied && t.rows('coverage').some((r) => r.GradeID === current.GradeID)) throw Error(`${migration}: unexpected grade-specific coverage requires reconciliation`);
let moved = 0;
if (!reapplied) {
  moved = moveGrade(t, current.GradeID, p.ProposedGrade.MaterialID, { migration });
  for (const field of ['Composition / filler', 'Source locator']) t.set('grades', current.GradeID, field, p.ProposedGrade[field], { expect: p.ExpectedGrade[field] });
}
t.save();
console.log(JSON.stringify({ migration, packet: hash, written: reapplied ? 0 : moved + 1, movedOwnedRecords: moved, grade: current.GradeID, from: p.ExpectedGrade.MaterialID, to: p.ProposedGrade.MaterialID, stableIdsPreserved: true }, null, 2));
