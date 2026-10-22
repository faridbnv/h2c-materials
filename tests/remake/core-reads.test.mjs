// WP-25: the tool that says which reads of the engine a field declaration misses (remake/tools/core-reads.mjs). It is how the
// declarations were first taken, and how a person finds the field to add when the core sufficiency check goes non-zero.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { CORE_FIELDS, ESTIMATE_FIELDS } from '../../packages/domain/src/core/core-fields.ts';
import { loadCorpus } from '../../packages/parity/src/corpus.ts';
import * as engineModule from '../../packages/engine/src/index.ts';
import * as registry from '../../app/js/ui/registry.js';
import { carries, isOverlay, misses, present, recording, traceReads } from '../../remake/tools/core-reads.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
let db;

before(() => {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
});

test('carries: a path is carried when the declaration names it or something above it; a wildcard covers a record keyed by data', () => {
  const spec = { rows: { id: true, nested: { a: true }, whole: true }, dict: { '*': { lo: true } } };
  for (const path of ['rows', 'rows[].id', 'rows[].nested', 'rows[].nested.a', 'rows[].whole', 'rows[].whole.anything.below', 'dict', 'dict.density', 'dict.density.lo']) assert.equal(carries(spec, path), true, path);
  for (const path of ['rows[].name', 'rows[].nested.b', 'dict.density.hi', 'other']) assert.equal(carries(spec, path), false, path);
});

test('present: a field no row has is not a miss, because there is nothing to lose', () => {
  const data = { rows: [{ id: 1 }, { id: 2, extra: { deep: 1 } }] };
  assert.equal(present(data, 'rows[].id'), true);
  assert.equal(present(data, 'rows[].extra.deep'), true);
  assert.equal(present(data, 'rows[].never'), false);
  assert.equal(present(data, 'nothing'), false);
});

test('recording sees what is read, with arrays as [], and not methods or the read of a position', () => {
  const reads = new Set();
  const p = recording({ a: [{ b: 1, c: { d: 2 } }], e: 3 }, reads);
  p.a.map((x) => x.b);
  void p.a[0].c.d;
  assert.deepEqual([...reads].sort(), ['a', 'a[].b', 'a[].c', 'a[].c.d']);
});

test('over the questions of one template, the declarations carry every read, in every mode', async () => {
  const cases = loadCorpus().cases.filter((c) => c.id.startsWith('template/outdoor-structural-part/'));
  assert.ok(cases.some((c) => c.scenario.useEstimates && c.scenario.unknownPolicy === 'exploration') && cases.some((c) => c.scenario.unknownPolicy === 'strict'));
  const reads = await traceReads({ db, cases, engineModule, register: (r) => registry.useRegistry(r) });
  assert.ok(reads.core.size > 300 && reads.estimated.size > reads.core.size, 'the engine reads hundreds of fields, and more with the estimates');
  assert.deepEqual(misses({ reads, db, coreSpec: CORE_FIELDS, estimateSpec: ESTIMATE_FIELDS, overlay: isOverlay }), []);
  // A declaration that lacks one field of them is told.
  const { specimenType: _dropped, ...measurements } = CORE_FIELDS.measurements;
  const missed = misses({ reads, db, coreSpec: { ...CORE_FIELDS, measurements }, estimateSpec: ESTIMATE_FIELDS, overlay: isOverlay });
  assert.ok(missed.some((m) => m.path === 'measurements[].specimenType' && m.in === 'core'), JSON.stringify(missed.slice(0, 3)));
  // The estimate stage's fields may live in the estimates part; a field of it the estimates part lacks is told as its own.
  const { centre: _centre, ...estimate } = ESTIMATE_FIELDS.grades.estimate['*'];
  const lacking = misses({ reads, db, coreSpec: CORE_FIELDS, estimateSpec: { ...ESTIMATE_FIELDS, grades: { ...ESTIMATE_FIELDS.grades, estimate: { '*': estimate } } }, overlay: isOverlay });
  assert.ok(lacking.some((m) => m.path === 'grades[].estimate.density.centre' && m.in === 'estimates'), JSON.stringify(lacking.slice(0, 3)));
});
