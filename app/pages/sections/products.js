// Products: every product of the material in one table to choose from, one line each. A row is a product: how well it is
// documented (of the key properties, how many it publishes), its strength and stiffness flat and across the layers, its
// notched impact, its heat deflection, how it prints on the H2C (nozzle, bed, chamber, drying, hardened nozzle) and its
// price, each number with a hairline under it showing where it sits between the lowest and highest in its column and
// the material's median. Most documented first; any column sorts; a search and three toggles narrow the list. A row
// opens to its card: its full name, every value with its conditions in words, its print settings and where they come
// from, its maker's statements and its records. Wider than the screen, the table scrolls sideways in its own box with
// the product column held at the left, on a laptop and a phone alike.
//
// Each value is the product's own as the build chose it (grades[].headline, material-facts.js productRows); nothing here
// decides anything. The script (assets/tables.src.js) does the searching, filtering and sorting, and builds a card from
// the #product-cards island when its row first opens (so 195 cards do not weigh on PLA's page); without it the table
// reads in full, most documented first, and the records page holds what a card would show.

import { esc, recordsHref, count, tableBox, jsonIsland } from '../html.js';
import { fmtBounded, fmtNumber, dryingWords } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { LOG_RATIO, MIN_SPAN_C } from '../../js/ui/scales.js';
import { productRows, indexDb, stated, productNameOrId } from '../../js/ui/material-facts.js';
import { windowText, settingWords, annealWords, changedState, asPublishedWords, plural, lower, andList, EMPTY_LINES } from '../../js/ui/material-words.js';
import { specimenWords, standardWords } from '../records/common.js';
import { emptyBody } from './common.js';

/**
 * The columns, by group: headline keys; `impact`, notched Charpy or, for a product that publishes no Charpy, notched Izod
 * (labelled); and the print settings by their gate's axis, drying and the hardened nozzle. A column no product fills is
 * left out and named under the table.
 */
const GROUPS = [
  ['Strength and stiffness', ['tensileStrengthXY', 'tensileStrengthZ', 'tensileModulusXY', 'tensileModulusZ']],
  ['Impact', ['impact']],
  ['Heat', ['hdt045', 'hdt18']],
  ['Price', ['priceCADkg']],
  ['Printing on the H2C', ['print:nozzle', 'print:bed', 'print:chamber', 'drying', 'hardened']],
];
const PRINT_LABEL = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };
const IMPACT = ['charpyNotched', 'izodNotched'];

/**
 * The marks beside a product's name, as icons in the 20 px line language, each said in its title and once in the key:
 * a data sheet it shares with another product, sold as toughened, a special formulation, a reference grade. One sprite.
 */
const ICONS = {
  twin: '<path d="M7 3.5h6.5l3 3V15H7z"/><path d="M13.5 3.5v3h3"/><path d="M4 6.5v10h8.5"/>',
  tough: '<path d="M10 3l6 2.2v4.3c0 3.6-2.5 6.1-6 7.5-3.5-1.4-6-3.9-6-7.5V5.2z"/>',
  variant: '<path d="M10 3.5l6.5 6.5-6.5 6.5L3.5 10z"/>',
  reference: '<path d="M8 3.5h4M8.8 3.5v5L4.5 16.5h11L11.2 8.5v-5"/>',
  hardened: '<path d="M6 3.5h8v4l-2.5 4h-3L6 7.5z"/><path d="M8.5 11.5L10 16.5l1.5-5"/>',
};
const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>${Object.entries(ICONS).map(([k, d]) => `<symbol id="pi-${k}" viewBox="0 0 20 20">${d}</symbol>`).join('')}</defs></svg>`;
/** An icon with its words: a tooltip for a pointer, a name for a screen reader. */
const icon = (k, words, cls = '') => `<svg class="pi pi--${k}${cls}" role="img" aria-label="${esc(words)}"><title>${esc(words)}</title><use href="#pi-${k}"/></svg>`;
/** A short word in a cell where a setting is not a temperature, its sentence in the title. */
const word = (w, title) => `<td class="w" title="${esc(title)}">${esc(w)}</td>`;

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

/**
 * The products a product shares its data sheet with, as recorded: the same Shared formulation key (grades.csv, R053),
 * or, failing that, the sibling a value of its reads (from.origin 'twin'). Never inferred from equal numbers.
 */
function twinsOf(r, c, byKey) {
  const key = stated(r.g.formulationKey) ? r.g.formulationKey : null;
  const same = key ? (byKey.get(key) ?? []).filter((g) => g.id !== r.id) : [];
  if (same.length) return same.map((g) => productNameOrId(g));
  const from = [...Object.values(r.values), ...Object.values(r.print?.from ?? {})].map((v) => (v.from ?? v)).find((f) => f?.origin === 'twin');
  return from ? [productNameOrId(c.gradeById.get(from.gradeId) ?? { id: from.gradeId })] : [];
}

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
function cardData(r, c, counts, ref, twins) {
  const notes = [
    twins.length ? `Same data sheet as ${andList(twins)}: their values are one table, recorded once.` : null,
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
  return [notes, values, print, price, [counts.ms, counts.profiles, counts.statements, counts.prices], r.name];
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
    const silent = [];
    const groups = GROUPS.map(([label, keys]) => [label, keys.map((key) => {
      if (key.startsWith('print:')) {
        const axis = key.slice(6);
        const ws = rows.map((r) => windowOf(r.print?.[axis])).filter(Boolean);
        if (!ws.length && !rows.some((r) => stated(r.print?.[axis]?.state) && r.print[axis].state !== 'unknown')) { silent.push(`${PRINT_LABEL[axis].toLowerCase()} temperature`); return null; }
        return { key, axis, label: PRINT_LABEL[axis], unit: '°C', place: ws.length ? placer(Math.min(...ws.map((w) => w.lo)), Math.max(...ws.map((w) => w.hi)), '°C') : null };
      }
      if (key === 'drying') {
        const ts = rows.map((r) => r.print?.drying?.tempC).filter(Number.isFinite);
        if (!rows.some((r) => r.print?.drying && r.print.drying.need !== 'unknown')) { silent.push('drying'); return null; }
        return { key, drying: true, label: 'Drying', unit: '°C', place: ts.length ? placer(Math.min(...ts), Math.max(...ts), '°C') : null };
      }
      if (key === 'hardened') {
        if (!rows.some((r) => typeof r.print?.hardenedNozzle === 'boolean')) { silent.push('hardened nozzle'); return null; }
        return { key, hardened: true, label: 'Hardened nozzle', unit: '' };
      }
      if (key === 'impact') {
        // Charpy where any product publishes it, Izod in its place for a product that publishes none, labelled.
        const [main, other] = rows.some((r) => r.values[IMPACT[0]]) ? IMPACT : [IMPACT[1], IMPACT[0]];
        const h = hByKey.get(main), o = hByKey.get(other);
        const pick = (r) => (r.values[main] ? { v: r.values[main], h } : r.values[other] ? { v: r.values[other], h: o, other: true } : null);
        const vs = rows.map((r) => pick(r)?.v.value).filter(Number.isFinite);
        if (!h || !vs.length) { silent.push('notched impact'); return null; }
        return { key, h, pick, otherWord: o?.labels.short.split(' ')[0] ?? '', label: h.labels.short, unit: h.unit, place: placer(Math.min(...vs), Math.max(...vs), h.unit), median: c.m.summary?.[main]?.median };
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
    const byKey = new Map();
    for (const g of c.grades) if (stated(g.formulationKey)) (byKey.get(g.formulationKey) ?? byKey.set(g.formulationKey, []).get(g.formulationKey)).push(g);

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
      const twins = twinsOf(r, c, byKey);
      const marks = [
        twins.length ? ['twin', `Same data sheet as ${andList(twins)}`] : null,
        r.toughened ? ['tough', 'Sold as toughened (the maker\'s statement)'] : null,
        r.variant ? ['variant', `Special formulation: ${r.variant}`] : null,
        r.product ? null : ['reference', 'A resin or study reference, not a product'],
      ].filter(Boolean);
      marks.forEach(([k]) => kinds.add(k));
      const p = r.print;
      const cells = cols.map((col) => {
        if (col.axis) {
          const s = p?.[col.axis];
          const w = windowOf(s);
          const guide = p?.from?.[col.axis]?.origin === 'guide';
          if (!w) {
            if (!s || s.state === 'unknown') return '<td></td>';
            return word(s.state === 'not-required' || s.state === 'ambient' ? 'none' : s.state === 'enclosed' ? 'enclosed' : settingWords(s), `${col.label}: ${settingWords(s)}`);
          }
          if (guide) kinds.add('guide');
          // A window open at one end in the sign a sheet prints ("≥ 230"); its words in the title and the card.
          const text = s.max == null ? `≥ ${fmtNumber(s.min)}` : s.min == null ? `≤ ${fmtNumber(s.max)}` : windowText(s.min, s.max);
          return `<td${dataV(w.hi, text)}${guide ? ' class="o"' : ''}${s.max == null || s.min == null ? ` title="${esc(settingWords(s))}"` : ''} style="--a:${at(col.place(w.lo))};--b:${at(col.place(w.hi))}">${esc(text)}</td>`;
        }
        if (col.drying) {
          const d = p?.drying;
          const guide = p?.from?.drying?.origin === 'guide';
          if (guide) kinds.add('guide');
          if (!d || d.need === 'unknown') return '<td></td>';
          if (d.need === 'not-needed') return word('none', `Drying: ${dryingWords(d)}`);
          if (!Number.isFinite(d.tempC)) return word(d.need === 'optional' ? 'optional' : 'yes', `Drying: ${dryingWords(d)}`);
          const cls = [guide ? 'o' : '', d.need === 'optional' ? 'opt' : ''].filter(Boolean).join(' ');
          return `<td data-v="${d.tempC}"${cls ? ` class="${cls}"` : ''} title="${esc(`Drying: ${dryingWords(d)}`)}" style="--x:${at(col.place(d.tempC))}">${esc(fmtNumber(d.tempC))}${d.hours != null ? `<small>${esc(`${d.hoursOpen ? '≥ ' : ''}${fmtNumber(d.hours)} h`)}</small>` : ''}</td>`;
        }
        if (col.hardened) {
          const hn = p?.hardenedNozzle;
          const guide = p?.from?.hardenedNozzle?.origin === 'guide';
          if (hn === true) { kinds.add('hardened'); return `<td data-v="1" class="hn">${icon('hardened', `Hardened nozzle required${guide ? ' (from the Bambu Lab Filament Guide)' : ''}`, guide ? ' pi--open' : '')}</td>`; }
          return hn === false ? `<td data-v="0" class="w" title="${esc(`Hardened nozzle not needed${guide ? ' (from the Bambu Lab Filament Guide)' : ''}`)}">no</td>` : '<td></td>';
        }
        const pick = col.pick ? col.pick(r) : r.values[col.key] ? { v: r.values[col.key], h: col.h } : null;
        if (!pick) return '<td></td>';
        const { v } = pick;
        const vm = marksOf(v, r, pick.h);
        if (pick.other) { vm.push('iz'); kinds.add('iz'); }
        vm.forEach((k) => kinds.add(k));
        if (v.converted) kinds.add('converted');
        const text = fmtBounded(v.value, null, v.interval);
        return `<td${dataV(v.value, text)}${vm.length ? ` class="${vm.join(' ')}"` : ''} style="--x:${at(col.place(v.value))}">${esc(text)}${pick.other ? `<small>${esc(col.otherWord)}</small>` : ''}${v.converted ? '<span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`;
      }).join('');
      const counts = { ms: msBy.get(r.id) ?? 0, profiles: profilesBy.get(r.id) ?? 0, statements: kh.get(r.id)?.length ?? 0, prices: pricesBy.get(r.id) ?? 0 };
      const html = `<tbody${z ? ' data-z' : ''}${own ? ' data-own' : ''}${ca ? ' data-ca' : ''}>`
        + `<tr id="product-${esc(r.id)}" data-grade="${esc(r.id)}"><th scope="row"><span class="pr"><label class="px" title="${esc(r.name)}"><input type="checkbox"><span class="pn">${esc(r.name)}</span></label>`
        + `${marks.map(([k, words]) => icon(k, words)).join('')}</span></th>`
        + `<td class="dc" data-v="${docs.n * 100 + docs.f}"><i class="pips" style="--f:${docs.f};--o:${docs.o}"></i><span>${esc(fmtNumber(docs.n))}</span></td>`
        + `${cells}</tr></tbody>`;
      cards[r.id] = cardData(r, c, counts, ref, twins);
      return { r, docs, html };
    });
    // Most documented first (values compared before values not), then by maker and name.
    items.sort((a, b) => b.docs.n - a.docs.n || b.docs.f - a.docs.f || (a.r.maker ?? '~').localeCompare(b.r.maker ?? '~') || a.r.name.localeCompare(b.r.name));

    const sortButton = (label, unit, kind, first) => `<button type="button" data-sort="${kind}" data-first="${first}"><span>${esc(label)}</span>${unit ? `<span class="u">${esc(unit)}</span>` : ''}</button>`;
    const head = `<thead><tr class="pt-g"><th scope="col" rowspan="2" class="pt-name" data-k="name">${sortButton('Product', '', 'text', 'asc')}</th>`
      + `<th scope="col" rowspan="2" class="dc" data-k="docs" aria-sort="descending">${sortButton('Docu\u00admented', `of ${keyProps.length} key`, 'num', 'desc')}</th>`
      + `${groups.map(([label, cs]) => `<th scope="colgroup" colspan="${cs.length}">${esc(label)}</th>`).join('')}</tr>`
      + `<tr class="pt-c">${cols.map((col) => `<th scope="col" data-k="${esc(col.key)}">${sortButton(col.label, col.unit, 'num', col.key === 'priceCADkg' ? 'asc' : 'desc')}</th>`).join('')}</tr></thead>`;

    // The key: the marks on this table, on one line; what each means in full, under "How to read this table".
    const key = [
      ['<i class="kt" aria-hidden="true"></i>', 'place in column', 'A hairline under a number runs from the lowest to the highest value in its column; the dot is this product, the tick the material\'s median.'],
      ['<i class="pips" style="--f:2;--o:1;--t:4" aria-hidden="true"></i>', 'documented', `Pips: how many of the ${keyProps.length} key properties the product publishes, filled where comparable, hollow where the sheet states no orientation or load.`],
      kinds.has('o') || kinds.has('guide') ? ['<span class="ko">48</span>', 'not compared', 'Grey italic with a hollow mark: the sheet states no orientation or test load, so the value is shown and not compared. A print setting marked so was read from the Bambu Lab Filament Guide.'] : null,
      kinds.has('a') ? ['<i class="tm tm--annealed"></i>', 'annealed', 'Measured after annealing.'] : null,
      kinds.has('iz') ? ['<span class="ko ki">6<small>Izod</small></span>', 'Izod', 'Notched Izod where the product publishes no notched Charpy: another test, not compared with Charpy.'] : null,
      kinds.has('twin') ? [icon('twin', 'Same data sheet'), 'same data sheet', 'The product shares its data sheet with another product, as recorded: hover it for which. Their values are one table.'] : null,
      kinds.has('tough') ? [icon('tough', 'Sold as toughened'), 'sold as toughened', 'Sold as toughened or impact-modified: the maker\'s statement, not a test.'] : null,
      kinds.has('variant') ? [icon('variant', 'Special formulation'), 'special formulation', 'A special formulation (a filler or grade the material\'s name does not describe): its values are left out of the medians.'] : null,
      kinds.has('reference') ? [icon('reference', 'Reference'), 'reference', 'A resin or study reference, not a product you can buy.'] : null,
      kinds.has('hardened') ? [icon('hardened', 'Hardened nozzle'), 'hardened nozzle', 'A hardened nozzle is required; hollow where the Bambu Lab Filament Guide says so.'] : null,
      kinds.has('converted') ? ['<span class="fx">¤</span>', 'foreign price', 'The price was converted to CAD from a foreign listing.'] : null,
    ].filter(Boolean);
    const keyLine = key.map(([mark, short]) => `<li>${mark}<span>${esc(short)}</span></li>`).join('');
    const keyMore = `<details class="pt-help"><summary>How to read this table</summary><ul>${key.map(([mark, , long]) => `<li>${mark}<span>${esc(long)}</span></li>`).join('')}`
      + '<li><span>A blank cell is not published. Drying is its temperature and, small, its hours; "none" is a sheet saying none is needed. Select a column\'s name to sort by it, and a product to open its card.</span></li></ul></details>';

    const products = rows.filter((r) => r.product).length, refs = rows.length - products;
    const lead = `${count(products, 'product')} you can buy${refs ? `, and ${count(refs, 'resin or study reference')} that ${refs === 1 ? 'is' : 'are'} not a product` : ''}, most documented first. Each value is the product's own, as the build chose it. Open a product for its values with their conditions, its print settings and its records.`;
    // A toggle that would leave none, or every one, of the products is left out: it narrows nothing.
    const toggle = (t, words, n) => (n && n < rows.length ? `<label class="tgl"><input type="checkbox" data-t="${t}"><span>${esc(words)}</span><span class="tgl-n">${esc(fmtNumber(n))}</span></label>` : '');
    const toggles = toggle('z', 'Z values', flags.z) + toggle('own', 'Own data sheet', flags.own) + toggle('ca', 'Canadian price', flags.ca);
    const tools = `<div class="pt-tools" hidden>`
      + `<label class="pt-find">${SEARCH_ICON}<input type="search" data-find placeholder="Find a product or maker" aria-label="Find a product or maker" autocomplete="off" spellcheck="false"></label>`
      + `${toggles ? `<div class="pt-toggles" role="group" aria-labelledby="pt-only"><span class="pt-only" id="pt-only">Only with</span>${toggles}</div>` : ''}`
      + `<p class="pt-shown" data-shown aria-live="polite">${esc(count(rows.length, 'product'))}</p></div>`;
    const html = `<p class="lead">${esc(lead)}</p>${SPRITE}${tools}<div class="pt-keys"><ul class="pt-key">${keyLine}</ul>${keyMore}</div>`
      + `<div class="pt-frame">${tableBox(`<table class="pt" data-products style="${esc(tableVars)}">${head}${items.map((x) => x.html).join('')}</table>`, 'pt-box')}</div>`
      + '<p class="pt-none" data-none hidden>No product matches. Clear the search or a toggle to see more.</p>'
      + jsonIsland('product-cards', { records: recordsHref(c.m.id), ncol, words: CARD_WORDS, strings, cards })
      + `${silent.length ? `<p class="fig-note">${esc(`Not published by any product: ${silent.join(', ')}.`)}</p>` : ''}`
      + '<p class="fig-note">Colours are not tracked here. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</p>';
    return { empty: false, html, stats: { rows: rows.length } };
  },
};
