// What a page is showing while it loads its data: the guard's outcome, as one state the view switches on.
import { onMounted, ref, shallowRef } from 'vue';
import type { Ref, ShallowRef } from 'vue';
import { unexpectedStop } from './copy.ts';
import { NetworkError } from './load.ts';
import { DataShapeError } from './model.ts';
import { embeddedRelease, StaleShellError } from './release.ts';

/** A page with nothing it may show yet. */
export type Blocked =
  | { readonly kind: 'loading' }
  /** The page in this tab is not the current release (the guard refused). Offer a reload. */
  | { readonly kind: 'stale'; readonly why: string }
  | { readonly kind: 'failed'; readonly why: string };

export type LoadState<T> = Blocked | { readonly kind: 'ready'; readonly data: T };

function blockedBy(error: unknown): Blocked {
  const why = error instanceof Error ? error.message : String(error);
  if (error instanceof StaleShellError) return { kind: 'stale', why };
  if (error instanceof NetworkError || error instanceof DataShapeError) return { kind: 'failed', why };
  return { kind: 'failed', why: unexpectedStop(why) };
}

export function useLoad<T>(load: (release: string) => Promise<T>): { readonly state: ShallowRef<LoadState<T>>; readonly release: Ref<string | null> } {
  const state = shallowRef<LoadState<T>>({ kind: 'loading' });
  const release = ref<string | null>(null);
  onMounted(async () => {
    try {
      release.value = embeddedRelease(document);
      state.value = { kind: 'ready', data: await load(release.value) };
    } catch (error) {
      state.value = blockedBy(error);
    }
  });
  return { state, release };
}
