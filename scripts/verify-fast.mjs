#!/usr/bin/env node
// verify:fast, step by step, with each step's time and the total against its budget (docs/GOALS.md, working rule 5:
// `npm run verify:fast` stays at or under 90 seconds; F16, review finding A11).
//
//   npm run verify:fast                          the steps below, every one run even if another failed
//   npm run verify:fast -- --enforce-budget      and fail when the total is over the budget
//   npm run verify:fast -- --serial              one step at a time, in the order listed, as before 2026-10-17
//   npm run verify:fast -- --jobs 4              at most four cores busy (default: every core)
//
// A step that fails does not stop the rest (scripts/lib/run-steps.mjs says why), so one run shows every problem. The
// steps that do not need each other run side by side (D144): the documents' checks while the build runs, the tests and
// the README's status once it has; each step's output is printed whole when it finishes. The budget is set on the
// owner's machine, so by default a slower one is told the total is over and still passes; --enforce-budget is for the
// machine the budget is set on, where an overrun is a failure. The list is exported for scripts/verify.mjs, which runs
// it first.

import { fileURLToPath } from 'node:url';
import { main, runOptions, HEAVY } from './lib/run-steps.mjs';

export const BUDGET_S = 90;
const node = (...args) => [process.execPath, args];
const first = { after: [] };
const afterBuild = { after: ['build'] };
export const STEPS = [
  // The build first, since the tests wait for it; the checks of the tables and documents read nothing it writes.
  ['build', 'npm', ['run', 'build'], first],
  ['format', ...node('scripts/data/fmt.mjs', '--check'), first],
  ['schema', ...node('scripts/data/check.mjs'), first],
  ['lint', ...node('scripts/data/lint.mjs'), first],
  ['rules doc', ...node('scripts/docs-rules.mjs', '--check'), first],
  ['dictionary doc', ...node('scripts/docs-dictionary.mjs', '--check'), first],
  ['decisions doc', ...node('scripts/docs-decisions.mjs', '--check'), first],
  // Every test file but the import pipeline's, after the build, as `npm test` runs them after its pretest build (the
  // test runner expands the glob itself). The runner keeps one file per core but one busy.
  ['tests', ...node('--test', 'test/!(ingest-*).test.js'), { after: ['build'], cores: HEAVY }],
  // After the build: the README's plain status is counted from dist/db.json (D131).
  ['status doc', ...node('scripts/docs-status.mjs', '--check'), afterBuild],
];

// Run only when invoked directly, so scripts/verify.mjs can import the list without running it twice.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main('verify:fast', STEPS, { budgetS: BUDGET_S, enforce: process.argv.includes('--enforce-budget'), ...runOptions() });
}
