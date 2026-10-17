// What the Overview's sections share: the way back to the selector, a section's opening, the figures drawn by
// app/pages/figures.js (each guarded, so a figure not yet drawn leaves its place empty rather than breaking the page), a
// statement quoted in its maker's words, a table, and which known gaps a reader is shown. Every number is the facts
// layer's (findings.js `num` marks it), every word findings.js's, material-words.js's or labels.js's.

import { esc, tableBox } from '../html.js';
import { GAP_STATUS, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { sourceKind } from '../../js/ui/labels.js';
import * as FIGURES from '../figures.js';
import { isSay, plain, productHref, glue } from '../findings.js';
import { toHash, newScenario } from '../../js/engine/scenario.js';

export { tableBox };

/** The selector with this material's drawer open, as a link the engine's own scenario hash writes (null without a selector). */
export const selectorLink = (c, env) => (env.selectorHref ? `${env.selectorHref}#${toHash({ ...newScenario(c.db.meta), openMaterial: c.m.id })}` : null);

/** A section's opening: its sentences (Says or text), one paragraph, larger than the text. Empty where there are none. */
export function opening(lines, cls = 'sec-open') {
  const xs = lines.filter((x) => x && (isSay(x) ? x.text : String(x)));
  return xs.length ? `<p class="${esc(cls)}">${xs.map((x) => (isSay(x) ? x : plain(x)).html).join(' ')}</p>` : '';
}
/** Sentences as a paragraph of ordinary text. */
export const para = (lines, cls = '') => opening(lines, cls || 'sec-p');

/** A sub-heading inside a section. */
export const subhead = (title, id = null) => `<h3 class="sec-sub"${id ? ` id="${esc(id)}"` : ''}>${esc(title)}</h3>`;

/**
 * One of the figures (figures.js: peersFigure, mapsFigure, stripsFigure, layersFigure, temperaturesFigure), called with
 * `args`, or an empty result where it is not there or fails: `{ html, empty, stats }`.
 */
export function drawFigure(name, ...args) {
  const f = FIGURES[name];
  if (typeof f !== 'function') return { html: '', empty: true, stats: {} };
  try {
    const r = f(...args);
    return r && typeof r.html === 'string' ? r : { html: '', empty: true, stats: {} };
  } catch (e) {
    if (globalThis.process?.env?.PAGES_STRICT) throw e;
    console.warn(`${name}: ${e.message}`);
    return { html: '', empty: true, stats: {} };
  }
}
/** The figures' constants (figures.js STRIP_SETS and the like), or a fallback where they are not there. */
export const figureConfig = (name, fallback) => FIGURES[name] ?? fallback;

/** A product's name as a link to its card on the Products page. */
export const productA = (c, g) => (g ? `<a class="prod" href="${esc(productHref(c, g.id))}">${esc(productNameOrId(g))}</a>` : '');

/** A page or locator of a document, short: "p. 2". */
const pageOf = (locator) => /^p\. ?\d+/.exec(String(locator ?? ''))?.[0] ?? null;

/**
 * Whether a statement is a maker's own words, to be set in quotation marks: a maker's statement collected word for word
 * (db.knowHow), or an evidence record of one product's maker (Evidence type "Manufacturer statement" on a product). An
 * evidence record about the material in general, a study's or a reference's, is this project's reading of its source:
 * the data holds no mark of which words are verbatim, so it is set as plain text, "after" its source (OPEN-PROBLEMS).
 */
export const verbatim = (k) => (k.evidenceType == null ? true : stated(k.gradeId) && k.evidenceType === 'Manufacturer statement');

/**
 * A statement: in quotation marks where it is its maker's own words (`verbatim`), with whose it is (the product, linked
 * to its card) and the kind of document and its page; otherwise as plain text, "after" its source's publisher and title.
 * `rec` puts the record's ID on it (`data-rec`), for a record this page holds: a statement about the material in general.
 * A product's statement is its card's record and carries none.
 */
export function quote(c, k, { text = k.text ?? k.finding, rec = false, extra = '' } = {}) {
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
export const quotes = (items, cls = 'said-list') => { const xs = items.filter(Boolean); return xs.length ? `<ul class="${esc(cls)}">${xs.join('')}</ul>` : ''; };

// ------------------------------------------------------------------ known gaps: the reader's, never the maintainers'

/**
 * A reviewer's note is reader text unless it names records (a record ID, a migration, a ruling: "V000420", "m123",
 * "R166", "S-PET-TDS-AthenaX-GF10") or speaks the database's own words for itself ("headline", "representative grade").
 * Such a note is the maintainers' and leaves the pages (PLAN.md: the drawer and the tables keep it).
 */
const RECORD_NAME = /(?<!ASTM )\b(?:V\d{6}|G\d{3}-(?:\d{2,3}|R\d+)(?:-R\d+)?|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|P[BC]\d{5}|m\d{2,3}|R\d{3}|D\d{2,3}|[A-Z][A-Z0-9]{0,2}-[A-Za-z0-9]+-[A-Za-z0-9-]+)\b/;
const PROJECT_WORDS = /\b(headlines?|representative grade|workbook|migration|ruling|quarantin\w*|admitted|coverage record|aggregat\w*|observations?|family-level|screen(?:ed|ing)?|grade-specific|recorded in (?:Properties|Printing|Evidence|Coverage))\b/i;
const STORED_STATUS = /\b(Theoretical|Official Bambu product|Officially listed family)\b|"Conditional"/;
const MAINTAINER_WORDS = /\b(?:20\d\d-\d\d-\d\d|re-read|SHA-256|estimate band|no document cited|recorded (?:with|from|as))\b/i;
export const readerText = (text) => !RECORD_NAME.test(String(text ?? '')) && !PROJECT_WORDS.test(String(text ?? '')) && !STORED_STATUS.test(String(text ?? ''));

/**
 * Gaps a section says where the reader looks, never as a known gap: the rarely published properties (the same list on
 * every page; a tile or a table says "not published") and the price's (Density and price says where it was converted).
 */
const SAID_ELSEWHERE = new Set(['Sparse properties', 'Canadian price']);
/**
 * A coverage row a reader is shown under Sources' Known gaps: a gap of the material, in reader text, not a review step's
 * or a note on the records, and not one another section says. The one rule: Sources shows these, and the Products page's
 * placement (records/placement.js) excuses every other row.
 */
export const shownGap = (r) => GAP_STATUS.has(r.status) && r.domain !== 'Mandatory review' && !SAID_ELSEWHERE.has(r.domain)
  && readerText(r.finding) && !MAINTAINER_WORDS.test(String(r.finding ?? ''));

/** A coverage row's subject in a reader's words. */
const DOMAIN_WORDS = {
  'Canadian price': 'Price', 'Moisture / environmental': 'Moisture and chemicals', 'Print setup': 'Printing', 'Source conflict': 'Sources that disagree',
  'Post-processing / application': 'Post-processing', 'H2C status': 'Bambu Lab status', Comparability: 'Comparing values', 'Measurement parsing': 'Reading the values',
  'Sparse properties': 'Not published by any product',
};
/** A known gap as a list item: its subject, then the reviewer's finding in their words, the record's ID on it. */
export function gapItem(r) {
  const text = r.domain === 'Sparse properties' ? String(r.finding ?? '').replace(/^Not published by its own products:\s*/i, '') : String(r.finding ?? '');
  return `<li class="gap" data-rec="${esc(r.id)}"><b>${esc(DOMAIN_WORDS[r.domain] ?? r.domain ?? '')}:</b> ${esc(text)}</li>`;
}

// ------------------------------------------------------------------ thin data: what each sheet publishes

/** The most products a table sets across, a column each; more are set down, a row each. The settings table follows it. */
export const ACROSS_MAX = 5;
/** The page's products, in the one order every table of the page sets them in. */
export const pageProducts = (c) => c.grades.filter((g) => !g.retired && !/-R\d+$/.test(g.id));

/**
 * A product-by-product table's frame, the same on every one of a page: a `sheet-table` box naming how many value columns
 * it has (`data-cols`) and how it is set (`data-layout`: products across or down), a column group (the row heads'
 * column, `col-prop`, then `col-p` a value column), so every such table of a page lines its products up on one grid.
 */
export const sheetFrame = (inner, n, layout, cls) => `<div class="sheet-table" data-cols="${n}" data-layout="${layout}">${tableBox(
  `<table class="grid ${cls}"><colgroup><col class="col-prop">${'<col class="col-p">'.repeat(n)}</colgroup>${inner}</table>`)}</div>`;

/**
 * A column head that fits: a product's name, or where it is long, its maker and the words that tell it from the other
 * columns of the same maker ("3DXTECH 9085"), the full name in the link's title.
 */
export function shortHeads(gs) {
  const words = (g) => String(g.product ?? '').split(/\s+/).filter(Boolean);
  return new Map(gs.map((g) => {
    const full = productNameOrId(g);
    if (full.length <= 24 || !stated(g.manufacturer)) return [g.id, full];
    const same = gs.filter((x) => x.manufacturer === g.manufacturer && x !== g).map((x) => new Set(words(x)));
    const own = words(g).filter((w) => w.toLowerCase() !== String(g.manufacturer).toLowerCase());
    const telling = same.length ? own.filter((w) => same.every((set) => !set.has(w))) : own.slice(0, 2);
    return [g.id, `${g.manufacturer} ${(telling.length ? telling : own).slice(0, 2).join(' ')}`.trim()];
  }));
}

/** A product's name as a short column head, linked to its card, its full name as the link's title. */
export const headA = (c, g, short) => `<a class="prod" href="${esc(productHref(c, g.id))}" title="${esc(productNameOrId(g))}">${esc(short)}</a>`;

/** The line under a table with a value read from a shared sheet: what its grey says. */
export const SHARED_NOTE = 'In grey, a value a product reads from a data sheet it shares, where its own sheet is silent.';

/**
 * What each product publishes of `keys` (grades[].headline: each product's own value, as the strips would draw it), as a
 * table on the page's grid (sheetFrame): every product of the page across, in the page's order, where there are
 * ACROSS_MAX or fewer, properties down; else the products that publish one down, the properties across. A value read
 * from a data sheet the product shares (D89) is in grey, the sheet's product in its title; one not ranked (no stated
 * orientation or load) says so under it, and one measured after annealing too. `fmt(value, unit)` prints a value. Each
 * cell carries its measurement's ID (`data-mid`), not as a record.
 */
export function headlineTable(c, keys, { fmt, caption = 'As each sheet publishes it' } = {}) {
  const hs = keys.map((k) => REGISTRY.allHeadlines.find((h) => h.key === k)).filter(Boolean);
  const all = pageProducts(c);
  const live = hs.filter((h) => all.some((g) => g.headline?.[h.key]));
  if (!all.length || !live.length) return '';
  const note = (h, v) => [v.level === 'as-published' ? (h.direction ? 'orientation not stated' : 'load not stated') : null, v.anneal ? 'after annealing' : null].filter(Boolean).join(', ');
  const twinOf = (v) => (v?.from?.origin === 'twin' ? c.gradeById.get(v.from.gradeId) ?? null : null);
  const cell = (g, h, label) => {
    const v = g.headline?.[h.key];
    if (!v) return `<td class="num none" data-label="${esc(label)}">not published</td>`;
    const n = note(h, v), twin = twinOf(v);
    const cls = ['num', v.level === 'as-published' ? 'open' : '', twin ? 'from' : ''].filter(Boolean).join(' ');
    return `<td class="${cls}" data-label="${esc(label)}"${v.measurementId ? ` data-mid="${esc(v.measurementId)}"` : ''}${twin ? ` title="${esc(`From the data sheet shared with ${productNameOrId(twin)}`)}"` : ''}>`
      + `<span class="cv"><span class="cv-n">${esc(`${sign(v)}${fmt(v.value, h.unit)}`)}</span>${n ? `<small>${esc(n)}</small>` : ''}</span></td>`;
  };
  // A published bound keeps its sign here as on the plate and in the drawer ("> 200 °C"), from the value's record.
  const sign = (v) => { const op = c.msById?.get(v.measurementId)?.operator; return op && /^[<>≤≥]=?$/.test(op) ? `${op} ` : ''; };
  const shared = live.some((h) => all.some((g) => twinOf(g.headline?.[h.key])));
  const foot = shared ? `<p class="sec-note">${esc(SHARED_NOTE)}</p>` : '';
  if (all.length <= ACROSS_MAX) {
    const short = shortHeads(all);
    const inner = `<thead><tr><th scope="col" class="prop">${esc(caption)}</th>${all.map((g) => `<th scope="col" class="num col-p">${headA(c, g, short.get(g.id))}</th>`).join('')}</tr></thead><tbody>`
      + live.map((h) => `<tr><th scope="row" class="prop">${esc(h.labels.plain)}</th>${all.map((g) => cell(g, h, short.get(g.id))).join('')}</tr>`).join('') + '</tbody>';
    return sheetFrame(inner, all.length, 'across', 'sheets') + foot;
  }
  const rows = all.filter((g) => live.some((h) => g.headline?.[h.key]));
  const short = shortHeads(rows);
  const inner = `<thead><tr><th scope="col" class="prop">Product</th>${live.map((h) => `<th scope="col" class="num col-p">${esc(h.labels.plain)}</th>`).join('')}</tr></thead><tbody>`
    + rows.map((g) => `<tr><th scope="row" class="prop">${headA(c, g, short.get(g.id))}</th>${live.map((h) => cell(g, h, h.labels.plain)).join('')}</tr>`).join('') + '</tbody>';
  return sheetFrame(inner, live.length, 'down', 'sheets sheets--long') + foot;
}

/** The keys some product of the material publishes a value of, ranked or as published (grades[].headline). */
export const publishedKeys = (c, keys) => keys.filter((k) => c.grades.some((g) => !g.retired && !/-R\d+$/.test(g.id) && g.headline?.[k]));

/** One line at the end of a section, said once where the reader looks: "Not published for PEI-CF: strength across the layers." */
export const absentLine = (c, words) => (words.length ? `<p class="sec-note absent">${esc(`Not published for ${c.m.name}: ${words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`}.`)}</p>` : '');
