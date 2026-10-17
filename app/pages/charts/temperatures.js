// Figure "Every temperature on one axis": what printing a material on the H2C takes and how hot a part can get, on one
// linear °C axis. Printing: nozzle, bed and heated chamber (material-stats.js printWindows), each degree shaded by the
// share of the counted products that accept it (runs[].k / n, one hue light to dark), the span more than half accept
// outlined (from three windows), the H2C's limit on that setting a solid line with the range beyond it washed; windows
// that give one end only drawn as hairlines from it (under ten windows); drying (dryingStats) a mark per product and their
// median. In service: HDT at 1.8 and 0.45 MPa, the glass transition, and Vicat and melting as published (heatLadder), each
// a hairline, a middle half and a median tick with its value. x in per cent, y in px.

import { esc, pct, textPx, fmtDisplay, NBSP, tickLabels, productName, shortName, withUnit, spanUnit, products, andList, orList, figContext, productMark, fitLabels, KEY, keyOf, twinTable } from './kit.js';
import { figFrame } from './figure.js';
import { printWindows, dryingStats, heatLadder, productsOf, typicalWindow } from '../../js/ui/material-stats.js';
import { printFacts, isProduct } from '../../js/ui/material-facts.js';
import { stripScale, limitOnScale } from '../../js/ui/scales.js';
import { LADDER_EXTRA } from '../figures.js';

const ROW = 34;
const WIDE = 640, NARROW = 300;
const AXES = [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Heated chamber']];

const rowHtml = (attrsText, label, sub, svg) => `<div class="tm-row"${attrsText}><div class="tm-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>${svg}</div>`;
const rowSvg = (inner, aria) => `<svg class="tm-svg" width="100%" height="${ROW}" role="img" aria-label="${esc(aria)}">${inner}</svg>`;

export function temperaturesFigure(c, env = {}, opts = {}) {
  const k = figContext(c, env);
  const m = c.m;
  const name = shortName(m);
  const prods = productsOf(c);
  const pw = Object.fromEntries(AXES.map(([a]) => [a, printWindows(prods, a)]));
  const dry = dryingStats(prods);
  const ladder = heatLadder(m, c, LADDER_EXTRA);
  const vals = [];
  for (const [a] of AXES) for (const w of pw[a].windows) vals.push(w.min, w.max);
  for (const [a] of AXES) for (const e of pw[a].ends) { if (e.min != null) vals.push(e.min); if (e.max != null) vals.push(e.max); }
  for (const e of dry.entries) vals.push(e.value);
  for (const r of ladder) vals.push(r.summary.min, r.summary.max);
  if (!vals.length) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  // The axis holds every limit it draws: a limit at or below the highest value drawn (PEI-CF's 65 °C chamber, its
  // windows at 100 °C and up), and one just above a setting's windows; one far above them is said in words.
  const dataMax = Math.max(...vals);
  for (const [a] of AXES) {
    const lim = pw[a].limit, ends = pw[a].windows.flatMap((w) => [w.min, w.max]);
    if (lim != null && (lim <= dataMax || (ends.length && limitOnScale(lim, ends)))) vals.push(lim);
  }
  const sc = stripScale(vals, '°C');
  const X = (v) => sc.pct(v);
  const grid = (h) => sc.ticks.map((t) => `<line class="dv-grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${h}"/>`).join('');
  const mid = ROW / 2;
  const rows = [];
  const twin = [];
  let dots = 0;
  const used = new Set();

  // Printing on the H2C.
  rows.push('<p class="tm-group">Printing it on the H2C</p>');
  for (const [a, label] of AXES) {
    const p = pw[a];
    const o = [grid(ROW)];
    const lim = p.limit;
    const onScale = lim != null && lim >= sc.from && lim <= sc.hi;
    if (onScale) {
      used.add('limit');
      o.push(`<rect class="dv-beyond" x="${pct(X(lim))}" y="1" width="${pct(100 - X(lim))}" height="${ROW - 2}"/>`);
    }
    for (const r of p.runs) {
      if (!r.k) continue;
      used.add('shade');
      o.push(`<rect class="dv-acc tp" x="${pct(X(r.from - 0.5))}" y="${mid - 8}" width="${pct(Math.max(X(r.to + 0.5) - X(r.from - 0.5), 0.15))}" height="16" style="opacity:${(0.12 + 0.88 * (r.k / p.n)).toFixed(2)}" data-t="${esc(`${r.from === r.to ? `${r.from}${NBSP}°C` : `${r.from}–${r.to}${NBSP}°C`}: accepted by ${r.k} of ${products(p.n)}`)}"/>`);
    }
    if (p.most && p.n >= 3) { used.add('most'); o.push(`<rect class="dv-most" x="${pct(X(p.most.from - 0.5))}" y="${mid - 10}" width="${pct(X(p.most.to + 0.5) - X(p.most.from - 0.5))}" height="20" rx="2"/>`); }
    if (p.n < 10) {
      for (const e of p.ends) {
        used.add('oneEnd');
        // "At least" runs from its end to the H2C's limit where the limit lies above it, else to the axis's end.
        const from = e.min ?? sc.from, to = e.max ?? (onScale && lim > from ? lim : sc.hi);
        o.push(`<line class="dv-oneend" x1="${pct(X(from))}" x2="${pct(X(to))}" y1="${mid + 12}" y2="${mid + 12}"/><circle class="dv-oneend-dot mk" cx="${pct(X(e.min ?? e.max))}" cy="${mid + 12}" r="2.4" data-grade="${esc(e.g.id)}" data-key="${a}" data-v="${e.min ?? e.max}" data-kind="compared" data-t="${esc(e.min != null ? `at least ${e.min}${NBSP}°C` : `at most ${e.max}${NBSP}°C`)}"/>`);
      }
    }
    // The limit's line closes the row; its value is said under the row's name, where no mark can cover it.
    if (onScale) o.push(`<line class="dv-limit" x1="${pct(X(lim))}" x2="${pct(X(lim))}" y1="1" y2="${ROW - 1}"/>`);
    const none = (p.states.get('not-required') ?? 0) + (p.states.get('ambient') ?? 0);
    const extra = [p.ends.length && p.n < 10 ? `${p.ends.length} give one end only` : '', a === 'chamber' && none ? `${none} need none` : ''].filter(Boolean).join('; ');
    let sub;
    const tw = typicalWindow(p);
    if (p.n >= 3 && tw && tw.share !== 'peak') sub = `${spanUnit(tw.from, tw.to, '°C')}, accepted by ${tw.share === 'all' ? 'all' : 'most of the'} ${p.n} products that give a window`;
    else if (p.n) sub = `${p.n} of ${products(prods.length)} give a window`;
    else if (a === 'chamber' && none) sub = none === prods.length ? `none needed by any of the ${products(prods.length)}` : `none needed by ${none} of ${prods.length}`;
    else sub = p.windows.length ? 'only Bambu Lab\'s guide gives a window' : 'no window published';
    if (extra && (p.n || a !== 'chamber' || !none)) sub += `; ${extra}`;
    if (lim != null) sub += ` · H2C ${onScale ? 'max' : 'reaches'} ${lim}${NBSP}°C`;
    if (!p.windows.length && !p.ends.length && !(a === 'chamber' && none)) o.push(`<text x="0" y="${mid + 4}">no product gives one</text>`);
    rows.push(rowHtml(` data-print="${a}"${onScale ? ` data-limit="${lim}"` : ''}`, label, sub, rowSvg(o.join(''), `${label}: ${sub}${lim != null ? `; the H2C reaches ${lim}${NBSP}°C` : ''}.`)));
    twin.push([label, p.n >= 3 && p.most ? spanUnit(p.most.from, p.most.to, '°C') : p.n ? p.windows.filter((w) => w.counted).map((w) => spanUnit(w.min, w.max, '°C')).join('; ') : '—', String(p.n), lim != null ? `${lim}${NBSP}°C` : '—']);
  }
  // Drying: a mark per product, its median.
  if (dry.entries.length) {
    const t = dry.temps, hrs = dry.hours;
    const o = [grid(ROW)];
    if (t.q1 != null) o.push(`<rect class="dv-pband" x="${pct(X(t.q1))}" y="${mid - 9}" width="${pct(Math.max(X(t.q3) - X(t.q1), 0.4))}" height="18" rx="2"/>`);
    const seen = new Map();
    for (const e of [...dry.entries].sort((p, q) => p.value - q.value || p.g.id.localeCompare(q.g.id))) {
      const key = Math.round(X(e.value) / 1.3);
      const lv = seen.get(key) ?? 0;
      seen.set(key, lv + 1);
      const marks = e.variant ? ['variant'] : e.origin === 'guide' ? ['open'] : [];
      const note = e.origin === 'guide' ? 'Bambu Lab\'s Filament Guide' : e.origin === 'twin' ? 'a data sheet it shares' : null;
      o.push(productMark(marks, X(e.value), mid + 5 - Math.min(lv, 3) * 6, { 'data-grade': e.g.id, 'data-key': 'drying', 'data-v': e.value,
        'data-kind': e.variant ? 'variant' : e.origin === 'guide' ? 'as-published' : 'compared', 'data-t': `dry at ${e.value}${NBSP}°C${e.hours != null ? ` for ${fmtDisplay(e.hours, 'h')}${NBSP}h` : ''}`, 'data-note': note }));
      dots++;
    }
    // A schedule no maker gave is never printed: where the products agree, their temperature and time; where they
    // disagree, the span of each ("100–140 °C, 6–8 h").
    const counted = dry.entries.filter((e) => e.counted);
    const temps = [...new Set(counted.map((e) => e.value))], hoursList = [...new Set(counted.map((e) => e.hours).filter((v) => v != null))];
    const tWords = temps.length ? (temps.length === 1 ? withUnit(temps[0], '°C') : spanUnit(Math.min(...temps), Math.max(...temps), '°C')) : '';
    const hWords = hoursList.length ? (hoursList.length === 1 ? `${fmtDisplay(hoursList[0], 'h')}${NBSP}h` : spanUnit(Math.min(...hoursList), Math.max(...hoursList), 'h')) : '';
    const sub = counted.length ? `${tWords}${hWords ? (temps.length === 1 && hoursList.length === 1 ? ` for ${hWords}` : `, ${hWords}`) : ''}, ${products(counted.length)}` : 'from Bambu Lab\'s guide only';
    rows.push(rowHtml(' data-print="drying"', 'Drying', sub, rowSvg(o.join(''), `Drying: ${sub}.`)));
    twin.push(['Drying', counted.length ? `${tWords}${hWords ? `, ${hWords}` : ''}` : '—', String(counted.length), '—']);
  }
  // In service.
  if (ladder.length) rows.push('<p class="tm-group">In service</p>');
  for (const r of ladder) {
    const s = r.summary;
    const keyAttr = r.h?.key ?? r.id;
    const o = [grid(ROW)];
    if (!r.compared) {
      // As published, under each sheet's own test: each product's value and their range, never a median no sheet gave.
      used.add('pub');
      const vals = publishedValues(c, r.id);
      if (s.min !== s.max) o.push(`<line class="dv-peer-range" x1="${pct(X(s.min))}" x2="${pct(X(s.max))}" y1="${mid}" y2="${mid}"/>`);
      for (const v of vals) o.push(`<line class="tm-pub tp" x1="${pct(X(v.value))}" x2="${pct(X(v.value))}" y1="${mid - 7}" y2="${mid + 7}" data-t="${esc(`${withUnit(v.value, '°C')}, as published by ${v.name}`)}"/>`);
      const span = spanUnit(s.min, s.max, '°C');
      // The span beside the range, on the side with room on a phone's track too.
      const right = X(s.max) > 60;
      o.push(`<text class="dv-val" x="${pct(right ? X(s.min) : X(s.max))}" y="${mid - 6}" dx="${right ? -6 : 6}" text-anchor="${right ? 'end' : 'start'}">${esc(span)}</text>`);
      const sub = `${products(vals.length || s.n)}, as published`;
      rows.push(rowHtml(` data-key="${esc(keyAttr)}"`, r.label, sub, rowSvg(o.join(''), `${r.label}: ${span}, ${sub}.`)));
      twin.push([r.label, span, String(vals.length || s.n), '—']);
      continue;
    }
    if (s.min !== s.max) o.push(`<line class="dv-self-range" x1="${pct(X(s.min))}" x2="${pct(X(s.max))}" y1="${mid}" y2="${mid}"/>`);
    if (s.q1 != null) o.push(`<rect class="dv-self-band" x="${pct(X(s.q1))}" y="${mid - 5}" width="${pct(Math.max(X(s.q3) - X(s.q1), 0.4))}" height="10" rx="2"/>`);
    o.push(`<svg x="${pct(X(s.median))}" y="${mid}" overflow="visible"><rect class="dv-self" x="-1.5" y="-9" width="3" height="18" rx="1.5"/></svg>`);
    const right = X(s.median) > 85;
    o.push(`<text class="dv-val" x="${pct(X(s.median))}" y="${mid - 6}" dx="${right ? -6 : 6}" text-anchor="${right ? 'end' : 'start'}">${esc(withUnit(s.median, '°C'))}</text>`);
    const sub = products(s.n);
    rows.push(rowHtml(` data-key="${esc(keyAttr)}"`, r.label, sub, rowSvg(o.join(''), `${r.label}: median ${withUnit(s.median, '°C')}${s.q1 != null ? `, middle half ${spanUnit(s.q1, s.q3, '°C')}` : ''}, ${sub}.`)));
    twin.push([r.label, withUnit(s.median, '°C') + (s.q1 != null ? ` (${spanUnit(s.q1, s.q3, '°C')})` : ''), String(s.n), '—']);
  }
  // The axis.
  const axis = `<div class="tm-axis"><div></div><div><svg class="dv-ticks" width="100%" height="18" aria-hidden="true" focusable="false"><line class="dv-axis" x1="0" x2="100%" y1="0.5" y2="0.5"/>${sc.ticks.map((t) => `<line class="dv-tk" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="3"/>`).join('')}${tickLabels(sc, 14, { wide: WIDE, narrow: NARROW })}</svg><p class="tm-unit">°C</p></div></div>`;

  // The finding: what only this figure shows, the print settings and the service temperatures against the H2C's limits.
  const out = (printFacts(m, c).outside ?? []).filter((x) => x.list.length);
  const word = { nozzle: 'nozzle', bed: 'bed', chamber: 'heated chamber' };
  const soft = m.headline?.hdt045?.known ? { v: m.headline.hdt045.value, what: 'softens' } : m.headline?.glassTransition?.known ? { v: m.headline.glassTransition.value, what: 'softens' } : null;
  const chamberLimit = pw.chamber.limit;
  let title;
  if (out.length) {
    // Every product that gives a window on these settings asks for more than the H2C gives, or only some.
    const all = out.every((x) => pw[x.axis] && x.list.length >= pw[x.axis].windows.length);
    const settings = andList(out.map((x) => word[x.axis] ?? x.label.toLowerCase()));
    title = all ? `${name}'s ${settings} ${out.length > 1 ? 'run' : 'runs'} past what the H2C gives`
      : `Some ${name} products' ${settings} ${out.length > 1 ? 'settings run' : 'setting runs'} past what the H2C gives`;
  } else if (soft && chamberLimit != null && soft.v < chamberLimit) {
    title = `${name} softens near ${withUnit(soft.v, '°C')}, below the H2C's ${chamberLimit}${NBSP}°C chamber`;
  } else if (soft && chamberLimit != null) {
    title = `${name} prints within the H2C's limits and softens near ${withUnit(soft.v, '°C')}, above its ${chamberLimit}${NBSP}°C chamber`;
  } else title = `${name}'s print settings and service temperatures against the H2C's limits`;
  const key = keyOf([...(used.has('shade') ? [KEY.shade()] : []), ...(used.has('most') ? [KEY.most()] : []), ...(used.has('oneEnd') ? [KEY.oneEnd()] : []),
    ...(used.has('limit') ? [KEY.limit()] : []), ...(dry.entries.length ? [KEY.product()] : []), ...(ladder.some((r) => r.compared) ? [KEY.selfCell(name)] : []), ...(used.has('pub') ? [KEY.pubCell()] : [])]);
  const missing = AXES.filter(([a]) => !pw[a].windows.length && !pw[a].ends.length).map(([, l]) => l.toLowerCase());
  const leaves = [missing.length ? `No ${name} product gives a ${orList(missing)} window.` : '', !ladder.length ? `No ${name} product publishes a softening temperature.` : '',
    `Windows read from Bambu Lab's Filament Guide are not shaded: the guide speaks for every product that reads it.`].filter(Boolean).join(' ');
  const html = figFrame({
    slug: opts.id ?? 'temperatures', kind: 'temperatures', title,
    question: 'What does printing it on the H2C take, and how hot can a part get?',
    key, plot: `<div class="tm">${rows.join('')}${axis}</div>`, label: null,
    read: 'One temperature axis for the settings a print needs and the temperatures a part meets. A setting\'s shade is how many of the products whose sheets give a window accept each degree; the H2C\'s limit closes its row.',
    table: twinTable(['Setting or property', 'Most products, or the median', 'Products', 'H2C limit'], twin), leaves, method: 'temperatures',
  });
  return { html, empty: false, stats: { figures: 1, dots } };
}

/**
 * Each product's value of a property published under its sheet's own test (Vicat, melting), as heatLadder reads them: a
 * product's own numeric °C values, not held back or flagged implausible, their median where it gives several. Display
 * only. [{ g, name, value }], lowest first.
 */
function publishedValues(c, property) {
  const byGrade = new Map();
  for (const x of c.ms) {
    if (x.property !== property || !x.numeric || x.unit !== '°C' || x.quarantined || x.implausible || !Number.isFinite(x.value)) continue;
    const g = c.gradeById.get(x.gradeId);
    if (!g || g.retired || !isProduct(g)) continue;
    (byGrade.get(g.id) ?? byGrade.set(g.id, { g, values: [] }).get(g.id)).values.push(x.value);
  }
  const med = (vs) => { const v = [...vs].sort((a, b) => a - b), n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  return [...byGrade.values()].map(({ g, values }) => ({ g, name: productName(g), value: med(values) })).sort((a, b) => a.value - b.value);
}
