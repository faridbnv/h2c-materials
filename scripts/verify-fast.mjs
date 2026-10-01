#!/usr/bin/env node
// verify:fast, step by step, with each step's time and the total against its budget (docs/GOALS.md, working rule 5:
// `npm run verify:fast` stays at or under 90 seconds; F16, review finding A11).
//
//   npm run verify:fast                          the steps below, in this order, stopping at the first that fails
//   npm run verify:fast -- --enforce-budget      and fail when the total is over the budget
//
// The steps are the ones the script chained with `&&` before it timed itself, in the same order, and a step that fails
// stops the rest as `&&` did. The budget is set on the owner's machine, so by default a slower one is told the total is
// over and still passes; --enforce-budget is for the machine the budget is set on, where an overrun is a failure.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_S = 90;
const node = (...args) => [process.execPath, args];
const STEPS = [
  ['format', ...node('scripts/data/fmt.mjs', '--check')],
  ['schema', ...node('scripts/data/check.mjs')],
  ['lint', ...node('scripts/data/lint.mjs')],
  ['rules doc', ...node('scripts/docs-rules.mjs', '--check')],
  ['dictionary doc', ...node('scripts/docs-dictionary.mjs', '--check')],
  ['decisions doc', ...node('scripts/docs-decisions.mjs', '--check')],
  // npm test builds first (its pretest, scripts/ensure-db.mjs), then runs every test file but the import pipeline's.
  ['build and tests', 'npm', ['test']],
  ['campaign docs', ...node('scripts/audit/coverage-campaign-status.mjs', '--check')],
];

const enforce = process.argv.includes('--enforce-budget');
const done = [];
let failed = null;
const started = performance.now();
for (const [name, command, args] of STEPS) {
  const t = performance.now();
  const r = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command === 'npm' });
  const seconds = (performance.now() - t) / 1000;
  const status = r.status ?? 1;
  done.push({ name, seconds, ok: status === 0 });
  if (status !== 0) { failed = { name, status }; break; }
}
const total = (performance.now() - started) / 1000;

const width = Math.max(...STEPS.map(([name]) => name.length), 'total'.length);
const row = (label, seconds, note = '') => `  ${label.padEnd(width)}  ${seconds.toFixed(1).padStart(6)} s${note ? `  ${note}` : ''}`;
const lines = ['', 'verify:fast'];
for (const s of done) lines.push(row(s.name, s.seconds, s.ok ? '' : 'FAILED'));
for (const [name] of STEPS.slice(done.length)) lines.push(`  ${name.padEnd(width)}       -    not run`);
const over = total > BUDGET_S;
lines.push(row('total', total, `${over ? 'OVER' : 'within'} the ${BUDGET_S} s budget`));
console.log(lines.join('\n'));

if (failed) {
  console.error(`\nverify:fast failed at "${failed.name}" (exit ${failed.status}).`);
  process.exit(failed.status || 1);
}
if (over && enforce) {
  console.error(`\nverify:fast took ${total.toFixed(1)} s, over its ${BUDGET_S} s budget (docs/GOALS.md, working rule 5).`);
  process.exit(1);
}
