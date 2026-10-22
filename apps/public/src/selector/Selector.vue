<script setup lang="ts">
// The selector's page (the old index.html and main.js, as a component): the top bar, the requirements rail, the results, the status bar, the
// shortlist, the drawer. It holds no decision: it asks the store, which asks the engine, and draws what comes back. What the old page did by
// hand after every action (redraw a region, put focus back) is Vue's work here; what is left is what a browser cannot do for us: a modal
// layer's focus, the shortcut keys, the theme, and the place a reader left.
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue';
import { toHash } from '@atlas/engine/port/scenario.ts';
import { keepInView, markTableOverflow } from '@atlas/pages/facts/format';
import { POLICY_CONTROL, POLICY_CONTROL_SHORT, POLICY_LABELS } from '@atlas/pages/facts/labels';
import { SKIP as SKIP_LINK } from '../copy.ts';
import LoadNotice from '../LoadNotice.vue';
import { blockedBy } from '../useLoad.ts';
import type { Blocked } from '../useLoad.ts';
import Popover from './Popover.vue';
import RailGroups from './RailGroups.vue';
import ResultsTable from './ResultsTable.vue';
import { exclusionsOf, noResultsHtml } from './explain.ts';
import { keepPlace } from './keep.ts';
import { activeHtml, startHtml } from './start.ts';
import type { Store } from './store.ts';
import { LENSES } from './store.ts';
import { tableView } from './table.ts';
import { TEMPLATES } from './templates.ts';

const Drawer = defineAsyncComponent(() => import('./drawer/Drawer.vue'));
const SavePanel = defineAsyncComponent(() => import('./SavePanel.vue'));
// The chart lenses, parallel lines, coverage and compare: their code (and the chart library, for Ashby) is fetched when one is first opened.
const LensHost = defineAsyncComponent(() => import('./lenses/LensHost.vue'));
const HOSTED = new Set(['ashby', 'parallel', 'coverage', 'compare']);

const props = defineProps<{ readonly store: Store }>();
const { store } = props;
const { state, actions } = store;
provide('store', store);

const ready = computed(() => { void state.vrev; return state.selection !== null; });
const scenario = computed(() => { void state.vrev; return state.scenario; });
const tested = computed(() => scenario.value.constraints.length > 0);

// ---- what the page may show
// A result is shown only when the parts it needs have arrived: the estimates, once Explore with estimates is asked, and until then the page says it is waiting (or why it cannot).
const blocked = computed<Blocked | null>(() => (state.estimatesProblem ? blockedBy(state.estimatesProblem) : state.pending ? { kind: 'loading' } : null));

// While a part is awaited the count and the chips say nothing: they would be the new question read against the last answer.
const countHtml = computed(() => { void state.vrev; return ready.value && !blocked.value ? store.countHtml() : ''; });
const status = computed(() => { void state.vrev; return ready.value && !blocked.value ? store.statusView() : null; });
const provenance = computed(() => store.provenance());
const lensHelp = computed(() => LENSES.find((l) => l.id === state.lens)?.title ?? '');

// ---- the lens
const header = computed(() => {
  void state.vrev;
  if (!ready.value || state.lens !== 'table') return '';
  // A header is always present: the start panel while nothing is set, and a statement of the active requirements once something is.
  return startHtml(state) || activeHtml(state);
});
const noResults = computed(() => {
  void state.vrev;
  if (!ready.value || state.lens !== 'table') return false;
  // An empty grid explains nothing. Say why the list is empty and offer the way out. A search whose only hits were excluded still goes to the table, which now lists them and why.
  return !state.rows.length && !state.searchExcluded.length && !state.searchFamilies?.length;
});
const noResultsMarkup = computed(() => (noResults.value ? noResultsHtml(state) : ''));
const view = computed(() => { void state.vrev; return ready.value && state.lens === 'table' && !noResults.value ? tableView(state) : null; });
const exclusions = computed(() => { void state.vrev; return ready.value && (state.lens === 'explain' || noResults.value) ? exclusionsOf(state) : { html: '', ranked: [] }; });

const lensEl = ref<HTMLElement | null>(null);

function onLensClick(event: MouseEvent): void {
  // The hosted lenses wire their own controls; a second, delegated handler here would act twice.
  if (HOSTED.has(state.lens)) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const by = (selector: string): HTMLElement | null => target.closest<HTMLElement>(selector);
  let hit: HTMLElement | null;
  if ((hit = by('[data-pin]'))) { event.stopPropagation(); actions.togglePin(hit.dataset['pin'] ?? ''); return; }
  if ((hit = by('[data-measurement]'))) { event.stopPropagation(); actions.openMeasurement(hit.dataset['measurement'] ?? ''); return; }
  if ((hit = by('[data-template]'))) { const t = TEMPLATES[Number(hit.dataset['template'])]; if (t) { actions.applyTemplate(t); scrollLensToTop(); } return; }
  if ((hit = by('[data-drop]'))) { actions.removeConstraint(scenario.value.constraints[Number(hit.dataset['drop'])]); return; }
  if (by('[data-drop-printable]')) {
    scenario.value.constraints = scenario.value.constraints.filter((c: { kind: string; gate: string }) => !(c.kind === 'gate' && ['nozzle', 'bed', 'chamber'].includes(c.gate)));
    actions.changed();
    return;
  }
  if ((hit = by('[data-act]'))) {
    const act = hit.dataset['act'];
    if (act === 'explain') { actions.setLens('explain'); scrollLensToTop(); }
    // On a phone the header is a screen tall: one press to the first candidate, which takes focus (F09).
    else if (act === 'read') {
      const first = lensEl.value?.querySelector<HTMLElement>('tbody tr[data-material]') ?? lensEl.value?.querySelector<HTMLElement>('.empty');
      first?.scrollIntoView({ block: 'start' });
      first?.focus({ preventScroll: true });
    } else if (act === 'reset') actions.reset();
    else if (act === 'anneal') actions.allowAnnealing();
    else if (act === 'printable') actions.checkPrintable();
    return;
  }
  if ((hit = by('[data-relax]'))) { actions.removeConstraint(exclusions.value.ranked[Number(hit.dataset['relax'])]?.constraint); return; }
  if ((hit = by('[data-open-member]'))) { actions.openMaterial(hit.dataset['openMember'] ?? ''); return; }
  if (by('#to-start')) { actions.setLens('table'); return; }
  if (by('#to-explore')) { actions.setPolicy('exploration'); return; }
  if (by('#show-all')) { actions.showAllStates(); return; }
  if (by('#clear-search')) { clearSearch(); return; }
  // A row opens its drawer, unless the press was on a link or a button of its own.
  const row = by('tr[data-material]');
  if (row && !by('a, button')) actions.openMaterial(row.dataset['material'] ?? '');
}

function onLensKey(event: KeyboardEvent): void {
  if (HOSTED.has(state.lens)) return;
  // Only the row itself. Enter on the star or the buy link inside it used to bubble up here and open the drawer as well as doing its own job.
  // The key is consumed: the drawer takes focus on its close button while this keydown runs, and the same Enter's keypress then pressed that button, so the drawer shut as it opened.
  const row = event.target instanceof HTMLElement && event.target.matches('tr[data-material]') ? event.target : null;
  if (row && event.key === 'Enter') { event.preventDefault(); actions.openMaterial(row.dataset['material'] ?? ''); }
}

const searchBox = ref<HTMLInputElement | null>(null);
function clearSearch(): void {
  if (searchBox.value) searchBox.value.value = '';
  actions.clearSearch();
}
const onSearch = (event: Event): void => { actions.setSearch((event.target as HTMLInputElement).value); };

/**
 * Every lens draws into one scroll container, and replacing its content kept the old scroll position: a table read halfway down opened another
 * view 250 px down. A new view, a template or a loaded scenario starts at the top. Re-renders that only change data (a chip, a sort, a filter
 * edit, typing in the search) keep the reader's place.
 */
function scrollLensToTop(): void {
  const el = lensEl.value;
  if (!el) return;
  el.scrollTop = 0;
  // Below 600 px the page scrolls as a whole rather than inside the view, so the page goes back to the top.
  if (getComputedStyle(el).overflowY === 'visible' && window.scrollY > 0) window.scrollTo(0, 0);
}

// ---- theme
const dark = ref(false);
const readDark = (): boolean => {
  const t = document.documentElement.dataset['theme'];
  return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
};
/** Two states, and the button says what pressing it does, in the same words on screen and to a screen reader. */
const themeWords = computed(() => (dark.value ? 'Switch to light theme' : 'Switch to dark theme'));
function toggleTheme(): void {
  const next = dark.value ? 'light' : 'dark';
  document.documentElement.dataset['theme'] = next;
  try { localStorage.setItem('h2c-theme', next); } catch { /* private mode */ }
  dark.value = readDark();
}

// ---- the rail, on a narrow screen a dialog over the results
const narrow = ref(false);
provide('narrow', narrow);
const railOpen = ref(false);
const railCollapsed = ref(false);
const main = ref<HTMLElement | null>(null);
const railButton = ref<HTMLButtonElement | null>(null);
const railClose = ref<HTMLButtonElement | null>(null);
const railHide = ref<HTMLButtonElement | null>(null);
const railModal = computed(() => narrow.value && railOpen.value);
const filtersExpanded = computed(() => (narrow.value ? railOpen.value : !railCollapsed.value));
function setRail(open: boolean): void {
  railOpen.value = open;
  // The close button, not the first button in the header: that is Clear requirements, and Enter on it wiped the question the moment the drawer opened.
  void nextTick(() => { if (open) railClose.value?.focus(); else railButton.value?.focus(); });
}
/** On a wide screen the rail can be hidden too, so a chart can take the width: the choice is this viewer's, kept in this browser only. */
function setHidden(hidden: boolean): void {
  railCollapsed.value = hidden;
  try { localStorage.setItem('h2c-rail', hidden ? 'hidden' : 'shown'); } catch { /* private mode */ }
}
function onFilters(): void {
  if (narrow.value) setRail(!railOpen.value);
  else { setHidden(!railCollapsed.value); if (!railCollapsed.value) void nextTick(() => railHide.value?.focus()); }
}

// ---- the drawer, on a narrow screen a dialog over the page
const drawerOpen = computed(() => { void state.vrev; return state.panel !== null; });
const appModal = computed(() => narrow.value && drawerOpen.value);
const appEl = ref<HTMLElement | null>(null);
const skipLink = ref<HTMLAnchorElement | null>(null);
const popover = ref<InstanceType<typeof Popover> | null>(null);
// Where keyboard focus returns when a panel closes.
let returnFocus: HTMLElement | null = null;
watch(drawerOpen, async (open, was) => {
  if (open && !was) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await nextTick();
    // A panel that has just opened takes focus, so a keyboard user is not left behind it.
    document.querySelector<HTMLElement>('#drawer-host .drawer-head .icon-btn')?.focus();
  } else if (!open && was) {
    const back = returnFocus;
    returnFocus = null;
    await nextTick();
    if (back?.isConnected) back.focus();
  }
});

const focusablesIn = (root: Element): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [tabindex]')]
  .filter((el) => !(el as HTMLButtonElement).disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    if (state.panel) { actions.closeDrawer(); return; }
    if (railOpen.value && narrow.value) { setRail(false); return; }
  }
  // Inside a modal drawer, or the rail while it is one, Tab cycles through it. An open explanation keeps its own Tab handling (Popover.vue),
  // which may already have moved focus back to its mark; the cycle then carries on from there.
  const modal = e.key === 'Tab' ? (document.querySelector('#drawer-host .drawer[aria-modal="true"]') ?? document.querySelector('#rail[aria-modal="true"]')) : null;
  if (modal && !(popover.value?.isOpen() && popover.value.contains(document.activeElement))) {
    const items = focusablesIn(modal);
    const first = items[0], last = items[items.length - 1];
    const at = document.activeElement;
    if (first && last) {
      if (!at || !modal.contains(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    }
  }
  const typing = e.target instanceof Element && e.target.closest('input, select, textarea, [contenteditable="true"]');
  if (e.key === '/' && !typing) { e.preventDefault(); searchBox.value?.focus(); }
}

/** The first stop for a keyboard: past the top bar and the filters, straight to what they produced. The results take focus themselves; following the link's #lens would have been read as a scenario link. */
function onSkip(e: Event): void { e.preventDefault(); lensEl.value?.focus(); }

/** The material pages' index opens in this tab with the selection as it is now, as the drawer's Full page does (D145). */
function onPagesLink(e: Event): void {
  if (e.currentTarget instanceof HTMLAnchorElement) e.currentTarget.href = `materials/index.html?from=${toHash(state.scenario)}`;
}

// ---- the lens tabs
const lensStrip = ref<HTMLElement | null>(null);
/** On a phone the view tabs are one strip that scrolls sideways; the active one is kept in sight. */
function keepLensTabInView(): void {
  const active = lensStrip.value?.querySelector<HTMLElement>('[data-lens][aria-pressed="true"]');
  if (active?.parentElement) keepInView(active.parentElement, active);
}
watch(() => state.lens, () => { void nextTick(() => { keepLensTabInView(); scrollLensToTop(); }); });

// ---- notices (what a dialog said in the old page)
const dismiss = (id: number): void => { actions.dismissNotice(id); };

// ---- the place a reader left (the return from a material page)
let leavePlace: (() => void) | null = null;
function onHashChange(): void {
  if (store.followHash(location.hash.slice(1))) {
    void store.render().then(() => scrollLensToTop());
  }
}
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
const onResize = (): void => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { markTableOverflow(document); keepLensTabInView(); }, 100);
};
let mq: MediaQueryList | null = null;
let scheme: MediaQueryList | null = null;
const onNarrow = (): void => { narrow.value = !!mq?.matches; };
const onScheme = (): void => { if (!document.documentElement.dataset['theme']) dark.value = readDark(); };

onMounted(() => {
  mq = matchMedia('(max-width: 1100px)');
  narrow.value = mq.matches;
  mq.addEventListener('change', onNarrow);
  scheme = matchMedia('(prefers-color-scheme: dark)');
  scheme.addEventListener('change', onScheme);
  dark.value = readDark();
  try { railCollapsed.value = localStorage.getItem('h2c-rail') === 'hidden'; } catch { /* private mode */ }
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('hashchange', onHashChange);
  window.addEventListener('resize', onResize);
  leavePlace = keepPlace(state, () => lensEl.value);
  keepLensTabInView();
});
onBeforeUnmount(() => {
  mq?.removeEventListener('change', onNarrow);
  scheme?.removeEventListener('change', onScheme);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('hashchange', onHashChange);
  window.removeEventListener('resize', onResize);
  leavePlace?.();
});

// A narrow screen with the drawer open makes the page behind it inert; so does the rail while it is a dialog over the results.
watch([appModal, railModal], () => {
  const behindRail = [document.querySelector('.topbar'), document.querySelector('.workspace'), document.querySelector('.statusbar'), document.getElementById('tray'), skipLink.value];
  for (const el of behindRail) if (el) (el as HTMLElement).inert = railModal.value || appModal.value;
  if (appEl.value) appEl.value.inert = appModal.value;
  if (skipLink.value) skipLink.value.inert = appModal.value;
}, { flush: 'post' });

const estimatesToggle = computed(() => {
  const explore = !!status.value?.explore;
  return { explore, checked: explore && state.useEstimates, disabled: !explore };
});
const onEstimates = (event: Event): void => { actions.toggleEstimates((event.target as HTMLInputElement).checked); };
const pins = computed(() => { void state.vrev; return scenario.value.shortlist.map((id: string) => ({ id, name: state.db.materials.find((m: { id: string; name: string }) => m.id === id)?.name ?? id })); });
const tray = computed(() => { void state.vrev; return { pins: pins.value, chosen: scenario.value.decisions?.length ?? 0, count: scenario.value.shortlist.length }; });
const SHORTLIST_OF = 6;
</script>

<template>
  <a id="skip-link" ref="skipLink" class="skip-link" href="#lens" data-testid="skip-link" @click="onSkip">{{ SKIP_LINK }}</a>
  <div ref="appEl" class="app" :data-busy="state.pending !== null || state.drawerLoading > 0 || state.lensLoading > 0 ? 'true' : undefined">
    <header class="topbar">
      <button id="btn-filters" ref="railButton" type="button" class="btn btn-sm btn-icon" aria-controls="rail" :aria-expanded="filtersExpanded" data-testid="filters-button" @click="onFilters"><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h8M15 5.5h2M3 14.5h2M9 14.5h8" /><circle cx="13" cy="5.5" r="2" /><circle cx="7" cy="14.5" r="2" /></svg>Filters</button>
      <h1 class="brand"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" /><path d="M9 22h14M11 16.5h10M13 11h6" /></svg><span class="brand-name">Filament Atlas</span></h1>
      <div class="search">
        <svg class="icon search-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
        <input id="search" ref="searchBox" type="search" placeholder="Material, maker or product" aria-label="Search materials" aria-keyshortcuts="/" data-testid="search" @input="onSearch">
        <kbd class="search-key" aria-hidden="true" title="Press / to search">/</kbd>
      </div>
      <div class="spacer"></div>

      <!-- The two settings that decide what missing data does, side by side and quiet. -->
      <div class="data-settings">
        <div class="mode-group">
          <span id="mode-label" class="mode-label"><span class="mode-label-long">{{ POLICY_CONTROL }}</span><span class="mode-label-short">{{ POLICY_CONTROL_SHORT }}</span></span>
          <div class="segmented" role="group" aria-labelledby="mode-label">
            <button id="mode-strict" type="button" :aria-pressed="scenario.unknownPolicy === 'strict'" data-testid="mode-strict" title="Leave out the materials whose data cannot settle a requirement: only those confirmed to meet every requirement are listed." @click="actions.setPolicy('strict')">{{ POLICY_LABELS['strict'] }}</button>
            <button id="mode-explore" type="button" :aria-pressed="scenario.unknownPolicy === 'exploration'" data-testid="mode-explore" title="Also list the materials whose data cannot settle a requirement, flagged, with what is missing for each. A material a required property does not apply to stays hidden; the HIDDEN chip brings it back." @click="actions.setPolicy('exploration')">{{ POLICY_LABELS['exploration'] }}</button>
          </div>
        </div>

        <!-- Shown in both modes. Left out, it is disabled and unchecked, its stored value kept, and its ? and its name for a screen reader say why. -->
        <div class="est-group">
          <div class="est-line">
            <label id="est-toggle" class="est-toggle" :data-disabled="estimatesToggle.disabled" :title="estimatesToggle.explore ? '' : 'Works only when the materials that could not be checked are included'">
              <input id="use-estimates" type="checkbox" :checked="estimatesToggle.checked" :disabled="estimatesToggle.disabled" :aria-describedby="estimatesToggle.explore ? 'est-ruled' : 'est-reason'" data-testid="use-estimates" @change="onEstimates"><span>Use estimates and resin data</span></label>
            <button type="button" class="mark info-mark" aria-label="What Use estimates and resin data does" aria-haspopup="dialog" aria-expanded="false"
              data-explain-head="Use estimates and resin data"
              data-explain="Where a product publishes nothing for a property, this shows an estimate from its related values and similar materials. Estimates order the materials under Not enough data and tag likely the ones whose estimated range meets every open limit; one whose every open product's estimate wholly misses goes to Unlikely to meet. An estimate never passes a material, and no estimate of a product hides one. With this on, resin reference data can also hide a material whose base polymer it reports attacked or dissolved by the chemical asked, and a material with no product on record is hidden when its own estimate wholly misses a limit. A property that does not apply (an elastomer's HDT) hides the material whether this is on or not. It works only when the materials that could not be checked are included."
              title="Where a product publishes nothing for a property, this shows an estimate from its related values and similar materials. Estimates order the materials under Not enough data and tag likely the ones whose estimated range meets every open limit; one whose every open product's estimate wholly misses goes to Unlikely to meet. An estimate never passes a material, and no estimate of a product hides one. With this on, resin reference data can also hide a material whose base polymer it reports attacked or dissolved by the chemical asked, and a material with no product on record is hidden when its own estimate wholly misses a limit. A property that does not apply (an elastomer's HDT) hides the material whether this is on or not. It works only when the materials that could not be checked are included.">?</button>
          </div>
          <span id="est-reason" class="est-reason" :hidden="estimatesToggle.explore">Works only when the materials that could not be checked are included</span>
          <span id="est-ruled" class="est-ruled" :hidden="!status?.ruled">{{ status?.ruled ?? '' }}</span>
        </div>
      </div>

      <!-- Words where the bar has room, an icon where it has not; the words stay the accessible name and the title. -->
      <button id="btn-scenario" type="button" class="btn btn-sm btn-icon" aria-label="Save / share" title="Export, save, load or share this selection" data-testid="save-share" @click="actions.openScenario()"><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 12.5V3M6.5 6.5L10 3l3.5 3.5M4.5 10.5v6h11v-6" /></svg><span class="btn-text">Save / share</span></button>
      <button id="btn-theme" type="button" class="btn btn-sm btn-icon" :aria-label="themeWords" :title="themeWords" data-testid="theme" @click="toggleTheme"><svg class="icon theme-moon" viewBox="0 0 20 20" aria-hidden="true" :hidden="dark"><path d="M15.5 12.5A6.5 6.5 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z" /></svg><svg class="icon theme-sun" viewBox="0 0 20 20" aria-hidden="true" :hidden="!dark"><circle cx="10" cy="10" r="3.5" /><path d="M10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4" /></svg><span class="btn-text">{{ themeWords }}</span></button>
    </header>

    <div id="main" ref="main" class="main" :data-rail-open="String(railOpen)" :data-rail-collapsed="String(railCollapsed)">
      <div id="rail-backdrop" class="rail-backdrop" @click="setRail(false)"></div>
      <aside id="rail" class="rail" aria-label="Filters" :role="railModal ? 'dialog' : undefined" :aria-modal="railModal ? 'true' : undefined" data-testid="rail">
        <div class="rail-head">
          <h2><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5h8M15 5.5h2M3 14.5h2M9 14.5h8" /><circle cx="13" cy="5.5" r="2" /><circle cx="7" cy="14.5" r="2" /></svg>Filters</h2>
          <button id="btn-reset" type="button" class="text-btn" title="Removes every requirement. Part condition, search, shortlist and view stay as they are." data-testid="clear-requirements" @click="actions.reset()">Clear requirements</button>
          <button id="btn-rail-hide" ref="railHide" type="button" class="icon-btn btn-icon" aria-label="Hide filters" title="Hide the filters to widen the results. Filters, in the top bar, brings them back." @click="setHidden(true); railButton?.focus()"><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M8 4v12M13.5 8L11.5 10l2 2" /></svg></button>
          <button id="btn-rail-close" ref="railClose" type="button" class="icon-btn" aria-label="Close filters" @click="setRail(false)">✕</button>
        </div>
        <div id="filter-groups"><RailGroups v-if="ready" :store="store" /></div>
      </aside>

      <section class="workspace">
        <div class="lens-bar">
          <span id="count" class="candidate-count" data-testid="count" v-html="countHtml"></span>
          <div class="spacer"></div>
          <div class="lens-nav">
            <div ref="lensStrip" class="segmented" role="group" aria-label="View" aria-describedby="lens-help">
              <button v-for="l in LENSES" :key="l.id" type="button" :data-lens="l.id" :aria-pressed="state.lens === l.id" :title="l.title" :data-label="l.label" :data-testid="`lens-${l.id}`" @click="actions.setLens(l.id)">{{ l.label }}</button>
            </div>
            <p id="lens-help" class="lens-help">{{ lensHelp }}</p>
          </div>
        </div>
        <div v-if="state.notices.length" class="notices" role="alert" data-testid="notices">
          <p v-for="n in state.notices" :key="n.id" class="notice-line" data-testid="notice"><span class="notice-text" data-testid="notice-text">{{ n.text }}</span> <button type="button" class="link-btn" @click="dismiss(n.id)">Dismiss</button></p>
        </div>
        <div id="lens" ref="lensEl" class="lens-view" tabindex="-1" role="region" aria-label="Results" data-testid="lens" :data-state="blocked ? blocked.kind : ready ? 'ready' : 'loading'" :data-vrev="state.vrev" @click="onLensClick" @keydown="onLensKey">
          <LoadNotice v-if="blocked" :state="blocked" />
          <template v-else-if="ready">
            <template v-if="state.lens === 'table'">
              <div v-if="header" v-html="header"></div>
              <div>
                <div v-if="noResults" v-html="noResultsMarkup"></div>
                <ResultsTable v-else-if="view" :view="view" :store="store" />
              </div>
            </template>
            <div v-else-if="state.lens === 'explain'" v-html="exclusions.html"></div>
            <LensHost v-else-if="HOSTED.has(state.lens)" :store="store" :lens="state.lens" />
          </template>
        </div>
      </section>
    </div>

    <footer class="statusbar">
      <span id="status-idle" class="statusbar-idle" :hidden="tested"><svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 6.2v.1" /></svg>Set a requirement in Filters to see what passed, what failed
        and what could not be checked.</span>
      <!-- Filters, not a tally: a label that says so, and a box in each chip that is ticked while its results are shown. -->
      <span id="statusbar-label" class="statusbar-label" :hidden="!tested">Show in table</span>
      <template v-if="status">
        <button v-for="c in status.chips" :id="`s-${c.verdict.toLowerCase()}`" :key="c.verdict" type="button" :class="`chip chip-${c.verdict}`" :aria-pressed="c.on" aria-describedby="statusbar-label" :hidden="c.hidden" :disabled="c.disabled" :title="c.title" :data-testid="`status-${c.verdict}`" @click="actions.toggleState(c.verdict)"><span class="chip-box" aria-hidden="true">{{ c.text.slice(0, 1) }}</span> {{ c.text.slice(2) }}</button>
        <button id="s-screened" type="button" class="chip chip-screened" :aria-pressed="status.screened.on" aria-describedby="statusbar-label" :hidden="status.screened.hidden" :title="status.screened.title" data-testid="status-screened" @click="actions.toggleScreened()"><span class="chip-box" aria-hidden="true">{{ status.screened.text.slice(0, 1) }}</span> {{ status.screened.text.slice(2) }}</button>
      </template>
      <div class="spacer"></div>
      <!-- Provenance: the data and the release every answer on the page comes from. -->
      <a id="pages-link" class="pages-link" href="materials/index.html" title="Every material with a page of its own, by family." @click="onPagesLink">Material pages</a>
      <span id="meta" class="meta-chip" data-testid="release-strip" :data-release="state.db.meta.release?.id" :title="provenance.title">{{ provenance.text }}</span>
    </footer>

    <div id="tray" class="tray" :hidden="tray.count === 0 && tray.chosen === 0" data-testid="tray">
      <span class="label" data-testid="tray-label">Shortlist {{ tray.count }} of {{ SHORTLIST_OF }}</span>
      <div id="pins" style="display:flex;gap:7px;flex-wrap:wrap">
        <span v-for="p in tray.pins" :key="p.id" class="pin" data-testid="pin">{{ p.name }}<button type="button" :data-unpin="p.id" :aria-label="`Remove ${p.name} from the shortlist`" @click="actions.togglePin(p.id)">✕</button></span>
      </div>
      <span id="tray-notice" class="tray-notice" role="status" :hidden="!state.shortlistNotice" data-testid="tray-notice">{{ state.shortlistNotice ?? '' }}</span>
      <div class="spacer"></div>
      <button id="btn-chosen" type="button" class="btn btn-sm" :hidden="tray.chosen === 0" data-testid="chosen" @click="actions.openScenario()">Chosen products: {{ tray.chosen }}</button>
      <button id="btn-clear-pins" type="button" class="btn btn-sm" @click="actions.clearShortlist()">Clear all</button>
    </div>
  </div>

  <div id="drawer-host" @click="(e) => { if (e.target === e.currentTarget && state.panel) actions.closeDrawer(); }">
    <component :is="state.panel === 'scenario' ? SavePanel : Drawer" v-if="drawerOpen" :store="store" />
  </div>
  <Popover ref="popover" :store="store" />
</template>
