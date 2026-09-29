// The chart machinery the Ashby lens's views share (D107): the plot's size and legend for a width, one resize listener for
// whichever plot is on screen, labels that never print over each other, axis ranges, and the requirement, reference and
// familiar-filament overlays. The decision workspace (decision.js) and the catalogue and evidence views (ashby.js) draw
// their own marks and use these for everything around them, so the two cannot drift apart in how a chart is framed.

import { esc } from './format.js';
import { describeConstraint } from './labels.js';

// Plotly's own responsive mode adds a window resize listener per plot, which holds every replaced plot alive: 800
// redraws once left 1,408 listeners and a 569 MB heap (audit 2026-09-15, A-04). Purging a replaced plot instead races
// Plotly's asynchronous auto-margin redraw and throws. So plots are not responsive on their own: one listener, added
// once, resizes whichever plot is on screen, and a replaced plot has nothing left holding it.
let resizeWired = false;
export function wireResize() {
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
      const fit = lensChartSize(gd, gd._legendNames ?? []);
      gd.style.height = `${fit.height}px`;
      Plotly.relayout(gd, { height: fit.height, legend: fit.legend, margin: fit.margin }).then(() => Plotly.Plots.resize(gd));
    }, 100);
  });
}

/** Below this width the legend goes under the chart: beside it, it took 60% of a tablet's width and lay over a phone's points. */
export const LEGEND_BELOW = 900;
/**
 * How far below the chart's top edge a legend beside the plot starts, in pixels. Plotly's mode bar sits over the top right
 * corner of the chart, and a legend starting at the plot's top edge put its first entry (PLA) behind the mode bar's
 * buttons whenever the pointer was over the chart. The bar is about 30 px tall with its margin; this clears it.
 */
const MODEBAR_CLEARANCE = 46;
/** The chart's top margin, and roughly what the horizontal axis takes below the plot with its ticks and title. */
export const PLOT_MARGIN_TOP = 16;
export const PLOT_MARGIN_BOTTOM = 76;

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

/** Point labels, range labels and requirement labels are this size (px). */
export const LABEL_FONT = 11;
// A point without a label carries a space, not an empty string. Plotly drops the text element of an empty label, and
// the next update then drops the point's text group without drawing the name it was given, so a label placed after a
// zoom or a resize would not appear until the draw after that.
export const NO_LABEL = ' ';
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
export function placeLabels(gd) {
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
    if (!shown[i] || !Array.isArray(t.customdata) || !((t.customdata[0]?.length ?? 0) >= 8)) return;
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
export function hexToRgba(hex, alpha) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})` : hex;
}

/**
 * Axis range with a little headroom, expressed the way Plotly wants it: log10 bounds on a log
 * axis, data bounds otherwise.
 */
export function axisRange(values, isLog) {
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
export function errorBars(list, key) {
  const arr = list.map((q) => (q[key]?.uncertainty ?? 0));
  if (!arr.some((v) => v > 0)) return { visible: false };
  return { type: 'data', array: arr, visible: true, thickness: 1, width: 3, color: 'rgba(0,0,0,.35)' };
}


// ------------------------------------------------------------------ overlays shared by every view

/**
 * Where a value goes on a Log axis. Plotly (4.x) takes an annotation's position in LOG10 SPACE and a shape's in data
 * units. Both used to be log10, which put a requirement line on a Log chart at the log of its value: "Stiffness at least
 * 3 GPa" was drawn at 0.48 GPa, under its own label at 3. Non-positive values have no log, so anything that cannot be
 * placed is dropped rather than drawn in the wrong place.
 */
export function placers(p) {
  return {
    X: (v) => (p.xLog ? (v > 0 ? Math.log10(v) : null) : v),
    Y: (v) => (p.yLog ? (v > 0 ? Math.log10(v) : null) : v),
    SX: (v) => (p.xLog && !(v > 0) ? null : v),
    SY: (v) => (p.yLog && !(v > 0) ? null : v),
    placeable: (...vs) => vs.every((v) => v !== null && Number.isFinite(v)),
  };
}

/**
 * A requirement on either axis: a dashed line at its value and a label in the pill's words, plus the obstacle the label
 * placement keeps clear of. `requirementLabels` are anchored once the axis range is known (anchorRequirementLabels).
 */
export function requirementOverlay(constraints, xDef, yDef, p) {
  const { X, Y, SX, SY, placeable } = placers(p);
  const shapes = [], annotations = [], fixed = [], requirementLabels = [];
  for (const [def, axis] of [[xDef, 'x'], [yDef, 'y']]) {
    const c = constraints.find((k) => k.kind === 'numeric' && k.property === def.key && k.mandatory !== false);
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
      // Pressed, it opens the filter rail at this requirement, the one place it is changed (D108).
      captureevents: true, hovertext: 'Change this requirement in Filters', _property: c.property,
    };
    annotations.push(label);
    const obstacle = { kind: 'requirement', axis, value: c.value, name: describeConstraint(c) };
    fixed.push(obstacle);
    if (axis === 'x') requirementLabels.push({ label, obstacle, at });
  }
  return { shapes, annotations, fixed, requirementLabels };
}

/**
 * Beside its line, on the side with the plot's room: centred on a line near the right edge, "Density at most 1500
 * kg/m³" ran out of the plot and under the legend.
 */
export function anchorRequirementLabels(requirementLabels, xRange) {
  for (const { label, obstacle, at } of requirementLabels) {
    const side = xRange && at > (xRange[0] + xRange[1]) / 2 ? 'right' : 'left';
    label.xanchor = side;
    obstacle.anchor = side;
  }
}

/** Reference envelopes (steel, aluminium, wood): min-to-max rectangles, behind everything, unmistakably not data. */
export function referenceOverlay(reference, xDef, yDef, p) {
  const { X, Y, SX, SY, placeable } = placers(p);
  const shapes = [], annotations = [], fixed = [], labels = [];
  const eq = reference?.meta?.axisEquivalence ?? {};
  const xKey = Object.keys(eq).find((k) => eq[k] === xDef.key);
  const yKey = Object.keys(eq).find((k) => eq[k] === yDef.key);
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
      fixed.push({ kind: 'reference', x: rx.max, y: ry.max, name: r.name, left: x1 < (X(rx.min) + 0.001) });
      const label = { x: x1, y: y1, text: r.name, showarrow: false, xanchor: 'right', yanchor: 'bottom', font: { size: 11, color: '#9a9a90' } };
      annotations.push(label);
      labels.push({ label, x0, x1 });
    }
  } else {
    annotations.push({
      xref: 'paper', yref: 'paper', x: 0.5, y: 1.04, showarrow: false,
      text: 'Reference materials have no equivalent for one of these axes', font: { size: 11, color: '#8d8d84' },
    });
  }
  return { shapes, annotations, fixed, labels };
}

/**
 * A reference's name sits at its box's top right, running left; a box near the chart's left edge has its name run right
 * from its top left instead (D111), where "Hardwood (oak) parallel to the grain" had been cut to "ak) parallel to…".
 */
export function anchorReferenceLabels(labels = [], xRange) {
  if (!xRange) return;
  const [a, b] = xRange;
  for (const { label, x0, x1 } of labels) {
    if ((x1 - a) / (b - a) < 0.35) Object.assign(label, { x: x0, xanchor: 'left' });
  }
}

/**
 * The familiar filament, drawn as a single labelled cross. It is a reference, not a candidate: it is excluded from the
 * Pareto front, from every count, and from the index-line tally, exactly like the steel and aluminium envelopes. Null
 * when it has no value on one of the axes.
 */
export function anchorTrace(anchor, xDef, yDef) {
  const ax = anchor?.headline?.[xDef.key], ay = anchor?.headline?.[yDef.key];
  if (!anchor || !ax?.known || !ay?.known) return null;
  return {
    fixed: { kind: 'text', x: ax.value, y: ay.value, name: anchor.name, position: 'bottom center', radius: 7.5 },
    trace: {
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
    },
  };
}

/** The theme's ink and grid for a chart: Plotly draws its own text, so it is told which theme is on. */
export function chartTheme() {
  const dark = (matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light')
    || document.documentElement.dataset.theme === 'dark';
  return { dark, ink: dark ? '#ecedef' : '#1a1a18', grid: dark ? '#32353d' : '#e4e4de', muted: dark ? '#7f838d' : '#85857c' };
}

/**
 * Explicit ranges. Plotly's autorange reads a shape coordinate as a data value while rendering it in log space, so a
 * constraint line at log10(1500) dragged the axis down to 3. Computing the range ourselves from everything we actually drew
 * avoids that and keeps the overlays on screen.
 */
export function spans(traces, shapes, extra = { x: [], y: [] }) {
  const xSpan = [...extra.x], ySpan = [...extra.y];
  for (const sh of shapes) {
    // Plotly defaults an unset xref/yref to the axis, so an undefined ref still counts. The reference rectangles rely on
    // that default, and skipping them left the layer drawn off screen.
    if (sh.xref === 'x' || sh.xref === undefined) { xSpan.push(sh.x0, sh.x1); }
    if (sh.yref === 'y' || sh.yref === undefined) { ySpan.push(sh.y0, sh.y1); }
  }
  for (const t of traces) {
    // Lines, and the baseline cross, which would otherwise be drawn outside a range computed only from the candidates.
    if (t.mode === 'lines' || t._span) { for (const v of t.x) xSpan.push(v); for (const v of t.y) ySpan.push(v); }
  }
  return { xSpan, ySpan };
}

/**
 * The reader's own zoom (D109), kept across redraws for as long as the axes and their scales are the same: a press on a
 * switch, a filter or the line redraws the chart, and a zoom that snapped back after each one was lost work. A new pair of
 * axes starts from the whole picture, and a double-click on the chart, or Show all, gives it back.
 */
export const zoomMemory = { sig: null, x: null, y: null };
export const zoomSig = (p) => `${p.x}|${p.y}|${!!p.xLog}|${!!p.yLog}`;
export const forgetZoom = () => { zoomMemory.sig = null; zoomMemory.x = null; zoomMemory.y = null; };
/** Put the remembered zoom on a layout about to be drawn; true when it did. */
export function applyZoom(layout, sig) {
  if (zoomMemory.sig !== sig || !zoomMemory.x || !zoomMemory.y) return false;
  layout.xaxis.range = [...zoomMemory.x];
  layout.yaxis.range = [...zoomMemory.y];
  return true;
}
/** Remember what the reader zooms or pans to; `onReset` runs on a double-click, which asks for the whole picture. */
export function watchZoom(gd, sig, { onZoom = () => {}, onReset = () => {} } = {}) {
  gd.on('plotly_relayout', (ev) => {
    if (!ev) return;
    if (ev['xaxis.autorange'] || ev['yaxis.autorange']) { forgetZoom(); onReset(); return; }
    const moved = Object.keys(ev).some((k) => /^[xy]axis\.range/.test(k));
    if (!moved) return;
    Object.assign(zoomMemory, { sig, x: [...gd.layout.xaxis.range], y: [...gd.layout.yaxis.range] });
    onZoom();
  });
}

/**
 * The size and legend of every Ashby chart, whichever view draws it (D111): the chart fills what the lens shows of it, so
 * the plot and its controls are on one screen, at least a 450 px plot on a wide screen and 360 px on a laptop, at most
 * 640; where the page scrolls as a whole (a phone) it keeps its width-based height. The legend sits beside a plot at least
 * 1000 px wide, clear of the mode bar, and under a narrower one. The catalogue view had its own rule, so its legend moved
 * and its plot changed height when the reader changed view.
 */
export function lensChartSize(gd, legendNames) {
  const width = gd.clientWidth;
  const fit = chartFit(Math.max(width, 400), legendNames);
  const beside = width >= 1000;
  const legend = beside ? chartFit(width, legendNames).legend
    : { orientation: 'h', x: 0, xanchor: 'left', xref: 'paper', y: 0, yanchor: 'bottom', yref: 'container', traceorder: 'normal', font: { size: 11 } };
  const rows = beside ? 0 : Math.ceil(legendNames.length / Math.max(1, Math.floor(Math.max(200, width - 20) / (44 + 6.4 * Math.max(0, ...legendNames.map((n) => n.length))))));
  const legendHeight = rows ? rows * 19 + 16 : 0;
  const lens = gd.closest('.lens-view');
  const scrollsItself = lens && getComputedStyle(lens).overflowY !== 'visible';
  const minPlot = window.innerWidth > 1100 ? 450 : 360;
  const frame = PLOT_MARGIN_TOP + 44 + legendHeight;
  const room = scrollsItself ? lens.clientHeight - (gd.getBoundingClientRect().top - lens.getBoundingClientRect().top + lens.scrollTop) - 14 : null;
  const height = scrollsItself ? Math.round(Math.max(minPlot + frame, Math.min(640 + legendHeight, room))) : fit.height;
  return { height, legend, beside, margin: { l: 64, r: beside ? 8 : 16, t: PLOT_MARGIN_TOP, b: 44 } };
}

/**
 * Tick labels a reader can read on a Log axis (D111). Across more than one decade Plotly labels the minor ticks with a
 * bare digit, so "2" stood above "10" and "5" under "0.01", read as values. Here every label is the number itself: 1, 2
 * and 5 per decade across up to three decades, 1 and 3 up to six, the decades beyond; inside one decade Plotly's own
 * labels are whole numbers already and are left alone.
 */
export function logTicks(range) {
  if (!Array.isArray(range) || !(range[1] - range[0] >= 1)) return { tickmode: 'auto', tickvals: null, ticktext: null };
  const [lo, hi] = range;
  const span = hi - lo;
  const steps = span <= 3 ? [1, 2, 5] : span <= 6 ? [1, 3] : [1];
  const vals = [];
  for (let d = Math.floor(lo); d <= Math.ceil(hi); d++) {
    for (const s of steps) { const v = s * 10 ** d; const l = Math.log10(v); if (l >= lo - 1e-9 && l <= hi + 1e-9) vals.push(Number(v.toPrecision(3))); }
  }
  const text = (v) => (v >= 10000 ? `${Number((v / 1000).toPrecision(3))}k` : String(Number(v.toPrecision(3))));
  return { tickmode: 'array', tickvals: vals, ticktext: vals.map(text) };
}
/** Put readable ticks on a layout's Log axes before it is drawn. */
export function applyLogTicks(layout) {
  for (const ax of ['xaxis', 'yaxis']) if (layout[ax]?.type === 'log') Object.assign(layout[ax], logTicks(layout[ax].range));
}
/** Keep them readable as the reader zooms and pans. */
export function watchLogTicks(gd) {
  gd.on('plotly_relayout', (ev) => {
    if (!ev || !Object.keys(ev).some((k) => /^[xy]axis\.(range|autorange)/.test(k))) return;
    const patch = {};
    for (const ax of ['xaxis', 'yaxis']) {
      if (gd.layout[ax]?.type !== 'log') continue;
      const t = logTicks(gd.layout[ax].range);
      Object.assign(patch, { [`${ax}.tickmode`]: t.tickmode, [`${ax}.tickvals`]: t.tickvals, [`${ax}.ticktext`]: t.ticktext });
    }
    if (Object.keys(patch).length) Plotly.relayout(gd, patch);
  });
}
