#!/usr/bin/env node
// verify: everything to run before a commit, step by step, each step's time and the total (AGENTS.md, "The one rule").
//
//   npm run verify                      verify:fast's steps, then the ones below, every one run even if another failed
//   npm run verify -- --enforce-budget  and fail when verify:fast's steps or the scale timings are over their budgets
//   npm run verify -- --serial          one step at a time, in the order listed, as before 2026-10-17
//   npm run verify -- --jobs 4          at most four cores busy (default: every core)
//   npm run verify -- --plan            print what each step follows, its cores and whether it runs alone; run nothing
//   node scripts/verify.mjs --group data|views|scenarios|interface|trend   one group of the steps below (CI runs them
//                                       as parallel jobs); --shard K/N runs the K-th of N parts of the rendered
//                                       scenarios (CI's scenario jobs), each scenario in exactly one part
//
// This was an `&&` chain, and a timing check slowed by a syncing disk stopped it before the data audit ran, which CI
// then failed. Now nothing hides anything: the run goes to the end and lists every failure. The scale timings are
// judged last, by scripts/scale-budget.mjs, so that a slow machine can only ever fail that one step. There is no
// overall budget for verify, only the total printed. Chrome is needed for the interface steps; a check that cannot run
// has not passed, so a missing browser is a failure here too.
//
// The steps that do not need each other run side by side (D144): the documents' checks, the build, the audit, the
// snapshot and the browser checks read what they read and write nothing another step reads. Each says what it follows
// (scripts/lib/run-steps.mjs). Three orders are kept on purpose: the import tests follow the unit tests, because they
// put their fixtures' text in .cache/text and a unit test and the context audit read that cache; the reproducible-build
// check runs alone, after every step that reads dist/, because it writes dist/ again; and the scale check runs alone,
// because it is timed.
//
// The steps fall in groups. Locally, before a commit, all of them run (the default). CI runs "data", "views" and
// "scenarios" (in three parts) side by side on every push to main and every pull request, and "trend" weekly: the scale
// check and the reproducible build watch how the build grows and whether it stays deterministic, which no single push's
// data decides, and they were a third of CI's time (the owner's decision of 2026-10-05, D131). "interface" is "views"
// and "scenarios" together.

import { runSteps, runGraph, runOptions, formatTable, planSteps, HEAVY, CORES } from './lib/run-steps.mjs';
import { STEPS as FAST_STEPS, BUDGET_S } from './verify-fast.mjs';

const enforce = process.argv.includes('--enforce-budget');
const node = (...args) => [process.execPath, args];
const forward = enforce ? ['--enforce-budget'] : [];
const valueOf = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; };
const shard = valueOf('--shard');
if (shard !== null && !/^[1-9]\d*\/[1-9]\d*$/.test(shard)) { console.error(`verify: --shard takes K/N, as 2/3, not "${shard}"`); process.exit(2); }

const afterBuild = { after: ['build'] };
// The page the views and scenarios read; where the data group runs too, it is that group's build.
const BUILD = ['build', 'npm', ['run', 'build'], { after: [] }];
const GROUPS = {
  data: [
    ...FAST_STEPS,
    // npm keeps the quoted test glob's shell behaviour, as `npm run test:ingest` always had. After the unit tests: it
    // writes its fixtures' text to .cache/text, and sqlite.test.js checks the full-text index wherever that cache is.
    ['import tests', 'npm', ['run', 'test:ingest'], { after: ['tests'], cores: HEAVY }],
    // The coverage campaign's generated status page; in verify:fast until 2026-10-15.
    ['campaign docs', ...node('scripts/audit/coverage-campaign-status.mjs', '--check'), afterBuild],
    ['data audit', ...node('scripts/audit-data.mjs'), afterBuild],
    // After the import tests, as it always ran: it reads .cache/text where there is one.
    ['context audit', ...node('scripts/audit/context-witness.mjs'), { after: ['import tests'] }],
    // After the build, so its build of the tables is the one the build stored (.cache/build).
    ['snapshot', ...node('scripts/snapshot.mjs', '--check'), afterBuild],
    // The material pages in dist/materials/ against the database they were rendered from (test/pages.check.js, P1 to
    // P14). After the build, which renders them (stage 8); it writes nothing another step reads.
    ['material pages', 'npm', ['run', 'pages:check'], afterBuild],
    // Every relative link in the Markdown leads somewhere, and every round's exported packets are recorded (D138).
    ['links', ...node('scripts/docs-links.mjs', '--check'), { after: [] }],
    ['packets', ...node('scripts/data/packets.mjs', '--check'), { after: [] }],
  ],
  views: [
    BUILD,
    // One page at a time in one browser.
    ['interface views', ...node('scripts/ui-probe.mjs', '--require'), afterBuild],
  ],
  scenarios: [
    BUILD,
    // Eight tabs: it keeps up to eight cores busy.
    ['rendered scenarios', ...node('scripts/ui-fuzz.mjs', '--n', '300', '--require', ...(shard ? ['--shard', shard] : [])), { after: ['build'], cores: Math.min(8, CORES) }],
  ],
  trend: [
    // The page and dist/db.json the reproducible-build check compares a rebuild with. CI's trend job starts from a bare
    // checkout, and without this the check found no dist/db.json (the weekly run of 2026-10-11).
    BUILD,
    // The scale check's correctness assertions; its timings are written to build/reports/scale.json and judged last.
    // Alone and after every other step, so nothing else runs while it is timed.
    ['scale', 'npm', ['run', 'scale'], { after: '*', alone: true }],
    // Alone and after every step that reads dist/, which it rebuilds twice.
    ['reproducible', 'npm', ['run', 'reproducible'], { after: '*', alone: true }],
    // Alone: on a miss it runs the scale check again, which is timed.
    ['scale budget', ...node('scripts/scale-budget.mjs', ...forward), { after: ['scale'], alone: true }],
  ],
};
GROUPS.interface = [BUILD, GROUPS.views[1], GROUPS.scenarios[1]];
const at = process.argv.indexOf('--group');
const group = at > 0 ? process.argv[at + 1] : null;
if (group && !GROUPS[group]) { console.error(`verify: no group "${group}"; the groups are ${Object.keys(GROUPS).join(', ')}`); process.exit(2); }
if (shard && group && !GROUPS[group].some(([name]) => name === 'rendered scenarios')) { console.error(`verify: --shard divides the rendered scenarios, which group "${group}" does not run`); process.exit(2); }
// Locally every group runs, and the build is the data group's: the other groups' own build steps are left out.
const unique = (steps) => steps.filter(([name], i) => steps.findIndex(([n]) => n === name) === i);
const fastNames = new Set(FAST_STEPS.map(([name]) => name));
// verify:fast's own 90 s budget is about its own steps, so it is judged on them alone: the time from the start until
// the last of them finished (the sum of their times when they run one at a time), not the whole run's. Where it is
// enforced, verify:fast's steps run first with nothing beside them, as `npm run verify:fast` runs them, so a budget
// that fails is their own time and not time shared with the audit and the browser checks.
const fence = (steps) => steps.map(([name, command, args, order]) => (fastNames.has(name) || order?.after === '*' ? [name, command, args, order]
  : [name, command, args, { ...order, after: [...new Set([...(order?.after ?? []), ...fastNames])] }]));
const listed = group ? GROUPS[group] : unique([...GROUPS.data, ...GROUPS.interface, ...GROUPS.trend]);
const STEPS = enforce ? fence(listed) : listed;

const { serial, jobs } = runOptions();
if (process.argv.includes('--plan')) {
  for (const s of planSteps(STEPS, { jobs })) console.log(`${s.name.padEnd(20)} ${String(s.cores).padStart(2)} core(s)${s.alone ? ', alone' : ''}; after ${s.after.length ? s.after.join(', ') : 'nothing'}`);
  process.exit(0);
}
const result = serial ? runSteps(STEPS) : await runGraph(STEPS, { jobs });
console.log(formatTable(group ? `verify (${group})` : 'verify', result));
const fastSeconds = Math.max(0, ...result.done.filter((s) => fastNames.has(s.name)).map((s) => s.start + s.seconds));
const fastOver = fastSeconds > BUDGET_S;
const beside = !serial && !enforce ? ' (beside the other steps; --enforce-budget runs them on their own)' : '';
if (!group || group === 'data') console.log(`  verify:fast's steps  ${fastSeconds.toFixed(1).padStart(6)} s  ${fastOver ? 'OVER' : 'within'} the ${BUDGET_S} s budget${beside}`);
for (const s of result.failed) console.error(`verify: "${s.name}" failed (exit ${s.status}).`);
if (fastOver && enforce) console.error(`\nverify:fast's steps took ${fastSeconds.toFixed(1)} s, over their ${BUDGET_S} s budget (docs/GOALS.md, working rule 5).`);
if (result.failed.length) console.error(`\nverify: ${result.failed.length} of ${STEPS.length} step(s) failed: ${result.failed.map((s) => s.name).join(', ')}.`);
else if (!(fastOver && enforce)) console.log('\nverify: all steps passed.');
process.exit(result.failed.length || (fastOver && enforce) ? 1 : 0);
