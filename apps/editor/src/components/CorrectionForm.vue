<script setup lang="ts">
// The correction form (05 section 11.4). The value, a reason, and a quote the service looks for on the page. Nothing is accepted here:
// "Save as draft" sends the correction to the write service, which runs every guard and answers saved or refused, with a code. A
// refusal keeps everything typed, shows in plain words what to change and takes focus. The form never writes anything itself.
import { computed, nextTick, ref, watch } from 'vue';
import { api } from '../api.ts';
import { explain, isPlainNumber, scaled, withUnit } from '../explain.ts';
import { describeFailure } from '../store.ts';
import ThreeValues from './ThreeValues.vue';
import type { CorrectionResponse, MeasurementDetail } from '../../shared/api.ts';

type Refusal = Extract<CorrectionResponse, { status: 'refused' }>;

const props = defineProps<{ detail: MeasurementDetail; page: number; quote: string }>();
const emit = defineEmits<{ 'update:page': [page: number]; 'update:quote': [quote: string]; saved: []; reload: [] }>();

const rawValue = ref('');
const rawNumeric = ref('');
const normalized = ref('');
const locator = ref('');
const reason = ref('');
const numericTouched = ref(false);
const normalizedTouched = ref(false);
const busy = ref(false);
const failure = ref<Refusal | null>(null);
const message = ref<string | null>(null);
const alertBox = ref<HTMLElement | null>(null);

const cells = computed(() => props.detail.cells);
const usable = computed(() => props.detail.source?.availability === 'available');
const formKey = computed(() => `atlas-editor-form:${props.detail.id}`);
const quoteModel = computed({ get: () => props.quote, set: (value: string) => emit('update:quote', value) });
const pageModel = computed({ get: () => props.page, set: (value: number) => emit('update:page', Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1) });
const unit = computed(() => [cells.value['Raw unit'], cells.value['Normalized unit']]);
const conditions = computed(() => ['Direction', 'Test temperature', 'Standard / load', 'Moisture condition', 'Post-processing', 'Specimen type']
  .flatMap((name) => { const value = cells.value[name]; return value && value !== 'Not published' && value !== 'Not applicable' ? [`${name}: ${value}`] : []; }));
const wanted = computed(() => ({ 'Raw value': rawValue.value.trim(), 'Raw numeric': rawNumeric.value.trim(), 'Normalized value': normalized.value.trim() }));

// ---- what is typed survives a reload of the page (a convenience in this tab; the draft itself is on disk once saved)
function remember(): void {
  try { sessionStorage.setItem(formKey.value, JSON.stringify({ rawValue: rawValue.value, rawNumeric: rawNumeric.value, normalized: normalized.value, locator: locator.value, reason: reason.value, quote: props.quote, page: props.page })); } catch { /* no storage: fine */ }
}
function clearValues(): void {
  rawValue.value = ''; rawNumeric.value = ''; normalized.value = ''; reason.value = '';
  numericTouched.value = false; normalizedTouched.value = false;
}
function recall(): void {
  clearValues();
  locator.value = cells.value.Locator ?? '';
  failure.value = null; message.value = null;
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(formKey.value) ?? 'null');
    if (typeof saved === 'object' && saved !== null) {
      const s = new Map(Object.entries(saved));
      const text = (key: string): string => { const v = s.get(key); return typeof v === 'string' ? v : ''; };
      rawValue.value = text('rawValue'); rawNumeric.value = text('rawNumeric'); normalized.value = text('normalized'); reason.value = text('reason');
      numericTouched.value = rawNumeric.value !== ''; normalizedTouched.value = normalized.value !== '';
      if (text('locator') !== '') locator.value = text('locator');
      if (text('quote') !== '') emit('update:quote', text('quote'));
      const page = s.get('page');
      if (typeof page === 'number') emit('update:page', page);
    }
  } catch { /* nothing saved */ }
}
watch(() => props.detail.id, recall, { immediate: true });
watch([rawValue, rawNumeric, normalized, locator, reason, () => props.quote, () => props.page], remember);

// ---- the number and the normalized value follow the printed value until the writer types over them
watch(rawValue, (value) => {
  if (!numericTouched.value) rawNumeric.value = isPlainNumber(value) ? value.trim() : '';
});
watch([rawNumeric, () => props.detail.factor], () => {
  if (!normalizedTouched.value) normalized.value = props.detail.factor === null ? '' : scaled(rawNumeric.value, props.detail.factor) ?? '';
});

const missing = computed(() => {
  const gaps: string[] = [];
  if (rawValue.value.trim() === '') gaps.push('the new printed value');
  if (rawNumeric.value.trim() === '') gaps.push('its number');
  if (normalized.value.trim() === '') gaps.push('the normalized value');
  if (quoteModel.value.trim() === '') gaps.push('the quote');
  if (reason.value.trim() === '') gaps.push('the reason');
  return gaps;
});

async function showFailure(refusal: Refusal): Promise<void> {
  failure.value = refusal;
  await nextTick();
  alertBox.value?.focus();
}

async function save(): Promise<void> {
  failure.value = null;
  message.value = null;
  if (missing.value.length > 0) {
    await showFailure({ status: 'refused', code: 'bad-request', detail: `Fill in ${missing.value.join(', ')} first.` });
    return;
  }
  busy.value = true;
  try {
    const result = await api<CorrectionResponse>('/api/corrections', {
      measurementId: props.detail.id,
      expect: Object.fromEntries(['Raw value', 'Raw numeric', 'Normalized value'].map((name) => [name, cells.value[name] ?? null])),
      set: wanted.value, reason: reason.value.trim(),
      evidence: { page: props.page, locator: locator.value.trim(), quote: quoteModel.value.trim() },
      base: props.detail.base,
    });
    if (result.status === 'refused') {
      await showFailure(result);
      return;
    }
    const checked = result.quoteCheck?.status === 'verified' ? `The quote was found on page ${props.page} of the stored document.` : `The quote was not checked against the page${result.quoteCheck?.reason ? ` (${result.quoteCheck.reason})` : ''}.`;
    try { sessionStorage.removeItem(formKey.value); } catch { /* no storage: fine */ }
    clearValues();
    emit('update:quote', '');
    message.value = `Saved as a draft, not approved. ${checked}`;
    emit('saved');
  } catch (error) {
    await showFailure({ status: 'refused', code: 'bad-request', detail: describeFailure(error) });
  } finally { busy.value = false; }
}

/** Keep everything typed and read the record again, so the correction is written against what the data holds now. */
function useCurrent(): void {
  failure.value = null;
  emit('reload');
}
</script>

<template>
  <form class="stack" novalidate aria-labelledby="correct-h" @submit.prevent="save">
    <h2 id="correct-h">Correct {{ detail.property }}</h2>
    <p v-if="detail.pendingDraft" class="banner warn">This value already has a draft. A new correction is written against the draft's value. Nothing here is approved.</p>
    <p v-if="!usable" class="banner warn" role="status">{{ detail.source?.note ?? 'This record names no source in the sources table.' }} The correct button is switched off for this value.</p>

    <fieldset>
      <legend>As recorded now</legend>
      <p><span class="num">{{ withUnit(cells['Raw value'], unit[0]) }}</span> printed, <span class="num">{{ withUnit(cells['Normalized value'], unit[1]) }}</span> normalized<span v-if="detail.factor"> (number x {{ detail.factor }})</span></p>
      <p v-if="conditions.length" class="hint">Measured under: {{ conditions.join('; ') }}. These conditions stay as recorded.</p>
    </fieldset>

    <div ref="alertBox" tabindex="-1" role="alert" :hidden="failure === null">
      <div v-if="failure" class="card stale stack">
        <p class="banner error"><strong>{{ failure.code === 'bad-request' ? failure.detail : explain(failure.code) }}</strong></p>
        <template v-if="failure.code === 'stale' && failure.stale">
          <ThreeValues :expected="failure.stale.expected" :now="failure.stale.current" :wanted="wanted" />
          <p class="row">
            <button class="btn primary" type="button" @click="useCurrent">Write my correction against the current value</button>
            <span class="hint">Everything you typed is kept.</span>
          </p>
        </template>
        <details v-if="failure.code !== 'bad-request'"><summary>Show technical detail</summary><pre>{{ failure.code }}: {{ failure.detail }}</pre></details>
      </div>
    </div>
    <p v-if="message" class="banner ok" role="status">{{ message }}</p>

    <div class="field-grid">
      <div class="wide">
        <label for="raw-value">New printed value <span class="hint">as the source prints it, in {{ unit[0] }}</span></label>
        <input id="raw-value" v-model="rawValue" :disabled="!usable" autocomplete="off" />
      </div>
      <div>
        <label for="raw-numeric">Its number</label>
        <input id="raw-numeric" v-model="rawNumeric" :disabled="!usable" autocomplete="off" @input="numericTouched = true" />
      </div>
      <div class="wide-2">
        <label for="normalized">Normalized value <span class="hint">in {{ unit[1] }}</span></label>
        <input id="normalized" v-model="normalized" :disabled="!usable" autocomplete="off" @input="normalizedTouched = true" />
      </div>
      <p class="hint wide">The number and the normalized value follow the printed value (number x {{ detail.factor ?? 'factor' }}) until you type over them. They are written together.</p>
    </div>

    <fieldset>
      <legend>Evidence</legend>
      <div class="field-grid">
        <div>
          <label for="evidence-page">Page</label>
          <input id="evidence-page" v-model.number="pageModel" type="number" min="1" :disabled="!usable" />
        </div>
        <div class="wide-2">
          <label for="evidence-locator">Where on the page</label>
          <input id="evidence-locator" v-model="locator" :disabled="!usable" autocomplete="off" />
        </div>
        <div class="wide">
          <label for="evidence-quote">Quote <span class="hint">the source's own words; the service looks for them on the page</span></label>
          <textarea id="evidence-quote" v-model="quoteModel" :disabled="!usable" />
        </div>
      </div>
    </fieldset>

    <div>
      <label for="reason">Reason</label>
      <textarea id="reason" v-model="reason" :disabled="!usable" />
    </div>
    <div class="row">
      <button class="btn primary" type="submit" :disabled="!usable || busy">{{ busy ? 'Checking...' : 'Check and save as draft' }}</button>
      <span class="hint">A draft is not approved until it is exported, reviewed and merged.</span>
    </div>
  </form>
</template>
