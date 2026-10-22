// The core-sufficiency hook (WP-25; pack 07 section 5.4): the engine on the PUBLISHED core alone must say what the engine says on
// the whole compiled database. The check that would have caught the Flexible component counting 10 -> 11 "not enough data" when a
// trimmed core lost a field the engine reads (research/understand/gap-3-partial.md).
//
// The adapter here is built the way the page builds its input, from the same declarations and the same functions:
//   - the core part: the database cut to CORE_FIELDS (what the writer publishes in core.json);
//   - where the question uses estimates (exploration with the switch on): the estimates part on top, the overlay cut to
//     ESTIMATE_FIELDS and applied by applyEstimates (what the loader does);
//   - every other field of the database is NOT there. The engine that reads it gets `undefined`, and the answer moves.
// The engine behind it is the one the site runs (the typed wrapper over the ported modules). Each model is the adapter's own copy.
import { CORE_FIELDS, ESTIMATE_FIELDS, isCoreReadModel } from '@atlas/domain';
import type { CoreReadModel } from '@atlas/domain';
import { applyEstimates, guarded, mergeSpecs, overlayOf, pruneOverlay, pruneRecord } from '@atlas/publish/shards';
import type { FieldSpec } from '@atlas/publish/shards';
import { coreSufficiencyHook, registerCoreSufficiency } from './core-sufficiency.ts';
import type { CoreSufficiencyHook } from './core-sufficiency.ts';
import { createNewAdapter } from './new-adapter.ts';
import type { Db } from './old-adapter.ts';
import type { Adapter, CorpusCase } from './types.ts';

/** Whether the engine reads the estimates for this question (the context's rule: exploration, with the switch not off). */
export const usesEstimates = (c: CorpusCase): boolean => c.scenario.unknownPolicy === 'exploration' && c.scenario.useEstimates !== false;

/** The two declarations a core adapter cuts the database with. The tests give it a core that lacks a field, to see the check catch it. */
export interface Declarations {
  readonly core: FieldSpec;
  readonly estimates: FieldSpec;
}
const DECLARED: Declarations = { core: CORE_FIELDS, estimates: ESTIMATE_FIELDS };

export interface CoreAdapterOptions {
  readonly name?: string;
  /** What the published parts carry; the declarations the page and the writer use unless a test says otherwise. */
  readonly fields?: Declarations;
  /**
   * DEVELOPMENT ONLY. Hand the engine the WHOLE database behind a Proxy that throws (MissingFieldError, naming the field) when it
   * reads a field the declarations do not carry. Slower; for finding which field a failing case misses, not for the zero.
   */
  readonly guard?: boolean;
}

/** The part of `db` the published core carries, as the page's own copy. */
export function coreModelOf(db: Db, fields: Declarations = DECLARED): CoreReadModel {
  const model = structuredClone(pruneRecord(db, fields.core));
  if (!isCoreReadModel(model)) throw new Error('the declaration cuts away a section the engine cannot run without');
  return model;
}

/** The whole database, as a copy the guard can stand in front of (it has every section, so it passes for a core). */
function wholeModelOf(db: Db): CoreReadModel {
  const copy = structuredClone(db);
  if (!isCoreReadModel(copy)) throw new Error('the database lacks a section the engine cannot run without');
  return copy;
}

/** The core with the estimates on it, as the page makes it for Explore with estimates on. */
export function estimatedModelOf(db: Db, fields: Declarations = DECLARED): CoreReadModel {
  const model = coreModelOf(db, fields);
  applyEstimates(model, structuredClone(pruneOverlay(overlayOf(db), fields.estimates)));
  return model;
}

export async function createCoreAdapter(db: Db, options: CoreAdapterOptions = {}): Promise<Adapter> {
  const fields = options.fields ?? DECLARED;
  const name = options.name ?? (options.guard ? 'new (core only, guarded)' : 'new (core only)');
  const guard = (model: CoreReadModel, spec: FieldSpec): CoreReadModel => guarded(model, spec, 'core');
  // The guard is for a model that holds more than the declarations carry: the whole database, with the estimate stage in place for the question that uses it.
  const strictModel = options.guard ? guard(wholeModelOf(db), fields.core) : coreModelOf(db, fields);
  const estimatedModel = options.guard ? guard(wholeModelOf(db), mergeSpecs(fields.core, fields.estimates)) : estimatedModelOf(db, fields);
  const [strict, estimated] = await Promise.all([
    createNewAdapter({ name, db: strictModel }),
    createNewAdapter({ name, db: estimatedModel }),
  ]);
  return {
    name,
    evaluate: (c) => (usesEstimates(c) ? estimated : strict).evaluate(c),
    ...(strict.openLink ? { openLink: strict.openLink } : {}),
  };
}

export const coreHook: CoreSufficiencyHook = { coreAdapter: (db) => createCoreAdapter(db) };

/** Register the hook once; a second call is a no-op, so the CLI and a test may both ask. */
export function installCoreHook(): void {
  if (!coreSufficiencyHook()) registerCoreSufficiency(coreHook);
}
