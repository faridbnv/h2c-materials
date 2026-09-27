// The material drawer's reading of prose fields that point at evidence records instead of saying something (plan B14):
// "Family context in Q00282, Q00283, …" in 47 materials' Best uses. The data is left as it is; the drawer resolves it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePointers, groupByMaker } from '../app/js/ui/detail.js';

const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
const evidenceById = new Map(db.evidence.map((e) => [e.id, e]));

test('a cell of evidence pointers resolves to its records, keeps no pointer as prose, and drops none', () => {
  // A Best uses record and three of the family's guidance, chosen from the evidence by topic (ABS-CF's Q00282 to
  // Q00285 were the case that found it).
  const best = db.evidence.find((e) => /^best uses$/i.test(e.topic)).id;
  const guidance = db.evidence.filter((e) => !/^best uses$/i.test(e.topic)).slice(0, 3).map((e) => e.id);
  const cell = resolvePointers(`Family context in ${[best, ...guidance].join(', ')}`, evidenceById);
  assert.deepEqual(cell.records.map((r) => r.id), [best, ...guidance]);
  assert.deepEqual(cell.unresolved, []);
  assert.equal(cell.prose, '');
  // The Best uses record is the one whose topic says so; the rest are the family's guidance.
  assert.deepEqual(cell.records.filter((r) => /^best uses$/i.test(r.topic)).map((r) => r.id), [best]);
  // A pointer to nothing is reported, never silently dropped.
  const dangling = resolvePointers(`Family context in ${best}, Q99999`, evidenceById);
  assert.deepEqual(dangling.unresolved, ['Q99999']);
  assert.deepEqual(dangling.records.map((r) => r.id), [best]);
  // Prose with no pointer is left to be shown as it is.
  assert.equal(resolvePointers('Economical technical housings and parts that benefit from acetone finishing.', evidenceById), null);
  // Words around the pointers survive, without the pointers.
  assert.equal(resolvePointers(`Brackets and jigs; family context in ${best}`, evidenceById).prose, 'Brackets and jigs');
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
  // Every one resolves, a family entry's or an alias's included: m141 made fifteen product lines aliases, and their
  // prose went with them, so the guard counts them all (50 on 2026-09-25) rather than the materials alone.
  assert.ok(pointing.length >= 50, `${pointing.length} pointing fields`);
  // Which records a material's prose points at (PVA's and BVOH's only at support guidance, so no Good for) is
  // materials.csv's; that every one resolves is the rule above.
});

test('grades group by maker, the named maker first, and none is lost', () => {
  // The material with the most makers (PLA, when this was written), and its typical product's maker named first.
  const makers = (m) => new Set(db.grades.filter((g) => g.materialId === m.id && !g.retired).map((g) => g.manufacturer)).size;
  const material = db.materials.filter((m) => m.headline.tensileModulusXY?.typical?.gradeId).sort((a, b) => makers(b) - makers(a))[0];
  const grades = db.grades.filter((g) => g.materialId === material.id && !g.retired);
  const typical = grades.find((g) => g.id === material.headline.tensileModulusXY.typical.gradeId);
  const groups = groupByMaker(grades, typical.manufacturer);
  assert.equal(groups.reduce((n, [, list]) => n + list.length, 0), grades.length);
  assert.equal(groups.length, makers(material), `${material.name}: one group per maker`);
  assert.ok(groups.length > 1, `${material.name} has one maker, so the order is untested`);
  assert.equal(groups[0][0], typical.manufacturer);
  for (const [maker, list] of groups) assert.ok(list.every((g) => g.manufacturer === maker), maker);
});
