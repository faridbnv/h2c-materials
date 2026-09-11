// Ashby workspace.
//
// A property chart turns selection into geometry: constraints become boxes, indices become lines,
// and the best material is the one furthest along the line.
//
// Rules enforced here:
//  - the axis picker reports the point count BEFORE drawing, because some pairs are genuinely thin;
//  - Strict comparability is the default, and Broad names exactly what it mixed;
//  - reference materials are a drawing layer, never candidates;
//  - two axes, two categorical encodings, at most one size encoding.

import { INDICES, indexById, indexValue, selectionLine, countAbove } from '../engine/indices.js';
import { paretoFront, sortFront } from '../engine/pareto.js';
import { buildFamilyColors, FILLER_SYMBOL, FILLER_LABEL, esc, fmtNumber } from './format.js';
import { AXIS_DEFS, axisByKey, measurementMatches, pairable } from './axes.js';

let dragState = null;

export function renderAshby(host, state, actions) {
  const { db, reference, rows, scenario } = state;
  const p = scenario.plot;
  const xDef = AXIS_DEFS.find((a) => a.key === p.x) ?? AXIS_DEFS[0];
  const yDef = AXIS_DEFS.find((a) => a.key === p.y) ?? AXIS_DEFS[1];

  const measurementMode = p.pointLevel === 'measurements';
  const { pts, mixed, unavailable } = measurementMode
    ? measurementPoints(rows, xDef, yDef, p.comparability, state.ctx)
    : headlinePoints(rows, xDef, yDef);

  const subjects = new Set(pts.map((q) => q.id)).size;
  const missing = rows.length - subjects;
  const thin = pts.length < 10;

  const axisSelect = (which, cur) => `<select data-axis="${which}">
    ${AXIS_DEFS.map((a) => {
      const n = rows.filter((r) => r.material.headline[a.key]?.known).length;
      return `<option value="${a.key}" ${a.key === cur ? 'selected' : ''}>${esc(a.label)} — ${n}</option>`;
    }).join('')}</select>`;

  host.innerHTML = `
    <div class="plot-controls">
      <div class="control"><label>X axis</label>${axisSelect('x', xDef.key)}</div>
      <div class="control"><label>Scale</label>
        <div class="segmented"><button data-log="x" aria-pressed="${!p.xLog}">Linear</button><button data-log="x" data-on="1" aria-pressed="${p.xLog}">Log</button></div></div>
      <div class="control"><label>Y axis</label>${axisSelect('y', yDef.key)}</div>
      <div class="control"><label>Scale</label>
        <div class="segmented"><button data-log="y" aria-pressed="${!p.yLog}">Linear</button><button data-log="y" data-on="1" aria-pressed="${p.yLog}">Log</button></div></div>
      <div class="control"><label>Points</label>
        <div class="segmented"><button data-level="headline" aria-pressed="${p.pointLevel === 'headline'}">Headline</button><button data-level="measurements" aria-pressed="${p.pointLevel === 'measurements'}">Measurements</button></div></div>
      <div class="control"><label>Comparability</label>
        <div class="segmented"><button data-comp="strict" aria-pressed="${p.comparability === 'strict'}">Strict</button><button data-comp="broad" aria-pressed="${p.comparability === 'broad'}">Broad</button></div></div>
      <div class="control"><label>Performance index</label>
        <select data-index>
          <option value="">None</option>
          ${INDICES.map((i) => `<option value="${i.id}" ${p.index === i.id ? 'selected' : ''}>${esc(i.designCase)}</option>`).join('')}
        </select></div>
      <div class="control"><label>Reference</label>
        <label style="font-weight:400"><input type="checkbox" data-reference ${p.showReference ? 'checked' : ''}> Generic materials</label></div>
    </div>

    ${unavailable ? `<div class="warn-chip">${esc(unavailable)}</div>` : ''}
    ${thin && !unavailable ? `<div class="warn-chip">Only ${pts.length} point${pts.length === 1 ? '' : 's'} can be drawn for this pair. Read this chart with care.</div>` : ''}
    ${p.showReference ? `<div class="banner">${esc(reference.meta.caveat)}</div>` : ''}
    ${mixed && mixed.length ? `<div class="banner">Broad comparability is mixing conditions: ${esc(mixed.join('; '))}. Each affected point is drawn hollow and names the mismatch on hover.</div>` : ''}
    ${measurementMode && p.comparability === 'strict' ? `<div class="banner">Strict comparability: only measurements matching the axis definition exactly. Switch to Broad to see what the looser evidence looks like.</div>` : ''}

    <div id="plot"></div>
    <div class="legend-note">
      ${measurementMode
        ? `${pts.length} measurement pair${pts.length === 1 ? '' : 's'} across ${subjects} of ${rows.length} candidates.`
        : `${pts.length} of ${rows.length} candidates plotted${missing ? `, ${missing} lack one or both properties and are not drawn as zero` : ''}.`}
      Colour is polymer family, marker shape is filler class.
    </div>
    <div id="index-card"></div>`;

  drawPlot(host, state, { xDef, yDef, pts, actions });
  renderIndexCard(host.querySelector('#index-card'), state, pts, actions);
  wireControls(host, state, actions);
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
      notes: [],
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
    return { pts: [], mixed: [], unavailable: `${which} has no measurement-level data, only a compiled headline. Switch Points back to Headline, or choose another axis.` };
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
        notes.forEach((n) => mixed.add(n));
        pts.push({
          id: m.id, name: m.name, family: m.family, filler: m.facets.reinforcement.value,
          material: m, evaluation: e,
          label: `${m.name} · ${ym.measurement.direction !== 'not-applicable' ? ym.measurement.direction : ym.measurement.gradeId}`,
          x: xm.measurement.value, y: ym.measurement.value,
          xh: { value: xm.measurement.value, unit: xm.measurement.unit, measurementId: xm.measurement.id, gradeId: xm.measurement.gradeId, direction: xm.measurement.direction },
          yh: { value: ym.measurement.value, unit: ym.measurement.unit, measurementId: ym.measurement.id, gradeId: ym.measurement.gradeId, direction: ym.measurement.direction, uncertainty: ym.measurement.uncertainty },
          notes,
        });
      }
    }
  }
  return { pts, mixed: [...mixed], unavailable: pts.length ? null : 'No measurement pair satisfies this axis pair under the current comparability. Try Broad, or a different pair.' };
}


function drawPlot(host, state, { xDef, yDef, pts, actions }) {
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

  const traces = [];
  for (const [key, list] of groups) {
    const [family, filler] = key.split('|');
    traces.push({
      type: 'scatter', mode: 'markers',
      name: `${family} · ${FILLER_LABEL[filler] ?? filler}`,
      legendgroup: family,
      x: list.map((q) => q.x), y: list.map((q) => q.y),
      customdata: list.map((q) => [q.id, q.label, q.evaluation.verdict,
        q.xh.measurementId ?? '', q.yh.measurementId ?? '',
        q.yh.direction ?? '', q.yh.gradeId ?? '',
        q.notes.length ? 'mixed: ' + q.notes.join(', ') : 'conditions match the axis definition']),
      error_x: errorBars(list, 'xh'),
      error_y: errorBars(list, 'yh'),
      marker: {
        size: 11,
        symbol: list.map((q) => FILLER_SYMBOL[q.filler] ?? 'circle'),
        color: colors.color(family),
        // Evidence status in the outline: a held candidate reads hollow.
        opacity: list.map((q) => (q.notes.length ? 0.5 : q.evaluation.verdict === 'PASS' ? 1 : 0.55)),
        line: { width: list.map((q) => (q.notes.length || q.evaluation.needsVerification ? 2 : 1)), color: 'rgba(0,0,0,.55)' },
      },
      hovertemplate:
        `<b>%{customdata[1]}</b><br>${esc(yDef.label)} %{y} ${esc(yDef.unit)}<br>${esc(xDef.label)} %{x} ${esc(xDef.unit)}`
        + `<br>Grade %{customdata[6]}<br>Direction %{customdata[5]}<br>%{customdata[7]}<br>%{customdata[2]} against current constraints<extra></extra>`,
    });
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
      text: `${def.label} ${c.operator} ${c.value}`, showarrow: false,
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

  // Pareto front over the eligible candidates only.
  const eligible = pts.filter((q) => q.evaluation.eligible);
  const front = sortFront(paretoFront(eligible, xDef.better, yDef.better), xDef.better);
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

  // Pinned materials keep permanent labels; nothing else does.
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
  for (const sh of shapes) {
    // Plotly defaults an unset xref/yref to the axis, so an undefined ref still counts. The
    // reference rectangles rely on that default, and skipping them left the layer drawn off screen.
    if (sh.xref === 'x' || sh.xref === undefined) { xSpan.push(unlog(sh.x0, p.xLog), unlog(sh.x1, p.xLog)); }
    if (sh.yref === 'y' || sh.yref === undefined) { ySpan.push(unlog(sh.y0, p.yLog), unlog(sh.y1, p.yLog)); }
  }
  for (const t of traces) {
    if (t.mode === 'lines') { for (const v of t.x) xSpan.push(v); for (const v of t.y) ySpan.push(v); }
  }

  const layout = {
    margin: { l: 70, r: 20, t: 16, b: 56 },
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: ink, family: 'system-ui, sans-serif', size: 12 },
    xaxis: { title: { text: `${xDef.label} (${xDef.unit})` }, type: p.xLog ? 'log' : 'linear',
             gridcolor: grid, zeroline: false, range: axisRange(xSpan, p.xLog), autorange: false },
    yaxis: { title: { text: `${yDef.label} (${yDef.unit})` }, type: p.yLog ? 'log' : 'linear',
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
  const above = countAbove(pts.map((q) => q.material), index, M);
  const evaluable = pts.filter((q) => indexValue(q.material, index) !== null).length;

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
          <strong>${above} above the line</strong>
          <span style="color:var(--ink-3);font-size:12px">of ${evaluable} evaluable</span>
        </div>
        ${!p.xLog || !p.yLog ? `<div class="warn-chip" style="margin-top:8px">The constant-index line is straight only on log-log axes. Switch both scales to Log to read it as a guideline.</div>` : ''}
      ` : `<div class="warn-chip" style="margin-top:8px">To draw this line, set X to Density and Y to ${esc(index.numerator === 'tensileModulusXY' ? 'Tensile modulus XY' : 'Tensile strength XY')}${index.costForm ? '. Cost-form indices are ranked in the table rather than drawn.' : '.'}</div>`}
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
  host.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () =>
    actions.setPlot({ pointLevel: b.dataset.level })));
  host.querySelectorAll('[data-comp]').forEach((b) => b.addEventListener('click', () =>
    actions.setPlot({ comparability: b.dataset.comp })));
  host.querySelector('[data-index]')?.addEventListener('change', (e) =>
    actions.setPlot({ index: e.target.value || null, indexM: null, indexSlider: 50 }));
  host.querySelector('[data-reference]')?.addEventListener('change', (e) =>
    actions.setPlot({ showReference: e.target.checked }));
}
