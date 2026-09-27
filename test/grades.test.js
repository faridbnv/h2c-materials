// A grade says what it is (Role) and whether it is in use (Status); a material's grade list follows.
//
// The fixtures are chosen from the data by what each case needs (a procurement grade with records, a study grade),
// never by ID, so a batch or a re-filing cannot break the proof that a check still fires.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { nextId } from '../scripts/data/table-io.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));

// The core database: every check here is on grade lists and on compile and validate errors, which the estimate stage
// neither writes nor raises.
function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false });
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}
const grade = (wb, id) => wb.Grades.rows.find((g) => g.GradeID === id);
const procurement = base.Grades.rows.filter((g) => g.Role === 'procurement' && g.Status === 'active');
// A procurement grade that other records stand on: a measurement and a print profile.
const withRecords = procurement.find((g) => base.Properties.rows.some((m) => m.GradeID === g.GradeID) && base['Print setup'].rows.some((p) => p.GradeID === g.GradeID));

test("a material's grades are its active procurement grades", () => {
  const { db } = build();
  const study = db.grades.filter((g) => /-R\d+$/.test(g.id));
  assert.ok(study.length > 0, 'no study grade to check');
  for (const g of study) assert.ok(!db.materials.find((m) => m.id === g.materialId).gradeIds.includes(g.id), `${g.id} is a study grade, not a procurement grade`);
  assert.ok(db.materials.every((m) => m.gradeIds.every((id) => !db.grades.find((g) => g.id === id).retired)));
  const like = procurement[0];
  const id = nextId('grades', base.Grades.rows.map((g) => g.GradeID), { materialId: like.MaterialID });
  const { db: added } = build((wb) => { wb.Grades.rows.push({ ...grade(wb, like.GradeID), GradeID: id }); });
  assert.ok(added.materials.find((m) => m.id === like.MaterialID).gradeIds.includes(id), 'a new grade row joins its material with no other edit');
});

test('retiring a grade is one field: Status', () => {
  assert.ok(withRecords, 'no procurement grade with a measurement and a profile to retire');
  const id = withRecords.GradeID;
  const { db, errors } = build((wb) => { grade(wb, id).Status = 'retired'; });
  assert.ok(!db.materials.find((m) => m.id === withRecords.MaterialID).gradeIds.includes(id));
  assert.ok(errors.some((e) => e.includes(`Active record uses retired grade ${id}`) || /Active profile uses retired grade/.test(e)), 'records on a retired grade must be dealt with');
  // Availability is what was recorded about the product, not a second copy of the retirement (m147): a sentence that
  // mentions retiring leaves an active grade active.
  const { db: worded } = build((wb) => { grade(wb, id).Availability = 'Retired mapping; audit trail only'; });
  assert.ok(worded.materials.find((m) => m.id === withRecords.MaterialID).gradeIds.includes(id));
});

test('a study or reference role must match the -R# suffix', () => {
  const id = procurement[0].GradeID;
  const { errors } = build((wb) => { grade(wb, id).Role = 'study'; });
  assert.ok(errors.some((e) => e.includes(`grades ${id}: Role study disagrees with the ID`)), errors.join(' | '));
});

test('a material link must cite the right kind of record', () => {
  const material = procurement[0].MaterialID;
  const evidence = base['Use & durability'].rows[0].EvidenceID;
  const source = base.Sources.rows[0].SourceID;
  const { errors } = build((wb) => {
    wb['Material links'].rows.push({ MaterialID: material, Link: 'h2c-status', RecordID: evidence });
    wb['Material links'].rows.push({ MaterialID: material, Link: 'use', RecordID: source });
  });
  assert.ok(errors.some((e) => e.includes(`H2C status link cites ${evidence}, which is not a source`)), errors.join(' | '));
  assert.ok(errors.some((e) => e.includes(`use evidence cites ${source}, which does not exist`)), errors.join(' | '));
});
