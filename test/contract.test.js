// The runtime contract (schema/db.schema.json, schema/reference.schema.json) and the reproducible build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractIssues } from '../build/src/contract.js';
import { loadTables } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { compileReference } from '../build/src/reference.js';
import { readSource } from '../build/src/source.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, 'dist', f), 'utf8'));

test('the compiled database and reference match their contract', () => {
  assert.deepEqual(contractIssues({ db: read('db.json'), reference: read('reference.json') }), []);
});

// The estimate stage is an overlay (D58): the database without it is complete, valid and within the contract, so no
// check, headline or gate of the core can rest on inference.
test('the core database without the estimate stage validates and meets the contract', () => {
  const wb = loadTables(join(root, 'data'));
  const { db, issues } = buildDatabase(wb, { build: '2026-09-15', estimates: false });
  assert.deepEqual(issues.filter((i) => i.level === 'error').map((i) => `${i.code} ${i.where}`), []);
  const { referenceRows, referenceWhere } = readSource(root);
  const reference = compileReference(referenceRows, [], referenceWhere, db.registry);
  assert.deepEqual(contractIssues({ db, reference }), []);
  assert.ok(db.materials.every((m) => Object.values(m.headline).every((h) => !h.estimate && !h.loadBracket)));
  assert.ok(db.grades.every((g) => g.estimate === undefined), 'a grade carries an estimate in the core build');
  assert.equal(db.meta.estimateModel, undefined);
});

// A grade estimate is the material's model predicted at the grade's own row (D81). Where a material's headline is
// itself an estimate from its representative grade's row, the two describe one product and must agree: the grade's
// centre inside the material's plausible range. And a grade estimate is never shown where the calibration said no.
test('a grade estimate agrees with its material\'s, and exists only where its calibration holds', () => {
  const db = read('db.json');
  const grades = new Map(db.grades.map((g) => [g.id, g]));
  let compared = 0;
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      const g = grades.get(m.representativeGrade)?.estimate?.[key];
      if (!h.estimate || !g || h.estimate.sharedWith) continue;
      assert.ok(g.centre >= h.estimate.plausible.lo && g.centre <= h.estimate.plausible.hi,
        `${m.name} ${key}: the representative grade's centre ${g.centre} lies outside the material's plausible ${h.estimate.plausible.lo}-${h.estimate.plausible.hi}`);
      compared++;
    }
  }
  assert.ok(compared > 100, `only ${compared} representative-grade estimates compared`);
  for (const [key, p] of Object.entries(db.meta.estimateModel.properties)) {
    if (p.gradeCalibration.shipped) continue;
    assert.ok(db.grades.every((g) => !g.estimate?.[key]), `${key}: grade estimates shipped where the calibration said no`);
  }
});

test('a renamed, dropped, retyped or unexpected field is reported at its path', () => {
  const db = read('db.json');
  const reference = read('reference.json');
  const pla = db.materials.findIndex((m) => m.name === 'PLA');
  delete db.materials[pla].headline.density.unit;
  db.measurements[0].valeu = db.measurements[0].value;
  db.grades[2].retired = 'no';
  delete db.registry;
  const messages = contractIssues({ db, reference }).map((i) => `${i.where}  ${i.message.replace(/ \(schema.*$/, '')}`);
  assert.deepEqual(messages.sort(), [
    "dist/db.json/  must have required property 'registry'",
    `dist/db.json/grades/2/retired  must be boolean`,
    `dist/db.json/materials/${pla}/headline/density  must have required property 'unit'`,
    'dist/db.json/measurements/0  must NOT have additional properties ("valeu")',
  ].sort());
});

test('building the same tree twice produces the same bytes', () => {
  const hashes = () => Object.fromEntries(['db.json', 'reference.json', 'manifest.json'].map((f) => [f, createHash('sha256').update(readFileSync(join(root, 'dist', f))).digest('hex')]));
  const before = hashes();
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore' });
  assert.deepEqual(hashes(), before);
  const manifest = read('manifest.json');
  assert.equal(manifest.outputs['db.json'], before['db.json']);
  assert.match(manifest.commit ?? '', /^[0-9a-f]{40}$/);
});
