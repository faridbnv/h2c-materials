// The build's stages in one place (WP-20), so the build, the parity harness and the tests all run the same thing: compile the
// tables into a database, apply the estimate stage, and validate both. The old build/src/pipeline.js, without the content cache
// (the estimate stage becomes a cached stage in WP-21, and a build here is always cold).
//
//   dataset    the tables without a material retired from the dataset and its records (D174)          retired.ts
//   compile    data tables -> the runtime database, every headline a measurement or a missing state    compile.ts
//   estimate   inference for missing headlines, added as an overlay            estimate-adapter.ts (the old stage, unchanged)
//   chamber    a truly silent chamber read from its kind of plastic's makers (D151)                  chamber-need.ts
//   validate   the database's invariants, then the estimate stage's                                  validate.ts
//
// `estimates: false` builds the core database alone. It must validate: nothing in the core may depend on inference.
//
// The stages still hand each other one database that they edit in place (markOutranked, markUndescribedCounts and
// attachProducts mutate their inputs), so the order here is part of the behaviour. Removing that is a later step of its own,
// under P-build.
import { attachChamberNeed } from './chamber-need.ts';
import { compile } from './compile.ts';
import { estimateConversions } from './evidence-ledger.ts';
import { attachEstimates, validateEstimates } from './estimate-adapter.ts';
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
}

export interface BuildResult {
  db: Dyn;
  issues: Issue[];
  /** Each stage's wall time in ms, so a build that is getting slower says which stage is. */
  timing: Record<string, number>;
}

export function buildDatabase(wb: Workbook, { snapshot = snapshotDate(wb.Method?.rows ?? []), build = 'dev', estimates = true }: BuildOptions = {}): BuildResult {
  const timing: Record<string, number> = {};
  const stage = <T>(name: string, run: () => T): T => {
    const t = performance.now();
    const value = run();
    timing[name] = Math.round(performance.now() - t);
    return value;
  };
  // Every stage reads one dataset: the tables without a material retired from it and its records (D174). Compile reads the
  // tables through the same function and reports what it left out.
  const { db, issues } = stage('compile', () => compile(wb, { snapshot, build }));
  const tables = inDataset(wb).wb;
  if (estimates) stage('estimate', () => attachEstimates(db, { conversions: estimateConversions(tables.Conversions?.rows ?? []) }));
  // A silent chamber read from its kind of plastic (D151), after the estimate stage: the frozen stage validates its product
  // screening on the products whose own sheets, twins or guide settle all three printer checks, and stays so.
  stage('chamberNeed', () => issues.push(...attachChamberNeed(db, tables, { materialRows: materialRowsOf(tables) })));
  stage('validate', () => issues.push(...validate(db, tables)));
  if (estimates) stage('validateEstimates', () => issues.push(...validateEstimates(db)));
  return { db, issues, timing };
}
