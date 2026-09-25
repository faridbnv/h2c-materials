// The build's stages in one place, so the build, the snapshot, the audit, the trace and the tests all run the same
// thing: compile the tables into a database, apply the estimate stage, and validate both.
//
//   compile    data tables -> the runtime database, every headline a measurement or a missing state    compile.js
//   estimate   inference for missing headlines, added as an overlay                                  estimate/
//   validate   the database's invariants, then the estimate stage's                                  validate.js, estimate/validate.js
//
// `estimates: false` builds the core database alone. It must validate: nothing in the core may depend on inference.
//
// The result is cached by content (build-cache.js): the same tables, code, runtime and options give the stored result
// back instead of running the stages again. `cache: false`, or H2C_NO_BUILD_CACHE=1, runs them regardless; a check that
// times the stages or proves the build reproducible does that.

import { snapshotDate } from './load.js';
import { compile } from './compile.js';
import { validate } from './validate.js';
import { attachEstimates } from './estimate/index.js';
import { validateEstimates } from './estimate/validate.js';
import { cacheEnabled, cacheKey, claim, readEntry, writeEntry } from './build-cache.js';

// A result shares a few objects with module constants (db.meta.h2cBaseline, db.meta.estimateModel.levels), so a caller
// that edits one changes every later build in its process. A result that goes through the cache is a private copy, so
// no caller's edit can reach a constant through it. Once this process has handed out an original (the cache off, or a
// result it could not store), its constants may have been edited, and nothing more is stored from it.
let handedOutOriginal = false;

export function buildDatabase(wb, { snapshot = snapshotDate(wb.Method.rows), build = 'dev', estimates = true, cache = true } = {}) {
  const options = { snapshot, build, estimates };
  const key = cache && cacheEnabled() ? cacheKey(wb, options) : null;
  let lock = null;
  if (key) {
    const t = performance.now();
    // Stored already, or stored by another process while this one waited for it.
    const hit = readEntry(key) ?? (lock = claim(key)).entry;
    // `timing` says what this call cost; `cached.timing` what the build that stored the result cost.
    if (hit) return { db: hit.db, issues: hit.issues, timing: { cache: Math.round(performance.now() - t) }, cached: { key, timing: hit.timing } };
  }
  try {
    // Each stage's wall time, so a build that is getting slower says which stage is. The estimate stage is cubic in
    // observations, and the import ahead multiplies them, so this is the number to watch (DECISIONS D77).
    const timing = {};
    const stage = (name, run) => { const t = performance.now(); const value = run(); timing[name] = Math.round(performance.now() - t); return value; };
    const { db, issues } = stage('compile', () => compile(wb, { snapshot, build }));
    if (estimates) stage('estimate', () => attachEstimates(db));
    stage('validate', () => issues.push(...validate(db, wb)));
    if (estimates) stage('validateEstimates', () => issues.push(...validateEstimates(db)));
    // Stored only if the build left its input as it found it: a hit skips the stages, so it must skip nothing a caller sees.
    if (key && !handedOutOriginal && cacheKey(wb, options) === key) {
      const copy = writeEntry(key, { db, issues, timing });
      if (copy) return { db: copy.db, issues: copy.issues, timing };
    }
    handedOutOriginal = true;
    return { db, issues, timing };
  } finally {
    lock?.release();
  }
}
