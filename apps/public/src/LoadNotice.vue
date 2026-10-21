<script setup lang="ts">
// What a page says when it has nothing it may show: still loading, refused as stale, or failed. It always offers a reload,
// because a reload is what fixes the first two causes (a cached page, a cached part).
import { computed } from 'vue';
import { FAILED, LOADING, RELOAD, STALE } from './copy.ts';
import type { Blocked } from './useLoad.ts';

const props = defineProps<{ readonly state: Blocked }>();
const notice = computed(() => (props.state.kind === 'stale' ? STALE : FAILED));
const reload = (): void => { window.location.reload(); };
</script>

<template>
  <p v-if="state.kind === 'loading'" class="notice" role="status" data-testid="load-notice" data-state="loading">{{ LOADING }}</p>
  <section v-else class="notice notice-stop" role="alert" data-testid="load-notice" :data-state="state.kind">
    <h1>{{ notice.heading }}</h1>
    <p>{{ notice.body }}</p>
    <p v-if="state.why" class="why">{{ state.why }}</p>
    <button type="button" @click="reload">{{ RELOAD }}</button>
  </section>
</template>
