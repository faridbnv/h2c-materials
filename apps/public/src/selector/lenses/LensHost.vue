<script setup lang="ts">
// The four lenses of part 2 (Ashby, parallel lines, data coverage, compare), hosted. Each lens is the old lens's drawing code, ported
// (ashby.ts, parallel.ts, heatmap.ts, compare.ts): it writes its markup into the element below and wires it, as it did on the old page, and this
// component calls it again whenever the answer or the reader's view changed. Vue does not manage what is inside the element, so a redraw replaces
// it whole and the lens puts the reader's place back (focus, scroll, zoom, open folds), exactly as before. What Vue adds is the lazy loading: this
// component, a lens's code and the chart library are each fetched only when that lens is first opened, and the Table lens works while they load.
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { RELOAD } from '../../copy.ts';
import { CHART_FAILED, CHART_LOADING, LENS_LOADING, RETRY } from './copy.ts';
import LoadNotice from '../../LoadNotice.vue';
import { blockedBy } from '../../useLoad.ts';
import type { Blocked } from '../../useLoad.ts';
import type { Store } from '../store.ts';
import { lensActions } from './actions.ts';
import { joinMeasurements, measurementsNeeded, stampGrades } from './measurements.ts';
import './lenses.css';

type Renderer = (host: HTMLElement, state: unknown, actions: unknown) => void | Promise<void>;

const props = defineProps<{ readonly store: Store; readonly lens: string }>();
const { state } = props.store;
// The code of this component was the wait the page was in (Selector.vue); from here the component's own drawing is.
if (state.hostLoading) { state.hostLoading = false; state.lensLoading--; }
const actions = lensActions(props.store);

const host = ref<HTMLElement | null>(null);
const loading = ref(false);
const problem = shallowRef<Blocked | null>(null);
let drawing = 0;
let drawn = '';

/**
 * The renderer of a lens, with whatever it needs fetched first. Every one of these lenses reads headline values the core does not carry, which the reference
 * part holds (loaded once, whole, and joined onto the model); the Ashby chart also needs the chart library and the reference materials.
 */
async function prepare(lens: string): Promise<Renderer> {
  const reference = state.reference ?? await (await props.store.lens()).loadReference();
  state.reference = reference;
  stampGrades(state.db);
  switch (lens) {
    case 'ashby': {
      const [module, { loadPlotly }, { whenDrawn }] = await Promise.all([import('./ashby.ts'), import('./plotly.ts'), import('./chart.ts')]);
      await loadPlotly();
      // A zoom the reader makes rewrites the chart's pills in place, without a redraw.
      const own = { ...actions, zoomed: () => { if (host.value) module.refreshPills(host.value, state, own); } };
      // The page is not done until the chart has its labels, so what is read of it is the same whenever it is read.
      return async (el, s) => { module.renderAshby(el, s, own); await whenDrawn(); };
    }
    case 'parallel': {
      const module = await import('./parallel.ts');
      return (el, s) => { module.renderParallel(el, s, actions); };
    }
    case 'coverage': {
      const module = await import('./heatmap.ts');
      return (el, s) => { module.renderCoverage(el, s, actions); };
    }
    default: {
      const module = await import('./compare.ts');
      return (el, s) => { module.renderCompare(el, s, actions); };
    }
  }
}

const prepared = new Map<string, Renderer>();
const reload = (): void => { window.location.reload(); };

async function draw(): Promise<void> {
  const mine = ++drawing;
  const lens = props.lens;
  // The page is waiting (data-busy) from here until this lens has drawn: its code, the chart library and the reference set may all be on the way.
  state.lensLoading++;
  try {
    let render = prepared.get(lens);
    if (!render) {
      loading.value = true;
      problem.value = null;
      try {
        render = await prepare(lens);
        prepared.set(lens, render);
      } catch (error) {
        if (mine === drawing) problem.value = blockedBy(error);
        return;
      } finally {
        if (mine === drawing) loading.value = false;
      }
    }
    // A newer draw (or another lens) took over while the parts arrived.
    if (mine !== drawing || !host.value || !state.selection) return;
    // What a chart view reads of the measurements comes with its material's detail, whole, before the view draws.
    if (lens === 'ashby') {
      try {
        await joinMeasurements(props.store, measurementsNeeded(state));
      } catch (error) {
        if (mine === drawing) problem.value = blockedBy(error);
        return;
      }
      if (mine !== drawing || !host.value) return;
      problem.value = null;
    }
    if (drawn !== lens) { host.value.replaceChildren(); drawn = lens; }
    await nextTick();
    if (mine === drawing && host.value) await render(host.value, state, actions);
  } finally {
    state.lensLoading--;
  }
}

// A page opened on a lens writes its canonical address, as choosing the lens does (the old page's setLens at start).
onMounted(() => { props.store.pushHash(); void draw(); });
watch(() => [state.lrev, props.lens], () => { void draw(); }, { flush: 'post' });
onBeforeUnmount(() => { drawing++; });
</script>

<template>
  <p v-if="loading" class="notice" role="status" data-testid="chart-loading">{{ lens === 'ashby' ? CHART_LOADING : LENS_LOADING }}</p>
  <LoadNotice v-else-if="problem && problem.kind === 'stale'" :state="problem" />
  <section v-else-if="problem" class="notice notice-stop" role="alert" data-testid="chart-failed">
    <h1>{{ CHART_FAILED.heading }}</h1>
    <p>{{ CHART_FAILED.body }}</p>
    <p v-if="problem.kind === 'failed' && problem.why" class="why">{{ problem.why }}</p>
    <button type="button" @click="draw">{{ RETRY }}</button> <button type="button" @click="reload">{{ RELOAD }}</button>
  </section>
  <div ref="host" class="lens-host" :hidden="loading || !!problem" :data-lens-host="lens"></div>
</template>
