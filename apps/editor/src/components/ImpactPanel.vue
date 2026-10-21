<script setup lang="ts">
// Which answers would move (05 section 11.5). It asks the service, which asks the same engine as the site. If that engine is not on
// this branch the panel says "not available yet" and gives no count: it never turns "could not ask" into "nothing moves".
import { computed, ref, watch } from 'vue';
import { api } from '../api.ts';
import { describeFailure } from '../store.ts';
import type { ImpactResponse } from '../../shared/api.ts';

const props = defineProps<{ trigger: number }>();

const phase = ref<'idle' | 'running' | 'done'>('idle');
const result = ref<ImpactResponse | null>(null);
const showAll = ref(false);
let ticket = 0;

async function run(): Promise<void> {
  const mine = ++ticket;
  phase.value = 'running';
  showAll.value = false;
  try {
    const answer = await api<ImpactResponse>('/api/impact', {});
    if (mine === ticket) { result.value = answer; phase.value = 'done'; }
  } catch (error) {
    if (mine === ticket) { result.value = { status: 'failed', reason: describeFailure(error) }; phase.value = 'done'; }
  }
}

watch(() => props.trigger, (value) => { if (value > 0) void run(); }, { immediate: true });

const ready = computed(() => (result.value?.status === 'ready' ? result.value : null));
const moves = computed(() => (showAll.value ? ready.value?.moves ?? [] : (ready.value?.moves ?? []).slice(0, 60)));
const sentence = computed(() => {
  const r = ready.value;
  if (r === null) return '';
  if (r.moved === 0) return 'These corrections move no answer among the questions that were asked.';
  return `These corrections change ${r.moved} answer${r.moved === 1 ? '' : 's'}.`;
});
</script>

<template>
  <section class="stack" aria-labelledby="impact-h" aria-live="polite">
    <div class="row">
      <h3 id="impact-h">Which answers would move</h3>
      <button class="btn" type="button" :disabled="phase === 'running'" @click="run">Check again</button>
    </div>
    <p v-if="phase === 'idle'" class="muted">Save a correction as a draft to see which answers it moves.</p>
    <p v-else-if="phase === 'running'" class="muted" role="status">Calculating. This takes a few seconds, and longer when estimates are included.</p>
    <template v-else-if="result">
      <p v-if="result.status === 'unavailable'" class="banner warn">
        <strong>{{ result.reason }}</strong> The editor cannot say what these corrections change. That is not the same as "nothing moves".
      </p>
      <p v-else-if="result.status === 'nothing-pending'" class="muted">{{ result.reason }}</p>
      <p v-else-if="result.status === 'failed'" class="banner error" role="alert">{{ result.reason }}</p>
      <template v-else-if="ready">
        <p class="banner" :class="ready.moved > 0 ? 'warn' : 'ok'"><strong>{{ sentence }}</strong>
          <span v-if="ready.listingShifts"> {{ ready.listingShifts }} record{{ ready.listingShifts === 1 ? '' : 's' }} only changed their place in a list.</span>
          <span v-if="ready.estimatesPending"> Questions that need the estimate stage have not been asked yet, so this is not the whole picture.</span>
        </p>
        <p v-if="Object.keys(ready.byTemplate).length" class="hint">
          By template: <span v-for="(n, name) in ready.byTemplate" :key="name" class="badge plain">{{ name }}: {{ n }}</span>
        </p>
        <table v-if="ready.moves.length">
          <caption>Answers that change, before and after</caption>
          <thead><tr><th scope="col">Material</th><th scope="col">Question</th><th scope="col">Record</th><th scope="col">What changes</th></tr></thead>
          <tbody>
            <tr v-for="(move, k) in moves" :key="k">
              <td>{{ move.materialId }}</td>
              <td>{{ move.case }}</td>
              <td>{{ move.record }}</td>
              <td><span v-for="c in move.changes" :key="c.field" class="row">{{ c.field }}: <span class="was">{{ c.before }}</span> <span class="now">{{ c.after }}</span></span></td>
            </tr>
          </tbody>
        </table>
        <button v-if="ready.moves.length > moves.length" class="link" type="button" @click="showAll = true">Show all {{ ready.moves.length }}</button>
        <p class="hint">Calculated in {{ ready.seconds.toFixed(1) }} s by the engine the site uses, on a copy of the data with your drafts applied.</p>
      </template>
    </template>
  </section>
</template>
