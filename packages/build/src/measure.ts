// npm run build:measure -- [--runs N] [--no-write]
//
// The cold-build time of the new build against the old one, on this machine, written to remake/measure/build.json (WP-20 exit
// evidence: a cold build no slower than the old tool's 26.4 s).
//
// "Cold" means no build cache: the new build has none, and the old one runs with H2C_NO_BUILD_CACHE=1 in a temporary copy of the
// project (so the project's dist/ and build/reports are untouched). Each run is a whole process, wall clock, from spawn to exit.
// The runs alternate new, old core, old full, so a machine that gets busier hurts all three alike, and every run is written down
// with the load average, so a noisy measurement says so.
//
//   new core    packages/build/src/cli.ts: reconstruct, load, check, compile, estimate (the old stage), validate, db.json
//   old core    build/src/index.js --validate-only: the same stages on CSV, no db.json written
//   old full    build/src/index.js: the old core + db.json + the bundle + the material pages
//
// The new build does not run the bundle or the pages (the old ones, until their packages replace them), so the comparison with the
// 26.4 s budget is made on the like-for-like figure: the new core plus what the old full build adds to the old core.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { arch, cpus, loadavg, platform, release, tmpdir, totalmem } from 'node:os';
import { join } from 'node:path';
import { PROJECT_ROOT } from './build.ts';

const BUDGET_S = 26.4;
const args = process.argv.slice(2);
const runsAt = args.indexOf('--runs');
const RUNS = runsAt >= 0 ? Number(args[runsAt + 1]) : 3;
if (!Number.isInteger(RUNS) || RUNS < 1) throw new Error('--runs needs a whole number of at least 1');
const stray = args.filter((a, k) => !(a === '--runs' || a === '--no-write' || (k > 0 && args[k - 1] === '--runs')));
if (stray.length) throw new Error(`unknown argument ${stray.join(', ')}; known: --runs N, --no-write`);

interface Timing {
  /** Wall clock, spawn to exit, in seconds. */
  wall: number;
  /** User plus system CPU seconds of the process (from /usr/bin/time): much less moved by a busy machine than the wall clock. */
  cpu: number;
}

/** Wall and CPU time of a child process; a non-zero exit, or a missing CPU figure, is an error, never a time. */
function timeProcess(command: string, argv: readonly string[], cwd: string, env: Record<string, string> = {}): Promise<Timing> {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    const child = spawn('/usr/bin/time', ['-p', command, ...argv], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString('utf8')).slice(-4000); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${argv.join(' ')} exited ${String(code)}\n${stderr}`));
      const user = /^user ([\d.]+)$/m.exec(stderr)?.[1];
      const system = /^sys ([\d.]+)$/m.exec(stderr)?.[1];
      if (user === undefined || system === undefined) return reject(new Error(`/usr/bin/time gave no CPU figures:\n${stderr}`));
      resolve({ wall: (performance.now() - started) / 1000, cpu: Number(user) + Number(system) });
    });
  });
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  const upper = sorted[mid] ?? NaN;
  if (sorted.length % 2 === 1) return upper;
  return ((sorted[mid - 1] ?? NaN) + upper) / 2;
}

function round(x: number): number {
  return Math.round(x * 100) / 100;
}

// A temporary copy of the project for the old build, made once and outside the timings. As buildInCopy does it: build/src and the
// mappings are copied (the build finds the project from its own path), node_modules is linked.
const copy = mkdtempSync(join(tmpdir(), 'h2c-build-measure-'));
cpSync(join(PROJECT_ROOT, 'build', 'src'), join(copy, 'build', 'src'), { recursive: true });
cpSync(join(PROJECT_ROOT, 'build', 'mappings'), join(copy, 'build', 'mappings'), { recursive: true });
for (const f of ['package.json', 'package-lock.json']) cpSync(join(PROJECT_ROOT, 'build', f), join(copy, 'build', f));
if (!existsSync(join(PROJECT_ROOT, 'build', 'node_modules'))) throw new Error('build/node_modules is missing: run npm ci --prefix build');
symlinkSync(join(PROJECT_ROOT, 'build', 'node_modules'), join(copy, 'build', 'node_modules'), 'dir');
for (const d of ['schema', 'app', 'data']) cpSync(join(PROJECT_ROOT, d), join(copy, d), { recursive: true });
for (const f of ['package.json', 'package-lock.json']) cpSync(join(PROJECT_ROOT, f), join(copy, f));

const out = join(copy, 'new-out');
mkdirSync(out, { recursive: true });
const cold = { H2C_NO_BUILD_CACHE: '1' };
const runs: { newCore: number; oldCore: number; oldFull: number; cpuNewCore: number; cpuOldCore: number; cpuOldFull: number; load: number }[] = [];
try {
  for (let i = 0; i < RUNS; i++) {
    const load = loadavg()[0] ?? 0;
    rmSync(join(out, 'db.json'), { force: true });
    const newCore = await timeProcess(process.execPath, ['--disable-warning=ExperimentalWarning', 'packages/build/src/cli.ts', '--out', out], PROJECT_ROOT);
    if (!existsSync(join(out, 'db.json'))) throw new Error('the new build exited 0 but wrote no db.json: its time is not a build time');
    const oldCore = await timeProcess(process.execPath, ['build/src/index.js', '--validate-only'], copy, cold);
    const oldFull = await timeProcess(process.execPath, ['build/src/index.js'], copy, cold);
    runs.push({
      newCore: round(newCore.wall), oldCore: round(oldCore.wall), oldFull: round(oldFull.wall),
      cpuNewCore: round(newCore.cpu), cpuOldCore: round(oldCore.cpu), cpuOldFull: round(oldFull.cpu), load: round(load),
    });
    console.log(`run ${i + 1}/${RUNS}: wall new core ${newCore.wall.toFixed(1)} s, old core ${oldCore.wall.toFixed(1)} s, old full ${oldFull.wall.toFixed(1)} s; cpu ${newCore.cpu.toFixed(1)} / ${oldCore.cpu.toFixed(1)} / ${oldFull.cpu.toFixed(1)} s (load ${load.toFixed(1)})`);
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}

const loadMax = Math.max(...runs.map((r) => r.load));
const quiet = loadMax <= cpus().length / 2;
const medians = { newCore: median(runs.map((r) => r.newCore)), oldCore: median(runs.map((r) => r.oldCore)), oldFull: median(runs.map((r) => r.oldFull)) };
if (medians.oldFull < medians.oldCore) {
  throw new Error(`the old full build (${medians.oldFull} s) was faster than its own core (${medians.oldCore} s): the machine was too busy for these times to mean anything (load up to ${loadMax}); nothing written`);
}
const cpu = { newCore: median(runs.map((r) => r.cpuNewCore)), oldCore: median(runs.map((r) => r.cpuOldCore)), oldFull: median(runs.map((r) => r.cpuOldFull)) };
const likeForLike = medians.newCore + (medians.oldFull - medians.oldCore);
const result = {
  schema: 1,
  // 'measured-under-load' says the machine was busy (load above half its cores) while this ran: every time is inflated, and the
  // comparison with the budget is only as good as the two builds were alike in that.
  status: quiet ? 'measured' : 'measured-under-load',
  loadMax: round(loadMax),
  measuredAt: new Date().toISOString(),
  machine: { os: `${platform()} ${release()}`, arch: arch(), cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30) },
  node: process.version,
  what: 'whole-process wall time of a cold build (no build cache): the new build core, the old build core and the old full build, alternating, in seconds',
  runs,
  medianSeconds: { newCore: round(medians.newCore), oldCore: round(medians.oldCore), oldFull: round(medians.oldFull) },
  newCoreVsOldCoreSeconds: round(medians.newCore - medians.oldCore),
  cpuMedianSeconds: { newCore: round(cpu.newCore), oldCore: round(cpu.oldCore), oldFull: round(cpu.oldFull) },
  cpuNewCoreVsOldCoreSeconds: round(cpu.newCore - cpu.oldCore),
  likeForLikeFullSeconds: round(likeForLike),
  likeForLike: 'new core + (old full - old core): the new build plus what the old bundle and pages stages add, which the new build does not run yet',
  budgetSeconds: BUDGET_S,
  withinBudget: likeForLike <= BUDGET_S,
  newCoreWithinBudget: medians.newCore <= BUDGET_S,
};
console.log(`median: new core ${result.medianSeconds.newCore} s, old core ${result.medianSeconds.oldCore} s, old full ${result.medianSeconds.oldFull} s; like-for-like full ${result.likeForLikeFullSeconds} s against ${BUDGET_S} s`);
if (!args.includes('--no-write')) {
  const path = join(PROJECT_ROOT, 'remake', 'measure', 'build.json');
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`written ${path}`);
}
