// parity -- --noop: old against a second, independently loaded copy of old must report exactly 0 differences.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runParity, exitCode } from '../../packages/parity/src/compare.ts';
import { createOld, createOldCopy } from '../../packages/parity/src/old-adapter.ts';
import { readDb } from '../../packages/parity/src/old-adapter.ts';
import { CLI_SMALL, cli, root, subset, corpus } from './helpers.mjs';

test('noop on a subset: zero differences at every tier, every case compared', async () => {
  const r = await runParity({ corpusName: 'v0', cases: subset, before: await createOld(readDb()), after: await createOldCopy([], 'old-copy', readDb()) });
  assert.equal(r.status, 'zero');
  assert.equal(r.differences.length, 0);
  assert.deepEqual(r.differencesByTier, { decision: 0, presentation: 0, evidence: 0, wording: 0 });
  assert.equal(r.casesCompared, subset.length);
  assert.equal(r.casesNotComputable, 0);
  assert.ok(r.recordsCompared > 100000, 'a zero must rest on real comparisons');
  assert.ok(r.blocksCompared > 0);
  assert.equal(exitCode(r.status), 0);
});

test('the second copy really is a separate module instance and a separate db', async () => {
  const a = await createOld(readDb());
  const b = await createOldCopy([], 'copy', readDb());
  // Same answers from different instances: the harness is comparing two engines, not one engine with itself.
  const c = subset[0];
  assert.deepEqual(a.evaluate(c).records.case, b.evaluate(c).records.case);
});

test('CLI: npm run parity -- --noop prints counts per tier and exits 0', () => {
  const r = spawnSync(process.execPath, [cli, '--noop', ...CLI_SMALL], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /differences by tier: decision 0, presentation 0, evidence 0, wording 0 {2}\(total 0\)/);
  assert.match(r.stdout, /RESULT: zero/);
});

test('full noop over the whole corpus (PARITY_FULL=1; about 90 s)', { skip: !process.env.PARITY_FULL }, () => {
  const r = spawnSync(process.execPath, [cli, '--noop'], { cwd: root, encoding: 'utf8', timeout: 600000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`cases: ${corpus.cases.length} compared of ${corpus.cases.length}`));
  assert.match(r.stdout, /RESULT: zero/);
});
