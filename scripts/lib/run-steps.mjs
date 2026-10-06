// A step runner that keeps going. `npm run verify` used to be an `&&` chain, so the first step to fail hid every step
// after it: a timing check slowed by a syncing disk stopped the chain, the data audit behind it never ran, and CI then
// reported an audit failure the local run could have shown. Here every step runs whether or not an earlier one failed,
// the table says which took how long and which failed, and the exit code is non-zero if any did.
//
// A STEPS list is [name, command, args] triples. runSteps runs them and returns what happened without printing a table
// or exiting, so a test can drive it; main adds the table, a line per failure and the exit code, for the scripts.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Run every step in order. Returns { done, failed, total }: done holds one { name, seconds, status, ok } per step
// (all of them, in order), failed the ones with ok false, total the elapsed seconds. A step that cannot be started
// (the command is missing) has no exit status and counts as 1.
export function runSteps(steps, { cwd = root, log = () => {} } = {}) {
  const done = [];
  const started = performance.now();
  for (const [name, command, args] of steps) {
    log(name);
    const t = performance.now();
    const r = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' });
    const status = r.status ?? 1;
    done.push({ name, seconds: (performance.now() - t) / 1000, status, ok: status === 0 });
  }
  return { done, failed: done.filter((s) => !s.ok), total: (performance.now() - started) / 1000 };
}

// The timing table: one row per step with FAILED beside a failing one, then the total, against the budget when there
// is one.
export function formatTable(title, result, { budgetS = null } = {}) {
  const { done, total } = result;
  const width = Math.max(...done.map((s) => s.name.length), 'total'.length);
  const row = (label, seconds, note = '') => `  ${label.padEnd(width)}  ${seconds.toFixed(1).padStart(6)} s${note ? `  ${note}` : ''}`;
  const lines = ['', title];
  for (const s of done) lines.push(row(s.name, s.seconds, s.ok ? '' : 'FAILED'));
  lines.push(row('total', total, budgetS === null ? '' : `${total > budgetS ? 'OVER' : 'within'} the ${budgetS} s budget`));
  return lines.join('\n');
}

// Run, print the table and one line per failure, and exit non-zero if any step failed. The budget is set on the
// owner's machine, so by default a slower one is told the total is over and still passes; `enforce` is for the
// machine the budget is set on, where an overrun is a failure. budgetS null means there is no overall budget.
export function main(title, steps, { budgetS = null, enforce = false } = {}) {
  const result = runSteps(steps);
  console.log(formatTable(title, result, { budgetS }));
  const { failed, total } = result;
  for (const s of failed) console.error(`${title}: "${s.name}" failed (exit ${s.status}).`);
  const over = budgetS !== null && total > budgetS;
  if (over && enforce) console.error(`\n${title} took ${total.toFixed(1)} s, over its ${budgetS} s budget (docs/GOALS.md, working rule 5).`);
  if (failed.length) console.error(`\n${title}: ${failed.length} of ${steps.length} step(s) failed: ${failed.map((s) => s.name).join(', ')}.`);
  process.exit(failed.length || (over && enforce) ? 1 : 0);
}
