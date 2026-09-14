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
        <p class="opt-help">Thin dotted outlines use each material family's colour.</p>`
      : state.ctx?.showEstimates
        ? '<div class="plot-data-state">No estimated ranges for these axes</div>'
        : state.scenario.unknownPolicy === 'exploration'
          ? '<div class="plot-data-state">Turn on Use estimates above to show ranges</div>'
          : '<div class="plot-data-state">Estimated ranges require Include uncertain</div>';

  const index = indexById(p.index);
  const cheapest = INDICES.filter((i) => i.costForm), lightest = INDICES.filter((i) => !i.costForm);
  const indexOption = (i) => `<option value="${i.id}" ${p.index === i.id ? 'selected' : ''}>${esc(i.designCase)}</option>`;

  const notices = [
    unavailable ? `<div class="warn-chip">${esc(unavailable)}</div>` : '',
    thin && !unavailable ? `<div class="warn-chip">Only ${pts.length} point${pts.length === 1 ? '' : 's'} can be drawn for this pair. Read this chart with care.</div>` : '',
    p.showReference ? `<div class="banner">${esc(reference.meta.caveat)}</div>` : '',
    mixed && mixed.length ? `<div class="banner"><span><b>Some of these were measured a different way</b>
      from the axis definition: ${esc(mixed.join('; '))}. They are drawn hollow, and hovering one
      names the mismatch. They are included so the trade space can be seen whole, never merged into
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
        <p class="opt-help">${index
          ? 'Move the line and read its caveats under the chart.'
          : 'The line engineers use to find the lightest or cheapest material that still does the job.'}</p>
      </div>
    </div>

    ${notices ? `<div class="ashby-notices">${notices}</div>` : ''}

    <div id="plot"></div>
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
           ${level === 'measured-mixed' ? '<br><b>Hollow dots</b> were measured a different way from the axis definition, for example in another print direction. They are included here so you can see them, and named on hover.' : ''}`
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
        A whisker means the other axis is measured. It is an estimate, not a position: it never joins the
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
export function estimateTrace(q, xDef, yDef, { color = '#8d8d84', fill = 'rgba(141,141,132,.025)', label = false } = {}) {
  const xEstimated = !q.x.measured;
  const yEstimated = !q.y.measured;
  const rangeText = (span, def) => span.measured
    ? `${fmtNumber(span.lo)} ${def.unit} (measured)`
    : `${fmtNumber(span.lo)}–${fmtNumber(span.hi)} ${def.unit} (estimated)`;
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
    textfont: { size: 9, color },
    line: { color, width: xEstimated && yEstimated ? 1.5 : 2.5, dash: 'dot' },
    // Plotly's data cleanup checks nested keys when marker is present. Omit unused
    // options entirely: marker: undefined makes range boxes abort the whole plot.
    ...(marker ? { marker } : {}),
    ...(fillMode ? { fill: fillMode, fillcolor: fill, hoveron } : {}),
    opacity: 0.82,
    name: q.name, legendgroup: q.family, showlegend: false,
    customdata: x.map(() => [q.id]), hovertemplate,
  };
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

  // Put range traces behind measured points. Unlike layout shapes, scatter traces stay in ordinary
  // data coordinates on linear, semi-log and log-log charts and provide a real hover target.
  const labelEstimates = envelopes.length <= 5;
  for (const q of envelopes) {
    const familyColor = colors.color(q.family);
    traces.push(estimateTrace(q, xDef, yDef, {
      color: familyColor,
      fill: hexToRgba(familyColor, 0.025),
      label: labelEstimates || scenario.shortlist.includes(q.id),
    }));
  }
  if (envelopes.length) {
    traces.push({
      type: 'scatter', mode: 'lines', name: 'Estimated range · family colour',
      x: [null], y: [null], line: { color: '#8d8d84', width: 2, dash: 'dot' },
      hoverinfo: 'skip', showlegend: true, legendgroup: 'estimate-key', legendrank: 1200,
    });
  }

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

/** Give a family colour a nearly transparent fill without changing its outline colour. */
function hexToRgba(hex, alpha) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})` : hex;
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
      <div class="index-head">
        <h4>${esc(index.designCase)}</h4>
        <button class="icon-btn" data-index-clear data-focus="index-clear" title="Remove this line" aria-label="Remove the design guide line">×</button>
      </div>
      <div>Maximise <span class="formula">M = ${esc(index.formula)}</span> ·
        selection line of slope ${index.slope} on log-log axes</div>
      ${index.note ? `<div style="color:var(--ink-2);margin-top:5px">${esc(index.note)}</div>` : ''}
      ${applicable ? `
        <div class="index-move">
          <label for="index-m">Move the line</label>
          <input type="range" id="index-m" data-index-m data-focus="index-m" min="0" max="100" value="${p.indexSlider ?? 50}">
          <span class="formula">M = ${M.toPrecision(3)}</span>
          <strong>${above} material${above === 1 ? '' : 's'} above the line</strong>
          <span class="index-of">of ${evaluable} with both headline values${detailLevel(p) === 'material' ? '' : '; counted by material, from headline values, not by dot'}</span>
        </div>
        ${!p.xLog || !p.yLog ? `<div class="index-fix"><span class="warn-chip">The line is straight only on log-log axes.</span>
          <button class="btn btn-sm" data-index-loglog data-focus="index-loglog">Switch both axes to Log</button></div>` : ''}
      ` : index.costForm
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
