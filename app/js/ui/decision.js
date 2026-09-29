// The Ashby decision workspace's own views (D107): Decision products and Material overview.
//
// Everything here reads one model, buildWorkspace (engine/workspace.js): the marks, the line and its count, the result
// list, the inspector and the exported data. A mark is one product in the state its answer is in; its coordinates, its
// index and its rank all come from that state. Context (failed and unresolved products, estimates, references) is a
// layer of its own, off until asked for, counted apart and never ranked, counted on a line or put on a front.

import { indexById, INDICES, selectionLine, PRICE_CAVEAT } from '../engine/indices.js';
import { buildWorkspace, estimateContext, judgedProducts, axisValue, axisInfo, COST_AXIS, DERIVED_AXES, goalAxes } from '../engine/workspace.js';
import { buildFamilyColors, esc, fmtNumber, fmtRange, chip } from './format.js';
import { AXIS_DEFS } from './axes.js';
import { prop, describeConstraint, ESTIMATE_PRECISION, ESTIMATE_STRENGTH } from './labels.js';
import { asksPrintable } from './templates.js';
import {
  chartFit, wireResize, placeLabels, axisRange, hexToRgba, requirementOverlay, anchorRequirementLabels, referenceOverlay,
  anchorTrace, chartTheme, spans, NO_LABEL, LABEL_FONT, PLOT_MARGIN_TOP, errorBars,
} from './chart.js';

// ------------------------------------------------------------------ words

const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
const states = (n) => plural(n, 'product state');
const materials = (n) => plural(n, 'material');
/** The formula in a reader's symbols: E^(1/2) / ρ, σ / (Cm × ρ). */
export const formulaText = (index) => index.formula.replace(/rho/g, 'ρ').replace(/sigma/g, 'σ').replace(/ x /g, ' × ');
const sig = (v) => (Number.isFinite(v) ? (Math.abs(v) < 1e-3 && v !== 0 ? v.toExponential(2) : Number(v.toPrecision(3)).toString()) : '—');
/** M as the line's box shows it: four significant figures, in exponent form when it is tiny (a cost index). */
const mText = (v) => (Math.abs(v) < 1e-3 ? v.toExponential(3) : String(Number(v.toPrecision(4))));
const scheduleWords = (t) => `at ${t?.tempC != null ? `${fmtNumber(t.tempC)} °C` : 'a temperature its sheet does not state'} for ${t?.hours != null ? `${fmtNumber(t.hours)} h` : 'a time its sheet does not state'}`;
/** A product state in words: "annealed at 120 °C for 16 h, dry", "as printed, conditioned". */
export const stateWords = (s) => `${s?.treatment ? `annealed ${scheduleWords(s.treatment)}` : 'as printed'}, ${s?.moisture === 'conditioned' ? 'conditioned' : 'dry'}`;

/** An axis's definition: the registry's, or the derived cost axis. */
export function axisDef(key) {
  if (DERIVED_AXES[key]) {
    const d = DERIVED_AXES[key];
    return { key, label: d.label, unit: d.unit, better: d.better, derived: true, plain: d.label, measurement: null, changes: { moisture: false, annealing: false } };
  }
  const a = AXIS_DEFS.find((x) => x.key === key) ?? AXIS_DEFS[0];
  return { ...a, plain: prop(a.key).plain };
}
const axisTitle = (d) => `${d.plain} (${d.unit})`;
const valueText = (v, d) => (v === null || v === undefined ? '—' : `${fmtNumber(v)} ${d.unit}`);

/** Why a product state has no coordinate on an axis, in words. */
function missingWords(m, def) {
  const what = def.plain.toLowerCase();
  if (m.reason === 'unpriced') return 'no current Canadian price of its own (a twin\'s is never read)';
  if (m.reason === 'other-state') {
    const e = m.elsewhere?.[0];
    return `${what} is published only ${e ? stateWords(e) : 'in another state'}${e?.measurementId ? ` (${e.measurementId})` : ''}; nothing is read across states`;
  }
  if (m.reason === 'not-comparable') return `${what} is published without its test direction or load, so it is not compared`;
  if (m.reason === 'not-applicable') return `${what} does not apply to it`;
  return `no comparable ${what} published in this state`;
}

// ------------------------------------------------------------------ the model for the page's state

/** The workspace the page's current state asks for. */
export function workspaceFor(state) {
  const p = state.scenario.plot;
  const index = state.scenario.rankBy ? indexById(state.scenario.rankBy) : null;
  return buildWorkspace({
    rows: state.rows, contextRows: state.examined ?? state.rows, ctx: state.ctx,
    xKey: p.x, yKey: p.y, xLog: !!p.xLog, yLog: !!p.yLog, index, lineM: p.indexM ?? null,
    stage: state.stage ?? null, population: p.population ?? 'confirmed', tested: state.scenario.constraints.length > 0,
  });
}

/** How many product states and materials publish each axis, for the axis picker: counted as the decision set is. */
export function axisCoverage(state, keys) {
  const { products } = judgedProducts(state.rows, state.ctx);
  const confirmed = products.filter((j) => j.verdict === 'PASS');
  const out = new Map();
  for (const key of keys) {
    const has = confirmed.filter((j) => axisValue(j, key, state.ctx).value !== null);
    out.set(key, { states: has.length, materials: new Set(has.map((j) => j.material.id)).size });
  }
  return out;
}

// ------------------------------------------------------------------ the question strip and stages

/** What is being asked, as one strip above the chart: the goal, the H2C gates, the state, the requirements, the release. */
export function questionStrip(state, ws) {
  const { scenario, db } = state;
  const cs = scenario.constraints;
  const index = ws.objective.index;
  const tested = cs.length > 0;
  const printable = asksPrintable(cs);
  const scoped = cs.some((c) => c.kind === 'gate' && c.gate === 'scope');
  const hard = cs.filter((c) => c.mandatory !== false && !(c.kind === 'gate' && ['nozzle', 'bed', 'chamber', 'scope'].includes(c.gate)));
  const judged = `${scenario.anneal ? `as printed, or annealed at its sheet's schedule${scenario.annealMaxC ? ` up to ${fmtNumber(scenario.annealMaxC)} °C` : ''}` : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned by moisture' : 'dry'}`;
  const goalOption = (i) => `<option value="${esc(i.id)}" ${index?.id === i.id ? 'selected' : ''}>${esc(i.designCase)}</option>`;
  const stage = state.stage;
  const before = stage?.before ?? { products: ws.counts.confirmed.products, materials: new Set(ws.pairs.filter((p) => p.bucket === 'confirmed').map((p) => p.materialId)).size };
  return `<section class="ws-question" aria-label="The question">
    <div class="ws-goal-row">
      <label class="ws-label" for="ws-goal">Goal</label>
      <select id="ws-goal" data-goal data-focus="goal">
        <option value="">Compare two properties (fixed geometry, no index)</option>
        <optgroup label="Lightest part that does the job">${INDICES.filter((i) => !i.costForm).map(goalOption).join('')}</optgroup>
        <optgroup label="Lowest material cost">${INDICES.filter((i) => i.costForm).map(goalOption).join('')}</optgroup>
      </select>
      ${index ? `<span class="ws-formula" title="${esc(index.geometry.sentence)} ${esc(index.geometry.free)}.">Maximise <span class="formula">M = ${esc(formulaText(index))}</span></span>
        <span class="ws-geom">${esc(index.geometry.free)}${index.strengthProxy ? '; strength is a proxy: the recorded tensile strength, its endpoint as each sheet states it' : ''}</span>` : ''}
    </div>
    <ul class="ws-facts">
      <li>${printable ? `<b>H2C ${scoped ? 'scope and ' : ''}print gates asked</b>` : `<b class="warn-text">Research mode</b>: printability not checked <button type="button" class="btn btn-sm" data-act="printable">Check printability</button>`}</li>
      <li>Judged <b>${esc(judged)}</b></li>
      <li>${tested ? `${esc(hard.map(describeConstraint).join('; ') || 'no other requirement')}` : '<b>No requirement asked yet</b>'}
        <button type="button" class="link-btn" data-edit-req data-focus="edit-req">Edit requirements</button></li>
      <li class="ws-release" title="The release every answer here was computed on: data, rules and engine (D96)">Release ${esc(db.meta.release?.id ?? 'unidentified')}</li>
    </ul>
    <ol class="ws-stages" aria-label="Selection stages">
      <li title="${tested ? 'Product states that meet every requirement, in a state the question permits, and their materials' : 'Nothing is confirmed until a requirement is asked'}"><span class="ws-stage-name">${tested ? 'Requirements' : 'Nothing screened'}</span>
        <span><b>${states(before.products)}</b>, <b>${materials(before.materials)}</b>${tested ? '' : ', none confirmed'}</span></li>
      ${(stage?.steps ?? []).map((st, i) => {
        const idx = indexById(st.index);
        return `<li><span class="ws-stage-name">Kept</span> <span><span class="formula">${esc(formulaText(idx))} ≥ ${sig(st.cutoff)}</span>
          <span class="fine" title="${esc(idx.designCase)}">(${esc(idx.geometry.member)} ${esc(idx.geometry.constraint)})</span>: <b>${states(st.products)}</b>, <b>${materials(st.materials)}</b>${st.lacking ? ` <span class="fine">(${st.lacking} lacked an input)</span>` : ''}</span>
          <button type="button" class="btn btn-sm" data-remove-stage="${i}" data-focus="remove-stage-${i}" title="Remove this stage: the product states it set aside return, and the ranking uses them again">Remove</button></li>`;
      }).join('')}
    </ol>
  </section>`;
}

// Small drawings of what each index models: a tie pulled along its length, a beam bent between supports, a panel.
const SKETCH = {
  tie: '<svg viewBox="0 0 64 24" aria-hidden="true"><rect x="14" y="9" width="36" height="6" rx="1"/><path d="M13 12H3M7 8l-4 4 4 4M51 12h10M57 8l4 4-4 4" fill="none" stroke-width="1.6"/></svg>',
  beam: '<svg viewBox="0 0 64 24" aria-hidden="true"><rect x="6" y="10" width="52" height="5" rx="1"/><path d="M8 15l-4 6h8zM56 15l-4 6h8z"/><path d="M32 1v7M29 5l3 3 3-3" fill="none" stroke-width="1.6"/></svg>',
  panel: '<svg viewBox="0 0 64 24" aria-hidden="true"><path d="M6 16l14-8h38l-14 8z" fill-opacity=".35"/><path d="M6 16v3h38l14-8V8" fill="none" stroke-width="1.2"/><path d="M36 1v7M33 5l3 3 3-3" fill="none" stroke-width="1.6"/></svg>',
};

/** The first step of a new exercise: what the part does, with the H2C's requirements proposed and said to be so. */
export function starter(state) {
  const card = (title, help, ids) => `<div class="ws-start-card"><h3>${esc(title)}</h3><p>${esc(help)}</p>
    <div class="ws-start-members">${ids.map((id) => {
      const i = indexById(id);
      return `<button type="button" class="ws-member" data-start-goal="${esc(id)}" title="${esc(i.geometry.sentence)}">
        <span class="ws-sketch">${SKETCH[i.geometry.member]}</span><span class="ws-member-name">${esc(i.geometry.member.charAt(0).toUpperCase() + i.geometry.member.slice(1))}</span>
        <span class="ws-member-free">${esc(i.geometry.free)}</span></button>`;
    }).join('')}</div></div>`;
  return `<section class="ws-start" aria-label="Start an Ashby selection">
    <h2>What must the part do?</h2>
    <p>Choose the member and what is prescribed. The chart then draws each product that can do it, in the state it would be used in, with the line that ranks them.</p>
    <label class="toggle ws-start-gates"><input type="checkbox" data-start-gates checked>
      <span>Ask the H2C's requirements too: in scope, and printable (nozzle, bed and chamber)</span></label>
    <div class="ws-start-grid">
      ${card('Lightest stiff part', 'Stiffness prescribed, mass minimised.', ['tie-stiffness', 'beam-stiffness', 'panel-stiffness'])}
      ${card('Lightest strength-limited part', 'Strength prescribed, mass minimised. The recorded strength is a proxy: tensile, its endpoint as each sheet states it.', ['tie-strength', 'beam-strength', 'panel-strength'])}
      ${card('Lowest material cost', 'Material cost per volume: each product\'s own Canadian price times its own density. Shipping is not included.', ['beam-stiffness-cost', 'tie-strength-cost'])}
      <div class="ws-start-card"><h3>My geometry is fixed</h3><p>No index applies to fixed dimensions: compare two properties instead, with the requirements as limits.</p>
        <div class="ws-start-members"><button type="button" class="ws-member" data-start-goal=""><span class="ws-member-name">Compare properties</span><span class="ws-member-free">Choose the axes; no line</span></button></div></div>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ the line

/** The line's control, beside the chart: its position as a number and a slider, a step to the next product state, the
 * count at or above it, and the stage that keeps them. */
export function lineControl(state, ws) {
  const index = ws.objective.index;
  if (!index) return '';
  const L = ws.line;
  if (!L.orientation) {
    const a = goalAxes(index);
    return `<div class="ws-line ws-line-off" role="group" aria-label="Index line">
      <span class="warn-chip">The ${esc(formulaText(index))} line needs ${esc(axisDef(a.x).plain.toLowerCase())} across and ${esc(axisDef(a.y).plain.toLowerCase())} up.</span>
      <button type="button" class="btn btn-sm" data-goal-axes data-focus="goal-axes">Set the goal's axes, on Log scales</button></div>`;
  }
  if (!L.drawable) {
    return `<div class="ws-line ws-line-off" role="group" aria-label="Index line">
      <span class="warn-chip">The products with one value of M lie on a straight line of slope ${index.orientation === 'swapped' ? index.exponent : index.slope} only when both axes are Log.</span>
      <button type="button" class="btn btn-sm" data-loglog data-focus="loglog">Switch both axes to Log</button></div>`;
  }
  if (!L.of.pairs) {
    return `<div class="ws-line ws-line-off" role="group" aria-label="Index line">
      <span class="warn-chip">No product state drawn here has a value of ${esc(formulaText(index))}: the line has nothing to count${state.scenario.moisture === 'conditioned' ? ' in the conditioned state, where nothing is inferred from dry values' : ''}.</span>
      ${ws.counts.unresolved.products ? '<span class="fine">Unresolved products can be drawn as context under Layers; they are never ranked.</span>' : ''}</div>`;
  }
  const M = L.M;
  const r = L.range;
  const pos = r && M ? Math.round(1000 * Math.max(0, Math.min(1, Math.log(M / (r.lo * 0.95)) / Math.log((r.hi * 1.05) / (r.lo * 0.95))))) : 500;
  const better = L.orientation === 'direct' ? 'above' : 'below';
  const readout = M === null ? 'No product state has a value of M to place the line at.'
    : `<b>${states(L.above.pairs)}</b> across <b>${materials(L.above.materials)}</b> at or above <span class="fine">(of ${L.of.pairs}; better ${better})</span>`;
  const stageAt = (state.scenario.stages ?? []).find((s) => s.index === index.id);
  return `<div class="ws-line" role="group" aria-label="Index line">
    <label class="ws-line-m">Line at <span class="formula">M = </span><input type="text" inputmode="decimal" data-line-m data-focus="line-m" value="${M === null ? '' : mText(M)}" aria-label="Line position, M" title="Type a value of M; equality counts as at or above"></label>
    <input type="range" class="ws-line-slider" data-line-slider data-focus="line-slider" min="0" max="1000" value="${pos}" ${M === null ? 'disabled' : ''}
      aria-label="Move the line" aria-valuetext="M = ${sig(M)}, ${states(L.above.pairs)} across ${materials(L.above.materials)} at or above it">
    <span class="ws-line-steps">
      <button type="button" class="btn btn-sm" data-line-step="-1" data-focus="line-down" title="Move the line down to the next product state" aria-label="Line to the next product state below">▼</button>
      <button type="button" class="btn btn-sm" data-line-step="1" data-focus="line-up" title="Move the line up to the next product state" aria-label="Line to the next product state above">▲</button>
    </span>
    <output class="ws-line-readout" aria-live="polite" title="Better: ${better}. The material ranking beside the chart is a separate summary: each material by the median of its passing products.">${readout}</output>
    <button type="button" class="btn btn-sm btn-primary" data-apply-stage data-focus="apply-stage" ${M === null || !L.above.pairs ? 'disabled' : ''}
      title="Keep only the ${states(L.above.pairs)} at or above this line as an objective stage: the ranking, the table and the export then use only them. The requirements' verdicts do not change. Remove it in one press.">${stageAt ? 'Keep above this line instead' : 'Keep products above this line'}</button>
  </div>`;
}

// ------------------------------------------------------------------ toolbar

/**
 * Which of the chart's folds the reader has open, kept across redraws as the filter rail keeps its groups (filters.js):
 * the lens is rebuilt on every change, and a fold that closed under the reader's pointer after each tick was unusable.
 * Unopened, a fold starts closed, so a scenario that arrives with layers on still shows its chart first.
 */
export const openFolds = new Map();
const foldOpen = (name, byDefault = false) => (openFolds.has(name) ? openFolds.get(name) : byDefault);

const LAYERS = [
  ['failed', 'Failed products', 'Products that fail a requirement: pale background context, never ranked'],
  ['unresolved', 'Unresolved products', 'Products that could not be settled: hollow context, never ranked or on the front'],
  ['setAside', 'Set aside by a stage', 'Confirmed products below an applied stage\'s cutoff'],
];

/** The chart's own controls: the view, the axes (set by the goal, open for a comparison), layers, and the rest folded. */
export function toolbar(state, ws, { view }) {
  const p = state.scenario.plot;
  const index = ws.objective.index;
  const goal = index ? goalAxes(index) : null;
  const onGoalAxes = goal && ws.objective.orientation && p.xLog && p.yLog;
  const keys = [...AXIS_DEFS.map((a) => a.key), COST_AXIS];
  const cover = axisCoverage(state, keys);
  const option = (k, cur) => {
    const c = cover.get(k);
    return `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(axisDef(k).plain)} (${c.states} product states · ${c.materials} materials)</option>`;
  };
  const scale = (which, isLog) => `<div class="segmented" role="group" aria-label="${which === 'y' ? 'Vertical' : 'Horizontal'} axis scale">
    <button data-log="${which}" data-focus="log-${which}-lin" aria-pressed="${!isLog}">Linear</button><button data-log="${which}" data-on="1" data-focus="log-${which}-log" aria-pressed="${isLog}">Log</button></div>`;
  const counts = {
    failed: `${ws.counts.failed.pairs}${ws.counts.failed.products > ws.counts.failed.pairs ? ` of ${ws.counts.failed.products}` : ''}`,
    unresolved: `${ws.counts.unresolved.pairs}${ws.counts.unresolved.products > ws.counts.unresolved.pairs ? ` of ${ws.counts.unresolved.products}` : ''}`,
    setAside: `${ws.counts.setAside.pairs}`,
  };
  const est = state.estimates ?? { ranges: [], unavailable: [] };
  return `<div class="ws-toolbar">
    <div class="segmented ws-views" role="group" aria-label="What the chart draws">
      <button data-view="decision" data-focus="view-decision" aria-pressed="${view === 'decision'}" title="Each product that meets the requirements, in the state it is judged in">Decision products</button><button data-view="overview" data-focus="view-overview" aria-pressed="${view === 'overview'}" title="Each material as the span of its products on each axis">Material overview</button>
    </div>
    <details class="ws-fold ws-axes" data-fold="axes" ${foldOpen('axes', !onGoalAxes && !index) ? 'open' : ''}>
      <summary>Axes: ${esc(axisDef(p.y).plain)} ${p.yLog ? 'log' : 'linear'} / ${esc(axisDef(p.x).plain)} ${p.xLog ? 'log' : 'linear'}</summary>
      <div class="ws-axes-body">
        <div class="axis-pick"><label for="ashby-y">Vertical axis</label><div class="axis-row"><select id="ashby-y" data-axis="y" data-focus="axis-y">${keys.map((k) => option(k, p.y)).join('')}</select>${scale('y', p.yLog)}</div></div>
        <button class="btn btn-sm axis-swap" data-swap data-focus="swap" title="Swap the horizontal and vertical axes">⇄ Swap</button>
        <div class="axis-pick"><label for="ashby-x">Horizontal axis</label><div class="axis-row"><select id="ashby-x" data-axis="x" data-focus="axis-x">${keys.map((k) => option(k, p.x)).join('')}</select>${scale('x', p.xLog)}</div></div>
        ${goal && !(p.x === goal.x && p.y === goal.y && p.xLog && p.yLog) ? '<button type="button" class="btn btn-sm" data-goal-axes data-focus="goal-axes-2">Back to the goal\'s axes</button>' : ''}
      </div>
    </details>
    <details class="ws-fold ws-layers-fold" data-fold="layers" ${foldOpen('layers') ? 'open' : ''}>
      <summary>Layers${[...LAYERS.map(([k]) => k), 'front'].filter((k) => p.layers?.[k]).length + (p.showEstimates ? 1 : 0) ? ` (${[...LAYERS.map(([k]) => k), 'front'].filter((k) => p.layers?.[k]).length + (p.showEstimates ? 1 : 0)} on)` : ''}</summary>
    <div class="ws-layers" role="group" aria-label="Context layers">
      ${LAYERS.filter(([k]) => k !== 'setAside' || state.stage).map(([k, label, help]) => `<label class="opt-check" title="${esc(help)}"><input type="checkbox" data-layer="${k}" data-focus="layer-${k}" ${p.layers?.[k] ? 'checked' : ''}><span>${esc(label)} (${counts[k]})</span></label>`).join('')}
      ${est.off ? `<span class="plot-data-state" title="Confirmed only is measured evidence alone, here as everywhere on the page">Estimated context needs ${esc(state.scenario.unknownPolicy === 'exploration' ? 'Use estimates, above' : 'Include uncertain with Use estimates')}</span>`
        : `<label class="opt-check" title="Materials none of whose products publishes a value on an axis: their estimated likely range, dashed, never a point, never ranked"><input type="checkbox" data-show-estimates data-focus="estimates" ${p.showEstimates ? 'checked' : ''}><span>Estimated context (${est.ranges.length})</span></label>`}
      <label class="opt-check" title="The Pareto front of the confirmed product states on these axes, by their recorded values"><input type="checkbox" data-layer="front" data-focus="layer-front" ${p.layers?.front ? 'checked' : ''}><span>Pareto front</span></label>
      <p class="opt-help">Context is drawn behind the decision set and counted apart: never ranked, counted on the line or put on the front. "12 of 40" is 12 drawable of 40 products; the rest publish no value on these axes in the state they are judged in.</p>
    </div></details>
    <details class="ws-fold ws-more" data-fold="more" ${foldOpen('more') ? 'open' : ''}>
      <summary title="References, evidence views, limits on the axes, and export">More</summary>
      <div class="ws-more-body">
        <div class="ws-more-group"><h4>References</h4>
          <label>Familiar filament <select data-baseline data-focus="baseline"><option value="">none</option>${['PLA', 'PETG', 'ABS', 'ASA', 'PC'].map((n) => state.db.materials.find((q) => q.name === n)).filter(Boolean)
            .map((q) => `<option value="${esc(q.id)}" ${state.baseline === q.id ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}</select></label>
          <label class="opt-check"><input type="checkbox" data-reference data-focus="reference" ${p.showReference ? 'checked' : ''}><span>Steel, aluminium and wood</span></label>
          <p class="opt-help">Drawn for scale; never candidates, never counted, ranked or on a front.</p></div>
        <div class="ws-more-group"><h4>Evidence views</h4>
          <p class="opt-help">Published values, independent of the state a product is judged in: for research, not for the decision.</p>
          <div class="ws-evidence-views">
            <button type="button" class="btn btn-sm" data-view="catalogue">Catalogue: typical published values</button>
            <button type="button" class="btn btn-sm" data-view="measured">Test pairs: matched conditions</button>
            <button type="button" class="btn btn-sm" data-view="measured-mixed">Test pairs: mixed conditions</button>
          </div></div>
        <div class="ws-more-group"><h4>Limits on these axes</h4>${axisLimits(state)}</div>
        <div class="ws-more-group"><h4>Export</h4>
          <button type="button" class="btn btn-sm" data-export-data>Chart data (CSV)</button>
          <button type="button" class="btn btn-sm" data-export-image>Chart image (PNG)</button>
          <p class="opt-help">Both carry the release, the question, the goal and its stage, the axes and what each range means.</p></div>
      </div>
    </details>
  </div>`;
}

/**
 * A deliberate edit of the requirement on each axis, with Apply and Cancel: a zoom or a lasso is never a requirement. One
 * requirement per property, as the filter rail holds it; a two-sided interval waits for a scenario decision (D107).
 */
function axisLimits(state) {
  const p = state.scenario.plot;
  const row = (which, key) => {
    const d = axisDef(key);
    if (d.derived) return `<div class="ws-limit"><span>${esc(d.plain)}</span> <span class="fine">derived per product; set price and density in Filters</span></div>`;
    const c = state.scenario.constraints.find((k) => k.kind === 'numeric' && k.property === key);
    const op = c?.operator ?? (d.better === 'min' ? '<=' : '>=');
    return `<div class="ws-limit" data-limit-row="${esc(key)}"><label for="lim-${which}">${esc(d.plain)}</label>
      <select data-limit-op="${esc(key)}" aria-label="${esc(d.plain)}: comparison">${[['>=', 'at least'], ['<=', 'at most']].map(([o, w]) => `<option value="${o}" ${o === op ? 'selected' : ''}>${w}</option>`).join('')}</select>
      <input type="number" id="lim-${which}" step="any" data-limit-value="${esc(key)}" value="${c ? c.value : ''}" placeholder="none"> <span class="unit">${esc(d.unit)}</span></div>`;
  };
  return `<form class="ws-limits" data-limits>${row('y', p.y)}${row('x', p.x)}
    <div class="ws-limit-actions"><button type="submit" class="btn btn-sm">Apply as requirements</button> <button type="reset" class="btn btn-sm">Cancel</button></div>
    <p class="opt-help">Each becomes the property's one requirement, the same as in Filters. An empty box removes it.</p></form>`;
}

// ------------------------------------------------------------------ results and inspector

/** The result list beside the chart: the goal's ranking by material, each with its exact best product state, the product
 * states under it, the unranked and the gaps. A keyboard reaches everything the chart shows here. */
export function resultsPanel(state, ws) {
  const index = ws.objective.index;
  const tested = state.scenario.constraints.length > 0;
  const byMaterial = new Map();
  for (const p of ws.decision) { if (!byMaterial.has(p.materialId)) byMaterial.set(p.materialId, []); byMaterial.get(p.materialId).push(p); }
  const shortlisted = new Set(state.scenario.shortlist);
  const star = (id, name) => `<button type="button" class="shortlist-btn btn btn-sm" data-pin="${esc(id)}" aria-pressed="${shortlisted.has(id)}" title="${shortlisted.has(id) ? 'On the shortlist of materials to investigate. Press to remove it.' : 'Shortlist this material to investigate (a product is chosen in the inspector)'}" aria-label="Shortlist ${esc(name)}">${shortlisted.has(id) ? '★' : '☆'}</button>`;
  // A material's product states are written when its list is opened (pairList), not with the page: a thousand buttons
  // in closed lists made every redraw of the chart pay for a document five times the size.
  const inspectedMaterial = state.inspect?.kind === 'pair' ? state.inspect.key.split('|')[0] : null;
  const materialItem = (id, { place = '', value = '', below = '' } = {}) => {
    const list = byMaterial.get(id) ?? [];
    const name = list[0]?.name ?? state.db.materials.find((m) => m.id === id)?.name ?? id;
    const open = id === inspectedMaterial;
    return `<li class="ws-mat" data-mat="${esc(id)}" data-name="${esc(name.toLowerCase())}">
      <div class="ws-mat-head">${place}<button type="button" class="link-btn ws-mat-name" data-focus-material="${esc(id)}" title="Zoom the chart to its products">${esc(name)}</button>${value}${star(id, name)}</div>
      ${below}
      ${list.length ? `<details class="ws-mat-pairs" data-mat-pairs="${esc(id)}" ${open ? 'open' : ''}><summary>${states(list.length)} drawn</summary>${open ? pairList(state, ws, id) : ''}</details>` : '<div class="fine">No product state drawn on these axes</div>'}
    </li>`;
  };
  let body;
  if (index && ws.ranking) {
    const gradeById = new Map(state.db.grades.map((g) => [g.id, g]));
    const ranked = ws.ranking.order.map((r) => {
      const best = r.best?.gradeId ? gradeById.get(r.best.gradeId) : null;
      const bestKey = best ? `${r.materialId}|${best.id}|${r.best.stateId}` : null;
      return materialItem(r.materialId, {
        place: `<span class="ws-place">${r.place}</span>`,
        value: `<span class="formula ws-median" title="The median of ${plural(r.products, 'passing product')}' own index${r.place > 1 ? `; ${(r.value / ws.ranking.order[0].value).toFixed(2)} × ${esc(ws.ranking.order[0].materialId === r.materialId ? '' : nameOfMaterial(state, ws.ranking.order[0].materialId))}'s` : ''}">${sig(r.value)}${r.place > 1 ? ` <span class="ws-rel">${(r.value / ws.ranking.order[0].value).toFixed(2)}×</span>` : ''}</span>`,
        below: `${best ? `<div class="ws-best"><span class="fine">best</span> <button type="button" class="link-btn" data-inspect="${esc(bestKey)}">${esc(`${best.manufacturer} ${best.product}`)}</button> <span class="fine">${esc(stateWords(parseState(r.best.stateId)))} · M ${sig(r.best.value)}</span></div>` : ''}
          <div class="fine ws-support">median of ${plural(r.products, ws.objective.stage ? 'kept product' : 'passing product')}</div>`,
      });
    });
    const unranked = ws.ranking.unranked;
    const nameOf = (id) => state.db.materials.find((m) => m.id === id)?.name ?? id;
    body = `<div class="ws-list-head"><h3>Ranked by ${esc(index.designCase.toLowerCase())}</h3>
      <p class="fine">Each material by the median ${esc(formulaText(index))} of its ${ws.objective.stage ? 'kept' : 'passing'} products, in the states they pass in; its best product state named. ${ws.ranking.order.length > 1 ? `The × is relative to ${esc(nameOfMaterial(state, ws.ranking.order[0].materialId))}, first: M's own units depend on the formula.` : ''}</p></div>
      ${ranked.length ? `<ol class="ws-rank">${ranked.join('')}</ol>` : `<p class="fine">${tested && !state.rows.some((r) => r.evaluation.verdict === 'PASS')
        ? 'No material meets every requirement in the state asked, so nothing ranks. Unresolved products can be drawn as context; Why excluded says what held them.'
        : `No ${tested ? 'material that passes' : 'material'} has a product that publishes what ${esc(formulaText(index))} needs in the state it is judged in.`}</p>`}
      ${unranked.length ? `<details class="ws-unranked"><summary>${plural(unranked.length, 'material')} pass${unranked.length === 1 ? 'es' : ''} but cannot be ranked</summary>
        <ul>${unranked.map((u) => `<li><button type="button" class="link-btn" data-open-material="${esc(u.materialId)}">${esc(nameOf(u.materialId))}</button>: ${esc(u.reason)}</li>`).join('')}</ul></details>` : ''}`;
  } else {
    const ids = [...byMaterial.keys()].sort((a, b) => (byMaterial.get(a)[0].name).localeCompare(byMaterial.get(b)[0].name));
    body = `<div class="ws-list-head"><h3>${tested ? 'Confirmed products, by material' : 'Products, by material'}</h3>
      <p class="fine">Choose a goal to rank them. ${tested ? '' : 'Nothing is confirmed until a requirement is asked.'}</p></div>
      <ul class="ws-rank ws-unordered">${ids.map((id) => materialItem(id)).join('')}</ul>`;
  }
  const gaps = ws.gaps;
  const gapBlock = gaps.length ? `<details class="ws-gaps"><summary>${states(gaps.length)} ${tested ? 'confirmed' : ''} but not drawn on these axes</summary>
    <ul>${gaps.slice(0, 40).map((g) => `<li><b>${esc(g.product)}</b> <span class="fine">(${esc(g.name)})</span>: ${g.offLog ? 'a value at or below zero, which a Log axis cannot show' : esc(g.missing.map((m) => missingWords(m, axisDef(m.key))).join('; '))}</li>`).join('')}${gaps.length > 40 ? `<li class="fine">and ${gaps.length - 40} more, in the chart data export</li>` : ''}</ul>
    ${ws.counts.gaps.unpriced ? `<p class="fine">${plural(ws.counts.gaps.unpriced, 'product')} ha${ws.counts.gaps.unpriced === 1 ? 's' : 've'} no current Canadian price. Prices are observed CAD/kg listings with their dates; shipping is excluded, and no other currency is converted.</p>` : ''}</details>` : '';
  const noProducts = ws.noProducts.length ? `<p class="fine">${plural(ws.noProducts.length, 'material')} on screen ha${ws.noProducts.length === 1 ? 's' : 've'} no product to buy, so no product state to draw.</p>` : '';
  return `<aside class="ws-results" aria-label="Results">
    ${inspector(state, ws)}
    <div class="ws-list">
      <input type="search" class="ws-filter" data-list-filter data-focus="list-filter" placeholder="Find a material in the results" aria-label="Find a material in the results">
      ${body}${gapBlock}${noProducts}
    </div>
  </aside>`;
}

const nameOfMaterial = (state, id) => state.db.materials.find((m) => m.id === id)?.name ?? id;

/** One material's product states in the decision set, best first, each opening in the inspector. */
export function pairList(state, ws, materialId) {
  const xD = axisDef(state.scenario.plot.x), yD = axisDef(state.scenario.plot.y);
  const list = ws.decision.filter((p) => p.materialId === materialId)
    .sort((a, b) => (b.M ?? -Infinity) - (a.M ?? -Infinity) || a.gradeId.localeCompare(b.gradeId));
  return `<ul>${list.map((p) => `<li><button type="button" class="ws-pair-btn" data-inspect="${esc(p.key)}" ${state.inspect?.key === p.key ? 'aria-current="true"' : ''}>
    <span class="ws-pair-name">${esc(p.product)}</span> <span class="fine">${esc(stateWords(p.state))}</span>
    <span class="ws-pair-vals">${esc(valueText(p.y.value, yD))} · ${esc(valueText(p.x.value, xD))}${p.M !== null ? ` · M ${sig(p.M)}` : ''}</span></button></li>`).join('')}</ul>`;
}

/** "annealed:120:16" as a state object, for words. */
function parseState(id) {
  const parts = String(id).split('+');
  const a = parts.find((x) => x.startsWith('annealed:'));
  const [, t, h] = a ? a.split(':') : [];
  return { treatment: a ? { tempC: t === 'x' ? null : Number(t), hours: h === 'x' ? null : Number(h) } : null, moisture: parts.includes('conditioned') ? 'conditioned' : 'dry' };
}

/** The selected mark, opened: its exact product and state and every input behind it. */
function inspector(state, ws) {
  const sel = state.inspect;
  if (!sel) return '';
  const close = '<button type="button" class="icon-btn" data-inspect-close data-focus="inspect-close" aria-label="Close the inspector">×</button>';
  const p = state.scenario.plot;
  const xD = axisDef(p.x), yD = axisDef(p.y);
  if (sel.kind === 'nearby') {
    const list = sel.keys.map((k) => [...ws.pairs, ...ws.contextPairs].find((q) => q.key === k)).filter(Boolean);
    return `<section class="ws-inspector" aria-label="Marks here" tabindex="-1"><div class="ws-insp-head"><h3>${plural(list.length, 'mark')} here</h3>${close}</div>
      <ul class="ws-nearby">${list.map((q) => `<li><button type="button" class="ws-pair-btn" data-inspect="${esc(q.key)}"><span class="ws-pair-name">${esc(q.product)}</span> <span class="fine">${esc(q.name)} · ${esc(stateWords(q.state))} · ${esc(q.verdict)}</span></button></li>`).join('')}</ul></section>`;
  }
  if (sel.kind === 'estimate') {
    const e = (state.estimates?.ranges ?? []).find((r) => r.key === sel.key);
    if (!e) return '';
    const side = (s, d) => (s.kind === 'estimate'
      ? `<dd>likely ${esc(fmtRange(s.lo, s.hi))} ${esc(d.unit)} <span class="fine">(the model's ${Math.round((s.levels?.likely ?? 0.8) * 100)}% interval; ${esc(s.precision ?? 'unrated')} precision, ${esc(ESTIMATE_PRECISION[s.precision] ?? '')}; ${esc(ESTIMATE_STRENGTH[s.strength]?.short ?? 'basis not rated')})</span>
         ${s.plausible ? `<br><span class="fine">broader, plausible: ${esc(fmtRange(s.plausible.lo, s.plausible.hi))} ${esc(d.unit)}</span>` : ''}
         ${s.screenRange ? `<br><span class="fine">defended screening bounds the engine may use: ${esc(fmtRange(s.screenRange.lo, s.screenRange.hi))} ${esc(d.unit)}${s.canScreen ? '' : ' (this estimate may not screen)'}; not the likely range, and not a physical limit</span>` : ''}
         <br><span class="fine">basis: ${esc(s.basis ?? 'not stated')}</span></dd>`
      : `<dd>${s.lo === s.hi ? esc(valueText(s.lo, d)) : `${esc(fmtRange(s.lo, s.hi))} ${esc(d.unit)}`} <span class="fine">measured: ${s.kind === 'product-span' ? `the span of its ${plural(s.products ?? 0, 'product')}, not one product's uncertainty` : 'its one product\'s value'}</span></dd>`);
    const estKey = e.x.kind === 'estimate' ? p.x : p.y;
    return `<section class="ws-inspector" aria-label="Estimated context" tabindex="-1"><div class="ws-insp-head"><h3>${esc(e.name)}: estimated context</h3>${close}</div>
      <p class="fine">None of its products publishes a comparable ${esc(axisDef(estKey).plain.toLowerCase())}. This is context, not a candidate: it confirms no requirement and ranks nowhere.</p>
      <dl class="kv small"><dt>${esc(yD.plain)}</dt>${side(e.y, yD)}<dt>${esc(xD.plain)}</dt>${side(e.x, xD)}
        <dt>State</dt><dd>${esc(e.state)}: an estimate describes products as printed and dry; none is made for a conditioned or annealed state</dd>
        ${e.sensitivity ? `<dt>Index over the range</dt><dd>${sig(e.sensitivity.lo)} to ${sig(e.sensitivity.hi)} <span class="fine">M at the rectangle's worst and best corners: a bound over two independent ranges, not a confidence interval and not a rank</span></dd>` : ''}
      </dl>
      <p class="fine">Two marginal 80% ranges do not make an 80% region together: nothing is known about how the two vary jointly. What would resolve it: a comparable ${esc(axisDef(estKey).plain.toLowerCase())} published for one of its products, in the state the question asks about.</p>
      <div class="ws-insp-actions"><button type="button" class="btn btn-sm" data-open-material="${esc(e.materialId)}">Open ${esc(e.name)}</button></div></section>`;
  }
  if (sel.kind === 'material') {
    const s = ws.materialSummaries.find((m) => m.materialId === sel.key);
    if (!s) return '';
    const list = s.paired.map((k) => ws.pairs.find((q) => q.key === k)).filter(Boolean);
    return `<section class="ws-inspector" aria-label="Material" tabindex="-1"><div class="ws-insp-head"><h3>${esc(s.name)}</h3>${close}</div>
      <p class="fine">The marginal span of its ${s.population === 'confirmed' ? 'confirmed' : 'judged'} products on each axis: the corners are not products, and nothing is known of the joint combinations. The products are the marks.</p>
      <dl class="kv small"><dt>${esc(yD.plain)}</dt><dd>${s.y ? `${esc(fmtRange(s.y.lo, s.y.hi))} ${esc(yD.unit)} (${plural(s.y.n, 'product')})` : '—'}</dd>
        <dt>${esc(xD.plain)}</dt><dd>${s.x ? `${esc(fmtRange(s.x.lo, s.x.hi))} ${esc(xD.unit)} (${plural(s.x.n, 'product')})` : '—'}</dd></dl>
      <ul class="ws-nearby">${list.map((q) => `<li><button type="button" class="ws-pair-btn" data-inspect="${esc(q.key)}"><span class="ws-pair-name">${esc(q.product)}</span> <span class="fine">${esc(stateWords(q.state))} · ${esc(valueText(q.y.value, yD))} · ${esc(valueText(q.x.value, xD))}</span></button></li>`).join('')}</ul>
      <div class="ws-insp-actions"><button type="button" class="btn btn-sm" data-focus-material="${esc(s.materialId)}">Zoom to its products</button> <button type="button" class="btn btn-sm" data-open-material="${esc(s.materialId)}">Open ${esc(s.name)}</button></div></section>`;
  }
  const q = [...ws.pairs, ...ws.contextPairs].find((x) => x.key === sel.key);
  if (!q) return '';
  const grade = state.db.grades.find((g) => g.id === q.gradeId);
  const chosen = (state.scenario.decisions ?? []).some((d) => d.gradeId === q.gradeId);
  const rank = ws.ranking?.byMaterial.get(q.materialId);
  const measurement = (id) => (id ? state.ctx.measurementById?.get(id) ?? state.db.measurements.find((m) => m.id === id) : null);
  const coordinate = (v, d) => {
    if (v.value === null) return `<dd class="missing">${esc(missingWords({ reason: v.missing, elsewhere: v.elsewhere }, d))}</dd>`;
    const m = measurement(v.measurementId);
    const value = v.measurementId
      ? `<button type="button" class="evidence-value" data-measurement="${esc(v.measurementId)}" title="Opens the measurement behind this value">${esc(valueText(v.value, d))}<span class="evidence-dot" aria-hidden="true"></span></button>`
      : esc(valueText(v.value, d));
    const where = v.origin === 'assumption' ? 'a scenario assumption, not measured'
      : v.derived ? `its own price ${fmtNumber(v.price.value)} ${esc(v.price.unit)} (${plural(v.price.observations ?? v.priceIds.length, 'listing')}, ${esc(v.priceIds.join(' '))}) × its own density ${fmtNumber(v.density.value)} ${esc(v.density.unit)}`
      : v.stateInvariantByRegistry ? `read from ${esc(v.sourceStateId)}: the registry declares ${esc(d.plain.toLowerCase())} unchanged by this state`
      : `this state's own value${v.measurementId ? ` (${esc(v.measurementId)})` : ''}`;
    const extra = [
      v.uncertainty ? `the source reports ± ${fmtNumber(v.uncertainty)} ${esc(d.unit)}, its statistic as published` : null,
      v.from?.label ? esc(v.from.label) : null,
      v.admitted?.length ? `${esc(v.admitted.join(', '))} not stated, admitted for screening` : null,
      m && /strength/i.test(m.property ?? '') ? `endpoint: ${esc(m.property)}` : null,
      m?.standards?.length ? `to ${esc(m.standards.join(', '))}` : null,
    ].filter(Boolean);
    return `<dd>${value} <span class="fine">${where}${extra.length ? `; ${extra.join('; ')}` : ''}</span></dd>`;
  };
  const index = ws.objective.index;
  const context = q.bucket !== 'confirmed' ? `<p class="fine ws-context-note">${q.bucket === 'failed' ? 'Fails a requirement' : 'Could not be settled'}: context only, never ranked, counted on the line or on the front.</p>` : '';
  return `<section class="ws-inspector" aria-label="Selected product state" tabindex="-1">
    <div class="ws-insp-head"><h3>${esc(q.product)}</h3>${close}</div>
    <div class="fine">${esc(q.name)} · ${esc(q.gradeId)} · ${state.scenario.constraints.length ? chip(q.verdict) : '<span class="chip chip-neutral">not screened</span>'}${q.retained === false && q.bucket === 'confirmed' ? ' · <span class="chip chip-neutral">set aside by the stage</span>' : ''}</div>
    ${context}
    <dl class="kv small">
      <dt>State</dt><dd>${q.state.treatment ? `Annealed ${esc(scheduleWords(q.state.treatment))}, as its sheet states; ` : 'As printed; '}${q.state.moisture === 'conditioned' ? 'conditioned by moisture' : 'dry'}${q.state.synthetic ? '. It publishes no values of its own in this state' : ''}</dd>
      <dt>${esc(yD.plain)}</dt>${coordinate(q.y, yD)}
      <dt>${esc(xD.plain)}</dt>${coordinate(q.x, xD)}
      ${index ? `<dt>Goal index</dt><dd>${q.M !== null ? `M = ${sig(q.M)}` : 'not computable: an input is missing in this state'}${rank ? ` · its material ranks #${rank.place}, the median of ${plural(rank.products, 'product')}` : ''}${index.strengthProxy ? ' <span class="fine">(a strength proxy)</span>' : ''}</dd>` : ''}
      ${grade?.print?.anneal?.length && !q.state.treatment ? `<dt>Treatment</dt><dd class="fine">Its sheet also measures values after annealing ${esc(grade.print.anneal.map(scheduleWords).join('; '))}; permit annealing to judge it in that state.</dd>` : ''}
    </dl>
    <div class="ws-insp-actions">
      ${state.scenario.constraints.length && q.bucket === 'confirmed' ? `<button type="button" class="btn btn-sm choose-btn" data-choose="${esc(q.gradeId)}" aria-pressed="${chosen}" title="${chosen ? 'Chosen: its decision brief is under Save / share. Press to remove it.' : 'Choose this exact product in this state: its decision brief, recipe and test plan go under Save / share'}">${chosen ? '✓ Chosen' : 'Choose this exact product'}</button>` : ''}
      <button type="button" class="btn btn-sm" data-open-product="${esc(q.materialId)}">Open its material's products</button>
      <button type="button" class="btn btn-sm" data-focus-material="${esc(q.materialId)}">Zoom to ${esc(q.name)}</button>
    </div>
  </section>`;
}

// ------------------------------------------------------------------ the plot

const VERDICT_WORD = { PASS: 'meets every requirement', UNKNOWN: 'could not be settled', FAIL: 'fails a requirement' };

/** Draw the decision or overview chart into #plot. */
export function drawWorkspacePlot(host, state, ws, actions, { view }) {
  const { scenario, db, reference } = state;
  const p = scenario.plot;
  const tested = scenario.constraints.length > 0;
  const xD = axisDef(p.x), yD = axisDef(p.y);
  const asked = scenario.constraints.find((c) => c.kind === 'facet' && c.facet === 'family')?.in ?? [];
  const colors = buildFamilyColors(db.materials, [...asked, ...(p.promotedFamilies ?? [])]);
  const colourGroup = (family) => (colors.isOther(family) ? 'Other families' : family);
  const traces = [];
  const labelPlan = { pins: [], points: [], envelopes: [], fixed: [] };
  const drawnFamilies = new Set();
  const focus = new Set(p.focus ?? []);
  const cd = (q, note) => [q.materialId, `${q.name}: ${q.product}`, q.verdict, q.x.measurementId ?? '', q.y.measurementId ?? '', q.stateId, q.gradeId, note, q.key];
  const hover = (what) => `<b>%{customdata[1]}</b><br>${esc(yD.plain)} %{y} ${esc(yD.unit)}<br>${esc(xD.plain)} %{x} ${esc(xD.unit)}<br>${what}<extra></extra>`;

  // Estimate context, dashed, behind everything: a range, never a point.
  const est = p.showEstimates && !state.estimates?.off ? (state.estimates?.ranges ?? []) : [];
  for (const e of est) {
    const color = colors.color(e.family);
    const box = e.x.lo !== e.x.hi && e.y.lo !== e.y.hi;
    const x = box ? [e.x.lo, e.x.hi, e.x.hi, e.x.lo, e.x.lo] : [e.x.lo, e.x.hi];
    const y = box ? [e.y.lo, e.y.lo, e.y.hi, e.y.hi, e.y.lo] : [e.y.lo, e.y.hi];
    const side = (s, d) => (s.kind === 'estimate' ? `${fmtRange(s.lo, s.hi)} ${d.unit} estimated (likely)` : s.lo === s.hi ? `${fmtNumber(s.lo)} ${d.unit} measured` : `${fmtRange(s.lo, s.hi)} ${d.unit} measured across ${s.products} products`);
    drawnFamilies.add(colourGroup(e.family));
    traces.push({
      type: 'scatter', mode: box ? 'lines' : 'lines+markers', x, y, fill: box ? 'toself' : undefined, fillcolor: box ? hexToRgba(color, 0.03) : undefined,
      ...(box ? {} : { marker: { size: 7, symbol: e.x.lo === e.x.hi ? 'line-ew-open' : 'line-ns-open', color, line: { color, width: 1.5 } } }),
      line: { color, width: 1.5, dash: 'dash' }, opacity: 0.8, hoveron: box ? 'fills+points' : 'points',
      name: `${e.name} (estimated context)`, legendgroup: colourGroup(e.family), showlegend: false,
      customdata: x.map(() => ['estimate', e.materialId, e.key]),
      hovertemplate: `<b>${esc(e.name)}</b>: estimated context<br>${esc(yD.plain)}: ${esc(side(e.y, yD))}<br>${esc(xD.plain)}: ${esc(side(e.x, xD))}<br><i>Marginal ranges; joint combinations not known. Not a candidate.</i><extra></extra>`,
    });
  }

  if (view === 'overview') {
    // Each material as the marginal span of its products, light and solid, and its products as small paired marks.
    for (const s of ws.materialSummaries) {
      if (!s.x || !s.y) continue;
      const color = colors.color(s.family);
      drawnFamilies.add(colourGroup(s.family));
      const box = s.x.lo !== s.x.hi && s.y.lo !== s.y.hi;
      const text = `<b>${esc(s.name)}</b><br>Marginal span of its ${s.population === 'confirmed' ? 'confirmed' : 'judged'} products`
        + `<br>${esc(yD.plain)}: ${esc(fmtRange(s.y.lo, s.y.hi))} ${esc(yD.unit)} (${s.y.n})<br>${esc(xD.plain)}: ${esc(fmtRange(s.x.lo, s.x.hi))} ${esc(xD.unit)} (${s.x.n})`
        + '<br><i>Joint combinations not known; the corners are not products</i><extra></extra>';
      if (box) {
        traces.push({ type: 'scatter', mode: 'lines', x: [s.x.lo, s.x.hi, s.x.hi, s.x.lo, s.x.lo], y: [s.y.lo, s.y.lo, s.y.hi, s.y.hi, s.y.lo],
          fill: 'toself', fillcolor: hexToRgba(color, 0.1), line: { color: hexToRgba(color, 0.6), width: 1 }, hoveron: 'fills+points',
          name: `${s.name} span`, legendgroup: colourGroup(s.family), showlegend: false, customdata: [0, 1, 2, 3, 4].map(() => ['material', s.materialId]), hovertemplate: text });
        labelPlan.envelopes.push({ trace: traces.length - 1, index: 2, name: s.name, x: s.x.hi, y: s.y.hi, positions: ['top right', 'bottom left'], radius: 0, shortlisted: scenario.shortlist.includes(s.materialId) });
      } else if (s.x.lo !== s.x.hi || s.y.lo !== s.y.hi) {
        traces.push({ type: 'scatter', mode: 'lines', x: [s.x.lo, s.x.hi], y: [s.y.lo, s.y.hi], line: { color: hexToRgba(color, 0.7), width: 3 },
          name: `${s.name} span`, legendgroup: colourGroup(s.family), showlegend: false, customdata: [['material', s.materialId], ['material', s.materialId]], hovertemplate: text });
        labelPlan.envelopes.push({ trace: traces.length - 1, index: 1, name: s.name, x: s.x.hi, y: s.y.hi, positions: ['top right', 'middle right'], radius: 0, shortlisted: scenario.shortlist.includes(s.materialId) });
      }
    }
    const pop = new Set(ws.materialSummaries.flatMap((s) => s.paired));
    const dots = ws.pairs.filter((q) => pop.has(q.key) && q.plottable);
    const byFamily = groupBy(dots, (q) => q.family);
    for (const [family, list] of byFamily) {
      drawnFamilies.add(colourGroup(family));
      const color = colors.color(family);
      traces.push({ type: 'scatter', mode: 'markers', x: list.map((q) => q.x.value), y: list.map((q) => q.y.value),
        marker: { size: 6, color, line: { width: 0.5, color: 'rgba(0,0,0,.4)' } }, name: family, legendgroup: colourGroup(family), showlegend: false,
        text: list.map(() => NO_LABEL), customdata: list.map((q) => cd(q, `${stateWords(q.state)}; ${VERDICT_WORD[q.verdict] ?? ''}`)), hovertemplate: hover('%{customdata[7]}') });
    }
  } else {
    // Context layers first, so the decision set is drawn over them.
    const layer = (list, style, what) => {
      for (const [family, qs] of groupBy(list, (q) => q.family)) {
        drawnFamilies.add(colourGroup(family));
        const color = colors.color(family);
        traces.push({ type: 'scatter', mode: 'markers', x: qs.map((q) => q.x.value), y: qs.map((q) => q.y.value), ...style(color),
          name: `${family} (${what})`, legendgroup: colourGroup(family), showlegend: false, text: qs.map(() => NO_LABEL),
          customdata: qs.map((q) => cd(q, `${stateWords(q.state)}; ${what}${q.inResults ? '' : '; its material is not in the results'}`)), hovertemplate: hover('%{customdata[7]}') });
      }
    };
    if (p.layers?.failed) layer(ws.failed, (c) => ({ marker: { size: 7, symbol: 'x-thin-open', color: hexToRgba(c, 0.55), line: { width: 1.5, color: hexToRgba(c, 0.55) } } }), 'fails a requirement: context');
    if (p.layers?.unresolved) layer(ws.unresolved, (c) => ({ marker: { size: 9, symbol: 'circle-open', color: c, line: { width: 1.6, color: c }, opacity: 0.75 } }), 'could not be settled: context');
    if (p.layers?.setAside && ws.setAside.length) layer(ws.setAside, (c) => ({ marker: { size: 8, symbol: 'circle', color: hexToRgba(c, 0.25), line: { width: 1, color: hexToRgba(c, 0.6) } } }), 'confirmed, set aside by the stage');

    // The decision set: each confirmed product state, filled, one trace per family colour.
    const chosenGrades = new Set((scenario.decisions ?? []).map((d) => d.gradeId));
    const shortlisted = new Set(scenario.shortlist);
    const leading = new Set((ws.ranking?.order ?? []).slice(0, 6).map((r) => `${r.materialId}|${r.best?.gradeId}|${r.best?.stateId}`));
    const front = new Set(p.layers?.front ? ws.frontier : []);
    for (const [family, list] of groupBy(ws.decision, (q) => q.family)) {
      drawnFamilies.add(colourGroup(family));
      const color = colors.color(family);
      const t = traces.length;
      traces.push({
        type: 'scatter', mode: 'markers+text', x: list.map((q) => q.x.value), y: list.map((q) => q.y.value),
        text: list.map(() => NO_LABEL), textposition: list.map(() => 'top center'), textfont: { size: LABEL_FONT, color: 'rgba(107,107,99,.95)' }, cliponaxis: false,
        marker: { size: list.map((q) => (state.inspect?.key === q.key ? 13 : 10)), symbol: 'circle', color, opacity: list.map((q) => (q.assumed ? 0.35 : 1)),
          line: { width: list.map((q) => (state.inspect?.key === q.key || chosenGrades.has(q.gradeId) ? 2.5 : 1)), color: list.map((q) => (state.inspect?.key === q.key ? '#1f5f8b' : 'rgba(0,0,0,.55)')) } },
        // A thin whisker is the spread the source reports for that one measurement, its statistic as published: never
        // the spread across products, which the overview's bands are.
        error_x: errorBars(list.map((q) => ({ u: q.x })), 'u'), error_y: errorBars(list.map((q) => ({ u: q.y })), 'u'),
        name: family, legendgroup: colourGroup(family), showlegend: false,
        customdata: list.map((q) => cd(q, `${stateWords(q.state)}; ${q.assumed ? 'scenario assumption, not measured; not on the front' : tested ? 'meets every requirement' : 'not screened'}${q.twin ? `; ${q.twin}` : ''}${q.y.uncertainty ? `; source ± ${fmtNumber(q.y.uncertainty)} ${yD.unit}` : ''}${q.M !== null && ws.objective.index ? `; M ${sig(q.M)}` : ''}`)),
        hovertemplate: hover('%{customdata[7]}'),
      });
      // Labels: a chosen product by its name with a leader line; the best product of the leading materials, the front,
      // and one mark per material otherwise, where they fit (placeLabels).
      const perMaterial = new Set();
      list.forEach((q, i) => {
        const entry = { trace: t, index: i, id: q.key, x: q.x.value, y: q.y.value, radius: 5 };
        if (chosenGrades.has(q.gradeId) || state.inspect?.key === q.key) labelPlan.pins.push({ ...entry, name: q.productName });
        else if (leading.has(q.key) || front.has(q.key) || (!ws.ranking && !perMaterial.has(q.materialId))) {
          labelPlan.points.push({ ...entry, name: q.name, front: leading.has(q.key) || front.has(q.key) });
          perMaterial.add(q.materialId);
        } else if (shortlisted.has(q.materialId) && !perMaterial.has(q.materialId)) { labelPlan.points.push({ ...entry, name: q.name, front: true }); perMaterial.add(q.materialId); }
      });
    }

    // The front: exact confirmed product states, a staircase by their recorded values; no product between them is implied.
    if (p.layers?.front && ws.frontier.length > 1) {
      const pts = ws.frontier.map((k) => ws.decision.find((q) => q.key === k)).filter(Boolean)
        .sort((a, b) => (xD.better === 'min' ? a.x.value - b.x.value : b.x.value - a.x.value));
      traces.push({ type: 'scatter', mode: 'lines', name: 'Pareto front of confirmed product states', legendgroup: 'pareto',
        x: pts.map((q) => q.x.value), y: pts.map((q) => q.y.value), line: { color: 'rgba(31,95,139,.85)', width: 1.5, dash: 'dot', shape: 'hv' }, hoverinfo: 'skip' });
    }
  }

  // The goal's line over the product states it counts, with the better side marked.
  const annotations = [];
  const shapes = [];
  const L = ws.line;
  const index = ws.objective.index;
  if (index && L?.drawable && L.M !== null && view === 'decision') {
    const xs = ws.decision.map((q) => q.x.value).filter((v) => v > 0);
    if (xs.length) {
      const lo = Math.min(...xs) * 0.8, hi = Math.max(...xs) * 1.25;
      const line = selectionLine(index, L.M, [lo, hi], L.orientation);
      traces.push({ type: 'scatter', mode: 'lines', name: `${formulaText(index)} = ${sig(L.M)}`, legendgroup: 'index',
        x: line.map((q) => q.x), y: line.map((q) => q.y), line: { color: '#1f5f8b', width: 2 }, hoverinfo: 'skip', _line: true });
    }
  }

  // Requirements, references and the familiar filament, as every view draws them.
  const req = requirementOverlay(scenario.constraints, xD, yD, p);
  shapes.push(...req.shapes); annotations.push(...req.annotations); labelPlan.fixed.push(...req.fixed);
  if (p.showReference) {
    const ref = referenceOverlay(reference, xD, yD, p);
    shapes.push(...ref.shapes); annotations.push(...ref.annotations); labelPlan.fixed.push(...ref.fixed);
  }
  const anchor = state.baseline ? anchorTrace(db.materials.find((m) => m.id === state.baseline), xD, yD) : null;
  if (anchor) { traces.push(anchor.trace); labelPlan.fixed.push(anchor.fixed); }

  // The legend lists the family colours drawn, one entry each.
  for (const family of [...colors.named, 'Other families']) {
    if (!drawnFamilies.has(family)) continue;
    traces.push({ type: 'scatter', mode: 'markers', x: [null], y: [null], name: family, legendgroup: family, showlegend: true,
      marker: { size: 10, symbol: 'circle', color: family === 'Other families' ? colors.color(null) : colors.color(family) }, hoverinfo: 'skip' });
  }

  // The range frames the decision set (and a focus), not the whole context, which may be orders of magnitude wider; Fit
  // all widens it to every layer drawn.
  const framed = (() => {
    const base = view === 'overview' ? ws.materialSummaries.filter((s) => s.x && s.y).flatMap((s) => [[s.x.lo, s.y.lo], [s.x.hi, s.y.hi]]) : ws.decision.map((q) => [q.x.value, q.y.value]);
    const focused = focus.size ? (view === 'overview' ? ws.materialSummaries.filter((s) => focus.has(s.materialId) && s.x && s.y).flatMap((s) => [[s.x.lo, s.y.lo], [s.x.hi, s.y.hi]]) : ws.pairs.filter((q) => focus.has(q.materialId) && q.plottable).map((q) => [q.x.value, q.y.value])) : [];
    const pts = focused.length ? focused : base;
    const extra = p.fitAll || !pts.length ? [...ws.pairs, ...ws.contextPairs].filter((q) => q.plottable && (q.bucket === 'confirmed' || p.layers?.[q.bucket])).map((q) => [q.x.value, q.y.value]).concat(est.flatMap((e) => [[e.x.lo, e.y.lo], [e.x.hi, e.y.hi]])) : [];
    return { x: [...pts, ...extra].map((v) => v[0]), y: [...pts, ...extra].map((v) => v[1]) };
  })();
  const { xSpan, ySpan } = focus.size || !p.fitAll ? { xSpan: framed.x, ySpan: framed.y } : spans(traces.filter((t) => !t._line), shapes, framed);
  // A requirement line stays in view when the frame is near it.
  for (const c of scenario.constraints.filter((k) => k.kind === 'numeric' && k.mandatory !== false)) {
    if (c.property === p.x && xSpan.length) { const [a, b] = [Math.min(...xSpan), Math.max(...xSpan)]; if (c.value >= a / 1.6 && c.value <= b * 1.6) xSpan.push(c.value); }
    if (c.property === p.y && ySpan.length) { const [a, b] = [Math.min(...ySpan), Math.max(...ySpan)]; if (c.value >= a / 1.6 && c.value <= b * 1.6) ySpan.push(c.value); }
  }

  const gd = host.querySelector('#plot');
  const { ink, grid } = chartTheme();
  const legendNames = traces.filter((t) => t.showlegend !== false && t.name).map((t) => t.name);
  // The chart fills what the view shows of it, so the plot and its line are on one screen: at least a 450 px plot on a
  // wide screen and 360 px on a laptop (02-MAKEOVER-SPEC), at most 640. Where the page scrolls as a whole (a phone) it
  // keeps its width-based height. The legend sits beside a plot wide enough to spare it, and under a narrower one.
  const fit = chartFit(Math.max(gd.clientWidth, 400), legendNames);
  const beside = gd.clientWidth >= 1000;
  const legend = beside ? { ...fit.legend, orientation: 'v', x: 1.01, xanchor: 'left', xref: 'paper', y: 1, yanchor: 'top', yref: 'paper' }
    : { orientation: 'h', x: 0, xanchor: 'left', xref: 'paper', y: 0, yanchor: 'bottom', yref: 'container', traceorder: 'normal', font: { size: 11 } };
  const rows = beside ? 0 : Math.ceil(legendNames.length / Math.max(1, Math.floor(Math.max(200, gd.clientWidth - 20) / (44 + 6.4 * Math.max(0, ...legendNames.map((n) => n.length))))));
  const legendHeight = rows ? rows * 19 + 16 : 0;
  const lens = gd.closest('.lens-view');
  const scrollsItself = lens && getComputedStyle(lens).overflowY !== 'visible';
  const minPlot = window.innerWidth > 1100 ? 450 : 360;
  const frame = PLOT_MARGIN_TOP + 52 + legendHeight;
  const room = scrollsItself ? lens.clientHeight - (gd.getBoundingClientRect().top - lens.getBoundingClientRect().top + lens.scrollTop) - 14 : null;
  const height = scrollsItself ? Math.round(Math.max(minPlot + frame, Math.min(640 + legendHeight, room))) : fit.height;
  gd.style.height = `${height}px`;
  gd._legendNames = legendNames;
  gd._workspace = true;
  const layout = {
    height,
    margin: { l: 64, r: beside ? 8 : 16, t: PLOT_MARGIN_TOP, b: 52 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: ink, family: 'system-ui, sans-serif', size: 12 },
    xaxis: { title: { text: `${axisTitle(xD)}${p.xLog ? ' · log' : ''}` }, type: p.xLog ? 'log' : 'linear', automargin: true, gridcolor: grid, zeroline: false, range: axisRange(xSpan, p.xLog), autorange: false },
    yaxis: { title: { text: `${axisTitle(yD)}${p.yLog ? ' · log' : ''}` }, type: p.yLog ? 'log' : 'linear', automargin: true, gridcolor: grid, zeroline: false, range: axisRange(ySpan, p.yLog), autorange: false },
    shapes, annotations, showlegend: legendNames.length > 0, legend,
    dragmode: 'zoom', hovermode: 'closest',
  };
  anchorRequirementLabels(req.requirementLabels, layout.xaxis.range);
  // The better side of the line, said in words at the plot's corner.
  if (index && L?.drawable && view === 'decision') {
    annotations.push({ xref: 'paper', yref: 'paper', x: L.orientation === 'direct' ? 0.01 : 0.99, y: L.orientation === 'direct' ? 0.99 : 0.01,
      xanchor: L.orientation === 'direct' ? 'left' : 'right', yanchor: L.orientation === 'direct' ? 'top' : 'bottom', showarrow: false,
      text: L.orientation === 'direct' ? '↖ better: above the line' : 'better: below the line ↘', font: { size: 11, color: '#1f5f8b' }, bgcolor: 'rgba(255,255,255,.6)' });
  }
  wireResize();
  gd._labelPlan = { ...labelPlan, annotations };
  let pending = null;
  const relabel = () => { clearTimeout(pending); pending = setTimeout(() => placeLabels(gd), 30); };
  Plotly.newPlot(gd, traces, layout, { displaylogo: false, responsive: false, modeBarButtonsToRemove: ['select2d'] }).then(relabel);
  for (const event of ['plotly_afterplot', 'plotly_relayout', 'plotly_restyle']) gd.on(event, relabel);
  gd.setAttribute('aria-label', `${view === 'overview' ? 'Material overview' : 'Decision products'}: ${yD.plain} against ${xD.plain}. The list beside the chart holds every mark.`);

  gd.on('plotly_click', (ev) => {
    const pt = ev.points?.[0];
    const c = pt?.customdata;
    if (!c) return;
    if (c[0] === 'estimate') return actions.inspect({ kind: 'estimate', key: c[2] });
    if (c[0] === 'material') return actions.inspect({ kind: 'material', key: c[1] });
    // A crowded spot: every mark within a few pixels of the one pressed, listed to choose from.
    const near = nearbyKeys(gd, pt, ws);
    actions.inspect(near.length > 1 ? { kind: 'nearby', keys: near } : { kind: 'pair', key: c[8] });
  });
  gd.on('plotly_selected', (ev) => {
    if (!ev?.points?.length) return;
    const ids = [...new Set(ev.points.map((pt) => (pt.customdata?.[0] === 'material' || pt.customdata?.[0] === 'estimate' ? pt.customdata[1] : pt.customdata?.[0])).filter(Boolean))];
    if (ids.length) actions.setFocus(ids);
  });
}

/** The marks drawn within 8 px of a pressed one, by their pixel positions on the drawn axes. */
function nearbyKeys(gd, pt, ws) {
  try {
    const xa = gd._fullLayout.xaxis, ya = gd._fullLayout.yaxis;
    const px = (q) => [xa.d2p(q.x.value), ya.d2p(q.y.value)];
    const [cx, cy] = [xa.d2p(pt.x), ya.d2p(pt.y)];
    const shown = new Set(gd._fullData.filter((t) => t.visible === true).flatMap((t) => (Array.isArray(t.customdata) ? t.customdata.map((c) => c?.[8]).filter(Boolean) : [])));
    return [...ws.pairs, ...ws.contextPairs].filter((q) => q.plottable && shown.has(q.key)).filter((q) => { const [x, y] = px(q); return Math.hypot(x - cx, y - cy) <= 8; }).map((q) => q.key);
  } catch { return []; }
}

function groupBy(list, key) {
  const m = new Map();
  for (const q of list) { const k = key(q); if (!m.has(k)) m.set(k, []); m.get(k).push(q); }
  return m;
}

// ------------------------------------------------------------------ what the chart shows, in words

/** What the marks mean, once, under the chart: only what is drawn. */
export function workspaceKey(state, ws, { view }) {
  const p = state.scenario.plot;
  const items = [];
  const g = (inner, extra = '') => `<svg class="key-glyph" viewBox="0 0 16 16" aria-hidden="true"${extra}>${inner}</svg>`;
  if (view === 'overview') {
    items.push(`${g('<rect x="2.5" y="3.5" width="11" height="9" fill-opacity=".15" stroke-width="1.2"/>')}Band: the span of a material's products on each axis (marginal; the corners are not products)`);
    items.push(`${g('<circle cx="8" cy="8" r="3"/>')}Dot: one product, in the state it is judged in`);
  } else {
    items.push(`${g('<circle cx="8" cy="8" r="5"/>')}Filled: a product ${state.scenario.constraints.length ? 'that meets every requirement' : ''}, in the state its answer is in`);
    if (p.layers?.unresolved) items.push(`${g('<circle cx="8" cy="8" r="4.5" fill="none" stroke-width="1.6"/>')}Hollow: could not be settled (context)`);
    if (p.layers?.failed) items.push(`${g('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke-width="1.6"/>')}Cross: fails a requirement (context)`);
    if (state.stage && p.layers?.setAside) items.push(`${g('<circle cx="8" cy="8" r="4.5" fill-opacity=".3" stroke-width="1"/>')}Pale: confirmed, set aside by the stage`);
    if (ws.decision.some((q) => q.x.uncertainty || q.y.uncertainty)) items.push(`${g('<path d="M8 2v12M5 2h6M5 14h6" fill="none" stroke-width="1.4"/>')}Whisker: the spread a source reports for that one measurement, as published; not the spread across products`);
    if (ws.objective.index && ws.line?.drawable) items.push(`${g('<path d="M2 13L14 3" fill="none" stroke-width="2"/>')}Line: one value of M; ${ws.line.orientation === 'direct' ? 'above' : 'below'} it is better`);
    if (p.layers?.front) items.push(`${g('<path d="M2 12h4V8h4V4h4" fill="none" stroke-width="1.6" stroke-dasharray="2 1.5"/>')}Staircase: the Pareto front of the confirmed product states (their recorded values; nothing between them is implied)`);
  }
  if (p.showEstimates && !state.estimates?.off) items.push(`${g('<rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke-width="1.4" stroke-dasharray="2.5 1.5"/>')}Dashed: estimated context, a likely range where no product publishes; never a point`);
  items.push(`${g('<path d="M2 8h12" fill="none" stroke-width="2" stroke-dasharray="3 2"/>', ' style="color:#a32b1f"')}Red dashed: a requirement on the axis`);
  return `<div class="ashby-key" role="group" aria-label="What the marks on the chart mean"><span class="key-head">Marks</span>${items.map((i) => `<span class="key-item">${i}</span>`).join('')}<span class="key-item key-note">Colour is polymer family, as the legend lists</span></div>`;
}

/** The chart's populations and what each range means, with every count in its own unit. */
export function readingNote(state, ws, { view }) {
  const p = state.scenario.plot;
  const c = ws.counts;
  const tested = state.scenario.constraints.length > 0;
  const est = state.estimates ?? { ranges: [], unavailable: [] };
  const lines = [];
  lines.push(view === 'overview'
    ? `<b>${materials(ws.materialSummaries.filter((s) => s.x && s.y).length)}</b> drawn as the span of their ${ws.materialSummaries[0]?.population === 'confirmed' ? 'confirmed' : 'judged'} products on each axis, over <b>${states(ws.materialSummaries.reduce((n, s) => n + s.paired.length, 0))}</b>.`
    : `<b>${states(c.decision.pairs)}</b> across <b>${materials(c.decision.materials)}</b> drawn${tested ? ', each meeting every requirement in the state it is drawn in' : '; nothing is screened until a requirement is asked'}${state.stage ? ', as the stage kept them' : ''}.`);
  if (c.confirmed.evidence < c.confirmed.pairs) lines.push(`Twins that print one sheet share its values, so ${states(c.confirmed.pairs)} rest on ${c.confirmed.evidence} distinct pairs of values.`);
  if (c.gaps.products) lines.push(`${states(c.gaps.products)} ${tested ? 'that pass' : ''} cannot be drawn on these axes, and are listed beside the chart with why.`);
  if (c.offLog) lines.push(`${states(c.offLog)} ha${c.offLog === 1 ? 's' : 've'} a value at or below zero, which a Log axis cannot show; switch that axis to Linear to see ${c.offLog === 1 ? 'it' : 'them'}.`);
  if (c.materialsWithoutProducts) lines.push(`${materials(c.materialsWithoutProducts)} ha${c.materialsWithoutProducts === 1 ? 's' : 've'} no product, so nothing to draw.`);
  const ctxLine = [p.layers?.unresolved ? `${states(c.unresolved.pairs)} unresolved (hollow)` : null, p.layers?.failed ? `${states(c.failed.pairs)} that fail (crosses)` : null,
    state.stage && p.layers?.setAside ? `${states(c.setAside.pairs)} set aside by the stage (pale)` : null].filter(Boolean);
  if (ctxLine.length) lines.push(`Context drawn: ${ctxLine.join(', ')}${c.contextMaterials ? `, some from ${materials(c.contextMaterials)} not in the results` : ''}. Context is never ranked, counted on the line or on the front.`);
  if (p.showEstimates && !est.off) {
    const why = { conditioned: 'describe dry products, not the conditioned state asked', 'open-ended': 'are open at one end', 'off-log': 'reach zero, which a Log axis cannot show', 'cost-axis': 'cannot be a cost per volume, which is one product\'s own', 'other-axis-missing': 'have nothing on the other axis' };
    const un = groupBy(est.unavailable, (u) => u.reason);
    lines.push(`<b>Estimated context:</b> ${materials(est.ranges.length)} with no product publishing on an axis, drawn dashed as the model's likely range, with a measured axis as its products' span. Two marginal ranges are not a joint region, and neither is a candidate.${un.size ? ` Not drawn: ${[...un.entries()].map(([k, list]) => `${list.length} that ${why[k] ?? k}`).join('; ')}.` : ''}`);
  } else if (est.ranges.length) lines.push(`${materials(est.ranges.length)} ha${est.ranges.length === 1 ? 's' : 've'} only an estimated range on one of these axes; tick <b>Estimated context</b> to see ${est.ranges.length === 1 ? 'it' : 'them'} as context.`);
  if (ws.objective.index && ws.line?.drawable) lines.push(`<b>The line</b> is one value of M = ${esc(formulaText(ws.objective.index))} across these axes; its count is of the product states drawn (equality counts), and ${ws.line.orientation === 'direct' ? 'above' : 'below'} it is better. The material ranking beside the chart is a separate summary: each material by the median M of its ${state.stage ? 'kept' : 'passing'} products, ${ws.line.rankedAbove} of them at or above this line.`);
  lines.push('<b>Ranges mean different things:</b> a material band is the spread across its products; a whisker is the spread a source reports for one measurement, as published; a dashed range is a model\'s likely interval; the engine\'s screening bounds are in the inspector, never drawn as a range.');
  if (state.scenario.rankBy && ws.objective.index?.costForm) lines.push(`${esc(PRICE_CAVEAT.replace('{n} of {total} materials', 'observed Canadian listings'))} Cost per volume is each product's own CAD/kg price, dated, times its own density; shipping is excluded and no other currency is converted.`);
  if ((p.focus ?? []).length) lines.push(`<b>Focused</b> on ${materials(p.focus.length)}: a view only, which changes no answer or count. <button type="button" class="link-btn" data-focus-reset>Show all</button>`);
  return `<details class="legend-note ws-reading" open><summary>Reading this chart</summary><p>${lines.join(' ')}</p></details>`;
}

// ------------------------------------------------------------------ exports

/** The records a coordinate rests on: its measurement, and a cost's price listings beside its density's measurement. */
const recordsOf = (a) => [a.measurementId, ...(a.priceIds ?? [])].filter(Boolean).join(' ');
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** The data behind the picture: every mark with its identity, state, inputs and verdict, under a header that says what
 * the question, the axes, the line, the stage and each population were (D107). */
export function chartDataCSV(state, ws, { view }) {
  const { db, scenario } = state;
  const p = scenario.plot;
  const xD = axisDef(p.x), yD = axisDef(p.y);
  const index = ws.objective.index;
  const est = state.estimates ?? { ranges: [], unavailable: [] };
  const header = [
    '# H2C Material Selector: Ashby chart data',
    `# release ${db.meta.release?.id ?? 'unidentified'} (database snapshot ${db.meta.snapshot}, application build ${db.meta.build})`,
    `# view: ${view === 'overview' ? 'material overview' : 'decision products'}; each product in the state its answer is in (D107)`,
    `# products judged ${scenario.anneal ? `as printed, or annealed at the schedule each sheet states${scenario.annealMaxC ? ` up to ${scenario.annealMaxC} C` : ''}` : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned' : 'dry'}`,
    ...(scenario.constraints.length ? scenario.constraints.map((c) => `# ${c.mandatory === false ? 'tracked' : 'required'}: ${describeConstraint(c)}`) : ['# no requirements set: nothing was screened']),
    `# x: ${xD.plain} (${xD.unit}), ${p.xLog ? 'log' : 'linear'}; y: ${yD.plain} (${yD.unit}), ${p.yLog ? 'log' : 'linear'}`,
    ...(index ? [`# goal: ${index.designCase}, M = ${index.formula}; materials ranked by the median M of their ${state.stage ? 'kept' : 'passing'} products`,
      ws.line?.M !== null && ws.line?.M !== undefined ? `# line at M = ${ws.line.M}: ${ws.line.above.pairs} product states across ${ws.line.above.materials} materials at or above it (equality included)` : '# line: not placed'] : ['# goal: none (a property comparison)']),
    ...(state.stage?.steps ?? []).map((st) => `# objective stage: keep ${st.index} M >= ${st.cutoff}: ${st.products} product states across ${st.materials} materials kept`),
    `# populations: ${ws.counts.decision.pairs} decision product states across ${ws.counts.decision.materials} materials; ${ws.counts.gaps.products} confirmed not drawable on these axes; ${ws.counts.offLog} off a log axis; ${ws.counts.unresolved.pairs} unresolved and ${ws.counts.failed.pairs} failing context marks; ${est.ranges.length} estimate context ranges (${est.unavailable.length} unavailable)`,
    '# ranges: a material band is the spread across its products (marginal, joint combinations unknown); an uncertainty is the source\'s own statistic as published; an estimate is the model\'s likely (80%) interval; screening bounds are the engine\'s, apart',
    ...(p.x === COST_AXIS || p.y === COST_AXIS ? ['# cost per volume: the product\'s own CAD/kg price (observed listings, dated) x its own density; shipping excluded; no currency conversion'] : []),
  ];
  const cols = ['Layer', 'MaterialID', 'Material', 'GradeID', 'Product', 'State', 'Verdict', 'Kept by stage', `X ${xD.plain} (${xD.unit})`, 'X measurement or price', 'X from state', `Y ${yD.plain} (${yD.unit})`, 'Y measurement or price', 'Y from state',
    ...(index ? ['Goal M', 'Material rank', 'At or above the line'] : []), 'On the front', 'Why not drawn'];
  const aboveKeys = new Set(ws.line?.above.keys ?? []);
  const front = new Set(ws.frontier);
  const rows = [];
  const layerOf = (q) => (q.bucket === 'confirmed' ? (q.retained === false ? 'set-aside' : q.plottable ? 'decision' : 'gap') : q.bucket);
  for (const q of [...ws.pairs, ...ws.contextPairs]) {
    const rank = ws.ranking?.byMaterial.get(q.materialId);
    const gap = ws.gaps.find((g) => g.key === q.key);
    rows.push([layerOf(q), q.materialId, q.name, q.gradeId, q.product, stateWords(q.state), q.verdict, q.retained === null ? '' : q.retained ? 'yes' : 'no',
      q.x.value ?? '', recordsOf(q.x), q.x.sourceStateId ?? '', q.y.value ?? '', recordsOf(q.y), q.y.sourceStateId ?? '',
      ...(index ? [q.M ?? '', q.bucket === 'confirmed' && rank ? rank.place : '', aboveKeys.has(q.key) ? 'yes' : ''] : []), front.has(q.key) ? 'yes' : '',
      gap ? (gap.offLog ? 'off a log axis' : gap.missing.map((m) => missingWords(m, axisDef(m.key))).join('; ')) : ''].map(csvCell).join(','));
  }
  for (const e of est.ranges) {
    rows.push(['estimate context', e.materialId, e.name, '', '', e.state, e.verdict ?? '', '', `${e.x.lo}-${e.x.hi} (${e.x.kind})`, '', '', `${e.y.lo}-${e.y.hi} (${e.y.kind})`, '', '',
      ...(index ? [e.sensitivity ? `${e.sensitivity.lo}-${e.sensitivity.hi} (sensitivity, not a rank)` : '', '', ''] : []), '', ''].map(csvCell).join(','));
  }
  return [...header, cols.map(csvCell).join(','), ...rows].join('\n');
}

/** The chart as a PNG, with a caption of what it is: release, question, axes and scales, line, stage and ranges. */
export async function chartImage(gd, state, ws, { view }) {
  const { db, scenario } = state;
  const p = scenario.plot;
  const index = ws.objective.index;
  const caption = [
    `H2C Material Selector · release ${db.meta.release?.id ?? 'unidentified'} · ${view === 'overview' ? 'material overview' : 'decision products'}: each product in the state it is judged in`,
    `${scenario.constraints.length ? scenario.constraints.filter((c) => c.mandatory !== false).map(describeConstraint).join('; ') : 'No requirements'} · judged ${scenario.anneal ? 'as printed or annealed' : 'as printed'}, ${scenario.moisture === 'conditioned' ? 'conditioned' : 'dry'}`,
    `${axisDef(p.y).plain} (${p.yLog ? 'log' : 'linear'}) against ${axisDef(p.x).plain} (${p.xLog ? 'log' : 'linear'}) · ${ws.counts.decision.pairs} product states across ${ws.counts.decision.materials} materials; ${ws.counts.gaps.products} not drawable, ${ws.counts.offLog} off log`,
    index ? `Goal ${index.designCase}, M = ${index.formula}${ws.line?.M ? ` · line at ${sig(ws.line.M)}: ${ws.line.above.pairs} product states across ${ws.line.above.materials} materials at or above` : ''}${(state.stage?.steps ?? []).map((s) => ` · stage kept M ≥ ${sig(s.cutoff)}: ${s.products} states`).join('')}` : 'No goal: a property comparison',
    'Bands: spread across products (marginal). Whiskers: source statistic as published. Dashed: model likely range. Context layers are never ranked.',
  ].map(esc).join('<br>');
  const layout = { ...gd.layout, margin: { ...gd.layout.margin, t: 110 },
    annotations: [...(gd.layout.annotations ?? []), { xref: 'paper', yref: 'paper', x: 0, y: 1, xanchor: 'left', yanchor: 'bottom', yshift: 14, align: 'left', showarrow: false, text: caption, font: { size: 10 } }],
    paper_bgcolor: '#ffffff', plot_bgcolor: '#ffffff', font: { ...gd.layout.font, color: '#1a1a18' } };
  const url = await Plotly.toImage({ data: gd.data, layout }, { format: 'png', width: Math.max(900, gd.clientWidth), height: (gd.layout.height ?? 560) + 100 });
  const a = document.createElement('a');
  a.href = url; a.download = `h2c-ashby-${db.meta.snapshot}-${db.meta.release?.id ?? 'release'}.png`;
  document.body.appendChild(a); a.click(); a.remove();
}

export { estimateContext };
