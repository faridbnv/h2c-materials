// npm run impact -- <change-set.json> [--estimates] [--json <file>]    which answers a change set would move
// npm run impact:measure [-- --change-set <file>] [--out <file>] [--full]    time the preview; write remake/measure/impact.json
//
// The change-set file is a ChangeSet (packages/domain/src/contracts/change.ts) or a bare list of its records. The preview
// stages the snapshot of this checkout and never writes anywhere else. Exit: 0 done (and, for measure, within budget);
// 1 a measured time is over its budget; 2 the preview was refused (a stale record, data that does not build); 64 bad usage.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, cpus, loadavg, platform, release, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { ImpactRefusal, impactRecordsOf, openImpactSession } from './impact/index.ts';
import type { ImpactRecords, ImpactReport } from './impact/index.ts';
import { REPO_ROOT } from './old-engine.ts';

const CORE_BUDGET_MS = 10_000;
const FULL_BUDGET_MS = 40_000;
const DEFAULT_CHANGE_SET = join(REPO_ROOT, 'tests', 'remake', 'fixtures', 'impact', 'fixture-tensile-correction.json');

const recordsOf = (file: string): ImpactRecords => impactRecordsOf(JSON.parse(readFileSync(file, 'utf8')));

function summary(r: ImpactReport): string {
  const lines = [
    `impact (${r.mode}): ${r.summary.moved} answer(s) moved on ${r.materials.length} material(s); ${r.listingShifts} listing shift(s)`,
    `questions: ${r.cases.answered} answered of ${r.cases.asked}${r.summary.estimatesPending ? `; ESTIMATES PENDING for ${r.cases.estimatesPending.length}` : ''}`,
    `by template: ${Object.entries(r.summary.byTemplate ?? {}).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`,
    `time: ${(r.timingsMs.total / 1000).toFixed(1)} s (${Object.entries(r.timingsMs).map(([k, v]) => `${k} ${v}`).join(', ')} ms)`,
  ];
  for (const m of r.moves.slice(0, 12)) lines.push(`  ${m.case} ${m.record}: ${m.changes.map((c) => `${c.field} ${c.before} -> ${c.after}`).join('; ')}`);
  if (r.moves.length > 12) lines.push(`  ... and ${r.moves.length - 12} more`);
  return lines.join('\n');
}

const median = (xs: readonly number[]): number => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};
const timing = (runs: readonly number[], budgetMs: number) => ({ runsMs: runs, medianMs: Math.round(median(runs)), budgetMs, withinBudget: median(runs) <= budgetMs });
const git = (...args: string[]) => execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

async function measure(records: ImpactRecords, changeSet: string, out: string, full: boolean): Promise<number> {
  const loadBefore = loadavg()[0] ?? 0;
  const cold: number[] = [];
  let last: ImpactReport | undefined;
  for (let run = 0; run < 3; run++) {
    const fresh = await openImpactSession();
    last = await fresh.preview(records);
    fresh.close();
    cold.push(last.timingsMs.total);
  }
  const session = await openImpactSession();
  await session.preview(records);
  const warm: number[] = [];
  for (let run = 0; run < 3; run++) warm.push((await session.preview(records)).timingsMs.total);
  session.close();
  if (!last) throw new Error('measure: no run happened');

  let estimates;
  if (full) {
    const fullSession = await openImpactSession({ estimates: true });
    const first = await fullSession.preview(records);
    const second = await fullSession.preview(records);
    fullSession.close();
    estimates = { cold: timing([first.timingsMs.total], FULL_BUDGET_MS), warm: timing([second.timingsMs.total], FULL_BUDGET_MS), moved: second.summary.moved };
  }
  const cpu = cpus()[0];
  const record = {
    schema: 1,
    status: 'measured',
    measuredAt: new Date().toISOString(),
    machine: { os: `${platform()} ${release()}`, arch: arch(), cpu: cpu?.model ?? 'unknown', cores: cpus().length, memoryGb: Math.round(totalmem() / 2 ** 30) },
    // One-minute load average before and after: a timing taken while other work runs says so.
    loadAverage1m: { before: Math.round(loadBefore * 10) / 10, after: Math.round((loadavg()[0] ?? 0) * 10) / 10 },
    node: process.version,
    commit: git('rev-parse', 'HEAD'),
    tree: git('status', '--porcelain').length ? 'dirty' : 'clean',
    changeSet: changeSet.startsWith(REPO_ROOT) ? changeSet.slice(REPO_ROOT.length) : changeSet,
    questions: { asked: last.cases.asked, answered: last.cases.answered, estimatesPending: last.cases.estimatesPending.length },
    moved: last.summary.moved,
    note: 'cold: a fresh session (the base answers are computed beside the change). warm: the base answers are kept; only the change is computed. Core compile, no estimate stage; the questions that need estimates are pending.',
    core: { cold: timing(cold, CORE_BUDGET_MS), warm: timing(warm, CORE_BUDGET_MS) },
    ...(estimates ? { withEstimates: estimates } : {}),
  };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`impact:measure  core cold median ${record.core.cold.medianMs} ms, warm median ${record.core.warm.medianMs} ms (budget ${CORE_BUDGET_MS} ms)${estimates ? `; with estimates cold ${estimates.cold.medianMs} ms, warm ${estimates.warm.medianMs} ms (budget ${FULL_BUDGET_MS} ms)` : ''}`);
  console.log(`wrote ${out}`);
  const ok = record.core.cold.withinBudget && record.core.warm.withinBudget && (!estimates || (estimates.cold.withinBudget && estimates.warm.withinBudget));
  return ok ? 0 : 1;
}

async function main(argv: readonly string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest, allowPositionals: true,
    options: { estimates: { type: 'boolean' }, json: { type: 'string' }, 'change-set': { type: 'string' }, out: { type: 'string' }, full: { type: 'boolean' } },
  });
  try {
    if (command === 'impact') {
      const [file] = positionals;
      if (!file) { console.error('impact: give a change-set file'); return 64; }
      const session = await openImpactSession({ estimates: values.estimates === true });
      const report = await session.preview(recordsOf(file)).finally(() => session.close());
      console.log(summary(report));
      if (values.json) writeFileSync(values.json, `${JSON.stringify(report, null, 1)}\n`);
      return 0;
    }
    if (command === 'measure') {
      const changeSet = values['change-set'] ?? DEFAULT_CHANGE_SET;
      return await measure(recordsOf(changeSet), changeSet, values.out ?? join(REPO_ROOT, 'remake', 'measure', 'impact.json'), values.full === true);
    }
  } catch (err) {
    if (err instanceof ImpactRefusal) { console.error(`impact: refused. ${err.message}`); return 2; }
    throw err;
  }
  console.error('usage: impact <change-set.json> [--estimates] [--json <file>] | measure [--change-set <file>] [--out <file>] [--full]');
  return 64;
}

process.exit(await main(process.argv.slice(2)));
