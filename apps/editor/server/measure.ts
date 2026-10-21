// `npm run editor:measure`: how long the editor takes to be ready (WP-13 exit evidence: 3 s or less when the workspace is current,
// 02 section 11 / 05 section 11.7). Each run starts `apps/editor/server/start.ts` as a person would and waits for the ready line, so
// Node's own start, loading the code and opening the workspace are all inside the time. "Warm" is a workspace that is current with
// the data (the usual start); "cold" is the first start, which builds the workspace from the CSV first. Only the warm start has the
// budget. Writes remake/measure/editor.json.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const START = join(ROOT, 'apps/editor/server/start.ts');
const WARM_BUDGET_MS = 3000;
const WARM_RUNS = 5;

const { values } = parseArgs({ options: { out: { type: 'string' }, 'source-store': { type: 'string' } } });
const out = values.out ?? join(ROOT, 'remake/measure/editor.json');

interface Started { readonly wallMs: number; readonly readyMs: number }

/** One start: wall-clock time from spawning the process to its ready line, and the time the process itself reports. */
function startOnce(workspace: string): Promise<Started> {
  const began = performance.now();
  const args = [START, '--ready-line', '--workspace', workspace, ...(values['source-store'] === undefined ? [] : ['--source-store', values['source-store']])];
  const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let text = '';
  let errors = '';
  child.stderr.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
  return new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk: Buffer) => {
      text += chunk.toString();
      const line = text.split('\n').find((l) => l.startsWith('{'));
      if (line === undefined) return;
      const wallMs = performance.now() - began;
      const ready: unknown = JSON.parse(line);
      const readyMs = typeof ready === 'object' && ready !== null && 'readyMs' in ready && typeof ready.readyMs === 'number' ? ready.readyMs : Number.NaN;
      child.once('exit', () => resolve({ wallMs: Math.round(wallMs), readyMs }));
      child.kill('SIGTERM');
    });
    child.once('exit', (code) => { if (!text.includes('{')) reject(new Error(`the editor exited (${code}) before it was ready:\n${errors}`)); });
  });
}

const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? Number.NaN;

const scratch = mkdtempSync(join(tmpdir(), 'atlas-editor-measure-'));
try {
  const workspace = join(scratch, 'workspace');
  const cold = await startOnce(workspace);
  const warm: Started[] = [];
  for (let run = 0; run < WARM_RUNS; run++) warm.push(await startOnce(workspace));
  const wall = warm.map((r) => r.wallMs);
  const cpu = cpus()[0];
  const record = {
    schema: 1,
    status: 'measured',
    measuredAt: new Date().toISOString(),
    machine: { os: `${platform()} ${release()}`, arch: arch(), cpu: cpu?.model ?? 'unknown', cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30) },
    node: process.version,
    what: 'time from spawning `node apps/editor/server/start.ts` to its ready line (workspace open, service listening), the interface already built',
    sourceStore: values['source-store'] !== undefined || process.env.H2C_SOURCE_BACKUP !== undefined ? 'present' : 'absent',
    cold: { note: 'first start: the workspace is built from the CSV first', wallMs: cold.wallMs, readyMs: cold.readyMs },
    warm: { note: 'the workspace is current with the data', runsMs: wall, medianMs: median(wall), budgetMs: WARM_BUDGET_MS, withinBudget: median(wall) <= WARM_BUDGET_MS && Math.max(...wall) <= WARM_BUDGET_MS },
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`editor:measure  cold ${(cold.wallMs / 1000).toFixed(2)} s, warm median ${(record.warm.medianMs / 1000).toFixed(2)} s (budget ${WARM_BUDGET_MS / 1000} s)`);
  console.log(`wrote ${out}`);
  process.exitCode = record.warm.withinBudget ? 0 : 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
