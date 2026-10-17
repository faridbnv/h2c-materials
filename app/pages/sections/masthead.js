// The Overview's first screen (the pages reimagined, 2026-10-17): the head (name, full name, the identity sentence, the
// tabs Overview | Products), a plate of six key figures (each the median of the products that publish it comparably,
// with how many they are and their middle half, its products' spread drawn small, and the evidence line as the plate's
// foot), then the written summary beside an "On the H2C" plate (nozzle, bed, heated chamber, drying, hardened nozzle).
// A material beyond the H2C's capability says so first.
//
// Every number is the compiled database's, through the facts layer (materials[].headline and .summary, the products'
// print gates); the words are findings.js's (track B) where it has them, the shared words' otherwise; the small
// spread drawing is the figures' (track C, figures.js miniSpread). Where one of those is not there yet, the plate says
// what it has and draws nothing in its place: no number is typed here, and nothing here decides anything.

import { esc } from '../html.js';
import { fmtNumber } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { identity, stated, isProduct, printCounts } from '../../js/ui/material-facts.js';
import { printWindows, dryingStats, typicalWindow } from '../../js/ui/material-stats.js';
import { identityLine, windowText, plural, asPublishedWords } from '../../js/ui/material-words.js';
import { H2C_STATUS, h2cLimit } from '../../js/ui/labels.js';
import * as F from '../findings.js';
import * as FIG from '../figures.js';
import * as NUM from '../numbers.js';
import { pageHead, tabsNav } from '../shell.js';

/** The plate's key figures, in the order of the figure that compares the material with its alternatives (track C). */
const PLATE_KEYS = ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'charpyNotched', 'hdt045', 'priceCADkg'];
const plateKeys = () => (Array.isArray(FIG.PEER_COLUMNS) && FIG.PEER_COLUMNS.length ? FIG.PEER_COLUMNS.map((x) => (typeof x === 'string' ? x : x.key)) : PLATE_KEYS);

/** A displayed number: track C's display precision where it has landed, else the pages' own form. */
export const disp = (v) => (typeof NUM.fmtDisplay === 'function' ? NUM.fmtDisplay(v) : (NUM.fmtPage ?? fmtNumber)(v));
const span = (lo, hi) => (lo === hi ? disp(lo) : `${disp(lo)}–${disp(hi)}`);

/** A word track B provides, or null where it has not landed: its functions are called guarded, never assumed. */
const words = (name, ...args) => (typeof F[name] === 'function' ? F[name](...args) : null);
/** B's words as markup: a string is escaped here, a Say ({ text, html }) brings its own escaped markup. */
const sayHtml = (x) => (x == null ? '' : typeof x === 'string' ? esc(x) : x.html ?? esc(x.text ?? ''));

/**
 * One key figure: its name, its median and unit, its products' spread drawn small, and what it rests on. The cell
 * carries the checks' hooks: data-key, data-v (the median as compiled, unrounded) and data-n, or data-state where there
 * is no compared median (as-published, missing, na).
 */
function keyFigure(c, key) {
  const h = REGISTRY.allHeadlines.find((x) => x.key === key);
  if (!h) return '';
  const m = c.m;
  const e = m.headline?.[key];
  const s = m.summary?.[key];
  const label = `<dt>${esc(h.labels.plain)}</dt>`;
  const unit = h.unit ? `<span class="kf-u">${esc(h.unit)}</span>` : '';
  if (e?.known) {
    const n = s?.n ?? e.spread?.n ?? 1;
    const lo = s?.q1 ?? e.spread?.q1, hi = s?.q3 ?? e.spread?.q3;
    const foot = n >= 4 && lo != null && hi != null ? [plural(n, 'product'), `middle half ${span(lo, hi)}`]
      : n >= 2 ? [plural(n, 'product'), span(s?.min ?? e.spread?.min, s?.max ?? e.spread?.max)] : ['one product'];
    const mini = typeof FIG.miniSpread === 'function' ? FIG.miniSpread(c, key) : '';
    return `<div class="kf-cell" data-key="${esc(key)}" data-v="${esc(e.value)}" data-n="${n}">${label}`
      + `<dd class="kf-v"><span class="kf-n">${esc(disp(e.value))}</span>${unit}</dd>`
      + `<dd class="kf-s"${mini ? '' : ' data-pending="miniSpread"'}>${mini ?? ''}</dd><dd class="kf-f">${foot.map((t) => `<span>${esc(t)}</span>`).join('<span class="vh"> · </span>')}</dd></div>`;
  }
  if (e?.notApplicable) {
    return `<div class="kf-cell kf-cell--none" data-key="${esc(key)}" data-state="na">${label}<dd class="kf-v"><span class="kf-none">Not applicable</span></dd><dd class="kf-s"></dd><dd class="kf-f"></dd></div>`;
  }
  const a = s?.asPublished;
  if (a?.n) {
    return `<div class="kf-cell kf-cell--open" data-key="${esc(key)}" data-state="as-published" data-n="${a.n}">${label}`
      + `<dd class="kf-v"><span class="kf-n">${esc(span(a.min, a.max))}</span>${unit}</dd><dd class="kf-s"></dd>`
      + `<dd class="kf-f">${esc(`as published · ${asPublishedWords(h)}`)}</dd></div>`;
  }
  const b = e?.related?.best;
  const lacks = b && typeof F.nearestLacks === 'function' ? F.nearestLacks(h, b, c.msById.get(b.measurementId)).slice(0, 1) : [];
  return `<div class="kf-cell kf-cell--none" data-key="${esc(key)}" data-state="missing">${label}<dd class="kf-v"><span class="kf-none">Not published</span></dd><dd class="kf-s"></dd>`
    + `<dd class="kf-f">${lacks.length ? esc(`${lacks[0]} only`) : ''}</dd></div>`;
}

/** The written summary's parts as paragraphs, a filled number printed as plain words (a blank line starts a paragraph). */
function paragraphs(parts) {
  const out = [[]];
  for (const p of parts ?? []) {
    if (p.field) {
      const sign = typeof p.bound === 'string' ? `${p.bound} ` : p.bound?.sign ? `${p.bound.sign} ` : '';
      const value = typeof p.value === 'number' ? fmtNumber(p.value) : String(p.value ?? '');
      out.at(-1).push(`<span data-field="${esc(p.field)}" data-value="${esc(p.value)}">${esc(`${sign}${value}${p.unit ? ` ${p.unit}` : ''}`)}</span>`);
      continue;
    }
    String(p.text ?? '').split(/\n\s*\n/).forEach((t, i) => { if (i) out.push([]); if (t) out.at(-1).push(esc(t.replace(/\s*\n\s*/g, ' '))); });
  }
  return out.map((x) => x.join('').trim()).filter(Boolean).map((t) => `<p>${t}</p>`).join('');
}


function summaryBlock(c) {
  const w = c.m.written;
  if (!w?.parts?.length) return '';
  // Who wrote it and its review status are in the colophon (footer.js), as the owner decided; nothing beside it.
  return `<section class="sum" data-section="summary" aria-label="In short"><div class="sum-text">${paragraphs(w.parts)}</div></section>`;
}

/**
 * The On the H2C plate's rows where track B's onTheH2cRows has not landed: each setting most products' own or shared
 * sheets give, from their print gates (material-stats.js printWindows, dryingStats; grades[].print), with how many it
 * rests on. B's words replace these when they land.
 */
function h2cRowsFromFacts(c) {
  const products = c.grades.filter(isProduct);
  const total = products.length;
  const win = (axis, label) => {
    const pw = printWindows(products, axis);
    if (!pw.n) return { key: axis, label, value: 'Not stated', note: '' };
    const r = typicalWindow(pw);
    return { key: axis, label, value: `${windowText(r.from, r.to)} °C`, note: r.share === 'one' ? 'one product' : r.share === 'all' ? `all ${pw.n} products that give one` : r.share === 'most' ? 'most products that give one' : `${r.k} of ${pw.n} products that give one` };
  };
  const chamber = (() => {
    const pw = printWindows(products, 'chamber');
    const none = (pw.states.get('not-required') ?? 0) + (pw.states.get('ambient') ?? 0);
    if (none > pw.n) return { key: 'chamber', label: 'Heated chamber', value: 'Not needed', note: `${none} of ${total} products` };
    if (pw.n) { const r = typicalWindow(pw); return { key: 'chamber', label: 'Heated chamber', value: `${windowText(r.from, r.to)} °C`, note: pw.n === 1 ? 'one product' : `${pw.n} products give one` }; }
    return { key: 'chamber', label: 'Heated chamber', value: 'Not stated', note: '' };
  })();
  const drying = (() => {
    const d = dryingStats(products);
    const t = d.temps;
    if (!t?.n) return { key: 'drying', label: 'Drying', value: 'Not stated', note: '' };
    const hours = d.hours?.n ? ` for ${fmtNumber(d.hours.median)} h` : '';
    return { key: 'drying', label: 'Drying', value: `${fmtNumber(t.median)} °C${hours}`, note: t.n === 1 ? 'one product' : `the median of ${t.n} products` };
  })();
  const hard = products.filter((g) => g.print?.hardenedNozzle === true).length;
  const hardened = { key: 'hardened', label: 'Hardened nozzle', value: hard * 2 > total ? 'Needed' : 'Not needed', note: hard ? `${hard} of ${total} products need one` : '' };
  return [win('nozzle', 'Nozzle'), win('bed', 'Bed'), chamber, drying, hardened];
}

/** The plate's foot: whether any product asks for more than the H2C gives (material-facts.js printCounts). */
function h2cFoot(c) {
  const pc = printCounts(c.grades);
  if (!pc) return '';
  const limits = pc.axes.map((a) => `${a.label === 'Chamber' ? 'heated chamber' : a.label.toLowerCase()} ${fmtNumber(h2cLimit(a.axis))} °C`);
  const over = pc.axes.filter((a) => a.over);
  if (!over.length) return `No product's setting is beyond the H2C's limits: ${limits.join(', ')}.`;
  return `${over.map((a) => `${plural(a.over, 'product')} ${a.over === 1 ? 'asks' : 'ask'} for more ${a.label === 'Chamber' ? 'chamber heat' : `${a.label.toLowerCase()} heat`} than the H2C gives`).join('; ')}. The H2C's limits: ${limits.join(', ')}.`;
}

function h2cPlate(c, hasPrinting) {
  const b = words('onTheH2cRows', c);
  const rows = Array.isArray(b) ? b : Array.isArray(b?.rows) ? b.rows : h2cRowsFromFacts(c);
  const foot = (b && !Array.isArray(b) && b.note) || h2cFoot(c);
  // The checks read each row by its setting: nozzle, bed, chamber, drying, hardened (B names the last 'nozzle-type').
  const KEY = { 'nozzle-type': 'hardened', hardenedNozzle: 'hardened' };
  const row = (r) => `<div data-print="${esc(KEY[r.key] ?? r.key)}"><dt>${sayHtml(r.label)}</dt><dd class="h2c-v">${sayHtml(r.value)}</dd>${r.note ? `<dd class="h2c-k">${sayHtml(r.note)}</dd>` : ''}</div>`;
  return `<section class="h2c plate" aria-labelledby="h2c-h" data-section="on-the-h2c"${Array.isArray(b) || b?.rows ? '' : ' data-pending="onTheH2cRows"'}>`
    + `<div class="h2c-h"><h2 id="h2c-h">On the H2C</h2>${hasPrinting ? '<a href="#printing">Printing in full</a>' : ''}</div>`
    + `<dl>${rows.map(row).join('')}</dl>${foot ? `<p class="h2c-foot">${sayHtml(foot)}</p>` : ''}</section>`;
}

/** The identity sentence (track B), else the shared identity line, marked as waiting for it. */
function identityHtml(c) {
  const s = words('identitySentence', c);
  if (s) return `<p class="pid">${sayHtml(s)}</p>`;
  const id = identity(c.m, c);
  const lede = H2C_STATUS[c.m.h2cStatus]?.lede;
  return `<p class="pid" data-pending="identitySentence">${esc(identityLine(id))}.${lede ? ` ${esc(lede)}` : ''}</p>`;
}

export default {
  id: 'masthead',
  title: null,
  render(c, env = {}) {
    const m = c.m;
    const id = identity(m, c);
    const products = c.grades.filter(isProduct).length;
    const head = pageHead({
      name: id.primary, aka: id.aka, fullName: id.fullName,
      lines: identityHtml(c) + (m.excluded ? '<p class="callout"><b>Beyond H2C capability.</b> Kept for reference, never a candidate: it needs more heat than the H2C gives.</p>' : ''),
      tabs: tabsNav({ id: m.id, name: id.primary, n: products, current: 'overview' }),
    });
    // The evidence line: B's { tier, head, html } (the head in bold, quietly), or a plain Say or string.
    const ev = words('evidenceLine', c);
    const evidence = ev ? `${ev.head ? `<b>${sayHtml(ev.head)}</b> ` : ''}${ev.html ?? sayHtml(ev)}` : '';
    const plate = `<section class="kf-wrap" data-section="key-figures" aria-label="Key figures: the median of the products that publish each value">`
      + `<dl class="kf plate">${plateKeys().map((k) => keyFigure(c, k)).join('')}</dl>`
      + `${evidence ? `<p class="kf-ev" data-tier="${esc(ev.tier ?? '')}">${evidence}</p>` : ''}</section>`;
    const summary = summaryBlock(c);
    const first = `<div class="first${summary ? '' : ' first--alone'}">${summary}${h2cPlate(c, env.hasPrinting !== false)}</div>`;
    return { html: `${head}\n${plate}\n${first}`, empty: false, stats: { filled: (m.written?.parts ?? []).filter((p) => p.field).length } };
  },
};
