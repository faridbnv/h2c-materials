// The Ashby lens (D107, D108): an engineering selection exercise.
//
// The engineer states the part and its goal, screens products that can meet the requirements in a state the scenario
// permits, moves the goal's line over those same products, reads the variation and the estimates, and keeps exact
// products with their evidence. The chart, its result list, the table, the comparison and the exports tell one story
// because they read one model (engine/workspace.js, ui/decision.js).
//
// Two work views: Products (each product in the state its answer is in) and Material ranges (each material as the middle
// half of its products). The catalogue and evidence views of before, which draw published values independent of the
// state a product is judged in, stay for research, under More, and say what they are.
//
// Rules enforced here (D108):
//  - one control row that looks the same in every view: the view, the axes by name alone, Show and More; an item that
//    does not apply is greyed with its reason, never removed, and no menu's words change as the reader works;
//  - the filter rail is the one place a requirement is set; the chart draws each one, and its label opens the rail;
//  - the goal's line is a guide: it moves over the products and says how many are on its better side, and filters none;
//  - a count of marks is said one way: "N products from K materials";
//  - context (failed and unresolved products, estimates, references) is drawn only when asked, never ranked.

import { rankingFor } from '../engine/indices.js';
import { paretoFront, sortFront } from '../engine/pareto.js';
import { WORKSPACE_VIEWS } from '../engine/scenario.js';
import { COST_AXIS, goalAxes } from '../engine/workspace.js';
import { buildFamilyColors, FILLER_SYMBOL, FILLER_LABEL, esc, fmtNumber, fmtRange, wireEvidence } from './format.js';
import { download } from './table.js';
import { AXIS_DEFS, measurementMatches, pairCompatibility } from './axes.js';
import { prop } from './labels.js';
import { headlineDef } from './registry.js';
import {
  chartFit, wireResize, placeLabels, axisRange, hexToRgba, errorBars, requirementOverlay, anchorRequirementLabels,
  referenceOverlay, anchorTrace, chartTheme, spans, NO_LABEL, LABEL_FONT, PLOT_MARGIN_TOP,
} from './chart.js';
import {
  workspaceFor, questionStrip, starter, lineControl, toolbar, resultsPanel, drawWorkspacePlot, workspaceKey, readingNote,
  chartDataCSV, chartImage, estimateContext, pairList, openFolds, lineCount,
} from './decision.js';

export { chartFit, chooseLabels, labelBox } from './chart.js';

/** The lens's views, work views first. The evidence views draw published values and say so. */
export const VIEWS = [
  { id: 'decision', label: 'Products', help: 'Each product that meets the requirements, in the state its answer is in.' },
  { id: 'overview', label: 'Material ranges', help: 'Each material as the middle half of its products on each axis, whiskers to the extremes; its products as dots.' },
  { id: 'catalogue', label: 'Catalogue: typical published values', help: 'One point per material at its typical published values, with its products\' spread.', evidence: true },
  { id: 'measured', label: 'Test pairs: matched conditions', help: 'Two measurements of one product in one condition, from one document: moisture, treatment, specimen and direction agree.', evidence: true },
  { id: 'measured-mixed', label: 'Test pairs: mixed conditions', help: 'Every pair of one product\'s measurements; each mismatch is named and drawn hollow. Exploration, never a decision.', evidence: true },
];
/** The view a plot names, or the decision view. */
export const viewOf = (p) => (WORKSPACE_VIEWS.includes(p?.view) ? p.view : 'decision');

/** Celsius axes open on a linear scale: a glass transition below 0 °C has no logarithm (D92). */
const LINEAR_BY_DEFAULT = (key) => AXIS_DEFS.find((a) => a.key === key)?.unit === '°C';

export function renderAshby(host, state, actions) {
  const { scenario } = state;
  const p = scenario.plot;
  const view = viewOf(p);
  const work = view === 'decision' || view === 'overview';
  // The evidence views have no derived cost axis: a cost per volume is one product's own.
  if (!work && (p.x === COST_AXIS || p.y === COST_AXIS)) Object.assign(p, p.x === COST_AXIS ? { x: 'density' } : { y: 'tensileModulusXY' });
  const focusKey = host.contains(document.activeElement) ? document.activeElement.dataset?.focus : null;

  const ws = workspaceFor(state);
  const index = ws.objective.index;
  // Estimated context follows the page's one rule for estimates: shown under Include uncertain with estimates on, and never
  // under Confirmed only, which is measured evidence alone everywhere on the page. Within that, the chart's switch only
  // draws them; the engine's use of them is its own setting and is unchanged (D107).
  state.estimates = state.ctx.showEstimates
    ? estimateContext(state.examined ?? state.rows, state.ctx, { xKey: p.x, yKey: p.y, xLog: !!p.xLog, yLog: !!p.yLog, index, orientation: ws.objective.orientation })
    : { ranges: [], unavailable: [], off: true };
  // The starter until the reader has asked something here: a goal, a requirement, or "compare properties".
  const showStarter = work && !scenario.constraints.length && !scenario.rankBy && !state.ashbyStarted;
  const legacy = work ? null : legacyView(state, view);

  host.innerHTML = `<div class="ws" data-ws-view="${view}">
    ${questionStrip(state, ws)}
    ${showStarter ? starter(state) : ''}
    <div class="ws-body">
      <section class="ws-chart" aria-label="Chart">
        ${toolbar(state, { view, estimates: legacy?.estimates ?? null })}
        ${work ? lineControl(state, ws) : ''}
        ${legacy?.notices ? `<div class="ashby-notices">${legacy.notices}</div>` : ''}
        <div id="plot" role="img" aria-label="Ashby chart"></div>
        ${work ? workspaceKey(state, ws, { view }) : legacy.key}
        ${work ? readingNote(state, ws, { view }) : legacy.reading}
      </section>
      ${resultsPanel(state, ws)}
    </div>
  </div>`;

  if (work) drawWorkspacePlot(host, state, ws, actions, { view });
  else drawLegacyPlot(host, state, { xDef: legacy.xDef, yDef: legacy.yDef, pts: legacy.pts, envelopes: legacy.envelopes, actions });
  wireControls(host, state, actions, ws, { view });

  // The lens is rebuilt on every change, as the filter rail is. Keep the reader's place, so a keyboard user who changes
  // an axis is not thrown back to the top of the page.
  if (focusKey) host.querySelector(`[data-focus="${focusKey}"]`)?.focus();
  if (state.inspectFocus) { state.inspectFocus = false; host.querySelector('.ws-inspector')?.focus({ preventScroll: false }); }
}

// ------------------------------------------------------------------ the catalogue and evidence views

/**
 * What a catalogue or evidence view draws, and its own controls and notes. These are the chart as it was before D107:
 * published values, independent of the state a product is judged in, kept for research and said to be so.
 */
function legacyView(state, view) {
  const { reference, rows, scenario } = state;
  const p = scenario.plot;
  const xDef = AXIS_DEFS.find((a) => a.key === p.x) ?? AXIS_DEFS[0];
  const yDef = AXIS_DEFS.find((a) => a.key === p.y) ?? AXIS_DEFS[1];
  const level = view === 'catalogue' ? 'material' : view;
  const measurementMode = level !== 'material';
  const { pts: all, mixed, unavailable, conflicting = 0 } = measurementMode
    ? measurementPoints(rows, xDef, yDef, level === 'measured-mixed' ? 'broad' : 'strict', state.ctx)
    : headlinePoints(rows, xDef, yDef);
  // Only in the catalogue view: at measurement level every point is already a real measurement.
  const ranges = measurementMode ? [] : estimateEnvelopes(rows, xDef, yDef, state.ctx?.showEstimates);
  // A value at or below zero has no logarithm (a glass transition below 0 °C, D92): on a Log axis a point or a range
  // that reaches one is not drawn, never counts as plotted, estimated or on the front, and the note says how many
  // candidates it leaves off.
  const loggable = (q) => (!p.xLog || q.x > 0) && (!p.yLog || q.y > 0);
  const rangeLoggable = (q) => (!p.xLog || q.x.lo > 0) && (!p.yLog || q.y.lo > 0);
  const pts = all.filter(loggable);
  const estimated = ranges.filter(rangeLoggable);
  const offLog = new Set([...all.filter((q) => !loggable(q) && !pts.some((d) => d.id === q.id)), ...ranges.filter((q) => !rangeLoggable(q))]
    .map((q) => q.id)).size;
  const envelopes = p.showEstimates ? estimated : [];
  const subjects = new Set(pts.map((q) => q.id)).size;
  const frontSize = paretoFront(pts.filter((q) => q.evaluation.eligible), xDef.better, yDef.better).length;
  const missing = rows.length - subjects - offLog - estimated.length;
  const thin = pts.length < 10;
  const grades = new Set(pts.map((q) => q.yh?.gradeId ?? q.xh?.gradeId).filter(Boolean)).size;

  const notices = [
    unavailable ? `<div class="warn-chip">${esc(unavailable)}</div>` : '',
    thin && !unavailable ? `<div class="warn-chip">Only ${pts.length} point${pts.length === 1 ? '' : 's'} can be drawn for this pair. Read this chart with care.</div>` : '',
    p.showReference ? `<div class="banner">${esc(reference.meta.caveat)}</div>` : '',
    mixed && mixed.length ? `<div class="banner"><span><b>Some of these were measured a different way</b>
      from the axis definition or from each other: ${esc(mixed.join('; '))}. They are drawn hollow, and pointing at or
      tapping one names the mismatch. They are included so the trade space can be seen whole, never merged into
      a headline, a rank or a decision.</span></div>` : '',
  ].join('').trim();
  const reading = `<div class="legend-note">
      <h3>Reading this chart</h3>
      ${measurementMode
        // What a reader has to be told before this chart means anything: a dot is a test, not a
        // material. Without that sentence a cluster of six dots reads as six materials, or as noise.
        // A dot pairs two recorded measurements of the same grade taken under compatible conditions.
        // The source rarely says both came from one specimen, so a dot is not claimed to be one test.
        ? `<b>Each dot pairs two measurements of one product, not one material.</b> ${pts.length} pair${pts.length === 1 ? '' : 's'}
           of ${grades} product${grades === 1 ? '' : 's'} across ${subjects} of ${rows.length} materials. ${level === 'measured'
             ? `Both values were recorded for the same product in one condition, from one document: moisture, treatment, specimen and direction agree or are unstated (and then said so on hover), never contradictory.${conflicting ? ` ${conflicting} pair${conflicting === 1 ? '' : 's'} with an explicit contradiction ${conflicting === 1 ? 'is' : 'are'} left out; the mixed view names ${conflicting === 1 ? 'it' : 'them'}.` : ''}`
             : 'Every pair of one product\'s measurements is drawn; each mismatch is named, and none is a decision.'}
           Not necessarily one specimen, so dots are not independent tests. Where a material has more than one pair,
           its dots are joined by a faint line. That spread is real: the same material measures
           differently by grade and by print direction, and the wider the spread, the less any single
           headline number tells you.
           ${level === 'measured-mixed' ? '<br><b>Hollow dots</b> were measured a different way from the axis definition or from each other, for example in another print direction or moisture state. Pointing at or tapping one names the mismatch.' : ''}`
        : `${pts.length} of ${rows.length} candidates plotted${missing ? `, ${missing} lack one or both properties and are not drawn as zero` : ''}.
           Each point is a material at its typical published values, as printed and dry, whatever state the question judges its products in: the decision view draws those states.`}
      ${offLog ? `<br><b>${offLog} more candidate${offLog === 1 ? ' has' : 's have'}</b> a value at or below zero, which a Log axis
        cannot show. Not drawn; switch that axis to Linear to see ${offLog === 1 ? 'it' : 'them'}.` : ''}
      Colour is polymer family, marker shape is filler class.
      ${estimated.length && !p.showEstimates
        ? `<br><b>${estimated.length} more candidate${estimated.length === 1 ? ' has' : 's have'}</b> no measurement of
           ${estimated.length === 1 ? 'its' : 'their'} own on one of these axes, only an estimated range. Not drawn. Tick
           <b>Estimated ranges</b> under Show to see where ${estimated.length === 1 ? 'it falls' : 'they fall'}.`
        : ''}
      ${envelopes.length ? `<br><b>The outlined ranges</b> are ${envelopes.length} material${envelopes.length === 1 ? '' : 's'}
        with no measurement of their own on one of these axes. Each is the estimate's likely (80%) range,
        built from the material's own related measurements and its polymer family, beside its products' measured span on
        the other axis. Two marginal ranges, not a joint region: it never joins the frontier and never counts as a plotted candidate.` : ''}
      ${frontSize > 1 ? `<br><b>The dotted line</b> joins the materials that nothing else beats on
        both axes at once, at their typical values: ${esc(prop(xDef.key).plain.toLowerCase())} ${xDef.better === 'max' ? 'higher' : 'lower'} is better,
        ${esc(prop(yDef.key).plain.toLowerCase())} ${yDef.better === 'max' ? 'higher' : 'lower'} is better.` : ''}
    </div>`;
  return { xDef, yDef, pts, envelopes, estimates: { count: estimated.length, measured: measurementMode }, notices, reading, key: markerKey({ pts, envelopes, level, anchor: drawnAnchor(state, xDef, yDef) }) };
}

/** The familiar filament drawn as a cross, when it has both values; null otherwise. */
function drawnAnchor(state, xDef, yDef) {
  const anchor = state.baseline ? state.db.materials.find((q) => q.id === state.baseline) : null;
  return anchor && anchor.headline[xDef.key]?.known && anchor.headline[yDef.key]?.known ? anchor : null;
}

// Small drawings of the chart's marks, in the ink colour, for the key.
const GLYPH = {
  'circle': '<circle cx="8" cy="8" r="5"/>',
  'diamond': '<path d="M8 2.5 13.5 8 8 13.5 2.5 8z"/>',
  'square': '<rect x="3.5" y="3.5" width="9" height="9"/>',
  'triangle-up': '<path d="M8 3 13.5 13h-11z"/>',
  'star': '<path d="M8 2.2l1.7 3.9 4.2.4-3.2 2.8.9 4.1L8 11.3l-3.6 2.1.9-4.1-3.2-2.8 4.2-.4z"/>',
  'circle-open': '<circle cx="8" cy="8" r="4.5" fill="none" stroke-width="1.6"/>',
};
const glyph = (inner, extra = '') => `<svg class="key-glyph" viewBox="0 0 16 16" aria-hidden="true"${extra}>${inner}</svg>`;

/**
 * What the marks mean, once, under the chart: the shape of each filler class drawn, and whichever of the pale, hollow,
 * estimated and reference marks are on it. The legend had carried shapes as 40-odd family and filler rows, and nothing
 * on the page said what a hollow point, a capped dotted line or a dotted box was; those were found by pointing at them.
 */
function markerKey({ pts, envelopes, level, anchor }) {
  const fillers = Object.keys(FILLER_SYMBOL).filter((f) => pts.some((q) => q.filler === f));
  const items = fillers.map((f) => `<span class="key-item">${glyph(GLYPH[FILLER_SYMBOL[f]])}${esc(FILLER_LABEL[f])}</span>`);
  if (pts.some((q) => q.evaluation.verdict !== 'PASS' && !q.assumed && !q.relaxed.length)) {
    items.push(`<span class="key-item">${glyph(GLYPH.circle, ' style="opacity:.55"')}Pale: did not pass every requirement</span>`);
  }
  if (level === 'measured-mixed' && pts.some((q) => q.relaxed.length)) {
    items.push(`<span class="key-item">${glyph('<circle cx="8" cy="8" r="4.5" fill-opacity=".45" stroke-width="2"/>')}Hollow: a mixed-condition pair, measured a different way</span>`);
  }
  if (pts.some((q) => q.assumed)) {
    items.push(`<span class="key-item">${glyph(GLYPH.circle, ' style="opacity:.3"')}Faint: a scenario assumption, not measured</span>`);
  }
  if (envelopes.some((q) => q.x.measured !== q.y.measured && (q.x.lo === q.x.hi || q.y.lo === q.y.hi))) {
    items.push(`<span class="key-item">${glyph('<path d="M2.5 8h11M2.5 5v6M13.5 5v6" fill="none" stroke-width="1.6" stroke-dasharray="2 1.5"/>')}Capped dotted line: one axis estimated, the other measured</span>`);
  }
  if (envelopes.some((q) => q.x.measured !== q.y.measured && q.x.lo !== q.x.hi && q.y.lo !== q.y.hi)) {
    items.push(`<span class="key-item">${glyph('<rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke-width="1.4" stroke-dasharray="2 1.5"/>')}Dotted box: one axis estimated, the other its products' measured span (marginal ranges; joint combinations not known)</span>`);
  }
  if (envelopes.some((q) => !q.x.measured && !q.y.measured)) {
    items.push(`<span class="key-item">${glyph('<rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke-width="1.4" stroke-dasharray="2 1.5"/>')}Dotted box: both axes estimated</span>`);
  }
  if (anchor) {
    items.push(`<span class="key-item">${glyph('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" fill="none" stroke-width="1.8"/>', ' style="color:#1f5f8b"')}Cross: ${esc(anchor.name)}, a familiar filament for reference, not a candidate</span>`);
  }
  if (!items.length) return '';
  return `<div class="ashby-key" role="group" aria-label="What the marks on the chart mean">
    <span class="key-head">Marks</span>${items.join('')}<span class="key-item key-note">Colour is family, as the legend lists</span></div>`;
}

/**
 * Materials the chart cannot draw as a point, because at least one axis is an estimate rather
 * than a measurement.
 *
 * These used to vanish: a quarter of the in-scope set silently absent from the picture the tool
 * exists to draw, while the table two tabs away listed their estimated span. And in Explore an
 * estimate can screen a material out of a requirement, so a reader could see a material screened by
 * an estimate and find no trace of that estimate on the chart.
 *
 * They are drawn as an envelope rather than a dot. A dot would need a value, and the centre of an
 * estimate is a number nobody measured — the one thing this tool refuses to put on a chart.
 * The envelope says what is actually known: somewhere in here.
 */
function estimateEnvelopes(rows, xDef, yDef, useEstimates) {
  if (!useEstimates) return [];
  const span = (h) => {
    // A measured side is its products' span, never frozen at their median (the review of 2026-09-28, A06): PA6's density
    // is 1130 to 1200 kg/m³ across seven products, and an estimated stiffness beside it spans all of that.
    if (h?.known) {
      const s = h.spread;
      return !h.assumption && s && Number.isFinite(s.min) && Number.isFinite(s.max) && s.min !== s.max
        ? { lo: s.min, hi: s.max, measured: true, products: s.n ?? null } : { lo: h.value, hi: h.value, measured: true };
    }
    const e = h && h.estimate;
    // An open end cannot be drawn as a box edge; such an estimate is left to the table and drawer.
    return e && e.lo !== null && e.hi !== null ? { lo: e.lo, hi: e.hi, measured: false, basis: e.basis, strength: e.strength, precision: e.precision } : null;
  };
  const out = [];
  for (const { material: m, evaluation: ev } of rows) {
    const x = span(m.headline[xDef.key]);
    const y = span(m.headline[yDef.key]);
    if (!x || !y) continue;
    if (x.measured && y.measured) continue;   // a real point; drawn by headlinePoints
    out.push({ id: m.id, name: m.name, family: m.family, material: m, evaluation: ev, x, y });
  }
  return out;
}

/**
 * A material as a bubble (D83): the middle half of its products on each axis (their full range where fewer than four
 * publish it), with whiskers to the extremes through the typical value. Behind the points, never a point itself.
 */
function spreadTraces(pts, xDef, yDef, colors, colourGroup) {
  const out = [];
  const box = (s, v) => (!s ? [v, v] : s.q1 != null ? [s.q1, s.q3] : [s.min, s.max]);
  for (const q of pts) {
    const sx = q.xh?.spread, sy = q.yh?.spread;
    if (!sx && !sy) continue;
    const [x0, x1] = box(sx, q.x), [y0, y1] = box(sy, q.y);
    const color = colors.color(q.family);
    const hover = `<b>${esc(q.name)}</b><br>Spread of its products`
      + `${sx ? `<br>${esc(xDef.label)}: ${fmtNumber(sx.min)}–${fmtNumber(sx.max)} ${esc(xDef.unit)} (${sx.n})` : ''}`
      + `${sy ? `<br>${esc(yDef.label)}: ${fmtNumber(sy.min)}–${fmtNumber(sy.max)} ${esc(yDef.unit)} (${sy.n})` : ''}`
      + '<br><i>The box is the middle half of its products where four or more publish; the whiskers their extremes</i><extra></extra>';
    const common = { type: 'scatter', showlegend: false, legendgroup: colourGroup(q.family), hoverinfo: 'skip', name: `${q.name} spread` };
    if (x0 !== x1 && y0 !== y1) {
      out.push({ ...common, mode: 'lines', x: [x0, x1, x1, x0, x0], y: [y0, y0, y1, y1, y0], fill: 'toself',
        fillcolor: hexToRgba(color, 0.1), line: { color: hexToRgba(color, 0.45), width: 1 }, hoveron: 'fills', hoverinfo: 'text', text: hover.replace(/<extra><\/extra>$/, ''), hovertemplate: hover });
    }
    if (sx && sx.min !== sx.max) out.push({ ...common, mode: 'lines', x: [sx.min, sx.max], y: [q.y, q.y], line: { color: hexToRgba(color, 0.5), width: 1 } });
    if (sy && sy.min !== sy.max) out.push({ ...common, mode: 'lines', x: [q.x, q.x], y: [sy.min, sy.max], line: { color: hexToRgba(color, 0.5), width: 1 } });
  }
  return out;
}

/** One point per canonical material, using the same headline logic as the rest of the selector. */
function headlinePoints(rows, xDef, yDef) {
  const pts = rows
    .map(({ material: m, evaluation: e }) => ({
      id: m.id, name: m.name, family: m.family, filler: m.facets.reinforcement.value,
      material: m, evaluation: e, label: m.name,
      x: m.headline[xDef.key]?.known ? m.headline[xDef.key].value : null,
      y: m.headline[yDef.key]?.known ? m.headline[yDef.key].value : null,
      xh: m.headline[xDef.key], yh: m.headline[yDef.key],
      // A scenario assumption is drawn, marked and kept off the front: nobody measured it (audit 2026-09-15, A-02).
      assumed: !!(m.headline[xDef.key]?.assumption || m.headline[yDef.key]?.assumption),
      notes: [], relaxed: [],
    }))
    .filter((q) => q.x !== null && q.y !== null);
  return { pts, mixed: [], unavailable: null };
}

/**
 * Mode B from the brief: the evidence behind the points. One point per grade per compatible pair
 * of measurements, so anisotropy is visible instead of averaged away.
 */
function measurementPoints(rows, xDef, yDef, mode, ctx) {
  if (!xDef.measurement || !yDef.measurement) {
    const which = !xDef.measurement ? xDef.label : yDef.label;
    return { pts: [], mixed: [], conflicting: 0, unavailable: `${which} has no measurement-level data, only a material value. Choose the catalogue view, or another axis.` };
  }
  const pts = [];
  const mixed = new Set();
  // Whether a state changes each axis's value (the registry's flags, D99), and whether it asks a printed bar.
  const changes = (def) => { const h = headlineDef(def.key); return { moisture: h?.changesWithMoisture !== false, annealing: h?.changesWithAnnealing !== false, specimen: !!def.measurement?.direction }; };
  const inv = { a: changes(xDef), b: changes(yDef) };
  let conflicting = 0;

  for (const { material: m, evaluation: e } of rows) {
    const ms = ctx.measurementsByMaterial.get(m.id) ?? [];
    const xs = ms.map((x) => measurementMatches(x, xDef, mode)).filter(Boolean);
    const ys = ms.map((x) => measurementMatches(x, yDef, mode)).filter(Boolean);
    for (const xm of xs) {
      for (const ym of ys) {
        if (xm.measurement.gradeId !== ym.measurement.gradeId) continue;
        // Strict pairs describe one product in one condition (D107): an explicit contradiction of moisture, treatment,
        // specimen, direction or document keeps a pair out, and mixed exploration names it.
        const fit = pairCompatibility(xm.measurement, ym.measurement, mode, inv);
        if (!fit.ok) { conflicting++; continue; }
        const notes = [...new Set([...xm.notes, ...ym.notes, ...fit.missing, ...fit.basis])];
        // Only a genuine relaxation makes a point hollow or reaches the banner. An unstated
        // specimen form on an axis with no direction requirement is context, not a mismatch.
        const relaxed = [...new Set([...xm.relaxed, ...ym.relaxed, ...fit.conflicts])];
        relaxed.forEach((n) => mixed.add(n));
        pts.push({
          id: m.id, name: m.name, family: m.family, filler: m.facets.reinforcement.value,
          material: m, evaluation: e,
          label: `${m.name} · ${ym.measurement.direction !== 'not-applicable' ? ym.measurement.direction : ym.measurement.gradeId}`,
          x: xm.measurement.value, y: ym.measurement.value,
          xh: { value: xm.measurement.value, unit: xm.measurement.unit, measurementId: xm.measurement.id, gradeId: xm.measurement.gradeId, direction: xm.measurement.direction },
          yh: { value: ym.measurement.value, unit: ym.measurement.unit, measurementId: ym.measurement.id, gradeId: ym.measurement.gradeId, direction: ym.measurement.direction, uncertainty: ym.measurement.uncertainty },
          notes, relaxed,
        });
      }
    }
  }
  return { pts, mixed: [...mixed], conflicting, unavailable: pts.length ? null : 'No measurement matches both of these axes under the current setting. Try "Test pairs: mixed conditions", or a different pair of axes.' };
}

/**
 * A material-level estimate is a range, never a point. Scatter traces keep the range in ordinary
 * data coordinates, so Plotly applies linear and logarithmic transforms consistently. Layout
 * shapes require special log-axis coordinates and previously made the same estimate look or land
 * differently as the reader changed scale.
 */
export function estimateTrace(q, xDef, yDef, { color = '#8d8d84', fill = 'rgba(141,141,132,.025)', label = false, group = q.family } = {}) {
  const xEstimated = !q.x.measured;
  const yEstimated = !q.y.measured;
  const rangeText = (span, def) => (span.measured
    ? span.lo === span.hi ? `${fmtNumber(span.lo)} ${def.unit} (measured)` : `${fmtRange(span.lo, span.hi)} ${def.unit} (measured across ${span.products ?? 'its'} products)`
    : `${fmtRange(span.lo, span.hi)} ${def.unit} (estimated)`);
  const estimatedBy = [...new Set([q.x, q.y]
    .filter((span) => !span.measured)
    .map((span) => `${span.precision ?? 'unrated'} precision${span.basis ? `; ${span.basis}` : ''}`))];
  const hovertemplate = `<b>${esc(q.name)}</b><br><b>Estimated material range</b>`
    + `<br>${esc(yDef.label)}: ${esc(rangeText(q.y, yDef))}`
    + `<br>${esc(xDef.label)}: ${esc(rangeText(q.x, xDef))}`
    + `${estimatedBy.length ? `<br>${esc(estimatedBy.join(' · '))}` : ''}`
    + `<br><i>Not a measured point${xEstimated !== yEstimated && q.x.lo !== q.x.hi && q.y.lo !== q.y.hi ? '; marginal ranges, joint combinations not known' : ''}</i><extra></extra>`;

  let x, y, mode, marker, fillMode, hoveron, textposition, labelAt;
  // A box wherever both sides are ranges: two estimates, or an estimate beside its products' measured span.
  if (q.x.lo !== q.x.hi && q.y.lo !== q.y.hi) {
    x = [q.x.lo, q.x.hi, q.x.hi, q.x.lo, q.x.lo];
    y = [q.y.lo, q.y.lo, q.y.hi, q.y.hi, q.y.lo];
    mode = label ? 'lines+text' : 'lines';
    fillMode = 'toself';
    // Keep the nearly transparent interior from taking hover focus away from measured points.
    hoveron = 'points';
    textposition = 'top right';
    labelAt = 2;
  } else {
    const horizontal = q.x.lo !== q.x.hi;
    x = horizontal ? [q.x.lo, q.x.hi] : [q.x.lo, q.x.lo];
    y = horizontal ? [q.y.lo, q.y.lo] : [q.y.lo, q.y.hi];
    mode = label ? 'lines+markers+text' : 'lines+markers';
    marker = {
      size: 7, symbol: horizontal ? 'line-ns-open' : 'line-ew-open',
      color, line: { color, width: 1.5 },
    };
    textposition = horizontal ? 'middle right' : 'top center';
    labelAt = 1;
  }

  const text = x.map(() => '');
  if (label) text[labelAt] = q.name;
  return {
    type: 'scatter', mode, x, y, text, textposition, cliponaxis: false,
    textfont: { size: 11, color },
    line: { color, width: q.x.lo !== q.x.hi && q.y.lo !== q.y.hi ? 1.5 : 2.5, dash: 'dot' },
    // Plotly's data cleanup checks nested keys when marker is present. Omit unused
    // options entirely: marker: undefined makes range boxes abort the whole plot.
    ...(marker ? { marker } : {}),
    ...(fillMode ? { fill: fillMode, fillcolor: fill, hoveron } : {}),
    opacity: 0.82,
    name: q.name, legendgroup: group, showlegend: false,
    customdata: x.map(() => [q.id]), hovertemplate,
  };
}


function drawLegacyPlot(host, state, { xDef, yDef, pts, envelopes = [], actions }) {
  const { scenario, reference, db } = state;
  const p = scenario.plot;
  // The families a reader asked for take the first colours, so a family filtered for is never the grey "other".
  const asked = scenario.constraints.find((c) => c.kind === 'facet' && c.facet === 'family')?.in ?? [];
  const colors = buildFamilyColors(db.materials, [...asked, ...(p.promotedFamilies ?? [])]);

  // One trace per family+filler pair keeps colour and shape independent. The legend lists colours only, one entry per
  // family colour (the families past the palette share Other's), and a press on an entry hides every trace of that
  // colour. It used to list every family and filler pair, 40-odd rows in 10 px type with a scrollbar of their own; the
  // shapes, hollow points and estimate marks are explained once in the key under the chart.
  const colourGroup = (family) => (colors.isOther(family) ? 'Other families' : family);
  const groups = new Map();
  for (const q of pts) {
    const key = `${q.family}|${q.filler}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const eligibleForFront = pts.filter((q) => q.evaluation.eligible && !q.assumed);
  const frontNow = paretoFront(eligibleForFront, xDef.better, yDef.better);
  const measurementMode = pts.some((q) => !q.product && q.notes !== undefined && q.xh?.measurementId && q.yh?.measurementId);
  const shortlisted = new Set(scenario.shortlist);
  const frontIds = new Set(frontNow.map((q) => q.id));
  // What may carry a label, placed after the chart is drawn, where a label's size on screen is known (placeLabels).
  const labelPlan = { pins: [], points: [], envelopes: [], fixed: [] };

  // One label per material, not one per test.
  //
  // At measurement level a material contributes a dot per grade per direction, and labelling every
  // one stacked "PA6-CF · XY", "PA6-CF · Z", "PA6-CF · G050-01" on top of each other until the
  // chart was unreadable. The name goes on the leftmost dot of each material; the grade and
  // direction are on hover, where they belong.
  const labelled = new Set();
  const leftmostOf = new Map();
  for (const q of pts) {
    const cur = leftmostOf.get(q.id);
    if (!cur || q.x < cur.x) leftmostOf.set(q.id, q);
  }
  for (const q of leftmostOf.values()) labelled.add(q);

  const traces = [];

  // Put range traces behind measured points. Unlike layout shapes, scatter traces stay in ordinary
  // data coordinates on linear, semi-log and log-log charts and provide a real hover target.
  const labelEstimates = envelopes.length <= 5;
  for (const q of envelopes) {
    const familyColor = colors.color(q.family);
    const wantLabel = labelEstimates || shortlisted.has(q.id);
    const trace = estimateTrace(q, xDef, yDef, {
      color: familyColor,
      fill: hexToRgba(familyColor, 0.025),
      label: wantLabel,
      group: colourGroup(q.family),
    });
    if (wantLabel) {
      // Drawn without its name; placeLabels writes it back where it does not run into another label.
      const at = trace.text.findIndex(Boolean);
      labelPlan.envelopes.push({ trace: traces.length, index: at, name: q.name, x: trace.x[at], y: trace.y[at],
        positions: [trace.textposition], radius: trace.marker ? trace.marker.size / 2 : 0, shortlisted: shortlisted.has(q.id) });
      trace.text = trace.text.map(() => NO_LABEL);
    }
    traces.push(trace);
  }

  // A material's bubble, the spread of its products, sits behind its point (D83).
  if (pts.some((q) => q.xh?.spread || q.yh?.spread)) traces.push(...spreadTraces(pts.filter((q) => q.xh?.spread || q.yh?.spread), xDef, yDef, colors, colourGroup));

  for (const [key, list] of groups) {
    const [family, filler] = key.split('|');
    // A chart of anonymous dots cannot be read: the legend maps colour and shape to family and filler, not to a material.
    // But where points crowd, labels printed over each other named nothing (ASA-CF, PAHT-CF, PA6-CF, PA612-ESD and
    // CPE-CF in one smudge on the outdoor template). So every point is a candidate for a label, and placeLabels gives
    // one only where it fits; an unlabelled point keeps its name on hover. At measurement level only the leftmost dot of
    // a material is a candidate, one name per material. A shortlisted material is labelled by a leader line instead.
    list.forEach((q, i) => {
      if (measurementMode && !labelled.has(q)) return;
      const entry = { trace: traces.length, index: i, id: q.id, name: q.name, x: q.x, y: q.y, radius: 5.5 };
      if (shortlisted.has(q.id)) labelPlan.pins.push(entry);
      else labelPlan.points.push({ ...entry, front: frontIds.has(q.id) });
    });
    traces.push({
      type: 'scatter',
      mode: 'markers+text',
      text: list.map(() => NO_LABEL),
      textposition: list.map(() => 'top center'),
      textfont: { size: LABEL_FONT, color: 'rgba(107,107,99,.95)' },
      cliponaxis: false,
      name: `${family} · ${FILLER_LABEL[filler] ?? filler}`,
      legendgroup: colourGroup(family), showlegend: false,
      x: list.map((q) => q.x), y: list.map((q) => q.y),
      customdata: list.map((q) => [q.id, q.label, q.evaluation.verdict,
        q.xh.measurementId ?? '', q.yh.measurementId ?? '',
        q.yh.direction ?? '', q.yh.gradeId ?? '',
        q.assumed ? 'scenario assumption, not measured; not on the front'
          : q.relaxed.length ? 'mixed: ' + q.relaxed.join(', ')
          : q.notes.length ? q.notes.join(', ')
          : 'conditions match the axis definition']),
      error_x: errorBars(list, 'xh'),
      error_y: errorBars(list, 'yh'),
      marker: {
        size: 11,
        symbol: list.map((q) => FILLER_SYMBOL[q.filler] ?? 'circle'),
        color: colors.color(family),
        // Evidence status in the outline: a held candidate reads hollow.
        opacity: list.map((q) => (q.assumed ? 0.3 : q.relaxed.length ? 0.5 : q.evaluation.verdict === 'PASS' ? 1 : 0.55)),
        line: { width: list.map((q) => (q.relaxed.length || q.evaluation.needsVerification ? 2 : 1)), color: 'rgba(0,0,0,.55)' },
      },
      hovertemplate:
        `<b>%{customdata[1]}</b><br>${esc(yDef.label)} %{y} ${esc(yDef.unit)}<br>${esc(xDef.label)} %{x} ${esc(xDef.unit)}`
        + `<br>Grade %{customdata[6]}<br>Direction %{customdata[5]}<br>%{customdata[7]}<br>%{customdata[2]} against current constraints<extra></extra>`,
    });
  }

  // The legend's entries: one per family colour drawn, in the palette's order, as empty traces that carry only a name,
  // a colour and the group they switch.
  const drawnGroups = new Set([...pts, ...envelopes].map((q) => colourGroup(q.family)));
  for (const family of [...colors.named, 'Other families']) {
    if (!drawnGroups.has(family)) continue;
    traces.push({
      type: 'scatter', mode: 'markers', x: [null], y: [null], name: family, legendgroup: family, showlegend: true,
      marker: { size: 10, symbol: 'circle', color: family === 'Other families' ? colors.color(null) : colors.color(family) },
      hoverinfo: 'skip',
    });
  }

  // Join the tests belonging to one material.
  //
  // Without this a reader sees a field of dots and has no way to tell six measurements of one
  // material from six different materials. The connector says "these are the same thing, measured
  // more than once", which is the entire message of this mode.
  if (measurementMode) {
    const byMaterial = new Map();
    for (const q of pts) {
      if (!byMaterial.has(q.id)) byMaterial.set(q.id, []);
      byMaterial.get(q.id).push(q);
    }
    for (const [, list] of byMaterial) {
      if (list.length < 2) continue;
      const ordered = [...list].sort((a, b) => a.x - b.x || a.y - b.y);
      traces.push({
        type: 'scatter', mode: 'lines',
        x: ordered.map((q) => q.x), y: ordered.map((q) => q.y),
        line: { color: colors.color(ordered[0].family), width: 1, dash: 'solid' },
        opacity: 0.35, hoverinfo: 'skip', showlegend: false, legendgroup: colourGroup(ordered[0].family),
      });
    }
  }

  // Requirements, references and the familiar filament: drawn as every view draws them (chart.js).
  const req = requirementOverlay(scenario.constraints, xDef, yDef, p);
  const shapes = [...req.shapes];
  const annotations = [...req.annotations];
  labelPlan.fixed.push(...req.fixed);
  if (p.showReference) {
    const ref = referenceOverlay(reference, xDef, yDef, p);
    shapes.push(...ref.shapes); annotations.push(...ref.annotations); labelPlan.fixed.push(...ref.fixed);
  }
  const anchor = state.baseline ? anchorTrace(db.materials.find((q) => q.id === state.baseline), xDef, yDef) : null;
  if (anchor) { labelPlan.fixed.push(anchor.fixed); traces.push(anchor.trace); }

  // Pareto front over the eligible candidates only, drawn through the bubbles, so it is a front of materials' typical
  // values: context, and named so beside the goal's ranking, which is by passing products (D102).
  const front = sortFront(frontNow, xDef.better);
  if (front.length > 1) {
    traces.push({
      type: 'scatter', mode: 'lines', name: 'Pareto front of typical values', legendgroup: 'pareto',
      x: front.map((q) => q.x), y: front.map((q) => q.y),
      line: { color: 'rgba(31,95,139,.85)', width: 2, dash: 'dot' }, hoverinfo: 'skip',
    });
  }

  // No index line here: the goal's line counts exact product states in the states they are judged in, which the decision
  // view draws (D107). Drawn among published typical values it counted one population and ranked another (A04).

  // Shortlisted materials keep a leader line so they stand out among the other labels; placeLabels adds it where it fits.

  const { ink, grid } = chartTheme();
  const { xSpan, ySpan } = spans(traces, shapes, {
    x: [...pts.map((q) => q.x), ...envelopes.flatMap((q) => [q.x.lo, q.x.hi])],
    y: [...pts.map((q) => q.y), ...envelopes.flatMap((q) => [q.y.lo, q.y.hi])],
  });

  const gd = host.querySelector('#plot');
  // Every entry the legend will list: the families, the front and a guide line.
  const legendNames = traces.filter((t) => t.showlegend !== false && t.name).map((t) => t.name);
  const fit = chartFit(gd.clientWidth, legendNames);
  gd.style.height = `${fit.height}px`;
  // Kept on the element for the resize listener, which lays the legend out again for a new width.
  gd._legendNames = legendNames;
  const layout = {
    height: fit.height,
    margin: { l: 70, r: 20, t: PLOT_MARGIN_TOP, b: 56 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: ink, family: 'system-ui, sans-serif', size: 12 },
    // automargin: the axis claims the space its ticks and title need, so a legend placed under the chart is laid out
    // below that space rather than across the title.
    xaxis: { title: { text: `${prop(xDef.key).plain} (${xDef.unit})` }, type: p.xLog ? 'log' : 'linear', automargin: true,
             gridcolor: grid, zeroline: false, range: axisRange(xSpan, p.xLog), autorange: false },
    yaxis: { title: { text: `${prop(yDef.key).plain} (${yDef.unit})` }, type: p.yLog ? 'log' : 'linear',
             gridcolor: grid, zeroline: false, range: axisRange(ySpan, p.yLog), autorange: false },
    shapes, annotations,
    showlegend: true,
    legend: fit.legend,
    // Zoom, not lasso. With lasso as the default every stray drag turned into a candidate subset,
    // which read as the chart filtering itself at random. Lasso stays one click away in the mode bar.
    dragmode: 'zoom',
    hovermode: 'closest',
  };

  anchorRequirementLabels(req.requirementLabels, layout.xaxis.range);

  wireResize();
  gd._labelPlan = { ...labelPlan, annotations };
  // After the draw has finished, never inside it: an update made from Plotly's own afterplot handler was drawn over by
  // the rest of that draw, and the labels were in the data but not on the chart.
  let pending = null;
  const relabel = () => { clearTimeout(pending); pending = setTimeout(() => placeLabels(gd), 30); };
  Plotly.newPlot(gd, traces, layout, {
    displaylogo: false, responsive: false,
    modeBarButtonsToRemove: ['select2d'],
    modeBarButtonsToAdd: [],
  }).then(relabel);
  // Placed again whenever what is on screen moves: a zoom, a resize, a family hidden from the legend.
  for (const event of ['plotly_afterplot', 'plotly_relayout', 'plotly_restyle']) gd.on(event, relabel);

  gd.on('plotly_click', (ev) => {
    const id = ev.points?.[0]?.customdata?.[0];
    if (id) actions.openMaterial(id);
  });
  // A requirement's label opens the filter rail at it (D108).
  gd.on('plotly_clickannotation', (ev) => { const property = gd.layout.annotations?.[ev.index]?._property; if (property) actions.editRequirements(property); });
  // A lasso focuses the chart on what it caught; it never filters the results (D107).
  gd.on('plotly_selected', (ev) => {
    if (!ev?.points?.length) return;
    actions.setFocus([...new Set(ev.points.map((pt) => pt.customdata?.[0]).filter(Boolean))]);
  });
}


/**
 * The guide's ranking (D102, D107): the table's, over the same rows, from each candidate's passing products' own index in
 * the states they pass in.
 */
export const guideRanking = (rows, state, index) => rankingFor(rows, state.ctx, index)?.order ?? [];

// ------------------------------------------------------------------ controls

function wireControls(host, state, actions, ws, { view }) {
  const p = state.scenario.plot;
  const index = ws.objective.index;
  const on = (sel, ev, fn) => host.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, (e) => fn(el, e)));
  on('details[data-fold]', 'toggle', (el) => {
    openFolds.set(el.dataset.fold, el.open);
    // One menu open at a time.
    if (el.open && el.classList.contains('ws-menu')) host.querySelectorAll('details.ws-menu[open]').forEach((d) => { if (d !== el) d.open = false; });
  });
  wireMenus();
  on('[data-goal]', 'change', (el) => actions.setGoal(el.value || null));
  on('[data-start-goal]', 'click', (el) => actions.startExercise(el.dataset.startGoal || null, !!host.querySelector('[data-start-gates]')?.checked));
  on('button[data-view]', 'click', (el) => { openFolds.set('more', false); actions.setPlot({ view: el.dataset.view }); });
  on('[data-axis]', 'change', (el) => {
    const which = el.dataset.axis;
    actions.setPlot({ [which]: el.value, ...(LINEAR_BY_DEFAULT(el.value) ? { [`${which}Log`]: false } : {}) });
  });
  on('[data-log]', 'click', (el) => actions.setPlot({ [`${el.dataset.log}Log`]: el.dataset.on === '1' }));
  on('[data-swap]', 'click', () => actions.setPlot({ x: p.y, y: p.x, xLog: !!p.yLog, yLog: !!p.xLog }));
  on('[data-goal-axes]', 'click', () => index && actions.setPlot(goalAxes(index)));
  on('[data-loglog]', 'click', () => actions.setPlot({ xLog: true, yLog: true }));
  on('[data-layer]', 'change', (el) => actions.setPlot({ layers: { ...(p.layers ?? {}), [el.dataset.layer]: el.checked } }));
  on('[data-show-estimates]', 'change', (el) => actions.setPlot({ showEstimates: el.checked }));
  on('[data-reference]', 'change', (el) => actions.setPlot({ showReference: el.checked }));
  on('[data-baseline]', 'change', (el) => actions.setBaseline(el.value));
  on('[data-edit-req]', 'click', () => actions.editRequirements());
  on('[data-act="printable"]', 'click', () => actions.checkPrintable());
  on('[data-inspect]', 'click', (el) => actions.inspect({ kind: 'pair', key: el.dataset.inspect }));
  // A material's product states are written into its list when it is opened.
  on('details[data-mat-pairs]', 'toggle', (el) => {
    if (!el.open || el.querySelector('ul')) return;
    el.insertAdjacentHTML('beforeend', pairList(state, ws, el.dataset.matPairs));
    el.querySelectorAll('[data-inspect]').forEach((b) => b.addEventListener('click', () => actions.inspect({ kind: 'pair', key: b.dataset.inspect })));
  });
  on('[data-inspect-close]', 'click', () => actions.inspect(null));
  on('[data-focus-material]', 'click', (el) => actions.setFocus([el.dataset.focusMaterial]));
  on('[data-focus-reset]', 'click', () => actions.setFocus([]));
  on('[data-open-material]', 'click', (el) => actions.openMaterial(el.dataset.openMaterial));
  on('[data-open-product]', 'click', (el) => actions.openMaterial(el.dataset.openProduct, 'Grades'));
  on('[data-choose]', 'click', (el) => actions.toggleDecision(el.dataset.choose));
  on('[data-pin]', 'click', (el) => actions.togglePin(el.dataset.pin));
  on('[data-export-data]', 'click', () => download(`h2c-ashby-data-${state.db.meta.snapshot}-${state.db.meta.release?.id ?? 'release'}.csv`, chartDataCSV(state, ws, { view }), 'text/csv'));
  on('[data-export-image]', 'click', () => chartImage(host.querySelector('#plot'), state, ws, { view }));
  // The list's own search narrows the list on screen and nothing else.
  on('[data-list-filter]', 'input', (el) => {
    const q = el.value.trim().toLowerCase();
    host.querySelectorAll('.ws-mat').forEach((li) => { li.hidden = !!q && !li.dataset.name.includes(q); });
  });

  // The line: typed, stepped to the next product state, or slid. Sliding moves the drawn line and its count at once and
  // commits when released, so a drag is not interrupted by a redraw.
  const L = ws.line;
  const gd = host.querySelector('#plot');
  const commit = (M) => { if (Number.isFinite(M) && M > 0) actions.setPlot({ indexM: M }); };
  on('[data-line-m]', 'change', (el) => commit(Number(el.value)));
  // A step moves the line past the next product state: up, the lowest ones at or above it drop below; down, the next
  // one below comes on. Each press changes the count.
  on('[data-line-step]', 'click', (el) => {
    const Ms = [...new Set(ws.decision.map((q) => q.M).filter((v) => v !== null))].sort((a, b) => a - b);
    const above = Ms.filter((v) => v >= L.M);
    const next = Number(el.dataset.lineStep) > 0 ? above.find((v) => v > above[0]) : [...Ms].reverse().find((v) => v < L.M);
    if (next !== undefined) commit(next);
  });
  const slider = host.querySelector('[data-line-slider]');
  if (slider && L?.range) {
    const lo = L.range.lo * 0.95, hi = L.range.hi * 1.05;
    const at = (v) => lo * Math.pow(hi / lo, Number(v) / 1000);
    slider.addEventListener('input', () => {
      const M = at(slider.value);
      const above = ws.decision.filter((q) => q.M !== null && q.M >= M);
      const out = host.querySelector('.ws-line-readout');
      if (out) out.innerHTML = `<b>${lineCount(above.length, new Set(above.map((q) => q.materialId)).size)}</b> ${L.orientation === 'direct' ? 'above' : 'below'} the line <span class="fine">(release to keep it here)</span>`;
      const input = host.querySelector('[data-line-m]');
      if (input) input.value = Number(M.toPrecision(4));
      const t = gd?.data?.findIndex((tr) => tr.legendgroup === 'index');
      if (t >= 0 && index) {
        const xs = gd.data[t].x;
        const pts = xs.map((x) => (L.orientation === 'swapped' ? Math.pow(x, index.exponent) / M : Math.pow(M * x, 1 / index.exponent)));
        Plotly.restyle(gd, { y: [pts] }, [t]);
      }
    });
    slider.addEventListener('change', () => commit(at(slider.value)));
  }
  wireEvidence(host, actions);
}

/**
 * The toolbar's menus close as menus do: a press outside one, or Escape, which puts the focus back on its button. Wired
 * once, on the document, since the lens is rebuilt on every change.
 */
let menusWired = false;
function wireMenus() {
  if (menusWired) return;
  menusWired = true;
  const close = (except = null) => document.querySelectorAll('details.ws-menu[open]').forEach((d) => { if (d !== except) { d.open = false; openFolds.set(d.dataset.fold, false); } });
  document.addEventListener('pointerdown', (e) => close(e.target.closest?.('details.ws-menu') ?? null));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = document.querySelector('details.ws-menu[open]');
    if (!open) return;
    close();
    open.querySelector('summary')?.focus();
  });
}
