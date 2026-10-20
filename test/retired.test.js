// A material retired from the dataset (Scope Retired, D174): its row and every record filed under it stay in the
// tables, and the build compiles none of them. The metal and ceramic sintering filaments are the ones retired (m468).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { inDataset, RETIRED_SCOPE } from '../build/src/retired.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = loadTables(join(root, 'data'));
const retired = base.Materials.rows.filter((r) => r.Scope === RETIRED_SCOPE).map((r) => r.MaterialID);

function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates: false });
  return { db, issues, errors: issues.filter((i) => i.level === 'error') };
}

test('the sintering filaments are retired from the dataset, and the build holds none of their records', () => {
  assert.deepEqual(retired, ['M171', 'M172', 'M173'], 'the three sintering materials, and no other, are retired (m468)');
  const { db, issues } = build();
  const gone = new Set(retired);
  assert.ok(!db.materials.some((m) => gone.has(m.id)), 'no retired material is compiled');
  for (const table of ['grades', 'measurements', 'profiles', 'evidence', 'prices', 'coverage', 'knowHow']) {
    assert.ok(!(db[table] ?? []).some((r) => gone.has(r.materialId)), `no ${table} record of a retired material`);
  }
  assert.ok(!db.materials.some((m) => m.family === 'Metal and Ceramic Sintering'), 'the family has no material left');
  assert.ok(!(db.chamberNeed ?? []).some((r) => /Sintering/.test(r.appliesTo)), 'its chamber-need row is retired with it');
  assert.equal(db.meta.counts.retired, 3);
  // Their records stay in the tables, every grade retired, and their sources stay registered.
  const grades = base.Grades.rows.filter((g) => gone.has(g.MaterialID));
  assert.equal(grades.length, 4);
  assert.ok(grades.every((g) => g.Status === 'retired'), 'every grade of a retired material is retired');
  for (const g of grades) assert.ok(db.sources.some((s) => s.id === g.SourceID), `${g.GradeID}'s source ${g.SourceID} is still registered`);
  assert.equal(issues.filter((i) => i.code === 'MATERIAL-RETIRED').length, 3, 'each retired material is named, at info');
});

test('an active grade on a retired material stops the build', () => {
  const { errors } = build((wb) => { wb.Grades.rows.find((g) => g.GradeID === 'G171-01').Status = 'active'; });
  assert.ok(errors.some((e) => e.code === 'MATERIAL-RETIRED-ACTIVE' && /G171-01/.test(e.where)), errors.map((e) => e.code).join(', '));
});

test('a record of another material that points at a retired one is not dropped with it', () => {
  // A family entry's member is the family's row, not the member's: it stays, and the family's mapping check resolves it.
  const { errors } = build((wb) => {
    const row = wb['Family members'].rows[0];
    wb['Family members'].rows.push({ ...row, MemberMaterialID: 'M171' });
  });
  assert.ok(errors.some((e) => e.code === 'FAMILY-ENTRY-MAPPING' || e.code === 'REF-UNKNOWN'), 'the member that left the dataset is reported, not hidden');
});

test('with nothing retired, the tables are read as they are', () => {
  const wb = structuredClone(base);
  for (const r of wb.Materials.rows) if (r.Scope === RETIRED_SCOPE) r.Scope = 'Excluded';
  const scoped = inDataset(wb);
  assert.equal(scoped.wb, wb, 'the same tables, not a copy');
  assert.deepEqual(scoped.issues, []);
});
