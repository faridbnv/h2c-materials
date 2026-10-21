// parity:mutate (pack 07 section 5.7, pack 02 section 9.8): can the harness fail? Nine faults, each planted in a TEMPORARY copy of
// the old engine (faults.ts), each of which the comparison must name. 9 of 9 must be caught.
//
// The real engine files are only read. Their sha256 is taken before the first fault and after the last, and a difference is a
// crash of the self-test (exit 70): a fault that reached a real file would make every later result meaningless.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runParity } from './compare.ts';
import { ENGINE_DIR, copyEngine } from './engine-copy.ts';
import { FAULTS } from './faults.ts';
import type { Fault } from './faults.ts';
import { createOld, createOldAdapter, readDb } from './old-adapter.ts';
import type { Db } from './old-adapter.ts';
import type { CorpusCase, Tier } from './types.ts';
import { sha256Hex } from './util.ts';

/** sha256 of every .js file of the real engine, by name. */
export function engineHashes(dir: string = ENGINE_DIR): Record<string, string> {
  return Object.fromEntries(readdirSync(dir).filter((n) => n.endsWith('.js')).sort()
    .map((n) => [n, sha256Hex(readFileSync(join(dir, n)))]));
}

export interface MutateRow {
  fault: string;
  description: string;
  caught: boolean;
  /** The tiers the fault must show in, and the ones it did not. */
  expect: Tier[];
  missed: Tier[];
  differences: number;
  movedRecords: number;
  casesNotComputable: number;
  seconds: number;
}

export interface MutateResult {
  rows: MutateRow[];
  caught: number;
  total: number;
  casesPerFault: number;
  /** The control: a copy of the engine with NO fault, replayed over the same cases. It must differ from the engine nowhere. */
  control: { differences: number; seconds: number };
  engineUntouched: boolean;
  seconds: number;
}

/** A fault is caught when the comparison reports a difference in every tier the fault is known to move, and no case went uncomputed. */
export async function runMutate(opts: { cases: CorpusCase[]; faults?: readonly Fault[]; dbPath?: string; onFault?: (row: MutateRow) => void }): Promise<MutateResult> {
  const faults = opts.faults ?? FAULTS;
  const started = performance.now();
  const hashesBefore = engineHashes();
  const dbFor = (): Db => readDb(opts.dbPath);
  const before = await createOld(dbFor());
  // A harness that reports differences for a copy with nothing planted would call every fault caught. The control rules that out.
  const controlStarted = performance.now();
  const control = await runParity({
    corpusName: 'mutate-control', cases: opts.cases, before,
    after: await createOldAdapter({ name: 'old (control copy, no fault)', db: dbFor(), engineDir: copyEngine([]) }),
  });
  const controlSeconds = (performance.now() - controlStarted) / 1000;
  if (control.status !== 'zero') {
    throw new Error(`the control copy (no fault planted) is ${control.status} against the engine, with ${control.differences.length} differences: every "caught" would mean nothing, so the self-test is void`);
  }
  const rows: MutateRow[] = [];
  for (const fault of faults) {
    const t = performance.now();
    const after = await createOldAdapter({ name: `old + fault ${fault.name}`, db: dbFor(), engineDir: copyEngine(fault.patches) });
    const report = await runParity({ corpusName: 'mutate', cases: opts.cases, before, after });
    const tiers = new Set(report.differences.map((d) => d.tier));
    const missed = fault.expect.filter((tier) => !tiers.has(tier));
    const row: MutateRow = {
      fault: fault.name, description: fault.description, expect: fault.expect, missed,
      caught: report.differences.length > 0 && missed.length === 0 && report.casesNotComputable === 0,
      differences: report.differences.length, movedRecords: report.movedRecords.length, casesNotComputable: report.casesNotComputable,
      seconds: (performance.now() - t) / 1000,
    };
    rows.push(row);
    opts.onFault?.(row);
  }
  const hashesAfter = engineHashes();
  const engineUntouched = JSON.stringify(hashesBefore) === JSON.stringify(hashesAfter);
  return {
    rows, caught: rows.filter((r) => r.caught).length, total: rows.length, casesPerFault: opts.cases.length, engineUntouched,
    control: { differences: control.differences.length, seconds: controlSeconds },
    seconds: (performance.now() - started) / 1000,
  };
}

function formatRow(row: MutateRow): string {
  const verdict = row.caught ? 'CAUGHT ' : 'MISSED ';
  const notShown = row.missed.length ? ` (NOT in ${row.missed.join('+')})` : '';
  const notComputable = row.casesNotComputable ? `, ${row.casesNotComputable} cases not computable` : '';
  return `  ${verdict} ${row.fault.padEnd(20)} ${String(row.differences).padStart(7)} differences, ${String(row.movedRecords).padStart(5)} records moved, `
    + `must show in ${row.expect.join('+')}${notShown}${notComputable}  [${row.seconds.toFixed(1)}s]`;
}

export function formatMutate(r: MutateResult): string {
  const L: string[] = [`parity:mutate: ${r.total} faults planted in temporary copies of the old engine, each replayed over ${r.casesPerFault} cases`];
  L.push(`control: a copy with no fault planted gives ${r.control.differences} differences over the same ${r.casesPerFault} cases [${r.control.seconds.toFixed(1)}s]`);
  for (const row of r.rows) L.push(formatRow(row));
  L.push(`real engine files unchanged (sha256 before and after): ${r.engineUntouched ? 'yes' : 'NO'}`);
  L.push(`time: ${(r.seconds / 60).toFixed(1)} min`);
  L.push(`MUTATE: ${r.caught}/${r.total} caught`);
  return L.join('\n');
}
