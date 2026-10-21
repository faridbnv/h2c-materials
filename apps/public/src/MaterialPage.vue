<script setup lang="ts">
import { BACK, MATERIAL_PAGE, NO_MATERIAL, NO_PRODUCTS, READING, UI, productsSentence, requirementsFor } from './copy.ts';
import LoadNotice from './LoadNotice.vue';
import { isMaterialId, loadMaterial } from './load.ts';
import ReleaseStrip from './ReleaseStrip.vue';
import { useLoad } from './useLoad.ts';
import VerdictMark from './VerdictMark.vue';
import { GROUP_WORD, STATUS_WORD, VERDICT_WORD } from './words.ts';

const materialId = new URLSearchParams(window.location.search).get('m') ?? '';
const { state, release } = useLoad((embedded) => loadMaterial(embedded, materialId, (url) => fetch(url)));
// An address that names no material is a mistake in the link, not a stale page: say so, and a reload would not help.
const named = isMaterialId(materialId);
const materialPage = `${__MATERIAL_PAGES__}${encodeURIComponent(materialId)}.html`;
</script>

<template>
  <ReleaseStrip :release="release" />
  <main>
    <p class="back"><a href="./">{{ BACK }}</a></p>
    <p v-if="!named" class="notice" role="alert" data-testid="load-notice" data-state="no-material">{{ NO_MATERIAL }}</p>
    <LoadNotice v-else-if="state.kind !== 'ready'" :state="state" />
    <template v-else>
      <h1 data-testid="material-name" :data-material="state.data.materialId">{{ state.data.name }}</h1>
      <p class="lead" data-testid="material-verdict" :data-verdict="state.data.verdict"><VerdictMark :verdict="state.data.verdict">{{ state.data.name }} {{ VERDICT_WORD[state.data.verdict] }}</VerdictMark></p>
      <p v-if="state.data.group !== 'meets'">{{ GROUP_WORD[state.data.group] }}. {{ state.data.groupReason }}</p>
      <p v-if="state.data.counts">{{ productsSentence(state.data.counts) }}</p>
      <p v-else>{{ NO_PRODUCTS }}.</p>
      <p><a :href="materialPage">{{ MATERIAL_PAGE }}</a></p>

      <section v-if="state.data.products.length" aria-labelledby="products">
        <h2 id="products">{{ UI.products }}</h2>
        <details v-for="p in state.data.products" :key="p.gradeId" :open="p.gradeId === state.data.best?.gradeId" data-testid="product" :data-grade="p.gradeId" :data-verdict="p.verdict">
          <summary><VerdictMark :verdict="p.verdict">{{ p.label }}</VerdictMark></summary>
          <div class="scroll" tabindex="0" role="region" :aria-label="requirementsFor(p.label)">
            <table>
              <thead><tr><th scope="col">{{ UI.columns.requirement }}</th><th scope="col">{{ UI.columns.result }}</th><th scope="col">{{ UI.columns.why }}</th></tr></thead>
              <tbody>
                <tr v-for="r in p.results" :key="r.requirement">
                  <th scope="row">{{ r.requirement }}</th>
                  <td><VerdictMark :verdict="r.status">{{ STATUS_WORD[r.status] }}</VerdictMark></td>
                  <td>{{ r.reason }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section v-else aria-labelledby="own">
        <h2 id="own">{{ UI.requirements }}</h2>
        <div class="scroll" tabindex="0" role="region" aria-labelledby="own">
          <table>
            <thead><tr><th scope="col">{{ UI.columns.requirement }}</th><th scope="col">{{ UI.columns.result }}</th><th scope="col">{{ UI.columns.why }}</th></tr></thead>
            <tbody>
              <tr v-for="r in state.data.results" :key="r.requirement">
                <th scope="row">{{ r.requirement }}</th>
                <td><VerdictMark :verdict="r.status">{{ STATUS_WORD[r.status] }}</VerdictMark></td>
                <td>{{ r.reason }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="prose" aria-labelledby="reading">
        <h2 id="reading">{{ READING.heading }}</h2>
        <p>{{ READING.release }}</p>
      </section>
    </template>
  </main>
</template>
