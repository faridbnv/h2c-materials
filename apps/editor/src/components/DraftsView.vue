<script setup lang="ts">
// Drafts, the impact of all of them, "Prepare review", and backups (05 section 11.6). Everything here is labelled for what it is: a draft
// is not approved until it is exported, reviewed and merged. "Prepare review" writes into the sandbox export folder and nowhere else.
import { computed, onMounted, ref } from 'vue';
import { api } from '../api.ts';
import { ordered, when } from '../explain.ts';
import { describeFailure, refreshWorkspace, workspace } from '../store.ts';
import ImpactPanel from './ImpactPanel.vue';
import type { BackupEntry, Cells, DraftEntry, ExportResponse } from '../../shared/api.ts';

const drafts = ref<DraftEntry[]>([]);
const backups = ref<BackupEntry[]>([]);
const loaded = ref(false);
const problem = ref<string | null>(null);
const title = ref('');
const exporting = ref(false);
const exported = ref<ExportResponse | null>(null);
const exportRefusal = ref<string | null>(null);
const restoring = ref<string | null>(null);
const note = ref<string | null>(null);
const trigger = ref(1);

const pending = computed(() => drafts.value.filter((d) => d.status === 'draft').length);
const fields = (before: Cells, after: Cells): { name: string; was: string; now: string }[] =>
  ordered(Object.keys(after)).map((name) => ({ name, was: before[name] ?? '(empty)', now: after[name] ?? '(empty)' }));

async function load(): Promise<void> {
  try {
    [drafts.value, backups.value] = await Promise.all([api<DraftEntry[]>('/api/drafts'), api<BackupEntry[]>('/api/backups')]);
    if (title.value === '') title.value = drafts.value.length === 1 ? `Correction: ${drafts.value[0]?.label ?? 'one value'}` : `Corrections to ${drafts.value.length} values`;
    problem.value = null;
  } catch (error) { problem.value = describeFailure(error); }
  loaded.value = true;
}
onMounted(load);

async function prepare(): Promise<void> {
  exporting.value = true;
  exportRefusal.value = null;
  exported.value = null;
  try {
    const answer = await api<ExportResponse | { status: 'refused'; detail: string }>('/api/export', { title: title.value });
    if ('status' in answer) exportRefusal.value = answer.detail; else exported.value = answer;
    await Promise.all([load(), refreshWorkspace()]);
  } catch (error) { exportRefusal.value = describeFailure(error); } finally { exporting.value = false; }
}

async function backUp(): Promise<void> {
  try {
    const made = await api<BackupEntry>('/api/backups', {});
    note.value = `Backed up at ${when(made.at)}.`;
    await Promise.all([load(), refreshWorkspace()]);
  } catch (error) { problem.value = describeFailure(error); }
}

async function restore(name: string): Promise<void> {
  try {
    const answer = await api<{ status: 'restored'; drafts: number } | { status: 'refused'; detail: string }>('/api/restore', { name });
    note.value = answer.status === 'restored' ? `Restored. The workspace now holds ${answer.drafts} draft(s). What it replaced is kept as a backup.` : answer.detail;
    restoring.value = null;
    trigger.value += 1;
    await Promise.all([load(), refreshWorkspace()]);
  } catch (error) { problem.value = describeFailure(error); }
}
</script>

<template>
  <div class="page-view stack">
    <h2 id="drafts-h">Drafts</h2>
    <p v-if="problem" class="banner error" role="alert">{{ problem }}</p>
    <p v-if="loaded && drafts.length === 0" class="muted">There are no drafts. Correct a value under "Find and correct" and it appears here, labelled as a draft.</p>
    <ul v-if="drafts.length" class="stack" style="list-style: none; padding: 0" aria-labelledby="drafts-h">
      <li v-for="d in drafts" :key="d.opId" class="card stack">
        <div class="row">
          <strong>{{ d.label }}</strong>
          <span class="badge" :class="{ done: d.status === 'exported' }">{{ d.status === 'draft' ? 'draft, not approved' : `exported in ${d.changeSetId}, not yet merged` }}</span>
        </div>
        <p v-for="f in fields(d.before, d.after)" :key="f.name"><span class="muted">{{ f.name }}:</span> <span class="was num">{{ f.was }}</span> <span class="now num">{{ f.now }}</span></p>
        <p><span class="muted">Reason:</span> {{ d.reason }}</p>
        <p v-if="d.evidence"><span class="muted">Quote, page {{ d.evidence.page }} of {{ d.evidence.sourceId }}:</span> <q>{{ d.evidence.quote }}</q></p>
        <p v-if="d.quoteCheck" class="hint">{{ d.quoteCheck.status === 'verified' ? 'The quote was found on that page when this was saved.' : `The quote was not checked against the page (${d.quoteCheck.reason ?? 'no reason given'}).` }}</p>
      </li>
    </ul>

    <ImpactPanel :trigger="trigger" />

    <section class="stack" aria-labelledby="review-h">
      <h3 id="review-h">Prepare review</h3>
      <p>Writes the change set and the changed table to <code>{{ workspace?.exportDir }}</code>. Nothing is sent anywhere, and nothing is written to the data folder.</p>
      <div>
        <label for="export-title">Title of the change set</label>
        <input id="export-title" v-model="title" autocomplete="off" />
      </div>
      <div class="row">
        <button class="btn primary" type="button" :disabled="exporting || pending === 0" @click="prepare">{{ exporting ? 'Preparing...' : 'Prepare review' }}</button>
        <span v-if="pending === 0" class="hint">Nothing to prepare: no new drafts.</span>
      </div>
      <p v-if="exportRefusal" class="banner error" role="alert">{{ exportRefusal }}</p>
      <div v-if="exported" class="banner ok" role="status">
        <p><strong>Change set {{ exported.changeSetId }} is ready</strong> with {{ exported.records }} record{{ exported.records === 1 ? '' : 's' }}, in the sandbox only.</p>
        <ul><li v-for="f in exported.files" :key="f"><code>{{ f }}</code></li></ul>
      </div>
    </section>

    <section class="stack" aria-labelledby="backup-h">
      <h3 id="backup-h">Backups</h3>
      <div class="row">
        <button class="btn" type="button" @click="backUp">Back up now</button>
        <span class="hint">Last backup {{ when(workspace?.lastBackupAt ?? null) }}. The editor also backs up every ten minutes and before anything risky.</span>
      </div>
      <p v-if="note" class="banner ok" role="status">{{ note }}</p>
      <table v-if="backups.length">
        <caption>Backups, newest first</caption>
        <thead><tr><th scope="col">Made</th><th scope="col">Why</th><th scope="col"><span class="sr">Action</span></th></tr></thead>
        <tbody>
          <tr v-for="b in backups.slice(0, 12)" :key="b.name">
            <td>{{ when(b.at) }}</td>
            <td>{{ b.reason }}</td>
            <td>
              <button v-if="restoring !== b.name" class="btn" type="button" :aria-label="`Restore the backup of ${when(b.at)}`" @click="restoring = b.name">Restore</button>
              <span v-else class="row">
                <button class="btn danger" type="button" @click="restore(b.name)">Restore this backup</button>
                <button class="btn" type="button" @click="restoring = null">Cancel</button>
                <span class="hint">Drafts made after it go back to how it was. A safety backup of the current workspace is made first.</span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
