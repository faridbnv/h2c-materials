#!/usr/bin/env node
// WP-22 exit evidence, scripted: the old-adapter run of the Playwright suite equals the old CDP harness's results on the SAME build.
// Each step runs alone (the old harness failed on a shared machine, pack 07 section 2), and nothing here is a pass unless it ran:
//
//   1. the old probe (scripts/ui-probe.mjs) on this build: exit 0 means its 114 views equal build/snapshot/ui
//   2. the Playwright views suite, old adapter, over HTTP: every view it wrote equals the same snapshot file, byte for byte, and no
//      view is missing or extra
//   3. the old fuzz (scripts/ui-fuzz.mjs, 300 scenarios, seed 1) and the Playwright fuzz on the same seed: the same checks run per
//      invariant, and the same number of them are violated (none)
//   4. the same two with the oracle made wrong on purpose (FZ_MUTATE=rows, 60 scenarios): both must fail, and fail on the same invariants
//      the same number of times, which shows the port can fail where the old one can
//
//   node tests/browser/compare-old-harness.mjs [--skip-mutate]   writes remake/measure/browser/old-vs-port.json; exits 0 only if every step agrees
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir, cpus, platform, release } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const baseline = join(root, 'build', 'snapshot', 'ui');
const skipMutate = process.argv.includes('--skip-mutate');
const work = mkdtempSync(join(tmpdir(), 'wp22-compare-'));
const cli = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const config = join(root, 'tests', 'browser', 'playwright.config.mjs');
// The one Playwright project the comparison runs: the site under the live base path.
const PROJECT = 'live-path';
const steps = [];
const note = (name, ok, detail, seconds) => { steps.push({ name, ok, detail, seconds: Math.round(seconds) }); console.log(`${ok ? 'AGREE   ' : 'DISAGREE'} ${name}${detail ? `: ${detail}` : ''} (${Math.round(seconds)} s)`); };

function run(command, args, env = {}) {
  const t0 = Date.now();
  const r = spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}`, seconds: (Date.now() - t0) / 1000 };
}
const tail = (text, n = 3) => text.trim().split('\n').slice(-n).join(' | ');
const playwright = (files, env) => run(process.execPath, [cli, 'test', '-c', config, `--project=${PROJECT}`, ...files], { H2C_BROWSER_MODE: 'full', ...env });
const oldResults = (dir) => join(dir, 'results.json');
const portResults = (dir) => join(dir, PROJECT, 'results.json');
const invariantsOf = (file) => { const r = JSON.parse(readFileSync(file, 'utf8')); return { invariants: r.invariants, scenariosRun: r.scenariosRun, readings: r.readings }; };
const diffInvariants = (a, b) => {
  const names = [...new Set([...Object.keys(a.invariants), ...Object.keys(b.invariants)])].sort();
  return names.filter((n) => JSON.stringify(a.invariants[n]) !== JSON.stringify(b.invariants[n])).map((n) => `${n}: old ${JSON.stringify(a.invariants[n])}, port ${JSON.stringify(b.invariants[n])}`);
};
const differencesNote = (diff) => (diff.length ? `; differences: ${diff.join('; ')}` : '');

try {
  // 1. the old probe
  const probe = run(process.execPath, ['scripts/ui-probe.mjs']);
  note('old probe equals build/snapshot/ui (114 views, layout failures none)', probe.status === 0 && /114 views match/.test(probe.out) && /no layout failures/.test(probe.out), tail(probe.out, 2), probe.seconds);

  // 2. the port's views
  const viewsOut = join(work, 'views');
  const views = playwright(['views'], { H2C_BROWSER_VIEWS_OUT: viewsOut });
  const written = existsSync(join(viewsOut, PROJECT)) ? readdirSync(join(viewsOut, PROJECT)).filter((f) => f.endsWith('.txt')).sort() : [];
  const wanted = readdirSync(baseline).filter((f) => f.endsWith('.txt')).sort();
  const different = wanted.filter((f) => !written.includes(f) || readFileSync(join(viewsOut, PROJECT, f), 'utf8') !== readFileSync(join(baseline, f), 'utf8'));
  const extra = written.filter((f) => !wanted.includes(f));
  note(`port views (Playwright, HTTP) equal the old harness's ${wanted.length} views byte for byte`,
    views.status === 0 && wanted.length === 114 && written.length === 114 && different.length === 0 && extra.length === 0,
    views.status === 0 ? `${written.length} written; differing ${different.join(', ') || 'none'}; extra ${extra.join(', ') || 'none'}` : tail(views.out, 4), views.seconds);

  // 3. the fuzz, clean
  const oldFuzz = join(work, 'old-fuzz'), portFuzz = join(work, 'port-fuzz');
  const oldRun = run(process.execPath, ['scripts/ui-fuzz.mjs', '--n', '300', '--seed', '1', '--out', oldFuzz]);
  const portRun = playwright(['fuzz'], { H2C_FUZZ_N: '300', H2C_FUZZ_SEED: '1', H2C_BROWSER_FUZZ_OUT: portFuzz });
  const fuzzSeconds = oldRun.seconds + portRun.seconds;
  if (oldRun.status === 0 && portRun.status === 0 && existsSync(oldResults(oldFuzz)) && existsSync(portResults(portFuzz))) {
    const a = invariantsOf(oldResults(oldFuzz)), b = invariantsOf(portResults(portFuzz));
    const diff = diffInvariants(a, b);
    const total = Object.values(a.invariants).reduce((n, v) => n + v.checks, 0);
    note('port fuzz equals old fuzz (300 scenarios, seed 1): same checks per invariant, none violated', diff.length === 0 && a.scenariosRun === 300 && b.scenariosRun === 300 && a.readings === b.readings,
      `${total} checks over ${a.readings} readings in ${Object.keys(a.invariants).length} invariants; old ${oldRun.seconds.toFixed(0)} s, port ${portRun.seconds.toFixed(0)} s${differencesNote(diff)}`, fuzzSeconds);
  } else note('port fuzz equals old fuzz', false, `old exit ${oldRun.status} (${tail(oldRun.out, 2)}); port exit ${portRun.status} (${tail(portRun.out, 3)})`, fuzzSeconds);

  // 4. the fuzz with a wrong oracle: both must fail, in the same places
  if (!skipMutate) {
    const oldMutantDir = join(work, 'old-mutant'), portMutantDir = join(work, 'port-mutant');
    const oldMutant = run(process.execPath, ['scripts/ui-fuzz.mjs', '--n', '60', '--seed', '1', '--out', oldMutantDir], { FZ_MUTATE: 'rows' });
    const portMutant = playwright(['fuzz'], { H2C_FUZZ_N: '60', H2C_FUZZ_SEED: '1', H2C_BROWSER_FUZZ_OUT: portMutantDir, FZ_MUTATE: 'rows' });
    const mutantSeconds = oldMutant.seconds + portMutant.seconds;
    if (existsSync(oldResults(oldMutantDir)) && existsSync(portResults(portMutantDir))) {
      const a = invariantsOf(oldResults(oldMutantDir)), b = invariantsOf(portResults(portMutantDir));
      const diff = diffInvariants(a, b);
      const violations = Object.values(a.invariants).reduce((n, v) => n + v.violations, 0);
      note('with the oracle wrong on purpose (FZ_MUTATE=rows, 60 scenarios) both fail on the same invariants the same number of times',
        oldMutant.status !== 0 && portMutant.status !== 0 && violations > 0 && diff.length === 0, `${violations} violations in both${differencesNote(diff)}`, mutantSeconds);
    } else note('mutant fuzz', false, `no results: old exit ${oldMutant.status}, port exit ${portMutant.status}`, mutantSeconds);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}

const agree = steps.length > 0 && steps.every((s) => s.ok) && !skipMutate;   // a run without the mutant step has not shown the port can fail
const out = join(root, 'remake', 'measure', 'browser', 'old-vs-port.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  schema: 1, status: agree ? 'agree' : skipMutate && steps.every((s) => s.ok) ? 'incomplete (mutant step skipped)' : 'disagree', measuredAt: new Date().toISOString(), machine: { os: `${platform()} ${release()}`, cores: cpus().length, cpu: cpus()[0]?.model }, node: process.version,
  what: 'the old CDP harness (scripts/ui-probe.mjs, scripts/ui-fuzz.mjs) and the Playwright suite (old adapter, over HTTP) on one build, each run alone on an idle machine', steps,
}, null, 2)}\n`);
console.log(agree ? '\nold harness and port AGREE' : '\nold harness and port DISAGREE');
process.exit(agree ? 0 : 1);
