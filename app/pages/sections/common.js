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
  const what = extra ? ` <span class="said-what">${esc(extra)}</span>` : '';
  if (!verbatim(k)) return `<li class="said said--after"${rec ? ` data-rec="${esc(k.id)}"` : ''}><span class="said-text">${words}</span>${what} <span class="said-who">${esc(`after ${source}`)}</span></li>`;
  const who = g ? `${productA(c, g)}, ${esc(where)}` : esc(source);
  return `<li class="said"${rec ? ` data-rec="${esc(k.id)}"` : ''}><q>${words}</q>${what} <span class="said-who">${who}</span></li>`;
}

/** A list of quotes. */
export const quotes = (items, cls = 'said-list') => (items.length ? `<ul class="${esc(cls)}">${items.join('')}</ul>` : '');

// ------------------------------------------------------------------ known gaps: the reader's, never the maintainers'

/**
 * A reviewer's note is reader text unless it names records (a record ID, a migration, a ruling: "V000420", "m123",
 * "R166", "S-PET-TDS-AthenaX-GF10") or speaks the database's own words for itself ("headline", "representative grade").
 * Such a note is the maintainers' and leaves the pages (PLAN.md: the drawer and the tables keep it).
 */
const RECORD_NAME = /(?<!ASTM )\b(?:V\d{6}|G\d{3}-(?:\d{2}|R\d+)(?:-R\d+)?|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|P[BC]\d{5}|m\d{2,3}|R\d{3}|D\d{2,3}|[A-Z][A-Z0-9]{0,2}-[A-Za-z0-9]+-[A-Za-z0-9-]+)\b/;
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

/**
 * The columns of a thin section's table (fewer than four products compared): one per product whose own documents give a
 * value `test` admits (a measurement with a number, not held back or flagged implausible), the products that read its
 * sheet (a data sheet shared with it, D89) named beside it. `[{ g, readers: [g], xs: [measurement] }]`, most values first.
 */
export function sheetColumns(c, test) {
  const products = c.grades.filter((g) => !g.retired && !/-R\d+$/.test(g.id));
  const cols = products.map((g) => ({ g, readers: [], xs: c.ms.filter((x) => x.gradeId === g.id && x.numeric && !x.quarantined && !x.implausible && test(x)) }));
  const byId = new Map(cols.map((col) => [col.g.id, col]));
  for (const col of cols.filter((x) => !x.xs.length)) {
    const from = Object.values(col.g.headline ?? {}).find((v) => v?.from?.origin === 'twin')?.from?.gradeId;
    if (from && byId.get(from)?.xs.length) byId.get(from).readers.push(col.g);
  }
  return cols.filter((col) => col.xs.length).sort((a, b) => b.xs.length - a.xs.length || a.g.id.localeCompare(b.g.id));
}

/** A cell's values as markup: each distinct value a line, with the kind of document beside it where two documents differ. */
function cellHtml(c, xs, fmt) {
  const distinct = [...new Map(xs.map((x) => [`${x.value}|${x.unit}`, x])).values()];
  const kind = (x) => sourceKind(c.sourceById.get(x.sourceId)).toLowerCase();
  const kinds = new Set(distinct.map(kind));
  const many = distinct.length > 1 && kinds.size > 1;
  return distinct.map((x) => `<span class="cv"><span class="cv-n">${esc(fmt(x.value, x.unit))}</span>${many ? ` <small>${esc(kind(x))}</small>` : ''}</span>`).join('');
}

/** What a column's sheets state about their bars, once: the standards and whether the orientation and specimen are given. */
function conditionsText(xs) {
  const standards = [...new Set(xs.flatMap((x) => x.standards ?? []))].slice(0, 3);
  const unstated = (v) => !v || /unknown|not[- ]stated|not published/i.test(String(v));
  const dirs = xs.filter((x) => x.direction !== 'not-applicable');
  const noDir = dirs.length && dirs.every((x) => unstated(x.direction));
  const noSpec = xs.every((x) => /^Not published/i.test(String(x.specimenType ?? '')));
  const lacks = noDir && noSpec ? 'specimen and orientation not stated' : noDir ? 'orientation not stated' : noSpec ? 'specimen not stated' : '';
  return [standards.join(', '), lacks].filter(Boolean).join('; ') || '—';
}

/**
 * A thin section's table: `rows` [{ label, pick(xs) → measurements }] against the columns (sheetColumns), properties down
 * and sheets across where there are four sheets or fewer, else products down. `fmt(value, unit)` prints a value. Each
 * cell carries its measurements' IDs (`data-mid`), not as records: a product's measurements are its card's.
 */
export function sheetTable(c, cols, rows, { fmt, caption = '', conditions = true } = {}) {
  const live = rows.filter((r) => cols.some((col) => r.pick(col.xs).length));
  if (!cols.length || !live.length) return '';
  const head = (col) => `${productA(c, col.g)}${col.readers.length ? ` <span class="also">and ${col.readers.map((g) => productA(c, g)).join(', ')}</span>` : ''}`;
  const cell = (col, r) => { const xs = r.pick(col.xs); return xs.length ? `<td class="num" data-mid="${esc(xs.map((x) => x.id).join(' '))}">${cellHtml(c, xs, fmt)}</td>` : '<td class="num none">not published</td>'; };
  let table;
  if (cols.length <= 4) {
    table = `<table class="grid sheets"><thead><tr><th scope="col" class="prop">${esc(caption || 'As each sheet publishes it')}</th>${cols.map((col) => `<th scope="col" class="num">${head(col)}</th>`).join('')}</tr></thead><tbody>`
      + live.map((r) => `<tr><th scope="row" class="prop">${esc(r.label)}</th>${cols.map((col) => cell(col, r)).join('')}</tr>`).join('')
      + (conditions ? `<tr class="cond"><th scope="row" class="prop">As stated</th>${cols.map((col) => `<td class="num">${esc(conditionsText(col.xs))}</td>`).join('')}</tr>` : '')
      + '</tbody></table>';
  } else {
    table = `<table class="grid sheets sheets--long"><thead><tr><th scope="col" class="prop">Product</th>${live.map((r) => `<th scope="col" class="num">${esc(r.label)}</th>`).join('')}</tr></thead><tbody>`
      + cols.map((col) => `<tr><th scope="row" class="prop">${head(col)}</th>${live.map((r) => cell(col, r)).join('')}</tr>`).join('') + '</tbody></table>';
  }
  return `<div class="sheet-table">${tableBox(table)}</div>`;
}

// ------------------------------------------------------------------ fewer products than a strip needs

/** How few products compared leave a property out of a strip (figures.js STRIP_MIN, where it has landed). */
export const stripMin = () => FIGURES.STRIP_MIN ?? 4;

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

/**
 * What each product publishes of `keys` (grades[].headline: each product's own value, as the strips would draw it), as a
 * table: properties down and products across where there are four columns or fewer, else products down. A product
 * that reads another's sheet for every one of these values (a data sheet shared with it, D89) is named under that
 * product's column. A value not ranked (no stated orientation or load) says so under it; one measured after annealing
 * too. `fmt(value, unit)` prints a value. Each cell carries its measurement's ID (`data-mid`), not as a record.
 */
export function headlineTable(c, keys, { fmt, caption = 'As each sheet publishes it' } = {}) {
  const hs = keys.map((k) => REGISTRY.allHeadlines.find((h) => h.key === k)).filter(Boolean);
  const products = c.grades.filter((g) => !g.retired && !/-R\d+$/.test(g.id) && hs.some((h) => g.headline?.[h.key]));
  if (!products.length || !hs.length) return '';
  // Readers: every value of these keys read from one sibling's sheet.
  const readerOf = new Map();
  for (const g of products) {
    const vs = hs.map((h) => g.headline?.[h.key]).filter(Boolean);
    const from = vs.length && vs.every((v) => v.from?.origin === 'twin') ? vs[0].from.gradeId : null;
    if (from && vs.every((v) => v.from.gradeId === from) && products.some((x) => x.id === from)) readerOf.set(g.id, from);
  }
  const cols = products.filter((g) => !readerOf.has(g.id)).map((g) => ({ g, readers: products.filter((x) => readerOf.get(x.id) === g.id) }));
  const short = shortHeads(cols.map((col) => col.g));
  const live = hs.filter((h) => cols.some((col) => col.g.headline?.[h.key]));
  const note = (h, v) => [v.level === 'as-published' ? (h.direction ? 'orientation not stated' : 'load not stated') : null, v.anneal ? 'after annealing' : null].filter(Boolean).join(', ');
  const cell = (col, h, label) => {
    const v = col.g.headline?.[h.key];
    if (!v) return `<td class="num none" data-label="${esc(label)}">not published</td>`;
    const n = note(h, v);
    return `<td class="num${v.level === 'as-published' ? ' open' : ''}" data-label="${esc(label)}"${v.measurementId ? ` data-mid="${esc(v.measurementId)}"` : ''}><span class="cv"><span class="cv-n">${esc(fmt(v.value, h.unit))}</span>${n ? `<small>${esc(n)}</small>` : ''}</span></td>`;
  };
  const head = (col) => `${headA(c, col.g, short.get(col.g.id))}${col.readers.length ? ` <span class="also">and ${col.readers.map((g) => headA(c, g, productNameOrId(g))).join(', ')}</span>` : ''}`;
  let table;
  if (cols.length <= 4) {
    table = `<table class="grid sheets"><thead><tr><th scope="col" class="prop">${esc(caption)}</th>${cols.map((col) => `<th scope="col" class="num">${head(col)}</th>`).join('')}</tr></thead><tbody>`
      + live.map((h) => `<tr><th scope="row" class="prop">${esc(h.labels.plain)}</th>${cols.map((col) => cell(col, h, short.get(col.g.id))).join('')}</tr>`).join('')
      + '</tbody></table>';
  } else {
    table = `<table class="grid sheets sheets--long"><thead><tr><th scope="col" class="prop">Product</th>${live.map((h) => `<th scope="col" class="num">${esc(h.labels.plain)}</th>`).join('')}</tr></thead><tbody>`
      + cols.map((col) => `<tr><th scope="row" class="prop">${head(col)}</th>${live.map((h) => cell(col, h, h.labels.plain)).join('')}</tr>`).join('') + '</tbody></table>';
  }
  return `<div class="sheet-table">${tableBox(table)}</div>`;
}

/** The keys some product of the material publishes a value of, ranked or as published (grades[].headline). */
export const publishedKeys = (c, keys) => keys.filter((k) => c.grades.some((g) => !g.retired && !/-R\d+$/.test(g.id) && g.headline?.[k]));

/** One line at the end of a section, said once where the reader looks: "Not published for PEI-CF: strength across the layers." */
export const absentLine = (c, words) => (words.length ? `<p class="sec-note absent">${esc(`Not published for ${c.m.name}: ${words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`}.`)}</p>` : '');
