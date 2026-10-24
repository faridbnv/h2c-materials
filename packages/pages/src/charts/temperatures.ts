// Figure "Every temperature on one axis": what printing a material on the H2C takes and how hot a part can get, on one
// linear °C axis. Printing: nozzle, bed and heated chamber (material-stats.js printWindows), each degree shaded by the
// share of the counted products that accept it (runs[].k / n, one hue light to dark), the span more than half accept
// outlined (from three windows), the H2C's limit on that setting a solid line with the range beyond it washed; windows
// that give one end only drawn as hairlines from it (under ten windows); drying (dryingStats) a mark per product and their
// median. In service: HDT at 1.8 and 0.45 MPa, the glass transition, and Vicat and melting as published (heatLadder), each
// a hairline, a middle half and a median tick with its value. x in per cent, y in px.

import type { Loose } from '../loose.ts';

import { esc, pct, textPx, fmtDisplay, NBSP, tickLabels, productName, shortName, withUnit, spanUnit, products, andList, orList, figContext, productMark, fitLabels, KEY, keyOf, twinTable } from './kit.ts';
import { figFrame } from './figure.ts';
import { printWindows, dryingStats, heatLadder, productsOf, typicalWindow, publishedEnds } from '../facts/material-stats.ts';
import { printFacts, isProduct } from '../facts/material-facts.ts';
import { medianSign } from '../facts/format.ts';
import { stripScale, limitOnScale } from '../facts/scales.ts';
import { LADDER_EXTRA } from '../figures.ts';

const ROW = 34;
// The narrowest track each layout gives (about 410 px from 720 px screens up, 340 px on a phone).
const WIDE = 410, NARROW = 340;
const AXES: [string, string][] = [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Heated chamber']];

const rowHtml = (attrsText: Loose, label: Loose, sub: Loose, svg: Loose) => `<div class="tm-row"${attrsText}><div class="tm-label">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>${svg}</div>`;
const rowSvg = (inner: Loose, aria: Loose) => `<svg class="tm-svg" width="100%" height="${ROW}" role="img" aria-label="${esc(aria)}">${inner}</svg>`;

export function temperaturesFigure(c: Loose, env: Loose = {}, opts: Loose = {}): Loose {
  const k = figContext(c, env);
  const m = c.m;
  const name = shortName(m);
  const prods = productsOf(c);
  const pw = Object.fromEntries(AXES.map(([a]) => [a, printWindows(prods, a)]));
  const dry = dryingStats(prods);
  const ladder = heatLadder(m, c, LADDER_EXTRA);
  const vals: Loose[] = [];
  for (const [a] of AXES) for (const w of pw[a].windows) vals.push(w.min, w.max);
  for (const [a] of AXES) for (const e of pw[a].ends) { if (e.min != null) vals.push(e.min); if (e.max != null) vals.push(e.max); }
  for (const e of dry.entries) vals.push(e.value);
  // A rung as published spans each product's values, the ends of a range its sheet prints included.
  for (const r of ladder) vals.push(r.summary.min, r.summary.max, ...(r.compared ? [] : publishedValues(c, r.id).flatMap((v: Loose) => [v.min, v.max])));
  if (!vals.length) return { html: '', empty: true, stats: { figures: 0, dots: 0 } };
  // The axis holds every limit it draws: a limit at or below the highest value drawn (PEI-CF's 65 °C chamber, its
  // windows at 100 °C and up), and one just above a setting's windows; one far above them is said in words.
  const dataMax = Math.max(...vals);
  for (const [a] of AXES) {
    const lim = pw[a].limit, ends = pw[a].windows.flatMap((w: Loose) => [w.min, w.max]);
    if (lim != null && (lim <= dataMax || (ends.length && limitOnScale(lim, ends)))) vals.push(lim);
  }
  const sc = stripScale(vals, '°C');
  const X = (v: Loose) => sc.pct(v);
  const grid = (h: Loose) => sc.ticks.map((t: Loose) => `<line class="dv-grid" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="${h}"/>`).join('');
  const mid = ROW / 2;
  const rows: Loose[] = [];
  const twin: Loose[] = [];
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
    const extra = [p.ends.length && p.n < 10 ? `${p.ends.length} ${p.ends.length === 1 ? 'gives' : 'give'} one end only` : '', a === 'chamber' && none ? `${none} ${none === 1 ? 'needs' : 'need'} none` : ''].filter(Boolean).join('; ');
    let sub: Loose;
    const tw = typicalWindow(p);
    if (p.n >= 3 && tw && tw.share !== 'peak') sub = `${spanUnit(tw.from, tw.to, '°C')}, accepted by ${tw.share === 'all' ? 'all' : 'most of the'} ${p.n} products that give a window`;
    else if (p.n) sub = `${p.n} of ${products(prods.length)} ${p.n === 1 ? 'gives' : 'give'} a window`;
    else if (a === 'chamber' && none) sub = none === prods.length ? `none needed by any of the ${products(prods.length)}` : `none needed by ${none} of ${prods.length}`;
    else sub = p.windows.length ? 'only the Bambu Lab Filament Guide gives a window' : 'no window published';
    if (extra && (p.n || a !== 'chamber' || !none)) sub += `; ${extra}`;
    // The limit in one form, on the scale or past it, as the drawer says it (C04).
    if (lim != null) sub += ` · the H2C reaches ${lim}${NBSP}°C`;
    if (!p.windows.length && !p.ends.length && !(a === 'chamber' && none)) o.push(`<text x="0" y="${mid + 4}">no product gives one</text>`);
    rows.push(rowHtml(` data-print="${a}"${onScale ? ` data-limit="${lim}"` : ''}`, label, sub, rowSvg(o.join(''), `${label}: ${sub}${lim != null ? `; the H2C reaches ${lim}${NBSP}°C` : ''}.`)));
    twin.push([label, p.n >= 3 && p.most ? spanUnit(p.most.from, p.most.to, '°C') : p.n ? p.windows.filter((w: Loose) => w.counted).map((w: Loose) => spanUnit(w.min, w.max, '°C')).join('; ') : '—', String(p.n), lim != null ? `${lim}${NBSP}°C` : '—']);
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
      const note = e.origin === 'guide' ? 'the Bambu Lab Filament Guide' : e.origin === 'twin' ? 'a data sheet it shares' : null;
      o.push(productMark(marks, X(e.value), mid + 5 - Math.min(lv, 3) * 6, { 'data-grade': e.g.id, 'data-key': 'drying', 'data-v': e.value,
        // The mark sits at the end every rule reads; its words give the range a sheet printed (D175).
        'data-kind': e.variant ? 'variant' : e.origin === 'guide' ? 'as-published' : 'compared', 'data-t': `dry at ${spanUnit(e.low, e.value, '°C')}${e.hours != null ? ` for ${e.hoursOpen ? '≥ ' : ''}${spanUnit(e.hoursLow, e.hours, 'h')}` : ''}`, 'data-note': note }));
      dots++;
    }
    // A schedule no maker gave is never printed: where the products agree, their temperature and time; where they
    // disagree, or a sheet prints a range, the span of each ("100–140 °C, 6–8 h"), from a printed range's lower end (D175).
    const counted = dry.entries.filter((e: Loose) => e.counted);
    const temps = [...new Set<Loose>(counted.flatMap((e: Loose) => [e.low, e.value]))], hoursList = [...new Set<Loose>(counted.flatMap((e: Loose) => [e.hoursLow, e.hours]).filter((v: Loose) => v != null))];
    const tWords = temps.length ? (temps.length === 1 ? withUnit(temps[0], '°C') : spanUnit(Math.min(...temps), Math.max(...temps), '°C')) : '';
    const hWords = hoursList.length ? (hoursList.length === 1 ? `${fmtDisplay(hoursList[0], 'h')}${NBSP}h` : spanUnit(Math.min(...hoursList), Math.max(...hoursList), 'h')) : '';
    const sub = counted.length ? `${tWords}${hWords ? (temps.length === 1 && hoursList.length === 1 ? ` for ${hWords}` : `, ${hWords}`) : ''}, ${products(counted.length)}` : 'from the Bambu Lab Filament Guide only';
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
      // As published, under each sheet's own test: each product's value, or the range of the values its documents give
      // (77 and 89 °C: 77–89 °C, never 83), marks closer than about 6 px drawn as one range; the label spans every mark.
      used.add('pub');
      const per = publishedValues(c, r.id);
      if (!per.length) continue;
      const lo = Math.min(...per.map((v: Loose) => v.min)), hi = Math.max(...per.map((v: Loose) => v.max));
      const groups: Loose[] = [];
      for (const v of per) {
        const last: Loose = groups.at(-1);
        if (last && X(v.min) - X(last.max) < 1.5) { last.max = Math.max(last.max, v.max); last.items.push(v); } else groups.push({ min: v.min, max: v.max, items: [v] });
      }
      for (const gr of groups) {
        const t = gr.items.map((v: Loose) => `${v.name}: ${spanUnit(v.min, v.max, '°C')}`).join('; ');
        if (X(gr.max) - X(gr.min) < 0.6) o.push(`<line class="tm-pub tp" x1="${pct(X(gr.min))}" x2="${pct(X(gr.min))}" y1="${mid - 7}" y2="${mid + 7}" data-t="${esc(`${t}, as published`)}"/>`);
        // A range is one solid bar, no end ticks (two ticks a few pixels apart read as a letter H).
        else o.push(`<rect class="tm-pubrange tp" x="${pct(X(gr.min))}" y="${mid - 5}" width="${pct(Math.max(X(gr.max) - X(gr.min), 0.6))}" height="10" rx="2" data-t="${esc(`${t}, as published`)}"/>`);
      }
      if (groups.length > 1) o.unshift(`<line class="dv-peer-range" x1="${pct(X(lo))}" x2="${pct(X(hi))}" y1="${mid}" y2="${mid}"/>`);
      const span = spanUnit(lo, hi, '°C');
      const right = X(hi) > 60;
      o.push(`<text class="dv-val" x="${pct(right ? X(lo) : X(hi))}" y="${mid - 6}" dx="${right ? -6 : 6}" text-anchor="${right ? 'end' : 'start'}">${esc(span)}</text>`);
      const sub = `${products(per.length)}, as published`;
      rows.push(rowHtml(` data-key="${esc(keyAttr)}"`, r.label, sub, rowSvg(o.join(''), `${r.label}: ${span}, ${sub}.`)));
      twin.push([r.label, span, String(per.length), '—']);
      continue;
    }
    if (s.min !== s.max) o.push(`<line class="dv-self-range" x1="${pct(X(s.min))}" x2="${pct(X(s.max))}" y1="${mid}" y2="${mid}"/>`);
    if (s.q1 != null) o.push(`<rect class="dv-self-band" x="${pct(X(s.q1))}" y="${mid - 5}" width="${pct(Math.max(X(s.q3) - X(s.q1), 0.4))}" height="10" rx="2"/>`);
    o.push(`<svg x="${pct(X(s.median))}" y="${mid}" overflow="visible"><rect class="dv-self" x="-1.5" y="-9" width="3" height="18" rx="1.5"/></svg>`);
    const right = X(s.median) > 85;
    // A median that is a published bound keeps its sign, as the key properties print it (PEI-CF's "> 200 °C", C14).
    const median = `${r.h ? medianSign(m, r.h.key, s.median) : ''}${withUnit(s.median, '°C')}`;
    o.push(`<text class="dv-val" x="${pct(X(s.median))}" y="${mid - 6}" dx="${right ? -6 : 6}" text-anchor="${right ? 'end' : 'start'}">${esc(median)}</text>`);
    const sub = products(s.n);
    rows.push(rowHtml(` data-key="${esc(keyAttr)}"`, r.label, sub, rowSvg(o.join(''), `${r.label}: median ${median}${s.q1 != null ? `, middle half ${spanUnit(s.q1, s.q3, '°C')}` : ''}, ${sub}.`)));
    twin.push([r.label, median + (s.q1 != null ? ` (${spanUnit(s.q1, s.q3, '°C')})` : ''), String(s.n), '—']);
  }
  // The axis.
  const axis = `<div class="tm-axis"><div></div><div><svg class="dv-ticks" width="100%" height="18" aria-hidden="true" focusable="false"><line class="dv-axis" x1="0" x2="100%" y1="0.5" y2="0.5"/>${sc.ticks.map((t: Loose) => `<line class="dv-tk" x1="${pct(X(t))}" x2="${pct(X(t))}" y1="0" y2="3"/>`).join('')}${tickLabels(sc, 14, { wide: WIDE, narrow: NARROW })}</svg><p class="tm-unit">°C</p></div></div>`;

  // The finding: what only this figure shows, the print settings and the service temperatures against the H2C's limits.
  const out = (printFacts(m, c).outside ?? []).filter((x: Loose) => x.list.length);
  const word: Record<string, Loose> = { nozzle: 'nozzle', bed: 'bed', chamber: 'heated chamber' };
  const soft = m.headline?.hdt045?.known ? { v: m.headline.hdt045.value, what: 'softens' } : m.headline?.glassTransition?.known ? { v: m.headline.glassTransition.value, what: 'softens' } : null;
  const chamberLimit = pw.chamber.limit;
  let title: Loose;
  // Settings on which every product that gives one asks for more than the H2C gives lead the title; a few products
  // beyond a limit follow what governs the rest: where it softens against the chamber.
  const allOut = out.filter((x: Loose) => pw[x.axis] && x.list.length >= Math.max(1, pw[x.axis].windows.length + pw[x.axis].ends.length));
  const someOut = new Set(out.flatMap((x: Loose) => x.list.map((l: Loose) => l.g.id))).size;
  const tail = someOut && !allOut.length ? `; ${someOut} ${someOut === 1 ? 'product asks' : 'products ask'} for more than the H2C gives` : '';
  if (allOut.length) {
    const settings = andList(allOut.map((x: Loose) => word[x.axis] ?? x.label.toLowerCase()));
    title = `${name}'s ${settings} ${allOut.length > 1 ? 'run' : 'runs'} past what the H2C gives`;
  } else if (soft && chamberLimit != null && soft.v < chamberLimit) {
    title = `${name} softens near ${withUnit(soft.v, '°C')}, below the H2C's ${chamberLimit}${NBSP}°C chamber${tail}`;
  } else if (soft && chamberLimit != null) {
    title = someOut ? `${name} softens near ${withUnit(soft.v, '°C')}, above the H2C's ${chamberLimit}${NBSP}°C chamber${tail}`
      : `${name} prints within the H2C's limits and softens near ${withUnit(soft.v, '°C')}, above its ${chamberLimit}${NBSP}°C chamber`;
  } else title = `${name}'s print settings and service temperatures against the H2C's limits`;
  const key = keyOf([...(used.has('shade') ? [KEY.shade()] : []), ...(used.has('most') ? [KEY.most()] : []), ...(used.has('oneEnd') ? [KEY.oneEnd()] : []),
    ...(used.has('limit') ? [KEY.limit()] : []), ...(dry.entries.length ? [KEY.product()] : []), ...(ladder.some((r: Loose) => r.compared) ? [KEY.selfCell(name)] : []), ...(used.has('pub') ? [KEY.pubCell()] : [])]);
  const missing = AXES.filter(([a]) => !pw[a].windows.length && !pw[a].ends.length).map(([, l]) => l.toLowerCase());
  const leaves = [missing.length ? `No ${name} product gives a ${orList(missing)} window.` : '', !ladder.length ? `No ${name} product publishes a softening temperature.` : '',
    `Windows read from the Bambu Lab Filament Guide are not shaded: the guide speaks for every product that reads it.`].filter(Boolean).join(' ');
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
 * Each product's values of a property published under its sheet's own test (Vicat, melting), as heatLadder reads them:
 * a product's own numeric °C values, not held back or flagged implausible, products with an added filler or additive
 * left out; where its documents give several, their lowest and highest. Display only. [{ g, name, min, max }].
 */
function publishedValues(c: Loose, property: Loose): Loose {
  const byGrade = new Map();
  for (const x of c.ms) {
    if (x.property !== property || !x.numeric || x.unit !== '°C' || x.quarantined || x.implausible || !Number.isFinite(x.value)) continue;
    const g = c.gradeById.get(x.gradeId);
    if (!g || g.retired || !isProduct(g) || g.variant) continue;
    // A range its sheet prints ("180–200 °C") is drawn as that range, never at its low end alone.
    (byGrade.get(g.id) ?? byGrade.set(g.id, { g, values: [] }).get(g.id)).values.push(...publishedEnds(x));
  }
  return [...byGrade.values()].map(({ g, values }) => ({ g, name: productName(g), min: Math.min(...values), max: Math.max(...values) }))
    .sort((a, b) => a.min - b.min || a.max - b.max);
}
