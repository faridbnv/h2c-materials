// parity -- --fault <name>: each injected fault must be named by the report, in the expected tier, in a TEMPORARY copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runParity } from '../../packages/parity/src/compare.ts';
import { FAULTS, faultByName } from '../../packages/parity/src/faults.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { createOld, createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { cli, root, subset, engineFiles, sha } from './helpers.mjs';

const before = Object.fromEntries(engineFiles.map((f) => [f, sha(f)]));

for (const fault of FAULTS) {
  test(`fault ${fault.name} is caught and the moved records are named`, async () => {
    const r = await runParity({
      corpusName: 'v0', cases: subset, before: await createOld(readDb()),
      after: await createOldAdapter({ name: `fault ${fault.name}`, db: readDb(), engineDir: copyEngine(fault.patches) }),
    });
    assert.equal(r.status, 'differs');
    assert.ok(r.differences.length > 0);
    assert.ok(r.movedRecords.length > 0, 'the report must name the moved records');
    for (const tier of fault.expect) assert.ok(r.differencesByTier[tier] > 0, `${fault.name}: expected a ${tier} difference`);
    for (const d of r.differences.slice(0, 50)) assert.ok(d.case && d.record && d.tier && d.field !== undefined && d.before !== d.after);
  });
}

test('a wording-only fault moves wording and nothing else', async () => {
  const f = faultByName('reason-wording');
  const r = await runParity({ corpusName: 'v0', cases: subset, before: await createOld(readDb()), after: await createOldAdapter({ name: 'w', db: readDb(), engineDir: copyEngine(f.patches) }) });
  assert.deepEqual([r.differencesByTier.decision, r.differencesByTier.presentation, r.differencesByTier.evidence], [0, 0, 0]);
  assert.ok(r.differencesByTier.wording > 0);
});

test('a fault patch that no longer matches the engine fails loudly instead of becoming a no-op', () => {
  assert.throws(() => copyEngine([{ file: 'constraints.js', find: 'this text is not in the engine', replace: 'x' }]), /found 0 occurrence/);
});

test('CLI: --fault exits 1 and names the fault and the moved records', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'tie-order', '--only', 'template/'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /fault tie-order: caught/);
  assert.match(r.stdout, /moved records \(\d+\)/);
  assert.match(r.stdout, /RESULT: differs/);
});

test('CLI: an unknown fault is refused', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'nope', '--only', 'template/'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /unknown fault/);
});

test('the real engine files were never touched', () => {
  for (const f of engineFiles) assert.equal(sha(f), before[f], `${f} changed`);
});
