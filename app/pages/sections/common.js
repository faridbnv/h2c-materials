// What several sections share: the findings block a section opens with, the empty state, the link to the records page,
// the known gaps, a comparison drawn product by product (impact), its bookkeeping (what is counted, drawn, left out and
// why, for "How this is counted"), the scatter of two key properties within the material, and the table of the
// properties no figure draws. Every number is the build's or a count of records; every word is the shared words'
// (material-words.js, labels.js), findings.js's, or says what a figure draws.

import { esc, recordsHref, tableBox, count } from '../html.js';
import { fmtNumber, fmtBounded } from '../../js/ui/format.js';
import { propertyName, whyWords, coverageStatusWords } from '../../js/ui/labels.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { emptyReasons, measuredIn, dotMarks, spreadEntries, productNameOrId, GAP_STATUS } from '../../js/ui/material-facts.js';
import {
  plural, lower, andList, asPublishedWords, filledWords, apartWords, medianRule, noMedianWhy, toughenedSplit,
  TOUGHENED_NOTE_SHORT, silentRowsWords, pairWords, joinedSpan,
} from '../../js/ui/material-words.js';
import { inText } from '../findings.js';
import { stripScale } from '../charts/scale.js';
import { dotTrack, dotRow, dotGraph } from '../charts/dotplot.js';
import { axisRow } from '../charts/axis.js';
import { keyMark, keyBand, keyMedian, keyList } from '../charts/marks.js';
import { scatterPlot } from '../charts/scatter.js';
import { figure, aboutLine, figId } from '../charts/figure.js';
import { toHash, newScenario } from '../../js/engine/scenario.js';

/** The selector with this material's drawer open, as a link the engine's own scenario hash writes (null without a selector). */
export const selectorLink = (c, env) => (env.selectorHref ? `${env.selectorHref}#${toHash({ ...newScenario(c.db.meta), openMaterial: c.m.id })}` : null);

/** A link to the material's records page, at an anchor. */
export const recordsLink = (c, anchor, words) => `<a class="rec-link" href="${esc(recordsHref(c.m.id, anchor))}">${esc(words)}</a>`;

/** The findings a section opens with (findings.js), each sentence its own line, larger than the text. */
export const findingsBlock = (lines) => (lines.filter(Boolean).length ? `<div class="findings">${lines.filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}</div>` : '');

/** Paragraphs of plain text for "How this is counted". */
export const notesHtml = (lines) => lines.filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('');

/**
 * A reviewer's note is reader text unless it names records (a record ID, a migration, a ruling: "V000420", "m123",
 * "R166", "G052-R1", "S-PET-TDS-AthenaX-GF10") or speaks the database's own words for itself ("headline",
 * "representative grade", "workbook"). Such a note is not for the engineer (D124, INTERFACE "Words"): the page names
 * its domain and status and leaves its words to the records page, which shows them as recorded. A standard's number
 * (ASTM D648) is not a record.
 */
const RECORD_NAME = /(?<!ASTM )\b(?:V\d{6}|G\d{3}-(?:\d{2}|R\d+)(?:-R\d+)?|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|P[BC]\d{5}|m\d{2,3}|R\d{3}|D\d{2,3}|[A-Z][A-Z0-9]{0,2}-[A-Za-z0-9]+-[A-Za-z0-9-]+)\b/;
const PROJECT_WORDS = /\b(headlines?|representative grade|workbook|migration|ruling|quarantin\w*|admitted|coverage record)\b/i;
/** The stored Bambu Lab statuses INTERFACE's table renames ("Theoretical"), where a note quotes them. */
const STORED_STATUS = /\b(Theoretical|Official Bambu product|Officially listed family)\b|"Conditional"/;
export const namesRecords = (text) => RECORD_NAME.test(String(text ?? ''));
export const readerText = (text) => !namesRecords(text) && !PROJECT_WORDS.test(String(text ?? '')) && !STORED_STATUS.test(String(text ?? ''));

/**
 * The coverage rows a reader is shown on the main page: a gap, a conflict, a held-back value or another of the known-gap
 * statuses (material-facts.js GAP_STATUS) whose note is reader text. The others stay on the records page, counted.
 */
export const shownGap = (r) => GAP_STATUS.has(r.status) && readerText(r.finding);

/** A coverage row's heading: its domain and status, in the page's words. */
const gapHead = (r) => `${r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain ?? ''}, ${coverageStatusWords(r.status)}`;

/** A known gap as a paragraph: its domain and status, then the reviewer's words. */
export const gapPara = (r) => `<p class="gap"><b>${esc(gapHead(r))}.</b> ${esc(r.finding ?? '')}</p>`;

/** The review notes not shown on the main page, counted in one line with the way to them; empty where there are none. */
export const furtherNotes = (c, n) => (n ? `${count(n, 'further review note')} ${n === 1 ? 'is' : 'are'} on ${recordsLink(c, '#review-notes', 'the records page')}.` : '');

/** Coverage rows as the main page shows them: the gaps a reader is shown, then one line counting the rest. */
export function gapList(c, rows, extra = 0) {
  const shown = rows.filter(shownGap);
  const rest = rows.length - shown.length + extra;
  return `${shown.map(gapPara).join('')}${rest ? `<p class="note">${furtherNotes(c, rest)}</p>` : ''}`;
}

/**
 * An empty section's body: one line saying what is not on file, the recorded reason in the reviewer's words where a
 * coverage row gives one that a reader is shown (material-facts.js emptyReasons), the rest counted, and the way to the
 * records page.
 */
export function emptyBody(c, line, { tab = null, anchor = '', link = 'See the records page' } = {}) {
  const rows = tab ? emptyReasons(c, tab) : [];
  const shown = rows.filter(shownGap);
  const rest = rows.length - shown.length;
  return `<p class="empty">${esc(line)}${shown.map((r) => ` <span class="empty-why">${esc(`${gapHead(r)}: ${r.finding ?? ''}`)}</span>`).join('')}`
    + ` ${rest ? `<span class="empty-why">${furtherNotes(c, rest)}</span>` : `${recordsLink(c, anchor, link)}.`}</p>`;
}

/** Numbers the figures of a section: "4.1", "4.2". */
export const figureCounter = (n) => { let k = 0; return () => `${n}.${++k}`; };

/** A product's value as a dot's data: its product, its record, its value as published. */
const dotData = (e, extra = {}) => ({ 'data-grade': e.g.id, 'data-mid': e.v.measurementId ?? null, 'data-v': fmtBounded(e.v.value, null, e.v.interval), 'data-from': e.v.from?.label ?? null, ...extra });

/** Marks of two values of one product drawn as one point: each kind once, in the vocabulary's order. */
const unionMarks = (...lists) => ['open', 'annealed', 'variant', 'claimed'].filter((k) => lists.some((l) => l.includes(k)));

/** A middle half as text: "39.3–49.5", or one number where both quartiles are one. */
export const middleHalf = (s) => (s?.q1 == null ? '' : s.q1 === s.q3 ? fmtNumber(s.q1) : `${fmtNumber(s.q1)}–${fmtNumber(s.q3)}`);

/**
 * A comparison's rows as a table (the drawer's spreadSummary): products compared, median, middle half and range, and the
 * values drawn but left out of the median. For "How this is counted".
 */
export function medianTable(hs, m) {
  const units = new Set(hs.map((h) => h.unit));
  const row = (h) => {
    const s = m.summary?.[h.key];
    const apart = apartWords(h, s);
    return `<tr><th scope="row">${esc(h.labels.plain)}${units.size > 1 ? ` <span class="u">${esc(h.unit)}</span>` : ''}</th>`
      + `<td class="num">${s?.n ?? 0}</td><td class="num">${s?.n ? esc(fmtNumber(s.median)) : '—'}</td>`
      + `<td class="num">${s?.q1 != null ? esc(middleHalf(s)) : '—'}</td><td class="num">${s?.n ? esc(joinedSpan(s)) : '—'}</td></tr>`
      + (apart.length ? `<tr class="apart"><td colspan="5">Also drawn, not in the median: ${esc(andList(apart))}.</td></tr>` : '');
  };
  return tableBox(`<table class="grid sum"><thead><tr><th scope="col">Test${units.size > 1 ? '' : `, <span class="u">${esc(hs[0].unit)}</span>`}</th>`
    + '<th scope="col" class="num" title="Products compared">n</th><th scope="col" class="num">Median</th><th scope="col" class="num">Middle half</th>'
    + `<th scope="col" class="num">Range</th></tr></thead><tbody>${hs.map(row).join('')}</tbody></table>`);
}

/** The key of a comparison's graphs: only the marks drawn (comparisonsOf().key). */
function comparisonKey(k) {
  return keyList([
    k.filled.length ? [keyMark([]), esc(filledWords(k.filled))] : null,
    k.open.length ? [keyMark(['open']), esc([...new Set(k.open.map(asPublishedWords))].join(' or '))] : null,
    k.annealed ? [keyMark(['annealed']), 'measured after annealing'] : null,
    k.variant ? [keyMark(['variant']), 'special formulation'] : null,
    k.claimed ? [keyMark(['claimed']), esc('sold as toughened (the maker\'s statement)')] : null,
    k.band ? [keyBand, 'middle half'] : null,
    k.median ? [keyMedian, 'median'] : null,
  ].filter(Boolean));
}

/** One product's value in a sentence: "iSANMATE ASA Glass Fiber's notched Izod impact of 9 kJ/m², with no stated orientation". */
export const oneValue = ({ h, e }) => `${productNameOrId(e.g)}'s ${lower(h.labels.plain)} of ${fmtBounded(e.v.value, h.unit, e.v.interval)}${e.v.level === 'as-published' ? `, with ${asPublishedWords(h)}` : ''}`;

/** The records a comparison reads (its properties shown in the tab), and their count by why each is or is not drawn, as a sentence. */
export function countedLine(f, c, tab) {
  const mi = measuredIn(c, tab);
  const props = mi.shown.filter((p) => f.properties.has(p));
  const records = mi.rows.filter((x) => props.includes(x.property));
  const t = f.tally(records);
  const parts = t.counts.map(([why, k]) => whyWords(why, k));
  return {
    records,
    line: `Of the ${records.length} results on file for these tests, ${t.drawnN} ${t.drawnN === 1 ? 'is' : 'are'} the products' own values${t.namedN ? ` and ${t.namedN} ${t.namedN === 1 ? 'is' : 'are'} named alone` : ''}.${parts.length ? ` The other ${t.rest}: ${andList(parts)}.` : ''}`,
    tally: t,
  };
}

/** A comparison's method rules (method.csv), as "How this is counted" says them. */
export const comparisonAbout = (f) => aboutLine(f.cmp.about, `${f.caption ? `<p>${esc(f.caption)}</p>` : ''}${f.hs.filter((h) => h.comparisonNote).map((h) => `<p><b>${esc(h.labels.plain)}.</b> ${esc(h.comparisonNote)}</p>`).join('')}`)
  + (f.noteRule ? aboutLine(f.cmp.note, `<p>${esc(f.noteRule)}</p>`) : '');

/**
 * Why a comparison draws nothing, in one sentence: no product has a value, or no scale has two (the drawer's words,
 * which count the results so they never seem to contradict them).
 */
export function noGraphWords(f, c, tab) {
  const { records, tally: t } = countedLine(f, c, tab);
  const n = records.length;
  const parts = t.counts.map(([why, k]) => whyWords(why, k));
  if (!f.singles.length) return `No product has a value to compare. ${n === 1 ? 'The result on file' : `The ${n} results on file`}: ${andList(parts)}.`;
  if (f.singles.length > 1) return `No test has two products' values to compare. One product each: ${f.singles.map(oneValue).join('; ')}.${parts.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} on file: ${andList(parts)}.` : ''}`;
  const words = t.counts.map(([why, k]) => (why === 'second' ? `${k} more of that product` : whyWords(why, k)));
  return `Only one product has a value to compare, ${oneValue(f.singles[0])}.${words.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} on file: ${andList(words)}.` : ' It is the only result on file.'}`;
}

/**
 * A comparison drawn product by product (the drawer's dot rows, at full width): a figure where a scale has two products'
 * values, with its key, and its bookkeeping under "How this is counted". `title` states what it shows. Null where it
 * draws nothing (the caller says why, noGraphWords).
 */
export function comparisonFigure(f, c, tab, no, { title, anchor, read }) {
  if (!f.drawnGraphs.length) return null;
  const m = c.m;
  let dots = 0;
  const graphs = f.drawnGraphs.map((gr) => {
    const scale = stripScale(gr.dots.map((d) => d.e.v.value), gr.unit);
    const rows = gr.rows.map((h) => {
      const entries = f.byKey.get(h.key).map((e) => ({ v: e.v, marks: dotMarks(h, e, c), data: dotData(e) }));
      dots += entries.length;
      return dotRow({
        data: { 'data-headline': h.key, 'data-unit': h.unit, 'data-open': asPublishedWords(h) },
        label: h.labels.plain, sub: plural(entries.length, 'product'),
        track: dotTrack({ entries, scale, summary: m.summary?.[h.key] }),
      });
    });
    return dotGraph(rows, axisRow(scale, gr.unit), { 'data-unit': gr.unit });
  });
  const claimed = f.shown.map((h) => [h, m.summary?.[h.key]]).filter(([, s]) => s?.claimed);
  const toughened = [...claimed.filter(([, s]) => !s.claimed.setApart).map(([h, s]) => `${h.labels.plain}: ${toughenedSplit(s, h.unit)}`),
    ...claimed.filter(([, s]) => s.claimed.setApart).map(([h, s]) => `${h.labels.plain}: ${toughenedSplit(s, h.unit)}`), claimed.length ? TOUGHENED_NOTE_SHORT : null];
  const allNone = f.shown.every((h) => !m.summary?.[h.key]?.n);
  const singles = f.singles.map((d) => `${d.h.labels.plain}: only one product has a value, ${oneValue(d)}.`);
  const silent = silentRowsWords(f.silentListed, f.silentUnlisted, 'on the records page');
  const pairs = pairWords(f.cmp.pairLabel, f.pairs, f.pairs.map((p) => p.both.map(productNameOrId)), f.drawnGraphs.length === 1);
  const { line } = countedLine(f, c, tab);
  return {
    dots,
    html: figure({
      id: figId(no), n: no, title, data: { 'data-comparison': f.topic },
      key: comparisonKey(f.key),
      plot: graphs.join(''),
      label: `Dot plot, one dot per product: ${f.shown.map((h) => `${h.labels.plain}, ${plural(f.byKey.get(h.key).length, 'product')}`).join('; ')}.`,
      read,
      counted: notesHtml([allNone ? `No median: ${noMedianWhy(f.shown, m)}.` : `${medianRule(f.shown, m)} The median, middle half and range are of these alone.`, ...toughened, ...singles, silent, pairs, line])
        + (allNone ? '' : medianTable(f.shown, m)) + comparisonAbout(f) + `<p>${recordsLink(c, anchor, 'Every result, with its document, on the records page')}.</p>`,
    }),
  };
}

/**
 * A scatter of two key properties, product by product (figures.js FIGURE_PAIRS): each product with both values, its own
 * as the build chose them. Null where fewer than two products have both.
 */
export function pairScatter(c, pair, no, { title } = {}) {
  const hx = REGISTRY.allHeadlines.find((h) => h.key === pair.x), hy = REGISTRY.allHeadlines.find((h) => h.key === pair.y);
  if (!hx || !hy) return null;
  const ex = spreadEntries(c.m, c, hx.key), ey = new Map(spreadEntries(c.m, c, hy.key).map((e) => [e.g.id, e]));
  // A price has no orientation or load to state: a price axis adds no mark of its own.
  const marksOf = (h, e) => (h.kind === 'price' ? [] : dotMarks(h, e, c));
  const points = ex.filter((e) => ey.has(e.g.id)).map((e) => {
    const f = ey.get(e.g.id);
    return { g: e.g, x: e.v.value, y: f.v.value, marks: unionMarks(marksOf(hx, e), marksOf(hy, f), e.variant ? ['variant'] : []),
      data: { 'data-grade': e.g.id, 'data-v': `${fmtBounded(e.v.value, hx.unit, e.v.interval)}, ${fmtBounded(f.v.value, hy.unit, f.v.interval)}` } };
  });
  if (points.length < 2) return null;
  const only = new Set([...ex.map((e) => e.g.id), ...ey.keys()]).size - points.length;
  const xs = stripScale(points.map((p) => p.x), hx.unit), ys = stripScale(points.map((p) => p.y), hy.unit);
  const marks = new Set(points.flatMap((p) => p.marks));
  const measured = [hx, hy].filter((h) => h.kind !== 'price');
  const key = keyList([
    points.some((p) => !p.marks.length) ? [keyMark([]), esc(filledWords(measured))] : null,
    marks.has('open') ? [keyMark(['open']), esc(measured.length > 1 ? `one of its values has ${asPublishedWords(measured[0])}` : asPublishedWords(measured[0]))] : null,
    marks.has('annealed') ? [keyMark(['annealed']), 'measured after annealing'] : null,
    marks.has('variant') ? [keyMark(['variant']), 'special formulation'] : null,
  ].filter(Boolean));
  const span = (vs) => joinedSpan({ min: Math.min(...vs), max: Math.max(...vs) });
  const table = tableBox(`<table class="grid sum"><thead><tr><th scope="col">Axis</th><th scope="col" class="num">Products drawn</th><th scope="col" class="num">Lowest–highest</th></tr></thead><tbody>`
    + `<tr><th scope="row">${esc(hx.labels.plain)} <span class="u">${esc(hx.unit)}</span></th><td class="num">${points.length}</td><td class="num">${esc(span(points.map((p) => p.x)))}</td></tr>`
    + `<tr><th scope="row">${esc(hy.labels.plain)} <span class="u">${esc(hy.unit)}</span></th><td class="num">${points.length}</td><td class="num">${esc(span(points.map((p) => p.y)))}</td></tr></tbody></table>`);
  return {
    dots: points.length,
    html: figure({
      id: figId(no), n: no, title: title ?? `${hy.labels.plain} against ${lower(hx.labels.plain)}`, data: { 'data-scatter': `${hx.key}-${hy.key}` },
      key,
      plot: scatterPlot({ points, xs, ys, height: 280, xTitle: `${hx.labels.plain}, ${hx.unit}`, yTitle: `${hy.labels.plain}, ${hy.unit}` }),
      label: `Scatter plot of ${lower(hy.labels.plain)} against ${lower(hx.labels.plain)}, one mark per product: ${plural(points.length, 'product')}.`,
      read: esc(`A mark is one product with both values, its own as published.`),
      counted: notesHtml([`${plural(points.length, 'product')} drawn.${only ? ` ${only} more ${only === 1 ? 'publishes' : 'publish'} only one of the two.` : ''}`]) + table,
    }),
  };
}

/**
 * The properties of a domain no figure draws, each with how many values and products and the lowest and highest value
 * as published (per unit: these are not compared, and their conditions differ), and the way to the records page. Then
 * the properties named without a value, those no record names, and the domain's known gaps. `rows` of the table are
 * returned too, for the section's findings.
 */
export function otherProperties(c, tab, covered, anchor, { title = 'Other properties on file' } = {}) {
  const mi = measuredIn(c, tab);
  const props = mi.shown.filter((p) => !covered.has(p));
  const list = props.map((p) => {
    const xs = mi.rows.filter((x) => x.property === p);
    const numeric = xs.filter((x) => x.numeric && !x.quarantined && !x.implausible);
    const units = [...new Set(numeric.map((x) => x.unit))];
    const spans = units.map((u) => { const vs = numeric.filter((x) => x.unit === u).map((x) => x.value); return `${joinedSpan({ min: Math.min(...vs), max: Math.max(...vs) })}${u && u !== 'Dimensionless' ? ` ${u}` : ''}`; });
    return { property: p, label: propertyName(p), values: xs.length, products: new Set(xs.map((x) => x.gradeId)).size, spans };
  });
  const table = list.length
    ? `<h3 class="sub-title">${esc(title)}</h3>${tableBox(`<table class="grid props"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Products</th><th scope="col" class="num">Lowest–highest, as published</th></tr></thead><tbody>${list.map((o) => `<tr><th scope="row">${esc(o.label)}</th><td class="num">${o.products}</td><td class="num spans">${o.spans.length ? o.spans.map(esc).join('<br>') : '—'}</td></tr>`).join('')}</tbody></table>`)}`
      + `<p class="note">Each value is as its sheet publishes it, under its own test conditions, so these are not compared. ${recordsLink(c, anchor, 'Every value, with its conditions and document')}.</p>`
    : '';
  const named = mi.named.length ? `<p class="note">Named on a data sheet without a value: ${esc(andList([...new Map(mi.named.map((x) => [`${x.property}|${x.gradeId}`, `${inText(propertyName(x.property))} (${productNameOrId(c.gradeById.get(x.gradeId) ?? { id: 'a product' })})`])).values()]))}.</p>` : '';
  const absent = mi.absent.length ? `<p class="note absent"><b>Not published for this material:</b> ${esc(mi.absent.map(propertyName).join(', '))}. A gap, not a zero or a low value.</p>` : '';
  const gaps = mi.gaps.length ? `<h3 class="sub-title">Known gaps</h3>${gapList(c, mi.gaps)}` : '';
  return { html: `${table}${named}${absent}${gaps}`, properties: props.length, list };
}
