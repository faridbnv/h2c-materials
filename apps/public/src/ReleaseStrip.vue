<script setup lang="ts">
import { SITE, UI } from './copy.ts';

defineProps<{ readonly release: string | null; readonly snapshot?: string | undefined }>();
</script>

<template>
  <header class="strip">
    <p class="site">{{ SITE }}</p>
    <dl class="release">
      <div><dt>{{ UI.release }}</dt><dd>{{ release ?? UI.unknownRelease }}</dd></div>
      <div v-if="snapshot"><dt>{{ UI.dataOf }}</dt><dd>{{ snapshot }}</dd></div>
    </dl>
  </header>
</template>
