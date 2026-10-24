#!/usr/bin/env node
// The launcher of the browser suite (WP-22). It runs Playwright, then reads the verdict the tri-state reporter wrote and turns it
// into an exit code, so that "Playwright exited 0" is never taken for "the checks passed":
//
//   0  PASS      every planned check ran, under both base paths, and passed
//   1  FAIL      a check failed
//   3  SKIPPED   a check was skipped and is not named in tests/browser/allowed-skips.mjs, a planned check never reported (not run), or a named
//                allowance was never used (the check it excused now passes or is gone: remove it)
//   4  NO RESULT no verdict file for this run: Playwright could not start, crashed, or ran nothing
//
//   node tests/browser/run.mjs            the fast subset (npm run test:browser)
//   node tests/browser/run.mjs --full     everything (npm run test:browser:full)
//   --record                              also copy the verdict to remake/measure/browser/<mode>.json
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const known = new Set(['--full', '--record']);
const stray = args.filter((a) => !known.has(a));
if (stray.length) {
  console.error(`browser: unknown argument(s) ${stray.join(' ')}. This launcher always runs the whole suite, so its verdict means something; for a part, run\n  npx playwright test -c tests/browser/playwright.config.mjs --grep <title> --project <live-path|preview-path>`);
  process.exit(2);
}
const overrides = ['H2C_FUZZ_N', 'H2C_FUZZ_SEED', 'H2C_FUZZ_TABS', 'FZ_MUTATE', 'H2C_BROWSER_VIEWS_OUT'].filter((name) => process.env[name]);
if (overrides.length) {
  console.error(`browser: ${overrides.join(', ')} change what the suite runs, so its verdict would not mean the suite passed. Unset them (run playwright directly for an experiment).`);
  process.exit(2);
}
const full = args.includes('--full');
const mode = full ? 'full' : 'fast';
const runId = randomUUID();
const resultsFile = join(root, '.cache', 'browser-results', `results-${mode}.json`);
rmSync(resultsFile, { force: true });

const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
if (!existsSync(cli)) { console.error('browser: @playwright/test is not installed (npm ci)'); process.exit(4); }
const run = spawnSync(process.execPath, [cli, 'test', '-c', join(root, 'tests', 'browser', 'playwright.config.mjs')], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, H2C_BROWSER_MODE: mode, H2C_BROWSER_RUN_ID: runId, H2C_BROWSER_RESULTS: resultsFile },
});

const WORDS = { pass: 'PASS', fail: 'FAIL', skipped: 'SKIPPED', 'not-run': 'NOT RUN', 'stale-allowance': 'STALE ALLOWANCE' };
if (!existsSync(resultsFile)) { console.error(`browser: NO RESULT. Playwright exited ${run.status ?? run.signal} and wrote no verdict. Not a pass.`); process.exit(4); }
const verdict = JSON.parse(readFileSync(resultsFile, 'utf8'));
if (verdict.runId !== runId) { console.error('browser: NO RESULT. The verdict file belongs to another run. Not a pass.'); process.exit(4); }

const c = verdict.counts;
console.log(`\nbrowser (${mode}): ${WORDS[verdict.status]}. ${c.pass} pass, ${c.fail} fail, ${c.skipped} skipped (${c.allowedSkipped} named), ${c.notRun} not run, of ${c.planned} planned; ${(verdict.durationMs / 1000).toFixed(0)} s.`);
console.log(`  checked: ${verdict.evidence['views-checked']} views, ${verdict.evidence['scenarios-read']} scenarios read, ${verdict.evidence['axe-pages']} axe pages (axe reports but does not block)`);
for (const [name, p] of Object.entries(verdict.byProject)) console.log(`  ${name}: ${p.pass} pass, ${p.fail} fail, ${p.skipped} skipped`);
for (const t of verdict.tests.filter((x) => x.status === 'skipped')) console.log(`  ${t.allowed ? 'SKIPPED (named)' : 'SKIPPED (NOT NAMED)'} [${t.project}] ${t.title}: ${t.reason}`);
for (const t of verdict.tests.filter((x) => x.status === 'fail')) console.log(`  FAIL [${t.project}] ${t.title}: ${t.reason}`);
for (const a of verdict.unusedAllowances ?? []) console.log(`  STALE ALLOWANCE ${a}: no skipped check used it; remove it from tests/browser/allowed-skips.mjs`);
if (verdict.notRunProjects.length) console.log(`  NOT RUN: no check passed under ${verdict.notRunProjects.join(', ')}`);

if (args.includes('--record')) {
  const dest = join(root, 'remake', 'measure', 'browser');
  mkdirSync(dest, { recursive: true });
  copyFileSync(resultsFile, join(dest, `${mode}.json`));
}
const code = { pass: 0, fail: 1, skipped: 3, 'not-run': 3, 'stale-allowance': 3 }[verdict.status];
if (code === undefined) { console.error(`browser: unknown verdict "${verdict.status}"`); process.exit(4); }
// Playwright's own exit code must agree: a pass verdict with a failing Playwright is a harness fault, not a pass.
if (verdict.status === 'pass' && run.status !== 0) { console.error(`browser: the verdict says PASS but Playwright exited ${run.status}. Not a pass.`); process.exit(4); }
process.exit(code);
