<script setup lang="ts">
import { computed } from 'vue';
import { GROUP_ORDER } from '@atlas/domain';
import { COUNT_WORD, NO_PRODUCTS, READING, REPORTED, REQUIRED, SKIP, STRICT, UI, barLabel, headline, productsMeeting, productsWithoutData, unsettledLine } from './copy.ts';
import LoadNotice from './LoadNotice.vue';
import { loadResult } from './load.ts';
import ReleaseStrip from './ReleaseStrip.vue';
import { unsettledGroups } from './tally.ts';
import { useLoad } from './useLoad.ts';
import VerdictMark from './VerdictMark.vue';
import { GROUP_WORD, VERDICT_LABEL } from './words.ts';

const { state, release } = useLoad((embedded) => loadResult(embedded, (url) => fetch(url)));
const data = computed(() => (state.value.kind === 'ready' ? state.value.data : null));
const groups = computed(() => {
  const d = data.value;
  if (!d) return [];
  return GROUP_ORDER.map((group) => ({ group, rows: d.materials.filter((m) => m.group === group) })).filter((g) => g.rows.length > 0);
});
const unsettled = computed(() => (data.value ? unsettledGroups(data.value.materials) : []));
const share = (n: number): string => `${(100 * n) / (data.value?.counts.total || 1)}%`;
const materialUrl = (id: string): string => `material.html?m=${encodeURIComponent(id)}`;
</script>

<template>
  <ReleaseStrip :release="release" :snapshot="data?.snapshot" />
  <main>
    <LoadNotice v-if="state.kind !== 'ready'" :state="state" />
    <template v-else>
      <a class="skip" href="#results">{{ SKIP }}</a>
      <h1 data-testid="headline">{{ headline(state.data.counts.pass, state.data.counts.total) }}</h1>
      <p class="lead"><strong>{{ state.data.template.name }}.</strong> {{ state.data.template.description }} {{ STRICT }}</p>

      <div class="bar" role="img" :aria-label="barLabel(state.data.counts)">
        <span class="seg seg-PASS" :style="{ width: share(state.data.counts.pass) }" />
        <span class="seg seg-UNKNOWN" :style="{ width: share(state.data.counts.unknown) }" />
        <span class="seg seg-FAIL" :style="{ width: share(state.data.counts.fail) }" />
      </div>
      <ul class="legend">
        <li data-testid="count-PASS" :data-count="state.data.counts.pass"><VerdictMark verdict="PASS"><b>{{ state.data.counts.pass }}</b> {{ COUNT_WORD.PASS }}</VerdictMark></li>
        <li data-testid="count-UNKNOWN" :data-count="state.data.counts.unknown"><VerdictMark verdict="UNKNOWN"><b>{{ state.data.counts.unknown }}</b> {{ COUNT_WORD.UNKNOWN }}</VerdictMark></li>
        <li data-testid="count-FAIL" :data-count="state.data.counts.fail"><VerdictMark verdict="FAIL"><b>{{ state.data.counts.fail }}</b> {{ COUNT_WORD.FAIL }}</VerdictMark></li>
      </ul>
      <p v-if="unsettled.length">{{ unsettledLine(state.data.counts.unknown, unsettled) }}</p>

      <section aria-labelledby="asks">
        <h2 id="asks">{{ UI.asks }}</h2>
        <ul class="asks">
          <li v-for="r in state.data.requirements" :key="r.text" data-testid="requirement" :data-mandatory="r.mandatory">{{ r.text }}<span class="aside">{{ r.mandatory ? REQUIRED : REPORTED }}</span></li>
        </ul>
        <p><strong>{{ UI.notChecked }}</strong> {{ state.data.template.notChecked }}</p>
      </section>

      <section id="results" aria-labelledby="materials">
        <h2 id="materials">{{ UI.materials }}</h2>
        <div class="scroll" tabindex="0" role="region" aria-labelledby="materials">
          <table data-testid="results-table">
            <caption class="visually-hidden">{{ UI.tableCaption }}</caption>
            <thead>
              <tr><th scope="col">{{ UI.columns.material }}</th><th scope="col">{{ UI.columns.verdict }}</th><th scope="col">{{ UI.columns.products }}</th><th scope="col">{{ UI.columns.best }}</th></tr>
            </thead>
            <tbody v-for="g in groups" :key="g.group" data-testid="group" :data-group="g.group">
              <tr class="group"><th scope="colgroup" colspan="4">{{ GROUP_WORD[g.group] }}, {{ g.rows.length }}</th></tr>
              <tr v-for="m in g.rows" :key="m.materialId" data-testid="result-row" :data-material="m.materialId" :data-verdict="m.verdict" :data-group="m.group">
                <th scope="row"><a :href="materialUrl(m.materialId)">{{ m.name }}</a></th>
                <td class="verdict"><VerdictMark :verdict="m.verdict">{{ VERDICT_LABEL[m.verdict] }}</VerdictMark></td>
                <td v-if="m.products" class="num">{{ productsMeeting(m.products) }}<span v-if="m.products.untested" class="aside">{{ productsWithoutData(m.products) }}</span></td>
                <td v-else class="aside">{{ NO_PRODUCTS }}</td>
                <td>{{ m.best?.label ?? '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="reading" class="prose">
        <h2 id="reading">{{ READING.heading }}</h2>
        <p>{{ READING.verdicts }}</p>
        <p>{{ READING.release }}</p>
        <p>{{ READING.firstSlice }}</p>
      </section>
    </template>
  </main>
</template>
