// Ashby workspace.
//
// A property chart turns selection into geometry: constraints become boxes, indices become lines,
// and the best material is the one furthest along the line.
//
// Rules enforced here:
//  - the axis picker reports the point count BEFORE drawing, because some pairs are genuinely thin;
//  - one control chooses how much evidence to show, because the two that used to do it overlapped;
//  - reference materials are a drawing layer, never candidates;
//  - two axes, two categorical encodings, at most one size encoding.

import { INDICES, indexById, indexValue, selectionLine, countAbove } from '../engine/indices.js';
import { paretoFront, sortFront } from '../engine/pareto.js';
import { buildFamilyColors, FILLER_SYMBOL, FILLER_LABEL, FAMILY_LABEL, esc, fmtNumber, fmtRange } from './format.js';
import { AXIS_DEFS, axisByKey, measurementMatches, pairable } from './axes.js';
import { prop, describeConstraint, POLICY_LABELS } from './labels.js';

/** Materials a printer owner already has a feel for, offered as the comparison anchor. */
const BASELINE_NAMES = ['PLA', 'PETG', 'ABS', 'ASA', 'PC'];

let dragState = null;

/**
 * How much evidence to draw, as one ordered choice.
 *
 * This replaces two switches that overlapped. "Points" chose headline against measurements and
 * "Comparability" chose strict against broad, which reads as four combinations but is three:
 * comparability did nothing at all in headline mode, because a headline is a single fixed value
 * with no conditions left to match. Worse, "Strict" there meant something completely different from
 * "Strict" in the top bar, which is about missing data rather than measurement conditions.
 */
export const DETAIL_LEVELS = [
  {
    id: 'material',
    label: 'One material',
    help: 'Best for comparing and choosing materials.',
  },
  {
    id: 'measured',
    label: 'One matched measurement pair',
    help: 'Pairs recorded for the same grade under matching conditions.',
  },
  {
    id: 'measured-mixed',
    label: 'One mixed-condition pair',
    help: 'Adds different directions, loads or specimens. Hollow points need caution.',
  },
];

/** Read the current level, migrating scenarios saved under the old two-switch scheme. */
export function detailLevel(p) {
  if (p.detail && DETAIL_LEVELS.some((d) => d.id === p.detail)) return p.detail;
  if (p.pointLevel === 'measurements') return p.comparability === 'broad' ? 'measured-mixed' : 'measured';
  return 'material';
}


// Plotly's own responsive mode adds a window resize listener per plot, which holds every replaced plot alive: 800
// redraws once left 1,408 listeners and a 569 MB heap (audit 2026-09-15, A-04). Purging a replaced plot instead races
// Plotly's asynchronous auto-margin redraw and throws. So plots are not responsive on their own: one listener, added
// once, resizes whichever plot is on screen, and a replaced plot has nothing left holding it.
let resizeWired = false;
function wireResize() {
  if (resizeWired || typeof window === 'undefined') return;
  resizeWired = true;
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      const gd = document.querySelector('#plot.js-plotly-plot');
      if (!gd || typeof Plotly === 'undefined') return;
      // The legend's side and the chart's height follow the width, so a rotated tablet gets the layout it would have
      // been drawn with.
      const fit = chartFit(gd.clientWidth, gd._legendNames ?? []);
      gd.style.height = `${fit.height}px`;
      Plotly.relayout(gd, { height: fit.height, legend: fit.legend }).then(() => Plotly.Plots.resize(gd));
    }, 100);
  });
}

/** Below this width the legend goes under the chart: beside it, it took 60% of a tablet's width and lay over a phone's points. */
const LEGEND_BELOW = 900;
/**
 * How far below the chart's top edge a legend beside the plot starts, in pixels. Plotly's mode bar sits over the top right
 * corner of the chart, and a legend starting at the plot's top edge put its first entry (PLA) behind the mode bar's
 * buttons whenever the pointer was over the chart. The bar is about 30 px tall with its margin; this clears it.
 */
const MODEBAR_CLEARANCE = 46;
/** The chart's top margin, and roughly what the horizontal axis takes below the plot with its ticks and title. */
const PLOT_MARGIN_TOP = 16;
const PLOT_MARGIN_BOTTOM = 76;

/**
 * The chart's height and legend for a width. Beside the plot on a wide screen; under it, in rows, on a narrower one,
 * with the height following the width (a fixed 560 px left a phone a tall thin strip) plus room for the legend's rows,
 * so the legend does not eat the plot. The row count is estimated from the names' lengths; Plotly reserves the
 * legend's real height under the axis title either way, so a wrong guess costs a little plot height, never an overlap.
 */
export function chartFit(width, legendNames) {
  const base = Math.round(Math.min(560, Math.max(360, 0.75 * (width || 900))));
  if ((width || 900) >= LEGEND_BELOW) {
    // In the plot's own coordinates, lowered by the mode bar's height less the top margin, as a fraction of the plot
    // area's height (the chart less its margins and the horizontal axis's ticks and title). Placed against the whole
    // chart instead (yref 'container'), Plotly counted the legend as sitting in the top margin and grew that margin to
    // hold it, which squeezed the plot into the lower half of the chart.
    const plotHeight = base - PLOT_MARGIN_TOP - PLOT_MARGIN_BOTTOM;
    return { height: base, legend: { orientation: 'v', x: 1.01, xanchor: 'left', xref: 'paper', y: 1 - (MODEBAR_CLEARANCE - PLOT_MARGIN_TOP) / plotHeight, yanchor: 'top', yref: 'paper', traceorder: 'normal', font: { size: 11 } } };
  }
  // Plotly lays a horizontal legend out in columns as wide as its longest entry.
  const entry = 44 + 6.4 * Math.max(0, ...legendNames.map((name) => name.length));
  const columns = Math.max(1, Math.floor(Math.max(200, (width || 900) - 20) / entry));
  const rows = Math.ceil(legendNames.length / columns);
  return {
    height: base + rows * 19 + (rows ? 16 : 0),
    legend: { orientation: 'h', x: 0, xanchor: 'left', xref: 'paper', y: 0, yanchor: 'bottom', yref: 'container', traceorder: 'normal', font: { size: 11 } },
  };
}

export function renderAshby(host, state, actions) {
  const { db, reference, rows, scenario } = state;
  const p = scenario.plot;
  const xDef = AXIS_DEFS.find((a) => a.key === p.x) ?? AXIS_DEFS[0];
  const yDef = AXIS_DEFS.find((a) => a.key === p.y) ?? AXIS_DEFS[1];
  const focusKey = host.contains(document.activeElement) ? document.activeElement.dataset?.focus : null;

  const level = detailLevel(p);
  const measurementMode = level !== 'material';
  const { pts, mixed, unavailable } = measurementMode
    ? measurementPoints(rows, xDef, yDef, level === 'measured-mixed' ? 'broad' : 'strict', state.ctx)
    : headlinePoints(rows, xDef, yDef);

  // Only in "one dot per material": at measurement level every point is already a real
  // measurement, and a family bound has nothing to say about an individual grade.
  const estimated = measurementMode ? [] : estimateEnvelopes(rows, xDef, yDef, state.ctx?.showEstimates);
  const envelopes = p.showEstimates ? estimated : [];

  const subjects = new Set(pts.map((q) => q.id)).size;
  // Only for the footer note. drawPlot computes the front it actually draws.
  const frontSize = paretoFront(pts.filter((q) => q.evaluation.eligible), xDef.better, yDef.better).length;
  const missing = rows.length - subjects - estimated.length;
  const thin = pts.length < 10;

  // "Price — 10" read as ten dollars. Name the property, then say what the number counts.
  const axisSelect = (which, cur) => `<select id="ashby-${which}" data-axis="${which}" data-focus="axis-${which}">
    ${AXIS_DEFS.map((a) => {
      const n = rows.filter((r) => r.material.headline[a.key]?.known).length;
      const est = state.ctx?.showEstimates
        ? rows.filter((r) => { const h = r.material.headline[a.key]; return h && !h.known && h.estimate; }).length
        : 0;
      const P = prop(a.key);
      const count = est ? `${n} measured, ${est} estimated` : `${n} of ${rows.length} have it`;
      return `<option value="${a.key}" ${a.key === cur ? 'selected' : ''}>${esc(P.plain)} (${count})</option>`;
    }).join('')}</select>`;

  // Each axis owns its scale. Two identical "Scale" labels floating between the axis pickers left
  // the reader to work out which one belonged to which axis.
  const axisPicker = (which, def, isLog) => `
    <div class="axis-pick">
      <label for="ashby-${which}">${which === 'y' ? 'Vertical axis' : 'Horizontal axis'}</label>
      <div class="axis-row">
        ${axisSelect(which, def.key)}
        <div class="segmented" role="group" aria-label="${which === 'y' ? 'Vertical' : 'Horizontal'} axis scale">
          <button data-log="${which}" data-focus="log-${which}-lin" aria-pressed="${!isLog}">Linear</button><button data-log="${which}" data-on="1" data-focus="log-${which}-log" aria-pressed="${isLog}">Log</button>
        </div>
      </div>
    </div>`;

  // State the chart's current capability instead of presenting an unexplained disabled checkbox.
  // The range overlay is relevant only when one mark represents one material.
  const estimateControl = measurementMode
    ? '<div class="plot-data-state">Measured data only</div>'
    : estimated.length
      ? `<label class="opt-check">
          <input type="checkbox" data-show-estimates data-focus="estimates" ${p.showEstimates ? 'checked' : ''}>
          <span>Show estimated ranges (${estimated.length})</span>
        </label>
        <p class="opt-help">Dotted lines and boxes in each family's colour; the key under the chart says which is which.</p>`
      : state.ctx?.showEstimates
        ? '<div class="plot-data-state">No estimated ranges for these axes</div>'
        : state.scenario.unknownPolicy === 'exploration'
          ? '<div class="plot-data-state">Turn on Use estimates above to show ranges</div>'
          : `<div class="plot-data-state">Estimated ranges require ${POLICY_LABELS.exploration}</div>`;

  const index = indexById(p.index);
  const cheapest = INDICES.filter((i) => i.costForm), lightest = INDICES.filter((i) => !i.costForm);
  const indexOption = (i) => `<option value="${i.id}" ${p.index === i.id ? 'selected' : ''}>${esc(i.designCase)}</option>`;

  const notices = [
    unavailable ? `<div class="warn-chip">${esc(unavailable)}</div>` : '',
    thin && !unavailable ? `<div class="warn-chip">Only ${pts.length} point${pts.length === 1 ? '' : 's'} can be drawn for this pair. Read this chart with care.</div>` : '',
    p.showReference ? `<div class="banner">${esc(reference.meta.caveat)}</div>` : '',
    mixed && mixed.length ? `<div class="banner"><span><b>Some of these were measured a different way</b>
      from the axis definition: ${esc(mixed.join('; '))}. They are drawn hollow, and pointing at or
      tapping one names the mismatch. They are included so the trade space can be seen whole, never merged into
      a headline.</span></div>` : '',
  ].join('').trim();

  host.innerHTML = `
    <div class="ashby-axes">
      ${axisPicker('y', yDef, p.yLog)}
      <button class="btn btn-sm axis-swap" data-swap data-focus="swap" title="Swap the horizontal and vertical axes">⇄ Swap</button>
      ${axisPicker('x', xDef, p.xLog)}
    </div>

    <div class="ashby-options">
      <div class="opt-group" role="group" aria-labelledby="og-points">
        <h3 id="og-points">Each point shows</h3>
        <select data-detail data-focus="detail" aria-label="What each chart point represents">
          ${DETAIL_LEVELS.map((d) => `<option value="${d.id}" ${level === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
        </select>
        <p class="opt-help">${esc(DETAIL_LEVELS.find((d) => d.id === level).help)}</p>
        ${estimateControl}
      </div>

      <div class="opt-group" role="group" aria-labelledby="og-compare">
        <h3 id="og-compare">Compare with</h3>
        <select data-baseline data-focus="baseline" aria-label="A familiar filament to draw for comparison">
          <option value="">No familiar filament</option>
          ${BASELINE_NAMES.map((n) => db.materials.find((q) => q.name === n)).filter(Boolean)
            .map((q) => `<option value="${esc(q.id)}" ${state.baseline === q.id ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}
        </select>
        <p class="opt-help">Drawn as a blue cross. A reference, never a candidate.</p>
        <label class="opt-check"><input type="checkbox" data-reference data-focus="reference" ${p.showReference ? 'checked' : ''}>
          <span>Steel, aluminium and wood</span></label>
        <p class="opt-help">Grey boxes, for a sense of scale.</p>
      </div>

      <div class="opt-group" role="group" aria-labelledby="og-index">
        <h3 id="og-index">Design guide line</h3>
        <select data-index data-focus="index" aria-label="Performance index line">
          <option value="">None</option>
          <optgroup label="Lightest part that does the job">${lightest.map(indexOption).join('')}</optgroup>
          ${cheapest.length ? `<optgroup label="Cheapest part that does the job">${cheapest.map(indexOption).join('')}</optgroup>` : ''}
        </select>
        <p class="opt-help">${!index
          ? 'The line engineers use to find the lightest or cheapest material that still does the job.'
          : indexDrawable(index, xDef, yDef, p) ? 'Move the line and read its caveats under the chart.'
          : 'Not drawn on these axes; the card under the chart says why.'}</p>
      </div>
    </div>

    ${notices ? `<div class="ashby-notices">${notices}</div>` : ''}

    <div id="plot"></div>
    ${markerKey({ pts, envelopes, level, anchor: drawnAnchor(state, xDef, yDef) })}
    <div id="index-card"></div>
    <div class="legend-note">
      <h3>Reading this chart</h3>
      ${measurementMode
        // What a reader has to be told before this chart means anything: a dot is a test, not a
        // material. Without that sentence a cluster of six dots reads as six materials, or as noise.
        // A dot pairs two recorded measurements of the same grade taken under compatible conditions.
        // The source rarely says both came from one specimen, so a dot is not claimed to be one test.
        ? `<b>Each dot pairs two measurements of one grade, not one material.</b> ${pts.length} pair${pts.length === 1 ? '' : 's'}
           across ${subjects} of ${rows.length} candidates. The two values were recorded for the same
           grade under compatible conditions, not necessarily on the same specimen, so dots are not
           independent tests. Where a material has more than one pair
           once, its dots are joined by a faint line. That spread is real: the same material measures
           differently by grade and by print direction, and the wider the spread, the less any single
           headline number tells you.
           ${level === 'measured-mixed' ? '<br><b>Hollow dots</b> were measured a different way from the axis definition, for example in another print direction. They are included here so you can see them, and pointing at or tapping one names the mismatch.' : ''}`
        : `${pts.length} of ${rows.length} candidates plotted${missing ? `, ${missing} lack one or both properties and are not drawn as zero` : ''}.`}
      Colour is polymer family, marker shape is filler class.
      ${estimated.length && !p.showEstimates
        // Counted even when not drawn, so they are never silently absent. That silence was the
        // whole problem: a quarter of the set vanished from the chart while the table listed them.
        ? `<br><b>${estimated.length} more candidate${estimated.length === 1 ? ' has' : 's have'}</b> no measurement of
           ${estimated.length === 1 ? 'its' : 'their'} own on one of these axes, only an estimated range. Not drawn. Tick
           <b>Show estimated ranges</b>, under Each point shows above, to see where ${estimated.length === 1 ? 'it falls' : 'they fall'}.`
        : ''}
      ${envelopes.length ? `<br><b>The outlined ranges</b> are ${envelopes.length} material${envelopes.length === 1 ? '' : 's'}
        with no measurement of their own on one of these axes. Each is the estimate's likely (80%) range,
        built from the material's own related measurements and its polymer family, so the material is probably
        somewhere along it.
        A capped line means the other axis is measured. It is an estimate, not a position: it never joins the
        frontier and never counts as a plotted candidate.` : ''}
      ${frontSize > 1 ? `<br><b>The dotted line</b> joins the materials that nothing else beats on
        both axes at once: ${esc(prop(xDef.key).plain.toLowerCase())} ${xDef.better === 'max' ? 'higher' : 'lower'} is better,
        ${esc(prop(yDef.key).plain.toLowerCase())} ${yDef.better === 'max' ? 'higher' : 'lower'} is better.
        Anything on the ${yDef.better === 'max' ? 'lower' : 'upper'} ${xDef.better === 'max' ? 'left' : 'right'} side of it is beaten by something on the line.` : ''}
    </div>`;

  drawPlot(host, state, { xDef, yDef, pts, envelopes, actions });
  renderIndexCard(host.querySelector('#index-card'), state, pts, actions);
  wireControls(host, state, actions);

  // The lens is rebuilt on every change, as the filter rail is. Keep the reader's place, so a
  // keyboard user who changes an axis is not thrown back to the top of the page.
  if (focusKey) host.querySelector(`[data-focus="${focusKey}"]`)?.focus();
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
  if (envelopes.some((q) => q.x.measured !== q.y.measured)) {
    items.push(`<span class="key-item">${glyph('<path d="M2.5 8h11M2.5 5v6M13.5 5v6" fill="none" stroke-width="1.6" stroke-dasharray="2 1.5"/>')}Capped dotted line: one axis estimated, the other measured</span>`);
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
    if (h?.known) return { lo: h.value, hi: h.value, measured: true };
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
    return { pts: [], mixed: [], unavailable: `${which} has no measurement-level data, only a compiled headline. Choose "One material" under Each point shows, or choose another axis.` };
  }
  const pts = [];
  const mixed = new Set();

  for (const { material: m, evaluation: e } of rows) {
    const ms = ctx.measurementsByMaterial.get(m.id) ?? [];
    const xs = ms.map((x) => measurementMatches(x, xDef, mode)).filter(Boolean);
    const ys = ms.map((x) => measurementMatches(x, yDef, mode)).filter(Boolean);
    for (const xm of xs) {
      for (const ym of ys) {
        if (xm.measurement.gradeId !== ym.measurement.gradeId) continue;
        if (!pairable(xm.measurement, ym.measurement, mode)) continue;
        const notes = [...new Set([...xm.notes, ...ym.notes])];
        // Only a genuine relaxation makes a point hollow or reaches the banner. An unstated
        // specimen form on an axis with no direction requirement is context, not a mismatch.
        const relaxed = [...new Set([...xm.relaxed, ...ym.relaxed])];
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
  return { pts, mixed: [...mixed], unavailable: pts.length ? null : 'No measurement matches both of these axes under the current setting. Try "One mixed-condition pair", or a different pair of axes.' };
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
  const rangeText = (span, def) => span.measured
    ? `${fmtNumber(span.lo)} ${def.unit} (measured)`
    : `${fmtRange(span.lo, span.hi)} ${def.unit} (estimated)`;
  const estimatedBy = [...new Set([q.x, q.y]
    .filter((span) => !span.measured)
    .map((span) => `${span.precision ?? 'unrated'} precision${span.basis ? `; ${span.basis}` : ''}`))];
  const hovertemplate = `<b>${esc(q.name)}</b><br><b>Estimated material range</b>`
    + `<br>${esc(yDef.label)}: ${esc(rangeText(q.y, yDef))}`
    + `<br>${esc(xDef.label)}: ${esc(rangeText(q.x, xDef))}`
    + `${estimatedBy.length ? `<br>${esc(estimatedBy.join(' · '))}` : ''}`
    + '<br><i>Not a measured point</i><extra></extra>';

  let x, y, mode, marker, fillMode, hoveron, textposition, labelAt;
  if (xEstimated && yEstimated) {
    x = [q.x.lo, q.x.hi, q.x.hi, q.x.lo, q.x.lo];
    y = [q.y.lo, q.y.lo, q.y.hi, q.y.hi, q.y.lo];
    mode = label ? 'lines+text' : 'lines';
    fillMode = 'toself';
    // Keep the nearly transparent interior from taking hover focus away from measured points.
    hoveron = 'points';
    textposition = 'top right';
    labelAt = 2;
  } else {
    const horizontal = xEstimated;
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
    line: { color, width: xEstimated && yEstimated ? 1.5 : 2.5, dash: 'dot' },
    // Plotly's data cleanup checks nested keys when marker is present. Omit unused
    // options entirely: marker: undefined makes range boxes abort the whole plot.
    ...(marker ? { marker } : {}),
    ...(fillMode ? { fill: fillMode, fillcolor: fill, hoveron } : {}),
    opacity: 0.82,
    name: q.name, legendgroup: group, showlegend: false,
    customdata: x.map(() => [q.id]), hovertemplate,
  };
}


function drawPlot(host, state, { xDef, yDef, pts, envelopes = [], actions }) {
  const { scenario, reference, db } = state;
  const p = scenario.plot;
  const colors = buildFamilyColors(db.materials, p.promotedFamilies ?? []);

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
  const measurementMode = pts.some((q) => q.notes !== undefined && q.xh?.measurementId && q.yh?.measurementId);
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
    const name = family === 'Other families' ? family : FAMILY_LABEL(family);
    traces.push({
      type: 'scatter', mode: 'markers', x: [null], y: [null], name, legendgroup: family, showlegend: true,
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

  const shapes = [];
  const annotations = [];
  // A requirement's label on the horizontal axis, anchored once the axis range is known.
  const requirementLabels = [];

  // On a log axis Plotly (4.x) takes an annotation's position in LOG10 SPACE and a shape's in data units. Both used to
  // be log10, which put a requirement line on a Log chart at the log of its value: "Stiffness at least 3 GPa" was drawn
  // at 0.48 GPa, under its own label at 3. Non-positive values have no log, so anything that cannot be placed is dropped
  // rather than drawn in the wrong place.
  const X = (v) => (p.xLog ? (v > 0 ? Math.log10(v) : null) : v);
  const Y = (v) => (p.yLog ? (v > 0 ? Math.log10(v) : null) : v);
  const SX = (v) => (p.xLog && !(v > 0) ? null : v);
  const SY = (v) => (p.yLog && !(v > 0) ? null : v);
  const placeable = (...vs) => vs.every((v) => v !== null && Number.isFinite(v));

  // Constraint overlay: threshold lines and a shaded feasible quadrant.
  for (const [def, axis] of [[xDef, 'x'], [yDef, 'y']]) {
    const c = scenario.constraints.find((k) => k.property === def.key && k.mandatory !== false);
    if (!c) continue;
    const at = axis === 'x' ? X(c.value) : Y(c.value);
    const on = axis === 'x' ? SX(c.value) : SY(c.value);
    if (!placeable(at, on)) continue;
    shapes.push({
      type: 'line', xref: axis === 'x' ? 'x' : 'paper', yref: axis === 'y' ? 'y' : 'paper',
      x0: axis === 'x' ? on : 0, x1: axis === 'x' ? on : 1,
      y0: axis === 'y' ? on : 0, y1: axis === 'y' ? on : 1,
      line: { color: 'rgba(163,43,31,.85)', width: 2, dash: 'dash' },
    });
    const label = {
      xref: axis === 'x' ? 'x' : 'paper', yref: axis === 'y' ? 'y' : 'paper',
      x: axis === 'x' ? at : 0.01, y: axis === 'y' ? at : 0.99,
      // The pill's words ("Density at most 1500 kg/m³"), not the operator: the chart printed "<=" beside a pill saying "at most".
      text: esc(describeConstraint(c)), showarrow: false,
      font: { size: 11, color: '#a32b1f' }, bgcolor: 'rgba(255,255,255,.75)',
    };
    annotations.push(label);
    const obstacle = { kind: 'requirement', axis, value: c.value, name: describeConstraint(c) };
    labelPlan.fixed.push(obstacle);
    if (axis === 'x') requirementLabels.push({ label, obstacle, at });
  }

  // Reference envelopes: min-to-max rectangles, behind everything, unmistakably not data.
  if (p.showReference) {
    const xr = reference.meta.axisEquivalence, yr = reference.meta.axisEquivalence;
    const xKey = Object.keys(xr).find((k) => xr[k] === xDef.key);
    const yKey = Object.keys(yr).find((k) => yr[k] === yDef.key);
    if (xKey && yKey) {
      for (const r of reference.materials.filter((m) => m.default)) {
        const rx = r.properties[xKey], ry = r.properties[yKey];
        if (!rx || !ry) continue;
        const x0 = X(rx.min), x1 = X(rx.max), y0 = Y(ry.min), y1 = Y(ry.max);
        if (!placeable(x0, x1, y0, y1)) continue;
        shapes.push({
          type: 'rect', x0: SX(rx.min), x1: SX(rx.max), y0: SY(ry.min), y1: SY(ry.max), layer: 'below',
          line: { color: 'rgba(150,150,140,.95)', width: 1.25, dash: 'dot' },
          fillcolor: 'rgba(141,141,132,.10)',
        });
        labelPlan.fixed.push({ kind: 'reference', x: rx.max, y: ry.max, name: r.name, left: x1 < (X(rx.min) + 0.001) });
        annotations.push({
          x: x1, y: y1, text: r.name, showarrow: false,
          // Anchor inward at the left edge so a wide label is not clipped off the plot.
          xanchor: x1 < (X(rx.min) + 0.001) ? 'left' : 'right', yanchor: 'bottom',
          font: { size: 11, color: '#9a9a90' },
        });
      }
    } else {
      annotations.push({
        xref: 'paper', yref: 'paper', x: 0.5, y: 1.04, showarrow: false,
        text: 'Reference materials have no equivalent for one of these axes', font: { size: 11, color: '#8d8d84' },
      });
    }
  }

  // The familiar anchor, drawn as a single labelled cross. It is a reference, not a candidate: it
  // is excluded from the Pareto front, from every count, and from the index-line tally, exactly
  // like the steel and aluminium envelopes.
  const anchor = state.baseline ? db.materials.find((q) => q.id === state.baseline) : null;
  const ax = anchor?.headline[xDef.key], ay = anchor?.headline[yDef.key];
  if (anchor && ax?.known && ay?.known) {
    labelPlan.fixed.push({ kind: 'text', x: ax.value, y: ay.value, name: anchor.name, position: 'bottom center', radius: 7.5 });
    traces.push({
      type: 'scatter', mode: 'markers+text', name: `${anchor.name} (baseline)`,
      x: [ax.value], y: [ay.value],
      text: [anchor.name], textposition: 'bottom center',
      textfont: { size: 11, color: '#1f5f8b' },
      marker: { size: 15, symbol: 'x-thin-open', color: '#1f5f8b', line: { width: 2.5, color: '#1f5f8b' } },
      // Named on the chart and in the key; a legend entry said it a third time.
      showlegend: false,
      _span: true,
      hovertemplate: `<b>${esc(anchor.name)}</b> — baseline, not a candidate`
        + `<br>${esc(yDef.label)} %{y} ${esc(yDef.unit)}<br>${esc(xDef.label)} %{x} ${esc(xDef.unit)}<extra></extra>`,
    });
  }

  // Pareto front over the eligible candidates only.
  const front = sortFront(frontNow, xDef.better);
  if (front.length > 1) {
    traces.push({
      type: 'scatter', mode: 'lines', name: 'Pareto front', legendgroup: 'pareto',
      x: front.map((q) => q.x), y: front.map((q) => q.y),
      line: { color: 'rgba(31,95,139,.85)', width: 2, dash: 'dot' }, hoverinfo: 'skip',
    });
  }

  // Index selection line. Slope is fixed by the index; position is M. Only on log-log axes, where the materials with one
  // value of M lie on a straight line: the line is two points joined straight, so on a Linear axis it was drawn through
  // materials it did not describe (E^(1/2)/rho is a curve there). The card says why nothing is drawn and offers Log.
  const index = indexById(p.index);
  if (index && indexDrawable(index, xDef, yDef, p)) {
    const xs = pts.map((q) => q.x);
    const range = [Math.min(...xs) * 0.85, Math.max(...xs) * 1.15];
    const M = p.indexM ?? defaultM(pts, index);
    const line = selectionLine(index, M, range);
    traces.push({
      type: 'scatter', mode: 'lines', name: `${index.formula} = ${M.toPrecision(3)}`,
      x: line.map((q) => q.x), y: line.map((q) => q.y),
      line: { color: '#1f5f8b', width: 2 }, hoverinfo: 'skip',
    });
  }

  // Shortlisted materials keep a leader line so they stand out among the other labels; placeLabels adds it where it fits.

  const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light'
    || document.documentElement.dataset.theme === 'dark';
  const ink = dark ? '#ecedef' : '#1a1a18';
  const grid = dark ? '#32353d' : '#e4e4de';

  // Explicit ranges. Plotly's autorange reads a shape coordinate as a data value while rendering
  // it in log space, so a constraint line at log10(1500) dragged the axis down to 3. Computing the
  // range ourselves from everything we actually drew avoids that and keeps the overlays on screen.
  const xSpan = [], ySpan = [];
  for (const q of pts) { xSpan.push(q.x); ySpan.push(q.y); }
  for (const q of envelopes) { xSpan.push(q.x.lo, q.x.hi); ySpan.push(q.y.lo, q.y.hi); }
  for (const sh of shapes) {
    // Plotly defaults an unset xref/yref to the axis, so an undefined ref still counts. The
    // reference rectangles rely on that default, and skipping them left the layer drawn off screen.
    if (sh.xref === 'x' || sh.xref === undefined) { xSpan.push(sh.x0, sh.x1); }
    if (sh.yref === 'y' || sh.yref === undefined) { ySpan.push(sh.y0, sh.y1); }
  }
  for (const t of traces) {
    // Lines, and the baseline cross, which would otherwise be drawn outside a range computed only
    // from the candidates.
    if (t.mode === 'lines' || t._span) { for (const v of t.x) xSpan.push(v); for (const v of t.y) ySpan.push(v); }
  }

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

  // Beside its line, on the side with the plot's room: centred on a line near the right edge, "Density at most 1500
  // kg/m³" ran out of the plot and under the legend.
  const xRange = layout.xaxis.range;
  for (const { label, obstacle, at } of requirementLabels) {
    const side = xRange && at > (xRange[0] + xRange[1]) / 2 ? 'right' : 'left';
    label.xanchor = side;
    obstacle.anchor = side;
  }

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
  gd.on('plotly_selected', (ev) => {
    if (!ev?.points?.length) return;
    actions.selectSubset(ev.points.map((pt) => pt.customdata?.[0]).filter(Boolean));
  });
}

/** Point labels, range labels and requirement labels are this size (px). */
const LABEL_FONT = 11;
// A point without a label carries a space, not an empty string. Plotly drops the text element of an empty label, and
// the next update then drops the point's text group without drawing the name it was given, so a label placed after a
// zoom or a resize would not appear until the draw after that.
const NO_LABEL = ' ';
// Where a point's label may go, in order of preference: above, below, right, left.
const POINT_POSITIONS = ['top center', 'bottom center', 'middle right', 'middle left'];
// Where a shortlisted material's leader line may end, in pixels from its point, in order of preference.
const PIN_OFFSETS = [[18, -18], [-18, -18], [18, 18], [-18, 18], [0, -26], [0, 26], [34, 0], [-34, 0]];
// Room kept clear around a label, so two labels never touch.
const LABEL_GAP = 2;
// Half the size of a point's marker (11 px), the square a label keeps off.
const MARKER_HALF = 5.5;

let measurer = null;
/** The width a label takes in the chart's font, measured rather than guessed from its length. */
function labelWidth(text) {
  measurer ??= document.createElement('canvas').getContext('2d');
  measurer.font = `${LABEL_FONT}px system-ui, sans-serif`;
  return measurer.measureText(text).width;
}

/**
 * The box a scatter label takes at a text position, the way Plotly places it (drawing.textPointPosition): beside a marker
 * of this radius, offset a little past it, with the baseline three quarters of the font size below the anchor.
 */
export function labelBox(px, py, width, position, markerRadius = 0) {
  const r = markerRadius ? markerRadius / 0.8 + 1 : 0;
  const sign = { start: 1, end: -1, middle: 0, bottom: 1, top: -1 };
  const v = position.includes('top') ? 'top' : position.includes('bottom') ? 'bottom' : 'middle';
  const h = position.includes('left') ? 'end' : position.includes('right') ? 'start' : 'middle';
  const baseline = py + LABEL_FONT * 0.75 + sign[v] * r + (sign[v] - 1) * LABEL_FONT / 2;
  const x0 = h === 'start' ? px + r : h === 'end' ? px - r - width : px - width / 2;
  // The glyphs' box, as measured on the drawn chart: an 11 px label stands about 11.5 px above its baseline and 1.5 below.
  return { x0, x1: x0 + width, y0: baseline - LABEL_FONT * 1.05, y1: baseline + LABEL_FONT * 0.15 };
}

const overlaps = (a, b) => a.x0 < b.x1 + LABEL_GAP && b.x0 < a.x1 + LABEL_GAP && a.y0 < b.y1 + LABEL_GAP && b.y0 < a.y1 + LABEL_GAP;

/**
 * Choose which labels to print and where, so that none prints over another. Greedy, in priority order: shortlisted
 * materials (a leader line), the materials on the Pareto front, then the rest from the one furthest from the middle of
 * the cloud inwards, since an isolated point is the one a reader cannot otherwise name; estimate ranges last. Each label
 * takes the first of its positions that clears every label already placed, the requirement and reference labels, the
 * familiar filament's name and every other point's marker (a name printed across a marker left it unclear which point it
 * named), and stays inside the plot; one that fits nowhere is left off and its point keeps its hover.
 *
 * Pure, so it can be tested without a browser: coordinates are pixels, `markers` are the drawn points ({ px, py, key },
 * where a label candidate's key is `trace:index`), and `width` measures a label.
 */
export function chooseLabels({ pins = [], points = [], envelopes = [], fixed = [], markers = [] }, bounds, width = labelWidth) {
  const placed = [...fixed];
  const markerBoxes = markers.map((m) => ({ key: m.key, x0: m.px - MARKER_HALF, x1: m.px + MARKER_HALF, y0: m.py - MARKER_HALF, y1: m.py + MARKER_HALF }));
  const inside = (b) => b.x0 >= bounds.x0 && b.x1 <= bounds.x1 && b.y0 >= bounds.y0 && b.y1 <= bounds.y1;
  const fits = (b, own = null) => inside(b) && !placed.some((o) => overlaps(o, b))
    && !markerBoxes.some((m) => m.key !== own && overlaps(m, b));
  const result = { pins: [], points: [], envelopes: [] };

  for (const q of pins) {
    const w = width(q.name) + 4;
    for (const [ax, ay] of PIN_OFFSETS) {
      const cx = q.px + ax, cy = q.py + ay;
      const box = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - 8, y1: cy + 8 };
      if (fits(box, `${q.trace}:${q.index}`)) { placed.push(box); result.pins.push({ ...q, ax, ay }); break; }
    }
  }
  const middle = (vs) => { const s = [...vs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  const cx = middle(points.map((q) => q.px)), cy = middle(points.map((q) => q.py));
  const distance = (q) => Math.hypot(q.px - cx, q.py - cy);
  const ordered = [...points].sort((a, b) => (Number(!!b.front) - Number(!!a.front)) || (distance(b) - distance(a)));
  const place = (q, positions, into) => {
    const w = width(q.name);
    for (const position of positions) {
      const box = labelBox(q.px, q.py, w, position, q.radius);
      if (fits(box, `${q.trace}:${q.index}`)) { placed.push(box); into.push({ ...q, position }); return; }
    }
  };
  for (const q of ordered) place(q, POINT_POSITIONS, result.points);
  for (const q of [...envelopes].sort((a, b) => Number(!!b.shortlisted) - Number(!!a.shortlisted))) place(q, q.positions, result.envelopes);
  return result;
}

/**
 * Put the chosen labels on the drawn chart. Runs after every draw (a zoom, a resize, a family hidden from the legend),
 * reading the plot's size and ranges from Plotly, and writes only when the labels changed, so its own update does not
 * run it again.
 */
function placeLabels(gd) {
  const plan = gd._labelPlan;
  const fl = gd._fullLayout, xa = fl?.xaxis, ya = fl?.yaxis;
  if (!plan || !gd.isConnected || !xa?._length || !ya?._length || !xa.range || !ya.range) return;
  const shown = (gd._fullData ?? []).map((t) => t.visible === true);
  const signature = [...xa.range, ...ya.range, xa._offset, xa._length, ya._offset, ya._length, ...shown].join('|');
  if (gd._labelSignature === signature) return;
  gd._labelSignature = signature;

  const lin = (ax, v) => (ax.type === 'log' ? (v > 0 ? Math.log10(v) : NaN) : v);
  const X = (v) => xa._offset + ((lin(xa, v) - xa.range[0]) / (xa.range[1] - xa.range[0])) * xa._length;
  const Y = (v) => ya._offset + ((ya.range[1] - lin(ya, v)) / (ya.range[1] - ya.range[0])) * ya._length;
  const onScreen = (q) => shown[q.trace] !== false && Number.isFinite(q.px) && Number.isFinite(q.py)
    && q.px >= xa._offset && q.px <= xa._offset + xa._length && q.py >= ya._offset && q.py <= ya._offset + ya._length;
  const at = (list) => list.map((q) => ({ ...q, px: X(q.x), py: Y(q.y) })).filter(onScreen);

  // What is already printed and must not be written over.
  const fixed = [];
  for (const f of plan.fixed) {
    const w = labelWidth(f.name);
    if (f.kind === 'text') fixed.push(labelBox(X(f.x), Y(f.y), w, f.position, f.radius));
    else if (f.kind === 'requirement' && f.axis === 'x') {
      const px = X(f.value), x0 = f.anchor === 'right' ? px - w - 6 : f.anchor === 'left' ? px : px - w / 2 - 3;
      fixed.push({ x0, x1: x0 + w + 6, y0: ya._offset - 2, y1: ya._offset + 16 });
    }
    else if (f.kind === 'requirement') { const py = Y(f.value); fixed.push({ x0: xa._offset, x1: xa._offset + w + 8, y0: py - 9, y1: py + 9 }); }
    else if (f.kind === 'reference') { const px = X(f.x), py = Y(f.y); fixed.push({ x0: f.left ? px : px - w, x1: f.left ? px + w : px, y0: py - 15, y1: py }); }
  }
  const bounds = { x0: xa._offset, x1: xa._offset + xa._length, y0: ya._offset - 14, y1: ya._offset + ya._length };
  // Every drawn point of a shown trace, whether or not it may carry a label.
  const markers = [];
  gd.data.forEach((t, i) => {
    if (!shown[i] || !Array.isArray(t.customdata) || t.customdata[0]?.length !== 8) return;
    t.x.forEach((x, j) => { const px = X(x), py = Y(t.y[j]); if (Number.isFinite(px) && Number.isFinite(py)) markers.push({ px, py, key: `${i}:${j}` }); });
  });
  const chosen = chooseLabels({ pins: at(plan.pins), points: at(plan.points), envelopes: at(plan.envelopes), markers,
    fixed: fixed.filter((b) => Object.values(b).every(Number.isFinite)) }, bounds);

  // Every trace that can carry a label, with its text and positions written out in full.
  const texts = new Map();
  const slot = (trace) => {
    if (!texts.has(trace)) {
      const t = gd.data[trace];
      texts.set(trace, { text: t.x.map(() => NO_LABEL), textposition: Array.isArray(t.textposition) ? t.x.map(() => 'top center') : t.textposition });
    }
    return texts.get(trace);
  };
  for (const q of [...plan.points, ...plan.pins, ...plan.envelopes]) slot(q.trace);
  for (const q of chosen.points) { const t = slot(q.trace); t.text[q.index] = q.name; t.textposition[q.index] = q.position; }
  for (const q of chosen.envelopes) slot(q.trace).text[q.index] = q.name;
  const annotations = [...plan.annotations, ...chosen.pins.map((q) => ({
    x: xa.type === 'log' ? Math.log10(q.x) : q.x, y: ya.type === 'log' ? Math.log10(q.y) : q.y,
    text: esc(q.name), showarrow: true, arrowhead: 0, arrowsize: 0.6, ax: q.ax, ay: q.ay, font: { size: LABEL_FONT },
  }))];

  const traces = [...texts.keys()];
  const same = traces.every((i) => JSON.stringify(gd.data[i].text) === JSON.stringify(texts.get(i).text)
    && JSON.stringify(gd.data[i].textposition) === JSON.stringify(texts.get(i).textposition))
    && JSON.stringify((gd.layout.annotations ?? []).map((a) => [a.text, a.ax, a.ay])) === JSON.stringify(annotations.map((a) => [a.text, a.ax, a.ay]));
  if (same) return;
  Plotly.update(gd, { text: traces.map((i) => texts.get(i).text), textposition: traces.map((i) => texts.get(i).textposition) },
    { annotations }, traces);
}

/** Give a family colour a nearly transparent fill without changing its outline colour. */
function hexToRgba(hex, alpha) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})` : hex;
}

/**
 * Axis range with a little headroom, expressed the way Plotly wants it: log10 bounds on a log
 * axis, data bounds otherwise.
 */
function axisRange(values, isLog) {
  const vs = values.filter((v) => Number.isFinite(v) && (!isLog || v > 0));
  if (!vs.length) return undefined;
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (isLog) {
    let a = Math.log10(lo), b = Math.log10(hi);
    const pad = Math.max((b - a) * 0.08, 0.04);
    return [a - pad, b + pad];
  }
  if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; return [lo - d, hi + d]; }
  const pad = (hi - lo) * 0.08;
  return [lo - pad, hi + pad];
}

/** Error bars only where the database holds a genuine uncertainty term. */
function errorBars(list, key) {
  const arr = list.map((q) => (q[key]?.uncertainty ?? 0));
  if (!arr.some((v) => v > 0)) return { visible: false };
  return { type: 'data', array: arr, visible: true, thickness: 1, width: 3, color: 'rgba(0,0,0,.35)' };
}

/** Whether the design guide line can be drawn: its property up, density across, not a cost form, both axes on Log. */
const indexApplies = (index, xKey, yKey) => !!index && index.numerator === yKey && xKey === 'density' && !index.costForm;
const indexDrawable = (index, xDef, yDef, p) => indexApplies(index, xDef.key, yDef.key) && !!p.xLog && !!p.yLog;

const defaultM = (pts, index) => {
  const vals = pts.map((q) => indexValue(q.material, index)).filter((v) => v !== null).sort((a, b) => b - a);
  return vals.length ? vals[Math.min(4, vals.length - 1)] : 1;
};

function renderIndexCard(host, state, pts, actions) {
  const p = state.scenario.plot;
  const index = indexById(p.index);
  if (!index) { host.innerHTML = ''; return; }

  const yDef = AXIS_DEFS.find((a) => a.key === p.y);
  const applicable = indexApplies(index, p.x, yDef?.key);
  const logLog = !!p.xLog && !!p.yLog;
  const M = p.indexM ?? defaultM(pts, index);
  // The index is a property of a material's headline values, so it counts materials. In the
  // measurement modes one material has several dots, and counting dots counted it several times.
  const unique = [...new Map(pts.map((q) => [q.id, q.material])).values()];
  const above = countAbove(unique, index, M);
  const evaluable = unique.filter((m) => indexValue(m, index) !== null).length;

  host.innerHTML = `
    <div class="index-card">
      <div class="index-head">
        <h4>${esc(index.designCase)}</h4>
        <button class="icon-btn" data-index-clear data-focus="index-clear" title="Remove this line" aria-label="Remove the design guide line">×</button>
      </div>
      <div>Maximise <span class="formula">M = ${esc(index.formula)}</span> ·
        selection line of slope ${index.slope} on log-log axes</div>
      ${index.note ? `<div style="color:var(--ink-2);margin-top:5px">${esc(index.note)}</div>` : ''}
      ${applicable && logLog ? `
        <div class="index-move">
          <label for="index-m">Move the line</label>
          <input type="range" id="index-m" data-index-m data-focus="index-m" min="0" max="100" value="${p.indexSlider ?? 50}"
            aria-valuetext="M = ${M.toPrecision(3)}, ${above} material${above === 1 ? '' : 's'} above the line">
          <span class="formula">M = ${M.toPrecision(3)}</span>
          <strong>${above} material${above === 1 ? '' : 's'} above the line</strong>
          <span class="index-of">of ${evaluable} with both headline values${detailLevel(p) === 'material' ? '' : '; counted by material, from headline values, not by dot'}</span>
        </div>
      ` : applicable
        // Said, not drawn: what the reader would have had to know to read a line drawn on these axes.
        ? `<div class="index-fix"><span class="warn-chip">Not drawn on ${!p.xLog && !p.yLog ? 'Linear axes' : 'a Linear axis'}. The materials with the same M lie on one straight line of slope ${index.slope} only when both axes are Log${index.exponent === 1
            ? '; on a Linear chart that line would pivot about zero as it moved rather than slide, and on a semi-log chart it would bend'
            : `; with ${esc(index.formula)} they lie on a curve on a Linear axis, so a straight line would pass through materials it does not describe`}.</span>
          <button class="btn btn-sm" data-index-loglog data-focus="index-loglog">Switch both axes to Log</button></div>`
      : index.costForm
        ? `<div class="index-fix"><span class="warn-chip">A cost-form index needs price combined with density on one axis, so it is not drawn on this chart. The caveats still apply.</span></div>`
        : `<div class="index-fix"><span class="warn-chip">This line needs Density across and ${esc(prop(index.numerator).plain)} up.</span>
          <button class="btn btn-sm" data-index-axes data-focus="index-axes">Set those axes, on Log scales</button></div>`}
      <ul>${index.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>`;

  host.querySelector('[data-index-clear]')?.addEventListener('click', () =>
    actions.setPlot({ index: null, indexM: null, indexSlider: 50 }));
  host.querySelector('[data-index-loglog]')?.addEventListener('click', () =>
    actions.setPlot({ xLog: true, yLog: true }));
  host.querySelector('[data-index-axes]')?.addEventListener('click', () =>
    actions.setPlot({ x: 'density', y: index.numerator, xLog: true, yLog: true, indexM: null, indexSlider: 50 }));

  host.querySelector('[data-index-m]')?.addEventListener('input', (ev) => {
    const vals = pts.map((q) => indexValue(q.material, index)).filter((v) => v !== null).sort((a, b) => a - b);
    if (!vals.length) return;
    const t = Number(ev.target.value) / 100;
    const lo = vals[0] * 0.9, hi = vals[vals.length - 1] * 1.1;
    actions.setPlot({ indexM: lo + (hi - lo) * t, indexSlider: Number(ev.target.value) });
  });
}

function wireControls(host, state, actions) {
  host.querySelectorAll('[data-axis]').forEach((s) => s.addEventListener('change', () =>
    actions.setPlot({ [s.dataset.axis]: s.value, indexM: null })));
  host.querySelectorAll('[data-log]').forEach((b) => b.addEventListener('click', () =>
    actions.setPlot({ [`${b.dataset.log}Log`]: b.dataset.on === '1' })));
  host.querySelector('[data-swap]')?.addEventListener('click', () => {
    const p = state.scenario.plot;
    const x = AXIS_DEFS.find((a) => a.key === p.x) ?? AXIS_DEFS[0];
    const y = AXIS_DEFS.find((a) => a.key === p.y) ?? AXIS_DEFS[1];
    actions.setPlot({ x: y.key, y: x.key, xLog: !!p.yLog, yLog: !!p.xLog, indexM: null });
  });
  host.querySelector('[data-detail]')?.addEventListener('change', (e) =>
    actions.setPlot({ detail: e.target.value }));
  host.querySelector('[data-index]')?.addEventListener('change', (e) =>
    actions.setPlot({ index: e.target.value || null, indexM: null, indexSlider: 50 }));
  host.querySelector('[data-reference]')?.addEventListener('change', (e) =>
    actions.setPlot({ showReference: e.target.checked }));
  host.querySelector('[data-baseline]')?.addEventListener('change', (e) => actions.setBaseline(e.target.value));
  host.querySelector('[data-show-estimates]')?.addEventListener('change', (e) =>
    actions.setPlot({ showEstimates: e.target.checked }));
}
