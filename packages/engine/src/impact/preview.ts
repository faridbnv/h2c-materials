// The impact preview (02 sections 5 and 11): given the records of a change set, which answers would move?
//
// A session pins one staged snapshot. Its base answers are computed once (the first preview pays for them) and kept; each
// preview stages the snapshot with the records applied, compiles it with the old build's core compile, asks the same
// questions of both sides with the same engine as the site (the wrapper), and returns the records whose decision differs.
// Both sides are compiled from the one staged copy, so the working tree changing under a preview cannot make them disagree.
import { rmSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import type { ChangeRecord, DecisionDiffSummary, MaterialId, ReleaseId } from '@atlas/domain';
import { materialIdOf } from '../guards.ts';
import { REPO_ROOT } from '../old-engine.ts';
import { loadImpactCases, needsEstimates } from './cases.ts';
import type { ImpactCase } from './cases.ts';
import { previewRelease } from './compile.ts';
import { diffDecisions, movesAnAnswer } from './diff.ts';
import type { Move } from './diff.ts';
import { answerSide } from './side.ts';
import type { SideAnswers, SideJob } from './side.ts';
import { applyRecords, stageSnapshot } from './stage.ts';

export interface ImpactOptions {
  /** A checkout holding `data/tables`: the snapshot to compare against. */
  readonly root?: string;
  readonly cases?: readonly ImpactCase[];
  /** Run the estimate stage too and answer every question (about 20 s a side). Default: the core alone. */
  readonly estimates?: boolean;
}

export type ImpactRecords = readonly Pick<ChangeRecord, 'table' | 'recordId' | 'before' | 'after'>[];

export interface ImpactReport {
  readonly mode: 'core' | 'full';
  /** `moved` counts (question, record) pairs whose answer changed; `estimatesPending` is true while questions that need estimates have not been asked. */
  readonly summary: DecisionDiffSummary;
  /** Records whose only change is their listing place. */
  readonly listingShifts: number;
  readonly base: { readonly inputDigest: string; readonly release: ReleaseId };
  readonly result: { readonly inputDigest: string; readonly release: ReleaseId };
  readonly cases: { readonly asked: number; readonly answered: number; readonly estimatesPending: readonly string[] };
  /** The materials with at least one moved answer. */
  readonly materials: readonly MaterialId[];
  readonly moves: readonly Move[];
  readonly timingsMs: Readonly<Record<'stage' | 'compileBase' | 'compileChanged' | 'runBase' | 'runChanged' | 'diff' | 'total', number>>;
}

export interface ImpactSession {
  readonly baseDigest: string;
  /** Start computing the base answers now (the editor calls it on open), so the first preview does not pay for them. */
  warm(): void;
  preview(records: ImpactRecords): Promise<ImpactReport>;
  /** Remove the staged snapshot. A session is not usable after it. */
  close(): void;
}

/** The base side in a worker thread, so it overlaps with the changed side. */
const inWorker = (job: SideJob): Promise<SideAnswers> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('./base-worker.ts', import.meta.url), { workerData: job });
  worker.once('message', resolve);
  worker.once('error', reject);
  worker.once('exit', (code) => reject(new Error(`the base worker exited (${code}) without an answer`)));
});

const templateOf = (c: ImpactCase): string => (c.group === 'template' ? (c.id.split('/')[1] ?? c.id) : 'census');
const ms = (since: number) => Math.round(performance.now() - since);

export async function openImpactSession(options: ImpactOptions = {}): Promise<ImpactSession> {
  const estimates = options.estimates === true;
  const cases = options.cases ?? loadImpactCases();
  const answered = estimates ? cases : cases.filter((c) => !needsEstimates(c));
  const pending = estimates ? [] : cases.filter(needsEstimates).map((c) => c.id);
  const staged = stageSnapshot(options.root ?? REPO_ROOT);
  let base: Promise<SideAnswers> | undefined;

  // A failed base is forgotten, so a retry asks again instead of failing for ever.
  const baseSide = () => (base ??= inWorker({ snapshot: staged, cases: answered, estimates }).catch((error: unknown) => {
    base = undefined;
    throw error;
  }));

  async function preview(records: ImpactRecords): Promise<ImpactReport> {
    const t0 = performance.now();
    const first = base === undefined;
    const waiting = baseSide();

    let t = performance.now();
    const changed = applyRecords(staged, records);
    const stage = ms(t);
    let after, before;
    try {
      after = await answerSide({ snapshot: changed, cases: answered, estimates });
      before = await waiting;
    } finally {
      rmSync(changed.dir, { recursive: true, force: true });
    }

    t = performance.now();
    const moves = answered.flatMap((c) => diffDecisions(c.id, before.decisions.get(c.id) ?? new Map(), after.decisions.get(c.id) ?? new Map()));
    const answerMoves = moves.filter(movesAnAnswer);
    const templateOfCase = new Map(answered.map((c) => [c.id, templateOf(c)]));
    const byTemplate: Record<string, number> = {};
    for (const move of answerMoves) {
      const key = templateOfCase.get(move.case) ?? move.case;
      byTemplate[key] = (byTemplate[key] ?? 0) + 1;
    }
    const diff = ms(t);
    return {
      mode: estimates ? 'full' : 'core',
      summary: { moved: answerMoves.length, estimatesPending: pending.length > 0, byTemplate },
      listingShifts: moves.length - answerMoves.length,
      base: { inputDigest: staged.digest, release: previewRelease(staged) },
      result: { inputDigest: changed.digest, release: previewRelease(changed) },
      cases: { asked: cases.length, answered: answered.length, estimatesPending: pending },
      materials: [...new Set(answerMoves.map((m) => m.materialId))].sort().map(materialIdOf),
      moves,
      timingsMs: { stage, compileBase: first ? before.compileMs : 0, compileChanged: after.compileMs, runBase: first ? before.runMs : 0, runChanged: after.runMs, diff, total: ms(t0) },
    };
  }

  const rmStaged = () => rmSync(staged.dir, { recursive: true, force: true });
  return { baseDigest: staged.digest, warm: () => { baseSide().catch(() => undefined); }, preview, close: rmStaged };
}

/** One preview from a cold start: stage, compile both sides, ask every question of both. */
export async function previewImpact(records: ImpactRecords, options: ImpactOptions = {}): Promise<ImpactReport> {
  return (await openImpactSession(options)).preview(records);
}
