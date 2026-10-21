<script setup lang="ts">
// The three values of a stale edit side by side (05 section 11.4, journey 4): what the writer expected, what the data holds now, and
// what the writer wanted. Nothing here decides anything.
import { computed } from 'vue';
import { ordered } from '../explain.ts';
import type { Cells } from '../../shared/api.ts';

const props = defineProps<{ expected: Cells; now: Cells | null; wanted: Cells }>();
const names = computed(() => ordered(Object.keys(props.wanted)));
const shown = (cells: Cells | null, name: string): string => (cells === null ? 'no such record' : cells[name] ?? '(empty)');
</script>

<template>
  <div class="three">
    <div>
      <h4>The value you expected</h4>
      <dl><template v-for="name in names" :key="name"><dt>{{ name }}</dt><dd class="was">{{ shown(expected, name) }}</dd></template></dl>
    </div>
    <div>
      <h4>The value in the data now</h4>
      <dl><template v-for="name in names" :key="name"><dt>{{ name }}</dt><dd>{{ shown(now, name) }}</dd></template></dl>
    </div>
    <div>
      <h4>The value you wanted</h4>
      <dl><template v-for="name in names" :key="name"><dt>{{ name }}</dt><dd class="now">{{ shown(wanted, name) }}</dd></template></dl>
    </div>
  </div>
</template>
