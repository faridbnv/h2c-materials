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
// Below this width the axes' labels and ticks run into each other, so the drawing keeps it and scrolls sideways.
const MIN_WIDTH = 520;

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
  // The host's own width, so the drawing is at its natural size: a 520-wide drawing scaled into a phone's 358 px shrank
  // its labels to 8 px. Where the host is narrower than the minimum, the drawing keeps the minimum in a box that scrolls
  // sideways, rather than being squeezed or spilling past the screen.
  const width = Math.max(MIN_WIDTH, host.clientWidth || 900);
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
  // A line's values in words: its readout, and its name for a screen reader.
  const valuesOf = (l) => axes.map((a) => `${prop(a.key).short} ${fmtNumber(l.material.headline[a.key].value)} ${a.unit}`);

  // Each line is a group of two polylines: the one drawn, and a wide transparent one over it that takes the pointer, so a
  // finger can hit a line under two pixels wide. The group is the focusable control.
  host.innerHTML = `
    <div class="pc-readout" aria-live="polite">
      <span class="pc-readout-text">${esc(IDLE)}</span>
      <button type="button" class="btn btn-sm pc-open" hidden>Open material</button>
    </div>
    <div class="pc-scroll"><svg class="pc-svg" viewBox="0 0 ${width} ${HEIGHT}" width="100%" height="${HEIGHT}" style="min-width:${MIN_WIDTH}px" role="group"
         aria-label="Parallel coordinates of ${lines.length} candidates across ${axes.length} properties">
      <rect class="pc-bg" x="0" y="0" width="${width}" height="${HEIGHT}"/>
      ${axes.map((a, i) => `
        <g class="pc-axis-g" aria-hidden="true">
          <line x1="${xAt(i)}" y1="${PAD.top}" x2="${xAt(i)}" y2="${PAD.top + innerH}" class="pc-line-axis"/>
          <text x="${xAt(i)}" y="${PAD.top - 38}" class="pc-lbl" text-anchor="${anchor(i)}">${esc(prop(a.key).short)}</text>
          <text x="${xAt(i)}" y="${PAD.top - 25}" class="pc-lbl-unit" text-anchor="${anchor(i)}">${esc(a.unit)}</text>
          <text x="${xAt(i)}" y="${PAD.top - 8}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].hi)}</text>
          <text x="${xAt(i)}" y="${PAD.top + innerH + 17}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].lo)}</text>
        </g>`).join('')}
      <g class="pc-lines">
        ${lines.map((l) => `<g class="pc-line" data-id="${esc(l.id)}" tabindex="0" role="button"
           aria-label="${esc(`${l.name}, ${l.family}: ${valuesOf(l).join(', ')}. Press Enter to open it.`)}">
           <title>${esc(l.name)} · ${esc(l.family)}</title>
           <polyline points="${l.pts}" class="pc-poly" style="stroke:${colors.color(l.family)};opacity:${crowded ? 0.45 : 0.75}"/>
           <polyline points="${l.pts}" class="pc-hit"/></g>`).join('')}
      </g>
      <polyline class="pc-poly pc-raised" points="" aria-hidden="true"/>
    </svg></div>
    <div class="pc-legend">
      ${families.slice(0, 10).map((f) => `<span class="pc-key"><i style="background:${colors.color(f)}"></i>${esc(f)}</span>`).join('')}
    </div>
    <div class="legend-note">
      ${lines.length} of ${state.rows.length} candidates have all ${axes.length} properties and are drawn.
      ${state.rows.length - lines.length ? `${state.rows.length - lines.length} do not, and are left out rather than drawn at zero.` : ''}
      Each axis is scaled to its own range across the drawn set. Point at a line to read it and click it to open the material;
      on a touch screen, tap a line to read it, then Open material. From the keyboard, Tab reaches each line and Enter opens it.
      ${estimateOnly.length ? `<br><b>${estimateOnly.length} of those</b> have an estimated range on at
        least one of these axes rather than a gap: ${esc(estimateOnly.slice(0, 8).map((r) => r.material.name).join(', '))}${estimateOnly.length > 8 ? ` and ${estimateOnly.length - 8} more` : ''}.
        A line commits to a value on every axis it crosses, so an estimated range cannot be drawn as
        one. Their spans are on the Ashby lens, and in the table.` : ''}
    </div>`;

  const byId = new Map(lines.map((l) => [l.id, l]));
  const readout = host.querySelector('.pc-readout-text');
  const openBtn = host.querySelector('.pc-open');
  let selected = null;
  // What the readout shows: the line under the pointer while there is one, else the line last tapped or focused.
  const show = (g) => {
    const l = g && byId.get(g.dataset.id);
    if (!l) { readout.textContent = IDLE; openBtn.hidden = true; return; }
    readout.innerHTML = `<b>${esc(l.name)}</b> <span class="pc-readout-family">${esc(l.family)}</span> ${valuesOf(l).map((v) => `<span class="pc-readout-value">${esc(v)}</span>`).join(' ')}`;
    openBtn.hidden = false;
    openBtn.dataset.id = l.id;
    openBtn.setAttribute('aria-label', `Open ${l.name}`);
  };
  // The line being read is drawn again above all the others, so it is not hidden under its neighbours. Moving the line's
  // own element to the top would have changed the Tab order and taken focus off it.
  const raised = host.querySelector('.pc-raised');
  const raise = (g) => {
    const line = g?.querySelector('.pc-poly');
    raised.setAttribute('points', line ? line.getAttribute('points') : '');
    raised.style.stroke = line ? line.style.stroke : '';
  };
  const select = (g) => {
    if (selected && selected !== g) selected.classList.remove('selected');
    selected = g;
    g?.classList.add('selected');
    raise(g);
    show(g);
  };

  // A first tap on a touch screen used to open the drawer at once, so a line could not be read before it was opened: a
  // tap or a pen now selects the line and shows it above the chart, with Open material as the explicit next step. A
  // mouse keeps what it had, hover to read and a click to open.
  let pointer = 'mouse';
  host.querySelector('.pc-svg').addEventListener('pointerdown', (ev) => { pointer = ev.pointerType || 'mouse'; }, true);
  host.querySelectorAll('.pc-line').forEach((g) => {
    g.addEventListener('click', () => {
      if (pointer === 'mouse') actions.openMaterial(g.dataset.id);
      else select(g);
    });
    g.addEventListener('mouseenter', () => { g.classList.add('hot'); raise(g); show(g); });
    g.addEventListener('mouseleave', () => { g.classList.remove('hot'); raise(selected); show(selected); });
    // Keyboard: Tab selects the line as it arrives, Enter or Space opens it.
    g.addEventListener('focus', () => select(g));
    g.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actions.openMaterial(g.dataset.id); }
    });
  });
  // A tap on the chart away from every line clears the selection.
  host.querySelector('.pc-bg').addEventListener('click', () => select(null));
  openBtn.addEventListener('click', () => { if (openBtn.dataset.id) actions.openMaterial(openBtn.dataset.id); });
}

const IDLE = 'Point at a line, tap it or Tab to it to read its values here.';
