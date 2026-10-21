// The core-sufficiency hook (WP-25): an interface only. With nothing registered the check is not computable, never zero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runParity } from '../../packages/parity/src/compare.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { coreSufficiencyHook, registerCoreSufficiency, runCoreSufficiency } from '../../packages/parity/src/core-sufficiency.ts';
import { createOld, createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { cli, root, small } from './helpers.mjs';

test('no hook registered: not computable, with the reason, never zero', async () => {
  assert.equal(coreSufficiencyHook(), null);
  const r = await runCoreSufficiency({ cases: small, full: await createOld(readDb()), db: readDb() });
  assert.equal(r.kind, 'surface');
  assert.equal(r.report.status, 'not-computable');
  assert.equal(r.report.unitsCompared, 0);
  assert.match(r.report.notComputable[0].reason, /WP-25/);
});

test('CLI: --surface core is not computable (exit 2) and names WP-25; it is never part of a default run', () => {
  const r = spawnSync(process.execPath, [cli, '--surface', 'core', '--noop', '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stdout, /WP-25/);
  assert.match(r.stdout, /RESULT: not-computable/);
  const noop = spawnSync(process.execPath, [cli, '--noop', '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(noop.status, 0);
  assert.doesNotMatch(noop.stdout, /core sufficiency/);
});

test('a registered hook is run as a comparison: the full read model against the core adapter, over the same cases', async () => {
  registerCoreSufficiency({ coreAdapter: (db) => createOldAdapter({ name: 'old (core only)', db, engineDir: copyEngine([]) }) });
  assert.throws(() => registerCoreSufficiency({ coreAdapter: () => { throw new Error('x'); } }), /already registered/);
  const r = await runCoreSufficiency({ cases: small, full: await createOld(readDb()), db: readDb() });
  assert.equal(r.kind, 'parity');
  assert.equal(r.report.status, 'zero');
  assert.equal(r.report.casesCompared, small.length);
  assert.equal(r.report.after, 'old (core only)');
});

test('a core adapter that answers differently from the full model is named (this is the check that would have caught the Flexible count)', async () => {
  const full = await createOld(readDb());
  const wrong = { name: 'core with one count off', evaluate: (c) => { const n = full.evaluate(c); n.records.case.decision['counts.unknown'] += 1; return n; } };
  const r = await runParity({ corpusName: 'core-sufficiency', cases: small, before: full, after: wrong });
  assert.equal(r.status, 'differs');
  assert.ok(r.differences.every((d) => d.record === 'case' && d.field === 'counts.unknown'));
});
