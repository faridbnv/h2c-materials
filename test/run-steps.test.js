// The keep-going step runner (scripts/lib/run-steps.mjs): a failing step must not stop the ones after it, and the
// result must say which failed. That is the whole reason `npm run verify` no longer chains its steps with `&&`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSteps, runGraph, planSteps, formatTable } from '../scripts/lib/run-steps.mjs';

// A step that leaves a marker file, then exits with the given status.
const step = (name, dir, status) => [name, process.execPath, ['-e', `require('fs').writeFileSync(${JSON.stringify(join(dir, name))}, ''); process.exit(${status})`]];

test('every step runs although the middle one fails, and the failure is named', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-steps-'));
  try {
    const steps = [step('first', dir, 0), step('second', dir, 3), step('third', dir, 0)];
    const { done, failed, total } = runSteps(steps);
    assert.deepEqual(done.map((s) => s.name), ['first', 'second', 'third']);
    assert.ok(['first', 'second', 'third'].every((n) => existsSync(join(dir, n))), 'every step left its marker');
    assert.deepEqual(failed.map((s) => [s.name, s.status]), [['second', 3]]);
    assert.ok(total >= 0);
    const table = formatTable('test', { done, total });
    assert.match(table, /second\s+\d+\.\d s\s+FAILED/);
    assert.doesNotMatch(table, /first.*FAILED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('all steps passing leaves nothing failed', () => {
  const { done, failed } = runSteps([['ok', process.execPath, ['-e', '0']]]);
  assert.equal(done.length, 1);
  assert.deepEqual(failed, []);
});

test('a command that cannot start counts as a failure and the run goes on', () => {
  const { done, failed } = runSteps([['missing', 'h2c-no-such-command', []], ['after', process.execPath, ['-e', '0']]]);
  assert.deepEqual(done.map((s) => s.ok), [false, true]);
  assert.equal(failed[0].status, 1);
});

// The side-by-side runner (runGraph, D144): the same promise as runSteps, that every step runs and every failure is
// named, and three more: a step starts only after the steps it follows, a step that runs alone has the machine to itself,
// and no more cores are claimed than the run allows. Each step below writes when it began and ended to a file of its own.
// Two steps that must run side by side meet: each marks that it has begun and ends only once the other has begun too,
// so they overlap however slowly a loaded machine starts them, and a run that kept them apart would time out.
const timed = (name, dir, { ms = 50, status = 0, say = '', meet = null } = {}) => [name, process.execPath, ['-e',
  `const fs = require('fs'); const t = Date.now(); const at = (n) => ${JSON.stringify(dir)} + '/' + n;
   fs.writeFileSync(at(${JSON.stringify(`${name}.begun`)}), ''); process.stdout.write(${JSON.stringify(say)});
   const end = () => { fs.writeFileSync(at(${JSON.stringify(name)}), JSON.stringify([t, Date.now()])); process.exit(${status}); };
   const wait = () => (${JSON.stringify(meet)} === null || fs.existsSync(at(${JSON.stringify(`${meet}.begun`)})) ? setTimeout(end, ${ms})
     : Date.now() - t > 20000 ? process.exit(9) : setTimeout(wait, 10));
   wait();`]];
const span = (dir, name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
const overlaps = (a, b) => a[0] < b[1] && b[0] < a[1];

test('side by side: every step runs although one fails, and a step starts after the ones it follows', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-graph-'));
  try {
    const writes = [];
    const steps = [
      [...timed('build', dir, { meet: 'check' }), { after: [] }],
      [...timed('check', dir, { status: 2, meet: 'build' }), { after: [] }],
      [...timed('tests', dir), { after: ['build'] }],
      [...timed('audit', dir), { after: ['build', 'check'] }],
    ];
    const { done, failed, total } = await runGraph(steps, { jobs: 4, write: (s) => writes.push(s) });
    assert.deepEqual(done.map((s) => s.name), ['build', 'check', 'tests', 'audit'], 'reported in the order of the list');
    assert.deepEqual(failed.map((s) => [s.name, s.status]), [['check', 2]]);
    assert.ok(overlaps(span(dir, 'build'), span(dir, 'check')), 'the two steps that follow nothing ran side by side');
    assert.ok(span(dir, 'tests')[0] >= span(dir, 'build')[1] && span(dir, 'audit')[0] >= span(dir, 'build')[1]);
    assert.ok(span(dir, 'audit')[0] >= span(dir, 'check')[1], 'a failed step is still followed');
    assert.ok(total < done.reduce((n, s) => n + s.seconds, 0), 'the wall clock is less than the steps one after another');
    assert.match(formatTable('test', { done, total }), /check\s+\d+\.\d s\s+FAILED\s+from \d+\.\d s/);
    assert.match(writes.join(''), /── check: FAILED \(exit 2\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('side by side: a step that runs alone has the machine to itself, and the cores are never over-claimed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-graph-'));
  try {
    const steps = [
      [...timed('a', dir, { meet: 'b' }), { after: [] }],
      [...timed('b', dir, { meet: 'a' }), { after: [] }],
      [...timed('heavy', dir), { after: [], cores: 2 }],
      [...timed('timed', dir), { after: '*', alone: true }],
      [...timed('later', dir), { after: ['a'] }],
    ];
    await runGraph(steps, { jobs: 2, write: () => {} });
    const s = Object.fromEntries(['a', 'b', 'heavy', 'timed', 'later'].map((n) => [n, span(dir, n)]));
    assert.ok(overlaps(s.a, s.b), 'two one-core steps share two cores');
    assert.ok(!overlaps(s.heavy, s.a) && !overlaps(s.heavy, s.b), 'a two-core step does not start beside them on two cores');
    for (const n of ['a', 'b', 'heavy', 'later']) assert.ok(!overlaps(s.timed, s[n]), `nothing ran beside the step that runs alone (${n})`);
    // Once a lone step can start, a step listed after it that could start too waits for it.
    await runGraph([[...timed('x', dir), { after: [] }], [...timed('lone', dir), { after: ['x'], alone: true }], [...timed('y', dir), { after: ['x'] }]], { jobs: 4, write: () => {} });
    assert.ok(span(dir, 'y')[0] >= span(dir, 'lone')[1], 'a step listed after the lone step waits for it');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('side by side: a step waiting for cores is not overtaken by the steps listed after it', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-graph-'));
  try {
    // On two cores: while 'first' runs, 'heavy' cannot start, and 'small' (one core, free) must not start before it.
    await runGraph([[...timed('first', dir), { after: [] }], [...timed('heavy', dir), { after: [], cores: 2 }], [...timed('small', dir), { after: [] }]], { jobs: 2, write: () => {} });
    assert.ok(span(dir, 'heavy')[0] >= span(dir, 'first')[1], 'the two-core step waited for the core in use');
    assert.ok(span(dir, 'small')[0] >= span(dir, 'heavy')[1], 'the step listed after it did not take the free core first');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('side by side: a step without an order follows every step before it, and output is printed whole', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-graph-'));
  try {
    const writes = [];
    const steps = [[...timed('one', dir, { say: 'first line\nsecond line\n' }), { after: [] }], timed('two', dir), ['missing', 'h2c-no-such-command', []]];
    const { done } = await runGraph(steps, { jobs: 4, write: (s) => writes.push(s) });
    assert.ok(span(dir, 'two')[0] >= span(dir, 'one')[1]);
    assert.deepEqual(done.map((s) => s.ok), [true, true, false], 'a command that cannot start is a failure');
    assert.match(writes.join(''), /── one: passed in \d+\.\d s, at \d+\.\d s ──\nfirst line\nsecond line\n/);
    assert.throws(() => planSteps([['x', 'true', [], { after: ['y'] }], ['y', 'true', []]]), /listed after it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
