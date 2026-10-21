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
const reports = new Map();

test('nine faults are planted, among them a flipped gate precedence, a swapped tie and a missing-state word turned into 0', () => {
  assert.equal(FAULTS.length, 9);
  assert.equal(new Set(FAULTS.map((f) => f.name)).size, 9);
  for (const name of ['gate-precedence', 'tie-order', 'missing-word-zero']) assert.ok(FAULTS.some((f) => f.name === name), name);
  for (const f of FAULTS) assert.ok(f.expect.length > 0 && f.patches.length > 0 && f.description, f.name);
  for (const f of FAULTS) for (const p of f.patches) assert.equal(p.file, 'constraints.js');
});

for (const fault of FAULTS) {
  test(`fault ${fault.name} is caught and the moved records are named`, async () => {
    const r = await runParity({
      corpusName: 'v0', cases: subset, before: await createOld(readDb()),
      after: await createOldAdapter({ name: `fault ${fault.name}`, db: readDb(), engineDir: copyEngine(fault.patches) }),
    });
    reports.set(fault.name, r);
    assert.equal(r.status, 'differs');
    assert.ok(r.differences.length > 0);
    assert.ok(r.movedRecords.length > 0, 'the report must name the moved records');
    for (const tier of fault.expect) assert.ok(r.differencesByTier[tier] > 0, `${fault.name}: expected a ${tier} difference`);
    for (const d of r.differences.slice(0, 50)) assert.ok(d.case && d.record && d.tier && d.field !== undefined && d.before !== d.after);
  });
}

test('the three faults added in WP-05 (b) move what they say they move', () => {
  const tiers = (name) => reports.get(name).differencesByTier;
  assert.ok(tiers('gate-precedence').decision > 0, 'a flipped precedence moves verdicts');
  assert.deepEqual([tiers('missing-word-zero').decision, tiers('missing-word-zero').presentation, tiers('missing-word-zero').wording], [0, 0, 0]);
  assert.ok(tiers('missing-word-zero').evidence > 0);
  assert.deepEqual([tiers('cited-sibling-swap').decision, tiers('cited-sibling-swap').wording], [0, 0], 'a swapped citation moves no verdict and no word');
  assert.ok(tiers('cited-sibling-swap').evidence > 0);
  const swap = reports.get('cited-sibling-swap').differences.find((d) => d.field === 'measurementId');
  assert.ok(swap && /^"V\d+"$/.test(swap.before) && /^"V\d+"$/.test(swap.after) && swap.before !== swap.after, JSON.stringify(swap));
  const zero = reports.get('missing-word-zero').differences.find((d) => d.field === 'missing');
  assert.ok(zero && zero.before === '"not-published"' && zero.after === '0', JSON.stringify(zero));
});

test('a wording-only fault moves wording and nothing else', async () => {
  const f = faultByName('reason-wording');
  const r = await runParity({ corpusName: 'v0', cases: subset, before: await createOld(readDb()), after: await createOldAdapter({ name: 'w', db: readDb(), engineDir: copyEngine(f.patches) }) });
  assert.deepEqual([r.differencesByTier.decision, r.differencesByTier.presentation, r.differencesByTier.evidence], [0, 0, 0]);
  assert.ok(r.differencesByTier.wording > 0);
});

test('a fault patch that no longer matches the engine fails loudly instead of becoming a no-op', () => {
  assert.throws(() => copyEngine([{ file: 'constraints.js', find: 'this text is not in the engine', replace: 'x' }]), /found 0 occurrence/);
});

test('CLI: --fault exits 5 (caught: not 1, which is "differs", and not 70, a crash) and names the fault and the moved records', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'tie-order', '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 5, r.stderr);
  assert.match(r.stdout, /fault tie-order: caught/);
  assert.match(r.stdout, /moved records \(\d+\)/);
  assert.match(r.stdout, /RESULT: differs/);
});

test('CLI: an unknown fault is refused as a usage error (64)', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'nope', '--only', 'template/', '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 64);
  assert.match(r.stderr, /unknown fault/);
});

test('the real engine files were never touched', () => {
  for (const f of engineFiles) assert.equal(sha(f), before[f], `${f} changed`);
});
