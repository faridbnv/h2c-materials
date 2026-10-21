// One side of a preview: compile a staged snapshot and ask every question of it. Runs in this thread for the changed side
// and in a worker thread (base-worker.ts) for the base side, so the two compiles and the two sets of runs overlap.
import type { Db } from '@atlas/data';
import { createContext } from '../context.ts';
import { scenarioFrom } from '../scenario.ts';
import { needsEstimates } from './cases.ts';
import type { ImpactCase } from './cases.ts';
import { compileSnapshot } from './compile.ts';
import { decisionsOf } from './diff.ts';
import type { Facts } from './diff.ts';
import type { StagedSnapshot } from './stage.ts';

export interface SideJob {
  readonly snapshot: StagedSnapshot;
  readonly cases: readonly ImpactCase[];
  readonly estimates: boolean;
}

/** Plain data (Maps of strings), so it crosses a worker boundary by structured clone. */
export interface SideAnswers {
  readonly decisions: ReadonlyMap<string, ReadonlyMap<string, Facts>>;
  readonly compileMs: number;
  readonly runMs: number;
}

/** Whole milliseconds since a `performance.now()` reading. */
export const elapsedMs = (since: number): number => Math.round(performance.now() - since);

export function ask(db: Db, cases: readonly ImpactCase[]): Map<string, Map<string, Facts>> {
  return new Map(cases.map((c) => [c.id, decisionsOf(createContext(db, scenarioFrom(c.question, db.meta)).run({ rankings: false }).rows)]));
}

export async function answerSide({ snapshot, cases, estimates }: SideJob): Promise<SideAnswers> {
  // Without the estimate stage the database holds no estimates, so a question that rests on them would be answered wrongly, not left out.
  const needing = cases.find(needsEstimates);
  if (!estimates && needing) throw new Error(`${needing.id} needs the estimate stage, which this side did not run`);
  let t = performance.now();
  const db = await compileSnapshot(snapshot, { estimates });
  const compileMs = elapsedMs(t);
  t = performance.now();
  return { decisions: ask(db, cases), compileMs, runMs: elapsedMs(t) };
}
