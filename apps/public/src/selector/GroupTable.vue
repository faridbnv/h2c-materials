<script setup lang="ts">
// One table of the results: the columns' headings (a press on one sorts by it), the reference row when a baseline is chosen, and the rows.
import type { GroupView, RowView, TableView } from './table.ts';
import type { Store } from './store.ts';
import { inject } from 'vue';

defineProps<{ readonly group: GroupView; readonly view: TableView }>();
const store = inject<Store>('store');
const sort = (key: string): void => { store?.actions.sort(key); };
const rowKey = (row: RowView): string => `${row.baseline ? 'baseline-' : ''}${row.id}`;
</script>

<template>
  <div class="table-scroll">
    <table class="grid results" :data-group="group.group ?? undefined" data-testid="results-table">
      <colgroup><col v-for="c in view.columns" :key="c.key" :style="{ width: c.width }"></colgroup>
      <thead>
        <tr>
          <template v-for="h in view.head" :key="h.key">
            <th v-if="h.pin" class="pin-col" data-testid="head-pin" :title="h.label" :aria-label="h.label"><span aria-hidden="true">☆</span></th>
            <th v-else :data-sort="h.key" :data-testid="`head-${h.key}`" :class="h.cls" :title="h.title ?? undefined" :aria-sort="h.ariaSort === 'ascending' ? 'ascending' : h.ariaSort === 'descending' ? 'descending' : undefined" tabindex="0"
              @click="sort(h.key)" @keydown.enter.prevent="sort(h.key)" @keydown.space.prevent="sort(h.key)">{{ h.label }}<template v-if="h.unit">{{ ' ' }}<span class="u">{{ h.unit }}</span></template>{{ h.arrow }}<span v-if="h.sub" class="th-sub">median · range</span></th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-if="group.reference" class="baseline-row" :data-material="group.reference.id" tabindex="0" title="Reference only. Not a candidate and not counted.">
          <td v-for="(cell, i) in group.reference.cells" :key="i" :class="cell.cls || undefined" v-html="cell.html" />
        </tr>
        <tr v-for="row in group.rows" :key="rowKey(row)" :data-material="row.id" :data-selected="row.selected" tabindex="0" data-testid="result-row">
          <td v-for="(cell, i) in row.cells" :key="i" :class="cell.cls || undefined" :data-testid="`cell-${view.columns[i]?.key}`" v-html="cell.html" />
        </tr>
      </tbody>
    </table>
  </div>
</template>
