// Products: every product of the material in one table to choose from. A row is a product: how many of the key values
// it publishes, its strength and stiffness flat and across the layers, its notched impact, its heat deflection at both
// loads, its price, its nozzle and bed window (and whether it needs a hardened nozzle), and its chamber and drying. A
// value's quarter within its column is a quiet shade. Most documented first, the first 25 shown and the rest a click
// away; any column sorts; a search and three toggles narrow the list over every product. A row opens to its card: its
// full name, every value with its conditions in words, its print settings and where they come from, its maker's
// statements and its records. On a phone each product is two lines, its name and four values chosen in "Columns".
//
// Each value is the product's own as the build chose it (grades[].headline, material-facts.js productRows); nothing here
// decides anything. The script (assets/tables.src.js) does the searching, filtering, sorting and paging, and builds a
// card from the #product-cards island when its row first opens; without it the table reads in full, most documented
// first, and the records page holds what a card would show.

import { esc, recordsHref, count, jsonIsland } from '../html.js';
import { fmtBounded, fmtNumber, dryingWords } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { productRows, indexDb, stated, productNameOrId } from '../../js/ui/material-facts.js';
import { windowText, settingWords, annealWords, changedState, asPublishedWords, plural, lower, andList, EMPTY_LINES } from '../../js/ui/material-words.js';
import { specimenWords, standardWords } from '../records/common.js';
import { emptyBody } from './common.js';

/**
 * The columns: headline pairs under one heading (strength and modulus in XY and Z, heat deflection at its two loads),
 * `impact` (notched Charpy, or notched Izod, labelled, for a product that publishes no Charpy), the price, `nozzlebed`
 * (the nozzle window over the bed window, a hardened-nozzle icon beside them) and `print` (chamber and drying, each by
 * its icon). A column no product fills is left out and named under the table.
 */
const COLUMNS = [['tensileStrengthXY', 'tensileStrengthZ'], ['tensileModulusXY', 'tensileModulusZ'], ['impact'], ['hdt045', 'hdt18'], ['priceCADkg'], ['nozzlebed'], ['print']];
const IMPACT = ['charpyNotched', 'izodNotched'];
const PRINT_LABEL = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };
/** What a phone shows of each product, beside its name, until the reader picks other columns. */
const PHONE = ['tensileStrengthXY', 'tensileModulusXY', 'hdt045', 'nozzlebed'];

/**
 * The marks beside a product's name and in its print cells, as icons in the 20 px line language, each said in its title
 * and once in the key. One sprite.
 */
const ICONS = {
  twin: '<path d="M7 3.5h6.5l3 3V15H7z"/><path d="M13.5 3.5v3h3"/><path d="M4 6.5v10h8.5"/>',
  tough: '<path d="M10 3l6 2.2v4.3c0 3.6-2.5 6.1-6 7.5-3.5-1.4-6-3.9-6-7.5V5.2z"/>',
  variant: '<path d="M10 3.5l6.5 6.5-6.5 6.5L3.5 10z"/>',
  reference: '<path d="M8 3.5h4M8.8 3.5v5L4.5 16.5h11L11.2 8.5v-5"/>',
  hardened: '<path d="M6 3.5h8v4l-2.5 4h-3L6 7.5z"/><path d="M8.5 11.5L10 16.5l1.5-5"/>',
  chamber: '<rect x="3.5" y="4" width="13" height="12.5" rx="1.5"/><path d="M7.5 13c1-1.2 1-2.3 0-3.5M10 13c1-1.2 1-2.3 0-3.5M12.5 13c1-1.2 1-2.3 0-3.5"/>',
  drying: '<path d="M10 3.5c3 3.6 4.5 6.2 4.5 8.3a4.5 4.5 0 0 1-9 0c0-2.1 1.5-4.7 4.5-8.3z"/><path d="M4 4l12 12"/>',
};
const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>${Object.entries(ICONS).map(([k, d]) => `<symbol id="pi-${k}" viewBox="0 0 20 20">${d}</symbol>`).join('')}</defs></svg>`;
/** An icon with its words: a tooltip for a pointer, a name for a screen reader. */
const icon = (k, words, cls = '') => `<svg class="pi pi--${k}${cls}" role="img" aria-label="${esc(words)}"><title>${esc(words)}</title><use href="#pi-${k}"/></svg>`;

const SEARCH_ICON = '<svg class="icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4 4"/></svg>';

/** A setting in a cell: a window in the signs a sheet prints ("≥ 230"), or a short word for a state, its sentence aside. */
function settingText(s) {
  if (!s || s.state === 'unknown') return null;
  if (s.state === 'range' && (s.min != null || s.max != null)) return s.max == null ? `≥ ${fmtNumber(s.min)}` : s.min == null ? `≤ ${fmtNumber(s.max)}` : windowText(s.min, s.max);
  return s.state === 'not-required' || s.state === 'ambient' ? 'none' : s.state === 'enclosed' ? 'enclosed' : settingWords(s);
}

/**
 * The names the table shows: each product's own, except where it is longer than two lines and its maker's products
 * share a closing phrase ("… by Prusa Polymers"): that phrase is left to the title and the card, so the words that tell
 * the products apart stay in view. Nothing is cut in a name's middle or end.
 */
function shownNames(rows) {
  const LONG = 40;
  const byMaker = new Map();
  for (const r of rows) (byMaker.get(r.maker) ?? byMaker.set(r.maker, []).get(r.maker)).push(r.name.split(' '));
  const out = new Map();
  for (const r of rows) {
    let name = r.name;
    const sibs = byMaker.get(r.maker) ?? [];
    if (name.length > LONG && sibs.length > 1) {
      // The longest closing phrase of two words or more that another of the maker's products ends with too.
      const words = r.name.split(' ');
      for (let k = words.length - 2; k >= 2; k--) {
        const end = words.slice(-k).join(' ');
        if (sibs.filter((w) => w.length > k && w.slice(-k).join(' ') === end).length > 1) { name = words.slice(0, -k).join(' '); break; }
      }
    }
    out.set(r.id, name);
  }
  // Two products shown alike are shown in full.
  const seen = new Map();
  for (const [id, n] of out) seen.set(n, (seen.get(n) ?? 0) + 1);
  for (const r of rows) if (seen.get(out.get(r.id)) > 1) out.set(r.id, r.name);
  return out;
}

/** A cell's sort value, only where its text does not read as it (a sorter reads "1,220", "> 300" and "200–240" itself). */
const dataV = (v, text) => (Number(String(text).replace(/,/g, '').replace(/^[<>≤≥]\s*/, '').split('\u2060–\u2060').pop()) === v ? '' : ` data-v="${v}"`);

/** The marks a value carries, as the figures mark a dot: hollow (not compared), square (annealed), diamond (special formulation). */
const marksOf = (v, r, h) => [v.level === 'as-published' ? 'o' : '', v.anneal ? 'a' : '', r.variant && h.kind !== 'price' ? 'd' : ''].filter(Boolean);

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
    const silent = [];
    const kinds = new Set();

    // The leaf columns some product fills, each with how a row fills it, under its heading.
    const leaf = (key) => {
      if (key === 'nozzlebed') {
        if (!rows.some((r) => settingText(r.print?.nozzle) || settingText(r.print?.bed))) { silent.push('nozzle and bed temperatures'); return null; }
        return { key, short: 'Nozzle / bed', unit: '°C' };
      }
      if (key === 'print') {
        if (!rows.some((r) => settingText(r.print?.chamber) || (r.print?.drying && r.print.drying.need !== 'unknown'))) { silent.push('chamber and drying'); return null; }
        return { key, short: 'Chamber, drying', unit: '' };
      }
      if (key === 'impact') {
        // Charpy where any product publishes it, Izod in its place for a product that publishes none, labelled.
        const [main, other] = rows.some((r) => r.values[IMPACT[0]]) ? IMPACT : [IMPACT[1], IMPACT[0]];
        const h = hByKey.get(main), o = hByKey.get(other);
        const pick = (r) => (r.values[main] ? { v: r.values[main], h } : r.values[other] ? { v: r.values[other], h: o, other: true } : null);
        if (!h || !rows.some(pick)) { silent.push('notched impact'); return null; }
        return { key, h, pick, otherWord: o?.labels.short.split(' ')[0] ?? '', short: h.labels.short, unit: h.unit, sub: null };
      }
      const h = hByKey.get(key);
      if (!h || c.m.headline?.[key]?.notApplicable) return null;
      if (!rows.some((r) => r.values[key])) { silent.push(lower(h.labels.plain)); return null; }
      return { key, h, pick: (r) => (r.values[key] ? { v: r.values[key], h } : null), short: h.labels.short, unit: h.unit,
        sub: h.direction ? h.direction : h.loadMPa != null ? `${fmtNumber(h.loadMPa)} MPa` : null };
    };
    const groups = COLUMNS.map((keys) => keys.map(leaf).filter(Boolean)).filter((g) => g.length);
    const cols = groups.flat();
    cols.forEach((col, i) => { col.i = i + 2; });
    const ncol = cols.length + 2;
    // A heading for a group: the property's name without the orientation or load its leaves say.
    const groupHead = (g) => (g[0].h && (g[0].sub || g.length > 1) ? g[0].h.labels.plain.replace(/\s*\((XY|Z)\)$/, '').replace(/ at [\d.]+ MPa$/, '') : g[0].short);

    // A value's quarter within its column, among the values compared (not those shown and not compared, nor another
    // test, nor a special formulation): the shade a cell takes, none for the lowest quarter.
    for (const col of cols) {
      if (!col.pick) continue;
      const vs = rows.map((r) => col.pick(r)).filter((p) => p && !p.other && p.v.level !== 'as-published').map((p) => p.v.value).filter(Number.isFinite).sort((a, b) => a - b);
      col.shade = vs.length >= 4 ? (v) => Math.min(3, Math.floor((4 * vs.filter((x) => x < v).length) / vs.length)) : () => 0;
    }

    const byKey = new Map();
    for (const g of c.grades) if (stated(g.formulationKey)) (byKey.get(g.formulationKey) ?? byKey.set(g.formulationKey, []).get(g.formulationKey)).push(g);
    const names = shownNames(rows);
    const kh = indexDb(c.db).knowHowByGrade;
    const tally = (list) => { const m = new Map(); for (const x of list) m.set(x.gradeId, (m.get(x.gradeId) ?? 0) + 1); return m; };
    const msBy = tally(c.ms), profilesBy = tally(c.profiles), pricesBy = tally(c.prices);
    const flags = { z: 0, own: 0, ca: 0 };
    const strings = [], index = new Map(), cards = {};
    const ref = (t) => (index.has(t) ? index.get(t) : (index.set(t, strings.length), strings.push(t), strings.length - 1));
    const phone = new Set(PHONE.filter((k) => cols.some((col) => col.key === k)));
    for (const col of cols) if (phone.size < 4 && !phone.has(col.key)) phone.add(col.key);
    const on = (col) => (phone.has(col.key) ? ' on' : '');

    const cell = (col, r) => {
      const p = r.print;
      const guide = (axis) => p?.from?.[axis]?.origin === 'guide';
      if (col.key === 'nozzlebed') {
        const lines = ['nozzle', 'bed'].map((axis) => {
          const t = settingText(p?.[axis]);
          if (guide(axis) && t) kinds.add('guide');
          return t ? `<span${guide(axis) ? ' class="o"' : ''} title="${esc(`${axis === 'nozzle' ? 'Nozzle' : 'Bed'}: ${settingWords(p[axis])}${guide(axis) ? ', from the Bambu Lab Filament Guide' : ''}`)}">${esc(t)}</span>` : '<span class="nil"></span>';
        });
        const hard = p?.hardenedNozzle === true ? (kinds.add('hardened'), icon('hardened', `Hardened nozzle required${guide('hardenedNozzle') ? ' (from the Bambu Lab Filament Guide)' : ''}`, guide('hardenedNozzle') ? ' pi--open' : '')) : '';
        const hi = p?.nozzle?.state === 'range' ? p.nozzle.max ?? p.nozzle.min : null;
        return lines.some((l) => !l.includes('nil')) || hard ? `<td class="nb${on(col)}"${hi != null ? ` data-v="${hi}"` : ''}>${hard}${lines.join('')}</td>` : `<td class="nb${on(col)}"></td>`;
      }
      if (col.key === 'print') {
        const items = [];
        const ch = settingText(p?.chamber);
        if (ch) { kinds.add('chamber'); items.push(`<span${guide('chamber') ? ' class="o"' : ''}>${icon('chamber', `Chamber: ${settingWords(p.chamber)}${guide('chamber') ? ', from the Bambu Lab Filament Guide' : ''}`)}${esc(ch)}</span>`); }
        const d = p?.drying;
        if (d && d.need !== 'unknown') {
          kinds.add('drying');
          const t = d.need === 'not-needed' ? 'none' : Number.isFinite(d.tempC) ? fmtNumber(d.tempC) : d.need === 'optional' ? 'optional' : 'yes';
          const hours = Number.isFinite(d.tempC) && d.hours != null ? `<small>${esc(`${d.hoursOpen ? '≥ ' : ''}${fmtNumber(d.hours)} h`)}</small>` : '';
          items.push(`<span${guide('drying') || d.need === 'optional' ? ' class="o"' : ''}>${icon('drying', `Drying: ${dryingWords(d)}${guide('drying') ? ', from the Bambu Lab Filament Guide' : ''}`)}${esc(t)}${hours}</span>`);
          if (guide('drying')) kinds.add('guide');
        }
        return `<td class="pp${on(col)}">${items.join('')}</td>`;
      }
      const pick = col.pick(r);
      if (!pick) return `<td${on(col) ? ' class="on"' : ''}></td>`;
      const { v } = pick;
      const vm = marksOf(v, r, pick.h);
      if (pick.other) { vm.push('iz'); kinds.add('iz'); }
      vm.forEach((k) => kinds.add(k));
      if (v.converted) kinds.add('converted');
      const q = !vm.includes('o') && !vm.includes('iz') && !vm.includes('d') ? col.shade(v.value) : 0;
      if (q) kinds.add('shade');
      const cls = [...vm, q ? `s${q}` : '', on(col).trim()].filter(Boolean).join(' ');
      const text = fmtBounded(v.value, null, v.interval);
      return `<td${dataV(v.value, text)}${cls ? ` class="${cls}"` : ''}>${esc(text)}${pick.other ? `<small>${esc(col.otherWord)}</small>` : ''}${v.converted ? '<span class="fx" title="Converted from a foreign listing">¤</span>' : ''}</td>`;
    };

    const items = rows.map((r) => {
      const published = keyProps.filter((h) => r.values[h.key]);
      const open = published.filter((h) => r.values[h.key].level === 'as-published').length;
      const docs = { n: published.length, f: published.length - open };
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
      const shown = names.get(r.id);
      const counts = { ms: msBy.get(r.id) ?? 0, profiles: profilesBy.get(r.id) ?? 0, statements: kh.get(r.id)?.length ?? 0, prices: pricesBy.get(r.id) ?? 0 };
      const html = `<tbody${z ? ' data-z' : ''}${own ? ' data-own' : ''}${ca ? ' data-ca' : ''}>`
        + `<tr id="product-${esc(r.id)}" data-grade="${esc(r.id)}"><th scope="row"><span class="pr"><label class="px"${shown !== r.name ? ` title="${esc(r.name)}"` : ''}><input type="checkbox"><span class="pn">${esc(shown).split(' ').map((w) => (w.includes('-') ? `<span class="nw">${w}</span>` : w)).join(' ')}</span></label>`
        + `${marks.map(([k, words]) => icon(k, words)).join('')}</span></th>`
        + `<td class="dc" data-v="${docs.n * 100 + docs.f}">${esc(`${fmtNumber(docs.n)}/${fmtNumber(keyProps.length)}`)}</td>`
        + `${cols.map((col) => cell(col, r)).join('')}</tr></tbody>`;
      cards[r.id] = cardData(r, c, counts, ref, twins);
      return { r, docs, html };
    });
    // Most documented first (values compared before values not), then by maker and name.
    items.sort((a, b) => b.docs.n - a.docs.n || b.docs.f - a.docs.f || (a.r.maker ?? '~').localeCompare(b.r.maker ?? '~') || a.r.name.localeCompare(b.r.name));

    // The head: a heading per property (its unit under it), its orientations or loads under that; every column that sorts
    // has a button. A phone's own row of the same headings, four of them shown.
    const sortable = (col) => col.key !== 'print';
    const button = (label, unit, kind, first) => `<button type="button" data-sort="${kind}" data-first="${first}"><span>${esc(label)}</span>${unit ? `<span class="u">${esc(unit)}</span>` : ''}</button>`;
    const leafHead = (col, label, unit, rowspan) => `<th scope="col"${rowspan ? ' rowspan="2"' : ''} data-i="${col.i}"${col.key === 'print' ? ' class="pp"' : ''}>${sortable(col) ? button(label, unit, 'num', col.key === 'priceCADkg' ? 'asc' : 'desc') : `<span>${esc(label)}</span>${unit ? `<span class="u">${esc(unit)}</span>` : ''}`}</th>`;
    const docsTitle = `How many of the ${keyProps.length} values this table holds the product publishes`;
    const row1 = groups.map((g) => (g.length > 1 || g[0].sub
      ? `<th scope="colgroup" colspan="${g.length}" class="pt-gh">${esc(groupHead(g))}<span class="u">${esc(g[0].unit)}</span></th>`
      : leafHead(g[0], g[0].h ? groupHead(g) : g[0].short, g[0].unit, true))).join('');
    const row2 = groups.filter((g) => g.length > 1 || g[0].sub).flat().map((col) => leafHead(col, col.sub, '', false)).join('');
    const phoneRow = cols.map((col) => `<th scope="col" data-i="${col.i}" class="${on(col).trim()}">${sortable(col) ? button(col.short, col.unit, 'num', col.key === 'priceCADkg' ? 'asc' : 'desc') : `<span>${esc(col.short)}</span>`}</th>`).join('');
    const head = `<thead><tr class="pt-g"><th scope="col" rowspan="2" class="pt-name" data-i="0">${button('Product', '', 'text', 'asc')}</th>`
      + `<th scope="col" rowspan="2" class="dc" data-i="1" aria-sort="descending" title="${esc(docsTitle)}">${button('Key values', '', 'num', 'desc')}</th>${row1}</tr>`
      + `<tr class="pt-c">${row2}</tr>`
      + `<tr class="pt-p"><th scope="col" class="pt-name" data-i="0">${button('Product', '', 'text', 'asc')}</th><th scope="col" data-i="1" class="dc">${button('Key values', '', 'num', 'desc')}</th>${phoneRow}</tr></thead>`;

    // The key: the marks on this table, on one line; what each means in full, under "How to read this table".
    const key = [
      kinds.has('shade') ? ['<span class="ks"><i class="s1"></i><i class="s2"></i><i class="s3"></i></span>', 'quarter in column', 'A shade behind a number: its quarter among the compared values in its column, darker for higher. The lowest quarter is not shaded.'] : null,
      kinds.has('o') || kinds.has('guide') ? ['<span class="ko">48</span>', 'not compared', 'Grey italic with a hollow mark: the sheet states no orientation or test load, so the value is shown and not compared. A print setting in grey italic was read from the Bambu Lab Filament Guide, or is optional.'] : null,
      kinds.has('a') ? ['<i class="tm tm--annealed"></i>', 'annealed', 'Measured after annealing.'] : null,
      kinds.has('iz') ? ['<span class="ko ki">6<small>Izod</small></span>', 'Izod', 'Notched Izod where the product publishes no notched Charpy: another test, not compared with Charpy.'] : null,
      kinds.has('twin') ? [icon('twin', 'Same data sheet'), 'same data sheet', 'The product shares its data sheet with another product, as recorded: hover it for which. Their values are one table.'] : null,
      kinds.has('tough') ? [icon('tough', 'Sold as toughened'), 'sold as toughened', 'Sold as toughened or impact-modified: the maker\'s statement, not a test.'] : null,
      kinds.has('variant') ? [icon('variant', 'Special formulation'), 'special formulation', 'A special formulation (a filler or additive the material\'s name does not describe): its values are left out of the medians.'] : null,
      kinds.has('reference') ? [icon('reference', 'Reference'), 'reference', 'A resin or study reference, not a product you can buy.'] : null,
      kinds.has('hardened') ? [icon('hardened', 'Hardened nozzle'), 'hardened nozzle', 'A hardened nozzle is required; pale where the Bambu Lab Filament Guide says so.'] : null,
      kinds.has('chamber') ? [icon('chamber', 'Chamber'), 'chamber °C', 'The chamber temperature the product asks for; "none" where its sheet says it needs none.'] : null,
      kinds.has('drying') ? [icon('drying', 'Drying'), 'drying °C, h', 'Drying: its temperature and, small, its hours; "none" where the sheet says none is needed.'] : null,
      kinds.has('converted') ? ['<span class="fx">¤</span>', 'foreign price', 'The price was converted to CAD from a foreign listing.'] : null,
    ].filter(Boolean);
    const keyLine = key.map(([mark, short]) => `<li>${mark}<span>${esc(short)}</span></li>`).join('');
    const keyMore = `<details class="pt-help"><summary>How to read this table</summary><ul>`
      + `<li><span>Key values: ${esc(lower(docsTitle))}, on a comparable basis or not.</span></li>`
      + `${key.map(([mark, , long]) => `<li>${mark}<span>${esc(long)}</span></li>`).join('')}`
      + '<li><span>A blank cell is not published. Select a column\'s name to sort by it, and a product to open its card.</span></li></ul></details>';

    const products = rows.filter((r) => r.product).length, refs = rows.length - products;
    const lead = `${count(products, 'product')} you can buy${refs ? `, and ${count(refs, 'resin or study reference')} that ${refs === 1 ? 'is' : 'are'} not a product` : ''}, most documented first. Each value is the product's own published value; open a product for its conditions, print settings and records.`;
    // A toggle that would leave none, or every one, of the products is left out: it narrows nothing.
    const toggle = (t, words, n) => (n && n < rows.length ? `<label class="tgl"><input type="checkbox" data-t="${t}"><span>${esc(words)}</span><span class="tgl-n">${esc(fmtNumber(n))}</span></label>` : '');
    const toggles = toggle('z', 'Z values', flags.z) + toggle('own', 'Own data sheet', flags.own) + toggle('ca', 'Canadian price', flags.ca);
    const picker = `<details class="pt-cols"><summary>Columns</summary><p>Four shown beside each name.</p><div>${cols.map((col) => `<label><input type="checkbox" data-c="${col.i}"${phone.has(col.key) ? ' checked' : ''}><span>${esc(col.sub ? `${groupHead(groups.find((g) => g.includes(col)))} ${col.sub}` : col.short)}</span></label>`).join('')}</div></details>`;
    const tools = `<div class="pt-tools" hidden>`
      + `<label class="pt-find">${SEARCH_ICON}<input type="search" data-find placeholder="Find a product or maker" aria-label="Find a product or maker" autocomplete="off" spellcheck="false"></label>`
      + `${toggles ? `<div class="pt-toggles" role="group" aria-labelledby="pt-only"><span class="pt-only" id="pt-only">Only with</span>${toggles}</div>` : ''}`
      + `${picker}<p class="pt-shown" data-shown aria-live="polite">${esc(count(rows.length, 'product'))}</p></div>`;
    const html = `<p class="lead">${esc(lead)}</p>${SPRITE}<div class="pt-wrap">${tools}<div class="pt-keys"><ul class="pt-key">${keyLine}</ul>${keyMore}</div>`
      + `<table class="pt" data-products>${head}${items.map((x) => x.html).join('')}</table>`
      + '<p class="pt-more" hidden><button type="button" data-more></button></p>'
      + '<p class="pt-none" data-none hidden>No product matches. Clear the search or a toggle to see more.</p></div>'
      + jsonIsland('product-cards', { records: recordsHref(c.m.id), ncol, words: CARD_WORDS, strings, cards })
      + `${silent.length ? `<p class="fig-note">${esc(`Not published by any product: ${silent.join(', ')}.`)}</p>` : ''}`
      + '<p class="fig-note">Products are kept by name, not by colour. Pigment can change strength and stiffness, and a data sheet\'s values are for the colour it tested.</p>';
    return { empty: false, html, stats: { rows: rows.length } };
  },
};
