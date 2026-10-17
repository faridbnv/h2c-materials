// What the Overview's sections share: the way back to the selector, a section's opening, the figures drawn by
// app/pages/figures.js (each guarded, so a figure not yet drawn leaves its place empty rather than breaking the page), a
// statement quoted in its maker's words, a table, and which known gaps a reader is shown. Every number is the facts
// layer's (findings.js `num` marks it), every word findings.js's, material-words.js's or labels.js's.

import { esc, tableBox } from '../html.js';
import { GAP_STATUS, productNameOrId, stated } from '../../js/ui/material-facts.js';
import { sourceKind } from '../../js/ui/labels.js';
import * as FIGURES from '../figures.js';
import { isSay, plain, productHref } from '../findings.js';
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
 * A statement in its maker's own words: the quote, then whose it is (the product, linked to its card, or the
 * document's publisher and title for one about the material in general), the kind of document and its page. `rec` puts
 * the record's ID on it (`data-rec`), for a record this page holds: a statement about the material in general. A
 * product's statement is its card's record and carries none.
 */
export function quote(c, k, { text = k.text ?? k.finding, rec = false, extra = '' } = {}) {
  const s = c.sourceById.get(k.sourceId);
  const g = stated(k.gradeId) ? c.gradeById.get(k.gradeId) : null;
  const where = [sourceKind(s).toLowerCase(), pageOf(k.locator)].filter(Boolean).join(', ');
  const who = g ? `${productA(c, g)}, ${esc(where)}` : `${esc([s?.publisher, s?.title].filter(stated).join(', ') || 'a reference')}`;
  return `<li class="said"${rec ? ` data-rec="${esc(k.id)}"` : ''}><q>${esc(String(text ?? '').trim())}</q>${extra ? ` <span class="said-what">${esc(extra)}</span>` : ''} <span class="said-who">${who}</span></li>`;
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
