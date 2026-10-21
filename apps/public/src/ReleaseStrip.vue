<script setup lang="ts">
import { SITE, UI } from './copy.ts';

defineProps<{ readonly release: string | null; readonly snapshot?: string | undefined }>();
</script>

<template>
  <header class="strip" data-testid="release-strip">
    <p class="site">{{ SITE }}</p>
    <dl class="release">
      <div><dt>{{ UI.release }}</dt><dd data-testid="release-id">{{ release ?? UI.unknownRelease }}</dd></div>
      <div v-if="snapshot"><dt>{{ UI.dataOf }}</dt><dd data-testid="data-date">{{ snapshot }}</dd></div>
    </dl>
  </header>
</template>
