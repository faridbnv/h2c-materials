// The build's stages in one place, so the build, the snapshot, the audit, the trace and the tests all run the same
// thing: compile the tables into a database, apply the estimate stage, and validate both.
//
//   compile    data tables -> the runtime database, every headline a measurement or a missing state    compile.js
//   estimate   inference for missing headlines, added as an overlay                                  estimate/
//   validate   the database's invariants, then the estimate stage's                                  validate.js, estimate/validate.js
//
// `estimates: false` builds the core database alone. It must validate: nothing in the core may depend on inference.

import { snapshotDate } from './load.js';
import { compile } from './compile.js';
import { validate } from './validate.js';
import { attachEstimates } from './estimate/index.js';
import { validateEstimates } from './estimate/validate.js';

export function buildDatabase(wb, { snapshot = snapshotDate(wb.Method.rows), build = 'dev', estimates = true } = {}) {
  // Each stage's wall time, so a build that is getting slower says which stage is. The estimate stage is cubic in
  // observations, and the import ahead multiplies them, so this is the number to watch (DECISIONS D77).
  const timing = {};
  const stage = (name, run) => { const t = performance.now(); const value = run(); timing[name] = Math.round(performance.now() - t); return value; };
  const { db, issues } = stage('compile', () => compile(wb, { snapshot, build }));
  if (estimates) stage('estimate', () => attachEstimates(db));
  stage('validate', () => issues.push(...validate(db, wb)));
  if (estimates) stage('validateEstimates', () => issues.push(...validateEstimates(db)));
  return { db, issues, timing };
}
