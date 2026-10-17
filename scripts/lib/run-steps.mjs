// A step runner that keeps going. `npm run verify` used to be an `&&` chain, so the first step to fail hid every step
// after it: a timing check slowed by a syncing disk stopped the chain, the data audit behind it never ran, and CI then
// reported an audit failure the local run could have shown. Here every step runs whether or not an earlier one failed,
// the table says which took how long and which failed, and the exit code is non-zero if any did.
//
// A STEPS list is [name, command, args, order?] entries. runSteps runs them one at a time; runGraph runs side by side
// the ones that do not need each other (2026-10-17, D144), which is most of verify: the documents' checks, the build,
// the audit and the browser checks read what they read and write nothing another step reads. `order` says what a step
// needs, and a step without it waits for every step before it, as in runSteps:
//
//   after   the names of the steps it follows (finished, passed or failed); '*' for every step listed before it. A name
//           not in the list is left out, so a group run on its own keeps the order of the steps it has.
//   cores   how many cores it keeps busy (default 1). A step that runs its own workers (the test runner, the browser's
//           tabs) says so, and steps start only while the cores they claim are free.
//   alone   nothing runs beside it: a step that is timed against a budget, or one that rewrites what other steps read.
//
// Both return what happened without printing a table or exiting, so a test can drive them; main adds the table, a line
// per failure and the exit code, for the scripts.

import { spawn, spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shell = (command) => process.platform === 'win32' && command === 'npm';

/** The cores this machine offers, as the test runner counts them. */
export const CORES = availableParallelism();
/** What a step that runs its own workers keeps busy: node --test runs one file per core but one. */
export const HEAVY = Math.max(1, CORES - 1);

// Run every step in order. Returns { done, failed, total }: done holds one { name, seconds, status, ok, start } per step
// (all of them, in order; start is when it began, in seconds from the first), failed the ones with ok false, total the
// elapsed seconds. A step that cannot be started (the command is missing) has no exit status and counts as 1.
export function runSteps(steps, { cwd = root, log = () => {} } = {}) {
  const done = [];
  const started = performance.now();
  for (const [name, command, args] of steps) {
    log(name);
    const t = performance.now();
    const r = spawnSync(command, args, { cwd, stdio: 'inherit', shell: shell(command) });
    const status = r.status ?? 1;
    done.push({ name, seconds: (performance.now() - t) / 1000, status, ok: status === 0, start: (t - started) / 1000 });
  }
  return { done, failed: done.filter((s) => !s.ok), total: (performance.now() - started) / 1000 };
}

/** Each step's name, command, args, the names it follows, its cores and whether it runs alone. */
export function planSteps(steps, { jobs = CORES } = {}) {
  const names = steps.map(([name]) => name);
  if (new Set(names).size !== names.length) throw new Error(`run-steps: a step name is used twice: ${names.join(', ')}`);
  return steps.map(([name, command, args, order], i) => {
    const before = names.slice(0, i);
    const after = !order || order.after === '*' ? before : (order.after ?? []).filter((n) => names.includes(n));
    const unknown = after.filter((n) => !before.includes(n));
    if (unknown.length) throw new Error(`run-steps: "${name}" follows ${unknown.join(', ')}, listed after it`);
    // A step that claims more cores than the run allows still runs, alone in all but name.
    return { name, command, args, after, cores: Math.min(Math.max(1, order?.cores ?? 1), jobs), alone: Boolean(order?.alone) };
  });
}

// Run the steps side by side where their order allows, at most `jobs` cores busy. A step's output is held until it
// finishes and then printed whole under its name, so two steps never interleave their lines; a step that runs alone
// prints as it goes. Every step runs whether or not the steps it follows passed, as in runSteps. Resolves to the same
// { done, failed, total } as runSteps, done in the order of the list, total the wall-clock seconds.
export function runGraph(steps, { cwd = root, jobs = CORES, write = (s) => process.stdout.write(s) } = {}) {
  const plan = planSteps(steps, { jobs });
  const started = performance.now();
  const at = () => (performance.now() - started) / 1000;
  const results = new Map();
  const running = new Map();
  const waiting = [...plan];
  return new Promise((resolve) => {
    const finish = (step, status, output, t) => {
      if (results.has(step.name)) return;
      running.delete(step.name);
      const r = { name: step.name, seconds: at() - t, status, ok: status === 0, start: t };
      results.set(step.name, r);
      const head = `── ${step.name}: ${r.ok ? 'passed' : `FAILED (exit ${status})`} in ${r.seconds.toFixed(1)} s, at ${at().toFixed(1)} s ──`;
      write(step.alone ? `${head}\n` : `\n${head}\n${output.join('')}${output.length && !output.at(-1).endsWith('\n') ? '\n' : ''}`);
      next();
    };
    const start = (step) => {
      running.set(step.name, step);
      const t = at();
      write(`▶ ${step.name} (at ${t.toFixed(1)} s)\n`);
      const output = [];
      let child;
      try {
        child = spawn(step.command, step.args, { cwd, stdio: step.alone ? 'inherit' : ['ignore', 'pipe', 'pipe'], shell: shell(step.command) });
      } catch (e) {
        // Finished on the next turn, so the loop that started it is not re-entered.
        output.push(`${e.message}\n`);
        return setImmediate(() => finish(step, 1, output, t));
      }
      child.stdout?.on('data', (d) => output.push(d.toString()));
      child.stderr?.on('data', (d) => output.push(d.toString()));
      child.on('error', (e) => { output.push(`${e.message}\n`); finish(step, 1, output, t); });
      child.on('close', (code) => finish(step, code ?? 1, output, t));
    };
    function next() {
      const busy = [...running.values()].reduce((n, s) => n + s.cores, 0);
      const aloneRunning = [...running.values()].some((s) => s.alone);
      let free = jobs - busy;
      for (const step of [...waiting]) {
        if (aloneRunning) break;
        if (!step.after.every((n) => results.has(n))) continue;
        if (step.alone) {
          // It starts once nothing runs, and nothing listed after it starts before it does.
          if (running.size === 0) { waiting.splice(waiting.indexOf(step), 1); start(step); }
          break;
        }
        if (step.cores > free) continue;
        waiting.splice(waiting.indexOf(step), 1);
        free -= step.cores;
        start(step);
      }
      if (!waiting.length && !running.size) {
        const done = plan.map((s) => results.get(s.name));
        resolve({ done, failed: done.filter((s) => !s.ok), total: at() });
      }
    }
    next();
  });
}

// The timing table: one row per step with FAILED beside a failing one, then the total, against the budget when there
// is one. Steps that ran side by side also say when each began, and the total is the wall clock.
export function formatTable(title, result, { budgetS = null } = {}) {
  const { done, total } = result;
  let end = -Infinity;
  const overlapped = [...done].filter((s) => s.start != null).sort((a, b) => a.start - b.start)
    .some((s) => { const o = s.start + 0.05 < end; end = Math.max(end, s.start + s.seconds); return o; });
  const width = Math.max(...done.map((s) => s.name.length), 'total'.length);
  const row = (label, seconds, note = '') => `  ${label.padEnd(width)}  ${seconds.toFixed(1).padStart(6)} s${note ? `  ${note}` : ''}`;
  const lines = ['', title];
  for (const s of done) lines.push(row(s.name, s.seconds, [s.ok ? '' : 'FAILED', overlapped ? `from ${s.start.toFixed(1)} s` : ''].filter(Boolean).join('  ')));
  const budget = budgetS === null ? '' : `${total > budgetS ? 'OVER' : 'within'} the ${budgetS} s budget`;
  lines.push(row('total', total, [overlapped ? 'wall clock; the steps above overlap' : '', budget].filter(Boolean).join(', ')));
  return lines.join('\n');
}

/** --serial runs one step at a time, as before 2026-10-17; --jobs N caps the cores. */
export function runOptions(argv = process.argv) {
  const i = argv.indexOf('--jobs');
  const jobs = i > 0 ? Number(argv[i + 1]) : CORES;
  if (!Number.isInteger(jobs) || jobs < 1) throw new Error(`--jobs takes a whole number of cores, not "${argv[i + 1]}"`);
  return { serial: argv.includes('--serial'), jobs };
}

// Run, print the table and one line per failure, and exit non-zero if any step failed. The budget is set on the
// owner's machine, so by default a slower one is told the total is over and still passes; `enforce` is for the
// machine the budget is set on, where an overrun is a failure. budgetS null means there is no overall budget.
export async function main(title, steps, { budgetS = null, enforce = false, serial = false, jobs = CORES } = {}) {
  const result = serial ? runSteps(steps) : await runGraph(steps, { jobs });
  console.log(formatTable(title, result, { budgetS }));
  const { failed, total } = result;
  for (const s of failed) console.error(`${title}: "${s.name}" failed (exit ${s.status}).`);
  const over = budgetS !== null && total > budgetS;
  if (over && enforce) console.error(`\n${title} took ${total.toFixed(1)} s, over its ${budgetS} s budget (docs/GOALS.md, working rule 5).`);
  if (failed.length) console.error(`\n${title}: ${failed.length} of ${steps.length} step(s) failed: ${failed.map((s) => s.name).join(', ')}.`);
  process.exit(failed.length || (over && enforce) ? 1 : 0);
}
