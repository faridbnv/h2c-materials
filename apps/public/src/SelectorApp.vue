<script setup lang="ts">
// The selector's boot: the parts a strict answer needs (the core, whole and of this page's release), then the page. Until they have arrived the
// page says it is loading; if one cannot be had it says so and offers a reload; it never shows an answer from part of the data (pack 02
// section 9.6). Explore with estimates fetches the estimates part when it is asked for, and the drawer fetches the open material's detail.
import { onMounted, shallowRef } from 'vue';
import type { DetailShard } from '@atlas/domain';
import { settled } from './guard.ts';
import { LOADING } from './copy.ts';
import LoadNotice from './LoadNotice.vue';
import { loadDetails, loadEstimates, loadParts, loadShared } from './parts.ts';
import type { Shared } from './parts.ts';
import { embeddedRelease } from './release.ts';
import Selector from './selector/Selector.vue';
import { setPagesBase } from './selector/pages-base.ts';
import { createStore } from './selector/store.ts';
import type { Store } from './selector/store.ts';
import { blockedBy } from './useLoad.ts';
import type { Blocked } from './useLoad.ts';

const store = shallowRef<Store | null>(null);
const blocked = shallowRef<Blocked | null>({ kind: 'loading' });

onMounted(async () => {
  try {
    const release = embeddedRelease(document);
    const fetchPart = (url: string) => fetch(url);
    const loaded = await loadParts(release, 'strict', fetchPart);
    setPagesBase(__MATERIAL_PAGES__);
    const details = new Map<string, DetailShard>();
    let shared: Promise<Shared> | null = null;
    const made = createStore(loaded, {
      loadEstimates: () => loadEstimates(release, loaded.model, fetchPart),
      loadDrawerParts: async (id) => {
        // A part that failed is asked for again the next time a drawer opens, not remembered as failed.
        shared ??= loadShared(release, fetchPart).catch((error: unknown) => { shared = null; throw error; });
        const kept = details.get(id);
        const detail = kept ?? (await loadDetails(release, [id], fetchPart)).get(id);
        if (!detail) throw new Error(`the detail of ${id} was not returned`);
        details.set(id, detail);
        return { detail, shared: await shared };
      },
    });
    made.start(location.hash.slice(1));
    await made.render();
    store.value = made;
    blocked.value = null;
    settled();
  } catch (error) {
    blocked.value = blockedBy(error);
  }
});
</script>

<template>
  <Selector v-if="store" :store="store" />
  <main v-else class="boot">
    <LoadNotice v-if="blocked" :state="blocked" />
    <p v-else class="notice" role="status" data-testid="load-notice" data-state="loading">{{ LOADING }}</p>
  </main>
</template>
