// Figure "Every temperature on one axis": what printing a material on the H2C takes and how hot a part can get, on one
// linear °C axis. Printing: nozzle, bed and heated chamber (material-stats.js printWindows), each degree shaded by the
// share of the counted products that accept it (runs[].k / n, one hue light to dark), the span more than half accept
// outlined (from three windows), the H2C's limit on that setting a solid line with the range beyond it washed; windows
// that give one end only drawn as hairlines from it (under ten windows); drying (dryingStats) a mark per product and their
// median. In service: HDT at 1.8 and 0.45 MPa, the glass transition, and Vicat and melting as published (heatLadder), each
// a hairline, a middle half and a median tick with its value. x in per cent, y in px.

import { esc, pct, textPx, fmtDisplay, shortName, withUnit, spanUnit, products, andList, orList, figContext, productMark, fitLabels, KEY, keyOf, twinTable } from './kit.js';
import { figFrame } from './figure.js';
import { printWindows, dryingStats, heatLadder, productsOf, typicalWindow } from '../../js/ui/material-stats.js';
import { printFacts } from '../../js/ui/material-facts.js';
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
  for (const [a] of AXES) { const ends = pw[a].windows.flatMap((w) => [w.min, w.max]); if (ends.length && limitOnScale(pw[a].limit, ends)) vals.push(pw[a].limit); }
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
    const onScale = lim != null && lim <= sc.hi;
    if (onScale) {
      used.add('limit');
      o.push(`<rect class="dv-beyond" x="${pct(X(lim))}" y="1" width="${pct(100 - X(lim))}" height="${ROW - 2}"/>`);
    }
    for (const r of p.runs) {
      if (!r.k) continue;
      used.add('shade');
      o.push(`<rect class="dv-acc tp" x="${pct(X(r.from - 0.5))}" y="${mid - 8}" width="${pct(Math.max(X(r.to + 0.5) - X(r.from - 0.5), 0.15))}" height="16" style="opacity:${(0.12 + 0.88 * (r.k / p.n)).toFixed(2)}" data-t="${esc(`${r.from === r.to ? `${r.from} °C` : `${r.from}–${r.to} °C`}: accepted by ${r.k} of ${products(p.n)}`)}"/>`);
    }
    if (p.most && p.n >= 3) { used.add('most'); o.push(`<rect class="dv-most" x="${pct(X(p.most.from - 0.5))}" y="${mid - 10}" width="${pct(X(p.most.to + 0.5) - X(p.most.from - 0.5))}" height="20" rx="2"/>`); }
    if (p.n < 10) {
      for (const e of p.ends) {
        used.add('oneEnd');
        const from = e.min ?? sc.from, to = e.max ?? (onScale ? lim : sc.hi);
        o.push(`<line class="dv-oneend" x1="${pct(X(from))}" x2="${pct(X(to))}" y1="${mid + 12}" y2="${mid + 12}"/><circle class="dv-oneend-dot mk" cx="${pct(X(e.min ?? e.max))}" cy="${mid + 12}" r="2.4" data-grade="${esc(e.g.id)}" data-key="${a}" data-v="${e.min ?? e.max}" data-kind="compared" data-t="${esc(e.min != null ? `at least ${e.min} °C` : `at most ${e.max} °C`)}"/>`);
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
    if (lim != null) sub += ` · H2C ${onScale ? 'max' : 'reaches'} ${lim} °C`;
    if (!p.windows.length && !p.ends.length && !(a === 'chamber' && none)) o.push(`<text x="0" y="${mid + 4}">no product gives one</text>`);
    rows.push(rowHtml(` data-print="${a}"${onScale ? ` data-limit="${lim}"` : ''}`, label, sub, rowSvg(o.join(''), `${label}: ${sub}${lim != null ? `; the H2C reaches ${lim} °C` : ''}.`)));
    twin.push([label, p.n >= 3 && p.most ? spanUnit(p.most.from, p.most.to, '°C') : p.n ? p.windows.filter((w) => w.counted).map((w) => spanUnit(w.min, w.max, '°C')).join('; ') : '—', String(p.n), lim != null ? `${lim} °C` : '—']);
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
        'data-kind': e.variant ? 'variant' : e.origin === 'guide' ? 'as-published' : 'compared', 'data-t': `dry at ${e.value} °C${e.hours != null ? ` for ${fmtDisplay(e.hours, 'h')} h` : ''}`, 'data-note': note }));
      dots++;
    }
    if (t.n > 1) o.push(`<svg x="${pct(X(t.median))}" y="${mid}" overflow="visible"><rect class="dv-self" x="-1.5" y="-11" width="3" height="22" rx="1.5"/></svg>`);
    const sub = t.n ? `${withUnit(t.median, '°C')}${hrs?.median != null ? ` for ${fmtDisplay(hrs.median, 'h')} h` : ''}, median of ${products(t.n)}` : 'from Bambu Lab\'s guide only';
    rows.push(rowHtml(' data-print="drying"', 'Drying', sub, rowSvg(o.join(''), `Drying: ${sub}.`)));
    twin.push(['Drying', t.n ? withUnit(t.median, '°C') : '—', String(t.n ?? 0), '—']);
  }
  // In service.
  if (ladder.length) rows.push('<p class="tm-group">In service</p>');
  for (const r of ladder) {
    const s = r.summary;
    const kk = r.compared ? 'self' : 'peer';
    if (!r.compared) used.add('pub');
    const o = [grid(ROW)];
    if (s.min !== s.max) o.push(`<line class="dv-${kk}-range" x1="${pct(X(s.min))}" x2="${pct(X(s.max))}" y1="${mid}" y2="${mid}"/>`);
    if (s.q1 != null) o.push(`<rect class="dv-${kk}-band" x="${pct(X(s.q1))}" y="${mid - 5}" width="${pct(Math.max(X(s.q3) - X(s.q1), 0.4))}" height="10" rx="2"/>`);
    o.push(`<svg x="${pct(X(s.median))}" y="${mid}" overflow="visible"><rect class="dv-${kk}" x="-1.5" y="-9" width="3" height="18" rx="1.5"/></svg>`);
    const right = X(s.median) > 85;
    o.push(`<text class="dv-val" x="${pct(X(s.median))}" y="${mid - 6}" dx="${right ? -6 : 6}" text-anchor="${right ? 'end' : 'start'}">${esc(withUnit(s.median, '°C'))}</text>`);
    const sub = `${products(s.n)}${r.compared ? '' : ', as published'}`;
    const keyAttr = r.h?.key ?? r.id;
    rows.push(rowHtml(` data-key="${esc(keyAttr)}"`, r.label, sub, rowSvg(o.join(''), `${r.label}: median ${withUnit(s.median, '°C')}${s.q1 != null ? `, middle half ${spanUnit(s.q1, s.q3, '°C')}` : ''}, ${sub}.`)));
    twin.push([r.label, withUnit(s.median, '°C') + (s.q1 != null ? ` (${spanUnit(s.q1, s.q3, '°C')})` : ''), String(s.n), '—']);
  }
  // The axis.
  const tl = sc.ticks.map((t) => ({ t: fmtDisplay(t, '°C'), at: X(t) })).map((it) => ({ ...it, w: textPx(it.t, 11.5), anchor: it.at >= 99.5 ? 'end' : it.at <= 0.5 ? 'start' : 'middle' }));
  const tf = fitLabels(tl, WIDE), tfn = fitLabels(tl, NARROW);
  const axis = `<div class="tm-axis"><div></div><div><svg class="dv-ticks" width="100%" height="18" aria-hidden="true" focusable="false"><line class="dv-axis" x1="0" x2="100%" y1="0.5" y2="0.5"/>${tl.map((it, i) => `<line class="dv-tk" x1="${pct(it.at)}" x2="${pct(it.at)}" y1="0" y2="3"/>${tf[i] ? `<text x="${pct(it.at)}" y="14" text-anchor="${it.anchor}"${tfn[i] ? '' : ' class="alt"'}>${esc(it.t)}</text>` : ''}`).join('')}</svg><p class="tm-unit">°C</p></div></div>`;

  // The finding.
  const tw = (p) => { const r = p.n >= 3 ? typicalWindow(p) : null; return r && r.share !== 'peak' ? r : null; };
  const nz = tw(pw.nozzle), bd = tw(pw.bed);
  const out = printFacts(m, c).outside ?? [];
  const beyond = new Set(out.flatMap((x) => x.list.map((l) => l.g.id))).size;
  // The H2C's limits of the settings the title states, and only those.
  const lims = [nz && pw.nozzle.limit != null ? `${pw.nozzle.limit} °C nozzle` : null, bd && pw.bed.limit != null ? `${pw.bed.limit} °C bed` : null].filter(Boolean);
  const tail = beyond ? `; ${beyond} ${beyond === 1 ? 'asks' : 'ask'} for more than the H2C gives` : lims.length ? `, inside the H2C's ${andList(lims)} ${lims.length > 1 ? 'limits' : 'limit'}` : '';
  let title;
  if (nz) title = `${nz.share === 'all' && (!bd || bd.share === 'all') ? `All ${pw.nozzle.n}` : 'Most'} ${name} products print at ${spanUnit(nz.from, nz.to, '°C')}${bd ? ` on a ${spanUnit(bd.from, bd.to, '°C')} bed` : ''}${tail}`;
  else if (pw.nozzle.n) title = `${name}'s ${products(pw.nozzle.n).replace('products', 'sheets').replace('product', 'sheet')} give ${andList(pw.nozzle.windows.filter((w) => w.counted).map((w) => spanUnit(w.min, w.max, '°C')).filter((v, i, a) => a.indexOf(v) === i))} on the nozzle${tail}`;
  else title = `Where ${name} prints and softens, on one axis`;
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
