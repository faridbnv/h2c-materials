// npm run build:measure -- [--runs N] [--no-write]
//
// The cold-build time of the new build against the old one, on this machine, written to remake/measure/build.json (WP-20 exit
// evidence: a cold build no slower than the old tool's 26.4 s).
//
// "Cold" means no build cache: the new build has none, and the old one runs with H2C_NO_BUILD_CACHE=1 in a temporary copy of the
// project (so the project's dist/ and build/reports are untouched). Each run is a whole process, wall clock, from spawn to exit.
// Each run is two PAIRS, started together so that a busy machine hurts both halves of a pair alike: the new core beside the old core,
// and the old full build beside the old core. The ratio inside a pair and the difference inside a pair mean something on a busy
// machine; the absolute seconds do not, and the file says so (`budgetDecidable`). Every run is written down with the load average.
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
interface Run {
  /** Pair A: the new core and the old core, side by side. */
  newCore: number; oldCoreA: number; cpuNewCore: number; cpuOldCoreA: number;
  /** Pair B: the old full build and the old core, side by side. */
  oldFull: number; oldCoreB: number; cpuOldFull: number; cpuOldCoreB: number;
  load: number;
}
const runs: Run[] = [];
const newCoreArgs = ['--disable-warning=ExperimentalWarning', 'packages/build/src/cli.ts', '--out', out];
try {
  for (let i = 0; i < RUNS; i++) {
    const load = loadavg()[0] ?? 0;
    rmSync(join(out, 'db.json'), { force: true });
    const [newCore, oldCoreA] = await Promise.all([
      timeProcess(process.execPath, newCoreArgs, PROJECT_ROOT),
      timeProcess(process.execPath, ['build/src/index.js', '--validate-only'], copy, cold),
    ]);
    if (!existsSync(join(out, 'db.json'))) throw new Error('the new build exited 0 but wrote no db.json: its time is not a build time');
    const [oldFull, oldCoreB] = await Promise.all([
      timeProcess(process.execPath, ['build/src/index.js'], copy, cold),
      timeProcess(process.execPath, ['build/src/index.js', '--validate-only'], copy, cold),
    ]);
    runs.push({
      newCore: round(newCore.wall), oldCoreA: round(oldCoreA.wall), cpuNewCore: round(newCore.cpu), cpuOldCoreA: round(oldCoreA.cpu),
      oldFull: round(oldFull.wall), oldCoreB: round(oldCoreB.wall), cpuOldFull: round(oldFull.cpu), cpuOldCoreB: round(oldCoreB.cpu), load: round(load),
    });
    console.log(`run ${i + 1}/${RUNS} (load ${load.toFixed(1)}): pair A new core ${newCore.wall.toFixed(1)} s / old core ${oldCoreA.wall.toFixed(1)} s; pair B old full ${oldFull.wall.toFixed(1)} s / old core ${oldCoreB.wall.toFixed(1)} s`);
  }
} finally {
  rmSync(copy, { recursive: true, force: true });
}

const loadMax = Math.max(...runs.map((r) => r.load));
const quiet = loadMax <= cpus().length / 2;
const wallRatio = median(runs.map((r) => r.newCore / r.oldCoreA));
const cpuRatio = median(runs.map((r) => r.cpuNewCore / r.cpuOldCoreA));
const fullExtra = median(runs.map((r) => r.oldFull - r.oldCoreB));
const bestOldCore = Math.min(...runs.flatMap((r) => [r.oldCoreA, r.oldCoreB]));
const bestNewCore = Math.min(...runs.map((r) => r.newCore));
// What the old full build adds to its core (the bundle and the pages), the new core's time, and the budget: the like-for-like cold
// build. On a busy machine this is only as good as the load was low; it is decided against the budget only on a quiet one.
const likeForLike = bestNewCore + fullExtra;
const result = {
  schema: 1,
  // 'measured-under-load' says the machine was busy (load above half its cores) while this ran: every absolute time is inflated.
  status: quiet ? 'measured' : 'measured-under-load',
  loadMax: round(loadMax),
  measuredAt: new Date().toISOString(),
  machine: { os: `${platform()} ${release()}`, arch: arch(), cpu: cpus()[0]?.model ?? 'unknown', cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30) },
  node: process.version,
  what: 'whole-process time of cold builds (no build cache), in seconds, in two pairs per run started together: the new build core beside the old build core, and the old full build beside the old build core',
  runs,
  newCoreOverOldCore: { wall: round(wallRatio), cpu: round(cpuRatio), note: 'median of the ratios inside pair A: how much longer the new core takes than the old core under the same load' },
  oldFullMinusOldCoreSeconds: round(fullExtra),
  bestSeconds: { newCore: round(bestNewCore), oldCore: round(bestOldCore) },
  likeForLikeFullSeconds: round(likeForLike),
  likeForLike: 'best new core + (old full - old core, inside pair B): the new build plus what the old bundle and pages stages add, which the new build does not run yet',
  budgetSeconds: BUDGET_S,
  budgetDecidable: quiet,
  withinBudget: quiet ? likeForLike <= BUDGET_S : null,
};
console.log(`new core / old core, same load: wall x${result.newCoreOverOldCore.wall}, cpu x${result.newCoreOverOldCore.cpu}; old full adds ${result.oldFullMinusOldCoreSeconds} s; like-for-like ${result.likeForLikeFullSeconds} s against ${BUDGET_S} s (${quiet ? 'quiet machine' : 'machine busy: the budget is not decidable'})`);
if (!args.includes('--no-write')) {
  const path = join(PROJECT_ROOT, 'remake', 'measure', 'build.json');
  writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`written ${path}`);
}
