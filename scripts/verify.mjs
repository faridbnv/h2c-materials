#!/usr/bin/env node
// verify: everything to run before a commit, step by step, each step's time and the total (AGENTS.md, "The one rule").
//
//   npm run verify                      verify:fast's steps, then the ones below, every one run even if an earlier one failed
//   npm run verify -- --enforce-budget  and fail when verify:fast's total or the scale timings are over their budgets
//   node scripts/verify.mjs --group data|interface|trend   one group of the steps below (CI runs them as parallel jobs)
//
// This was an `&&` chain, and a timing check slowed by a syncing disk stopped it before the data audit ran, which CI
// then failed. Now nothing hides anything: the run goes to the end and lists every failure. The scale timings are
// judged last, by scripts/scale-budget.mjs, so that a slow machine can only ever fail that one step. There is no
// overall budget for verify, only the total printed. Chrome is needed for the interface steps; a check that cannot run
// has not passed, so a missing browser is a failure here too.
//
// The steps fall in three groups. Locally, before a commit, all three run (the default). CI runs "data" and
// "interface" side by side on every push to main and every pull request, and "trend" weekly: the scale check and the
// reproducible build watch how the build grows and whether it stays deterministic, which no single push's data
// decides, and they were a third of CI's time (the owner's decision of 2026-10-05, D131).

import { runSteps, formatTable } from './lib/run-steps.mjs';
import { STEPS as FAST_STEPS, BUDGET_S } from './verify-fast.mjs';

const enforce = process.argv.includes('--enforce-budget');
const node = (...args) => [process.execPath, args];
const forward = enforce ? ['--enforce-budget'] : [];

const GROUPS = {
  data: [
    ...FAST_STEPS,
    // npm keeps the quoted test glob's shell behaviour, as `npm run test:ingest` always had.
    ['import tests', 'npm', ['run', 'test:ingest']],
    ['data audit', ...node('scripts/audit-data.mjs')],
    ['context audit', ...node('scripts/audit/context-witness.mjs')],
    ['snapshot', ...node('scripts/snapshot.mjs', '--check')],
  ],
  interface: [
    // The page the views and scenarios read; a no-op where the data group already built it.
    ['page', 'npm', ['run', 'build']],
    ['interface views', ...node('scripts/ui-probe.mjs', '--require')],
    ['rendered scenarios', ...node('scripts/ui-fuzz.mjs', '--n', '300', '--require')],
  ],
  trend: [
    // The scale check's correctness assertions; its timings are written to build/reports/scale.json and judged last.
    ['scale', 'npm', ['run', 'scale']],
    ['reproducible', 'npm', ['run', 'reproducible']],
    ['scale budget', ...node('scripts/scale-budget.mjs', ...forward)],
  ],
};
const at = process.argv.indexOf('--group');
const group = at > 0 ? process.argv[at + 1] : null;
if (group && !GROUPS[group]) { console.error(`verify: no group "${group}"; the groups are ${Object.keys(GROUPS).join(', ')}`); process.exit(2); }
const STEPS = group ? GROUPS[group] : [...GROUPS.data, ...GROUPS.interface.slice(1), ...GROUPS.trend];

// verify:fast's own 90 s budget is about its own steps, so it is judged on them alone: the sum of their times, not the
// whole run's.
const fastNames = new Set(FAST_STEPS.map(([name]) => name));
const result = runSteps(STEPS);
console.log(formatTable(group ? `verify (${group})` : 'verify', result));
const fastSeconds = result.done.filter((s) => fastNames.has(s.name)).reduce((sum, s) => sum + s.seconds, 0);
const fastOver = fastSeconds > BUDGET_S;
if (!group || group === 'data') console.log(`  verify:fast's steps  ${fastSeconds.toFixed(1).padStart(6)} s  ${fastOver ? 'OVER' : 'within'} the ${BUDGET_S} s budget`);
for (const s of result.failed) console.error(`verify: "${s.name}" failed (exit ${s.status}).`);
if (fastOver && enforce) console.error(`\nverify:fast's steps took ${fastSeconds.toFixed(1)} s, over their ${BUDGET_S} s budget (docs/GOALS.md, working rule 5).`);
if (result.failed.length) console.error(`\nverify: ${result.failed.length} of ${STEPS.length} step(s) failed: ${result.failed.map((s) => s.name).join(', ')}.`);
else if (!(fastOver && enforce)) console.log('\nverify: all steps passed.');
process.exit(result.failed.length || (fastOver && enforce) ? 1 : 0);
