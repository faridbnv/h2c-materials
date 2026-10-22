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

import { AXIS_DEFS } from '@atlas/pages/facts/axes';
import { familyColors, esc, fmtNumber, fmtBounded, publishedBound, chip } from '@atlas/pages/facts/format';
import { prop } from '@atlas/pages/facts/labels';
import { zoomScale } from '@atlas/pages/facts/scales';
import { Plotly } from './plotly.ts';
import type { Loose } from '@atlas/pages/loose';

/** An axis is logarithmic when its drawn values' largest is more than this many times their smallest (Compare's rule). */
const LOG_AXIS_RATIO = 100;

const DEFAULT_AXES = ['density', 'tensileModulusXY', 'elongationXY', 'hdt045'];
const PAD: Loose = { top: 62, right: 62, bottom: 54, left: 62 };
// Up to this many lines, each is named at its right end. Beyond it the names would run into each other (C44).
const NAMED_MAX = 15;
const NAME_PAD = 128, NAME_CHARS = 18, NAME_GAP = 13;
// The axes a scenario opens on: the properties it asks about, and so many in all (C42).
const OPEN_AXES = 4, OPEN_AXES_MAX = 5;
const OPERATOR_MARK: Loose = { '>=': '≥', '<=': '≤', '>': '>', '<': '<' };
const VERDICT_WORD: Loose = { UNKNOWN: 'could not be checked against a requirement', FAIL: 'fails a requirement' };

/**
 * The axes Parallel lines opens on while the reader has chosen none: the properties the scenario's requirements name,
 * the required ones first and then the reported ones, filled to four from the usual four (density, stiffness, elongation,
 * heat), at most five, and drawn in the order of the axis chips so that ticking one never reorders the rest. A scenario
 * that asks about price opens with a price axis; one that asks about nothing opens as it always did.
 */
export function openingAxes(constraints: Loose = []) {
  const order = (k: Loose) => AXIS_DEFS.findIndex((a: Loose) => a.key === k);
  const asked = (required: Loose) => constraints
    .filter((c: Loose) => c.kind === 'numeric' && order(c.property) >= 0 && (c.mandatory !== false) === required)
    .map((c: Loose) => c.property).sort((a: Loose, b: Loose) => order(a) - order(b));
  const picked = [...new Set([...asked(true), ...asked(false)])].slice(0, OPEN_AXES_MAX);
  for (const k of DEFAULT_AXES) if (picked.length < OPEN_AXES && !picked.includes(k) && order(k) >= 0) picked.push(k);
  return picked.sort((a: Loose, b: Loose) => order(a) - order(b));
}

/** Labels' vertical places, spread so neighbours keep `gap` px between them and as near each line's own end as they can. */
function spreadLabels(ys: Loose, gap: Loose, lo: Loose, hi: Loose) {
  const order = ys.map((_: Loose, i: Loose) => i).sort((a: Loose, b: Loose) => ys[a] - ys[b]);
  const out = ys.map((y: Loose) => Math.min(hi, Math.max(lo, y)));
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

export function renderParallel(host: Loose, state: Loose, actions: Loose) {
  const { rows, db, scenario } = state;
  // An empty choice is a choice. Unticking every axis used to bring the four defaults straight back,
  // so the checkboxes appeared to reverse themselves.
  const chosen = (Array.isArray(scenario.plot.parallelAxes) ? scenario.plot.parallelAxes : openingAxes(scenario.constraints))
    .filter((k: Loose) => AXIS_DEFS.some((a: Loose) => a.key === k));

  const cost = AXIS_DEFS.map((a: Loose) => ({
    axis: a,
    withAxis: rows.filter((r: Loose) => r.material.headline[a.key]?.known).length,
    on: chosen.includes(a.key),
  }));
  const usable = rows.filter(({ material: m }: Loose) => chosen.every((k: Loose) => m.headline[k]?.known));

  // Materials held out only because one of the chosen axes is an estimate rather than a
  // measurement. A line is a position claim on every axis it crosses, so these cannot be drawn as
  // lines without inventing values. They are counted and named instead, so the reader knows the
  // difference between "this material is missing" and "this material is only estimated here".
  const estimateOnly = state.ctx?.showEstimates
    ? rows.filter(({ material: m }: Loose) =>
        !chosen.every((k: Loose) => m.headline[k]?.known)
        && chosen.every((k: Loose) => m.headline[k]?.known || m.headline[k]?.estimate))
    : [];

  host.innerHTML = `
    <div class="pc-axes">
      <div class="pc-axes-head">Axes <span>each one drops the candidates that lack it</span></div>
      <div class="pc-axis-list">
        ${cost.map(({ axis, withAxis, on }: Loose) => `
          <label class="pc-axis${on ? ' on' : ''}">
            <input type="checkbox" data-pc-axis="${axis.key}" ${on ? 'checked' : ''}>
            <span class="pc-name" title="${esc(prop(axis.key).technical)}">${esc(prop(axis.key).plain)}</span>
            <span class="pc-n">${withAxis}/${rows.length}</span>
          </label>`).join('')}
      </div>
    </div>
    <div id="pc-body"></div>`;

  host.querySelectorAll('[data-pc-axis]').forEach((b: Loose) => b.addEventListener('change', () => {
    const next = [...host.querySelectorAll('[data-pc-axis]')].filter((x: Loose) => x.checked).map((x: Loose) => x.dataset.pcAxis);
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
      <p>${esc(chosen.map((k: Loose) => prop(k).plain).join(', '))}. A line is only
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

function draw(host: Loose, usable: Loose, chosen: Loose, state: Loose, actions: Loose, estimateOnly: Loose = []) {
  const { scenario } = state;
  // The same call as the Ashby chart makes, so a family is one colour in both (C43).
  const colors = familyColors(state);
  const axes = chosen.map((k: Loose) => AXIS_DEFS.find((a: Loose) => a.key === k));
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
  // Far outliers are parked at the axis end (C47), after the material pages' rule (material-stats.js propertyScale): over
  // eight lines, the core is the values without the two lowest and the two highest, and it decides whether the axis is
  // logarithmic; the axis then reaches every value within one core's span beyond the core (in decades on a log axis), and
  // a value further out ends its line at the axis end, under a chevron, its value in the readout. One elastomer at 0.006
  // GPa had made the modulus axis logarithmic and packed 53 rigid materials into its top third. The ticks are round
  // numbers (C45): three to five on a linear axis, the decades on a logarithmic one.
  const scales = axes.map((a: Loose) => {
    const vs = usable.map((r: Loose) => r.material.headline[a.key].value).sort((x: Loose, y: Loose) => x - y);
    const core = vs.length > 8 ? vs.slice(2, -2) : vs;
    const log = core[0] > 0 && core[core.length - 1] / core[0] > LOG_AXIS_RATIO;
    const t = log ? Math.log10 : (x: Loose) => x;
    const span = t(core[core.length - 1]) - t(core[0]) || (log ? 1 : Math.abs(core[0]) * 0.5 || 1);
    const near = vs.filter((v: Loose) => (!log || v > 0) && t(v) >= t(core[0]) - span && t(v) <= t(core[core.length - 1]) + span);
    let lo = near[0], hi = near[near.length - 1];
    if (lo === hi) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
    const z = zoomScale([lo, hi], a.unit, log);
    let ticks = z.ticks;
    if (log) { const decades = ticks.filter((v: Loose) => Number.isInteger(Math.log10(v))); if (decades.length >= 2) ticks = decades; }
    while (ticks.length > 5) ticks = ticks.filter((_: Loose, k: Loose) => k % 2 === 0);
    return { lo: z.from, hi: z.hi, log, ticks, below: vs.filter((v: Loose) => v < z.from || (log && !(v > 0))).length, above: vs.filter((v: Loose) => v > z.hi).length };
  });

  const xAt = (i: Loose) => pad.left + i * step;
  // End axes anchor inward so their labels and ticks cannot run off the drawing.
  const anchor = (i: Loose) => (i === 0 ? 'start' : i === axes.length - 1 ? 'end' : 'middle');
  // A value beyond the scale sits at its end (parked); `beyondScale` says which way.
  const beyondScale = (i: Loose, v: Loose) => { const { lo, hi, log } = scales[i]; return v > hi ? 1 : v < lo || (log && !(v > 0)) ? -1 : 0; };
  const yAt = (i: Loose, v: Loose) => {
    const { lo, hi, log } = scales[i];
    const t = log ? Math.log10 : (x: Loose) => x;
    const at = v > hi ? hi : v < lo || (log && !(v > 0)) ? lo : v;
    return pad.top + innerH - ((t(at) - t(lo)) / (t(hi) - t(lo))) * innerH;
  };

  const last = axes.length - 1;
  const lines = usable.map(({ material: m, evaluation: e }: Loose) => ({
    id: m.id, name: m.name, family: m.family, material: m, evaluation: e,
    pts: axes.map((a: Loose, i: Loose) => `${xAt(i)},${yAt(i, m.headline[a.key].value)}`).join(' '),
    yEnd: yAt(last, m.headline[axes[last].key].value),
    // Nothing is tested until a requirement is set, so no line is a result before then.
    verdict: tested ? e.verdict : 'PASS',
  }));

  const crowded = lines.length > 40;
  // A line's values in words: its readout, and its name for a screen reader. Each says the spread of the material's
  // products behind it, as the table and the material pages say a median, and one parked at the axis end says so (C46, C47).
  const valuesOf = (l: Loose) => axes.map((a: Loose, i: Loose) => {
    const h = l.material.headline[a.key];
    const sp = h.spread?.n > 1 ? h.spread : null;
    const past = beyondScale(i, h.value);
    return `${prop(a.key).short} ${fmtBounded(h.value, a.unit, publishedBound(h))}${sp ? ` (${fmtNumber(sp.min)}–${fmtNumber(sp.max)}, ${sp.n} products)` : ''}${past ? `, ${past > 0 ? 'above' : 'below'} the scale` : ''}`;
  });
  // How many of a material's products pass, where a requirement is set: the line is the material, its result its products'.
  const passWords = (l: Loose) => {
    const c = l.evaluation?.counts;
    if (!tested || !c?.products) return '';
    return c.pass ? `passes on ${c.pass} of ${c.products} product${c.products === 1 ? '' : 's'}` : `passes on none of its ${c.products} product${c.products === 1 ? '' : 's'}`;
  };
  // The page's glyph on each axis the read line crosses: the range of the material's products as a hairline, their middle
  // half as a bar, in the line's colour (C46). A line was a median alone, and one below a requirement had nothing to say
  // that some of its products pass.
  const glyphsOf = (l: Loose) => axes.map((a: Loose, i: Loose) => {
    const sp = l.material.headline[a.key].spread;
    if (!(sp?.n > 1) || sp.min === sp.max) return '';
    const x = xAt(i);
    const range = `<line class="pc-g-range" x1="${x}" x2="${x}" y1="${yAt(i, sp.min)}" y2="${yAt(i, sp.max)}"/>`;
    const half = sp.q1 != null && sp.q3 != null ? `<line class="pc-g-half" x1="${x}" x2="${x}" y1="${yAt(i, sp.q1)}" y2="${yAt(i, sp.q3)}"/>` : '';
    return range + half;
  }).join('');

  // The result of each line, as the Ashby chart draws it: one that could not be checked is dashed, one that failed is
  // faded (C40). They are here only when the table's chips ask for them.
  const hasVerdict = (v: Loose) => lines.some((l: Loose) => l.verdict === v);
  const verdictClass = (l: Loose) => (l.verdict === 'UNKNOWN' ? ' v-unknown' : l.verdict === 'FAIL' ? ' v-fail' : '');
  // Once anything drawn is shortlisted, those lines are at full weight and the rest lighter (C44).
  const shortSet = new Set(scenario.shortlist ?? []);
  const anyShort = lines.some((l: Loose) => shortSet.has(l.id));

  // The names at the right end, nudged apart so none sits on its neighbour.
  const nameAt = named ? spreadLabels(lines.map((l: Loose) => l.yEnd), NAME_GAP, pad.top - 4, pad.top + innerH + 4) : [];
  const nameOf = (n: Loose) => (n.length > NAME_CHARS ? `${n.slice(0, NAME_CHARS - 1)}…` : n);
  const label = (l: Loose, i: Loose, color: Loose) => {
    const x0 = xAt(last), y = nameAt[i];
    return `<g class="pc-tag-g" aria-hidden="true">${Math.abs(y - l.yEnd) > 1.5 ? `<polyline class="pc-leader" points="${x0},${l.yEnd} ${x0 + 6},${y}" style="stroke:${color}"/>` : ''}
      <text class="pc-tag" x="${x0 + 9}" y="${y}" dy=".35em">${shortSet.has(l.id) ? '★ ' : ''}${esc(nameOf(l.name))}</text></g>`;
  };

  // A requirement on an axis is drawn across it as Compare draws it across a track: a short line in the colour a failing
  // result takes, dashed where the question only reports it. One beyond the drawn values sits at that end of the axis,
  // doubled, with a chevron pointing the way it lies, rather than stretching the axis until the lines are slivers (C41).
  const marks = axes.flatMap((a: Loose, i: Loose) => scenario.constraints
    .filter((c: Loose) => c.kind === 'numeric' && c.property === a.key && Number.isFinite(c.value))
    .map((c: Loose) => {
      const { lo, hi, log } = scales[i];
      const past = c.value > hi ? 1 : (c.value < lo || (log && !(c.value > 0))) ? -1 : 0;
      return { i, c, past, y: past > 0 ? yAt(i, hi) : past < 0 ? yAt(i, lo) : yAt(i, c.value) };
    }));
  const markSvg = ({ i, c, past, y }: Loose) => {
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
  const anyTracked = marks.some((m: Loose) => m.c.mandatory === false);
  const anyHard = marks.some((m: Loose) => m.c.mandatory !== false);

  // The key: the families drawn, in the Ashby chart's order, then one grey for every family past the palette, then what
  // the dashes, fading, red marks and weight mean, each only where it is on the chart.
  const drawn = new Set(lines.map((l: Loose) => l.family));
  const keyed = colors.named.filter((f: Loose) => drawn.has(f));
  const others = [...drawn].filter((f: Loose) => colors.isOther(f));
  const swatch = (inner: Loose) => `<svg class="pc-key-mark" width="22" height="10" viewBox="0 0 22 10" aria-hidden="true">${inner}</svg>`;
  const keys = [
    ...keyed.map((f: Loose) => `<span class="pc-key"><i style="background:${colors.color(f)}"></i>${esc(f)}</span>`),
    ...(others.length ? [`<span class="pc-key" title="${esc(others.join(', '))}"><i style="background:${colors.color(null)}"></i>Other families</span>`] : []),
    ...(hasVerdict('UNKNOWN') ? [`<span class="pc-key">${swatch('<line class="pc-key-line v-unknown" x1="1" y1="5" x2="21" y2="5"/>')}Dashed: could not be checked against a requirement</span>`] : []),
    ...(hasVerdict('FAIL') ? [`<span class="pc-key">${swatch('<line class="pc-key-line v-fail" x1="1" y1="5" x2="21" y2="5"/>')}Faded: fails a requirement</span>`] : []),
    ...(marks.length ? [`<span class="pc-key">${swatch(`<line class="pc-key-req${anyTracked && !anyHard ? ' tracked' : ''}" x1="1" y1="5" x2="21" y2="5"/>`)}${
      anyHard && anyTracked ? 'A requirement, dashed where it is only reported' : anyTracked ? 'A requirement that is reported, not required' : 'A requirement'}${
      marks.some((m: Loose) => m.past) ? ', with a chevron where it lies past the end of the axis' : ''}</span>`] : []),
    ...(anyShort ? ['<span class="pc-key">★ Full weight: on the shortlist</span>'] : []),
    ...(scales.some((x: Loose) => x.below || x.above) ? [`<span class="pc-key">${swatch('<path class="pc-park-chev" d="M7 7 11 3 15 7"/>')}Beyond the scale: the line ends at the axis end; its value is in the readout</span>`] : []),
  ];
  // The better end of each axis, from the registry's Pareto direction: the axes are not flipped, an engineer reads the
  // numbers (C45, V16).
  const betterWords = (a: Loose) => (a.better === 'min' ? '↓ better' : a.better === 'max' ? '↑ better' : '');

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
      ${axes.map((a: Loose, i: Loose) => `
        <g class="pc-axis-g" aria-hidden="true">
          <line x1="${xAt(i)}" y1="${pad.top}" x2="${xAt(i)}" y2="${pad.top + innerH}" class="pc-line-axis"/>
          <text x="${xAt(i)}" y="${pad.top - 38}" class="pc-lbl" text-anchor="${anchor(i)}">${esc(prop(a.key).short)}</text>
          <text x="${xAt(i)}" y="${pad.top - 25}" class="pc-lbl-unit" text-anchor="${anchor(i)}">${esc(a.unit)}${scales[i].log ? ', log scale' : ''}${betterWords(a) ? ` · ${betterWords(a)}` : ''}</text>
          ${scales[i].ticks.map((v: Loose) => { const y = yAt(i, v); return `<line class="pc-tick-mark" x1="${xAt(i) - 4}" x2="${xAt(i)}" y1="${y}" y2="${y}"/>${v === scales[i].lo || v === scales[i].hi ? ''
            : `<text class="pc-tick pc-tick-in" x="${xAt(i) - 6}" y="${y}" dy=".35em" text-anchor="end">${fmtNumber(v)}</text>`}`; }).join('')}
          <text x="${xAt(i)}" y="${pad.top - 8}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].hi)}</text>
          <text x="${xAt(i)}" y="${pad.top + innerH + 17}" class="pc-tick" text-anchor="${anchor(i)}">${fmtNumber(scales[i].lo)}</text>
          ${scales[i].above ? `<path class="pc-park-chev" d="M${xAt(i) - 4} ${pad.top - 1} L${xAt(i)} ${pad.top - 5} L${xAt(i) + 4} ${pad.top - 1}"><title>${scales[i].above} beyond the scale, above</title></path>` : ''}
          ${scales[i].below ? `<path class="pc-park-chev" d="M${xAt(i) - 4} ${pad.top + innerH + 1} L${xAt(i)} ${pad.top + innerH + 5} L${xAt(i) + 4} ${pad.top + innerH + 1}"><title>${scales[i].below} beyond the scale, below</title></path>` : ''}
        </g>`).join('')}
      <g class="pc-lines">
        ${lines.map((l: Loose, i: Loose) => {
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
      <g class="pc-glyphs" aria-hidden="true"></g>
    </svg></div>
    <div class="pc-legend">${keys.join('')}</div>
    <div class="legend-note">
      ${lines.length} of ${state.rows.length} candidates have all ${axes.length} properties and are drawn.
      ${state.rows.length - lines.length ? `${state.rows.length - lines.length} do not, and are left out rather than drawn at zero.` : ''}
      Each axis is scaled to its own range across the drawn set${scales.some((x: Loose) => x.log) ? '; one whose values span more than a hundredfold is on a log scale' : ''}${scales.some((x: Loose) => x.below || x.above) ? ', and above eight lines a value far beyond the rest is parked at the axis end' : ''}. Point at a line to read it, with the range and middle half of its products drawn on each axis, and click it to open the material;
      on a touch screen, tap a line to read it, then Open material. From the keyboard, Tab reaches each line and Enter opens it.
      ${estimateOnly.length ? `<br><b>${estimateOnly.length} of those</b> have an estimated range on at
        least one of these axes rather than a gap: ${esc(estimateOnly.slice(0, 8).map((r: Loose) => r.material.name).join(', '))}${estimateOnly.length > 8 ? ` and ${estimateOnly.length - 8} more` : ''}.
        A line commits to a value on every axis it crosses, so an estimated range cannot be drawn as
        one. Their spans are on the Ashby lens, and in the table.` : ''}
    </div>`;

  const byId = new Map<Loose, Loose>(lines.map((l: Loose) => [l.id, l]));
  const groupOf = new Map<Loose, Loose>([...host.querySelectorAll('.pc-line')].map((g: Loose) => [g.dataset.id, g]));
  const readout = host.querySelector('.pc-readout-text');
  const openBtn = host.querySelector('.pc-open');
  let selected: Loose = null;
  // What the readout shows: the line under the pointer while there is one, else the line last tapped or focused.
  const show = (g: Loose) => {
    const l = g && byId.get(g.dataset.id);
    if (!l) { readout.textContent = IDLE; openBtn.hidden = true; return; }
    const passes = passWords(l);
    readout.innerHTML = `<b>${esc(l.name)}</b> <span class="pc-readout-family">${esc(l.family)}</span>${l.verdict === 'PASS' ? '' : ` ${chip(l.verdict)}`}${passes ? ` <span class="pc-readout-pass">${esc(passes)}</span>` : ''} ${valuesOf(l).map((v: Loose) => `<span class="pc-readout-value">${esc(v)}</span>`).join(' ')}`;
    openBtn.hidden = false;
    openBtn.dataset.id = l.id;
    openBtn.setAttribute('aria-label', `Open ${l.name}`);
  };
  // The line being read is drawn again above all the others, so it is not hidden under its neighbours. Moving the line's
  // own element to the top would have changed the Tab order and taken focus off it. It keeps the line's dashes, so a line
  // that could not be checked still reads so while it is read.
  const raised = host.querySelector('.pc-raised');
  const glyphs = host.querySelector('.pc-glyphs');
  const raise = (g: Loose) => {
    const line = g?.querySelector('.pc-poly');
    raised.setAttribute('points', line ? line.getAttribute('points') : '');
    raised.style.stroke = line ? line.style.stroke : '';
    raised.classList.toggle('v-unknown', !!g?.classList.contains('v-unknown'));
    const l = g && byId.get(g.dataset.id);
    glyphs.innerHTML = l ? glyphsOf(l) : '';
    glyphs.style.stroke = line ? line.style.stroke : '';
  };
  // The line read and kept is the selection every lens shares (state.selected, the Ashby chart's picked-out material): a
  // line selected here is selected there, and one selected there is raised here on arrival. It is set without a redraw,
  // which would take the focus off the line (C44).
  const select = (g: Loose) => {
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
  host.querySelector('.pc-svg').addEventListener('pointerdown', (ev: Loose) => { pointer = ev.pointerType || 'mouse'; }, true);
  host.querySelectorAll('.pc-line').forEach((g: Loose) => {
    g.addEventListener('click', () => {
      if (pointer === 'mouse') actions.openMaterial(g.dataset.id);
      else select(g);
    });
    g.addEventListener('mouseenter', () => { g.classList.add('hot'); raise(g); show(g); });
    g.addEventListener('mouseleave', () => { g.classList.remove('hot'); raise(selected); show(selected); });
    // Keyboard: Tab selects the line as it arrives, Enter or Space opens it.
    g.addEventListener('focus', () => select(g));
    g.addEventListener('keydown', (ev: Loose) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); actions.openMaterial(g.dataset.id); }
    });
  });
  // A tap on the chart away from every line clears the selection.
  host.querySelector('.pc-bg').addEventListener('click', () => select(null));
  openBtn.addEventListener('click', () => { if (openBtn.dataset.id) actions.openMaterial(openBtn.dataset.id); });
}

const IDLE = 'Point at a line, tap it or Tab to it to read its values here.';
