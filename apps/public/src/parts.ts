// The release's data in parts, and the completeness rule (pack 02 section 9.6):
//
//   1. A page computes only when every part its mode needs has arrived, is the shape it expects, and names the page's release.
//      Until then it is loading, or it says it could not load; it never shows a result from part of the data.
//   2. The brief and the export wait for the detail shard of every material they cite and never emit a row without its citation.
//
// `loadParts` and `loadDetails` return a whole set or throw. There is no partial result to misuse. The page never fetches release.json.
import { isCoreReadModel } from '@atlas/domain';
import type { CoreReadModel, DetailShard } from '@atlas/domain';
import { applyEstimates, EstimatesDoNotFitError } from '@atlas/publish/shards';
import type { Overlay } from '@atlas/publish/shards';
import { DetailsIncomplete, fetchPart, isMaterialId } from './load.ts';
import type { FetchLike } from './load.ts';
import { DataShapeError } from './model.ts';
import { assertSameRelease } from './release.ts';
import type { StaleShellError } from './release.ts';

/** What the reader is doing; each needs some parts (02 section 9.6). */
export type Mode = 'strict' | 'explore' | 'exploreEstimates' | 'drawer' | 'ashby' | 'brief' | 'export';
export type PartName = 'core' | 'estimates' | 'reference' | 'detail' | 'detail:cited';

export const REQUIRES: Readonly<Record<Mode, readonly PartName[]>> = {
  strict: ['core'],
  explore: ['core'],
  exploreEstimates: ['core', 'estimates'],
  drawer: ['detail'],
  ashby: ['core', 'reference'],
  brief: ['core', 'detail:cited'],
  export: ['core', 'detail:cited'],
};

/** Whether the estimates part was published whole or withheld (ruling OQ-05 A), and the build's record of what it withheld; the label shown for it is the view's, not the loader's. */
export interface EstimatesStatus {
  readonly status: 'available' | 'withheld';
  readonly withheld: unknown;
}

/** What `loadParts` gives back: the model the engine reads (the estimates applied when the mode asked for them), the estimates' status when they were asked for, and the reference set when asked. */
export interface Loaded {
  readonly release: string;
  readonly model: CoreReadModel;
  readonly estimates?: EstimatesStatus;
  readonly reference?: unknown;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A part's wrapper, once it is the kind asked for and names the page's release. */
function envelope(json: unknown, kind: string, what: string, embedded: string): Record<string, unknown> {
  if (!isObject(json)) throw new DataShapeError(what, 'is not an object');
  if (json['kind'] !== kind) throw new DataShapeError(what, `is not a ${kind} part (it says ${String(json['kind'])})`);
  if (typeof json['release'] !== 'string') throw new DataShapeError(what, 'names no release');
  assertSameRelease(embedded, what, json['release']);
  return json;
}

function parseCore(json: unknown, embedded: string): CoreReadModel {
  const file = envelope(json, 'core', 'the core part', embedded);
  const model = file['model'];
  if (!isObject(model)) throw new DataShapeError('the core part', 'carries no model');
  if (!isCoreReadModel(model)) throw new DataShapeError('the core part', 'lacks a section the engine cannot run without (meta, registry, materials, grades, measurements, evidence, coverage)');
  return model;
}

const isOverlay = (value: unknown): value is Overlay => isObject(value) && isObject(value['grades']) && isObject(value['materials']) && isObject(value['meta']);

function parseEstimates(json: unknown, embedded: string): EstimatesStatus & { readonly overlay: Overlay } {
  const file = envelope(json, 'estimates', 'the estimates part', embedded);
  const overlay = file['overlay'];
  if (!isOverlay(overlay)) throw new DataShapeError('the estimates part', 'carries no overlay');
  const status = file['status'];
  if (status !== 'available' && status !== 'withheld') throw new DataShapeError('the estimates part', `says its status is ${String(status)}, not available or withheld`);
  const withheld = file['withheld'] ?? null;
  if ((status === 'withheld') !== (withheld !== null)) throw new DataShapeError('the estimates part', `says ${status} and ${withheld === null ? 'records nothing withheld' : 'records what was withheld'}`);
  return { overlay, status, withheld };
}

function parseReference(json: unknown, embedded: string): unknown {
  const file = envelope(json, 'reference', 'the reference part', embedded);
  if (!isObject(file['reference'])) throw new DataShapeError('the reference part', 'carries no reference set');
  return file['reference'];
}

async function loadNeeded(embedded: string, needs: readonly PartName[], fetchFn: FetchLike): Promise<Loaded> {
  const core = fetchPart(fetchFn, embedded, 'core.json', 'the core part');
  const estimates = needs.includes('estimates') ? fetchPart(fetchFn, embedded, 'estimates.json', 'the estimates part') : null;
  const reference = needs.includes('reference') ? fetchPart(fetchFn, embedded, 'reference.json', 'the reference part') : null;
  // All of them settle before any is used: a part that failed must not leave another's result lying around as an answer.
  const settled = await Promise.allSettled([core, estimates, reference]);
  for (const outcome of settled) if (outcome.status === 'rejected') throw outcome.reason;
  const [coreJson, estimatesJson, referenceJson] = settled.map((outcome) => (outcome.status === 'fulfilled' ? outcome.value : undefined));
  const model = parseCore(coreJson, embedded);
  let loaded: Loaded = { release: embedded, model };
  if (estimates !== null) {
    try {
      const { overlay, status, withheld } = parseEstimates(estimatesJson, embedded);
      applyEstimates(model, overlay);
      loaded = { ...loaded, estimates: { status, withheld } };
    } catch (error) {
      if (error instanceof EstimatesDoNotFitError) throw new DataShapeError('the estimates part', `does not fit the core part (${error.message})`);
      throw error;
    }
  }
  return reference === null ? loaded : { ...loaded, reference: parseReference(referenceJson, embedded) };
}

const needsDetail = (mode: Mode): boolean => REQUIRES[mode].some((part) => part === 'detail' || part === 'detail:cited');

/** Every part `mode` needs, whole and of the page's release, or a throw naming the first that is not (stale: StaleShellError; damaged: DataShapeError; offline: NetworkError). A mode that needs detail shards has loadDetails and loadCited. */
export async function loadParts(embedded: string, mode: Mode, fetchFn: FetchLike): Promise<Loaded> {
  if (needsDetail(mode)) throw new Error(`the ${mode} mode needs detail shards: load them with loadDetails (the drawer) or loadCited (the brief and the export)`);
  return loadNeeded(embedded, REQUIRES[mode], fetchFn);
}

export { DetailsIncomplete };

const isStale = (reason: unknown): reason is StaleShellError => reason instanceof Error && reason.name === 'StaleShellError';

const isDetail = (file: Record<string, unknown>): file is DetailShard & Record<string, unknown> =>
  typeof file['release'] === 'string' && typeof file['materialId'] === 'string' && isObject(file['records']);

function parseDetail(json: unknown, embedded: string, materialId: string): DetailShard {
  const file = envelope(json, 'detail', `the detail of ${materialId}`, embedded);
  if (file['materialId'] !== materialId) throw new DataShapeError(`the detail of ${materialId}`, `holds ${String(file['materialId'])}`);
  if (!isDetail(file)) throw new DataShapeError(`the detail of ${materialId}`, 'carries no records');
  return file;
}

/**
 * The detail shard of every material asked for, or a throw: all of them, of the page's release, or none. A caller that gets a map has
 * every citation for every row it will write. A stale part (404, another release) rethrows as it is, so the page can reload; any other
 * failure is a DetailsIncomplete naming the first material, in the order asked.
 */
export async function loadDetails(embedded: string, materialIds: readonly string[], fetchFn: FetchLike): Promise<ReadonlyMap<string, DetailShard>> {
  const ids = [...new Set(materialIds)];
  for (const id of ids) if (!isMaterialId(id)) throw new DataShapeError('the address', `names no material (${id})`);
  const settled = await Promise.allSettled(ids.map(async (id) => parseDetail(await fetchPart(fetchFn, embedded, `detail/${id}.json`, `the detail of ${id}`), embedded, id)));
  // Stale wins over any other failure, wherever it is in the list: a stale page reloads, and the failure that came before it in the
  // order asked is likely only the same stale page seen another way.
  for (const outcome of settled) if (outcome.status === 'rejected' && isStale(outcome.reason)) throw outcome.reason;
  const out = new Map<string, DetailShard>();
  settled.forEach((outcome, i) => {
    const id = ids[i] ?? '';
    if (outcome.status === 'rejected') throw new DetailsIncomplete(id, outcome.reason);
    out.set(id, outcome.value);
  });
  return out;
}

/**
 * The brief and the export: the core and the detail shard of every material they cite, together or not at all. A row is never written
 * without its citation, so a caller that holds this holds every citation it can need.
 */
export async function loadCited(embedded: string, mode: 'brief' | 'export', citedMaterialIds: readonly string[], fetchFn: FetchLike): Promise<Loaded & { readonly details: ReadonlyMap<string, DetailShard> }> {
  // Both settle before either is used, and a stale part wins over any other failure, so a stale page reloads.
  const [loaded, details] = await Promise.allSettled([loadNeeded(embedded, REQUIRES[mode], fetchFn), loadDetails(embedded, citedMaterialIds, fetchFn)]);
  for (const outcome of [loaded, details]) if (outcome.status === 'rejected' && isStale(outcome.reason)) throw outcome.reason;
  if (loaded.status === 'rejected') throw loaded.reason;
  if (details.status === 'rejected') throw details.reason;
  return { ...loaded.value, details: details.value };
}
