// The material drawer's reading of prose fields that point at evidence records instead of saying something (plan B14):
// "Family context in Q00282, Q00283, …" in 47 materials' Best uses. The data is left as it is; the drawer resolves it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePointers } from '../app/js/ui/detail.js';

const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
const evidenceById = new Map(db.evidence.map((e) => [e.id, e]));

test('a cell of evidence pointers resolves to its records, keeps no pointer as prose, and drops none', () => {
  const abscf = resolvePointers('Family context in Q00282, Q00283, Q00284, Q00285', evidenceById);
  assert.deepEqual(abscf.records.map((r) => r.id), ['Q00282', 'Q00283', 'Q00284', 'Q00285']);
  assert.deepEqual(abscf.unresolved, []);
  assert.equal(abscf.prose, '');
  // The Best uses record is the one whose topic says so; the rest are the family's guidance.
  assert.deepEqual(abscf.records.filter((r) => /^best uses$/i.test(r.topic)).map((r) => r.id), ['Q00282']);
  // A pointer to nothing is reported, never silently dropped.
  const dangling = resolvePointers('Family context in Q00282, Q99999', evidenceById);
  assert.deepEqual(dangling.unresolved, ['Q99999']);
  assert.deepEqual(dangling.records.map((r) => r.id), ['Q00282']);
  // Prose with no pointer is left to be shown as it is.
  assert.equal(resolvePointers('Economical technical housings and parts that benefit from acetone finishing.', evidenceById), null);
  // Words around the pointers survive, without the pointers.
  assert.equal(resolvePointers('Brackets and jigs; family context in Q00282', evidenceById).prose, 'Brackets and jigs');
});

test('every prose field in the database that points at evidence resolves, and says which have no Best uses record', () => {
  const pointing = [];
  for (const m of db.materials) {
    for (const field of ['bestUses', 'limitations']) {
      const r = resolvePointers(m[field], evidenceById);
      if (!r) continue;
      pointing.push(m.name);
      assert.deepEqual(r.unresolved, [], `${m.name} ${field} points at a record that is not in the database`);
      assert.doesNotMatch(r.prose, /\bQ\d{5}\b/, `${m.name} ${field}`);
    }
  }
  assert.ok(pointing.filter((name) => !db.materials.find((m) => m.name === name).familyEntry).length >= 47, `${pointing.length} pointing fields`);
  // PVA and BVOH point only at water-soluble support guidance: their drawers have family guidance and no Good for.
  for (const name of ['PVA', 'BVOH']) {
    const r = resolvePointers(db.materials.find((m) => m.name === name).bestUses, evidenceById);
    assert.ok(r.records.length > 0 && !r.records.some((x) => /^best uses$/i.test(x.topic)), name);
  }
});
