// What the chart lenses, the exports and the decision brief ask of the release's parts, as the selector's store holds them (WP-27): the reference part, the cited details and the
// details whose measurements a chart view reads. Their own module, so the first screen does not carry the wiring; the selector asks for it when a lens or an export first needs it.
// A failure writes the address first (`flush`), because the stale-shell guard may reload the page and the reload keeps only what the address holds.
import type { DetailShard } from '@atlas/domain';
import type { CoreReadModel } from '@atlas/domain';
import type { FetchLike } from './load.ts';
import { loadCited, loadReference } from './lens-parts.ts';
import { loadDetails } from './parts.ts';

export interface LensHooks {
  /** The Ashby reference set, once the rest of every material's headline values is on the model. */
  readonly loadReference: () => Promise<unknown>;
  /** The detail of every material an export or a brief cites, all of it or a throw. */
  readonly loadCited: (kind: 'brief' | 'export', ids: readonly string[]) => Promise<ReadonlyMap<string, DetailShard>>;
  /** The detail of the materials a chart view reads measurements of; what the drawer has fetched is not fetched again. */
  readonly loadMeasurements: (ids: readonly string[]) => Promise<ReadonlyMap<string, DetailShard>>;
}

export function lensHooks(release: string, model: CoreReadModel, fetchPart: FetchLike, details: Map<string, DetailShard>, flush: () => void): LensHooks {
  const guarded = <A extends unknown[], R>(load: (...args: A) => Promise<R>) => async (...args: A): Promise<R> => {
    try { return await load(...args); } catch (error) { flush(); throw error; }
  };
  return {
    loadReference: guarded(() => loadReference(release, model, fetchPart)),
    loadCited: guarded(async (kind, ids) => (await loadCited(release, kind, ids, fetchPart)).details),
    loadMeasurements: guarded(async (ids) => {
      const need = ids.filter((id) => !details.has(id));
      if (need.length) for (const [id, shard] of await loadDetails(release, need, fetchPart)) details.set(id, shard);
      return new Map(ids.flatMap((id) => { const shard = details.get(id); return shard ? [[id, shard] as const] : []; }));
    }),
  };
}
