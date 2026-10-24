// The estimate stage as a stage of its own (WP-21; pack 03 ADR-10): it takes the compiled core database and the ledger's estimate
// conversions, and its whole output is an overlay, the fields the old stage added to the database in place:
//
//   grades[].estimateVersion, estimate, estimateWithheld          a product's own estimate, or why it shows none (D81, D167)
//   materials[].headline[key].estimate, notApplicable             a material's estimate where no product publishes, or why none
//   materials[].print.nozzleEstimate, bedEstimate                 windows inferred from peers
//   meta.estimateCoverage, estimateModel, printEstimates          coverage, calibration and diagnostics
//
// The overlay is stored by a key over everything the stage reads (estimate-cache.ts) and applied to the database. A stage that
// ran applies the same overlay a stage that was read from the cache does, so the two cannot differ: on a miss the 18 estimate
// modules (./estimate/, label-only copies of the old build/src/estimate/, proved by P-erase) run on a COPY of the database, the
// overlay is read out of the copy, applied to the real database, and the two databases are compared as written (db.json is their
// JSON). Anything the old code changed that the overlay does not name is therefore found the first time it happens, as a failed
// build, not as a cache that serves less than the stage did.
//
// The overlay is also the estimates artifact (`estimates.json`): the fields every mode reads and the ones only Explore with
// estimates reads, kept apart from the core by their names (pack 02 section 9.6).
import { performance } from 'node:perf_hooks';
import { deserialize, serialize } from 'node:v8';
import { Uncacheable, canonicalDigest } from './canonical-digest.ts';
import { cacheEnabled, readEntry, removeEntry, stageCode, stageKey, writeEntry } from './estimate-cache.ts';
import type { CodeDigest } from './estimate-cache.ts';
import { attachEstimates } from './estimate/index.ts';
import { runtimeFingerprint } from './runtime-fingerprint.ts';
import type { RuntimeFingerprint } from './runtime-fingerprint.ts';
import type { Dyn } from './types.ts';

export const OVERLAY_FORMAT = 'h2c-estimates 1';

// Where the stage writes, by object. The order of the names in each list is irrelevant: an overlay keeps the order the fields have in
// the database, so that applying it reproduces the database byte for byte.
const GRADE_FIELDS: ReadonlySet<string> = new Set(['estimateVersion', 'estimate', 'estimateWithheld']);
const HEADLINE_FIELDS: ReadonlySet<string> = new Set(['estimate', 'notApplicable']);
const PRINT_FIELDS: ReadonlySet<string> = new Set(['nozzleEstimate', 'bedEstimate']);
const META_FIELDS: ReadonlySet<string> = new Set(['estimateCoverage', 'estimateModel', 'printEstimates']);

export interface EstimateOverlay {
  format: typeof OVERLAY_FORMAT;
  grades: Record<string, Record<string, Dyn>>;
  materials: Record<string, { headline: Record<string, Record<string, Dyn>>; print: Record<string, Dyn> }>;
  meta: Record<string, Dyn>;
}

/**
 * The fields of `object` named in `names`, in the order the object has them, or null where it has none. Where `base` is given, only
 * those the stage added or changed: a field `base` already holds with the same value (compile sets `notApplicable` on an elastomer's
 * heat deflection by definition) is not the stage's.
 */
/** Whether two values are the same value in every way the stage can tell (undefined, -0 and NaN included; which objects are shared is not a value). */
function sameValue(a: unknown, b: unknown): boolean {
  try {
    return canonicalDigest(a, { sharing: false }) === canonicalDigest(b, { sharing: false });
  } catch (error) {
    if (error instanceof Uncacheable) return false;
    throw error;
  }
}

function pick(object: Dyn, names: ReadonlySet<string>, base: Dyn = null): Record<string, Dyn> | null {
  let out: Record<string, Dyn> | null = null;
  if (object === null || typeof object !== 'object') return null;
  for (const key of Object.keys(object)) {
    if (!names.has(key)) continue;
    if (base && key in base && sameValue(base[key], object[key])) continue;
    out ??= {};
    out[key] = object[key];
  }
  return out;
}

/**
 * What the estimate stage has written into `db`, as an overlay; `base` is the same database before the stage ran. The values are
 * the database's own objects, not copies.
 */
export function extractOverlay(db: Dyn, base: Dyn): EstimateOverlay {
  const baseGrades = new Map<string, Dyn>(base.grades.map((g: Dyn) => [g.id, g]));
  const baseMaterials = new Map<string, Dyn>(base.materials.map((m: Dyn) => [m.id, m]));
  const overlay: EstimateOverlay = { format: OVERLAY_FORMAT, grades: {}, materials: {}, meta: pick(db.meta, META_FIELDS, base.meta) ?? {} };
  for (const g of db.grades) {
    const fields = pick(g, GRADE_FIELDS, baseGrades.get(g.id));
    if (fields) overlay.grades[g.id] = fields;
  }
  for (const m of db.materials) {
    const baseMaterial = baseMaterials.get(m.id);
    const headline: Record<string, Record<string, Dyn>> = {};
    for (const [key, h] of Object.entries<Dyn>(m.headline ?? {})) {
      const fields = pick(h, HEADLINE_FIELDS, baseMaterial?.headline?.[key]);
      if (fields) headline[key] = fields;
    }
    const print = pick(m.print, PRINT_FIELDS, baseMaterial?.print) ?? {};
    if (Object.keys(headline).length || Object.keys(print).length) overlay.materials[m.id] = { headline, print };
  }
  return overlay;
}

/** True when a database already carries estimate fields the stage alone writes (`notApplicable` is also compile's, so it does not count). */
function hasStageFields(db: Dyn): boolean {
  const some = (object: Dyn, names: ReadonlySet<string>, except: ReadonlySet<string> = new Set()): boolean =>
    object !== null && typeof object === 'object' && Object.keys(object).some((k) => names.has(k) && !except.has(k));
  return some(db.meta, META_FIELDS)
    || db.grades.some((g: Dyn) => some(g, GRADE_FIELDS))
    || db.materials.some((m: Dyn) => some(m.print, PRINT_FIELDS) || Object.values<Dyn>(m.headline ?? {}).some((h) => some(h, HEADLINE_FIELDS, new Set(['notApplicable']))));
}

/**
 * The estimates artifact (estimates.json): the stage's overlay, with whether it was published whole or withheld. For a database whose
 * model passed its checks it is the overlay as the stage made it, field for field; where estimates were withheld the withheld cells
 * are left out of it, and its coverage is the database's.
 */
export function estimatesArtifact(overlay: EstimateOverlay, db: Dyn): Dyn {
  const withheld = db.meta.estimateWithheld ?? null;
  if (!withheld) return { format: overlay.format, status: 'available', withheld: null, grades: overlay.grades, materials: overlay.materials, meta: overlay.meta };
  const gone = (place: string): boolean => place in withheld.cells;
  const grades: EstimateOverlay['grades'] = {};
  for (const [id, fields] of Object.entries(overlay.grades)) {
    const entry: Record<string, Dyn> = {};
    for (const [name, value] of Object.entries<Dyn>(fields)) {
      if (name !== 'estimate') { entry[name] = value; continue; }
      const kept = Object.fromEntries(Object.entries<Dyn>(value).filter(([key]) => !gone(`grades/${id}/${key}`)));
      if (Object.keys(kept).length) entry[name] = kept;
    }
    grades[id] = entry;
  }
  const materials: EstimateOverlay['materials'] = {};
  for (const [id, { headline, print }] of Object.entries(overlay.materials)) {
    const kept = Object.fromEntries(Object.entries(headline).flatMap(([key, fields]): [string, Record<string, Dyn>][] => {
      const left = Object.fromEntries(Object.entries(fields).filter(([name]) => name !== 'estimate' || !gone(`materials/${id}/${key}`)));
      return Object.keys(left).length ? [[key, left]] : [];
    }));
    if (Object.keys(kept).length || Object.keys(print).length) materials[id] = { headline: kept, print };
  }
  return { format: overlay.format, status: 'withheld', withheld, grades, materials, meta: { ...overlay.meta, estimateCoverage: db.meta.estimateCoverage } };
}

/** True when the overlay holds nothing: the stage changed nothing. */
export function isEmptyOverlay(overlay: EstimateOverlay): boolean {
  return !Object.keys(overlay.grades).length && !Object.keys(overlay.materials).length && !Object.keys(overlay.meta).length;
}

/** The overlay's fields added to the database, in the overlay's order. A record the database does not hold is an error, never skipped. */
export function applyOverlay(db: Dyn, overlay: EstimateOverlay): void {
  const shown: Dyn = overlay;
  if (shown === null || typeof shown !== 'object' || shown.format !== OVERLAY_FORMAT) throw new Error(`estimate overlay of format "${String(shown?.format)}", expected "${OVERLAY_FORMAT}"`);
  if (!overlay.meta?.estimateModel) throw new Error('the estimates carry no meta.estimateModel');
  const grades = new Map<string, Dyn>(db.grades.map((g: Dyn) => [g.id, g]));
  const materials = new Map<string, Dyn>(db.materials.map((m: Dyn) => [m.id, m]));
  // Everything is checked before anything is written, so a stored overlay that does not fit leaves the database as it was.
  for (const id of Object.keys(overlay.grades)) if (!grades.has(id)) throw new Error(`the estimates name grade ${id}, which the database does not have`);
  for (const [id, { headline, print }] of Object.entries(overlay.materials)) {
    const m = materials.get(id);
    if (!m) throw new Error(`the estimates name material ${id}, which the database does not have`);
    for (const key of Object.keys(headline)) if (!m.headline?.[key]) throw new Error(`the estimates name headline ${key} of ${id}, which the database does not have`);
    if (Object.keys(print).length && !m.print) throw new Error(`the estimates name print windows of ${id}, which has no print section`);
  }
  for (const [id, fields] of Object.entries(overlay.grades)) Object.assign(grades.get(id), fields);
  for (const [id, { headline, print }] of Object.entries(overlay.materials)) {
    const m = materials.get(id);
    for (const [key, fields] of Object.entries(headline)) Object.assign(m?.headline[key], fields);
    if (Object.keys(print).length) Object.assign(m?.print, print);
  }
  Object.assign(db.meta, overlay.meta);
}

/** The database with the build label left out: a stamp the stage never reads, so one entry serves every label. */
const withoutLabel = (db: Dyn): Dyn => ({ ...db, meta: { ...db.meta, build: null } });

/** The options that shape the stage's output apart from its inputs. None today; here so that adding one changes the key. */
const STAGE_OPTIONS = { estimateVersion: 2 } as const;

export type StageSource = 'cache' | 'computed';
export type CacheState =
  | { state: 'hit' }
  | { state: 'miss'; stored: boolean; note?: string }
  /** The cache was not used, and why: switched off, or something the key needs could not be named. */
  | { state: 'off'; why: string };

export interface EstimateStageResult {
  /** The overlay that was applied (a copy no one else holds). */
  overlay: EstimateOverlay;
  /** The cache key, or null where the inputs could not be named exactly. */
  key: string | null;
  source: StageSource;
  cache: CacheState;
  /** Wall time in ms of each part of the stage. */
  timing: Record<string, number>;
}

export interface EstimateStageOptions {
  /** The ledger's estimate conversions (evidence-ledger.ts estimateConversions). */
  conversions: Dyn;
  /** Where entries are kept; null runs the stage without a cache. */
  cacheDir: string | null;
  /** Test seams: the computation, the runtime and the code digest the key is made from. */
  compute?: (db: Dyn, options: { conversions: Dyn }) => void;
  runtime?: RuntimeFingerprint;
  code?: CodeDigest | null;
}

/** The stage ran but its overlay does not reproduce what it did to the database. */
export class EstimateOverlayIncomplete extends Error {}

function firstDifference(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `at character ${i}: …${a.slice(Math.max(0, i - 60), i + 60)}… against …${b.slice(Math.max(0, i - 60), i + 60)}…`;
}

/** The default computation: the old stage, as 18 label-only TypeScript modules. */
function computeWithModules(db: Dyn, { conversions }: { conversions: Dyn }): void {
  attachEstimates(db, { conversions });
}

/** The code digest to key by: the process's own unless a test gave one (or null, for none). */
function codeFor(given: CodeDigest | null | undefined): { digest: CodeDigest } | { error: string } {
  if (given === undefined) return stageCode();
  if (given === null) return { error: 'no code digest was given' };
  return { digest: given };
}

/** The cache key of this database and these conversions, or null with the reason it cannot be named exactly. */
function keyFor(db: Dyn, options: EstimateStageOptions): { key: string | null; why: string | null } {
  const code = codeFor(options.code);
  if ('error' in code) return { key: null, why: `the code digest could not be taken safely: ${code.error}` };
  try {
    const inputs = canonicalDigest({ db: withoutLabel(db), conversions: options.conversions });
    return { key: stageKey({ inputs, code: code.digest.digest, runtime: options.runtime ?? runtimeFingerprint(), options: STAGE_OPTIONS }), why: null };
  } catch (error) {
    if (!(error instanceof Uncacheable)) throw error;
    return { key: null, why: `the stage's inputs cannot be named exactly (${error.message})` };
  }
}

/**
 * Run the estimate stage on a compiled core database: read its overlay from the cache, or compute it, store it, and in either case
 * apply it to `db` in place. `db` must hold no estimate fields yet.
 */
export function runEstimateStage(db: Dyn, options: EstimateStageOptions): EstimateStageResult {
  const timing: Record<string, number> = {};
  const lap = <T>(name: string, run: () => T): T => {
    const started = performance.now();
    const value = run();
    timing[name] = Math.round(performance.now() - started);
    return value;
  };
  if (hasStageFields(db)) throw new Error('the compiled database already carries estimate fields: the stage runs once, on the core');
  // A stand-in computation must name its own code, or it would share the real stage's key and cache.
  if (options.compute && options.code === undefined) throw new Error('a computation other than the estimate modules needs its own code digest (options.code)');
  const compute = options.compute ?? computeWithModules;

  // The key is made even where the cache is off, so the release can name the inputs its estimates came from. Where any part cannot
  // be named exactly the stage still runs, without the cache, and says why.
  const { key, why: keyWhy } = lap('key', () => keyFor(db, options));
  let off = keyWhy;
  if (!cacheEnabled()) off = 'H2C_NO_BUILD_CACHE is set';
  else if (options.cacheDir === null) off = 'no cache folder was given';
  const dir = off === null ? options.cacheDir : null;

  let missNote: string | undefined;
  if (key !== null && dir !== null) {
    const entry = lap('read', () => readEntry(dir, key));
    if ('overlay' in entry) {
      const overlay: EstimateOverlay = entry.overlay;
      try {
        lap('apply', () => applyOverlay(db, overlay));
        return { overlay, key, source: 'cache', cache: { state: 'hit' }, timing };
      } catch (error) {
        // A checksum-valid entry that does not fit this database (applyOverlay writes nothing before it has checked): removed, recomputed.
        removeEntry(dir, key);
        missNote = `a damaged entry was removed and the stage recomputed (it does not fit the database: ${error instanceof Error ? error.message : String(error)})`;
      }
    } else if (entry.miss === 'damaged') missNote = `a damaged entry was removed and the stage recomputed (${entry.why})`;
    else if (entry.miss === 'unreadable') missNote = `an entry could not be read, so the stage recomputed (${entry.why}); it was not removed`;
  }

  // A miss: the modules run on a copy, so that what they changed can be compared with what the overlay says they changed.
  const scratch: Dyn = lap('copy', () => structuredClone(db));
  lap('compute', () => compute(scratch, { conversions: options.conversions }));
  if (!scratch.meta?.estimateModel) throw new Error('the estimate stage ran but left no meta.estimateModel: the database was not extended');
  const raw = extractOverlay(scratch, db);

  // The overlay is applied as a deserialised copy, as a cache hit applies it: one path for both.
  let overlay: EstimateOverlay = raw;
  let exact = true;
  try {
    const copy: EstimateOverlay = deserialize(serialize(raw));
    if (canonicalDigest(copy) !== canonicalDigest(raw)) throw new Uncacheable('an overlay that does not survive serialisation');
    overlay = copy;
  } catch (error) {
    if (!(error instanceof Uncacheable)) throw error;
    exact = false;
    missNote = `the overlay cannot be stored exactly (${error.message})`;
  }
  lap('apply', () => applyOverlay(db, overlay));
  lap('verify', () => {
    // Every value, key order, undefined, -0 and NaN: what the stage did and what the overlay carries must be the same database.
    // (A database that is not plain data cannot be digested; it is then compared as written, which is what db.json is.)
    const left = JSON.stringify(db);
    const right = JSON.stringify(scratch);
    let same = left === right;
    try { same = same && canonicalDigest(db, { sharing: false }) === canonicalDigest(scratch, { sharing: false }); } catch (error) { if (!(error instanceof Uncacheable)) throw error; }
    if (!same) {
      const where = left === right ? 'in a value JSON cannot show (undefined, -0, NaN or an infinity)' : firstDifference(left, right);
      throw new EstimateOverlayIncomplete(`the estimate stage changed the database in a way its overlay does not carry (${where}): name the new field in estimate-stage.ts`);
    }
  });

  if (off !== null || key === null || dir === null) return { overlay, key, source: 'computed', cache: { state: 'off', why: off ?? 'the key could not be made' }, timing };
  if (!exact) return { overlay, key, source: 'computed', cache: { state: 'miss', stored: false, ...(missNote === undefined ? {} : { note: missNote }) }, timing };
  const failure = lap('write', () => writeEntry(dir, key, overlay));
  const note = failure === null ? missNote : `the result could not be stored: ${failure}`;
  return { overlay, key, source: 'computed', cache: { state: 'miss', stored: failure === null, ...(note === undefined ? {} : { note }) }, timing };
}
