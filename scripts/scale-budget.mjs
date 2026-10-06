#!/usr/bin/env node
// The scale timings, judged against their budgets (test/scale.check.js writes them to build/reports/scale.json and
// keeps the history the budgets were set against).
//
//   npm run scale:budget                       print the table; a miss is a warning
//   npm run scale:budget -- --enforce-budget   a miss that survives a re-run is a failure (so is it when CI is set)
//
// The timings used to be assertions inside the scale check. On a slow machine, one syncing a folder to the cloud for
// instance, a clock failure stopped `npm run verify` there and the data audit behind it never ran locally; CI then
// failed the audit and the local run had nothing to show for it. Correctness stays in the check, which now fails only
// for a wrong result. Time is judged here, last, and only where the machine can be held to it: CI, and the machine the
// budgets were set on (--enforce-budget). Anywhere else an overrun is a warning, because a slow machine says nothing
// about the code. A miss gets one re-run of `npm run scale`, and each timing is the better of the two runs, since one
// slow minute is noise and two are not.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = join(root, 'build', 'reports', 'scale.json');
const TIMINGS = ['gateMs', 'compileMs', 'noEstimatesMs'];
const enforce = process.argv.includes('--enforce-budget') || Boolean(process.env.CI);

function readReport() {
  try {
    return JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch (e) {
    console.error(`scale budget: cannot read build/reports/scale.json (${e.code ?? e.message}). Run \`npm run scale\` first; it writes the timings this judges.`);
    process.exit(1);
  }
}

const over = (r) => TIMINGS.filter((k) => r[k] > r.budgets[k]);

let report = readReport();
let reran = false;
if (over(report).length) {
  console.log(`scale budget: ${over(report).join(', ')} over budget; running \`npm run scale\` once more and keeping the better of the two.`);
  const first = report;
  const r = spawnSync('npm', ['run', 'scale'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  reran = true;
  // A failed re-run has not rewritten the report, so the first run's figures stand.
  const second = r.status === 0 ? readReport() : first;
  report = { ...second, ...Object.fromEntries(TIMINGS.map((k) => [k, Math.min(first[k], second[k])])) };
}

const width = Math.max(...TIMINGS.map((k) => k.length));
const lines = ['', `scale budget (${report.materials} materials, ${report.measurements} measurements, ${report.date}${reran ? ', best of two runs' : ''})`];
for (const k of TIMINGS) {
  lines.push(`  ${k.padEnd(width)}  ${String(report[k]).padStart(7)} ms  of ${String(report.budgets[k]).padStart(7)} ms  ${report[k] > report.budgets[k] ? 'OVER' : 'ok'}`);
}
console.log(lines.join('\n'));

const missed = over(report);
if (!missed.length) process.exit(0);
const what = missed.map((k) => `${k} ${report[k]} ms > ${report.budgets[k]} ms`).join(', ');
if (enforce) {
  console.error(`\nscale budget: over budget after a re-run: ${what}.`);
  process.exit(1);
}
console.warn(`\nwarning: scale budget: over budget: ${what}. Not a failure here; --enforce-budget (or CI) makes it one, on the machine the budgets were set on.`);
