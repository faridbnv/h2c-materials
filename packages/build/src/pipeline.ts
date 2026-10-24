// The build's stages in one place (WP-20), so the build, the parity harness and the tests all run the same thing: compile the
// tables into a database, apply the estimate stage, and validate both. The old build/src/pipeline.js, with its content cache
// narrowed to the one stage that is slow (WP-21): the estimate stage is cached by a key over everything it reads (estimate-cache.ts),
// and the rest of the build is always run.
//
//   dataset    the tables without a material retired from the dataset and its records (D174)          retired.ts
//   compile    data tables -> the runtime database, every headline a measurement or a missing state    compile.ts
//   estimate   inference for missing headlines, added as an overlay                                    estimate-stage.ts (cached)
//   chamber    a truly silent chamber read from its kind of plastic's makers (D151)                  chamber-need.ts
//   validate   the database's invariants, then the estimate stage's                                  validate.ts, estimate/validate.ts
//   withhold   where the model failed its own calibration check: publish, withhold and label (OQ-05 A)  estimate-withholding.ts
//
// `estimates: false` builds the core database alone. It must validate: nothing in the core may depend on inference.
//
// The stages still hand each other one database that they edit in place (markOutranked, markUndescribedCounts and
// attachProducts mutate their inputs), so the order here is part of the behaviour. Removing that is a later step of its own,
// under P-build.
import { attachChamberNeed } from './chamber-need.ts';
import { compile } from './compile.ts';
import { DEFAULT_CACHE_DIR } from './estimate-cache.ts';
import { runEstimateStage } from './estimate-stage.ts';
import type { EstimateStageResult } from './estimate-stage.ts';
import { seedCalibrationFailure, withholdFailedCalibration } from './estimate-withholding.ts';
import type { WithheldRecord } from './estimate-withholding.ts';
import { validateEstimates } from './estimate/validate.ts';
import { estimateConversions } from './evidence-ledger.ts';
import { snapshotDate } from './load.ts';
import { materialRowsOf } from './registry.ts';
import { inDataset } from './retired.ts';
import type { Dyn, Issue, Workbook } from './types.ts';
import { validate } from './validate.ts';

export interface BuildOptions {
  snapshot?: string;
  /** The build label stamped on db.meta; never an input of the result. */
  build?: string;
  estimates?: boolean;
  /** Where the estimate stage keeps its cache; null runs it without one. Defaults to .cache/estimates in the project (H2C_NO_BUILD_CACHE=1 turns it off). */
  estimateCache?: string | null;
  /** A self-test of the withholding (OQ-05 A): make these estimated headlines fail their calibration check, after the stage and never in the cache. */
  seedCalibrationFailure?: readonly string[];
}

/** What the estimate stage did in a build, for the log and the release manifest. */
export interface EstimateOutcome {
  stage: EstimateStageResult;
  /** Set where the model failed its calibration check and estimates were withheld. */
  withheld: WithheldRecord | null;
}

export interface BuildResult {
  db: Dyn;
  issues: Issue[];
  /** Each stage's wall time in ms, so a build that is getting slower says which stage is. */
  timing: Record<string, number>;
  /** Null where the build ran without the estimate stage. */
  estimate: EstimateOutcome | null;
}

/** Runs a stage and records its wall time in ms under `name`. */
export type Stopwatch = <T>(name: string, run: () => T) => T;

/** A stopwatch that writes into `timing`, so the build and its stages report their times the same way. */
export function stopwatch(timing: Record<string, number>): Stopwatch {
  return function timed<T>(name: string, run: () => T): T {
    const started = performance.now();
    const value = run();
    timing[name] = Math.round(performance.now() - started);
    return value;
  };
}

export function buildDatabase(wb: Workbook, { snapshot = snapshotDate(wb.Method?.rows ?? []), build = 'dev', estimates = true, estimateCache = DEFAULT_CACHE_DIR, seedCalibrationFailure: seeded = [] }: BuildOptions = {}): BuildResult {
  const timing: Record<string, number> = {};
  const stage = stopwatch(timing);
  // Every stage reads one dataset: the tables without a material retired from it and its records (D174). Compile reads the
  // tables through the same function and reports what it left out.
  const { db, issues } = stage('compile', () => compile(wb, { snapshot, build }));
  const tables = inDataset(wb).wb;
  let stageResult: EstimateStageResult | null = null;
  if (estimates) {
    stageResult = stage('estimate', () => runEstimateStage(db, { conversions: estimateConversions(tables.Conversions?.rows ?? []), cacheDir: estimateCache }));
    for (const [name, ms] of Object.entries(stageResult.timing)) timing[`estimate${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`] = ms;
    // The cache is an economy, but a result that could not be stored, an entry that was damaged, or a key that could not be made is said
    // in the report, not only in a log line. (Switched off on purpose, by the environment or the command line, is not a finding.)
    const cache = stageResult.cache;
    const because = cache.state === 'off' ? (cache.why === 'H2C_NO_BUILD_CACHE is set' || cache.why === 'no cache folder was given' ? null : cache.why) : cache.state === 'miss' ? (cache.note ?? (cache.stored ? null : 'the result was not stored')) : null;
    if (because) issues.push({ level: 'warn', code: 'EST-CACHE', where: 'estimate stage cache', message: `${because}; the estimates were computed, not read from the cache` });
    if (seeded.length) seedCalibrationFailure(db, seeded);
  } else if (seeded.length) throw new Error('a calibration failure was asked for, but the build runs without the estimate stage');
  // A silent chamber read from its kind of plastic (D151), after the estimate stage: the frozen stage validates its product
  // screening on the products whose own sheets, twins or guide settle all three printer checks, and stays so.
  stage('chamberNeed', () => issues.push(...attachChamberNeed(db, tables, { materialRows: materialRowsOf(tables) })));
  stage('validate', () => issues.push(...validate(db, tables)));
  let withheld: WithheldRecord | null = null;
  if (stageResult) {
    // The model's own checks, then the ruled consequence of a calibration failure (OQ-05 A). The check runs on the estimates as the
    // model made them; what is withheld is decided from its findings, and only after every other check has read the full database.
    const checked = stage('validateEstimates', () => validateEstimates(db));
    const outcome = stage('withhold', () => withholdFailedCalibration(db, checked));
    withheld = outcome.record;
    issues.push(...outcome.issues);
  }
  return { db, issues, timing, estimate: stageResult ? { stage: stageResult, withheld } : null };
}
