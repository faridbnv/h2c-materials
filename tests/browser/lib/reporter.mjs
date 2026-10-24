// A Playwright reporter that keeps three outcomes apart (pack 07 section 7.2): PASS, FAIL, and everything that did not pass without
// failing, each with its reason. A test that was skipped, interrupted, or planned and never reported is NOT a pass, and a run in which
// nothing ran is not a pass either. The verdict and every test's outcome go to a JSON file the launcher (tests/browser/run.mjs) reads
// and checks against its own run ID, so a stale file from an earlier run cannot be mistaken for this one.
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_SKIPS, allowanceFor } from '../allowed-skips.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const RESULTS_FILE = process.env['H2C_BROWSER_RESULTS'] ?? join(root, '.cache', 'browser-results', 'results.json');

/** What a passing test says it checked: numbers it put in annotations (views compared, scenarios read, pages scanned by axe). */
const EVIDENCE = ['views-checked', 'scenarios-read', 'axe-pages'];
function evidenceOf(test) {
  const out = {};
  for (const a of test.annotations) if (EVIDENCE.includes(a.type)) out[a.type] = (out[a.type] ?? 0) + Number(a.description ?? 0);
  return out;
}
const sumEvidence = (tests) => Object.fromEntries(EVIDENCE.map((k) => [k, tests.filter((x) => x.status === 'pass').reduce((n, x) => n + (x.evidence?.[k] ?? 0), 0)]));

// titlePath() is ['', project, file, ...describe, title]: the title a skip is named by is what follows the file.
const titleOf = (test) => test.titlePath().slice(3).join(' > ');

/** What one finished test adds to its record: its status, and the evidence, reason or error that goes with it. */
function outcomeOf(test, result, title) {
  switch (result.status) {
    case 'passed':
      return { status: 'pass', evidence: evidenceOf(test) };
    case 'skipped': {
      const reason = test.annotations.find((a) => a.type === 'skip')?.description ?? 'no reason given';
      const allowed = allowanceFor(title);
      return { status: 'skipped', reason, allowed: allowed !== null, allowedBy: allowed?.reason };
    }
    case 'interrupted':
      return { status: 'not-run', reason: 'interrupted' };
    default:
      return { status: 'fail', reason: result.status === 'timedOut' ? 'timed out' : 'failed', error: (result.error?.message ?? '').split('\n').slice(0, 12).join('\n') };
  }
}

/**
 * The named allowances (allowed-skips.mjs) no skipped test used. An allowance that matches a test which ran and passed is stale, and so is one that
 * matches no test at all when the whole suite ran (`full`): the check it excused is gone or renamed. A subset run (`fast`) does not plan every check,
 * so there an allowance that matches nothing planned is not judged.
 * @param {{ titles: string[], tests: { title: string, status: string }[], full: boolean, allowances?: { match: RegExp }[] }} run
 */
export function unusedAllowances({ titles, tests, full, allowances = ALLOWED_SKIPS }) {
  return allowances.filter((a) => {
    if (tests.some((t) => t.status === 'skipped' && a.match.test(t.title))) return false;
    return full || titles.some((title) => a.match.test(title));
  }).map((a) => String(a.match));
}

/** The verdict of a run from its tests: 'pass' only when something ran, everything planned reported, and nothing failed or was skipped unnamed (or an allowance went unused). */
export function verdict({ planned, tests, interrupted = false, unused = [] }) {
  const count = (status) => tests.filter((t) => t.status === status).length;
  const notRun = planned - tests.length + count('not-run');
  const counts = { planned, pass: count('pass'), fail: count('fail'), skipped: count('skipped'), allowedSkipped: tests.filter((t) => t.status === 'skipped' && t.allowed).length, notRun };
  const unnamed = counts.skipped - counts.allowedSkipped;
  let status = 'pass';
  if (planned === 0) status = 'not-run';
  else if (counts.fail > 0) status = 'fail';
  else if (counts.pass === 0) status = 'not-run';
  else if (interrupted || notRun > 0) status = 'not-run';
  else if (unnamed > 0) status = 'skipped';
  else if (unused.length > 0) status = 'stale-allowance';
  return { status, counts };
}

export default class TriStateReporter {
  constructor() { this.planned = []; this.tests = new Map(); this.started = Date.now(); }
  printsToStdio() { return false; }
  onBegin(config, suite) {
    this.mode = process.env['H2C_BROWSER_MODE'] ?? 'fast';
    this.planned = suite.allTests().map((t) => t.id);
    this.titles = suite.allTests().map((t) => titleOf(t));
    this.projects = config.projects.map((p) => p.name);
  }
  onTestEnd(test, result) {
    const base = { project: test.parent.project()?.name ?? '?', file: test.titlePath()[2] ?? '?', title: titleOf(test), ms: result.duration };
    this.tests.set(test.id, { ...base, ...outcomeOf(test, result, base.title) });
  }
  onEnd(result) {
    const tests = [...this.tests.values()];
    const unused = unusedAllowances({ titles: this.titles ?? [], tests, full: this.mode === 'full' });
    const { status, counts } = verdict({ planned: this.planned.length, tests, interrupted: result.status === 'interrupted', unused });
    const byProject = Object.fromEntries((this.projects ?? []).map((name) => {
      const mine = tests.filter((t) => t.project === name);
      return [name, { pass: mine.filter((t) => t.status === 'pass').length, fail: mine.filter((t) => t.status === 'fail').length, skipped: mine.filter((t) => t.status === 'skipped').length }];
    }));
    // The suite runs under every base path; a path with no passing test did not pass, whatever the others did.
    const emptyProjects = Object.entries(byProject).filter(([, v]) => v.pass === 0).map(([name]) => name);
    const finalStatus = status === 'pass' && emptyProjects.length ? 'not-run' : status;
    const out = {
      schema: 1, runId: process.env['H2C_BROWSER_RUN_ID'] ?? null, mode: this.mode, status: finalStatus, counts, byProject,
      evidence: sumEvidence(tests), unusedAllowances: unused, notRunProjects: emptyProjects, durationMs: Date.now() - this.started,
      machine: { os: `${platform()} ${release()}`, cores: cpus().length, node: process.version }, tests,
    };
    mkdirSync(dirname(RESULTS_FILE), { recursive: true });
    writeFileSync(RESULTS_FILE, `${JSON.stringify(out, null, 2)}\n`);
  }
}
