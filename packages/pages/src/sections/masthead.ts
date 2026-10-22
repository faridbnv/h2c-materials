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

import type { Loose } from '../loose.ts';

import { esc } from '../html.ts';
import { fmtNumber, boundSign } from '../facts/format.ts';
import { REGISTRY } from '../facts/registry.ts';
import { identity, stated, isProduct } from '../facts/material-facts.ts';
import { printWindows, dryingStats, typicalWindow } from '../facts/material-stats.ts';
import { identityLine, windowText, plural, asPublishedWords, inText } from '../facts/material-words.ts';
import { H2C_STATUS } from '../facts/labels.ts';
import { beyondLimitsLine } from '../facts/print-brief.ts';
import * as F from '../findings.ts';
import * as FIG from '../figures.ts';
import * as NUM from '../numbers.ts';
import { pageHead, tabsNav } from '../shell.ts';

/** The plate's key figures, in the order of the figure that compares the material with its alternatives (track C). */
const PLATE_KEYS = ['tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'charpyNotched', 'hdt045', 'priceCADkg'];
const plateKeys = () => (Array.isArray(FIG.PEER_COLUMNS) && FIG.PEER_COLUMNS.length ? FIG.PEER_COLUMNS.map((x) => (typeof x === 'string' ? x : x.key)) : PLATE_KEYS);

/** A displayed number: track C's display precision where it has landed, else the pages' own form. */
export const disp = (v: Loose, unit: Loose) => (typeof NUM.fmtDisplay === 'function' ? NUM.fmtDisplay(v, unit) : (NUM.fmtPage ?? fmtNumber)(v));
const span = (lo: Loose, hi: Loose, unit: Loose) => (lo === hi ? disp(lo, unit) : `${disp(lo, unit)}–${disp(hi, unit)}`);


/** A word track B provides, or null where it has not landed: its functions are called guarded, never assumed. */
const words = (name: Loose, ...args: Loose[]) => (typeof (F as Record<string, Loose>)[name] === 'function' ? (F as Record<string, Loose>)[name](...args) : null);
/** B's words as markup: a string is escaped here, a Say ({ text, html }) brings its own escaped markup. */
const sayHtml = (x: Loose) => (x == null ? '' : typeof x === 'string' ? esc(x) : x.html ?? esc(x.text ?? ''));

/**
 * One key figure: its name, its median and unit, its products' spread drawn small, and what it rests on. The cell
 * carries the checks' hooks: data-key, data-v (the median as compiled, unrounded) and data-n, or data-state where there
 * is no compared median (as-published, missing, na).
 */
function keyFigure(c: Loose, key: Loose): Loose {
  const h = REGISTRY.allHeadlines.find((x: Loose) => x.key === key);
  if (!h) return null;
  const m = c.m;
  const e = m.headline?.[key];
  const s = m.summary?.[key];
  const label = `<dt>${esc(h.labels.plain)}</dt>`;
  const unit = h.unit ? `<span class="kf-u">${esc(h.unit)}</span>` : '';
  // A figure not published is named in the line under the plate by its own label, as the plate, the drawer and the
  // Products columns name it ("tensile strength (Z)", "notched Charpy impact"), never another name (C19).
  const quiet = (state: Loose): Loose => ({ missing: true, key, state, words: inText(h.labels.plain) });
  if (e?.known) {
    const n = s?.n ?? e.spread?.n ?? 1;
    const lo = s?.q1 ?? e.spread?.q1, hi = s?.q3 ?? e.spread?.q3;
    const foot = n >= 4 && lo != null && hi != null ? [plural(n, 'product'), `middle half ${span(lo, hi, h.unit)}`]
      : n >= 2 ? [plural(n, 'product'), span(s?.min ?? e.spread?.min, s?.max ?? e.spread?.max, h.unit)] : ['one product'];
    const mini = typeof FIG.miniSpread === 'function' ? FIG.miniSpread(c, key) : '';
    // The value as every other place on the page prints it (numbers.js fmtDisplay), a published bound's sign kept.
    return { html: `<div class="kf-cell" data-key="${esc(key)}" data-v="${esc(e.value)}" data-n="${n}">${label}`
      + `<dd class="kf-v"><span class="kf-n">${esc(`${boundSign(e)}${disp(e.value, h.unit)}`)}</span>${unit}</dd>`
      + `<dd class="kf-s"${mini ? '' : ' data-pending="miniSpread"'}>${mini ?? ''}</dd><dd class="kf-f">${foot.map((t) => `<span>${esc(t)}</span>`).join('<span class="vh"> · </span>')}</dd></div>` };
  }
  if (e?.notApplicable) return quiet('na');
  const a = s?.asPublished;
  if (a?.n) {
    return { html: `<div class="kf-cell kf-cell--open" data-key="${esc(key)}" data-state="as-published" data-n="${a.n}">${label}`
      + `<dd class="kf-v"><span class="kf-n">${esc(span(a.min, a.max, h.unit))}</span>${unit}</dd><dd class="kf-s"></dd>`
      + `<dd class="kf-f">${esc(`as published · ${asPublishedWords(h)}`)}</dd></div>` };
  }
  return quiet('missing');
}

/**
 * The plate: every key figure in the alternatives' column order, so a reader (and the check) meets them as that table
 * runs. A figure with no value takes no cell: CSS sets it, out of that order, in one quiet line under the others ("Not
 * published: strength across the layers, notched impact. Not applicable: …"). Each keeps its data-key and data-state.
 */
function plate(c: Loose) {
  const figs = plateKeys().map((k) => keyFigure(c, k)).filter(Boolean);
  if (!figs.length) return '';
  const HEADS: Record<string, Loose> = { missing: 'Not published:', na: 'Not applicable:' };
  const of = (state: Loose): Loose => figs.filter((f) => f.missing && f.state === state);
  const lead = (of('missing')[0] ?? of('na')[0]);
  const quiet = (f: Loose) => {
    const list = of(f.state), i = list.indexOf(f), last = i === list.length - 1;
    const cls = ['kf-gone', `kf-gone--${f.state}`, f === lead ? 'kf-gone--lead' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" data-key="${esc(f.key)}" data-state="${f.state}"><dt${i ? ' class="kf-gone-h"' : ''}>${esc(HEADS[f.state])}</dt>`
      + `<dd>${esc(f.words)}<span class="kf-sep">${last ? '.' : ','}</span></dd></div>`;
  };
  return `<dl class="kf plate">${figs.map((f) => (f.missing ? quiet(f) : f.html)).join('')}</dl>`;
}

/** The written summary's parts as paragraphs, a filled number printed as plain words (a blank line starts a paragraph). */
function paragraphs(parts: Loose) {
  const out: Loose[][] = [[]];
  for (const p of parts ?? []) {
    if (p.field) {
      const sign = typeof p.bound === 'string' ? `${p.bound} ` : p.bound?.sign ? `${p.bound.sign} ` : '';
      const value = typeof p.value === 'number' ? fmtNumber(p.value) : String(p.value ?? '');
      out.at(-1)!.push(`<span data-field="${esc(p.field)}" data-value="${esc(p.value)}">${esc(`${sign}${value}${p.unit ? ` ${p.unit}` : ''}`)}</span>`);
      continue;
    }
    String(p.text ?? '').split(/\n\s*\n/).forEach((t, i) => { if (i) out.push([]); if (t) out.at(-1)!.push(esc(t.replace(/\s*\n\s*/g, ' '))); });
  }
  return out.map((x) => x.join('').trim()).filter(Boolean).map((t) => `<p>${t}</p>`).join('');
}


function summaryBlock(c: Loose) {
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
function h2cRowsFromFacts(c: Loose): Loose {
  const products = c.grades.filter(isProduct);
  const total = products.length;
  const win = (axis: Loose, label: Loose): Loose => {
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
  const hard = products.filter((g: Loose) => g.print?.hardenedNozzle === true).length;
  const hardened = { key: 'hardened', label: 'Hardened nozzle', value: hard * 2 > total ? 'Needed' : 'Not needed', note: hard ? `${hard} of ${total} products need one` : '' };
  return [win('nozzle', 'Nozzle'), win('bed', 'Bed'), chamber, drying, hardened];
}

/** The plate's foot: whether any product asks for more than the H2C gives (print-brief.js beyondLimitsLine, shared). */
const h2cFoot = (c: Loose) => beyondLimitsLine(c.grades);

function h2cPlate(c: Loose, hasPrinting: Loose) {
  const b = words('onTheH2cRows', c);
  const rows = Array.isArray(b) ? b : Array.isArray(b?.rows) ? b.rows : h2cRowsFromFacts(c);
  const foot = (b && !Array.isArray(b) && b.note) || h2cFoot(c);
  // The checks read each row by its setting: nozzle, bed, chamber, drying, hardened (B names the last 'nozzle-type').
  const KEY: Record<string, Loose> = { 'nozzle-type': 'hardened', hardenedNozzle: 'hardened' };
  const row = (r: Loose) => `<div data-print="${esc(KEY[r.key] ?? r.key)}"><dt>${sayHtml(r.label)}</dt><dd class="h2c-v">${sayHtml(r.value)}</dd>${r.note ? `<dd class="h2c-k">${sayHtml(r.note)}</dd>` : ''}</div>`;
  return `<section class="h2c plate" aria-labelledby="h2c-h" data-section="on-the-h2c"${Array.isArray(b) || b?.rows ? '' : ' data-pending="onTheH2cRows"'}>`
    + `<div class="h2c-h"><h2 id="h2c-h">On the H2C</h2>${hasPrinting ? '<a href="#printing">Printing in full</a>' : ''}</div>`
    + `<dl>${rows.map(row).join('')}</dl>${foot ? `<p class="h2c-foot">${sayHtml(foot)}</p>` : ''}</section>`;
}

/** The identity sentence (track B), else the shared identity line, marked as waiting for it. */
function identityHtml(c: Loose) {
  const s = words('identitySentence', c);
  if (s) return `<p class="pid">${sayHtml(s)}</p>`;
  const id = identity(c.m, c);
  const lede = H2C_STATUS[c.m.h2cStatus]?.lede;
  return `<p class="pid" data-pending="identitySentence">${esc(identityLine(id))}.${lede ? ` ${esc(lede)}` : ''}</p>`;
}

export default {
  id: 'masthead',
  title: null,
  render(c: Loose, env: Loose = {}): Loose {
    const m = c.m;
    const id = identity(m, c);
    const products = c.grades.filter(isProduct).length;
    const head = pageHead({
      name: id.primary, aka: id.aka, fullName: id.fullName,
      lines: identityHtml(c) + (m.excluded ? '<p class="callout"><b>Beyond H2C capability.</b> Kept for reference, never a candidate: it needs more heat than the H2C gives.</p>' : ''),
      tabs: tabsNav({ id: m.id, name: id.primary, n: products, current: 'overview' }),
    });
    // The evidence line: B's { tier, head, html } (the head in bold, quietly), or a plain Say or string. It sits under
    // the summary, in the left column, so the column beside On the H2C leaves no hole.
    const ev = words('evidenceLine', c);
    const evidence = ev ? `${ev.head ? `<b>${sayHtml(ev.head)}</b> ` : ''}${ev.html ?? sayHtml(ev)}` : '';
    const keyFigures = `<section class="kf-wrap" data-section="key-figures" aria-label="Key properties: the median of the products that publish each value">${plate(c)}</section>`;
    const summary = summaryBlock(c);
    const left = `${summary}${evidence ? `<p class="kf-ev" data-tier="${esc(ev.tier ?? '')}">${evidence}</p>` : ''}`;
    const first = `<div class="first${left ? '' : ' first--alone'}">${left ? `<div class="first-left">${left}</div>` : ''}${h2cPlate(c, env.hasPrinting !== false)}</div>`;
    return { html: `${head}\n${keyFigures}\n${first}`, empty: false, stats: { filled: (m.written?.parts ?? []).filter((p: Loose) => p.field).length } };
  },
};
