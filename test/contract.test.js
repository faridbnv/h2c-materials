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
  assert.ok(db.materials.every((m) => Object.values(m.headline).every((h) => !h.estimate)));
  assert.ok(db.grades.every((g) => g.estimate === undefined), 'a grade carries an estimate in the core build');
  assert.equal(db.meta.estimateModel, undefined);
});

// A grade estimate is the material's model predicted at the grade's own row (D81). Where a material's headline is
// itself an estimate from its representative grade's row, the two describe one product and must agree: the grade's
// centre inside the material's plausible range. And a grade estimate is never shown where the calibration said no.
test('a grade estimate agrees with its material\'s, and exists only where its calibration holds', () => {
  const db = read('db.json');
  const grades = new Map(db.grades.map((g) => [g.id, g]));
  let compared = 0, outside = 0;
  // A material's estimate stands in for each of its products (D83), so each product's own estimate lies inside it.
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      if (!h.estimate || h.estimate.sharedWith) continue;
      for (const id of m.gradeIds) {
        const g = grades.get(id)?.estimate?.[key];
        if (!g) continue;
        // A limit one of its products publishes holds the material's range (D78) and not another product's, and a
        // product's own related evidence may pull it outside what the material says of any product: either may put a
        // product beyond the material's range, and nothing else may.
        const held = (side) => h.estimate.bounds.some((b) => b.own != null && b.side === side);
        const inside = (g.centre >= h.estimate.plausible.lo || held('lower')) && (g.centre <= h.estimate.plausible.hi || held('upper'));
        assert.ok(inside || g.strength === 'this-grade',
          `${m.name} ${key}: ${id}'s centre ${g.centre} lies outside the material's plausible ${h.estimate.plausible.lo}-${h.estimate.plausible.hi} with no evidence of its own`);
        if (!inside) outside++;
        compared++;
      }
    }
  }
  assert.ok(compared > 100, `only ${compared} product estimates compared`);
  assert.ok(outside <= compared * 0.05, `${outside} of ${compared} product estimates lie outside their material's`);
  // A product with a comparable value of its own carries no estimate beside it.
  for (const g of db.grades) for (const [key, v] of Object.entries(g.headline ?? {})) assert.ok(!(v.level === 'comparable' && g.estimate?.[key]), `${g.id} ${key}`);
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
  // Rebuilt with the build cache off, so the stages really run again; dist/ may have come from the cache, and then this
  // also proves a stored result gives the bytes a cold build gives.
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore', env: { ...process.env, H2C_NO_BUILD_CACHE: '1' } });
  assert.deepEqual(hashes(), before);
  // And through the cache, which the build uses by default.
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore' });
  assert.deepEqual(hashes(), before);
  const manifest = read('manifest.json');
  assert.equal(manifest.outputs['db.json'], before['db.json']);
  assert.match(manifest.commit ?? '', /^[0-9a-f]{40}$/);
});
