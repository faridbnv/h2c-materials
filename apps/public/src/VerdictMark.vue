<script setup lang="ts">
// A verdict is an icon and words, never colour alone (interface rule 5). The shapes differ: a tick, a cross, a hollow diamond.
import type { Status } from '@atlas/domain';
import type { Verdict } from './model.ts';

defineProps<{ readonly verdict: Verdict | Status }>();
</script>

<template>
  <span class="mark" :class="`mark-${verdict === 'INDETERMINATE' ? 'UNKNOWN' : verdict}`">
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
      <path v-if="verdict === 'PASS'" d="M3 8.5l3.2 3.2L13 4.8" />
      <path v-else-if="verdict === 'FAIL'" d="M4 4l8 8M12 4l-8 8" />
      <path v-else d="M8 2.5l5.5 5.5L8 13.5 2.5 8z" />
    </svg>
    <span><slot /></span>
  </span>
</template>
