// A grade says what it is (Role) and whether it is in use (Status); a material's grade list follows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { validate } from '../build/src/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));

function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  issues.push(...validate(db, wb));
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}
const grade = (wb, id) => wb.Grades.rows.find((g) => g.GradeID === id);

test("a material's grades are its active procurement grades", () => {
  const { db } = build();
  const pa6 = db.materials.find((m) => m.id === 'M031');
  assert.ok(!pa6.gradeIds.includes('G031-R1'), 'a study grade is not a procurement grade');
  assert.ok(db.materials.every((m) => m.gradeIds.every((id) => !db.grades.find((g) => g.id === id).retired)));
  const { db: added } = build((wb) => { wb.Grades.rows.push({ ...grade(wb, 'G020-01'), GradeID: 'G020-09' }); });
  assert.ok(added.materials.find((m) => m.id === 'M020').gradeIds.includes('G020-09'), 'a new grade row joins its material with no other edit');
});

test('retiring a grade is one field, and a half-finished retirement is an error', () => {
  const { db, errors } = build((wb) => { Object.assign(grade(wb, 'G020-03'), { Status: 'retired', Availability: 'Retired mapping; audit trail only' }); });
  assert.ok(!db.materials.find((m) => m.id === 'M020').gradeIds.includes('G020-03'));
  assert.ok(errors.some((e) => /Active record uses retired grade G020-03|Active profile uses retired grade/.test(e)), 'records on a retired grade must be dealt with');
  const half = build((wb) => { grade(wb, 'G020-03').Availability = 'Retired mapping; audit trail only'; }).errors;
  assert.ok(half.some((e) => /grades G020-03: Availability .* describes a retirement but Status is active/.test(e)), half.join(' | '));
});

test('a study or reference role must match the -R# suffix', () => {
  const { errors } = build((wb) => { grade(wb, 'G020-01').Role = 'study'; });
  assert.ok(errors.some((e) => /grades G020-01: Role study disagrees with the ID/.test(e)), errors.join(' | '));
});
