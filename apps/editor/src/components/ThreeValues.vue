<script setup lang="ts">
// The three values of a stale edit side by side (05 section 11.4, journey 4): what the writer expected, what the data holds now, and
// what the writer wanted. Nothing here decides anything.
import { computed } from 'vue';
import { ordered } from '../explain.ts';
import type { Cells } from '../../shared/api.ts';

const props = defineProps<{ expected: Cells; now: Cells | null; wanted: Cells }>();
const names = computed(() => ordered(Object.keys(props.wanted)));
const columns = computed(() => [
  { title: 'The value you expected', cells: props.expected, tone: 'was' },
  { title: 'The value in the data now', cells: props.now, tone: '' },
  { title: 'The value you wanted', cells: props.wanted, tone: 'now' },
]);
const shown = (cells: Cells | null, name: string): string => (cells === null ? 'no such record' : cells[name] ?? '(empty)');
</script>

<template>
  <div class="three">
    <div v-for="column in columns" :key="column.title">
      <h4>{{ column.title }}</h4>
      <dl><template v-for="name in names" :key="name"><dt>{{ name }}</dt><dd :class="column.tone">{{ shown(column.cells, name) }}</dd></template></dl>
    </div>
  </div>
</template>
