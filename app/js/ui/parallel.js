// Parallel coordinates, drawn as SVG.
//
// Two reasons this is hand-drawn rather than handed to the plotting library. Plotly's parcoords
// trace needs WebGL, which is missing on plenty of real machines (remote desktops, virtualised
// GPUs, locked-down builds) and fails with a raw library error rather than anything useful. And
// the previous build locked the whole lens above 30 candidates, which is the normal state, so the
// tab read as broken.
//
// The real constraint is neither of those: a line can only be drawn where every chosen axis has a
// value, and few materials have all six. So let the reader choose the axes, say plainly what each
// one costs in candidates, and draw what qualifies.

import { AXIS_DEFS } from './axes.js';
import { buildFamilyColors, esc, fmtNumber } from './format.js';
import { prop } from './labels.js';

const DEFAULT_AXES = ['density', 'tensileModulusXY', 'elongationXY', 'hdt045'];
const PAD = { top: 62, right: 62, bottom: 54, left: 62 };
const HEIGHT = 460;

export function renderParallel(host, state, actions) {
  const { rows, db, scenario } = state;
  // An empty choice is a choice. Unticking every axis used to bring the four defaults straight back,
  // so the checkboxes appeared to reverse themselves.
  const chosen = (Array.isArray(scenario.plot.parallelAxes) ? scenario.plot.parallelAxes : DEFAULT_AXES)
    .filter((k) => AXIS_DEFS.some((a) => a.key === k));

  const cost = AXIS_DEFS.map((a) => ({
    axis: a,
    withAxis: rows.filter((r) => r.material.headline[a.key]?.known).length,
    on: chosen.includes(a.key),
  }));
  const usable = rows.filter(({ material: m }) => chosen.every((k) => m.headline[k]?.known));

  // Materials held out only because one of the chosen axes is an estimate rather than a
  // measurement. A line is a position claim on every axis it crosses, so these cannot be drawn as
  // lines without inventing values. They are counted and named instead, so the reader knows the
  // difference between "this material is missing" and "this material is only estimated here".
  const estimateOnly = state.ctx?.showEstimates
    ? rows.filter(({ material: m }) =>
        !chosen.every((k) => m.headline[k]?.known)
        && chosen.every((k) => m.headline[k]?.known || m.headline[k]?.estimate))
    : [];

  host.innerHTML = `
    <div class="pc-axes">
      <div class="pc-axes-head">Axes <span>each one drops the candidates that lack it</span></div>
      <div class="pc-axis-list">
        ${cost.map(({ axis, withAxis, on }) => `
          <label class="pc-axis${on ? ' on' : ''}">
            <input type="checkbox" data-pc-axis="${axis.key}" ${on ? 'checked' : ''}>
            <span class="pc-name" title="${esc(prop(axis.key).technical)}">${esc(prop(axis.key).plain)}</span>
            <span class="pc-n">${withAxis}/${rows.length}</span>
          </label>`).join('')}
      </div>
    </div>
    <div id="pc-body"></div>`;

  host.querySelectorAll('[data-pc-axis]').forEach((b) => b.addEventListener('change', () => {
    const next = [...host.querySelectorAll('[data-pc-axis]')].filter((x) => x.checked).map((x) => x.dataset.pcAxis);
    actions.setPlot({ parallelAxes: next });
  }));

  const body = host.querySelector('#pc-body');
  if (chosen.length < 2) {
    body.innerHTML = `<div class="empty"><h3>Pick at least two axes</h3>
      <p>Parallel coordinates compares a candidate across several properties at once, so it needs
      two or more.</p></div>`;
    return;
  }
  if (usable.length === 1) {
    const only = usable[0].material;
    body.innerHTML = `<div class="empty"><h3>Only ${esc(only.name)} has all ${chosen.length} of these properties</h3>
      <p>Parallel lines compare candidates against each other, and one line has nothing to compare
        with. Drop an axis to bring more candidates in, or open ${esc(only.name)} to read its values.</p>
      <button class="btn" id="pc-open-only">Open ${esc(only.name)}</button></div>`;
    body.querySelector('#pc-open-only').addEventListener('click', () => actions.openMaterial(only.id));
    return;
  }
  if (usable.length < 2) {
    body.innerHTML = `<div class="empty"><h3>No candidate has all ${chosen.length} of these properties</h3>
      <p>${esc(chosen.map((k) => prop(k).plain).join(', '))}. A line is only
      drawn where every axis has a value, and nothing is invented to fill a gap. Drop the axis with
      the lowest count above, or open the Coverage lens to see where the gaps are.</p>
      ${estimateOnly.length ? `<p>${estimateOnly.length} candidate${estimateOnly.length === 1 ? ' has' : 's have'}
        an estimated range on at least one of these axes rather than nothing at all. A line commits
        to a value on every axis it crosses, so a range cannot be drawn as one. The Ashby lens can
        show those spans.</p>` : ''}</div>`;
    return;
  }
  draw(body, usable, chosen, db, state, actions, estimateOnly);
}

function draw(host, usable, chosen, db, state, actions, estimateOnly = []) {
  const colors = buildFamilyColors(db.materials);
  const axes = chosen.map((k) => AXIS_DEFS.find((a) => a.key === k));
  const width = Math.max(520, host.clientWidth || 900);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = axes.length > 1 ? innerW / (axes.length - 1) : 0;

  // Each axis scaled to its own range across the drawn set, which is what makes the shape readable.
  const scales = axes.map((a) => {
    const vs = usable.map((r) => r.material.headline[a.key].value);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
    return { lo, hi };
  });

  const xAt = (i) => PAD.left + i * step;
  // End axes anchor inward so their labels and ticks cannot run off the drawing.
  const anchor = (i) => (i === 0 ? 'start' : i === axes.length - 1 ? 'end' : 'middle');
  const yAt = (i, v) => {
    const { lo, hi } = scales[i];
    return PAD.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  };

  const lines = usable.map(({ material: m, evaluation: e }) => {
    const pts = axes.map((a, i) => `${xAt(i)},${yAt(i, m.headline[a.key].value)}`).join(' ');
    return { id: m.id, name: m.name, family: m.family, pts, verdict: e.verdict, material: m };
  });

  const crowded = lines.length > 40;
  const families = [...new Set(lines.map((l) => l.family))];

  host.innerHTML = `
    <svg class="pc-svg" viewBox="0 0 ${width} ${HEIGHT}" width="100%" height="${HEIGHT}" role="img"
         aria-label="Parallel coordinates of ${lines.length} candidates across ${axes.length} properties">
      ${axes.map((a, i) => `
        <g class="pc-axis-g">
          <line x1="${xAt(i)}" y1="${PAD.top}" x2="${xAt(i)}" y2="${PAD.top + innerH}" class="pc-line-axis"/>
          <text x="${xAt(i)}" y="${PAD.top - 38}" class="pc-lbl" text-anchor="${anchor(i)}">${esc(prop(a.key).short)}</text>
          <text x="${xAt(i)}" y="${PAD.top - 25}" class="pc-lbl-unit" text-anchor="${anchor(i)}">${esc(a.unit)}</text>
          <text x="${xAt(i)}" y="${PAD.top - 8}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].hi)}</text>
          <text x="${xAt(i)}" y="${PAD.top + innerH + 17}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].lo)}</text>
        </g>`).join('')}
      <g class="pc-lines">
        ${lines.map((l) => `<polyline points="${l.pts}" class="pc-poly" data-id="${esc(l.id)}"
           style="stroke:${colors.color(l.family)};opacity:${crowded ? 0.45 : 0.75}"><title>${esc(l.name)} · ${esc(l.family)}</title></polyline>`).join('')}
      </g>
    </svg>
    <div class="pc-legend">
      ${families.slice(0, 10).map((f) => `<span class="pc-key"><i style="background:${colors.color(f)}"></i>${esc(f)}</span>`).join('')}
    </div>
    <div class="legend-note">
      ${lines.length} of ${state.rows.length} candidates have all ${axes.length} properties and are drawn.
      ${state.rows.length - lines.length ? `${state.rows.length - lines.length} do not, and are left out rather than drawn at zero.` : ''}
      Each axis is scaled to its own range across the drawn set. Hover a line to read it, click to open the material.
      ${estimateOnly.length ? `<br><b>${estimateOnly.length} of those</b> have an estimated range on at
        least one of these axes rather than a gap: ${esc(estimateOnly.slice(0, 8).map((r) => r.material.name).join(', '))}${estimateOnly.length > 8 ? ` and ${estimateOnly.length - 8} more` : ''}.
        A line commits to a value on every axis it crosses, so an estimated range cannot be drawn as
        one. Their spans are on the Ashby lens, and in the table.` : ''}
    </div>`;

  host.querySelectorAll('.pc-poly').forEach((el) => {
    el.addEventListener('click', () => actions.openMaterial(el.dataset.id));
    el.addEventListener('mouseenter', () => el.classList.add('hot'));
    el.addEventListener('mouseleave', () => el.classList.remove('hot'));
  });
}
