// What the Overview's sections share: the way back to the selector, a section's opening, the figures drawn by
// app/pages/figures.js (each guarded, so a figure not yet drawn leaves its place empty rather than breaking the page), a
// statement quoted in its maker's words, a table, and which known gaps a reader is shown. Every number is the facts
// layer's (findings.js `num` marks it), every word findings.js's, material-words.js's or labels.js's.

import type { Loose } from '../loose.ts';

import { esc, tableBox } from '../html.ts';
import { isReprintEntry } from '@atlas/domain';
import { productNameOrId, stated, readerText, shownGap, GAP_DOMAIN_WORDS, spreadEntries } from '../facts/material-facts.ts';
import { REGISTRY } from '../facts/registry.ts';
import { sourceKind } from '../facts/labels.ts';
import * as FIGURES from '../figures.ts';
import { isSay, plain, productHref, glue } from '../findings.ts';
import { toHash, newScenario } from '@atlas/engine/port/scenario.ts';
import { sheetCode } from '../records/common.ts';

export { tableBox };

/** The selector with this material's drawer open, as a link the engine's own scenario hash writes (null without a selector). */
export const selectorLink = (c: Loose, env: Loose): Loose => (env.selectorHref ? `${env.selectorHref}#${toHash({ ...newScenario(c.db.meta), openMaterial: c.m.id })}` : null);

/** A section's opening: its sentences (Says or text), one paragraph, larger than the text. Empty where there are none. */
export function opening(lines: Loose, cls = 'sec-open') {
  const xs = lines.filter((x: Loose) => x && (isSay(x) ? x.text : String(x)));
  return xs.length ? `<p class="${esc(cls)}">${xs.map((x: Loose) => (isSay(x) ? x : plain(x)).html).join(' ')}</p>` : '';
}
/** Sentences as a paragraph of ordinary text. */
export const para = (lines: Loose, cls = '') => opening(lines, cls || 'sec-p');

/** A sub-heading inside a section. */
export const subhead = (title: Loose, id: Loose = null) => `<h3 class="sec-sub"${id ? ` id="${esc(id)}"` : ''}>${esc(title)}</h3>`;

/**
 * One of the figures (figures.js: peersFigure, mapsFigure, stripsFigure, layersFigure, temperaturesFigure), called with
 * `args`, or an empty result where it is not there or fails: `{ html, empty, stats }`.
 */
export function drawFigure(name: Loose, ...args: Loose[]) {
  const f = (FIGURES as Record<string, Loose>)[name];
  if (typeof f !== 'function') return { html: '', empty: true, stats: {} };
  try {
    const r = f(...args);
    return r && typeof r.html === 'string' ? r : { html: '', empty: true, stats: {} };
  } catch (e: Loose) {
    if (globalThis.process?.env?.PAGES_STRICT) throw e;
    console.warn(`${name}: ${e.message}`);
    return { html: '', empty: true, stats: {} };
  }
}
/** The figures' constants (figures.js STRIP_SETS and the like), or a fallback where they are not there. */
export const figureConfig = (name: Loose, fallback: Loose) => (FIGURES as Record<string, Loose>)[name] ?? fallback;

/** A product's name as a link to its card on the Products page. */
export const productA = (c: Loose, g: Loose) => (g ? `<a class="prod" href="${esc(productHref(c, g.id))}">${esc(productNameOrId(g))}</a>` : '');

/** A page or locator of a document, short: "p. 2". */
const pageOf = (locator: Loose): Loose => /^p\. ?\d+/.exec(String(locator ?? ''))?.[0] ?? null;

/**
 * Whether a statement is a maker's own words, to be set in quotation marks: a maker's statement collected word for word
 * (db.knowHow), or an evidence record of one product's maker (Evidence type "Manufacturer statement" on a product). An
 * evidence record about the material in general, a study's or a reference's, is this project's reading of its source:
 * the data holds no mark of which words are verbatim, so it is set as plain text, "after" its source (OPEN-PROBLEMS).
 */
export const verbatim = (k: Loose) => (k.evidenceType == null ? true : stated(k.gradeId) && k.evidenceType === 'Manufacturer statement');

/**
 * A statement: in quotation marks where it is its maker's own words (`verbatim`), with whose it is (the product, linked
 * to its card) and the kind of document and its page; otherwise as plain text, "after" its source's publisher and title.
 * `rec` puts the record's ID on it (`data-rec`), for a record this page holds: a statement about the material in general.
 * A product's statement is its card's record and carries none.
 */
export function quote(c: Loose, k: Loose, { text = k.text ?? k.finding, rec = false, extra = '' }: Loose = {}) {
  const s = c.sourceById.get(k.sourceId);
  const g = stated(k.gradeId) ? c.gradeById.get(k.gradeId) : null;
  const where = [sourceKind(s).toLowerCase(), pageOf(k.locator)].filter(Boolean).join(', ');
  const source = [s?.publisher, String(s?.title ?? '').replace(/\s*-\s*PMC Lock$/, '')].filter(stated).join(', ') || 'a reference';
  const words = esc(glue(String(text ?? '').trim()));
  // A sentence quoted once on a page is not quoted again in a later section (PETG quoted one of Bambu Lab's three times,
  // the final review); a record only the Overview holds (rec) is always shown, so it stays on the page.
  const said = (c.quotedOnPage ??= new Set());
  const key = String(text ?? '').toLowerCase().replace(/\W+/g, ' ').trim();
  if (!rec && said.has(key)) return '';
  said.add(key);
  const what = extra ? ` <span class="said-what">${esc(extra)}</span>` : '';
  if (!verbatim(k)) return `<li class="said said--after"${rec ? ` data-rec="${esc(k.id)}"` : ''}><span class="said-text">${words}</span>${what} <span class="said-who">${esc(`after ${source}`)}</span></li>`;
  const who = g ? `${productA(c, g)}, ${esc(where)}` : esc(source);
  return `<li class="said"${rec ? ` data-rec="${esc(k.id)}"` : ''}><q>${words}</q>${what} <span class="said-who">${who}</span></li>`;
}

/** A list of quotes. */
export const quotes = (items: Loose, cls = 'said-list') => { const xs = items.filter(Boolean); return xs.length ? `<ul class="${esc(cls)}">${xs.join('')}</ul>` : ''; };

// ------------------------------------------------------------------ known gaps: the reader's, never the maintainers'

// The rule for reader text (a reviewer's note that names no record, no stored word and no review step) lives in
// app/js/ui/material-facts.js since 2026-10-18, so the drawer leaves out what the pages leave out; and so, since the
// coherence round, does the rule for which known gaps a reader is shown and counted (shownGap), which the drawer reads too.
export { readerText, shownGap };

/** A known gap as a list item: its subject, then the reviewer's finding in their words, the record's ID on it. */
export function gapItem(r: Loose) {
  const text = r.domain === 'Sparse properties' ? String(r.finding ?? '').replace(/^Not published by its own products:\s*/i, '') : String(r.finding ?? '');
  return `<li class="gap" data-rec="${esc(r.id)}"><b>${esc((GAP_DOMAIN_WORDS as Record<string, Loose>)[r.domain] ?? r.domain ?? '')}:</b> ${esc(text)}</li>`;
}

// ------------------------------------------------------------------ thin data: what each sheet publishes

/** The most products a table sets across, a column each; more are set down, a row each. The settings table follows it. */
export const ACROSS_MAX = 5;
/** The page's products, in the one order every table of the page sets them in. */
export const pageProducts = (c: Loose) => c.grades.filter((g: Loose) => !g.retired && !/-R\d+$/.test(g.id));

/**
 * A product-by-product table's frame, the same on every one of a page: a `sheet-table` box naming how many value columns
 * it has (`data-cols`) and how it is set (`data-layout`: products across or down), a column group (the row heads'
 * column, `col-prop`, then `col-p` a value column), so every such table of a page lines its products up on one grid.
 */
export const sheetFrame = (inner: Loose, n: Loose, layout: Loose, cls: Loose) => `<div class="sheet-table" data-cols="${n}" data-layout="${layout}">${tableBox(
  `<table class="grid ${cls}"><colgroup><col class="col-prop">${'<col class="col-p">'.repeat(n)}</colgroup>${inner}</table>`)}</div>`;

/**
 * A column head that fits: a product's name, or where it is long, its maker and the words that tell it from the other
 * columns of the same maker ("3DXTECH 9085"), the full name in the link's title.
 */
export function shortHeads(gs: Loose): Loose {
  const words = (g: Loose) => String(g.product ?? '').split(/\s+/).filter(Boolean);
  return new Map(gs.map((g: Loose) => {
    const full = productNameOrId(g);
    if (full.length <= 24 || !stated(g.manufacturer)) return [g.id, full];
    const same = gs.filter((x: Loose) => x.manufacturer === g.manufacturer && x !== g).map((x: Loose) => new Set(words(x)));
    const own = words(g).filter((w) => w.toLowerCase() !== String(g.manufacturer).toLowerCase());
    const telling = same.length ? own.filter((w) => same.every((set: Loose) => !set.has(w))) : own.slice(0, 2);
    return [g.id, `${g.manufacturer} ${(telling.length ? telling : own).slice(0, 2).join(' ')}`.trim()];
  }));
}

/** A product's name as a short column head, linked to its card, its full name as the link's title. */
export const headA = (c: Loose, g: Loose, short: Loose) => `<a class="prod" href="${esc(productHref(c, g.id))}" title="${esc(productNameOrId(g))}">${esc(short)}</a>`;

/** The line under a table with a value read from a shared sheet: what its grey says. */
export const SHARED_NOTE = 'In grey, a value a product reads from a data sheet it shares, where its own sheet is silent. The median counts that table once.';
/** The same note where no grey value of the table is one the median counts (every one is set apart): it says nothing about the median. */
export const SHARED_NOTE_APART = 'In grey, a value a product reads from a data sheet it shares, where its own sheet is silent.';

/**
 * What each product publishes of `keys` (grades[].headline: each product's own value, as the strips would draw it), as a
 * table on the page's grid (sheetFrame): every product of the page across, in the page's order, where there are
 * ACROSS_MAX or fewer, properties down; else the products that publish one down, the properties across. A value read
 * from a data sheet the product shares (D89) is in grey, the sheet's product in its title; one set apart (a test bar no
 * document describes as printed, or no stated load, D172) says so under it, and one measured after annealing too.
 * `fmt(value, unit)` prints a value. Each cell carries its measurement's ID (`data-mid`), not as a record.
 */
export function headlineTable(c: Loose, keys: Loose, { fmt, caption = 'As each sheet publishes it' }: Loose = {}) {
  const hs = keys.map((k: Loose) => REGISTRY.allHeadlines.find((h: Loose) => h.key === k)).filter(Boolean);
  const all = pageProducts(c);
  const live = hs.filter((h: Loose) => all.some((g: Loose) => g.headline?.[h.key]));
  if (!all.length || !live.length) return '';
  // A Z bar the sheet labels otherwise says the sheet's code, as everywhere a Z bar is labelled ("Z (ZX)").
  const code = (h: Loose, v: Loose): Loose => { const s = h.direction === 'Z' && v.measurementId ? sheetCode(c.msById?.get(v.measurementId)) : null; return s ? `Z (${s})` : null; };
  // A value set apart (D172) says why in as few words as the column's width holds (the cell does not wrap).
  const apart = (h: Loose, v: Loose): Loose => (v.caveat === 'not-described' ? 'not described as printed' : v.caveat === 'load-not-stated' ? 'load not stated' : h.direction ? 'orientation not stated' : 'load not stated');
  // A heat deflection counted on a bar no document describes, its plastic glassy (D177), says so too.
  const note = (h: Loose, v: Loose) => [v.level === 'as-published' ? apart(h, v) : v.admitted?.includes('bar') ? 'glassy: counts' : null, v.anneal ? 'after annealing' : null, code(h, v)].filter(Boolean).join(', ');
  const COUNTED = 'Its document does not describe the test bar; the value counts, since a plastic that cannot crystallise deflects near its glass transition however its bar was made';
  const twinOf = (v: Loose) => (v?.from?.origin === 'twin' ? c.gradeById.get(v.from.gradeId) ?? null : null);
  // "Counted once in the median" is said only where the build's rule excludes the value as a reprint (domain isReprintEntry, the build's own
  // test): a value set apart (a variant's, or not comparable) is a shared sheet's too, and the median does not count it at all.
  const entryOf = new Map<string, Map<string, Loose>>(live.map((h: Loose) => [h.key, new Map<string, Loose>(spreadEntries(c.m, c, h.key).map((e: Loose) => [e.g.id, e]))]));
  const reprint = (g: Loose, h: Loose) => { const e = entryOf.get(h.key)?.get(g.id); return !!e && isReprintEntry(e); };
  const cell = (g: Loose, h: Loose, label: Loose) => {
    const v = g.headline?.[h.key];
    if (!v) return `<td class="num none" data-label="${esc(label)}">not published</td>`;
    const n = note(h, v), twin = twinOf(v);
    const cls = ['num', v.level === 'as-published' ? 'open' : '', twin ? 'from' : ''].filter(Boolean).join(' ');
    const title = [twin ? `From the data sheet shared with ${productNameOrId(twin)}${reprint(g, h) ? '. Counted once in the median' : ''}` : null, v.admitted?.includes('bar') ? COUNTED : null].filter(Boolean).join('. ');
    return `<td class="${cls}" data-label="${esc(label)}"${v.measurementId ? ` data-mid="${esc(v.measurementId)}"` : ''}${title ? ` title="${esc(title)}"` : ''}>`
      + `<span class="cv"><span class="cv-n">${esc(`${sign(v)}${fmt(v.value, h.unit)}`)}</span>${n ? `<small>${esc(n)}</small>` : ''}</span></td>`;
  };
  // A published bound keeps its sign here as on the plate and in the drawer ("> 200 °C"), from the value's record.
  const sign = (v: Loose) => { const op = c.msById?.get(v.measurementId)?.operator; return op && /^[<>≤≥]=?$/.test(op) ? `${({ '>=': '≥', '<=': '≤' } as Record<string, Loose>)[op] ?? op} ` : ''; };
  const shared = live.some((h: Loose) => all.some((g: Loose) => twinOf(g.headline?.[h.key])));
  const counted = live.some((h: Loose) => all.some((g: Loose) => reprint(g, h)));
  const foot = shared ? `<p class="sec-note">${esc(counted ? SHARED_NOTE : SHARED_NOTE_APART)}</p>` : '';
  if (all.length <= ACROSS_MAX) {
    const short = shortHeads(all);
    const inner = `<thead><tr><th scope="col" class="prop">${esc(caption)}</th>${all.map((g: Loose) => `<th scope="col" class="num col-p">${headA(c, g, short.get(g.id))}</th>`).join('')}</tr></thead><tbody>`
      + live.map((h: Loose) => `<tr><th scope="row" class="prop">${esc(h.labels.plain)}</th>${all.map((g: Loose) => cell(g, h, short.get(g.id))).join('')}</tr>`).join('') + '</tbody>';
    return sheetFrame(inner, all.length, 'across', 'sheets') + foot;
  }
  const rows = all.filter((g: Loose) => live.some((h: Loose) => g.headline?.[h.key]));
  const short = shortHeads(rows);
  const inner = `<thead><tr><th scope="col" class="prop">Product</th>${live.map((h: Loose) => `<th scope="col" class="num col-p">${esc(h.labels.plain)}</th>`).join('')}</tr></thead><tbody>`
    + rows.map((g: Loose) => `<tr><th scope="row" class="prop">${headA(c, g, short.get(g.id))}</th>${live.map((h: Loose) => cell(g, h, h.labels.plain)).join('')}</tr>`).join('') + '</tbody>';
  return sheetFrame(inner, live.length, 'down', 'sheets sheets--long') + foot;
}

/** The keys some product of the material publishes a value of, ranked or as published (grades[].headline). */
export const publishedKeys = (c: Loose, keys: Loose) => keys.filter((k: Loose) => c.grades.some((g: Loose) => !g.retired && !/-R\d+$/.test(g.id) && g.headline?.[k]));

/** One line at the end of a section, said once where the reader looks: "Not published for PEI-CF: strength across the layers." */
export const absentLine = (c: Loose, words: Loose) => (words.length ? `<p class="sec-note absent">${esc(`Not published for ${c.m.name}: ${words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`}.`)}</p>` : '');
