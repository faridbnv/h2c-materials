<script setup lang="ts">
// The material drawer (the old detail.js renderDrawer, as a component): the head, the tabs and the open tab's body. It is its own chunk, loaded
// when the first drawer opens; the data of the material loads with it (its detail part and the shared part), and until both have arrived the
// drawer says it is loading. The body is the facts layer's markup for the tab; what a press on it does is decided once, here, by what the element
// says it is, as the old drawer wired each element after drawing it.
import '../drawer.css';
import { computed, inject, nextTick, onUpdated, ref, shallowRef, watch } from 'vue';
import type { Ref } from 'vue';
import { toHash } from '@atlas/engine/port/scenario.ts';
import { esc, keepInView, markTableOverflow } from '@atlas/pages/facts/format';
import { useRegistry } from '@atlas/pages/facts/registry';
import type { Loose } from '@atlas/pages/loose';
import LoadNotice from '../../LoadNotice.vue';
import { blockedBy } from '../../useLoad.ts';
import type { Blocked } from '../../useLoad.ts';
import type { Store } from '../store.ts';
import { drawerDbOf } from './db.ts';
import { drawerModel, drawerState } from './detail.ts';
import type { DrawerModel } from './detail.ts';

const props = defineProps<{ readonly store: Store }>();
const { state, actions } = props.store;
const narrow = inject<Ref<boolean> | null>('narrow', null);
/** Below 1100 px the drawer covers the page, so it is a modal dialog there: the page behind it is inert and Tab cycles inside it. */
const modal = computed(() => (narrow?.value ? 'true' : undefined));

// ---- the data of the open material
const parts = shallowRef<{ id: string; detail: Loose; shared: Loose } | null>(null);
const problem = ref<Blocked | null>(null);
async function load(id: string | null): Promise<void> {
  if (!id || state.db.materials.find((m: { id: string; familyEntry?: unknown }) => m.id === id)?.familyEntry) { problem.value = null; return; }
  if (parts.value?.id === id) return;
  problem.value = { kind: 'loading' };
  state.drawerLoading++;
  try {
    const loaded = await props.store.loadDrawerParts(id);
    // The reader may have moved on while it loaded.
    if (state.selectedMaterialId !== id) return;
    parts.value = { id, ...loaded };
    problem.value = null;
  } catch (error) {
    problem.value = blockedBy(error);
  } finally {
    state.drawerLoading--;
  }
}
watch(() => state.selectedMaterialId, (id) => { void load(id); }, { immediate: true });

const model = computed<DrawerModel | null>(() => {
  void state.rev;
  void state.estimates;
  const id: string | null = state.selectedMaterialId;
  const entry = id ? state.db.materials.find((m: { id: string; familyEntry?: unknown }) => m.id === id) : null;
  if (!entry) return null;
  // A family entry has no detail: the core row says all there is. A material waits for its parts.
  if (entry.familyEntry) return drawerModel(state.db, state);
  if (!parts.value || parts.value.id !== id) return null;
  const db = drawerDbOf(state.db, parts.value.detail, parts.value.shared);
  // The registry's properties and comparisons came with the shared part: the facts layer reads them from its own copy.
  useRegistry(db.registry);
  return drawerModel(db, state);
});

/** The line saying what the open tab holds, then the tab's body: one piece of markup, as the old drawer drew it. */
const bodyHtml = computed(() => {
  const m = model.value;
  return m?.kind === 'material' ? `${m.help ? `<p class="drawer-help" id="drawer-help">${esc(m.help)}</p>` : ''}${m.body}` : '';
});

// ---- after each draw
const root = ref<HTMLElement | null>(null);
const body = ref<HTMLElement | null>(null);
const tabs = ref<HTMLElement | null>(null);

function afterDraw(): void {
  const host = root.value;
  if (!host) return;
  markTableOverflow(host);
  // Below 1100 px the tabs are one strip that scrolls sideways, drawn again on every change: keep the open one in sight.
  const open = tabs.value?.querySelector<HTMLElement>('[aria-selected="true"]');
  if (tabs.value && open) keepInView(tabs.value, open);
  drawerState.applySearch(host);
  // Opening the tab was never enough. PA6-CF has 21 measurements grouped by source, so "one click to the evidence" was one click plus a hunt. Take
  // the reader to the row, open whatever of it is collapsed, and mark it; a source opened from a footer is taken to the same way.
  const m = model.value;
  const target: HTMLElement | null = (state.highlightMeasurement ? host.querySelector<HTMLElement>(`[data-mid="${CSS.escape(state.highlightMeasurement)}"]`) : null)
    ?? (state.highlightSource ? host.querySelector<HTMLElement>(`[data-source-block="${CSS.escape(state.highlightSource)}"]`) : null)
    ?? (m?.kind === 'material' && m.toGaps ? host.querySelector<HTMLElement>('#known-gaps') : null);
  if (target) {
    for (const d of target.querySelectorAll('details')) d.open = true;
    for (let d = target.closest('details'); d; d = d.parentElement?.closest('details') ?? null) d.open = true;
    const inBody = target.closest<HTMLElement>('.grade-body');
    if (inBody) { inBody.hidden = false; drawerState.setGradeOpen(inBody.dataset['gradeBody'] ?? '', true); }
    // The conditions its source states once for every measurement are part of what the reader came for.
    if (state.highlightMeasurement) for (const d of target.closest('.src-block')?.querySelectorAll<HTMLDetailsElement>('.shared-conds details') ?? []) d.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: state.highlightSource || (m?.kind === 'material' && m.toGaps) ? 'start' : 'center', behavior: 'smooth' }));
    if (state.highlightSource) host.querySelector<HTMLElement>(`[data-source-block="${CSS.escape(state.highlightSource)}"] .src-title`)?.focus({ preventScroll: true });
  }
}
let drawn = '';
onUpdated(() => {
  const m = model.value;
  const key = m?.kind === 'material' ? `${m.m.id}|${m.tab}|${m.body.length}|${state.highlightMeasurement}|${state.highlightSource}` : `${m?.kind ?? ''}`;
  if (key === drawn) return;
  drawn = key;
  void nextTick(afterDraw);
});
watch(model, () => { void nextTick(afterDraw); }, { flush: 'post' });

// ---- what a press on the body does
function onClick(event: MouseEvent): void {
  const target = event.target instanceof Element ? event.target : null;
  const host = root.value;
  if (!target || !host) return;
  const by = (selector: string): HTMLElement | null => target.closest<HTMLElement>(selector);
  let hit: HTMLElement | null;
  if ((hit = by('[data-measurement]'))) { event.stopPropagation(); actions.openMeasurement(hit.dataset['measurement'] ?? ''); return; }
  if ((hit = by('[data-choose]'))) { actions.toggleDecision(hit.dataset['choose'] ?? ''); return; }
  if ((hit = by('[data-tab-link]'))) { actions.setDrawerTab(hit.dataset['tabLink'] ?? ''); return; }
  if ((hit = by('[data-open-source]'))) { actions.openSource(hit.dataset['openSource'] ?? ''); return; }
  if ((hit = by('[data-open-member]'))) { actions.openMaterial(hit.dataset['openMember'] ?? ''); return; }
  // A product card opens and closes in place, and stays as the reader left it when the drawer is drawn again (Choose redraws it).
  if ((hit = by('[data-grade-toggle]'))) {
    const id = hit.dataset['gradeToggle'] ?? '';
    const card = host.querySelector<HTMLElement>(`[data-grade-body="${CSS.escape(id)}"]`);
    if (!card) return;
    card.hidden = !card.hidden;
    hit.setAttribute('aria-expanded', String(!card.hidden));
    drawerState.setGradeOpen(id, !card.hidden);
    return;
  }
  // A press anywhere on a product's line opens it, as when the whole line was the toggle; a mark on it keeps its own job.
  if ((hit = by('[data-grade-title]'))) {
    if (!by('button, a')) hit.querySelector<HTMLElement>('[data-grade-toggle]')?.click();
    return;
  }
  // A product's card on the page carries the selection the same way, the card's own anchor after it.
  if ((hit = by('.card-link')) && hit instanceof HTMLAnchorElement) {
    const [path, card] = (hit.dataset['cardHref'] ?? '').split('#');
    hit.href = `${path}?from=${toHash(state.scenario)}#${card}`;
    return;
  }
  // A dot, or a value a sentence names where nothing is drawn, opens its record in the list below it, in its heading, from where its document is one press away.
  if ((hit = by('.imp-block [data-row]'))) {
    event.stopPropagation();
    const row = (hit.closest('.imp-block') ?? host).querySelector<HTMLElement>(`.imp-records .evidence-row[data-mid="${CSS.escape(hit.dataset['row'] ?? '')}"]`);
    if (!row) { actions.openMeasurement(hit.dataset['row'] ?? ''); return; }
    host.querySelectorAll('.evidence-row.target').forEach((r) => r.classList.remove('target'));
    row.classList.add('target');
    for (let x = row.closest('details'); x; x = x.parentElement?.closest('details') ?? null) x.open = true;
    requestAnimationFrame(() => row.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    return;
  }
  // A print temperature's dot opens the profile its value is read from, in its maker's list below, or the guide's row.
  if ((hit = by('.print-block [data-profile], .print-block [data-guide]'))) {
    event.stopPropagation();
    const found = hit.dataset['profile'] ? host.querySelector<HTMLElement>(`.profile-block[data-profile-id="${CSS.escape(hit.dataset['profile'])}"]`) : host.querySelector<HTMLElement>('.guide-block');
    if (!found) return;
    host.querySelectorAll('.profile-block.target').forEach((r) => r.classList.remove('target'));
    found.classList.add('target');
    for (let x = found.closest('details'); x; x = x.parentElement?.closest('details') ?? null) x.open = true;
    requestAnimationFrame(() => found.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }
}
/** A product's dot on one row of a comparison lights its dots on the others, so the tests are read for the same product. */
function onPointer(event: MouseEvent, on: boolean): void {
  const dot = event.target instanceof Element ? event.target.closest<HTMLElement>('.imp-dot[data-grade]') : null;
  if (!dot) return;
  (dot.closest('.imp-block') ?? root.value)?.querySelectorAll(`.imp-dot[data-grade="${CSS.escape(dot.dataset['grade'] ?? '')}"]`).forEach((x) => x.classList.toggle('partner', on));
}
function onInput(event: Event): void {
  const box = event.target instanceof HTMLInputElement && event.target.matches('[data-search]') ? event.target : null;
  if (box && root.value) drawerState.search(root.value, box.value);
}
/** The page opens in this tab and carries the selection as it is now (D145), so its Back to your results reopens the selector as the reader left it. The page keeps it for the tab and takes it out of its address; it decides nothing. */
function onPageLink(event: MouseEvent, page: string): void {
  if (event.currentTarget instanceof HTMLAnchorElement) event.currentTarget.href = `${page}?from=${toHash(state.scenario)}`;
}
const pin = (id: string): void => { actions.togglePin(id); };
const dragTabs = (event: KeyboardEvent): void => {
  // Arrow keys move between the tabs (05 section 9.3); Home and End go to the ends.
  const list = [...(tabs.value?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
  const at = list.indexOf(event.target as HTMLElement);
  if (at < 0) return;
  const next = event.key === 'ArrowRight' ? list[(at + 1) % list.length] : event.key === 'ArrowLeft' ? list[(at - 1 + list.length) % list.length] : event.key === 'Home' ? list[0] : event.key === 'End' ? list.at(-1) : null;
  if (!next) return;
  event.preventDefault();
  next.focus();
  actions.setDrawerTab(next.dataset['tab'] ?? '');
};
</script>

<template>
  <div v-if="state.selectedMaterialId && !model" class="drawer" role="dialog" aria-label="Material" data-testid="drawer" :aria-modal="modal">
    <div class="drawer-head"><div style="display:flex;gap:10px"><div style="flex:1"><h2>{{ state.db.materials.find((m: { id: string; name: string }) => m.id === state.selectedMaterialId)?.name }}</h2></div>
      <button id="drawer-close" type="button" class="icon-btn" aria-label="Close" @click="actions.closeDrawer()">✕</button></div></div>
    <div class="drawer-body"><LoadNotice v-if="problem" :state="problem" /></div>
  </div>
  <div v-else-if="model && model.kind === 'family'" ref="root" class="drawer" role="dialog" :aria-label="model.m.name" data-testid="drawer" :aria-modal="modal" @click="onClick">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div style="flex:1">
          <h2>{{ model.m.name }}</h2>
          <div class="sub">{{ model.m.fullName ?? '' }}</div>
          <div class="sub" style="margin-top:5px">{{ model.sub }} · {{ model.status }}</div>
        </div>
        <button id="drawer-close" type="button" class="icon-btn" aria-label="Close" @click="actions.closeDrawer()">✕</button>
      </div>
    </div>
    <div class="drawer-body">
      <p class="lede">{{ model.lede }}</p>
      <p class="fine family-no-tabs">{{ model.noTabs }}</p>
      <h3 class="sec">{{ model.heading }}</h3>
      <div class="facts-list"><div v-for="x in model.members" :key="x.id" class="fact"><button type="button" class="btn btn-sm" :data-open-member="x.id">{{ x.name }}</button></div></div>
      <p class="fine">{{ model.why }}</p>
    </div>
  </div>
  <div v-else-if="model" ref="root" class="drawer" role="dialog" :aria-label="`${model.m.name} detail`" data-testid="drawer" :data-material="model.m.id" :aria-modal="modal"
    @click="onClick" @input="onInput" @mouseover="onPointer($event, true)" @mouseout="onPointer($event, false)">
    <div class="drawer-head">
      <div style="display:flex;align-items:start;gap:10px">
        <div class="head-main">
          <h2>{{ model.id.primary }}</h2>
          <div v-if="model.id.aka" class="sub">also called {{ model.id.aka }}</div>
          <div v-if="model.id.fullName" class="h2-full">{{ model.id.fullName }}</div>
          <div class="sub id-line" v-html="model.idLine"></div>
        </div>
        <a v-if="model.page" class="btn btn-sm page-link" :href="model.page" data-testid="page-link" title="This material's page. Its Back to your results returns here as you left it."
          @click="onPageLink($event, model.page)"><span class="page-link-words">Full page</span><span class="page-link-short" aria-hidden="true">Page</span><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M12 5l5 5-5 5M16.5 10H3" /></svg></a>
        <button id="drawer-pin" type="button" class="btn btn-sm shortlist-btn" :aria-pressed="model.pinned" :title="model.pinned ? 'On the shortlist. Press to remove it.' : 'Add to the shortlist'" @click="pin(model.m.id)"><span aria-hidden="true">{{ model.pinned ? '★' : '☆' }}</span> Shortlist</button>
        <button id="drawer-close" type="button" class="icon-btn" aria-label="Close" data-testid="drawer-close" @click="actions.closeDrawer()">✕</button>
      </div>
    </div>
    <div class="drawer-nav">
      <div ref="tabs" class="drawer-tabs" role="tablist" @keydown="dragTabs">
        <button v-for="t in model.tabs" :key="t.key" type="button" role="tab" :data-tab="t.key" :aria-selected="t.selected" :data-empty="t.empty" aria-controls="drawer-panel" :title="t.title ?? undefined" :tabindex="t.selected ? 0 : -1" :data-testid="`tab-${t.key}`"
          @click="actions.setDrawerTab(t.key)"><span :data-label="t.label">{{ t.label }}</span><span v-if="t.count" class="n">{{ t.count }}</span></button>
      </div>
    </div>
    <div id="drawer-panel" ref="body" class="drawer-body" role="tabpanel" :aria-describedby="model.help ? 'drawer-help' : undefined" data-testid="drawer-body" v-html="bodyHtml"></div>
  </div>
</template>
