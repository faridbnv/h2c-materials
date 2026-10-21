<script setup lang="ts">
// Find a product, read its values, open one beside its source page, correct it, see the effect (05 section 11.4, journey 1).
import { computed, ref, watch } from 'vue';
import { api } from '../api.ts';
import { withUnit } from '../explain.ts';
import { describeFailure, refreshWorkspace } from '../store.ts';
import CorrectionForm from './CorrectionForm.vue';
import ImpactPanel from './ImpactPanel.vue';
import SourcePane from './SourcePane.vue';
import type { MeasurementDetail, ProductDetail, ProductHit } from '../../shared/api.ts';

const query = ref('');
const hits = ref<ProductHit[]>([]);
const searched = ref(false);
const product = ref<ProductDetail | null>(null);
const picked = ref<MeasurementDetail | null>(null);
const page = ref(1);
const quote = ref('');
const impactTrigger = ref(0);
const problem = ref<string | null>(null);
let searchTicket = 0;
let debounce: ReturnType<typeof setTimeout> | undefined;

watch(query, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { void search(value); }, 150);
});

async function search(value: string): Promise<void> {
  const mine = ++searchTicket;
  if (value.trim() === '') { hits.value = []; searched.value = false; return; }
  try {
    const found = await api<ProductHit[]>(`/api/products?q=${encodeURIComponent(value)}`);
    if (mine === searchTicket) { hits.value = found; searched.value = true; problem.value = null; }
  } catch (error) { problem.value = describeFailure(error); }
}

async function loadProduct(gradeId: string): Promise<void> {
  try {
    product.value = await api<ProductDetail>(`/api/products/${encodeURIComponent(gradeId)}`);
    problem.value = null;
  } catch (error) { problem.value = describeFailure(error); }
}

async function openProduct(gradeId: string): Promise<void> {
  await loadProduct(gradeId);
  picked.value = null;
}

async function openMeasurement(id: string): Promise<void> {
  try {
    const detail = await api<MeasurementDetail>(`/api/measurements/${encodeURIComponent(id)}`);
    if (picked.value?.id !== id) { quote.value = ''; page.value = detail.pageHint ?? 1; }
    picked.value = detail;
    problem.value = null;
  } catch (error) { problem.value = describeFailure(error); }
}

async function reloadPicked(): Promise<void> {
  if (picked.value !== null) await openMeasurement(picked.value.id);
}

async function saved(): Promise<void> {
  await Promise.all([picked.value ? openMeasurement(picked.value.id) : Promise.resolve(), product.value ? loadProduct(product.value.product.gradeId) : Promise.resolve(), refreshWorkspace()]);
  impactTrigger.value += 1;
}

const grouped = computed(() => product.value?.measurements ?? []);
const bits = (hit: ProductHit): string => [hit.manufacturer, hit.materialName, hit.status === 'active' ? '' : hit.status].filter(Boolean).join(' · ');
</script>

<template>
  <div class="bench">
    <section class="col" aria-labelledby="find-h">
      <h2 id="find-h">Find a product</h2>
      <label for="find-q">Maker, product or material</label>
      <input id="find-q" v-model="query" type="search" autocomplete="off" placeholder="for example: ecomax pla" />
      <p class="hint" role="status">{{ searched ? `${hits.length} product${hits.length === 1 ? '' : 's'} found${hits.length === 40 ? ' (the first 40)' : ''}` : 'Type the start of any word.' }}</p>
      <p v-if="problem" class="banner error" role="alert">{{ problem }}</p>
      <ul class="results" aria-label="Products found">
        <li v-for="hit in hits" :key="hit.gradeId">
          <button type="button" :aria-current="product?.product.gradeId === hit.gradeId ? 'true' : undefined" @click="openProduct(hit.gradeId)">
            <strong>{{ hit.productName }}</strong><br />
            <span class="maker">{{ bits(hit) }} <span class="num">{{ hit.gradeId }}</span></span>
          </button>
        </li>
      </ul>
    </section>

    <section class="col" aria-labelledby="record-h">
      <h2 id="record-h">The record</h2>
      <p v-if="!product" class="muted">Find a product to see its recorded values. Open a value to read its source page beside it.</p>
      <div v-else class="stack">
        <div>
          <h3>{{ product.product.productName }} <span v-if="product.product.status !== 'active'" class="badge plain">{{ product.product.status }}</span></h3>
          <p class="muted">{{ product.product.manufacturer }} · {{ product.product.materialName }}</p>
          <p v-if="product.details.length" class="hint">{{ product.details.map((d) => `${d.label}: ${d.value}`).join(' · ') }}</p>
        </div>
        <table v-if="grouped.length">
          <caption>Recorded values ({{ grouped.length }})</caption>
          <thead><tr><th scope="col">Property</th><th scope="col">Printed</th><th scope="col">Normalized</th><th scope="col">Measured under</th><th scope="col"><span class="sr">Action</span></th></tr></thead>
          <tbody>
            <tr v-for="m in grouped" :key="m.id" :class="{ picked: picked?.id === m.id }">
              <td>{{ m.property }} <span v-if="m.draft" class="badge">draft, not approved</span></td>
              <td class="num">{{ withUnit(m.rawValue, m.rawUnit) }}</td>
              <td class="num">{{ withUnit(m.normalizedValue, m.normalizedUnit) }}</td>
              <td class="hint">{{ m.conditions.join('; ') || 'no conditions recorded' }}</td>
              <td><button class="btn" type="button" :aria-current="picked?.id === m.id ? 'true' : undefined" :aria-label="`Open ${m.property} (${m.id}) beside its source`" @click="openMeasurement(m.id)">Open</button></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">No values are recorded for this product.</p>

        <template v-if="picked">
          <CorrectionForm :detail="picked" :page="page" :quote="quote" @update:page="page = $event" @update:quote="quote = $event" @saved="saved" @reload="reloadPicked" />
          <ImpactPanel :trigger="impactTrigger" />
        </template>
      </div>
    </section>

    <section class="col" aria-label="Source page">
      <SourcePane :source="picked?.source ?? null" :page="page" :quote="quote" @update:page="page = $event" @pick="quote = $event" />
    </section>
  </div>
</template>
