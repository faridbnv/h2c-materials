#!/usr/bin/env node
// verify:fast, step by step, with each step's time and the total against its budget (docs/GOALS.md, working rule 5:
// `npm run verify:fast` stays at or under 90 seconds; F16, review finding A11).
//
//   npm run verify:fast                          the steps below, in this order, every one run even if an earlier one failed
//   npm run verify:fast -- --enforce-budget      and fail when the total is over the budget
//
// The steps are the ones the script chained with `&&` before it timed itself, in the same order; a step that fails no
// longer stops the rest (scripts/lib/run-steps.mjs says why), so one run shows every problem. The budget is set on the
// owner's machine, so by default a slower one is told the total is over and still passes; --enforce-budget is for the
// machine the budget is set on, where an overrun is a failure. The list is exported for scripts/verify.mjs, which runs
// it first.

import { fileURLToPath } from 'node:url';
import { main } from './lib/run-steps.mjs';

export const BUDGET_S = 90;
const node = (...args) => [process.execPath, args];
export const STEPS = [
  ['format', ...node('scripts/data/fmt.mjs', '--check')],
  ['schema', ...node('scripts/data/check.mjs')],
  ['lint', ...node('scripts/data/lint.mjs')],
  ['rules doc', ...node('scripts/docs-rules.mjs', '--check')],
  ['dictionary doc', ...node('scripts/docs-dictionary.mjs', '--check')],
  ['decisions doc', ...node('scripts/docs-decisions.mjs', '--check')],
  // npm test builds first (its pretest, scripts/ensure-db.mjs), then runs every test file but the import pipeline's.
  ['build and tests', 'npm', ['test']],
  ['campaign docs', ...node('scripts/audit/coverage-campaign-status.mjs', '--check')],
  // After the build: the README's plain status is counted from dist/db.json (D131).
  ['status doc', ...node('scripts/docs-status.mjs', '--check')],
];

// Run only when invoked directly, so scripts/verify.mjs can import the list without running it twice.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main('verify:fast', STEPS, { budgetS: BUDGET_S, enforce: process.argv.includes('--enforce-budget') });
}
