<script setup lang="ts">
// The table lens (the old table.js renderTable): the bar above it, the family note, one table per group, and the hits the filters removed.
// The structure is Vue's; each cell's markup is the facts layer's, put in its td. A press on a row, a mark or a star is handled once, at the
// lens (Selector.vue), by what the element says it is.
import { onMounted, onUpdated, ref } from 'vue';
import { markTableOverflow } from '@atlas/pages/facts/format';
import GroupTable from './GroupTable.vue';
import type { TableView } from './table.ts';
import type { Store } from './store.ts';

const props = defineProps<{ readonly view: TableView; readonly store: Store }>();
const { state, actions } = props.store;

// "Unlikely to meet" starts folded; the reader's choice stays through the changes that rebuild the table.
const unlikelyOpen = ref(false);
const root = ref<HTMLElement | null>(null);
const fit = (): void => { if (root.value) markTableOverflow(root.value); };
onMounted(fit);
onUpdated(fit);

const setBaseline = (event: Event): void => { actions.setBaseline((event.target as HTMLSelectElement).value); };
const setGoal = (event: Event): void => { actions.setGoal((event.target as HTMLSelectElement).value); };
</script>

<template>
  <div ref="root" data-testid="results">
    <div class="table-bar">
      <div class="colset-pick">
        <div class="segmented" role="group" aria-label="Which columns to show" aria-describedby="colset-help">
          <button v-for="c in view.colsets" :key="c.key" type="button" :data-colset="c.key" :aria-pressed="c.pressed" :title="c.help" @click="actions.setColumns(c.key)">{{ c.label }}</button>
        </div>
        <span id="colset-help" class="colset-help">{{ view.colsetHelp }}</span>
      </div>
      <label class="rank-pick" title="Orders the results by a performance index, worked out for each passing product; a material ranks by the median of its products.">
        Rank by
        <select data-rank-by data-testid="rank-by" :value="state.scenario.rankBy ?? ''" @change="setGoal">
          <option value="">none (sort by a column)</option>
          <option v-for="i in view.rankOptions" :key="i.id" :value="i.id">{{ i.label }}</option>
        </select>
      </label>
      <label class="baseline-pick" title="Adds a familiar material as a reference row. It is never a candidate.">
        Compare against
        <select data-baseline data-testid="baseline" :value="state.baseline ?? ''" @change="setBaseline">
          <option value="">no reference</option>
          <option v-for="m in view.baselineOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </label>
      <div class="legend-row" role="group" aria-label="What the marks in the table mean" v-html="view.legend" />
      <p v-if="view.sortNote" class="sort-note" role="status">{{ view.sortNote }}</p>
      <p v-if="view.rankNote" class="sort-note" role="status">{{ view.rankNote }} <button type="button" class="link-btn" data-rank-order @click="actions.setGoal(state.scenario.rankBy)">Order by rank</button></p>
    </div>
    <div v-if="view.family" v-html="view.family" />
    <p v-if="view.empty" class="empty-line">{{ view.empty }}</p>
    <template v-for="g in view.groups" :key="g.group ?? 'all'">
      <h3 v-if="g.heading && !g.folded">{{ g.heading }}</h3>
      <p v-if="g.note && !g.folded" class="group-note">{{ g.note }}</p>
      <details v-if="g.folded" class="unlikely-to-meet" :open="unlikelyOpen" @toggle="unlikelyOpen = ($event.target as HTMLDetailsElement).open">
        <summary>{{ g.heading }}</summary>
        <p v-if="g.note" class="group-note">{{ g.note }}</p>
        <GroupTable :group="g" :view="view" />
      </details>
      <GroupTable v-else :group="g" :view="view" />
    </template>
    <div v-if="view.excluded" v-html="view.excluded" />
  </div>
</template>
