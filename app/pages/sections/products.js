// Products: every product of the material in one table to choose from. A row is a product: how well it is documented
// (of the key properties, how many it publishes), its strength and stiffness flat and across the layers, its heat
// deflection, its print window and its price, each number with a mark under it showing where it sits between the
// lowest and highest in its column and the material's median. Most documented first; any column sorts; a search and
// three toggles narrow the list. A row opens to its card: every value with its conditions in words, its print settings
// and where they come from, its maker's statements and its records. On a phone each row is a card.
//
// Each value is the product's own as the build chose it (grades[].headline, material-facts.js productRows); nothing here
// decides anything. The script (assets/tables.src.js) does the searching, filtering and sorting, and builds a card from
// the #product-cards island when its row first opens (so 195 cards do not weigh on PLA's page); without it the table
// reads in full, most documented first, and the records page holds what a card would show.

import { esc, recordsHref, count, tableBox, jsonIsland } from '../html.js';
import { fmtBounded, fmtNumber, dryingWords } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { LOG_RATIO, MIN_SPAN_C } from '../../js/ui/scales.js';
import { productRows, indexDb, stated } from '../../js/ui/material-facts.js';
import { windowText, settingWords, annealWords, changedState, asPublishedWords, plural, lower, EMPTY_LINES } from '../../js/ui/material-words.js';
import { specimenWords, standardWords } from '../records/common.js';
import { emptyBody } from './common.js';

/** The columns, by group: headline keys, and print settings by their gate's axis. A column no product fills is left out. */
const GROUPS = [
  ['Strength and stiffness', ['tensileStrengthXY', 'tensileStrengthZ', 'tensileModulusXY', 'tensileModulusZ']],
  ['Heat', ['hdt045', 'hdt18']],
  ['Printing', ['print:nozzle', 'print:bed', 'print:chamber']],
  ['Price', ['priceCADkg']],
];
const PRINT_LABEL = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };

const SEARCH_ICON = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>';

/**
 * A value's place between `lo` and `hi`, 0 to 1, two decimals, by the figures' scale rule (scales.js): logarithmic where
 * the column spans more than LOG_RATIO, and a temperature over at least MIN_SPAN_C, so products a degree apart are not
 * drawn at the two ends.
 */
function placer(lo, hi, unit) {
  if (unit === '°C' && hi - lo < MIN_SPAN_C) { const mid = (lo + hi) / 2; lo = mid - MIN_SPAN_C / 2; hi = mid + MIN_SPAN_C / 2; }
  if (!(hi > lo)) return () => 0.5;
  const log = lo > 0 && hi / lo > LOG_RATIO;
  const f = log ? Math.log : (v) => v;
  return (v) => Math.round(Math.max(0, Math.min(1, (f(v) - f(lo)) / (f(hi) - f(lo)))) * 100) / 100;
}
/** A cell's sort value, only where its text does not read as it (a sorter reads "1,220", "> 300" and "200–240" itself). */
const dataV = (v, text) => (Number(String(text).replace(/,/g, '').replace(/^[<>≤≥]\s*/, '').split('\u2060–\u2060').pop()) === v ? '' : ` data-v="${v}"`);

/** A place as a CSS number: ".43", "0", "1". */
const at = (p) => String(p).replace(/^0\./, '.');

/** The marks a value carries, as the figures mark a dot: hollow (not compared), square (annealed), diamond (special formulation). */
const marksOf = (v, r, h) => [v.level === 'as-published' ? 'o' : '', v.anneal ? 'a' : '', r.variant && h.kind !== 'price' ? 'd' : ''].filter(Boolean);

/** A print setting's ends, where its gate reads a window. */
const windowOf = (s) => (s?.state === 'range' && (s.min != null || s.max != null) ? { lo: s.min ?? s.max, hi: s.max ?? s.min } : null);

/** Whether a product publishes a key property from a document of its own, not a sheet it shares with another product. */
const ownSheet = (r) => Object.values(r.values).some((v) => v.measurementId && !v.from);

/** A value's conditions in words: specimen, standard, the bar's state, notch; why it is not compared; whose sheet it is. */
function conditionsOf(v, h, c) {
  const x = v.measurementId ? c.msById.get(v.measurementId) : null;
  return [
    x ? specimenWords(x) : null,
    x ? standardWords(x) ?? 'no standard stated' : null,
    ...(x ? changedState(x, v) : []),
    x && (x.notch === 'Notched' || x.notch === 'Unnotched') ? x.notch.toLowerCase() : null,
    v.level === 'as-published' ? `${asPublishedWords(h)}: not compared` : null,
    v.from?.label ?? null,
  ].filter(Boolean).join(', ');
}

/**
 * A row's card, as data the script turns into the card when the row is first opened (tables.src.js `card`): its notes,
 * its values with their conditions in words, its print settings and where each comes from, its price, and how many of
 * its records each type of record holds. Every word and number is written here; a string used more than once is in
 * the island's list once (`ref` gives its index), so 195 cards weigh tens of kilobytes, not hundreds.
 */
function cardData(r, c, counts, ref) {
  const notes = [
    r.product ? null : 'A resin or study reference, not a product you can buy.',
    r.variant ? `Special formulation: ${r.variant}. Its values are left out of the material's medians.` : null,
    r.toughened ? 'Sold as toughened or impact-modified (the maker\'s statement).' : null,
  ].filter(Boolean).join(' ');
  const values = [];
  for (const h of REGISTRY.allHeadlines) {
    const v = r.values[h.key];
    if (!v || h.kind === 'price') continue;
    values.push(ref(h.labels.plain), fmtBounded(v.value, h.unit, v.interval), ref(conditionsOf(v, h, c)));
  }
  const p = r.print;
  const from = p?.from ?? {};
  const some = !!p && (p.profileIds?.length || Object.keys(from).some((a) => a !== 'anneal'));
  const fromAt = (f) => (f ? ref(f.label) : -1);
  const print = some ? [
    ...['nozzle', 'bed', 'chamber'].flatMap((a) => [ref(PRINT_LABEL[a]), settingWords(p[a]), fromAt(from[a])]),
    ref('Drying'), dryingWords(p.drying), fromAt(from.drying),
    ref('Hardened nozzle'), p.hardenedNozzle === true ? 'required' : p.hardenedNozzle === false ? 'not needed' : 'not published', fromAt(from.hardenedNozzle),
    ...(p.anneal?.length ? [ref('Annealing'), annealWords(p.anneal).join('; '), -1] : []),
  ] : 0;
  const price = r.price ? [`${fmtNumber(r.price.value)} CAD/kg`, [r.price.observations ? `median of ${plural(r.price.observations, 'listing')}` : null,
    r.price.converted ? `converted from ${r.price.converted.currencies.join(' and ')}` : null].filter(Boolean).join(', ')] : 0;
  return [notes, values, print, price, [counts.ms, counts.profiles, counts.statements, counts.prices]];
}

/** The words every card shares, and the record types its links filter by (records/index.js ids) with their nouns. */
const CARD_WORDS = {
  values: 'Key properties', print: 'Print settings', price: 'Price', records: 'On the records page', every: 'Every record of this product',
  noValues: 'Publishes none of the key properties.', noPrint: 'No print settings on file for this product.',
  types: [['measurements', 'measurement'], ['profiles', 'print profile'], ['statements', 'maker statement'], ['prices', 'price listing']],
};

export default {
  id: 'products',
  title: 'Products',
  records: '#measurements',
  render(c) {
    const rows = productRows(c);
    if (!rows.length) return { empty: true, html: emptyBody(c, EMPTY_LINES.Grades, { tab: 'Grades' }), stats: {} };
    const hByKey = new Map(REGISTRY.allHeadlines.map((h) => [h.key, h]));
    // The key properties a product can publish: every measured headline that applies to the material.
    const keyProps = REGISTRY.allHeadlines.filter((h) => h.kind === 'measurement' && !c.m.headline?.[h.key]?.notApplicable);
    const zKeys = keyProps.filter((h) => h.direction === 'Z').map((h) => h.key);

    // The columns some product fills, each with its scale over every value in it and the material's median.
    const silent = [], cardOnly = [];
    const groups = GROUPS.map(([label, keys]) => [label, keys.map((key) => {
      if (key.startsWith('print:')) {
        const axis = key.slice(6);
        const ws = rows.map((r) => windowOf(r.print?.[axis])).filter(Boolean);
        if (!ws.length) { silent.push(`${PRINT_LABEL[axis].toLowerCase()} temperature`); return null; }
        // A print setting a quarter of the products or fewer give (a chamber, for most materials) is in their cards only.
        if (axis === 'chamber' && ws.length * 4 <= rows.length) { cardOnly.push(`${PRINT_LABEL[axis].toLowerCase()} temperature`); return null; }
        return { key, axis, label: PRINT_LABEL[axis], unit: '°C', place: placer(Math.min(...ws.map((w) => w.lo)), Math.max(...ws.map((w) => w.hi)), '°C') };
      }
      const h = hByKey.get(key);
      if (!h || c.m.headline?.[key]?.notApplicable) return null;
      const vs = rows.map((r) => r.values[key]?.value).filter(Number.isFinite);
      if (!vs.length) { silent.push(lower(h.labels.plain)); return null; }
      return { key, h, label: h.labels.short, unit: h.unit, place: placer(Math.min(...vs), Math.max(...vs), h.unit), median: c.m.summary?.[key]?.median };
    }).filter(Boolean)]).filter(([, cols]) => cols.length);
    const cols = groups.flatMap(([, cs]) => cs);
    const ncol = cols.length + 2;
    // On the table: how many key properties there are, and each column's median as a place on its track (--m3 for the
    // third column), so a row carries only its own numbers.
    const tableVars = [`--t:${keyProps.length}`, ...cols.map((col, i) => (Number.isFinite(col.median) ? `--m${i + 3}:${at(col.place(col.median))}` : null)).filter(Boolean)].join(';');

    const kh = indexDb(c.db).knowHowByGrade;
    const tally = (list) => { const m = new Map(); for (const x of list) m.set(x.gradeId, (m.get(x.gradeId) ?? 0) + 1); return m; };
    const msBy = tally(c.ms), profilesBy = tally(c.profiles), pricesBy = tally(c.prices);
    const kinds = new Set();
    const flags = { z: 0, own: 0, ca: 0 };
    const strings = [], index = new Map(), cards = {};
    const ref = (t) => (index.has(t) ? index.get(t) : (index.set(t, strings.length), strings.push(t), strings.length - 1));

    const items = rows.map((r) => {
      const published = keyProps.filter((h) => r.values[h.key]);
      const open = published.filter((h) => r.values[h.key].level === 'as-published').length;
      const docs = { n: published.length, f: published.length - open, o: open };
      const z = zKeys.some((k) => r.values[k]);
      const own = ownSheet(r);
      const ca = !!r.price && !r.price.converted;
      if (z) flags.z++; if (own) flags.own++; if (ca) flags.ca++;
      const shared = Object.values(r.values).some((v) => v.from?.origin === 'twin') || Object.values(r.print?.from ?? {}).some((f) => f.origin === 'twin');
      const tags = [r.product ? null : 'reference', r.variant ? 'special formulation' : null, r.toughened ? 'sold as toughened' : null, shared ? 'shared data sheet' : null].filter(Boolean);
      const cells = cols.map((col) => {
        const l = ` data-l="${esc(`${col.label} ${col.unit}`)}"`;
        if (col.axis) {
          const s = r.print?.[col.axis];
          const w = windowOf(s);
          const guide = r.print?.from?.[col.axis]?.origin === 'guide';
          if (!w) return `<td${l}${s && s.state !== 'unknown' ? ` class="w"` : ''}>${s && s.state !== 'unknown' ? esc(settingWords(s)) : ''}</td>`;
          if (guide) kinds.add('guide');
          const text = windowText(s.min, s.max);
          return `<td${dataV(w.hi, text)}${l}${guide ? ' class="o"' : ''} style="--a:${at(col.place(w.lo))};--b:${at(col.place(w.hi))}">${esc(text)}</td>`;
        }
        const v = r.values[col.key];
        if (!v) return `<td${l}></td>`;
        const marks = marksOf(v, r, col.h);
        marks.forEach((k) => kinds.add(k));
        if (v.converted) kinds.add('converted');
        const text = fmtBounded(v.value, null, v.interval);
        return `<td${dataV(v.value, text)}${l}${marks.length ? ` class="${marks.join(' ')}"` : ''} style="--x:${at(col.place(v.value))}">${esc(text)}${v.converted ? '<span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`;
      }).join('');
      const counts = { ms: msBy.get(r.id) ?? 0, profiles: profilesBy.get(r.id) ?? 0, statements: kh.get(r.id)?.length ?? 0, prices: pricesBy.get(r.id) ?? 0 };
      const html = `<tbody${z ? ' data-z' : ''}${own ? ' data-own' : ''}${ca ? ' data-ca' : ''}>`
        + `<tr id="product-${esc(r.id)}" data-grade="${esc(r.id)}"><th scope="row"><label class="px"><input type="checkbox"><span class="pn">${esc(r.name)}</span></label>`
        + `${tags.length ? `<span class="pt-tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>` : ''}</th>`
        + `<td class="dc" data-v="${docs.n * 100 + docs.f}" data-l="Documented"><i class="pips" style="--f:${docs.f};--o:${docs.o}"></i><span>${esc(`${docs.n} of ${keyProps.length}`)}</span></td>`
        + `${cells}</tr></tbody>`;
      cards[r.id] = cardData(r, c, counts, ref);
      return { r, docs, html };
    });
    // Most documented first (values compared before values not), then by maker and name.
    items.sort((a, b) => b.docs.n - a.docs.n || b.docs.f - a.docs.f || (a.r.maker ?? '~').localeCompare(b.r.maker ?? '~') || a.r.name.localeCompare(b.r.name));

    const sortButton = (label, unit, kind, first) => `<button type="button" data-sort="${kind}" data-first="${first}"><span>${esc(label)}</span>${unit ? `<span class="u">${esc(unit)}</span>` : ''}</button>`;
    const head = `<thead><tr class="pt-g"><th scope="col" rowspan="2" class="pt-name" data-k="name">${sortButton('Product', '', 'text', 'asc')}</th>`
      + `<th scope="col" rowspan="2" class="dc" data-k="docs" aria-sort="descending">${sortButton('Documented', `of ${keyProps.length}`, 'num', 'desc')}</th>`
      + `${groups.map(([label, cs]) => `<th scope="colgroup" colspan="${cs.length}">${esc(label)}</th>`).join('')}</tr>`
      + `<tr class="pt-c">${cols.map((col) => `<th scope="col" data-k="${esc(col.key)}">${sortButton(col.label, col.unit, 'num', col.key === 'priceCADkg' ? 'asc' : 'desc')}</th>`).join('')}</tr></thead>`;

    const key = [
      ['<i class="kt" aria-hidden="true"></i>', 'Place between the column\'s lowest and highest; the tick is the material\'s median'],
      ['<i class="pips" style="--f:2;--o:1;--t:4" aria-hidden="true"></i>', `Key properties published, of ${keyProps.length}; hollow, with no stated orientation or load`],
      kinds.has('o') ? ['<i class="tm tm--open"></i>', 'Not compared: no stated orientation or test load'] : null,
      kinds.has('a') ? ['<i class="tm tm--annealed"></i>', 'Measured after annealing'] : null,
      kinds.has('d') ? ['<i class="tm tm--variant"></i>', 'Special formulation, not in the median'] : null,
      kinds.has('guide') ? ['<i class="tm tm--open"></i>', 'Print setting from the Bambu Lab Filament Guide'] : null,
      kinds.has('converted') ? ['<span class="fx">¤</span>', 'Converted from a foreign price'] : null,
    ].filter(Boolean).map(([mark, words]) => `<li>${mark}<span>${esc(words)}</span></li>`).join('');

    const products = rows.filter((r) => r.product).length, refs = rows.length - products;
    const lead = `${count(products, 'product')} you can buy${refs ? `, and ${count(refs, 'resin or study reference')} that ${refs === 1 ? 'is' : 'are'} not a product` : ''}, most documented first. Each value is the product's own, as the build chose it; a blank is not published. Open a product for its values with their conditions, its print settings and its records.`;
    // A toggle that would leave none, or every one, of the products is left out: it narrows nothing.
    const toggle = (t, words, n) => (n && n < rows.length ? `<label class="tgl"><input type="checkbox" data-t="${t}"><span>${esc(words)}</span><span class="tgl-n">${esc(fmtNumber(n))}</span></label>` : '');
    const toggles = toggle('z', 'Z values', flags.z) + toggle('own', 'Own data sheet', flags.own) + toggle('ca', 'Canadian price', flags.ca);
    const sortOptions = [['docs', 'Most documented'], ['name', 'Product name'], ...cols.map((col) => [col.key, `${col.label}, ${col.key === 'priceCADkg' ? 'lowest' : 'highest'} first`])];
    const tools = `<div class="pt-tools" hidden>`
      + `<label class="pt-find">${SEARCH_ICON}<input type="search" data-find placeholder="Find a product or maker" aria-label="Find a product or maker" autocomplete="off" spellcheck="false"></label>`
      + `${toggles ? `<div class="pt-toggles" role="group" aria-labelledby="pt-only"><span class="pt-only" id="pt-only">Only with</span>${toggles}</div>` : ''}`
      + `<label class="pt-sortby"><span>Sort by</span><select data-sortby>${sortOptions.map(([k, words]) => `<option value="${esc(k)}">${esc(words)}</option>`).join('')}</select></label>`
      + `<p class="pt-shown" data-shown aria-live="polite">${esc(count(rows.length, 'product'))}</p></div>`;
    const html = `<p class="lead">${esc(lead)}</p>${tools}<ul class="pt-key">${key}</ul>`
      + tableBox(`<table class="pt" data-products style="${esc(tableVars)}">${head}${items.map((x) => x.html).join('')}</table>`, 'pt-box')
      + '<p class="pt-none" data-none hidden>No product matches. Clear the search or a toggle to see more.</p>'
      + jsonIsland('product-cards', { records: recordsHref(c.m.id), ncol, words: CARD_WORDS, strings, cards })
      + `${silent.length ? `<p class="fig-note">${esc(`Not published by any product: ${silent.join(', ')}.`)}</p>` : ''}`
      + `${cardOnly.length ? `<p class="fig-note">${esc(`Given by a few products, in their cards: ${cardOnly.join(', ')}.`)}</p>` : ''}`
      + '<p class="fig-note">Colours are not tracked here. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</p>';
    return { empty: false, html, stats: { rows: rows.length } };
  },
};
