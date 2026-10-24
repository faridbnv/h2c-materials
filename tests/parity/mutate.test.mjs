// parity:mutate: nine faults into temporary copies, all caught; the real engine files hash the same before and after.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { FAULTS } from '../../packages/parity/src/faults.ts';
import { engineHashes, formatMutate, runMutate } from '../../packages/parity/src/mutate.ts';
import { cli, corpus, root, small, engineFiles, sha } from './helpers.mjs';

const run = (...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
const before = Object.fromEntries(engineFiles.map((f) => [f, sha(f)]));

test('runMutate: faults that show are caught, and a fault the cases cannot show is reported MISSED, not skipped', async () => {
  const blind = { name: 'blind-spot', description: 'a patch that changes nothing', expect: ['decision'], patches: [{ file: 'constraints.js', find: 'export const STATUS', replace: 'export const STATUS' }] };
  const gate = FAULTS.find((f) => f.name === 'gate-precedence');
  const r = await runMutate({ cases: small, faults: [gate, blind] });
  assert.deepEqual(r.rows.map((x) => [x.fault, x.caught]), [['gate-precedence', true], ['blind-spot', false]]);
  assert.equal(r.caught, 1);
  assert.equal(r.total, 2);
  assert.equal(r.engineUntouched, true);
  assert.equal(r.control.differences, 0, 'a copy with nothing planted differs nowhere');
  assert.match(formatMutate(r), /control: a copy with no fault planted gives 0 differences over the same 8 cases/);
  assert.equal(r.rows[1].differences, 0);
  assert.match(formatMutate(r), /MISSED {2}blind-spot/);
  assert.match(formatMutate(r), /MUTATE: 1\/2 caught/);
});

test('a fault is not "caught" if it moves some tier but not every tier it is known to move', async () => {
  const wrongTier = { name: 'wrong-tier', description: 'reworded reason but claims to move decisions', expect: ['decision'], patches: FAULTS.find((f) => f.name === 'reason-wording').patches };
  const r = await runMutate({ cases: small, faults: [wrongTier] });
  assert.equal(r.rows[0].caught, false);
  assert.deepEqual(r.rows[0].missed, ['decision']);
});

test('a fault that makes some cases unanswerable is not "caught" by the differences it still moves', async () => {
  const crashy = {
    name: 'crashy', description: 'throws on any scenario with three or more requirements', expect: ['decision'],
    patches: [{ file: 'constraints.js', find: 'export function evaluateMaterial(material, constraints, ctx = {}) {', replace: "export function evaluateMaterial(material, constraints, ctx = {}) {\n  if (constraints.length >= 3) throw new Error('planted crash');\n  if (constraints.length === 1) constraints = [];" }],
  };
  const cases = [...small.slice(0, 2), ...corpus.cases.filter((c) => c.group === 'census').slice(40, 44)];
  const r = await runMutate({ cases, faults: [crashy] });
  assert.ok(r.rows[0].casesNotComputable > 0 && r.rows[0].differences > 0, JSON.stringify(r.rows[0]));
  assert.equal(r.rows[0].caught, false);
  assert.match(formatMutate(r), /cases not computable/);
});

test('the engine hashes cover every engine file and are stable', () => {
  const h = engineHashes();
  assert.ok(Object.keys(h).length >= 10);
  assert.deepEqual(h, engineHashes());
  for (const f of engineFiles) assert.equal(h[f.split('/').pop()], before[f]);
});

test('CLI: --mutate runs alone; any other mode or selection is a usage error (64)', () => {
  for (const extra of [['--noop'], ['--new'], ['--fault', 'tie-order'], ['--milestone'], ['--only', 'template/'], ['--surface', 'engine'], ['--allow-partial']]) {
    const r = run('--mutate', ...extra);
    assert.equal(r.status, 64, extra.join(' '));
    assert.match(r.stderr, /--mutate runs alone/);
  }
});

test('CLI: --mutate with an unreadable db is a crash (70), not "9 of 9" and not "0 caught"', () => {
  const r = run('--mutate', '--db', '/no/such/db.json');
  assert.equal(r.status, 70);
  assert.match(r.stderr, /ENOENT/);
});

test('CLI: --list-faults lists nine', () => {
  const r = run('--list-faults');
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim().split('\n').length, 9);
});

test('package.json has parity:mutate and it runs the CLI in mutate mode', async () => {
  const { default: pkg } = await import('../../package.json', { with: { type: 'json' } });
  assert.equal(pkg.scripts['parity:mutate'], 'node packages/parity/src/cli.ts --mutate');
});

test('the nine faults over the full self-test cases, through the CLI (PARITY_FULL=1; about 4 minutes)', { skip: !process.env.PARITY_FULL }, () => {
  const r = spawnSync(process.execPath, [cli, '--mutate'], { cwd: root, encoding: 'utf8', timeout: 2_700_000 });
  assert.equal(r.status, 0, r.stderr + r.stdout.slice(-2000));
  assert.match(r.stdout, /MUTATE: 9\/9 caught/);
  assert.match(r.stdout, /real engine files unchanged \(sha256 before and after\): yes/);
});

test('the real engine files were never touched', () => {
  for (const f of engineFiles) assert.equal(sha(f), before[f], `${f} changed`);
});
