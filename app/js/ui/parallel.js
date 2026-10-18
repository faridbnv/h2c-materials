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
import { familyColors, esc, fmtNumber, fmtBounded, publishedBound, chip } from './format.js';
import { prop } from './labels.js';

/** An axis is logarithmic when its drawn values' largest is more than this many times their smallest (Compare's rule). */
const LOG_AXIS_RATIO = 100;

const DEFAULT_AXES = ['density', 'tensileModulusXY', 'elongationXY', 'hdt045'];
const PAD = { top: 62, right: 62, bottom: 54, left: 62 };
// Up to this many lines, each is named at its right end. Beyond it the names would run into each other (C44).
const NAMED_MAX = 15;
const NAME_PAD = 128, NAME_CHARS = 18, NAME_GAP = 13;
// The axes a scenario opens on: the properties it asks about, and so many in all (C42).
const OPEN_AXES = 4, OPEN_AXES_MAX = 5;
const OPERATOR_MARK = { '>=': '≥', '<=': '≤', '>': '>', '<': '<' };
const VERDICT_WORD = { UNKNOWN: 'could not be checked against a requirement', FAIL: 'fails a requirement' };

/**
 * The axes Parallel lines opens on while the reader has chosen none: the properties the scenario's requirements name,
 * the required ones first and then the reported ones, filled to four from the usual four (density, stiffness, elongation,
 * heat), at most five, and drawn in the order of the axis chips so that ticking one never reorders the rest. A scenario
 * that asks about price opens with a price axis; one that asks about nothing opens as it always did.
 */
export function openingAxes(constraints = []) {
  const order = (k) => AXIS_DEFS.findIndex((a) => a.key === k);
  const asked = (required) => constraints
    .filter((c) => c.kind === 'numeric' && order(c.property) >= 0 && (c.mandatory !== false) === required)
    .map((c) => c.property).sort((a, b) => order(a) - order(b));
  const picked = [...new Set([...asked(true), ...asked(false)])].slice(0, OPEN_AXES_MAX);
  for (const k of DEFAULT_AXES) if (picked.length < OPEN_AXES && !picked.includes(k) && order(k) >= 0) picked.push(k);
  return picked.sort((a, b) => order(a) - order(b));
}

/** Labels' vertical places, spread so neighbours keep `gap` px between them and as near each line's own end as they can. */
function spreadLabels(ys, gap, lo, hi) {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = ys.map((y) => Math.min(hi, Math.max(lo, y)));
  for (let k = 1; k < order.length; k++) out[order[k]] = Math.max(out[order[k]], out[order[k - 1]] + gap);
  const last = order[order.length - 1];
  if (last !== undefined && out[last] > hi) {
    out[last] = hi;
    for (let k = order.length - 2; k >= 0; k--) out[order[k]] = Math.min(out[order[k]], out[order[k + 1]] - gap);
  }
  return out;
}
const HEIGHT = 460;
// Below this width the axes' labels and ticks run into each other, so the drawing keeps it and scrolls sideways.
const MIN_WIDTH = 520;

export function renderParallel(host, state, actions) {
  const { rows, db, scenario } = state;
  // An empty choice is a choice. Unticking every axis used to bring the four defaults straight back,
  // so the checkboxes appeared to reverse themselves.
  const chosen = (Array.isArray(scenario.plot.parallelAxes) ? scenario.plot.parallelAxes : openingAxes(scenario.constraints))
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
  draw(body, usable, chosen, state, actions, estimateOnly);
}

function draw(host, usable, chosen, state, actions, estimateOnly = []) {
  const { scenario } = state;
  // The same call as the Ashby chart makes, so a family is one colour in both (C43).
  const colors = familyColors(state);
  const axes = chosen.map((k) => AXIS_DEFS.find((a) => a.key === k));
  const tested = scenario.constraints.length > 0;
  // A small set is named at its right end, which takes room the axes would otherwise have (C44).
  const named = usable.length <= NAMED_MAX;
  const pad = { ...PAD, right: named ? NAME_PAD : PAD.right };
  // The host's own width, so the drawing is at its natural size: a 520-wide drawing scaled into a phone's 358 px shrank
  // its labels to 8 px. Where the host is narrower than the minimum, the drawing keeps the minimum in a box that scrolls
  // sideways, rather than being squeezed or spilling past the screen.
  const width = Math.max(MIN_WIDTH, host.clientWidth || 900);
  const innerW = width - pad.left - pad.right;
  const innerH = HEIGHT - pad.top - pad.bottom;
  const step = axes.length > 1 ? innerW / (axes.length - 1) : 0;

  // Each axis scaled to its own range across the drawn set, which is what makes the shape readable. An axis whose drawn
  // values are all positive and span more than a hundredfold is logarithmic, by Compare's rule: one elastomer at 400 %
  // elongation had pressed every other line onto the floor of a linear axis (REVIEW-0 F9, 2026-10-18).
  const scales = axes.map((a) => {
    const vs = usable.map((r) => r.material.headline[a.key].value);
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const log = lo > 0 && hi / lo > LOG_AXIS_RATIO;
    if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
    return { lo, hi, log };
  });

  const xAt = (i) => pad.left + i * step;
  // End axes anchor inward so their labels and ticks cannot run off the drawing.
  const anchor = (i) => (i === 0 ? 'start' : i === axes.length - 1 ? 'end' : 'middle');
  const yAt = (i, v) => {
    const { lo, hi, log } = scales[i];
    const t = log ? Math.log10 : (x) => x;
    return pad.top + innerH - ((t(v) - t(lo)) / (t(hi) - t(lo))) * innerH;
  };

  const last = axes.length - 1;
  const lines = usable.map(({ material: m, evaluation: e }) => ({
    id: m.id, name: m.name, family: m.family, material: m,
    pts: axes.map((a, i) => `${xAt(i)},${yAt(i, m.headline[a.key].value)}`).join(' '),
    yEnd: yAt(last, m.headline[axes[last].key].value),
    // Nothing is tested until a requirement is set, so no line is a result before then.
    verdict: tested ? e.verdict : 'PASS',
  }));

  const crowded = lines.length > 40;
  // A line's values in words: its readout, and its name for a screen reader.
  const valuesOf = (l) => axes.map((a) => `${prop(a.key).short} ${fmtBounded(l.material.headline[a.key].value, a.unit, publishedBound(l.material.headline[a.key]))}`);

  // The result of each line, as the Ashby chart draws it: one that could not be checked is dashed, one that failed is
  // faded (C40). They are here only when the table's chips ask for them.
  const hasVerdict = (v) => lines.some((l) => l.verdict === v);
  const verdictClass = (l) => (l.verdict === 'UNKNOWN' ? ' v-unknown' : l.verdict === 'FAIL' ? ' v-fail' : '');
  // Once anything drawn is shortlisted, those lines are at full weight and the rest lighter (C44).
  const shortSet = new Set(scenario.shortlist ?? []);
  const anyShort = lines.some((l) => shortSet.has(l.id));

  // The names at the right end, nudged apart so none sits on its neighbour.
  const nameAt = named ? spreadLabels(lines.map((l) => l.yEnd), NAME_GAP, pad.top - 4, pad.top + innerH + 4) : [];
  const nameOf = (n) => (n.length > NAME_CHARS ? `${n.slice(0, NAME_CHARS - 1)}…` : n);
  const label = (l, i, color) => {
    const x0 = xAt(last), y = nameAt[i];
    return `<g class="pc-tag-g" aria-hidden="true">${Math.abs(y - l.yEnd) > 1.5 ? `<polyline class="pc-leader" points="${x0},${l.yEnd} ${x0 + 6},${y}" style="stroke:${color}"/>` : ''}
      <text class="pc-tag" x="${x0 + 9}" y="${y}" dy=".35em">${shortSet.has(l.id) ? '★ ' : ''}${esc(nameOf(l.name))}</text></g>`;
  };

  // A requirement on an axis is drawn across it as Compare draws it across a track: a short line in the colour a failing
  // result takes, dashed where the question only reports it. One beyond the drawn values sits at that end of the axis,
  // doubled, with a chevron pointing the way it lies, rather than stretching the axis until the lines are slivers (C41).
  const marks = axes.flatMap((a, i) => scenario.constraints
    .filter((c) => c.kind === 'numeric' && c.property === a.key && Number.isFinite(c.value))
    .map((c) => {
      const { lo, hi, log } = scales[i];
      const past = c.value > hi ? 1 : (c.value < lo || (log && !(c.value > 0))) ? -1 : 0;
      return { i, c, past, y: past > 0 ? yAt(i, hi) : past < 0 ? yAt(i, lo) : yAt(i, c.value) };
    }));
  const markSvg = ({ i, c, past, y }) => {
    const x = xAt(i);
    // Its words go where the lines are fewest: left of the end axes (the names sit right of the last), right of the rest.
    const side = i === 0 || i === last ? -1 : 1;
    const text = `${OPERATOR_MARK[c.operator] ?? c.operator} ${fmtNumber(c.value)}`;
    const cx = x + side * 12;
    const chevron = past ? `<path class="pc-req-chev" d="M${cx - 3.5} ${y - past * 1} L${cx} ${y - past * 6} L${cx + 3.5} ${y - past * 1}"/>` : '';
    return `<g class="pc-req${c.mandatory === false ? ' tracked' : ''}${past ? ' beyond' : ''}" aria-hidden="true">
      <line class="pc-req-line" x1="${x - 9}" x2="${x + 9}" y1="${y}" y2="${y}"/>${chevron}
      <text class="pc-req-text" x="${x + side * (past ? 21 : 14)}" y="${y}" dy=".35em" text-anchor="${side < 0 ? 'end' : 'start'}">${esc(text)}</text></g>`;
  };
  const anyTracked = marks.some((m) => m.c.mandatory === false);
  const anyHard = marks.some((m) => m.c.mandatory !== false);

  // The key: the families drawn, in the Ashby chart's order, then one grey for every family past the palette, then what
  // the dashes, fading, red marks and weight mean, each only where it is on the chart.
  const drawn = new Set(lines.map((l) => l.family));
  const keyed = colors.named.filter((f) => drawn.has(f));
  const others = [...drawn].filter((f) => colors.isOther(f));
  const swatch = (inner) => `<svg class="pc-key-mark" width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">${inner}</svg>`;
  const keys = [
    ...keyed.map((f) => `<span class="pc-key"><i style="background:${colors.color(f)}"></i>${esc(f)}</span>`),
    ...(others.length ? [`<span class="pc-key" title="${esc(others.join(', '))}"><i style="background:${colors.color(null)}"></i>Other families</span>`] : []),
    ...(hasVerdict('UNKNOWN') ? [`<span class="pc-key">${swatch('<line class="pc-key-line v-unknown" x1="1" y1="5" x2="21" y2="5"/>')}Dashed: could not be checked against a requirement</span>`] : []),
    ...(hasVerdict('FAIL') ? [`<span class="pc-key">${swatch('<line class="pc-key-line v-fail" x1="1" y1="5" x2="21" y2="5"/>')}Faded: fails a requirement</span>`] : []),
    ...(marks.length ? [`<span class="pc-key">${swatch(`<line class="pc-key-req${anyTracked && !anyHard ? ' tracked' : ''}" x1="1" y1="5" x2="21" y2="5"/>`)}${
      anyHard && anyTracked ? 'A requirement, dashed where it is only reported' : anyTracked ? 'A requirement that is reported, not required' : 'A requirement'}${
      marks.some((m) => m.past) ? ', with a chevron where it lies past the end of the axis' : ''}</span>`] : []),
    ...(anyShort ? ['<span class="pc-key">★ Full weight: on the shortlist</span>'] : []),
  ];

  // Each line is a group of two polylines: the one drawn, and a wide transparent one over it that takes the pointer, so a
  // finger can hit a line under two pixels wide. The group is the focusable control.
  host.innerHTML = `
    <div class="pc-readout" aria-live="polite">
      <span class="pc-readout-text">${esc(IDLE)}</span>
      <button type="button" class="btn btn-sm pc-open" hidden>Open material</button>
    </div>
    <div class="pc-scroll"><svg class="pc-svg${crowded ? ' crowded' : ''}${anyShort ? ' has-short' : ''}" viewBox="0 0 ${width} ${HEIGHT}" width="100%" height="${HEIGHT}" style="min-width:${MIN_WIDTH}px" role="group"
         aria-label="Parallel coordinates of ${lines.length} candidates across ${axes.length} properties${marks.length ? '; each requirement is marked on its axis' : ''}">
      <rect class="pc-bg" x="0" y="0" width="${width}" height="${HEIGHT}"/>
      ${axes.map((a, i) => `
        <g class="pc-axis-g" aria-hidden="true">
          <line x1="${xAt(i)}" y1="${pad.top}" x2="${xAt(i)}" y2="${pad.top + innerH}" class="pc-line-axis"/>
          <text x="${xAt(i)}" y="${pad.top - 38}" class="pc-lbl" text-anchor="${anchor(i)}">${esc(prop(a.key).short)}</text>
          <text x="${xAt(i)}" y="${pad.top - 25}" class="pc-lbl-unit" text-anchor="${anchor(i)}">${esc(a.unit)}${scales[i].log ? ' · log' : ''}</text>
          <text x="${xAt(i)}" y="${pad.top - 8}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].hi)}</text>
          <text x="${xAt(i)}" y="${pad.top + innerH + 17}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].lo)}</text>
        </g>`).join('')}
      <g class="pc-lines">
        ${lines.map((l, i) => {
          const color = colors.color(l.family);
          const verdict = VERDICT_WORD[l.verdict];
          return `<g class="pc-line${verdictClass(l)}${shortSet.has(l.id) ? ' short' : ''}" data-id="${esc(l.id)}" tabindex="0" role="button"
           aria-label="${esc(`${l.name}, ${l.family}${verdict ? `, ${verdict}` : ''}${shortSet.has(l.id) ? ', shortlisted' : ''}: ${valuesOf(l).join(', ')}. Press Enter to open it.`)}">
           <title>${esc(l.name)} · ${esc(l.family)}${verdict ? ` · ${esc(verdict)}` : ''}</title>
           <polyline points="${l.pts}" class="pc-poly" style="stroke:${color}"/>
           ${named ? label(l, i, color) : ''}
           <polyline points="${l.pts}" class="pc-hit"/></g>`;
        }).join('')}
      </g>
      <g class="pc-reqs">${marks.map(markSvg).join('')}</g>
      <polyline class="pc-poly pc-raised" points="" aria-hidden="true"/>
    </svg></div>
    <div class="pc-legend">${keys.join('')}</div>
    <div class="legend-note">
      ${lines.length} of ${state.rows.length} candidates have all ${axes.length} properties and are drawn.
      ${state.rows.length - lines.length ? `${state.rows.length - lines.length} do not, and are left out rather than drawn at zero.` : ''}
      Each axis is scaled to its own range across the drawn set${scales.some((x) => x.log) ? '; one whose values span more than a hundredfold is logarithmic, marked log' : ''}. Point at a line to read it and click it to open the material;
      on a touch screen, tap a line to read it, then Open material. From the keyboard, Tab reaches each line and Enter opens it.
      ${estimateOnly.length ? `<br><b>${estimateOnly.length} of those</b> have an estimated range on at
        least one of these axes rather than a gap: ${esc(estimateOnly.slice(0, 8).map((r) => r.material.name).join(', '))}${estimateOnly.length > 8 ? ` and ${estimateOnly.length - 8} more` : ''}.
        A line commits to a value on every axis it crosses, so an estimated range cannot be drawn as
        one. Their spans are on the Ashby lens, and in the table.` : ''}
    </div>`;

  const byId = new Map(lines.map((l) => [l.id, l]));
  const groupOf = new Map([...host.querySelectorAll('.pc-line')].map((g) => [g.dataset.id, g]));
  const readout = host.querySelector('.pc-readout-text');
  const openBtn = host.querySelector('.pc-open');
  let selected = null;
  // What the readout shows: the line under the pointer while there is one, else the line last tapped or focused.
  const show = (g) => {
    const l = g && byId.get(g.dataset.id);
    if (!l) { readout.textContent = IDLE; openBtn.hidden = true; return; }
    readout.innerHTML = `<b>${esc(l.name)}</b> <span class="pc-readout-family">${esc(l.family)}</span>${l.verdict === 'PASS' ? '' : ` ${chip(l.verdict)}`} ${valuesOf(l).map((v) => `<span class="pc-readout-value">${esc(v)}</span>`).join(' ')}`;
    openBtn.hidden = false;
    openBtn.dataset.id = l.id;
    openBtn.setAttribute('aria-label', `Open ${l.name}`);
  };
  // The line being read is drawn again above all the others, so it is not hidden under its neighbours. Moving the line's
  // own element to the top would have changed the Tab order and taken focus off it. It keeps the line's dashes, so a line
  // that could not be checked still reads so while it is read.
  const raised = host.querySelector('.pc-raised');
  const raise = (g) => {
    const line = g?.querySelector('.pc-poly');
    raised.setAttribute('points', line ? line.getAttribute('points') : '');
    raised.style.stroke = line ? line.style.stroke : '';
    raised.classList.toggle('v-unknown', !!g?.classList.contains('v-unknown'));
  };
  // The line read and kept is the selection every lens shares (state.selected, the Ashby chart's picked-out material): a
  // line selected here is selected there, and one selected there is raised here on arrival. It is set without a redraw,
  // which would take the focus off the line (C44).
  const select = (g) => {
    if (selected && selected !== g) selected.classList.remove('selected');
    selected = g;
    g?.classList.add('selected');
    state.selected = g ? g.dataset.id : null;
    raise(g);
    show(g);
  };
  if (state.selected && groupOf.has(state.selected)) {
    selected = groupOf.get(state.selected);
    selected.classList.add('selected');
    raise(selected);
    show(selected);
  }

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
