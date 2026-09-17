// Bootstrap and state.
//
// One candidate set drives every lens. The engine is pure and lives under engine/; nothing in
// ui/ is imported from there.

import { runSelection, UNKNOWN_POLICY, normalizePolicy } from './engine/constraints.js';
import { matchesQuery } from './engine/search.js';
import { newScenario, toHash, fromHash, serialize, deserialize, applyAssumptions, SHORTLIST_MAX } from './engine/scenario.js';
import { renderFilters } from './ui/filters.js';
import { renderTable, toCSV, download, sortRows, sortForColumnSet } from './ui/table.js';
import { renderAshby } from './ui/ashby.js';
import { renderParallel } from './ui/parallel.js';
import { renderCoverage } from './ui/heatmap.js';
import { renderCompare } from './ui/compare.js';
import { renderDrawer } from './ui/detail.js';
import { renderExclusions, renderNoResults } from './ui/explain.js';
import { esc, markTableOverflow, keepInView } from './ui/format.js';
import { TEMPLATES } from './ui/templates.js';
import { renderStart, wireStart, renderActive, wireActive, candidateCount } from './ui/start.js';
import { setEnvironmentLabels, POLICY_CONTROL, POLICY_CONTROL_SHORT, POLICY_LABELS, policyLabel } from './ui/labels.js';
import { initPopover, popoverOpen } from './ui/popover.js';
import { useRegistry } from './ui/registry.js';

/**
 * Which verdicts a policy shows by default. Strict shows what passed; Explore also shows what
 * could not be evaluated. Derived in one place so the boot path, the mode buttons and scenario
 * import cannot drift apart, which is how a shared Explore link ended up rendering as Strict.
 */
const defaultShowStates = (policy) =>
  policy === UNKNOWN_POLICY.EXPLORATION ? new Set(['PASS', 'UNKNOWN']) : new Set(['PASS']);

const state = {
  db: null, reference: null, scenario: null, ctx: null,
  lens: 'table', search: '', sort: { key: 'name', dir: 'asc' },
  columnSet: 'properties',
  // Set when switching column sets had to drop the sort, so the table can say so. The sort used to fall back to
  // name without a word, and the list simply reordered.
  sortNotice: null,
  // Estimates are an Explore-mode aid only; Strict neither shows them nor lets them decide.
  useEstimates: true,
  // Which constraint verdicts the table shows. The status-bar chips toggle these, which is what
  // makes them controls rather than decoration, and what makes Strict against Explore visible.
  showStates: new Set(['PASS']),
  // Whether materials an estimate screened out of Explore are shown anyway. They are UNKNOWN, not
  // FAIL, so they would otherwise sit among the flagged results; the SCREENED chip brings them back.
  showScreened: false,
  selectedMaterialId: null, drawerTab: 'Overview',
  // Which panel occupies the drawer: a material, or the save-and-share panel. One slot, so Escape,
  // focus and re-rendering treat both the same way; the Scenario panel used to be written straight
  // into the host, ignored Escape, and was wiped by the next render.
  panel: null,
  // Where keyboard focus returns when a panel closes.
  returnFocus: null,
  // A measurement the user asked to see, so the Evidence tab can scroll to it and mark it rather
  // than dropping them into a list of twenty-one and leaving them to hunt.
  highlightMeasurement: null,
  // The source block a measurement's footer opened in the Sources tab, scrolled to and marked.
  highlightSource: null,
  // The familiar anchor. A printer owner judges every number against PLA, and 4.43 GPa means
  // nothing on its own. Off until chosen, then drawn in the table, the chart and Compare.
  baseline: null,
  // Said in the shortlist bar when a seventh material was refused. It was a browser alert, which stopped the page and
  // pointed at "the tray", a word the screen never used.
  shortlistNotice: null,
  selection: null, rows: [], subset: null, searchExcluded: [],
};

/** Materials everyone already has a feel for, offered as the comparison anchor. */
export const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

// ------------------------------------------------------------------ data loading

async function loadEmbedded(id) {
  const node = document.getElementById(id);
  if (!node) return null;
  if (node.dataset.encoding === 'gzip+base64') {
    const bytes = Uint8Array.from(atob(node.textContent.trim()), (c) => c.charCodeAt(0));
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser cannot decompress the embedded database. Use a current version of Chrome, Firefox, Edge or Safari.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(node.textContent);
}

async function loadData() {
  const embedded = await loadEmbedded('db-data');
  if (embedded) return { db: embedded, reference: await loadEmbedded('reference-data') };
  const [db, reference] = await Promise.all([
    fetch('../dist/db.json').then((r) => r.json()),
    fetch('../dist/reference.json').then((r) => r.json()),
  ]);
  return { db, reference };
}

// ------------------------------------------------------------------ scenario hydration

/**
 * Make a validated scenario the running state. One function for startup, file import and anything
 * else that replaces the question, because import used to set the scenario and forget the lens, the
 * baseline, the columns, the estimates switch and the open material, so the screen and the saved
 * file disagreed until the next reload.
 */
function hydrate(scenario) {
  state.scenario = scenario;
  state.showStates = defaultShowStates(scenario.unknownPolicy);
  state.showScreened = false;
  state.selectedMaterialId = scenario.openMaterial ?? null;
  state.panel = state.selectedMaterialId ? 'material' : null;
  state.drawerTab = 'Overview';
  state.highlightMeasurement = null;
  state.highlightSource = null;
  state.useEstimates = scenario.useEstimates !== false;
  state.columnSet = scenario.columnSet ?? 'properties';
  state.sortNotice = null;
  state.baseline = scenario.baseline ?? null;
  state.subset = null;
  state.lens = scenario.lens ?? 'table';
}

const materialIds = () => new Set(state.db.materials.map((m) => m.id));
const headlineKeys = () => new Set(state.db.registry.headlines.map((h) => h.key));

// ------------------------------------------------------------------ derived state

function buildContext(db) {
  const group = (rows, key) => {
    const m = new Map();
    for (const r of rows) { if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(r); }
    return m;
  };
  return {
    db,
    measurementsByMaterial: group(db.measurements, 'materialId'),
    evidenceByMaterial: group(db.evidence, 'materialId'),
    // The base polymers' published behaviour, attached by the build where a material has no record of its own (D64).
    polymerEvidenceByMaterial: group(db.polymerEvidence ?? [], 'materialId'),
    coverageByMaterial: group(db.coverage, 'materialId'),
    unknownPolicy: UNKNOWN_POLICY.STRICT,
  };
}

function recompute() {
  const { db, scenario } = state;
  scenario.unknownPolicy = normalizePolicy(scenario.unknownPolicy);
  state.ctx.unknownPolicy = scenario.unknownPolicy;
  // Strict means measured evidence only: estimates are neither shown nor allowed to decide anything.
  // `showEstimates` is the display switch, kept separate from `useEstimates` (the engine's) so the two
  // can diverge later without touching every view.
  state.ctx.useEstimates = scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION && state.useEstimates;
  state.ctx.showEstimates = state.ctx.useEstimates;

  // A family entry (PA, PA-CF, PA-GF, TPE; CoPA for PA6/66) owns no product and is never a candidate.
  const candidates = db.materials.filter((m) => !m.familyEntry);
  // Assumptions are scenario data. The database object is never mutated.
  const materials = scenario.assumptions.length
    ? candidates.map((m) => applyAssumptions(m, scenario.assumptions, Object.fromEntries(db.registry.headlines.map((h) => [h.key, h.unit]))).material)
    : candidates;

  state.selection = runSelection(materials, scenario.constraints, state.ctx);

  const q = state.search.trim();
  const byId = new Map(materials.map((m) => [m.id, m]));

  // Searching a family's name finds its members and says what the family is, so "PA-CF" answers
  // with PA6-CF, PA12-CF and the rest rather than with nothing, or with one of them twice.
  state.searchFamilies = q ? db.materials.filter((m) => m.familyEntry && matchesQuery(m, q)) : [];
  const members = new Set(state.searchFamilies.flatMap((f) => f.familyEntry.members.map((x) => x.id)));
  const found = state.selection.evaluations
    .map((e) => ({ material: byId.get(e.materialId), evaluation: e }))
    .filter(({ material: m }) => (!state.subset || state.subset.includes(m.id)) && (matchesQuery(m, q) || members.has(m.id)));

  const visible = (e) => state.showStates.has(e.verdict) && (!e.screened || state.showScreened);
  state.rows = found.filter(({ evaluation: e }) => visible(e));

  // Search the whole database, not only what survived the filters.
  //
  // Setting a heat requirement and then searching "PLA" used to return nothing, which reads as
  // "PLA is not in this database". It is, and it failed a requirement. The hits the filters
  // removed are kept here and shown in their own group with the criterion that removed them.
  state.searchExcluded = q ? found.filter(({ evaluation: e }) => !visible(e)) : [];
}

// ------------------------------------------------------------------ actions

const actions = {
  changed() { state.subset = null; render(); pushHash(); },
  sort(key) {
    state.sortNotice = null;
    state.sort = state.sort.key === key
      ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'name' || key === 'family' ? 'asc' : 'desc' };
    renderLens();
  },
  togglePin(id) {
    const s = state.scenario.shortlist;
    const i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1);
    else if (s.length < SHORTLIST_MAX) s.push(id);
    else {
      const m = state.db.materials.find((x) => x.id === id);
      state.shortlistNotice = `The shortlist holds ${SHORTLIST_MAX}, so ${m?.name ?? id} was not added. Remove one first.`;
      renderTray();
      return;
    }
    render(); pushHash();
  },
  // The open material lives in the URL, so a link can point straight at one. A tab can be named,
  // so a Coverage cell lands on the evidence it describes rather than on the Overview.
  openMaterial(id, tab = 'Overview') {
    if (!state.panel) state.returnFocus = document.activeElement;
    state.selectedMaterialId = id; state.drawerTab = tab; state.panel = 'material';
    state.highlightMeasurement = null; state.highlightSource = null;
    state.scenario.openMaterial = id; renderDrawerHost(); pushHash();
  },
  setDrawerTab(tab) { state.drawerTab = tab; state.highlightMeasurement = null; state.highlightSource = null; renderDrawerHost(); },
  // From a measurement to the source that published it: the Sources tab (internally still "Evidence"), taken to that
  // source's block, with focus on its heading so a keyboard reader arrives there too. The source's name and a link to the
  // original had been one tab away with nothing leading to them.
  openSource(sourceId) {
    state.drawerTab = 'Evidence';
    state.highlightMeasurement = null;
    state.highlightSource = sourceId;
    renderDrawerHost();
    document.querySelector(`#drawer-host [data-source-block="${CSS.escape(sourceId)}"] .src-title`)?.focus({ preventScroll: true });
  },
  closeDrawer() {
    state.selectedMaterialId = null; state.scenario.openMaterial = null; state.panel = null;
    renderDrawerHost(); pushHash();
    const back = state.returnFocus;
    state.returnFocus = null;
    if (back?.isConnected) back.focus();
  },
  openMeasurement(id) {
    const m = state.db.measurements.find((x) => x.id === id);
    if (!m) return;
    if (!state.panel) state.returnFocus = document.activeElement;
    state.selectedMaterialId = m.materialId;
    state.scenario.openMaterial = m.materialId;
    state.panel = 'material';
    state.drawerTab = 'Evidence';
    state.highlightMeasurement = id;
    state.highlightSource = null;
    renderDrawerHost(); pushHash();
  },
  openScenario() {
    if (!state.panel) state.returnFocus = document.activeElement;
    state.panel = 'scenario';
    renderDrawerHost();
  },
  setBaseline(id) {
    state.baseline = id || null;
    state.scenario.baseline = state.baseline;
    render(); pushHash();
  },
  setPolicy(p) {
    const policy = normalizePolicy(p);
    state.scenario.unknownPolicy = policy;
    // Reset the view to the policy's own default so the change is visible in the table, not just
    // in a label. Strict shows what passed; Explore also shows what could not be evaluated.
    state.showStates = defaultShowStates(policy);
    state.showScreened = false;
    render(); pushHash();
  },
  toggleEstimates(on) { state.useEstimates = on; state.scenario.useEstimates = on; render(); pushHash(); },
  toggleScreened() { state.showScreened = !state.showScreened; render(); },
  setColumns(which) {
    const before = { sort: state.sort, columnSet: state.columnSet };
    state.columnSet = which;
    state.scenario.columnSet = which;
    // A sort by a column the new set does not show falls back to name, and the table says so: a list that reorders
    // itself without a word reads as the data changing.
    state.sort = sortForColumnSet(state.sort, which);
    state.sortNotice = state.sort === before.sort ? null : { key: before.sort.key, from: before.columnSet, to: which };
    renderLens(); pushHash();
  },
  // Back to the results the policy counts as candidates. This used to switch on FAIL as well, so
  // "show everything that matched" filled the table with materials that had failed.
  showAllStates() {
    state.showStates = defaultShowStates(state.scenario.unknownPolicy);
    state.showScreened = false;
    render();
  },
  toggleState(verdict) {
    if (state.showStates.has(verdict)) {
      // The last visible kind stays on. Its chip is disabled and says so; removing it and adding it
      // straight back made the button look broken.
      if (state.showStates.size === 1) return;
      state.showStates.delete(verdict);
    } else state.showStates.add(verdict);
    render();
  },
  clearSearch() {
    state.search = '';
    document.getElementById('search').value = '';
    render();
  },
  setPlot(patch) { Object.assign(state.scenario.plot, patch); renderLens(); pushHash(); },
  selectSubset(ids) { state.subset = ids; render(); },
  // A template's result is read in the table, which is the only lens with the requirements
  // header. Applied from Compare or a chart it used to change nothing visible.
  applyTemplate(t) {
    state.scenario.constraints = t.constraints.map((c) => ({ ...c }));
    state.scenario.template = t.name;
    state.scenario.unknownPolicy = UNKNOWN_POLICY.STRICT;
    state.showStates = defaultShowStates(UNKNOWN_POLICY.STRICT);
    if (state.panel === 'scenario') { state.panel = null; renderDrawerHost(); }
    state.subset = null;
    setLens('table');
    render(); pushHash();
    scrollLensToTop();
  },
  setLens(lens) { setLens(lens); },
  reset() {
    state.scenario.constraints = [];
    state.scenario.template = null;
    actions.changed();
  },
  // Removes the whole criterion. It was labelled "Relax", which suggests loosening a threshold.
  removeConstraint(constraint) {
    state.scenario.constraints = state.scenario.constraints.filter((c) => c !== constraint);
    render(); pushHash();
  },
};

// ------------------------------------------------------------------ rendering

function renderLens() {
  const host = document.getElementById('lens');
  switch (state.lens) {
    case 'table': {
      // A header is always present: the start panel while nothing is set, and a statement of the
      // active requirements once something is.
      const header = renderStart(state, actions) || renderActive(state, actions);
      host.innerHTML = header;
      wireStart(host, actions);
      wireActive(host, state, actions);
      const tableHost = document.createElement('div');
      host.appendChild(tableHost);
      // An empty grid explains nothing. Say why the list is empty and offer the way out. A search
      // whose only hits were excluded still goes to the table, which now lists them and why.
      if (!state.rows.length && !state.searchExcluded.length && !state.searchFamilies?.length) return renderNoResults(tableHost, state, actions);
      return renderTable(tableHost, state, actions);
    }
    case 'ashby': return renderAshby(host, state, actions);
    case 'parallel': return renderParallel(host, state, actions);
    case 'coverage': return renderCoverage(host, state, actions);
    case 'compare': return renderCompare(host, state, actions);
    case 'explain': return renderExclusions(host, state, actions);
    default: return renderTable(host, state, actions);
  }
}

function renderDrawerHost() {
  const host = document.getElementById('drawer-host');
  const wasOpen = host.childElementCount > 0;
  preservingFocus(host, () => {
    if (state.panel === 'scenario') renderScenario(host);
    else renderDrawer(host, state, actions);
  });
  syncDrawerModal();
  // A panel that has just opened takes focus, so a keyboard user is not left behind it.
  if (!wasOpen && host.childElementCount) host.querySelector('.drawer-head .icon-btn')?.focus();
}

/**
 * Below 1100 px the drawer covers the whole screen, so it is a modal dialog there: the page behind it is inert, a
 * backdrop sits under it, and Tab cycles inside it (wireChrome). It used to be a full-screen overlay that Tab walked
 * straight out of, into a page nobody could see. On a wide screen it is a side panel beside results that stay usable.
 */
const narrowScreen = matchMedia('(max-width: 1100px)');
function syncDrawerModal() {
  const drawer = document.querySelector('#drawer-host .drawer');
  const modal = !!drawer && narrowScreen.matches;
  if (drawer) {
    if (modal) drawer.setAttribute('aria-modal', 'true');
    else drawer.removeAttribute('aria-modal');
  }
  document.querySelector('.app').inert = modal;
  document.getElementById('skip-link').inert = modal;
}

/** What Tab can reach inside a panel, in document order. */
const focusablesIn = (root) => [...root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
  .filter((el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length > 0);

/**
 * Re-render a region without throwing away the user's place in it. Focus is matched by id or by the
 * first data attribute, which is how every control in this interface is addressed.
 */
function preservingFocus(host, draw) {
  const active = document.activeElement;
  let selector = null;
  if (active && host.contains(active)) {
    if (active.id) selector = `#${CSS.escape(active.id)}`;
    else {
      const attr = [...active.attributes].find((a) => a.name.startsWith('data-'));
      if (attr) selector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
    }
  }
  draw();
  if (selector) host.querySelector(selector)?.focus();
}

/** The verdicts in the order every count names them, never alphabetical: "FAIL + PASS" read as a ranking. */
const VERDICT_ORDER = ['PASS', 'UNKNOWN', 'FAIL'];

/** Whether the SCREENED chip is on screen: only once an estimate has screened something out. */
const screenedChipShown = () => state.scenario.constraints.length > 0
  && state.scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION && state.useEstimates && state.selection.counts.screened > 0;

/**
 * What the rows on screen are, in words that add up to their number: the candidates among them (of how many, when not
 * all are shown), then those shown for another reason. "31 shown PASS + UNKNOWN · 23 candidates" left the 8 rows the
 * SCREENED chip had brought back unexplained, and "82 shown PASS + FAIL · 15 candidates" never said what the other 67
 * were. Each row is exactly one of these, so the parts always sum to the count.
 */
function shownBreakdown(rows, candidates) {
  let mine = 0, unchecked = 0, screened = 0, failed = 0;
  for (const { evaluation: e } of rows) {
    if (e.eligible) mine++;
    else if (e.screened) screened++;
    else if (e.verdict === 'FAIL') failed++;
    else unchecked++;
  }
  if (mine === rows.length && rows.length === candidates) return '';
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return [
    !candidates ? 'no candidates' : mine === candidates ? plural(candidates, 'candidate') : `${mine} of the ${plural(candidates, 'candidate')}`,
    unchecked ? `${unchecked} could not be checked` : null,
    screened ? `${screened} screened out` : null,
    failed ? `${failed} failed` : null,
  ].filter(Boolean).join(', ');
}

/**
 * The headline count. One function, because the search handler used to write its own version
 * straight into the element and undo everything this one says.
 */
function renderCount() {
  const c = document.getElementById('count');
  const shown = state.rows.length;
  // The materials the missing-data rule keeps as candidates. It was called "eligible", a word defined nowhere on screen.
  const candidates = state.selection.candidates.length;
  const tested = state.scenario.constraints.length > 0;
  // Nothing has been asked yet, so nothing has passed. Reading "102 shown PASS" on a blank screen
  // implies a test that never ran. SCREENED is named with the verdicts while its chip is on, as it adds rows too.
  const label = tested ? [...VERDICT_ORDER.filter((v) => state.showStates.has(v)),
    ...(screenedChipShown() && state.showScreened ? ['SCREENED'] : [])].join(' + ') : '';
  const held = state.searchExcluded.length;
  const parts = tested ? shownBreakdown(state.rows, candidates) : '';
  c.innerHTML = tested
    ? `${shown} shown <small>${esc(label)}${parts ? ` · ${esc(parts)}` : ''}</small>`
    : `${shown} material${shown === 1 ? '' : 's'} <small>no requirements set</small>`;
  c.innerHTML += (state.subset ? ` <small>from a selected region · <a href="#" id="clear-subset">clear</a></small>` : '')
    + (state.search ? ` <small>matching "${esc(state.search)}"${held ? `, plus ${held} listed below that your requirements exclude` : ''}</small>` : '');
  c.querySelector('#clear-subset')?.addEventListener('click', (e) => { e.preventDefault(); state.subset = null; render(); });
}

function render() {
  recompute();
  const { counts } = state.selection;
  const tested = state.scenario.constraints.length > 0;
  renderCount();

  // Nothing has been asked, so nothing has passed. A green "PASS 102" on a blank screen asserts a
  // test that never ran, so the chips stand down until there is something to report.
  document.getElementById('status-idle').hidden = tested;
  document.querySelector('.statusbar-label').hidden = !tested;
  for (const [id, verdict, n] of [['s-pass', 'PASS', counts.pass], ['s-unknown', 'UNKNOWN', counts.unknown], ['s-fail', 'FAIL', counts.fail]]) {
    const el = document.getElementById(id);
    el.hidden = !tested;
    const on = state.showStates.has(verdict);
    chipText(el, on, `${verdict} ${n}`);
    el.setAttribute('aria-pressed', String(on));
    const last = on && state.showStates.size === 1;
    el.disabled = n === 0 || last;
    const what = { PASS: 'that meet every requirement', UNKNOWN: 'that could not be checked for missing data', FAIL: 'that fail a requirement' }[verdict];
    el.title = n === 0 ? `No material is ${verdict} under the current requirements`
      : last ? `Showing the ${n} ${what}. At least one kind of result stays shown.`
      : on ? `Showing the ${n} ${what}. Click to hide them.`
           : `Click to show the ${n} ${what}.`;
  }
  const explore = state.scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION;
  // Shown in both modes, so a reader in the default mode learns estimates exist; under Confirmed only it is disabled
  // and says why, where it used to vanish.
  const estToggle = document.getElementById('est-toggle');
  const estBox = document.getElementById('use-estimates');
  estBox.checked = state.useEstimates;
  estBox.disabled = !explore;
  estToggle.dataset.disabled = String(!explore);
  document.getElementById('est-reason').hidden = explore;
  // How many it screened, under the switch where the reason sits under Confirmed only: beside it, the count pushed the
  // top bar onto a second row at laptop widths.
  const ruled = document.getElementById('est-ruled');
  ruled.textContent = explore && state.useEstimates && counts.screened ? `${counts.screened} screened` : '';
  ruled.hidden = !ruled.textContent;
  estBox.setAttribute('aria-describedby', explore ? 'est-ruled' : 'est-reason');
  // Screened materials are UNKNOWN, and they are counted there. This chip shows how many of those an
  // estimate held out, and brings them back; it never appears unless an estimate screened something.
  const scr = document.getElementById('s-screened');
  scr.hidden = !screenedChipShown();
  chipText(scr, state.showScreened, `SCREENED ${counts.screened}`);
  scr.setAttribute('aria-pressed', String(state.showScreened));
  scr.title = state.showScreened
    ? `Showing the ${counts.screened} materials an estimate or the base polymer's published behaviour screened out, among the UNKNOWN results. Click to hold them out again.`
    : `${counts.screened} of the UNKNOWN materials are held out because an estimate of a missing value clearly cannot meet a requirement, or the base polymer is published as attacked or dissolved where the material has no record of its own. Click to show them.`;

  document.getElementById('mode-strict').setAttribute('aria-pressed', String(state.scenario.unknownPolicy === 'strict'));
  document.getElementById('mode-explore').setAttribute('aria-pressed', String(state.scenario.unknownPolicy === 'exploration'));

  renderFilters(document.getElementById('filter-groups'), state, actions);
  // A refused seventh material is said once, until the next change.
  state.shortlistNotice = null;
  renderTray();
  renderLens();
  renderDrawerHost();
}

/**
 * A status chip's text, led by a box that is ticked while its results are shown. The chips are filters, and read as a
 * tally when their on and off states differed only by an outline.
 */
function chipText(el, on, text) {
  el.innerHTML = `<span class="chip-box" aria-hidden="true">${on ? '\u2611' : '\u2610'}</span> ${esc(text)}`;
}

function renderTray() {
  const tray = document.getElementById('tray');
  const list = state.scenario.shortlist;
  tray.hidden = list.length === 0;
  tray.querySelector('.label').textContent = `Shortlist ${list.length} of ${SHORTLIST_MAX}`;
  const notice = document.getElementById('tray-notice');
  notice.textContent = state.shortlistNotice ?? '';
  notice.hidden = !state.shortlistNotice;
  document.getElementById('pins').innerHTML = list.map((id) => {
    const m = state.db.materials.find((x) => x.id === id);
    return `<span class="pin">${esc(m?.name ?? id)}<button type="button" data-unpin="${esc(id)}" aria-label="Remove ${esc(m?.name ?? id)} from the shortlist">✕</button></span>`;
  }).join('');
  document.getElementById('pins').querySelectorAll('[data-unpin]')
    .forEach((b) => b.addEventListener('click', () => actions.togglePin(b.dataset.unpin)));
}

// ------------------------------------------------------------------ url state

let hashTimer = null;
function pushHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    history.replaceState(null, '', `#${toHash(state.scenario)}`);
  }, 250);
}

// ------------------------------------------------------------------ chrome

function wireChrome() {
  document.getElementById('search').addEventListener('input', (e) => {
    state.search = e.target.value; recompute(); renderCount(); renderLens();
  });
  // The buttons carry the names every sentence about the mode uses, from one place (labels.js).
  document.getElementById('mode-strict').textContent = POLICY_LABELS.strict;
  document.getElementById('mode-explore').textContent = POLICY_LABELS.exploration;
  // The label stays at every width, in a shorter form on a phone: without it the two buttons were an unlabelled pair.
  document.querySelector('.mode-label-long').textContent = POLICY_CONTROL;
  document.querySelector('.mode-label-short').textContent = POLICY_CONTROL_SHORT;
  document.getElementById('mode-strict').addEventListener('click', () => actions.setPolicy('strict'));
  document.getElementById('mode-explore').addEventListener('click', () => actions.setPolicy('exploration'));
  document.getElementById('btn-reset').addEventListener('click', () => actions.reset());
  for (const [id, verdict] of [['s-pass', 'PASS'], ['s-unknown', 'UNKNOWN'], ['s-fail', 'FAIL']]) {
    document.getElementById(id).addEventListener('click', () => actions.toggleState(verdict));
  }
  document.getElementById('s-screened').addEventListener('click', () => actions.toggleScreened());
  document.getElementById('btn-clear-pins').addEventListener('click', () => {
    state.scenario.shortlist = []; render(); pushHash();
  });
  // The first stop for a keyboard: past the top bar and the filters, straight to what they produced. The results take
  // focus themselves; following the link's #lens would have been read as a scenario link.
  document.getElementById('skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('lens').focus();
  });
  initPopover(actions);

  // The filter rail becomes a drawer on a narrow window or at high zoom. It used to become a fixed
  // overlay with no way to close it, covering the results it was meant to filter.
  const main = document.getElementById('main');
  const railButton = document.getElementById('btn-filters');
  const setRail = (open) => {
    main.dataset.railOpen = String(open);
    railButton.setAttribute('aria-expanded', String(open));
    // The close button, not the first button in the header: that is Clear requirements, and Enter on it wiped the
    // question the moment the drawer opened.
    if (open) document.getElementById('btn-rail-close').focus();
    else railButton.focus();
  };
  railButton.addEventListener('click', () => setRail(main.dataset.railOpen !== 'true'));
  document.getElementById('btn-rail-close').addEventListener('click', () => setRail(false));
  document.getElementById('rail-backdrop').addEventListener('click', () => setRail(false));
  document.querySelectorAll('[data-lens]').forEach((b) => b.addEventListener('click', () => setLens(b.dataset.lens)));

  // Two states, and the button says what pressing it does, in the same words on screen and to a screen reader. It used
  // to be an unlabelled half-moon cycling dark, light and follow-the-system, and then read "Dark" while its accessible
  // name said "Switch to the light theme".
  document.getElementById('btn-theme').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('h2c-theme', next); } catch { /* private mode */ }
    paintTheme();
    renderLens();
  });

  document.getElementById('use-estimates').addEventListener('change', (e) => actions.toggleEstimates(e.target.checked));
  document.getElementById('btn-scenario').addEventListener('click', () => actions.openScenario());

  // The backdrop under a full-screen drawer is the host's own ::before (app.css), so a press on it lands on the host.
  document.getElementById('drawer-host').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && state.panel) actions.closeDrawer();
  });
  narrowScreen.addEventListener('change', syncDrawerModal);
  // A table that fits keeps its column headings sticky; one that does not scrolls sideways in its box (format.js).
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { markTableOverflow(document); keepLensTabInView(); }, 100);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.panel) { actions.closeDrawer(); return; }
      if (main.dataset.railOpen === 'true') { setRail(false); return; }
    }
    // Inside a modal drawer Tab cycles through the drawer. An open explanation keeps its own Tab handling (popover.js),
    // which may already have moved focus back to its mark; the cycle then carries on from there.
    const drawer = e.key === 'Tab' && document.querySelector('#drawer-host .drawer[aria-modal="true"]');
    if (drawer && !(popoverOpen() && document.getElementById('explain-popover').contains(document.activeElement))) {
      const items = focusablesIn(drawer);
      if (items.length) {
        const first = items[0], last = items[items.length - 1];
        const at = document.activeElement;
        if (!drawer.contains(at)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
        else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
      }
    }
    const typing = e.target.closest?.('input, select, textarea, [contenteditable="true"]');
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('search').focus(); }
  });
}

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
};

/**
 * The theme button says what pressing it does. Where the top bar has room it says so in words; narrower, it is a sun
 * or a moon, the theme it switches to, and keeps the same words as its accessible name and title.
 */
function paintTheme() {
  const b = document.getElementById('btn-theme');
  const words = isDark() ? 'Switch to light theme' : 'Switch to dark theme';
  b.querySelector('.btn-text').textContent = words;
  b.setAttribute('aria-label', words);
  b.title = words;
  // SVG elements have no hidden property; the attribute is what the stylesheet reads.
  b.querySelector('.theme-sun').toggleAttribute('hidden', !isDark());
  b.querySelector('.theme-moon').toggleAttribute('hidden', isDark());
}

function setLens(lens) {
  state.lens = lens;
  state.scenario.lens = lens;
  pushHash();
  markLens();
  renderLens();
  scrollLensToTop();
}

/**
 * Which view is on, and one line saying what it is for. "Ashby", "Parallel" and "Coverage" explained themselves only
 * in a title; the tab's title is that line's single source.
 */
function markLens() {
  document.querySelectorAll('[data-lens]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lens === state.lens)));
  document.getElementById('lens-help').textContent = document.querySelector(`[data-lens="${state.lens}"]`)?.title ?? '';
  keepLensTabInView();
}

/** On a phone the view tabs are one strip that scrolls sideways; the active one is kept in sight. */
function keepLensTabInView() {
  const active = document.querySelector('.lens-bar [data-lens][aria-pressed="true"]');
  if (active) keepInView(active.parentElement, active);
}

/**
 * Every lens draws into one scroll container, and replacing its content kept the old scroll position: a table read
 * halfway down opened the Ashby chart 250 px down with its axis controls out of sight. A new view, a template or a
 * loaded scenario starts at the top. Re-renders that only change data (a chip, a sort, a filter edit, typing in the
 * search) keep the reader's place.
 */
function scrollLensToTop() {
  const lens = document.getElementById('lens');
  lens.scrollTop = 0;
  // Below 600 px the page scrolls as a whole rather than inside the view (app.css), so the page goes back to the top.
  if (getComputedStyle(lens).overflowY === 'visible' && window.scrollY > 0) window.scrollTo(0, 0);
}

function renderScenario(host) {
  const { db, scenario, selection } = state;
  const hard = scenario.constraints.filter((c) => c.mandatory !== false).length;
  const soft = scenario.constraints.length - hard;
  const tested = scenario.constraints.length > 0;
  const localFile = location.protocol === 'file:';

  // Leads with what you are doing and what you can do with it. The build and snapshot numbers are
  // real provenance and belong in the file, but nobody opens this panel to read them first.
  host.innerHTML = `<div class="drawer" role="dialog" aria-label="Save or share this selection">
    <div class="drawer-head"><div style="display:flex;gap:10px"><div style="flex:1">
      <h2>This selection</h2>
      <div class="sub">Save it, share it, or start from a different kind of part</div></div>
      <button class="icon-btn" id="sc-close" aria-label="Close">\u2715</button></div></div>
    <div class="drawer-tabs"></div>
    <div class="drawer-body">

      <div class="sc-summary">
        ${tested
          ? `<div class="sc-big">${selection.counts.pass}<span>of ${selection.counts.total} materials pass</span></div>`
          : `<div class="sc-big">${selection.counts.total}<span>materials, nothing tested yet</span></div>`}
        <div class="sc-lines">
          <div>${hard} requirement${hard === 1 ? '' : 's'}${soft ? `, ${soft} tracked only` : ''}</div>
          <div>${POLICY_CONTROL}: ${policyLabel(scenario.unknownPolicy)}</div>
          ${scenario.unknownPolicy === UNKNOWN_POLICY.EXPLORATION ? `<div>Estimates and polymer data: ${state.useEstimates ? 'on (never pass; may screen out)' : 'off'}</div>` : ''}
          ${scenario.shortlist.length ? `<div>${scenario.shortlist.length} shortlisted</div>` : ''}
          ${scenario.assumptions.length ? `<div class="warn">${scenario.assumptions.length} assumption${scenario.assumptions.length === 1 ? '' : 's'} in play</div>` : ''}
        </div>
      </div>

      <h3 class="sec">Take it with you</h3>
      <div class="sc-actions">
        <button class="btn" id="sc-csv"><b>Export the rows on screen</b><span>CSV in the table's order, with the requirements, each row's result and the reasons for it</span></button>
        <button class="btn" id="sc-link"><b>Copy a link to this selection</b><span>${localFile
          ? 'Reopens the requirements, shortlist and view on this computer. The page is a local file, so the link will not work for anyone else: send them the saved scenario instead.'
          : 'Reopens the requirements, shortlist, assumptions and view. Search text and a lasso selection are not included.'}</span></button>
        <button class="btn" id="sc-json"><b>Save the scenario</b><span>A small file anyone with this tool can load</span></button>
        <button class="btn" id="sc-import"><b>Load a saved scenario</b><span>Replaces the current selection. A damaged file is refused and nothing changes.</span></button>
      </div>

      <h3 class="sec">Start from a different kind of part</h3>
      <div class="sc-actions">
        ${TEMPLATES.map((t, i) => `<button class="btn" data-template="${i}">
          <b>${esc(t.name)}</b><span>${esc(t.description)}</span></button>`).join('')}
      </div>

      <h3 class="sec">What this tool is for</h3>
      <div class="note">Screening, comparison and evidence navigation. Not certified design
        allowables, not a substitute for reading the exact grade's technical and safety data sheets,
        and not a guarantee that any third-party filament runs on an H2C. Verify the grade before
        you buy or print.</div>

      <h3 class="sec">About this build</h3>
      <dl class="kv small">
        <dt>Database snapshot</dt><dd>${esc(db.meta.snapshot)}</dd>
        <dt>Application build</dt><dd>${esc(db.meta.build)}</dd>
        <dt>Materials</dt><dd>${candidateCount(db)}, ${db.meta.counts.h2cRelevant} of them in H2C scope; plus ${db.meta.counts.familyEntries} family names that are never candidates</dd>
        <dt>Measurements</dt><dd>${db.meta.counts.measurements}, of which ${db.meta.counts.numericMeasurements} numeric</dd>
        <dt>Sources</dt><dd>${db.meta.counts.sources}</dd>
      </dl>
    </div></div>`;

  host.querySelector('#sc-close').addEventListener('click', () => actions.closeDrawer());
  host.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => {
    actions.applyTemplate(TEMPLATES[Number(b.dataset.template)]);
  }));
  host.querySelector('#sc-csv').addEventListener('click', () =>
    download(`h2c-candidates-${db.meta.snapshot}.csv`,
      toCSV(sortRows(state.rows, state), db.meta, { scenario, useEstimates: state.ctx.showEstimates }), 'text/csv'));
  host.querySelector('#sc-json').addEventListener('click', () =>
    download(`h2c-scenario-${new Date().toISOString().slice(0, 10)}.json`, serialize(scenario), 'application/json'));
  host.querySelector('#sc-link').addEventListener('click', async (e) => {
    // location.origin is the string "null" for a file, which made every local link unusable.
    const url = `${location.href.split('#')[0]}#${toHash(scenario)}`;
    try { await navigator.clipboard.writeText(url); e.target.closest('button').querySelector('span').textContent = 'Copied'; }
    catch { prompt('Copy this link', url); }
  });
  host.querySelector('#sc-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      // Validate completely before committing anything, so a bad file leaves the session intact.
      let loaded;
      try {
        loaded = deserialize(await file.text(), db.meta, { materialIds: materialIds(), headlineKeys: headlineKeys() });
      } catch (err) {
        alert(`Could not load that scenario, and nothing was changed.\n\n${err.message}`);
        return;
      }
      hydrate(loaded.scenario);
      markLens();
      render(); pushHash();
      scrollLensToTop();
      if (loaded.warnings.length) alert(loaded.warnings.join('\n'));
    });
    input.click();
  });
}

// ------------------------------------------------------------------ start

(async function start() {
  try { const t = localStorage.getItem('h2c-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }

  const { db, reference } = await loadData();
  state.db = db;
  state.reference = reference;
  state.ctx = buildContext(db);
  setEnvironmentLabels(db.meta.environmentCategories);
  useRegistry(db.registry);
  let linkProblem = null;
  let fromLink = null;
  try {
    fromLink = fromHash(location.hash.slice(1), db.meta, { materialIds: materialIds(), headlineKeys: headlineKeys() });
  } catch (err) {
    linkProblem = err.message;
  }
  hydrate(fromLink?.scenario ?? newScenario(db.meta));

  // Provenance matters, but not more than everything else in the top bar. The full record is in
  // the Scenario panel, which already carried it.
  const meta = document.getElementById('meta');
  meta.textContent = `data ${db.meta.snapshot}`;
  meta.title = `Database snapshot ${db.meta.snapshot}, application build ${db.meta.build}, `
    + `${candidateCount(db)} materials, ${db.meta.counts.measurements} measurements. `
    + 'Open Save / share for the full record.';

  wireChrome();
  paintTheme();
  markLens();
  render();
  if (state.lens !== 'table') setLens(state.lens);
  const notices = [
    ...(linkProblem ? [`This link could not be read, so the selector opened with nothing set. ${linkProblem}`] : []),
    ...(fromLink?.warnings ?? []),
  ];
  if (notices.length) setTimeout(() => alert(notices.join('\n\n')), 0);

  // A link pasted into an open tab changes only the fragment, which reloads nothing: without this the old selection
  // stayed on screen (audit 2026-09-15, A-07). The page's own replaceState writes fire no hashchange.
  window.addEventListener('hashchange', () => {
    const hash = location.hash.slice(1);
    if (hash === toHash(state.scenario)) return;
    let next;
    try {
      next = fromHash(hash, db.meta, { materialIds: materialIds(), headlineKeys: headlineKeys() });
    } catch (err) {
      alert(`This link could not be read, and nothing was changed.\n\n${err.message}`);
      return;
    }
    hydrate(next?.scenario ?? newScenario(db.meta));
    markLens();
    render();
    if (state.lens !== 'table') setLens(state.lens);
    scrollLensToTop();
    if (next?.warnings.length) setTimeout(() => alert(next.warnings.join('\n\n')), 0);
  });
})().catch((err) => {
  document.getElementById('lens').innerHTML =
    `<div class="empty"><h3>Could not start</h3><p>${esc(err.message)}</p></div>`;
  console.error(err);
});
