// parity -- --fault <name>: each injected fault must be named by the report, in the expected tier, in a TEMPORARY copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { runParity } from '../../packages/parity/src/compare.ts';
import { FAULTS, faultByName } from '../../packages/parity/src/faults.ts';
import { copyEngine } from '../../packages/parity/src/engine-copy.ts';
import { createOldAdapter, readDb } from '../../packages/parity/src/old-adapter.ts';
import { CLI_ONLY, cli, root, sharedOld, subset, engineFiles, sha } from './helpers.mjs';

const before = Object.fromEntries(engineFiles.map((f) => [f, sha(f)]));
const reports = new Map();

// The nine replays (each over `subset`, about 240 cases) are the slow part of this file and are independent of each other, so
// they run in worker threads (fault-worker.mjs), all started by the first test that asks. Three workers of three faults each: every
// worker evaluates the old side once (the 240 answers it shares between its faults), so more workers only repeat that, and a fourth
// would finish no sooner than three while the nine do not divide by four. What each replay does is unchanged; only the thread.
let replays;
function replay(name) {
  if (!replays) {
    replays = new Map();
    const names = FAULTS.map((f) => f.name);
    const groups = Array.from({ length: Math.min(availableParallelism(), 3, names.length) }, () => []);
    names.forEach((n, i) => groups[i % groups.length].push(n));
    for (const faults of groups) {
      const pending = new Map(faults.map((n) => [n, Promise.withResolvers()]));
      for (const [n, d] of pending) { replays.set(n, d.promise); d.promise.catch(() => undefined); }
      const worker = new Worker(new URL('./fault-worker.mjs', import.meta.url), { workerData: { faults } });
      worker.on('message', (m) => (m.error === undefined ? pending.get(m.name).resolve(m.report) : pending.get(m.name).reject(new Error(`fault ${m.name}: ${m.error}`))));
      worker.on('error', (e) => { for (const d of pending.values()) d.reject(e); });
      worker.on('exit', (code) => { for (const [n, d] of pending) d.reject(new Error(`the worker for fault ${n} ended (exit ${code}) without a report`)); });
    }
  }
  return replays.get(name);
}

test('nine faults are planted, among them a flipped gate precedence, a swapped tie and a missing-state word turned into 0', () => {
  assert.equal(FAULTS.length, 9);
  assert.equal(new Set(FAULTS.map((f) => f.name)).size, 9);
  for (const name of ['gate-precedence', 'tie-order', 'missing-word-zero']) assert.ok(FAULTS.some((f) => f.name === name), name);
  for (const f of FAULTS) assert.ok(f.expect.length > 0 && f.patches.length > 0 && f.description, f.name);
  for (const f of FAULTS) for (const p of f.patches) assert.equal(p.file, 'constraints.js');
});

for (const fault of FAULTS) {
  test(`fault ${fault.name} is caught and the moved records are named`, async () => {
    const r = await replay(fault.name);
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
  // The report of this very fault over the same cases was made by its own test above; it is made here only when run alone.
  const r = reports.get(f.name) ?? await runParity({ corpusName: 'v0', cases: subset, before: await sharedOld(), after: await createOldAdapter({ name: 'w', db: readDb(), engineDir: copyEngine(f.patches) }) });
  assert.deepEqual([r.differencesByTier.decision, r.differencesByTier.presentation, r.differencesByTier.evidence], [0, 0, 0]);
  assert.ok(r.differencesByTier.wording > 0);
});

test('a fault patch that no longer matches the engine fails loudly instead of becoming a no-op', () => {
  assert.throws(() => copyEngine([{ file: 'constraints.js', find: 'this text is not in the engine', replace: 'x' }]), /found 0 occurrence/);
});

test('CLI: --fault exits 5 (caught: not 1, which is "differs", and not 70, a crash) and names the fault and the moved records', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'tie-order', '--only', CLI_ONLY, '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 5, r.stderr);
  assert.match(r.stdout, /fault tie-order: caught/);
  assert.match(r.stdout, /moved records \(\d+\)/);
  assert.match(r.stdout, /RESULT: differs/);
});

test('CLI: an unknown fault is refused as a usage error (64)', () => {
  const r = spawnSync(process.execPath, [cli, '--fault', 'nope', '--only', CLI_ONLY, '--allow-partial'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 64);
  assert.match(r.stderr, /unknown fault/);
});

test('the real engine files were never touched', () => {
  for (const f of engineFiles) assert.equal(sha(f), before[f], `${f} changed`);
});
