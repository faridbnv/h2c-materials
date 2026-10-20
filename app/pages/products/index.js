// A material's Products page (materials/<id>-products.html; the pages reimagined, 2026-10-17): every product in one
// list to choose from, each a native disclosure (<details>) whose row gives its key values and print settings and whose
// card (card.js) holds everything on file about it, every record once. Reference and study specimens follow in a group
// of their own. It replaces the Overview's old Products table and the records page with its finder.
//
// Two controls (assets/products.src.js), whose states cannot contradict: a search over product and maker, and one sort
// (most documented, by name, or by a column in its one meaningful direction), which never hides a product. Sorting by
// a value splits the list into labelled groups: compared values, values shown and not compared (no stated orientation
// or load, Izod in Charpy's place, a setting from Bambu Lab's guide), and products that publish none. Without the
// script the list reads in full, most documented first, and every card opens.
//
// Each value is the product's own as the build chose it (grades[].headline through material-facts.js productRows); a
// number in the list is the pages' display form (sections/masthead.js disp), a number in a card the sheet's own text.
// Nothing here decides anything.

import { esc, count, productsHref, jsonIsland } from '../html.js';
import { fmtNumber, fmtBounded, dryingSpan } from '../../js/ui/format.js';
import { REGISTRY } from '../../js/ui/registry.js';
import { materialContext, productRows, indexDb, stated, productNameOrId, identity, isProduct, priceRows } from '../../js/ui/material-facts.js';
import { andList, plural, lower } from '../../js/ui/material-words.js';
import { mostDocumentedFirst } from '../../js/ui/product-order.js';
import { documentShell, pageHead, tabsNav, BRAND, ICON } from '../shell.js';
import { disp } from '../sections/masthead.js';
import { colophon } from '../sections/footer.js';
import { selectorLink } from '../sections/common.js';
import { drawnIndex } from '../records/measurements.js';
import { productCard } from './card.js';
import { offThePages } from '../records/placement.js';
import * as F from '../findings.js';

/** The marks beside a name or in a cell, in the 20 px line language, each said in its title and once in the key. */
const ICONS = {
  twin: '<path d="M7 3.5h6.5l3 3V15H7z"/><path d="M13.5 3.5v3h3"/><path d="M4 6.5v10h8.5"/>',
  tough: '<path d="M10 3l6 2.2v4.3c0 3.6-2.5 6.1-6 7.5-3.5-1.4-6-3.9-6-7.5V5.2z"/>',
  variant: '<path d="M10 3.5l6.5 6.5-6.5 6.5L3.5 10z"/>',
  hardened: '<path d="M6 3.5h8v4l-2.5 4h-3L6 7.5z"/><path d="M8.5 11.5L10 16.5l1.5-5"/>',
};
const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false" width="0" height="0"><defs>${Object.entries(ICONS).map(([k, d]) => `<symbol id="pi-${k}" viewBox="0 0 20 20">${d}</symbol>`).join('')}</defs></svg>`;
const icon = (k, words) => `<svg class="pi pi--${k}" role="img" aria-label="${esc(words)}"><title>${esc(words)}</title><use href="#pi-${k}"/></svg>`;

/**
 * The list's columns under their headings: a heading names the property and its unit ("Tensile strength, MPa"), its
 * columns carry only what tells them apart ("XY", "Z"), so no column's name wraps where its neighbour's does not. A
 * property column sorts high first; price and the print settings low first.
 */
const GROUPS = [
  ['Tensile strength', 'MPa', [['tensileStrengthXY', 'XY'], ['tensileStrengthZ', 'Z']]],
  ['Tensile modulus', 'GPa', [['tensileModulusXY', 'XY']]],
  ['Notched impact', 'kJ/m²', [['impact', 'Charpy']]],
  ['HDT', '°C', [['hdt045', '0.45 MPa'], ['hdt18', '1.8 MPa']]],
  ['Price', null, [['priceCADkg', 'CAD/kg']]],
  ['Printing on the H2C', '°C', [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Chamber'], ['drying', 'Drying']]],
];
const PRINT = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Heated chamber', drying: 'Drying' };
/** What a phone shows beside each name until the reader sorts by another column. */
const PHONE = ['tensileStrengthXY', 'tensileModulusXY', 'hdt045', 'priceCADkg'];

/** A bound's sign as its sheet prints it, before a displayed number ("> 95"). */
const signOf = (v) => { const t = fmtBounded(v.value, null, v.interval); return /^[<>≤≥]/.test(t) ? `${t.split(' ')[0]} ` : ''; };

/** A print setting's text in a cell: a window ("190–230", "≥ 230"), "none" where none is needed, or nothing. */
function settingCell(s) {
  if (!s || s.state === 'unknown') return null;
  if (s.state === 'range' && (s.min != null || s.max != null)) {
    const text = s.max == null ? `≥ ${fmtNumber(s.min)}` : s.min == null ? `≤ ${fmtNumber(s.max)}` : s.min === s.max ? fmtNumber(s.min) : `${fmtNumber(s.min)}–${fmtNumber(s.max)}`;
    return { text, v: s.min ?? s.max };
  }
  if (s.state === 'not-required' || s.state === 'ambient') return { text: 'none', v: 0 };
  if (s.state === 'enclosed') return { text: 'enclosed', v: null };
  return null;
}

/** The columns some product fills, each { key, label, unit, dir, group, read(r) → cell or null, words: [open, none] }. */
function columnsOf(c, rows, kinds) {
  const hBy = new Map(REGISTRY.allHeadlines.map((h) => [h.key, h]));
  const silent = [];
  const property = (key, label) => {
    const h = hBy.get(key);
    if (!h || c.m.headline?.[key]?.notApplicable) return null;
    if (!rows.some((r) => r.values[key])) { silent.push(lower(h.labels.plain)); return null; }
    return {
      key, label: label ?? h.labels.short, short: h.labels.short, title: h.labels.plain, unit: h.unit, dir: 'desc',
      words: [`As published: ${h.direction ? 'orientation' : 'test load'} not stated`, '', `${h.labels.plain} not published`],
      read: (r) => {
        const v = r.values[key];
        if (!v) return null;
        const cls = [v.level === 'as-published' ? 'o' : '', v.anneal ? 'a' : '', r.variant ? 'd' : ''].filter(Boolean);
        cls.forEach((k) => kinds.add(k));
        return { text: `${signOf(v)}${disp(v.value, h.unit)}`, v: v.value, g: v.level === 'as-published' ? 'o' : 'c', cls };
      },
    };
  };
  const impact = () => {
    const [main, other] = rows.some((r) => r.values.charpyNotched) ? ['charpyNotched', 'izodNotched'] : ['izodNotched', 'charpyNotched'];
    const h = hBy.get(main), o = hBy.get(other);
    if (!h || !rows.some((r) => r.values[main] || r.values[other])) { silent.push('notched impact'); return null; }
    return {
      key: 'impact', label: h.labels.short, short: h.labels.short, title: h.labels.plain, unit: h.unit, dir: 'desc',
      // Izod in Charpy's place is a third group of its own, after the Charpy values shown as published.
      words: ['As published: orientation not stated', `${o ? `${o.labels.plain}, not ranked with ${h.labels.short.split(' ')[0]}` : ''}`, 'Notched impact not published'],
      read: (r) => {
        const v = r.values[main] ?? r.values[other];
        if (!v) return null;
        const izod = !r.values[main];
        const cls = [v.level === 'as-published' ? 'o' : '', v.anneal ? 'a' : '', r.variant ? 'd' : '', izod ? 'iz' : ''].filter(Boolean);
        cls.forEach((k) => kinds.add(k));
        // Izod in Charpy's place is not compared (data-g 'o') and sorts in a group of its own (data-izod).
        return { text: `${signOf(v)}${disp(v.value, h.unit)}`, small: izod ? o?.labels.short.split(' ')[0] ?? '' : '', v: v.value, g: izod || v.level === 'as-published' ? 'o' : 'c', izod, cls };
      },
    };
  };
  const price = () => {
    if (!rows.some((r) => r.price)) { silent.push('price'); return null; }
    const h = hBy.get('priceCADkg');
    return {
      key: 'priceCADkg', label: 'Price', short: 'Price', title: h?.labels.plain ?? 'Price', unit: 'CAD/kg', dir: 'asc', words: ['', '', 'Not in the price sample'],
      read: (r) => {
        if (!r.price) return null;
        if (r.price.converted) kinds.add('converted');
        return { text: disp(r.price.value, 'CAD/kg'), v: r.price.value, g: 'c', cls: r.price.converted ? ['pv-fx'] : [] };
      },
    };
  };
  const print = (axis) => {
    const has = (r) => (axis === 'drying' ? r.print?.drying && r.print.drying.need !== 'unknown' : settingCell(r.print?.[axis]));
    if (!rows.some(has)) { silent.push(lower(PRINT[axis])); return null; }
    return {
      key: axis, label: axis === 'chamber' ? 'Chamber' : PRINT[axis], short: axis === 'chamber' ? 'Chamber' : PRINT[axis], title: PRINT[axis], unit: axis === 'drying' ? '°C, h' : '°C', dir: 'asc',
      words: ['From the Bambu Lab Filament Guide', '', `${PRINT[axis]} not stated`],
      read: (r) => {
        const p = r.print;
        if (!p) return null;
        const guide = p.from?.[axis]?.origin === 'guide';
        if (guide) kinds.add('guide');
        if (axis === 'drying') {
          const d = p.drying;
          if (!d || d.need === 'unknown') return null;
          const cls = [guide || d.need === 'optional' ? 'g' : ''].filter(Boolean);
          if (d.need === 'not-needed') return { text: 'none', v: 0, g: guide ? 'o' : 'c', cls };
          if (!Number.isFinite(d.tempC)) return { text: d.need === 'optional' ? 'if wet' : 'dry first', v: null, g: guide ? 'o' : 'c', cls };
          // A schedule printed as a range is shown as one; the column still sorts by the end every rule reads (D175).
          return { text: dryingSpan(d.tempMinC, d.tempC), small: d.hours != null ? `${d.hoursOpen ? '≥ ' : ''}${dryingSpan(d.hoursMin, d.hours)} h` : '', v: d.tempC, g: guide ? 'o' : 'c', cls };
        }
        const s = settingCell(p[axis]);
        const hard = axis === 'nozzle' && p.hardenedNozzle === true;
        if (hard) kinds.add('hardened');
        if (!s && !hard) return null;
        return { text: s?.text ?? '', v: s?.v ?? null, g: guide ? 'o' : 'c', cls: guide ? ['g'] : [], hard };
      },
    };
  };
  const cols = [];
  for (const [name, unit, keys] of GROUPS) {
    const leaves = keys.map(([k, sub]) => { const col = k === 'impact' ? impact() : k === 'priceCADkg' ? price() : PRINT[k] ? print(k) : property(k); return col ? { ...col, label: sub } : null; }).filter(Boolean);
    leaves.forEach((col) => cols.push({ ...col, group: unit ? `${name}, ${unit}` : name }));
  }
  return { cols, silent };
}

/** The products a product shares its data sheet with, as recorded: the same Shared formulation key, or a sibling's value. */
function twinsOf(r, c, byKey) {
  const key = stated(r.g.formulationKey) ? r.g.formulationKey : null;
  const same = key ? (byKey.get(key) ?? []).filter((g) => g.id !== r.id) : [];
  if (same.length) return same.map((g) => productNameOrId(g));
  const from = [...Object.values(r.values), ...Object.values(r.print?.from ?? {})].map((v) => (v?.from ?? v)).find((f) => f?.origin === 'twin');
  return from ? [productNameOrId(c.gradeById.get(from.gradeId) ?? { id: from.gradeId })] : [];
}

/** A product's records by type, from the material's (each record belongs to exactly one product). */
function recordsByProduct(c) {
  const by = new Map(c.grades.map((g) => [g.id, { ms: [], profiles: [], statements: [], specimen: [], environment: [], listings: [] }]));
  const at = (id) => by.get(id);
  for (const x of c.ms) at(x.gradeId)?.ms.push(x);
  for (const p of c.profiles) at(p.gradeId)?.profiles.push(p);
  const kh = indexDb(c.db).knowHowByGrade;
  for (const g of c.grades) at(g.id).statements.push(...(kh.get(g.id) ?? []).filter((k) => !offThePages('statement', k)));
  // A product's environment statements in its card; how its test bars were made under Specimen preparation.
  for (const e of c.ev) {
    if (!stated(e.gradeId) || offThePages('environment', e)) continue;
    at(e.gradeId)?.[e.category === 'specimen-prep' ? 'specimen' : 'environment'].push(e);
  }
  for (const r of priceRows(c)) at(r.p.gradeId)?.listings.push(r);
  return by;
}

/** The key: only the marks this list uses, each said once. */
function keyLine(kinds, methodHref) {
  // Each entry is a mark, never a sample number, then content's words for it, short enough for two lines on a laptop.
  const k = [
    kinds.has('o') || kinds.has('iz') ? ['<span class="km km--o" aria-hidden="true">○</span>', 'orientation or load not stated'] : null,
    kinds.has('a') ? ['<span class="km km--a" aria-hidden="true"></span>', 'measured after annealing'] : null,
    kinds.has('guide') ? ['<span class="km km--g" aria-hidden="true">Aa</span>', 'from the Bambu Lab Filament Guide'] : null,
    kinds.has('iz') ? ['<span class="km km--iz" aria-hidden="true">Izod</span>', 'Izod where no Charpy is published'] : null,
    kinds.has('tough') ? [icon('tough', 'Sold as toughened'), 'sold as toughened'] : null,
    kinds.has('variant') ? [icon('variant', 'Modified'), 'added filler or additive'] : null,
    kinds.has('twin') ? [icon('twin', 'Data sheet shared'), 'shared data sheet'] : null,
    kinds.has('hardened') ? [icon('hardened', 'Hardened nozzle'), 'hardened nozzle'] : null,
    kinds.has('converted') ? ['<span class="km km--fx" aria-hidden="true">¤</span>', 'converted price'] : null,
    ['<span class="km" aria-hidden="true">—</span>', 'not published'],
  ].filter(Boolean);
  const method = methodHref ? `<p class="pl-method"><a href="${esc(methodHref)}">How the numbers are worked out</a></p>` : '';
  if (!k.length) return method;
  // On a phone the key folds into "Key" (the script closes it there); a laptop shows it open, its summary hidden.
  return `<details class="pl-keyd" open><summary>Key</summary><ul class="pl-keys" aria-label="Marks">${k.map(([mark, words]) => `<li>${mark}<span>${esc(words)}</span></li>`).join('')}</ul></details>${method}`;
}

/** One product's row and card. */
function productRow(c, r, cols, own, twins, ix, { open, phone }) {
  const marks = [
    twins.length ? ['twin', `Data sheet shared with ${andList(twins)}`] : null,
    r.toughened ? ['tough', 'Sold as toughened (the maker\'s statement)'] : null,
    r.variant ? ['variant', `Modified: ${r.variant}`] : null,
  ].filter(Boolean);
  const cells = cols.map((col) => {
    const x = col.read(r);
    const ph = phone.indexOf(col.key);
    const base = `pv${ph >= 0 ? ` pv-ph pv-ph${ph + 1}` : ''}`;
    // The column's name for a screen reader and, on a phone, above the value: its short name and unit.
    const label = `<span class="pv-l">${esc(col.short ?? col.title)}${col.unit ? `, ${esc(col.unit)}` : ''}</span>`;
    if (!x) return `<span class="${base} pv-none" data-k="${esc(col.key)}">${label}<span class="pv-t" aria-label="not published">—</span></span>`;
    const cls = [base, ...x.cls].join(' ');
    return `<span class="${cls}" data-k="${esc(col.key)}"${x.v != null ? ` data-v="${x.v}"` : ''} data-g="${x.g}"${x.izod ? ' data-izod' : ''}>${label}<span class="pv-t">${esc(x.text)}${x.small ? `<small>${esc(x.small)}</small>` : ''}${x.hard ? icon('hardened', 'Hardened nozzle needed') : ''}</span></span>`;
  }).join('');
  const q = [r.name, r.maker, ...twins].filter(Boolean).join(' ').toLowerCase();
  return `<details class="pr" id="${esc(r.id)}" data-grade="${esc(r.id)}" data-q="${esc(q)}"${open ? ' open' : ''}>`
    + `<summary class="pr-s"><span class="pn"><span class="pn-t">${esc(r.name)}</span>${marks.length ? `<span class="pmk">${marks.map(([k, w]) => icon(k, w)).join('')}</span>` : ''}</span>${cells}</summary>`
    + productCard(c, r.g, own, twins, ix) + '</details>';
}

/**
 * The opening line under the name: how many products from how many makers, then the order the list is in (the script
 * keeps it with the sort: "Sorted by HDT at 0.45 MPa, highest first."), then what the reader can do. Content's words.
 */
function openingLine(n, makers) {
  return `${esc(`${plural(n, 'product')} from ${plural(makers, 'maker')}.`)} <span data-sort-line>Most documented first.</span> ${esc('Select a column to sort, a product to see its values, print settings and documents.')}`;
}

/** The Products page of a material: { path, html, stats }. */
export function renderProductsPage(db, id, env) {
  const c = materialContext(db, id, { showEstimates: true });
  if (!c) throw new Error(`renderProductsPage: ${id} is not a material`);
  const m = c.m;
  const ident = identity(m, c);
  const all = productRows(c);
  const rows = all.filter((r) => r.product);
  const refs = all.filter((r) => !r.product);
  const kinds = new Set();
  const { cols, silent } = columnsOf(c, rows.length ? rows : all, kinds);
  const byKey = new Map();
  for (const g of c.grades) if (stated(g.formulationKey)) (byKey.get(g.formulationKey) ?? byKey.set(g.formulationKey, []).get(g.formulationKey)).push(g);
  const records = recordsByProduct(c);
  const ix = drawnIndex(c);
  // Most documented first: the key values a product publishes, those compared before those not, then maker and name
  // (js/ui/product-order.js, which the drawer's Products tab reads too).
  const ordered = mostDocumentedFirst(m, rows);
  const phone = PHONE.filter((k) => cols.some((col) => col.key === k));
  for (const col of cols) if (phone.length < 4 && !phone.includes(col.key)) phone.push(col.key);
  const open = rows.length < 6;
  const rowHtml = (r) => {
    const twins = twinsOf(r, c, byKey);
    if (twins.length) kinds.add('twin');
    if (r.toughened) kinds.add('tough');
    if (r.variant) kinds.add('variant');
    return productRow(c, r, cols, records.get(r.id), twins, ix, { open, phone });
  };
  const list = ordered.map(rowHtml).join('\n');
  const refList = refs.map(rowHtml).join('\n');

  // The head: a heading per group, its columns under it, each a sort button (the select below is the same state).
  // The name takes what the numbers can spare, so most names keep to one line.
  // The impact column carries Izod's tag beside its number ("19.8 Izod") and the nozzle column a hardened-nozzle mark
  // beside its window ("310–350 ⛉"): each a little wider than the others, so neither is cut.
  const WIDE = { impact: '1.05fr', nozzle: '1.35fr' };
  const template = `minmax(15rem, 3.5fr) ${cols.map((col) => WIDE[col.key] ?? (PRINT[col.key] ? '1.05fr' : '.8fr')).join(' ')}`;
  const groups = [];
  for (const col of cols) { const last = groups.at(-1); if (last && last[0] === col.group) last[1].push(col); else groups.push([col.group, [col]]); }
  const button = (col) => `<button type="button" data-sort="${esc(col.key)}" tabindex="-1" title="${esc(`Sort by ${lower(col.title)}, ${col.dir === 'desc' ? 'high' : 'low'} first`)}"><span>${esc(col.label)}</span></button>`;
  // Two rows: every group's label on the first, every column's name and unit on the second, bottom-aligned.
  const head = `<div class="pl-h" aria-hidden="true"><span class="pl-hn"><button type="button" data-sort="name" tabindex="-1" title="Sort by name"><span>Product</span></button></span>`
    + groups.map(([g, cs]) => `<div class="pl-hg" style="grid-column: span ${cs.length}"><span class="pl-g">${esc(g)}</span>${cs.map(button).join('')}</div>`).join('') + '</div>';
  const options = [['docs', 'Most documented'], ['name', 'Name'], ...cols.map((col) => [col.key, `${col.title}, ${col.dir === 'desc' ? 'high' : 'low'} first`])];
  const controls = `<div class="pl-ctl" hidden><div class="pl-ctl-in">`
    + `<label class="find">${ICON.search}<input type="search" data-find placeholder="Find a product or maker" aria-label="Find a product or maker" autocomplete="off" spellcheck="false"></label>`
    + `<label class="sortby"><span>Sort by</span><select data-sortby>${options.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></label>`
    + `<p class="pl-count" data-count aria-live="polite">${esc(count(rows.length, 'product'))}</p></div></div>`;
  const words = {
    groups: Object.fromEntries(cols.map((col) => [col.key, col.words])), dir: Object.fromEntries(cols.map((col) => [col.key, col.dir])),
    title: Object.fromEntries(cols.map((col) => [col.key, col.title])), noun: ['product', 'products'],
    // The sort, said: the list's order in the opening line and in the select.
    first: { desc: ['highest first', 'high first'], asc: ['lowest first', 'low first'] }, docs: 'Most documented first.', name: 'Sorted by name.',
  };
  const makers = new Set(rows.map((r) => r.maker).filter(Boolean)).size;
  const body = `${pageHead({
    name: ident.primary, aka: ident.aka,
    // A material beyond the H2C's capability says so first, as its Overview does.
    lines: `${m.excluded ? '<p class="callout"><b>Beyond H2C capability.</b> Kept for reference, never a candidate: it needs more heat than the H2C gives.</p>' : ''}<p class="pid">${openingLine(rows.length, makers)}</p>`,
    tabs: tabsNav({ id: m.id, name: ident.primary, n: rows.length, current: 'products' }),
  })}
${SPRITE}${controls}
${keyLine(kinds, env.methodHref)}
<section class="pl" data-products data-section="products-list" aria-label="${esc(`${ident.primary} products`)}" style="--pl-cols: ${template}">
${head}
<div class="pl-body">
${list}
</div>
<p class="pl-none" data-none hidden>No product matches "<span data-none-q></span>". <button type="button" class="btn btn-quiet" data-clear>Clear the search</button></p>
</section>
${silent.length ? `<p class="pl-note">${esc(`Not published by any product: ${andList(silent)}.`)}</p>` : ''}
<p class="pl-note">Values are for the colour each sheet tested; pigment can change them.</p>
${refs.length ? `<section class="pl pl--ref" data-group="reference" data-section="reference" aria-labelledby="ref-h" style="--pl-cols: ${template}"><h2 id="ref-h">Reference specimens and studies</h2><p class="pl-note">${esc(`${refs.length === 1 ? 'A resin or study specimen' : `${plural(refs.length, 'resin or study specimen')}`}, not ${refs.length === 1 ? 'a product' : 'products'} you can buy.`)}</p><div class="pl-body">${refList}</div></section>` : ''}
${jsonIsland('pl-words', words)}`;
  const n = all.reduce((k, r) => { const o = records.get(r.id); return k + o.ms.length + o.profiles.length + o.statements.length + o.specimen.length + o.environment.length + o.listings.length; }, 0);
  const html = documentShell({
    kind: 'products',
    title: `${m.name} products: ${BRAND}`,
    description: `Every ${m.name} product: ${count(rows.length, 'product')} from ${plural(makers, 'maker')}, each with its published values, print settings, price, statements and documents.`,
    stamps: env.stamps, material: m.id,
    crumbs: [...(env.links?.index ? [{ href: env.links.index, words: 'Materials' }] : []), { href: `${m.id}.html`, words: ident.primary }, { href: productsHref(m.id), words: 'Products' }],
    sections: [{ id: 'top', title: 'Products' }, ...(refs.length ? [{ id: 'ref-h', title: 'Reference specimens and studies' }] : [])],
    hereLabel: '',
    tabs: { overview: { href: `${m.id}.html`, words: `${ident.primary} overview` }, index: env.links?.index ?? null },
    returnHref: selectorLink(c, env),
    methodHref: env.methodHref,
    body,
    footer: colophon(c, env, 'products'),
  });
  return { path: `materials/${productsHref(m.id)}`, html, stats: { rows: n, products: rows.length, references: refs.length } };
}
