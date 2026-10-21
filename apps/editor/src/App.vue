<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import ConflictsView from './components/ConflictsView.vue';
import DraftsView from './components/DraftsView.vue';
import FindView from './components/FindView.vue';
import { ended, problem, refreshWorkspace, workspace } from './store.ts';
import { when } from './explain.ts';

type View = 'find' | 'drafts' | 'conflicts';
const view = ref<View>('find');
const tabs = computed(() => [
  { id: 'find' as const, label: 'Find and correct', count: null },
  { id: 'drafts' as const, label: 'Drafts', count: workspace.value?.drafts ?? 0 },
  { id: 'conflicts' as const, label: 'Conflicts', count: workspace.value?.conflicts ?? 0 },
]);
onMounted(refreshWorkspace);
</script>

<template>
  <div class="shell">
    <template v-if="ended">
      <main id="main" class="page-view" tabindex="-1">
        <h1>Filament Atlas editor</h1>
        <p class="banner error" role="alert">This editor session has ended. Start it again with <code>npm run editor</code>.</p>
      </main>
    </template>
    <template v-else>
      <header class="strip">
        <a class="skip" href="#main">Skip to the main content</a>
        <h1>Filament Atlas editor</h1>
        <p class="sandbox">Sandbox workspace. Changes stay on this computer.</p>
        <template v-if="workspace">
          <span class="fact">Data commit <span class="num">{{ workspace.commit.slice(0, 10) }}</span></span>
          <span class="fact"><span class="num">{{ workspace.drafts }}</span> draft{{ workspace.drafts === 1 ? '' : 's' }}, not approved</span>
          <span class="fact">Last backup {{ when(workspace.lastBackupAt) }}</span>
          <span class="fact">Source store: {{ workspace.source.available ? 'on this computer' : 'not on this computer' }}</span>
          <span class="fact">Impact preview: {{ workspace.impact.available ? 'available' : workspace.impact.note.includes('WP-11') ? 'not available yet (WP-11)' : 'not available' }}</span>
        </template>
        <p v-else-if="problem" class="banner error" role="alert">{{ problem }}</p>
        <p v-else class="muted" role="status">Opening the workspace...</p>
      </header>
      <div class="notices">
        <div v-if="workspace?.behind" class="banner warn" role="status">{{ workspace.behind }}</div>
        <div v-if="workspace?.rebased" class="banner" role="status">
          When this session started, the data had moved ({{ workspace.rebased.reason }}). Your drafts were backed up and re-applied:
          {{ workspace.rebased.applied }} applied, {{ workspace.rebased.merged }} already merged, {{ workspace.rebased.conflicts }} in conflict.
        </div>
      </div>
      <nav class="tabs" aria-label="Editor sections">
        <button v-for="tab in tabs" :key="tab.id" type="button" :aria-current="view === tab.id ? 'page' : undefined" @click="view = tab.id">
          {{ tab.label }}
          <span v-if="tab.count !== null" class="count" :class="{ alert: tab.id === 'conflicts' && tab.count > 0 }">{{ tab.count }}</span>
        </button>
      </nav>
      <main id="main" tabindex="-1">
        <FindView v-show="view === 'find'" />
        <DraftsView v-if="view === 'drafts'" />
        <ConflictsView v-if="view === 'conflicts'" />
      </main>
    </template>
  </div>
</template>
