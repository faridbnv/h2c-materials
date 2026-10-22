// What a page is showing while it loads its data: the guard's outcome, as one state the view switches on.
import { onMounted, ref, shallowRef } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { unexpectedStop } from './copy.ts';
import { reloadOnce, settled } from './guard.ts';
import { DetailsIncomplete, NetworkError, NoMaterialError } from './load.ts';
import { DataShapeError } from './model.ts';
import { embeddedRelease, StaleShellError } from './release.ts';

/** A page with nothing it may show yet. */
export type Blocked =
  | { readonly kind: 'loading' }
  /** The page in this tab is not the current release (the guard refused). `reloading`: the guard has started the one reload it allows; otherwise offer one. */
  | { readonly kind: 'stale'; readonly why: string; readonly reloading: boolean }
  /** `noMaterial`: the release is current and holds no such material (the address is the mistake). */
  | { readonly kind: 'failed'; readonly why: string; readonly noMaterial?: true };

export type LoadState<T> = Blocked | { readonly kind: 'ready'; readonly data: T };

export function blockedBy(error: unknown): Blocked {
  const why = error instanceof Error ? error.message : String(error);
  if (error instanceof StaleShellError) return { kind: 'stale', why, reloading: reloadOnce() };
  if (error instanceof NoMaterialError) return { kind: 'failed', why, noMaterial: true };
  if (error instanceof NetworkError || error instanceof DataShapeError) return { kind: 'failed', why };
  // Nothing was emitted because a shard is missing; the cause (offline, damaged) says which.
  if (error instanceof DetailsIncomplete) return { kind: 'failed', why: error.cause instanceof Error ? `${why} (${error.cause.message})` : why };
  console.error(error);
  return { kind: 'failed', why: unexpectedStop(why) };
}

export function useLoad<T>(load: (release: string) => Promise<T>): { readonly state: ShallowRef<LoadState<T>>; readonly release: Ref<string | null> } {
  const state = shallowRef<LoadState<T>>({ kind: 'loading' });
  const release = ref<string | null>(null);
  onMounted(async () => {
    try {
      release.value = embeddedRelease(document);
      state.value = { kind: 'ready', data: await load(release.value) };
      settled();
    } catch (error) {
      state.value = blockedBy(error);
    }
  });
  return { state, release };
}
