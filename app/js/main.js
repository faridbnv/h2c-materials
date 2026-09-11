// Bootstrap and state.
//
// One candidate set drives every lens. The engine is pure and lives under engine/; nothing in
// ui/ is imported from there.

import { runSelection, UNKNOWN_POLICY, normalizePolicy } from './engine/constraints.js';
import { newScenario, toHash, fromHash, serialize, deserialize, applyAssumptions } from './engine/scenario.js';
import { renderFilters } from './ui/filters.js';
import { renderTable, toCSV, download } from './ui/table.js';
import { renderAshby } from './ui/ashby.js';
import { renderParallel } from './ui/parallel.js';
import { renderCoverage } from './ui/heatmap.js';
import { renderCompare } from './ui/compare.js';
import { renderDrawer } from './ui/detail.js';
import { renderExclusions } from './ui/explain.js';
import { esc } from './ui/format.js';
import { TEMPLATES } from './ui/templates.js';

const state = {
  db: null, reference: null, scenario: null, ctx: null,
  lens: 'table', search: '', sort: { key: 'name', dir: 'asc' },
  selectedMaterialId: null, drawerTab: 'Overview',
  selection: null, rows: [], subset: null,
};

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
    coverageByMaterial: group(db.coverage, 'materialId'),
    unknownPolicy: UNKNOWN_POLICY.STRICT,
  };
}

function recompute() {
  const { db, scenario } = state;
  scenario.unknownPolicy = normalizePolicy(scenario.unknownPolicy);
  state.ctx.unknownPolicy = scenario.unknownPolicy;

  // Assumptions are scenario data. The database object is never mutated.
  const materials = scenario.assumptions.length
    ? db.materials.map((m) => applyAssumptions(m, scenario.assumptions).material)
    : db.materials;

  state.selection = runSelection(materials, scenario.constraints, state.ctx);

  const q = state.search.trim().toLowerCase();
  const byId = new Map(materials.map((m) => [m.id, m]));
  state.rows = state.selection.candidates
    .map((e) => ({ material: byId.get(e.materialId), evaluation: e }))
    .filter(({ material: m }) => {
      if (state.subset && !state.subset.includes(m.id)) return false;
      if (!q) return true;
      return [m.name, m.family, m.fullName, m.basePolymer, m.abbreviation, ...m.gradeIds]
        .filter(Boolean).some((s) => String(s).toLowerCase().includes(q));
    });
}

// ------------------------------------------------------------------ actions

const actions = {
  changed() { state.subset = null; render(); pushHash(); },
  sort(key) {
    state.sort = state.sort.key === key
      ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'name' || key === 'family' ? 'asc' : 'desc' };
    renderLens();
  },
  togglePin(id) {
    const s = state.scenario.shortlist;
    const i = s.indexOf(id);
    if (i >= 0) s.splice(i, 1);
    else if (s.length < 6) s.push(id);
    else return alert('The shortlist holds at most six materials. Remove one first.');
    render(); pushHash();
  },
  openMaterial(id) { state.selectedMaterialId = id; state.drawerTab = 'Overview'; renderDrawerHost(); },
  setDrawerTab(tab) { state.drawerTab = tab; renderDrawerHost(); },
  closeDrawer() { state.selectedMaterialId = null; renderDrawerHost(); },
  openMeasurement(id) {
    const m = state.db.measurements.find((x) => x.id === id);
    if (!m) return;
    state.selectedMaterialId = m.materialId;
    state.drawerTab = 'Evidence';
    renderDrawerHost();
  },
  setPolicy(p) { state.scenario.unknownPolicy = normalizePolicy(p); render(); pushHash(); },
  setPlot(patch) { Object.assign(state.scenario.plot, patch); renderLens(); pushHash(); },
  selectSubset(ids) { state.subset = ids; render(); },
  relax(constraint) {
    state.scenario.constraints = state.scenario.constraints.filter((c) => c !== constraint);
    render(); pushHash();
  },
};

// ------------------------------------------------------------------ rendering

function renderLens() {
  const host = document.getElementById('lens');
  switch (state.lens) {
    case 'table': return renderTable(host, state, actions);
    case 'ashby': return renderAshby(host, state, actions);
    case 'parallel': return renderParallel(host, state, actions);
    case 'coverage': return renderCoverage(host, state, actions);
    case 'compare': return renderCompare(host, state, actions);
    case 'explain': return renderExclusions(host, state, actions);
  }
}

function renderDrawerHost() {
  renderDrawer(document.getElementById('drawer-host'), state, actions);
}

function render() {
  recompute();
  const { counts } = state.selection;
  const c = document.getElementById('count');
  const shown = state.rows.length;
  c.innerHTML = `${shown} candidate${shown === 1 ? '' : 's'}`
    + (state.subset ? ` <small>from a selected region · <a href="#" id="clear-subset">clear</a></small>` : '')
    + (state.search ? ` <small>matching "${esc(state.search)}"</small>` : '');
  c.querySelector('#clear-subset')?.addEventListener('click', (e) => { e.preventDefault(); state.subset = null; render(); });

  document.getElementById('s-pass').textContent = `PASS ${counts.pass}`;
  document.getElementById('s-unknown').textContent = `UNKNOWN ${counts.unknown}`;
  document.getElementById('s-fail').textContent = `FAIL ${counts.fail}`;
  document.getElementById('policy-note').textContent = state.scenario.unknownPolicy === 'strict'
    ? 'Strict: unresolved criteria hold a candidate out'
    : 'Explore: unresolved candidates stay visible, flagged';

  document.getElementById('mode-strict').setAttribute('aria-pressed', String(state.scenario.unknownPolicy === 'strict'));
  document.getElementById('mode-explore').setAttribute('aria-pressed', String(state.scenario.unknownPolicy === 'exploration'));

  // Parallel is disabled with a reason rather than enabled and unreadable.
  const pbtn = document.querySelector('[data-lens="parallel"]');
  pbtn.disabled = shown > 30;
  pbtn.title = shown > 30 ? `Parallel coordinates needs 30 or fewer, you have ${shown}` : '';

  renderFilters(document.getElementById('filter-groups'), state, actions);
  renderTray();
  renderLens();
  renderDrawerHost();
}

function renderTray() {
  const tray = document.getElementById('tray');
  const list = state.scenario.shortlist;
  tray.hidden = list.length === 0;
  document.getElementById('pins').innerHTML = list.map((id) => {
    const m = state.db.materials.find((x) => x.id === id);
    return `<span class="pin">${esc(m?.name ?? id)}<button data-unpin="${esc(id)}" aria-label="Remove ${esc(m?.name ?? id)}">✕</button></span>`;
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
    state.search = e.target.value; recompute(); renderLens();
    document.getElementById('count').textContent = `${state.rows.length} candidate${state.rows.length === 1 ? '' : 's'}`;
  });
  document.getElementById('mode-strict').addEventListener('click', () => actions.setPolicy('strict'));
  document.getElementById('mode-explore').addEventListener('click', () => actions.setPolicy('exploration'));
  document.getElementById('btn-reset').addEventListener('click', () => {
    state.scenario.constraints = []; state.scenario.template = null; actions.changed();
  });
  document.getElementById('btn-explain').addEventListener('click', () => setLens('explain'));
  document.getElementById('btn-compare').addEventListener('click', () => setLens('compare'));
  document.getElementById('btn-clear-pins').addEventListener('click', () => {
    state.scenario.shortlist = []; render(); pushHash();
  });
  document.querySelectorAll('[data-lens]').forEach((b) => b.addEventListener('click', () => setLens(b.dataset.lens)));

  document.getElementById('btn-theme').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
    if (next) document.documentElement.dataset.theme = next;
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('h2c-theme', next); } catch { /* private mode */ }
    renderLens();
  });

  document.getElementById('btn-scenario').addEventListener('click', openScenario);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedMaterialId) actions.closeDrawer();
    if (e.key === '/' && e.target.tagName !== 'INPUT') { e.preventDefault(); document.getElementById('search').focus(); }
  });
}

function setLens(lens) {
  state.lens = lens;
  state.scenario.lens = lens;
  pushHash();
  document.querySelectorAll('[data-lens]').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.lens === lens)));
  renderLens();
}

function openScenario() {
  const { db, scenario } = state;
  const host = document.getElementById('drawer-host');
  host.innerHTML = `<div class="drawer" role="dialog" aria-label="Scenario">
    <div class="drawer-head"><div style="display:flex;gap:10px"><div style="flex:1">
      <h2>Scenario</h2><div class="sub">Everything needed to reproduce this result</div></div>
      <button class="icon-btn" id="sc-close" aria-label="Close">✕</button></div></div>
    <div class="drawer-tabs"></div>
    <div class="drawer-body">
      <dl class="kv">
        <dt>Database snapshot</dt><dd>${esc(db.meta.snapshot)}</dd>
        <dt>Application build</dt><dd>${esc(db.meta.build)}</dd>
        <dt>Materials</dt><dd>${db.meta.counts.materials} canonical, ${db.meta.counts.h2cRelevant} in H2C scope</dd>
        <dt>Measurements</dt><dd>${db.meta.counts.measurements}, of which ${db.meta.counts.numericMeasurements} numeric</dd>
        <dt>Constraints</dt><dd>${scenario.constraints.length}</dd>
        <dt>Unknown-data mode</dt><dd>${esc(scenario.unknownPolicy)}</dd>
        <dt>Assumptions</dt><dd>${scenario.assumptions.length}</dd>
        <dt>Shortlist</dt><dd>${scenario.shortlist.length}</dd>
      </dl>
      <h3 class="sec">Application templates</h3>
      <p style="font-size:13px;color:var(--ink-2)">A template pre-populates controls and then gets out of the way.
      Every control it sets stays individually editable.</p>
      <div style="display:grid;gap:7px">
        ${TEMPLATES.map((t, i) => `<button class="btn" data-template="${i}" style="text-align:left">
          <strong>${esc(t.name)}</strong><br><span style="font-size:12px;color:var(--ink-2)">${esc(t.description)}</span></button>`).join('')}
      </div>
      <h3 class="sec">Export</h3>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn" id="sc-csv">Candidates as CSV</button>
        <button class="btn" id="sc-json">Scenario as JSON</button>
        <button class="btn" id="sc-import">Import scenario</button>
      </div>
      <h3 class="sec">Limits of this tool</h3>
      <div class="note">Decision support, screening and evidence navigation. Not certified design
      allowables, not a substitute for exact-grade TDS and SDS review, and not a guarantee of H2C
      compatibility for any third-party formulation. Verify the grade before you buy or print.</div>
    </div></div>`;

  host.querySelector('#sc-close').addEventListener('click', () => { host.innerHTML = ''; });
  host.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => {
    const t = TEMPLATES[Number(b.dataset.template)];
    state.scenario.constraints = t.constraints.map((c) => ({ ...c }));
    state.scenario.template = t.name;
    host.innerHTML = '';
    actions.changed();
  }));
  host.querySelector('#sc-csv').addEventListener('click', () =>
    download(`h2c-candidates-${db.meta.snapshot}.csv`, toCSV(state.rows, db.meta), 'text/csv'));
  host.querySelector('#sc-json').addEventListener('click', () =>
    download(`h2c-scenario-${new Date().toISOString().slice(0, 10)}.json`, serialize(state.scenario), 'application/json'));
  host.querySelector('#sc-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { scenario, warnings } = deserialize(await file.text(), db.meta);
        state.scenario = scenario;
        if (warnings.length) alert(warnings.join('\n'));
        host.innerHTML = '';
        actions.changed();
      } catch (err) { alert(`Could not read that scenario: ${err.message}`); }
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
  state.scenario = fromHash(location.hash.slice(1), db.meta) ?? newScenario(db.meta);

  document.getElementById('meta').textContent =
    `snapshot ${db.meta.snapshot} · build ${db.meta.build} · ${db.meta.counts.materials} materials · ${db.meta.counts.measurements} measurements`;

  wireChrome();
  render();
  if (state.scenario.lens && state.scenario.lens !== 'table') setLens(state.scenario.lens);
})().catch((err) => {
  document.getElementById('lens').innerHTML =
    `<div class="empty"><h3>Could not start</h3><p>${esc(err.message)}</p></div>`;
  console.error(err);
});
