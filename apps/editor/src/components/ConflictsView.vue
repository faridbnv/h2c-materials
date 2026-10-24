<script setup lang="ts">
// Conflicts (05 section 11.4, journey 4): a draft whose expectation no longer holds because the data moved. It is kept, shown in three
// columns, and never applied silently. Applying it again is a new command written against what the record holds now.
import { onMounted, ref } from 'vue';
import { api } from '../api.ts';
import { describeFailure, refreshWorkspace } from '../store.ts';
import ThreeValues from './ThreeValues.vue';
import type { ConflictAction, ConflictEntry } from '../../shared/api.ts';

const conflicts = ref<ConflictEntry[]>([]);
const loaded = ref(false);
const problem = ref<string | null>(null);
const confirming = ref<string | null>(null);
const note = ref<string | null>(null);

async function load(): Promise<void> {
  try { conflicts.value = await api<ConflictEntry[]>('/api/conflicts'); problem.value = null; } catch (error) { problem.value = describeFailure(error); }
  loaded.value = true;
}
onMounted(load);

async function resolve(opId: string, action: ConflictAction): Promise<void> {
  problem.value = null;
  try {
    const answer = await api<{ status: 'applied' | 'discarded' | 'refused'; detail?: string }>(`/api/conflicts/${encodeURIComponent(opId)}/resolve`, { action });
    if (answer.status === 'refused') problem.value = answer.detail ?? 'The write service refused it.';
    else note.value = answer.status === 'applied' ? 'Applied again as a new draft, against the value the data holds now. Nothing is approved yet.' : 'Discarded. A backup was made first, so it can still be restored.';
    confirming.value = null;
    await Promise.all([load(), refreshWorkspace()]);
  } catch (error) { problem.value = describeFailure(error); }
}
</script>

<template>
  <div class="page-view stack">
    <h2 id="conflicts-h">Conflicts</h2>
    <p class="muted">A conflict is a draft the data has moved under. It is kept here, and nothing is applied until you choose. An export waits until none is left.</p>
    <p v-if="problem" class="banner error" role="alert">{{ problem }}</p>
    <p v-if="note" class="banner ok" role="status">{{ note }}</p>
    <p v-if="loaded && conflicts.length === 0" class="muted">There are no conflicts.</p>
    <ul v-if="conflicts.length" class="stack" style="list-style: none; padding: 0" aria-labelledby="conflicts-h">
      <li v-for="c in conflicts" :key="c.opId" class="card stale stack">
        <div class="row"><strong>{{ c.label }}</strong><span class="badge">draft, not approved</span></div>
        <p>The data moved since you wrote this. Compare the three values.</p>
        <ThreeValues :expected="c.expected" :now="c.now" :wanted="c.wanted" />
        <p><span class="muted">Reason:</span> {{ c.reason }}</p>
        <p v-if="c.evidence"><span class="muted">Quote, page {{ c.evidence.page }} of {{ c.evidence.sourceId }}:</span> <q>{{ c.evidence.quote }}</q></p>
        <div class="row">
          <button class="btn primary" type="button" @click="resolve(c.opId, 'apply-mine')">Apply my change to the current value</button>
          <span class="hint">Leave it here to keep it parked.</span>
          <button v-if="confirming !== c.opId" class="btn danger" type="button" @click="confirming = c.opId">Discard</button>
          <span v-else class="row">
            <button class="btn danger" type="button" @click="resolve(c.opId, 'discard')">Discard this draft</button>
            <button class="btn" type="button" @click="confirming = null">Keep it</button>
            <span class="hint">A backup is made first.</span>
          </span>
        </div>
        <details><summary>Show technical detail</summary><pre>{{ c.code }}: {{ c.detail }}</pre></details>
      </li>
    </ul>
  </div>
</template>
