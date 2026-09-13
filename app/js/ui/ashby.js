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
import { buildFamilyColors, FILLER_SYMBOL, FILLER_LABEL, esc, fmtNumber } from './format.js';
import { AXIS_DEFS, axisByKey, measurementMatches, pairable } from './axes.js';
import { prop } from './labels.js';

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
    label: 'One dot per material',
    help: 'The headline value for each material. Best for choosing.',
  },
  {
    id: 'measured',
    label: 'Every measurement',
    help: 'One dot per grade per measurement, so you can see the spread and the difference between print directions.',
  },
  {
    id: 'measured-mixed',
    label: 'Every measurement, mixed conditions',
    help: 'Also includes measurements taken a different way, for example a different print direction. Those are drawn hollow.',
  },
];

/** Read the current level, migrating scenarios saved under the old two-switch scheme. */
export function detailLevel(p) {
  if (p.detail && DETAIL_LEVELS.some((d) => d.id === p.detail)) return p.detail;
  if (p.pointLevel === 'measurements') return p.comparability === 'broad' ? 'measured-mixed' : 'measured';
  return 'material';
}


export function renderAshby(host, state, actions) {
  const { db, reference, rows, scenario } = state;
  const p = scenario.plot;
  const xDef = AXIS_DEFS.find((a) => a.key === p.x) ?? AXIS_DEFS[0];
  const yDef = AXIS_DEFS.find((a) => a.key === p.y) ?? AXIS_DEFS[1];

  const level = detailLevel(p);
  const measurementMode = level !== 'material';
  const { pts, mixed, unavailable } = measurementMode
    ? measurementPoints(rows, xDef, yDef, level === 'measured-mixed' ? 'broad' : 'strict', state.ctx)
    : headlinePoints(rows, xDef, yDef);

  // Only in "one dot per material": at measurement level every point is already a real
  // measurement, and a family bound has nothing to say about an individual grade.
  const estimated = measurementMode ? [] : estimateEnvelopes(rows, xDef, yDef, state.ctx?.useEstimates);
  const envelopes = p.showEstimates ? estimated : [];

  const subjects = new Set(pts.map((q) => q.id)).size;
  // Only for the footer note. drawPlot computes the front it actually draws.
  const frontSize = paretoFront(pts.filter((q) => q.evaluation.eligible), xDef.better, yDef.better).length;
  const missing = rows.length - subjects - estimated.length;
  const thin = pts.length < 10;

  // "Price — 10" read as ten dollars. Name the property, then say what the number counts.
  const axisSelect = (which, cur) => `<select data-axis="${which}">
    ${AXIS_DEFS.map((a) => {
      const n = rows.filter((r) => r.material.headline[a.key]?.known).length;
      const est = state.ctx?.useEstimates
        ? rows.filter((r) => { const h = r.material.headline[a.key]; return h && !h.known && h.estimate; }).length
        : 0;
      const P = prop(a.key);
      const count = est ? `${n} measured, ${est} estimated` : `${n} of ${rows.length} have it`;
      return `<option value="${a.key}" ${a.key === cur ? 'selected' : ''}>${esc(P.plain)} (${count})</option>`;
    }).join('')}</select>`;

  host.innerHTML = `
    <div class="plot-controls">
      <div class="control"><label>X axis</label>${axisSelect('x', xDef.key)}</div>
      <div class="control"><label>Scale</label>
        <div class="segmented"><button data-log="x" aria-pressed="${!p.xLog}">Linear</button><button data-log="x" data-on="1" aria-pressed="${p.xLog}">Log</button></div></div>
      <div class="control"><label>Y axis</label>${axisSelect('y', yDef.key)}</div>
      <div class="control"><label>Scale</label>
        <div class="segmented"><button data-log="y" aria-pressed="${!p.yLog}">Linear</button><button data-log="y" data-on="1" aria-pressed="${p.yLog}">Log</button></div></div>
    </div>

    <div class="plot-controls secondary">
      <div class="control"><label>Show</label>
        <select data-detail>
          ${DETAIL_LEVELS.map((d) => `<option value="${d.id}" ${level === d.id ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
        </select>
        <div class="control-help">${esc(DETAIL_LEVELS.find((d) => d.id === level).help)}</div>
      </div>
      <div class="control"><label>Best for a given weight</label>
        <select data-index>
          <option value="">Not shown</option>
          ${INDICES.map((i) => `<option value="${i.id}" ${p.index === i.id ? 'selected' : ''}>${esc(i.designCase)}</option>`).join('')}
        </select>
        <div class="control-help">Draws the line engineers use to pick the lightest material that still does the job.</div></div>
      <div class="control"><label>Estimated materials</label>
        ${estimated.length ? `
          <label class="inline-check"><input type="checkbox" data-show-estimates ${p.showEstimates ? 'checked' : ''}>
            Show the ${estimated.length} with no measurement here</label>
          <div class="control-help">Drawn as a dotted range rather than a dot, because the value is
            the span of their closest relatives and not a position anyone measured.</div>`
          : `<div class="control-help">${measurementMode
              ? 'Not used when every measurement is drawn: an estimate describes a material, not a grade.'
              : state.ctx?.useEstimates
              ? 'No candidate on these axes has an estimate to draw.'
              : state.scenario.unknownPolicy === 'exploration'
              ? 'Estimates are off. Tick Estimates in the top bar to use them.'
              : 'Estimates are off. They are available in Explore, where they can rule a material out.'}</div>`}
      </div>
      <div class="control"><label>Compare against</label>
        <select data-baseline>
          <option value="">Nothing</option>
          ${BASELINE_NAMES.map((n) => db.materials.find((q) => q.name === n)).filter(Boolean)
            .map((q) => `<option value="${esc(q.id)}" ${state.baseline === q.id ? 'selected' : ''}>${esc(q.name)}</option>`).join('')}
        </select>
        <label class="inline-check"><input type="checkbox" data-reference ${p.showReference ? 'checked' : ''}> Also steel, aluminium, wood</label>
        <div class="control-help">A filament you already know, drawn as a blue cross. The metals are grey boxes for scale.</div></div>
    </div>

    ${unavailable ? `<div class="warn-chip">${esc(unavailable)}</div>` : ''}
    ${thin && !unavailable ? `<div class="warn-chip">Only ${pts.length} point${pts.length === 1 ? '' : 's'} can be drawn for this pair. Read this chart with care.</div>` : ''}
    ${p.showReference ? `<div class="banner">${esc(reference.meta.caveat)}</div>` : ''}
    ${mixed && mixed.length ? `<div class="banner"><b>Some of these were measured a different way</b>
      from the axis definition: ${esc(mixed.join('; '))}. They are drawn hollow, and hovering one
      names the mismatch. They are included so the trade space can be seen whole, never merged into
      a headline.</div>` : ''}

    <div id="plot"></div>
    <div class="legend-note">
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
           ${level === 'measured-mixed' ? '<br><b>Hollow dots</b> were measured a different way from the axis definition, for example in another print direction. They are included here so you can see them, and named on hover.' : ''}`
        : `${pts.length} of ${rows.length} candidates plotted${missing ? `, ${missing} lack one or both properties and are not drawn as zero` : ''}.`}
      Colour is polymer family, marker shape is filler class.
      ${estimated.length && !p.showEstimates
        // Counted even when not drawn, so they are never silently absent. That silence was the
        // whole problem: a quarter of the set vanished from the chart while the table listed them.
        ? `<br><b>${estimated.length} more candidate${estimated.length === 1 ? ' has' : 's have'}</b> no measurement of
           ${estimated.length === 1 ? 'its' : 'their'} own on one of these axes, only the range of
           ${estimated.length === 1 ? 'its' : 'their'} closest relatives. Not drawn. Tick
           <b>Estimated materials</b> above to see where ${estimated.length === 1 ? 'it falls' : 'they fall'}.`
        : ''}
      ${envelopes.length ? `<br><b>The dotted ranges</b> are ${envelopes.length} material${envelopes.length === 1 ? '' : 's'}
        with no measurement of their own on one of these axes. Each spans the values its closest
        measured relatives take, so the material is somewhere along it. A whisker means the other
        axis is measured. It is an estimate, not a position: it never joins the frontier and never
        counts as a plotted candidate.` : ''}
      ${frontSize > 1 ? `<br><b>The dotted line</b> joins the materials that nothing else beats on
        both axes at once: ${esc(prop(xDef.key).plain.toLowerCase())} ${xDef.better === 'max' ? 'higher' : 'lower'} is better,
        ${esc(prop(yDef.key).plain.toLowerCase())} ${yDef.better === 'max' ? 'higher' : 'lower'} is better.
        Anything on the ${yDef.better === 'max' ? 'lower' : 'upper'} ${xDef.better === 'max' ? 'left' : 'right'} side of it is beaten by something on the line.` : ''}
    </div>
    <div id="index-card"></div>`;

  drawPlot(host, state, { xDef, yDef, pts, envelopes, actions });
  renderIndexCard(host.querySelector('#index-card'), state, pts, actions);
  wireControls(host, state, actions);
}

/**
 * Materials the chart cannot draw as a point, because at least one axis is a family estimate
 * rather than a measurement.
 *
 * These used to vanish. On density against stiffness that is 25 of the 96 in-scope materials: a
 * quarter of the set silently absent from the picture the tool exists to draw, while the table two
 * tabs away listed them with their estimated span. Worse, an estimate is exactly what rules a
 * material out of a filter in Explore mode, so the reader could see a material excluded by an
 * estimate and find no trace of that estimate on the chart.
 *
 * They are drawn as an envelope rather than a dot. A dot would need a value, and the midpoint of a
 * family bound is a number nobody measured — the one thing this tool refuses to put on a chart.
 * The envelope says what is actually known: somewhere in here.
 */
function estimateEnvelopes(rows, xDef, yDef, useEstimates) {
  if (!useEstimates) return [];
  const span = (h) => {
    if (h?.known) return { lo: h.value, hi: h.value, measured: true };
    const e = h && h.estimate;
    return e ? { lo: e.lo, hi: e.hi, measured: false, basis: e.basis, peers: e.peerCount } : null;
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
    return { pts: [], mixed: [], unavailable: `${which} has no measurement-level data, only a compiled headline. Set Show to "One dot per material", or choose another axis.` };
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
  return { pts, mixed: [...mixed], unavailable: pts.length ? null : 'No measurement matches both of these axes under the current setting. Try "Every measurement, mixed conditions", or a different pair of axes.' };
}


function drawPlot(host, state, { xDef, yDef, pts, envelopes = [], actions }) {
  const { scenario, reference, db } = state;
  const p = scenario.plot;
  const colors = buildFamilyColors(db.materials, p.promotedFamilies ?? []);

  // One trace per family+filler pair keeps colour and shape independent and gives an
  // interactive legend that hides by family.
  const groups = new Map();
  for (const q of pts) {
    const key = `${q.family}|${q.filler}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  }

  const eligibleForFront = pts.filter((q) => q.evaluation.eligible);
  const frontNow = paretoFront(eligibleForFront, xDef.better, yDef.better);
  const measurementMode = pts.some((q) => q.notes !== undefined && q.xh?.measurementId && q.yh?.measurementId);
  const labelPoints = pts.length <= 30;
  const keepLabel = new Set([...frontNow.map((q) => q.id), ...scenario.shortlist]);

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
  for (const [key, list] of groups) {
    const [family, filler] = key.split('|');
    traces.push({
      type: 'scatter',
      // Label the points. A chart of anonymous dots cannot be read: the legend maps colour and
      // shape to family and filler, not to a material, so there is otherwise no way to tell which
      // dot is which except by hovering every one. Past about 30 the labels themselves become the
      // clutter, so beyond that only the frontier and the shortlist keep theirs.
      mode: labelPoints ? 'markers+text' : 'markers',
      text: list.map((q) => {
        const show = labelPoints || keepLabel.has(q.id);
        if (!show) return '';
        // At measurement level only the leftmost dot of a material carries its name.
        if (measurementMode) return labelled.has(q) ? q.name : '';
        return q.label;
      }),
      textposition: 'top center',
      textfont: { size: 10, color: 'rgba(107,107,99,.95)' },
      cliponaxis: false,
      name: `${family} · ${FILLER_LABEL[filler] ?? filler}`,
      legendgroup: family,
      x: list.map((q) => q.x), y: list.map((q) => q.y),
      customdata: list.map((q) => [q.id, q.label, q.evaluation.verdict,
        q.xh.measurementId ?? '', q.yh.measurementId ?? '',
        q.yh.direction ?? '', q.yh.gradeId ?? '',
        q.relaxed.length ? 'mixed: ' + q.relaxed.join(', ')
          : q.notes.length ? q.notes.join(', ')
          : 'conditions match the axis definition']),
      error_x: errorBars(list, 'xh'),
      error_y: errorBars(list, 'yh'),
      marker: {
        size: 11,
        symbol: list.map((q) => FILLER_SYMBOL[q.filler] ?? 'circle'),
        color: colors.color(family),
        // Evidence status in the outline: a held candidate reads hollow.
        opacity: list.map((q) => (q.relaxed.length ? 0.5 : q.evaluation.verdict === 'PASS' ? 1 : 0.55)),
        line: { width: list.map((q) => (q.relaxed.length || q.evaluation.needsVerification ? 2 : 1)), color: 'rgba(0,0,0,.55)' },
      },
      hovertemplate:
        `<b>%{customdata[1]}</b><br>${esc(yDef.label)} %{y} ${esc(yDef.unit)}<br>${esc(xDef.label)} %{x} ${esc(xDef.unit)}`
        + `<br>Grade %{customdata[6]}<br>Direction %{customdata[5]}<br>%{customdata[7]}<br>%{customdata[2]} against current constraints<extra></extra>`,
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
        opacity: 0.35, hoverinfo: 'skip', showlegend: false,
      });
    }
  }

  const shapes = [];
  const annotations = [];

  // Plotly expects shape and annotation coordinates in LOG10 SPACE on a log axis, not in data
  // units. Passing raw values put the steel reference rectangle at 10^215 and destroyed the range.
  // Non-positive values have no log, so anything that cannot be placed is dropped rather than drawn
  // in the wrong place.
  const X = (v) => (p.xLog ? (v > 0 ? Math.log10(v) : null) : v);
  const Y = (v) => (p.yLog ? (v > 0 ? Math.log10(v) : null) : v);
  const placeable = (...vs) => vs.every((v) => v !== null && Number.isFinite(v));

  // Constraint overlay: threshold lines and a shaded feasible quadrant.
  for (const [def, axis] of [[xDef, 'x'], [yDef, 'y']]) {
    const c = scenario.constraints.find((k) => k.property === def.key && k.mandatory !== false);
    if (!c) continue;
    const at = axis === 'x' ? X(c.value) : Y(c.value);
    if (!placeable(at)) continue;
    shapes.push({
      type: 'line', xref: axis === 'x' ? 'x' : 'paper', yref: axis === 'y' ? 'y' : 'paper',
      x0: axis === 'x' ? at : 0, x1: axis === 'x' ? at : 1,
      y0: axis === 'y' ? at : 0, y1: axis === 'y' ? at : 1,
      line: { color: 'rgba(163,43,31,.85)', width: 2, dash: 'dash' },
    });
    annotations.push({
      xref: axis === 'x' ? 'x' : 'paper', yref: axis === 'y' ? 'y' : 'paper',
      x: axis === 'x' ? at : 0.01, y: axis === 'y' ? at : 0.99,
      text: `${prop(def.key).plain} ${c.operator} ${c.value}`, showarrow: false,
      font: { size: 10, color: '#a32b1f' }, bgcolor: 'rgba(255,255,255,.75)',
    });
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
          type: 'rect', x0, x1, y0, y1, layer: 'below',
          line: { color: 'rgba(150,150,140,.95)', width: 1.25, dash: 'dot' },
          fillcolor: 'rgba(141,141,132,.10)',
        });
        annotations.push({
          x: x1, y: y1, text: r.name, showarrow: false,
          // Anchor inward at the left edge so a wide label is not clipped off the plot.
          xanchor: x1 < (X(rx.min) + 0.001) ? 'left' : 'right', yanchor: 'bottom',
          font: { size: 9, color: '#9a9a90' },
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
    traces.push({
      type: 'scatter', mode: 'markers+text', name: `${anchor.name} (baseline)`,
      x: [ax.value], y: [ay.value],
      text: [anchor.name], textposition: 'bottom center',
      textfont: { size: 11, color: '#1f5f8b' },
      marker: { size: 15, symbol: 'x-thin-open', color: '#1f5f8b', line: { width: 2.5, color: '#1f5f8b' } },
      _span: true,
      hovertemplate: `<b>${esc(anchor.name)}</b> — baseline, not a candidate`
        + `<br>${esc(yDef.label)} %{y} ${esc(yDef.unit)}<br>${esc(xDef.label)} %{x} ${esc(xDef.unit)}<extra></extra>`,
    });
  }

  // Estimated materials, as envelopes. Where one axis is measured the envelope collapses to a line
  // on that axis, which is the honest picture: the position is known in one direction and bounded
  // in the other.
  //
  // They are deliberately not points, are never on the Pareto front, and are never counted as
  // candidates plotted. Inference cannot dominate evidence.
  // Labels only where they can be read. Twenty-five overlapping names is not information.
  const labelEnvelopes = envelopes.length <= 8;
  for (const q of envelopes) {
    const x0 = X(q.x.lo), x1 = X(q.x.hi), y0 = Y(q.y.lo), y1 = Y(q.y.hi);
    if (!placeable(x0, x1, y0, y1)) continue;
    const c = colors.color(q.family);
    // One axis measured: the range collapses to a whisker, which is the stronger statement and the
    // lighter mark. Both estimated: a box, drawn fainter still, because it says much less.
    const flat = x0 === x1 || y0 === y1;
    shapes.push({
      type: flat ? 'line' : 'rect',
      x0, x1, y0, y1, layer: 'below',
      line: { color: c, width: flat ? 1.5 : 1, dash: 'dot' },
      fillcolor: flat ? undefined : 'rgba(141,141,132,.04)',
      opacity: flat ? 0.7 : 0.45,
    });
    if (labelEnvelopes || scenario.shortlist.includes(q.id)) {
      annotations.push({
        x: (x0 + x1) / 2, y: y1, text: q.name, showarrow: false,
        xanchor: 'center', yanchor: 'bottom',
        font: { size: 9, color: c }, opacity: 0.9,
      });
    }
  }
  // Shapes carry no legend entry, so the key is a trace with no data.
  if (envelopes.length) {
    traces.push({
      type: 'scatter', mode: 'lines', name: 'Estimated range, not measured',
      x: [null], y: [null], line: { color: 'rgba(120,120,112,.9)', width: 1.5, dash: 'dot' },
      hoverinfo: 'skip', showlegend: true,
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

  // Index selection line. Slope is fixed by the index; position is M.
  const index = indexById(p.index);
  if (index && index.numerator === yDef.key && xDef.key === 'density' && !index.costForm) {
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

  // Pinned materials keep a leader line so they stand out among the trace labels.
  for (const q of pts) {
    if (scenario.shortlist.includes(q.id)) {
      const ax = X(q.x), ay = Y(q.y);
      if (!placeable(ax, ay)) continue;
      annotations.push({ x: ax, y: ay, text: q.label, showarrow: true, arrowhead: 0, arrowsize: 0.6, ax: 18, ay: -18, font: { size: 11 } });
    }
  }

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
    if (sh.xref === 'x' || sh.xref === undefined) { xSpan.push(unlog(sh.x0, p.xLog), unlog(sh.x1, p.xLog)); }
    if (sh.yref === 'y' || sh.yref === undefined) { ySpan.push(unlog(sh.y0, p.yLog), unlog(sh.y1, p.yLog)); }
  }
  for (const t of traces) {
    // Lines, and the baseline cross, which would otherwise be drawn outside a range computed only
    // from the candidates.
    if (t.mode === 'lines' || t._span) { for (const v of t.x) xSpan.push(v); for (const v of t.y) ySpan.push(v); }
  }

  const layout = {
    margin: { l: 70, r: 20, t: 16, b: 56 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: ink, family: 'system-ui, sans-serif', size: 12 },
    xaxis: { title: { text: `${prop(xDef.key).plain} (${xDef.unit})` }, type: p.xLog ? 'log' : 'linear',
             gridcolor: grid, zeroline: false, range: axisRange(xSpan, p.xLog), autorange: false },
    yaxis: { title: { text: `${prop(yDef.key).plain} (${yDef.unit})` }, type: p.yLog ? 'log' : 'linear',
             gridcolor: grid, zeroline: false, range: axisRange(ySpan, p.yLog), autorange: false },
    shapes, annotations,
    showlegend: true,
    legend: { orientation: 'v', x: 1.01, y: 1, font: { size: 10 } },
    // Zoom, not lasso. With lasso as the default every stray drag turned into a candidate subset,
    // which read as the chart filtering itself at random. Lasso stays one click away in the mode bar.
    dragmode: 'zoom',
    hovermode: 'closest',
  };

  const gd = host.querySelector('#plot');
  Plotly.newPlot(gd, traces, layout, {
    displaylogo: false, responsive: true,
    modeBarButtonsToRemove: ['select2d'],
    modeBarButtonsToAdd: [],
  });

  gd.on('plotly_click', (ev) => {
    const id = ev.points?.[0]?.customdata?.[0];
    if (id) actions.openMaterial(id);
  });
  gd.on('plotly_selected', (ev) => {
    if (!ev?.points?.length) return;
    actions.selectSubset(ev.points.map((pt) => pt.customdata?.[0]).filter(Boolean));
  });
}

/** Shape coordinates are stored in log space on a log axis; recover the data value. */
const unlog = (v, isLog) => (typeof v === 'number' ? (isLog ? 10 ** v : v) : null);

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

const defaultM = (pts, index) => {
  const vals = pts.map((q) => indexValue(q.material, index)).filter((v) => v !== null).sort((a, b) => b - a);
  return vals.length ? vals[Math.min(4, vals.length - 1)] : 1;
};

function renderIndexCard(host, state, pts, actions) {
  const p = state.scenario.plot;
  const index = indexById(p.index);
  if (!index) { host.innerHTML = ''; return; }

  const yDef = AXIS_DEFS.find((a) => a.key === p.y);
  const applicable = index.numerator === yDef?.key && p.x === 'density' && !index.costForm;
  const M = p.indexM ?? defaultM(pts, index);
  // The index is a property of a material's headline values, so it counts materials. In the
  // measurement modes one material has several dots, and counting dots counted it several times.
  const unique = [...new Map(pts.map((q) => [q.id, q.material])).values()];
  const above = countAbove(unique, index, M);
  const evaluable = unique.filter((m) => indexValue(m, index) !== null).length;

  host.innerHTML = `
    <div class="index-card">
      <h4>${esc(index.designCase)}</h4>
      <div>Maximise <span class="formula">M = ${esc(index.formula)}</span> ·
        selection line of slope ${index.slope} on log-log axes</div>
      ${index.note ? `<div style="color:var(--ink-2);margin-top:5px">${esc(index.note)}</div>` : ''}
      ${applicable ? `
        <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label style="font-size:12px">Move the line</label>
          <input type="range" data-index-m min="0" max="100" value="${p.indexSlider ?? 50}" style="flex:1;min-width:160px">
          <span style="font-family:var(--mono);font-size:12px">M = ${M.toPrecision(3)}</span>
          <strong>${above} material${above === 1 ? '' : 's'} above the line</strong>
          <span style="color:var(--ink-3);font-size:12px">of ${evaluable} with both headline values${detailLevel(p) === 'material' ? '' : '; counted by material, from headline values, not by dot'}</span>
        </div>
        ${!p.xLog || !p.yLog ? `<div class="warn-chip" style="margin-top:8px">The constant-index line is straight only on log-log axes. Switch both scales to Log to read it as a guideline.</div>` : ''}
      ` : `<div class="warn-chip" style="margin-top:8px">To draw this line, set X to Density and Y to ${esc(prop(index.numerator).plain)}${index.costForm ? '. A cost-form index needs price on an axis, so it is not drawn here.' : '.'}</div>`}
      <ul>${index.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </div>`;

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
