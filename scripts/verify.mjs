#!/usr/bin/env node
// verify: everything to run before a commit, step by step, each step's time and the total (AGENTS.md, "The one rule").
//
//   npm run verify                      verify:fast's steps, then the ones below, every one run even if an earlier one failed
//   npm run verify -- --enforce-budget  and fail when verify:fast's total or the scale timings are over their budgets
//
// This was an `&&` chain, and a timing check slowed by a syncing disk stopped it before the data audit ran, which CI
// then failed. Now nothing hides anything: the run goes to the end and lists every failure. The scale timings are
// judged last, by scripts/scale-budget.mjs, so that a slow machine can only ever fail that one step. There is no
// overall budget for verify, only the total printed. Chrome is needed for the last two steps; a check that cannot run
// has not passed, so a missing browser is a failure here too.

import { runSteps, formatTable } from './lib/run-steps.mjs';
import { STEPS as FAST_STEPS, BUDGET_S } from './verify-fast.mjs';

const enforce = process.argv.includes('--enforce-budget');
const node = (...args) => [process.execPath, args];
const forward = enforce ? ['--enforce-budget'] : [];

const STEPS = [
  ...FAST_STEPS,
  // npm keeps the quoted test glob's shell behaviour, as `npm run test:ingest` always had.
  ['import tests', 'npm', ['run', 'test:ingest']],
  // The scale check's correctness assertions; its timings are written to build/reports/scale.json and judged below.
  ['scale', 'npm', ['run', 'scale']],
  ['reproducible', 'npm', ['run', 'reproducible']],
  ['data audit', ...node('scripts/audit-data.mjs')],
  ['context audit', ...node('scripts/audit/context-witness.mjs')],
  ['snapshot', ...node('scripts/snapshot.mjs', '--check')],
  ['interface views', ...node('scripts/ui-probe.mjs', '--require')],
  ['rendered scenarios', ...node('scripts/ui-fuzz.mjs', '--n', '300', '--require')],
  ['scale budget', ...node('scripts/scale-budget.mjs', ...forward)],
];

// verify:fast's own 90 s budget is about its own steps, so it is judged on them alone: the sum of their times, not the
// whole run's.
const fastNames = new Set(FAST_STEPS.map(([name]) => name));
const result = runSteps(STEPS);
console.log(formatTable('verify', result));
const fastSeconds = result.done.filter((s) => fastNames.has(s.name)).reduce((sum, s) => sum + s.seconds, 0);
const fastOver = fastSeconds > BUDGET_S;
console.log(`  verify:fast's steps  ${fastSeconds.toFixed(1).padStart(6)} s  ${fastOver ? 'OVER' : 'within'} the ${BUDGET_S} s budget`);
for (const s of result.failed) console.error(`verify: "${s.name}" failed (exit ${s.status}).`);
if (fastOver && enforce) console.error(`\nverify:fast's steps took ${fastSeconds.toFixed(1)} s, over their ${BUDGET_S} s budget (docs/GOALS.md, working rule 5).`);
if (result.failed.length) console.error(`\nverify: ${result.failed.length} of ${STEPS.length} step(s) failed: ${result.failed.map((s) => s.name).join(', ')}.`);
else if (!(fastOver && enforce)) console.log('\nverify: all steps passed.');
process.exit(result.failed.length || (fastOver && enforce) ? 1 : 0);
