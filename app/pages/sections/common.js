// What several sections share: the empty state, the link to the records page, the comparison figures (Mechanical and
// Thermal draw the drawer's comparison headings, D133, D139, D140, at full width), the scatters (figures.js), and the
// table of the properties no figure draws. Every number is the build's or a count of records; every word is the shared
// words' (material-words.js, labels.js) or says what is drawn.

import { esc, recordsHref, tableBox } from '../html.js';
import { fmtNumber, fmtBounded } from '../../js/ui/format.js';
import { propertyName, whyWords, coverageStatusWords } from '../../js/ui/labels.js';
import { REGISTRY } from '../../js/ui/registry.js';
import {
  emptyReasons, measuredIn, comparisonsOf, dotMarks, spreadEntries, productNameOrId,
} from '../../js/ui/material-facts.js';
import {
  plural, lower, andList, asPublishedWords, filledWords, apartWords, medianRule, noMedianWhy, toughenedSplit,
  TOUGHENED_NOTE_SHORT, silentRowsWords, pairWords, shareWords, joinedSpan, inSentence,
} from '../../js/ui/material-words.js';
import { stripScale } from '../charts/scale.js';
import { dotTrack, dotRow, dotGraph } from '../charts/dotplot.js';
import { axisRow } from '../charts/axis.js';
import { keyMark, keyBand, keyMedian, keyDiagonal, keyList } from '../charts/marks.js';
import { scatterPlot } from '../charts/scatter.js';
import { figure, aboutLine } from '../charts/figure.js';
import { toHash, newScenario } from '../../js/engine/scenario.js';

/** The selector with this material's drawer open, as a link the engine's own scenario hash writes (null without a selector). */
export const selectorLink = (c, env) => (env.selectorHref ? `${env.selectorHref}#${toHash({ ...newScenario(c.db.meta), openMaterial: c.m.id })}` : null);

/** A link to the material's records page, at an anchor. */
export const recordsLink = (c, anchor, words) => `<a class="rec-link" href="${esc(recordsHref(c.m.id, anchor))}">${esc(words)}</a>`;

/**
 * A reviewer's note is reader text unless it names records (a record ID, a migration, a ruling: "V000420", "m123",
 * "R166", "G052-R1", "S-PET-TDS-AthenaX-GF10") or speaks the database's own words for itself ("headline",
 * "representative grade", "workbook"). Such a note is not for the engineer (D124, INTERFACE "Words"): the page names
 * its domain and status and leaves its words to the records page, which shows them as recorded. A standard's number
 * (ASTM D648) is not a record.
 */
const RECORD_NAME = /(?<!ASTM )\b(?:V\d{6}|G\d{3}-(?:\d{2}|R\d+)(?:-R\d+)?|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|P[BC]\d{5}|m\d{2,3}|R\d{3}|D\d{2,3}|[A-Z][A-Z0-9]{0,2}-[A-Za-z0-9]+-[A-Za-z0-9-]+)\b/;
const PROJECT_WORDS = /\b(headlines?|representative grade|workbook|migration|ruling|quarantin\w*|admitted|coverage record)\b/i;
export const namesRecords = (text) => RECORD_NAME.test(String(text ?? ''));
export const readerText = (text) => !namesRecords(text) && !PROJECT_WORDS.test(String(text ?? ''));

/** A coverage row in the reviewer's words, or, where those words are not reader text, its domain and status alone. */
export function reviewerWords(r) {
  const head = `${r.domain === 'Sparse properties' ? 'Rarely published properties' : r.domain ?? ''}, ${coverageStatusWords(r.status)}`;
  return readerText(r.finding) ? { head, text: r.finding ?? '' } : { head, text: null };
}

/** A known gap as a paragraph: its domain and status, then the reviewer's words or where to read them. */
export const gapPara = (c, r) => {
  const w = reviewerWords(r);
  return `<p class="gap"><b>${esc(w.head)}.</b> ${w.text ? esc(w.text) : `<span class="missing">The reviewer's note is written for the data's maintainers; it is on ${recordsLink(c, '#review-notes', 'the records page')}.</span>`}</p>`;
};

/**
 * An empty section's body: one line saying what is not on file, the recorded reason in the reviewer's words where a
 * coverage row gives one (material-facts.js emptyReasons), and the way to the records page.
 */
export function emptyBody(c, line, { tab = null, anchor = '', link = 'See the records page' } = {}) {
  const reasons = (tab ? emptyReasons(c, tab) : []).map(reviewerWords);
  return `<p class="empty">${esc(line)}${reasons.map((w) => ` <span class="empty-why">${esc(w.text ? `${w.head}: ${w.text}` : `${w.head} (the reviewer's note is written for the data's maintainers; it is on the records page).`)}</span>`).join('')} ${recordsLink(c, anchor, link)}.</p>`;
}

/** Numbers the figures of a section: "4.1", "4.2". */
export const figureCounter = (n) => { let k = 0; return () => `${n}.${++k}`; };

/** A product's value as a dot's data: its product, its record, its value as published. */
const dotData = (e, extra = {}) => ({ 'data-grade': e.g.id, 'data-mid': e.v.measurementId ?? null, 'data-v': fmtBounded(e.v.value, null, e.v.interval), 'data-from': e.v.from?.label ?? null, ...extra });

/** Marks of two values of one product drawn as one point: each kind once, in the vocabulary's order. */
const unionMarks = (...lists) => ['open', 'annealed', 'variant', 'claimed'].filter((k) => lists.some((l) => l.includes(k)));

/**
 * What each row of a comparison holds, as a table (the drawer's spreadSummary): products compared, median, middle half
 * and range, and the values drawn but left out of the median. Where nothing drawn is compared, a sentence says why.
 */
function medianTable(hs, m) {
  const units = new Set(hs.map((h) => h.unit));
  const claimed = hs.map((h) => [h, m.summary?.[h.key]]).filter(([, s]) => s?.claimed);
  const named = claimed.filter(([, s]) => !s.claimed.setApart).map(([h, s]) => `${h.labels.plain}: ${toughenedSplit(s, h.unit)}`);
  const toughened = [...named, claimed.length ? TOUGHENED_NOTE_SHORT : null].filter(Boolean);
  if (hs.every((h) => !m.summary?.[h.key]?.n)) return { table: '', notes: [`No median: ${noMedianWhy(hs, m)}.`, ...toughened] };
  const row = (h) => {
    const s = m.summary?.[h.key];
    const apart = apartWords(h, s);
    return `<tr><th scope="row">${esc(h.labels.plain)}${units.size > 1 ? ` <span class="u">${esc(h.unit)}</span>` : ''}</th>`
      + `<td class="num">${s?.n ?? 0}</td><td class="num">${s?.n ? esc(fmtNumber(s.median)) : '—'}</td>`
      + `<td class="num">${s?.q1 != null ? esc(s.q1 === s.q3 ? fmtNumber(s.q1) : `${fmtNumber(s.q1)}–${fmtNumber(s.q3)}`) : '—'}</td>`
      + `<td class="num">${s?.n ? esc(joinedSpan(s)) : '—'}</td></tr>`
      + (apart.length ? `<tr class="apart"><td colspan="5">Also drawn, not in the median: ${esc(andList(apart))}.</td></tr>` : '');
  };
  return {
    table: tableBox(`<table class="grid sum"><thead><tr><th scope="col">Test${units.size > 1 ? '' : `, <span class="u">${esc(hs[0].unit)}</span>`}</th>`
      + '<th scope="col" class="num" title="Products compared">n</th><th scope="col" class="num">Median</th><th scope="col" class="num">Middle half</th>'
      + `<th scope="col" class="num">Range</th></tr></thead><tbody>${hs.map(row).join('')}</tbody></table>`),
    notes: [`${medianRule(hs, m)} The median, middle half and range are of these alone.`, ...toughened],
  };
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
const oneValue = ({ h, e }) => `${productNameOrId(e.g)}'s ${lower(h.labels.plain)} of ${fmtBounded(e.v.value, h.unit, e.v.interval)}${e.v.level === 'as-published' ? `, with ${asPublishedWords(h)}` : ''}`;

/**
 * Mechanical's or Thermal's comparisons (material-facts.js comparisonsOf), each a figure at full width where a scale has
 * two products' values, else the drawer's one sentence saying why there is no graph; then Z against XY where a
 * comparison pairs one property in two orientations. Returns { html, figures, dots, properties } (properties: those the
 * comparisons read or list, which the section's other-properties table leaves out).
 */
export function comparisonBlocks(c, tab, nextFig, anchor, extras = () => []) {
  const m = c.m;
  const mi = measuredIn(c, tab);
  const out = [];
  const covered = new Set();
  let figures = 0, dots = 0;
  // Each in the place of the first property it reads, as the drawer places its headings: tensile before flexural before
  // impact, in the registry's order of properties.
  const first = (f) => { const i = mi.shown.findIndex((p) => f.properties.has(p)); return i < 0 ? Infinity : i; };
  for (const f of comparisonsOf(m, c, tab).sort((a, b) => first(a) - first(b))) {
    for (const p of f.properties) covered.add(p);
    const props = mi.shown.filter((p) => f.properties.has(p));
    const records = mi.rows.filter((x) => props.includes(x.property));
    const n = records.length;
    const about = aboutLine(f.cmp.about, `${f.caption ? `<p>${esc(f.caption)}</p>` : ''}${f.hs.filter((h) => h.comparisonNote).map((h) => `<p><b>${esc(h.labels.plain)}.</b> ${esc(h.comparisonNote)}</p>`).join('')}`)
      + (f.noteRule ? aboutLine(f.cmp.note, `<p>${esc(f.noteRule)}</p>`) : '');
    const link = recordsLink(c, anchor, `Every result, with its document, is on the records page`);
    if (!f.drawnGraphs.length) {
      // No scale with two products' values: the drawer's sentence, which counts the results so it never seems to
      // contradict them.
      const t = f.tally(records, {});
      const parts = t.counts.map(([why, k]) => whyWords(why, k));
      let text;
      if (!f.singles.length) text = `No graph: no product has a value to draw. ${n === 1 ? 'The result on file' : `The ${n} results on file`}: ${andList(parts)}.`;
      else if (f.singles.length > 1) {
        text = `No graph: no scale has two products' values to draw. One product each: ${f.singles.map(oneValue).join('; ')}.${parts.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} on file: ${andList(parts)}.` : ''}`;
      } else {
        const words = t.counts.map(([why, k]) => (why === 'second' ? `${k} more of that product` : whyWords(why, k)));
        text = `No graph: only one product has a value to draw, ${oneValue(f.singles[0])}.${words.length ? ` The other ${t.rest === 1 ? 'result' : `${t.rest} results`} on file: ${andList(words)}.` : ' It is the only result on file.'}`;
      }
      out.push(`<div class="nofig" data-comparison="${esc(f.topic)}"><h3 class="sub-title">${esc(f.topic)}</h3><p>${esc(text)} ${link}.</p>${about}</div>`);
      continue;
    }
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
    const { table, notes } = medianTable(f.shown, m);
    const singles = f.singles.map((d) => `${d.h.labels.plain}: only one product has a value, ${oneValue(d)}.`);
    const silent = silentRowsWords(f.silentListed, f.silentUnlisted, 'on the records page');
    const pairs = pairWords(f.cmp.pairLabel, f.pairs, f.pairs.map((p) => p.both.map(productNameOrId)), f.drawnGraphs.length === 1);
    const shares = shareWords(f.shares, f.noShare);
    const t = f.tally(records);
    const parts = t.counts.map(([why, k]) => whyWords(why, k));
    const counted = `Of the ${n} results on file for these tests, ${t.drawnN} ${t.drawnN === 1 ? 'is' : 'are'} drawn${t.namedN ? ` and ${t.namedN} named under the table` : ''}${parts.length ? `; the other ${t.rest}: ${andList(parts)}` : ''}.`;
    const rowsWords = f.shown.map((h) => `${h.labels.plain}, ${plural(f.byKey.get(h.key).length, 'product')}`).join('; ');
    figures++;
    const no = nextFig();
    out.push(figure({
      id: `fig-${no.replace('.', '-')}`, n: no, title: f.topic, data: { 'data-comparison': f.topic },
      key: comparisonKey(f.key),
      plot: graphs.join(''),
      label: `Dot plot, one dot per product: ${rowsWords}.`,
      table,
      notes: [...notes, ...singles, silent, pairs, shares].filter(Boolean).map((t2) => `<p class="fig-note">${esc(t2)}</p>`).join(''),
      about,
      caption: `A dot is one product's own value of the test. ${esc(counted)} ${link}.`,
    }));
    const zxy = zAgainstXY(f, c, nextFig);
    if (zxy) { out.push(zxy.html); figures++; dots += zxy.dots; }
    for (const x of extras(f, nextFig)) { out.push(x.html); figures++; dots += x.dots; }
  }
  return { html: out.join('\n'), figures, dots, covered };
}

/**
 * Z against XY for a comparison whose rows pair one property in two orientations (comparisonsOf().pairs): a panel per
 * property, each product that publishes both a mark, on one scale shared by both axes with the diagonal where Z equals
 * XY. Null where no pair has two such products.
 */
function zAgainstXY(f, c, nextFig) {
  const panels = f.pairs.filter(({ gr }) => {
    const [a, b] = gr.rows;
    return a.direction && b.direction && a.direction !== b.direction && a.valueProperties.join(';') === b.valueProperties.join(';');
  }).map(({ gr, both }) => {
    const [a, b] = gr.rows;
    const points = both.map((g) => {
      const ea = f.byKey.get(a.key).find((e) => e.g.id === g.id), eb = f.byKey.get(b.key).find((e) => e.g.id === g.id);
      return { x: ea.v.value, y: eb.v.value, marks: unionMarks(dotMarks(a, ea, c), dotMarks(b, eb, c)), data: { 'data-grade': g.id, 'data-v': `${fmtBounded(ea.v.value, null, ea.v.interval)} ${a.direction}, ${fmtBounded(eb.v.value, null, eb.v.interval)} ${b.direction}` } };
    });
    return { a, b, gr, points };
  }).filter((p) => p.points.length > 1);
  if (!panels.length) return null;
  const no = nextFig();
  const marks = new Set(panels.flatMap((p) => p.points.flatMap((x) => x.marks)));
  const key = keyList([
    [keyMark([]), 'both values compared'],
    marks.has('open') ? [keyMark(['open']), 'the XY value has no stated orientation'] : null,
    marks.has('annealed') ? [keyMark(['annealed']), 'measured after annealing'] : null,
    marks.has('variant') ? [keyMark(['variant']), 'special formulation'] : null,
    [keyDiagonal, 'Z equals XY'],
  ].filter(Boolean));
  const plot = `<div class="sc-panels">${panels.map((p) => {
    const scale = stripScale(p.points.flatMap((x) => [x.x, x.y]), p.a.unit);
    const name = p.a.labels.plain.replace(/\s*\([^)]*\)$/, '');
    return `<div class="sc-panel" data-pair="${esc(p.a.key)}"><h4 class="panel-title">${esc(name)} <small>${esc(plural(p.points.length, 'product'))}</small></h4>`
      + scatterPlot({ points: p.points, xs: scale, ys: scale, height: 200, diagonal: true, xTitle: `${p.a.direction}, ${p.a.unit}`, yTitle: `${p.b.direction}, ${p.b.unit}`, wide: 210, narrow: 210 }) + '</div>';
  }).join('')}</div>`;
  const table = tableBox(`<table class="grid sum"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Products with both</th><th scope="col" class="num">XY, lowest–highest</th><th scope="col" class="num">Z, lowest–highest</th></tr></thead><tbody>${panels.map((p) => {
    const xs = p.points.map((x) => x.x), ys = p.points.map((x) => x.y);
    return `<tr><th scope="row">${esc(lower(p.a.labels.plain.replace(/\s*\([^)]*\)$/, '')))} <span class="u">${esc(p.a.unit)}</span></th><td class="num">${p.points.length}</td>`
      + `<td class="num">${esc(joinedSpan({ min: Math.min(...xs), max: Math.max(...xs) }))}</td><td class="num">${esc(joinedSpan({ min: Math.min(...ys), max: Math.max(...ys) }))}</td></tr>`;
  }).join('')}</tbody></table>`);
  const dots = panels.reduce((k, p) => k + p.points.length, 0);
  return {
    dots,
    html: figure({
      id: `fig-${no.replace('.', '-')}`, n: no, title: `${f.topic}: Z against XY, product by product`, data: { 'data-scatter': 'z-xy' },
      key, plot, table,
      label: `Scatter plots of the Z value against the XY value, one mark per product: ${panels.map((p) => `${lower(p.a.labels.plain.replace(/\s*\([^)]*\)$/, ''))}, ${plural(p.points.length, 'product')}`).join('; ')}.`,
      caption: esc(`A mark is one product that publishes both orientations, its XY value across and its Z value up, on one scale for both. Below the diagonal, its Z value is lower than its XY value. The products with only one of the two are in Figure ${no.split('.')[0]}.${Number(no.split('.')[1]) - 1}.`),
    }),
  };
}

/**
 * A scatter of two key properties, product by product (figures.js FIGURE_PAIRS): each product with both values, its own
 * as the build chose them. Null where fewer than two products have both.
 */
export function pairScatter(c, pair, nextFig) {
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
  const no = nextFig();
  const span = (vs) => joinedSpan({ min: Math.min(...vs), max: Math.max(...vs) });
  const table = tableBox(`<table class="grid sum"><thead><tr><th scope="col">Axis</th><th scope="col" class="num">Products drawn</th><th scope="col" class="num">Lowest–highest</th></tr></thead><tbody>`
    + `<tr><th scope="row">${esc(hx.labels.plain)} <span class="u">${esc(hx.unit)}</span></th><td class="num">${points.length}</td><td class="num">${esc(span(points.map((p) => p.x)))}</td></tr>`
    + `<tr><th scope="row">${esc(hy.labels.plain)} <span class="u">${esc(hy.unit)}</span></th><td class="num">${points.length}</td><td class="num">${esc(span(points.map((p) => p.y)))}</td></tr></tbody></table>`);
  return {
    dots: points.length,
    html: figure({
      id: `fig-${no.replace('.', '-')}`, n: no, title: `${hy.labels.plain} against ${lower(hx.labels.plain)}`, data: { 'data-scatter': `${hx.key}-${hy.key}` },
      key, table,
      plot: scatterPlot({ points, xs, ys, height: 300, xTitle: `${hx.labels.plain}, ${hx.unit}`, yTitle: `${hy.labels.plain}, ${hy.unit}` }),
      label: `Scatter plot of ${lower(hy.labels.plain)} against ${lower(hx.labels.plain)}, one mark per product: ${plural(points.length, 'product')}.`,
      caption: esc(`A mark is one product with both values, its own as published: ${plural(points.length, 'product')}. ${only ? `${only} more ${only === 1 ? 'publishes' : 'publish'} only one of the two, and ${only === 1 ? 'is' : 'are'} not drawn. ` : ''}Products, below, gives each product's values.`),
    }),
  };
}

/**
 * The properties of a domain that no figure draws, each with how many values and products, the lowest and highest
 * value as published (per unit: these are not compared, and their conditions differ), and the way to the records page.
 * Then the properties named without a value, those no record names, and the domain's known gaps.
 */
export function otherProperties(c, tab, covered, anchor, { title = 'Other properties on file' } = {}) {
  const mi = measuredIn(c, tab);
  const props = mi.shown.filter((p) => !covered.has(p));
  const rows = props.map((p) => {
    const xs = mi.rows.filter((x) => x.property === p);
    const numeric = xs.filter((x) => x.numeric && !x.quarantined && !x.implausible);
    const units = [...new Set(numeric.map((x) => x.unit))];
    const spans = units.map((u) => { const vs = numeric.filter((x) => x.unit === u).map((x) => x.value); return `${joinedSpan({ min: Math.min(...vs), max: Math.max(...vs) })}${u && u !== 'Dimensionless' ? ` ${u}` : ''}`; });
    const products = new Set(xs.map((x) => x.gradeId)).size;
    return `<tr><th scope="row">${esc(propertyName(p))}</th><td class="num">${esc(fmtNumber(xs.length))}</td><td class="num">${products}</td><td class="num spans">${spans.length ? spans.map(esc).join('<br>') : '—'}</td></tr>`;
  });
  const table = rows.length
    ? `<h3 class="sub-title">${esc(title)}</h3>${tableBox(`<table class="grid props"><thead><tr><th scope="col">Property</th><th scope="col" class="num">Values</th><th scope="col" class="num">Products</th><th scope="col" class="num">Lowest–highest, as published</th></tr></thead><tbody>${rows.join('')}</tbody></table>`)}`
      + `<p class="fig-note">Not drawn and not compared: each value is as its sheet publishes it, under its own test conditions. ${recordsLink(c, anchor, 'Every value, with its conditions and document')}.</p>`
    : '';
  const named = mi.named.length ? `<p class="fig-note">Named on a data sheet without a value: ${esc(andList([...new Map(mi.named.map((x) => [`${x.property}|${x.gradeId}`, `${inSentence(propertyName(x.property))} (${productNameOrId(c.gradeById.get(x.gradeId) ?? { id: 'a product' })})`])).values()]))}.</p>` : '';
  const absent = mi.absent.length ? `<p class="fig-note absent"><b>Not published for this material:</b> ${esc(mi.absent.map(propertyName).join(', '))}. A gap, not a zero or a low value.</p>` : '';
  const gaps = mi.gaps.length ? `<h3 class="sub-title">Known gaps</h3>${mi.gaps.map((r) => gapPara(c, r)).join('')}` : '';
  return { html: `${table}${named}${absent}${gaps}`, properties: props.length };
}

