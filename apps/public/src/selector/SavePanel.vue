<script setup lang="ts">
// Save / share (the old main.js renderScenario): the selection as a link, as a file, and a way to start from a different kind of part; the
// chosen products with their notes and test results; and the record of this build. Loading a file validates the whole file before anything
// changes, so a damaged one leaves the session as it was, and says so here, in the panel, where a dialog used to say it.
//
// The exports (the rows on screen as CSV, their products, a chosen product's decision brief) belong to the export (WP-27), which waits for
// the detail of every material it cites.
import './drawer.css';
import { computed, ref } from 'vue';
import { UNKNOWN_POLICY } from '@atlas/engine/port/constraints.ts';
import { deserialize, serialize, toHash } from '@atlas/engine/port/scenario.ts';
import { dayWords } from '@atlas/pages/facts/dates';
import { POLICY_CONTROL, policyLabel } from '@atlas/pages/facts/labels';
import type { Loose } from '@atlas/pages/loose';
import { productLabel } from './product-label.ts';
import { candidateCount } from './start.ts';
import type { Store } from './store.ts';
import { TEMPLATES } from './templates.ts';

const props = defineProps<{ readonly store: Store }>();
const { state, actions } = props.store;
const db = state.db;

const scenario = computed<Loose>(() => { void state.vrev; return state.scenario; });
const sel = computed<Loose>(() => { void state.vrev; return state.selection; });
const tested = computed(() => scenario.value.constraints.length > 0);
const hard = computed(() => scenario.value.constraints.filter((c: Loose) => c.mandatory !== false).length);
const soft = computed(() => scenario.value.constraints.length - hard.value);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

const chosen = computed(() => {
  void state.vrev;
  const entries = new Map<string, Loose>(sel.value.evaluations.flatMap((e: Loose) => e.products ?? []).map((p: Loose) => [p.gradeId, p]));
  return (scenario.value.decisions ?? []).map((d: Loose) => ({ d, g: db.grades.find((x: Loose) => x.id === d.gradeId), e: entries.get(d.gradeId) }));
});
const today = db.meta.release?.id;

// ---- the link and the file
const copied = ref(false);
const copyProblem = ref('');
async function copyLink(): Promise<void> {
  const url = `${location.href.split('#')[0]}#${toHash(scenario.value)}`;
  try { await navigator.clipboard.writeText(url); copied.value = true; copyProblem.value = ''; }
  catch { copyProblem.value = url; }
}
function download(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const saveFile = (): void => { download(`h2c-scenario-${new Date().toISOString().slice(0, 10)}.json`, serialize(scenario.value), 'application/json'); };

const fileInput = ref<HTMLInputElement | null>(null);
const problem = ref('');
async function onFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  // Validate completely before committing anything, so a bad file leaves the session intact.
  let loaded: Loose;
  try {
    loaded = deserialize(await file.text(), db.meta, props.store.validationOptions());
  } catch (error) {
    problem.value = `Could not load that scenario, and nothing was changed.\n\n${error instanceof Error ? error.message : String(error)}`;
    return;
  }
  problem.value = '';
  actions.replaceScenario(loaded.scenario);
  for (const w of loaded.warnings) actions.say(w);
}

// ---- the chosen products
const note = (gradeId: string, event: Event): void => { actions.setDecisionNote(gradeId, (event.target as HTMLInputElement).value.trim()); };
const FIELDS: [string, string][] = [['date', 'Date'], ['operator', 'Operator'], ['recipe', 'Printer and recipe'], ['orientation', 'Orientation'], ['conditioning', 'Conditioning'], ['method', 'Method'], ['result', 'Result'], ['notes', 'Notes']];
function record(gradeId: string, event: Event): void {
  const form = event.target as HTMLFormElement;
  const result = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v).trim() || null]));
  if (Object.values(result).some(Boolean)) { actions.addTestResult(gradeId, result); form.reset(); }
}
</script>

<template>
  <div class="drawer" role="dialog" aria-label="Save or share this selection" data-testid="save-panel">
    <div class="drawer-head"><div style="display:flex;gap:10px"><div style="flex:1">
      <h2>This selection</h2>
      <div class="sub">Save it, share it, or start from a different kind of part</div></div>
      <button id="sc-close" type="button" class="icon-btn" aria-label="Close" @click="actions.closeDrawer()">✕</button></div></div>
    <div class="drawer-tabs"></div>
    <div class="drawer-body">

      <div class="sc-summary">
        <div v-if="tested" class="sc-big">{{ sel.counts.pass }}<span>of {{ sel.counts.total }} materials pass</span></div>
        <div v-else class="sc-big">{{ sel.counts.total }}<span>materials, nothing tested yet</span></div>
        <div class="sc-lines">
          <div>{{ plural(hard, 'requirement') }}<template v-if="soft">, {{ soft }} reported, not required</template></div>
          <div>{{ POLICY_CONTROL }}: {{ policyLabel(scenario.unknownPolicy) }}</div>
          <div v-if="scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION">Estimates and resin data: {{ state.useEstimates ? 'on (never pass; resin data, and the estimate of a material with no product on record, may hide one)' : 'off' }}</div>
          <div v-if="scenario.shortlist.length">{{ scenario.shortlist.length }} shortlisted</div>
          <div v-if="scenario.assumptions.length" class="warn">{{ plural(scenario.assumptions.length, 'assumption') }} in play</div>
        </div>
      </div>

      <h3 class="sec">Take it with you</h3>
      <div v-if="problem" class="notice-line" role="alert" data-testid="import-problem" style="white-space:pre-line">{{ problem }}</div>
      <div class="sc-actions">
        <button id="sc-link" type="button" class="btn" data-testid="copy-link" @click="copyLink"><b>Copy a link to this selection</b><span>{{ copied ? 'Copied' : 'Reopens the requirements, shortlist, assumptions, goal and view. Search text is not included.' }}</span></button>
        <p v-if="copyProblem" class="fine" role="status">The browser would not copy it. Copy this link: <input type="text" readonly :value="copyProblem" aria-label="Link to this selection" style="width:100%"></p>
        <button id="sc-json" type="button" class="btn" data-testid="save-file" @click="saveFile"><b>Save the scenario</b><span>A small file anyone with this tool can load</span></button>
        <button id="sc-import" type="button" class="btn" data-testid="load-file" @click="fileInput?.click()"><b>Load a saved scenario</b><span>Replaces the current selection. A damaged file is refused and nothing changes.</span></button>
        <input ref="fileInput" type="file" accept=".json,application/json" hidden data-testid="file-input" @change="onFile">
      </div>

      <h3 class="sec">Chosen products</h3>
      <p v-if="!chosen.length" class="fine">None yet. In a material's Products tab, press <b>Choose</b> on the product the team will print. Its decision brief, print settings and test plan then appear here, saved with the scenario.</p>
      <div v-for="x in chosen" :key="x.d.gradeId" class="chosen" :data-chosen="x.d.gradeId">
        <div class="chosen-head"><b>{{ productLabel(x.g) }}</b>
          <span v-if="x.e" :class="`chip chip-${x.e.verdict}`">{{ x.e.verdict }}</span><span v-else class="chip chip-neutral">not judged</span>
          <span class="fine">chosen {{ dayWords(x.d.chosenOn ?? '') }} on release {{ x.d.release ?? 'unidentified' }}<template v-if="x.d.release && x.d.release !== today">; this page is release {{ today ?? '' }}</template></span></div>
        <div class="sc-actions chosen-actions">
          <button type="button" class="btn btn-sm" :data-unchoose="x.d.gradeId" @click="actions.toggleDecision(x.d.gradeId)">Remove</button>
        </div>
        <label class="chosen-note">Note <input type="text" :data-note="x.d.gradeId" :value="x.d.note ?? ''" placeholder="Why this product, for whom" @change="note(x.d.gradeId, $event)"></label>
        <details class="chosen-tests"><summary>The team's test results ({{ (x.d.tests ?? []).length }})</summary>
          <div v-for="(t, i) in x.d.tests ?? []" :key="i" class="fine">{{ [t.date, t.operator, t.method, t.result].filter(Boolean).join(' · ') }}</div>
          <form class="test-form" :data-test-form="x.d.gradeId" @submit.prevent="record(x.d.gradeId, $event)">
            <label v-for="[k, label] in FIELDS" :key="k">{{ label }} <input type="text" :name="k"></label>
            <button class="btn btn-sm" type="submit">Record this result</button>
          </form>
        </details>
      </div>

      <h3 class="sec">Start from a different kind of part</h3>
      <div class="sc-actions">
        <button v-for="(t, i) in TEMPLATES" :key="t.name" type="button" class="btn" :data-template="i" @click="actions.applyTemplate(t)">
          <b>{{ t.name }}</b><span>{{ t.description }}</span></button>
      </div>

      <h3 class="sec">What this tool is for</h3>
      <div class="note">Screening and comparison from makers' published data, with every value traced to its source.
        Not design allowables, not a substitute for the exact product's technical and safety data sheets, and not a
        guarantee that a third-party filament runs on the H2C. Verify the product before you buy or print.</div>

      <h3 class="sec">About this build</h3>
      <dl class="kv small">
        <dt>Release</dt><dd>{{ db.meta.release?.id ?? 'unidentified' }} <span class="fine">identifies the data, rules and engine behind every answer. A saved selection carries it and says so if reopened on another release</span></dd>
        <dt>Data of</dt><dd>{{ db.meta.snapshot }}</dd>
        <dt>Application build</dt><dd>{{ db.meta.build }}</dd>
        <dt>Materials</dt><dd>{{ candidateCount(db) }}, {{ db.meta.counts.h2cRelevant }} within H2C capability; plus {{ db.meta.counts.familyEntries }} group names that are never candidates</dd>
        <dt>Measurements</dt><dd>{{ db.meta.counts.measurements }}, of which {{ db.meta.counts.numericMeasurements }} numeric</dd>
        <dt>Sources</dt><dd>{{ db.meta.counts.sources }}</dd>
      </dl>
    </div>
  </div>
</template>
