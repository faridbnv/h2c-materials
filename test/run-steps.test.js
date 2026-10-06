// The keep-going step runner (scripts/lib/run-steps.mjs): a failing step must not stop the ones after it, and the
// result must say which failed. That is the whole reason `npm run verify` no longer chains its steps with `&&`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSteps, formatTable } from '../scripts/lib/run-steps.mjs';

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
