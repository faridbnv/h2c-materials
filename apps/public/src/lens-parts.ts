// The parts the chart lenses, the exports and the decision brief ask for (pack 02 section 9.6): the reference part (the Ashby reference set, and the rest of every
// material's headline values, which the core does not carry) and the cited details. Their own module, so the first screen does not carry the code that reads them; parts.ts
// re-exports what its callers know.
import type { CoreReadModel, DetailShard } from '@atlas/domain';
import { applyHeadlines, HeadlinesDoNotFitError } from '@atlas/publish/headlines';
import { DetailsIncomplete, fetchPart } from './load.ts';
import type { FetchLike } from './load.ts';
import { DataShapeError } from './model.ts';
import { REQUIRES, envelope, isObject, isStale, loadDetails, loadNeeded } from './parts.ts';
import type { Loaded } from './parts.ts';

/** The reference part: the Ashby reference set, and the rest of every material's headline values, which the chart lenses read and the core does not carry. */
export function parseReference(json: unknown, embedded: string): { readonly reference: unknown; readonly headlines: Record<string, Record<string, unknown>>; readonly meta: Record<string, unknown> } {
  const file = envelope(json, 'reference', 'the reference part', embedded);
  if (!isObject(file['reference'])) throw new DataShapeError('the reference part', 'carries no reference set');
  const headlines = file['headlines'];
  if (!isObject(headlines)) throw new DataShapeError('the reference part', 'carries no headline values');
  const meta = file['meta'];
  if (!isObject(meta)) throw new DataShapeError('the reference part', 'carries no meta facts');
  return { reference: file['reference'], headlines: headlines as Record<string, Record<string, unknown>>, meta };
}

/** The headlines on the core, in place; a part that does not fit this core is a damaged one. */
export function joinHeadlines(model: Record<string, unknown>, parsed: { readonly headlines: Record<string, Record<string, unknown>>; readonly meta: Record<string, unknown> }): void {
  try {
    applyHeadlines(model, parsed.headlines, parsed.meta);
  } catch (error) {
    if (error instanceof HeadlinesDoNotFitError) throw new DataShapeError('the reference part', `does not fit the core part (${error.message})`);
    throw error;
  }
}

/**
 * The reference part (reference.json), on a core already loaded: whole and of the page's release, or a throw. The Ashby reference set comes back, and the rest of
 * every material's headline values is put on the model, which is then as `loadParts(…, 'ashby')` would have made it. A chart lens asks for it when first opened.
 */
export async function loadReference(embedded: string, model: CoreReadModel, fetchFn: FetchLike): Promise<unknown> {
  const parsed = parseReference(await fetchPart(fetchFn, embedded, 'reference.json', 'the reference part'), embedded);
  joinHeadlines(model, parsed);
  return parsed.reference;
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
