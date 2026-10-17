// A product's card on its material's Products page: everything on file about one product, the records each in exactly
// one place (data-rec, the record's ID; a measurement is an anchor too, id="V…", so a figure's dot and an old records
// link land on it). Its published values as its documents publish them, each with its conditions, its document and
// page linked to the original, and whether the Overview uses it and why not; its print settings with where each comes
// from, then its print profiles in their documents' words; its price and listings; its maker's statements; its
// environment statements; the documents behind it (named, not records: those are listed once, in the Overview's
// Sources).
//
// Values are printed exactly as published (measurements[].raw); every word is the shared words' (material-words.js,
// labels.js, format.js) or content's card labels (docs/audits/2026-10-17-pages-reimagined/content/PROPOSAL.md).

import { esc, count } from '../html.js';
import { fmtNumber, dryingWords } from '../../js/ui/format.js';
import { STATUS_WORDS, propertyName, whyOne, envVerdictWords } from '../../js/ui/labels.js';
import { tabProperties, productNameOrId, sourceName, originalOf, stated, productDocuments, toughenedClaim, isProduct, isNamedOnly } from '../../js/ui/material-facts.js';
import { settingWords, annealWords, outOfMedianWords, foreignPriceWords, envConditionWords, andList, plural } from '../../js/ui/material-words.js';
import { orientationWords, specimenWords, standardWords, conditionChipList } from '../records/common.js';
import { readerText } from '../sections/common.js';

const DOMAINS = [['Mechanical', 'mechanical'], ['Thermal', 'thermal'], ['Physical', 'physical']];

/** The value exactly as its document publishes it: the sheet's own text and unit (measurements[].raw), or why none. */
export function publishedText(x) {
  const raw = x.raw ?? {};
  const v = String(raw.value ?? '').trim();
  if (x.numeric || x.qualitative) {
    if (!v) return fmtNumber(x.value, x.unit);
    const unit = stated(raw.unit) && raw.unit !== 'Dimensionless' && !v.includes(raw.unit) ? ` ${raw.unit}` : '';
    return `${v}${unit}`;
  }
  return STATUS_WORDS[x.dataStatus] ?? (stated(v) && v !== 'N/A' ? v : 'named, no value given');
}

/**
 * A locator or a record's note as a reader is shown it (sections/common.js readerText decides what is reader text): each
 * part ("p. 1: Tensile Strength - Z (G020-44)"; "Enclosure read with its row whole (m375)") loses a parenthesis that
 * names the project's own records; a part that names a place in the document keeps that place, and a part that is
 * otherwise about the records (a reviewer's note) is the maintainers' and is left off.
 */
export function readerLocator(text) {
  if (!stated(text)) return '';
  return String(text).split(/;\s*/).map((part) => {
    if (readerText(part)) return part;
    const kept = part.replace(/\s*\(([^()]*)\)/g, (m, inner) => (readerText(inner) ? m : '')).trim();
    return /^(p\.|pp\.|page|table|tab\.|section|fig)/i.test(kept) && readerText(kept) ? kept : null;
  }).filter(Boolean).join('; ');
}

/**
 * A document by name, linked to its original where one can be opened, with the place in it. A record citing two
 * documents ("R-H2C-SPECS; H2C-WIKI") names each; a document recorded with no name a reader could look for is said so.
 */
export function documentRef(c, sid, locator = '') {
  const one = (id) => {
    const s = c.sourceById.get(id);
    const n = sourceName(s, id);
    const name = esc(readerText(n) ? n : 'a document with no title recorded');
    const o = originalOf(s);
    return o && !o.local ? `<a href="${esc(o.url)}" rel="noopener" target="_blank">${name}</a>` : name;
  };
  const place = readerLocator(locator);
  return `<span class="doc" data-doc="${esc(sid)}">${String(sid).split(/;\s*/).filter(Boolean).map(one).join('; ')}${place ? `<small>${esc(place)}</small>` : ''}</span>`;
}

/** Words the shared sentences use that a reader of the pages is given in content's words (the drawer keeps its own). */
const PAGE_WORDS = [[/\bspecial formulation\b/g, 'added filler or additive'], [/\ba reference grade, not a product\b/g, 'a reference specimen, not a product for sale']];
const pageWords = (t) => PAGE_WORDS.reduce((x, [re, w]) => x.replace(re, w), String(t ?? ''));

/**
 * Why the Overview does not count a value, by the build's reason (material-facts.js notDrawnWhy, drawnIndex's lines),
 * in the reader's words; the drawer keeps its own (labels.js WHY_ONE). No project word, the reasons' meaning kept.
 */
const NOT_COUNTED = {
  held: 'held back', noNumber: 'no number given', implausible: 'physically implausible as published', moulded: 'measured on a moulded bar',
  resin: 'the resin supplier\'s value, not a printed part', film: 'measured on film', filament: 'measured on a filament strand',
  offRecipe: 'printed at a setting the product is not meant for', partialInfill: 'printed below 100 % infill', notPrinted: 'not on a printed bar',
  conditioned: 'measured after moisture conditioning', annealed: 'annealed; the as-printed value is in it', unnotched: 'unnotched', notched: 'notched',
  notch: 'notch not stated', cold: 'tested below room temperature', hot: 'tested above room temperature', standard: 'to another standard',
  direction: 'measured on a bar in another orientation', unstatedDirection: 'no orientation stated', load: 'at another test load',
  unstatedLoad: 'no test load stated', second: 'another value of this product is in it', retired: 'a product no longer listed',
  reference: 'a reference specimen, not a product for sale',
  // A value drawn but kept out of the median, by the comparison's reason.
  variant: 'added filler or additive', toughened: 'sold as toughened, set apart',
};

/**
 * Whether the Overview's median counts a measurement: "in the median", "not in the median: <why>", or nothing where no
 * figure draws its property. `ix` is records/measurements.js drawnIndex.
 */
function useWords(x, ix) {
  const why = ix.why(x);
  if (why === 'none') return '';
  if (why === 'named') return 'not in the median: the only value of its test, shown as published';
  if (why !== 'drawn') {
    if (why.startsWith('unit:')) return `not in the median: in ${why.slice(5)}`;
    if (why.startsWith('property:')) return 'listed under other properties';
    return `not in the median: ${NOT_COUNTED[why] ?? pageWords(whyOne(why))}`;
  }
  const lines = ix.lines.get(x.id) ?? [];
  const o = lines.find((l) => l.reason);
  if (!lines.length || !o) return 'in the median';
  if (o.reason === 'as-published') return `not in the median: ${o.h?.direction ? 'no orientation stated' : 'no test load stated'}`;
  return `not in the median: ${NOT_COUNTED[o.reason] ?? pageWords(outOfMedianWords(o.reason, o.h) ?? o.reason)}`;
}

/** A measurement's orientation or load beside its property's name ("XY", "at 0.45 MPa"). */
function aspect(x) {
  const o = orientationWords(x);
  const load = x.thermal?.loadStated && Number.isFinite(x.thermal.loadMPa) ? `at ${fmtNumber(x.thermal.loadMPa)} MPa` : '';
  return [o && o !== 'not stated' ? o : o ? 'orientation not stated' : '', load].filter(Boolean).join(', ');
}

/**
 * The product's measurements, grouped by the document they were read from: the document once as the group's head, with
 * the conditions every value in it shares (dried, annealed at 55 °C for 8 h, its print settings) and the other document
 * that publishes the same values, then a row per value: its property, the value as published with the sheet's row
 * label beneath it, only the conditions that differ, and whether the Overview's median counts it. A value its document
 * names without giving one is listed in a quiet line at the group's end. Each row and name carries its record's ID; a
 * value folded into the same value of another document keeps its ID on the row it joins.
 */
function valuesTable(c, g, ms, ix) {
  if (!ms.length) return '<p class="pc-none">No value is on file for this product.</p>';
  const order = new Map(DOMAINS.flatMap(([tab]) => tabProperties(tab, c.m)).map((p, i) => [p, i]));
  const dir = { XY: 0, Z: 1 };
  const byProperty = (a, b) => (order.get(a.property) ?? 1e9) - (order.get(b.property) ?? 1e9) || a.property.localeCompare(b.property)
    || (dir[a.direction] ?? 2) - (dir[b.direction] ?? 2) || (a.thermal?.loadMPa ?? 0) - (b.thermal?.loadMPa ?? 0) || (a.id < b.id ? -1 : 1);
  const perDoc = new Map();
  for (const x of ms) perDoc.set(x.sourceId, (perDoc.get(x.sourceId) ?? 0) + 1);
  // One value published alike in two documents (two versions of a sheet) is one row: the row kept is the one the
  // Overview counts, else the one from the document that gives most.
  const same = (x) => [x.property, x.direction, x.thermal?.loadMPa ?? '', x.notch ?? '', x.operator ?? '', x.value, x.unit, x.interval?.lo ?? '', x.interval?.hi ?? ''].join('|');
  const twins = new Map();
  for (const x of ms) if (x.numeric) (twins.get(same(x)) ?? twins.set(same(x), []).get(same(x))).push(x);
  const also = new Map();
  const folded = new Set();
  for (const list of twins.values()) {
    if (list.length < 2 || new Set(list.map((x) => x.sourceId)).size < 2) continue;
    const keep = [...list].sort((a, b) => (ix.why(b) === 'drawn') - (ix.why(a) === 'drawn') || perDoc.get(b.sourceId) - perDoc.get(a.sourceId) || (a.id < b.id ? -1 : 1))[0];
    const rest = list.filter((x) => x !== keep && x.sourceId !== keep.sourceId);
    if (!rest.length) continue;
    also.set(keep.id, rest);
    rest.forEach((x) => folded.add(x.id));
  }
  const docs = new Map();
  for (const x of [...ms].sort(byProperty)) if (!folded.has(x.id)) (docs.get(x.sourceId) ?? docs.set(x.sourceId, []).get(x.sourceId)).push(x);
  const groups = [...docs].sort((a, b) => b[1].length - a[1].length);
  const docName = (sid) => { const n = sourceName(c.sourceById.get(sid), sid); return readerText(n) ? n : 'another document'; };
  const body = groups.map(([sid, all]) => {
    const named = all.filter((x) => isNamedOnly(x));
    const xs = all.filter((x) => !isNamedOnly(x));
    // The conditions most of the group's values share (three in four or more), said once in its head: "Unless a row
    // says otherwise". A row that has them all shows only its other conditions; a row that lacks one of them shows its
    // own conditions in full. Chips are compared by what they say (their label), the first's own words kept in the head.
    const label = (ch) => ch.replace(/<span>[\s\S]*<\/span>/, '').replace(/<[^>]+>/g, '').trim();
    const chips = new Map(xs.map((x) => [x.id, conditionChipList(x)]));
    const most = (n) => xs.length > 2 && n * 4 >= xs.length * 3;
    const chipCount = new Map();
    for (const x of xs) for (const l of new Set(chips.get(x.id).map(label))) chipCount.set(l, (chipCount.get(l) ?? 0) + 1);
    const sharedLabels = [...chipCount].filter(([, n]) => most(n)).map(([l]) => l);
    const shared = sharedLabels.map((l) => chips.get(xs.find((x) => chips.get(x.id).some((ch) => label(ch) === l)).id).find((ch) => label(ch) === l));
    const specCount = new Map();
    for (const x of xs) specCount.set(specimenWords(x), (specCount.get(specimenWords(x)) ?? 0) + 1);
    const sharedSpecimen = [...specCount].find(([, n]) => most(n))?.[0] ?? null;
    const sharedSpec = sharedSpecimen ?? '';
    const standard = (x) => standardWords(x) ?? 'no standard stated';
    // The head's conditions and its specimen are each taken as read where a row has them: a row printed on another
    // specimen names it, a row that lacks one of the head's conditions shows its own in full.
    const hasChips = (x) => sharedLabels.every((l) => chips.get(x.id).some((ch) => label(ch) === l));
    const sameSpecimen = (x) => !sharedSpecimen || specimenWords(x) === sharedSpecimen;
    const spec = (x) => (sameSpecimen(x) ? standard(x) : `${specimenWords(x)}, ${standard(x)}`);
    // A condition the row's own locator already says in the sheet's words ("Impact Strength (X-Y) — notched") is not
    // said twice.
    const inWords = (where, ch) => {
      const l = label(ch).toLowerCase();
      if (!where || !l) return false;
      const w = where.toLowerCase();
      for (let at = w.indexOf(l); at >= 0; at = w.indexOf(l, at + 1)) {
        if (!/[a-z]/.test(w[at - 1] ?? '') && !/[a-z]/.test(w[at + l.length] ?? '')) return true;
      }
      return false;
    };
    // The other documents that publish these values too, named once for the group.
    const alsoDocs = [...new Set(xs.flatMap((x) => (also.get(x.id) ?? []).map((y) => y.sourceId)))];
    let last = null;
    const rows = xs.map((x) => {
      const sameProp = x.property === last;
      last = x.property;
      const tags = [x.quarantined ? 'held back' : null, x.implausible ? 'physically implausible' : null, x.corrected ? 'transcription corrected' : null].filter(Boolean);
      const where = readerLocator(x.locator);
      const own = (hasChips(x) ? chips.get(x.id).filter((ch) => !sharedLabels.includes(label(ch))) : chips.get(x.id)).filter((ch) => !inWords(where, ch));
      const folds = (also.get(x.id) ?? []).map((y) => `<span class="vh" id="${esc(y.id)}" data-rec="${esc(y.id)}">${esc(`also in ${docName(y.sourceId)}`)}</span>`).join('');
      return `<tr id="${esc(x.id)}" data-rec="${esc(x.id)}"${sameProp ? ' class="same"' : ''}>`
        + `<th scope="row">${sameProp ? `<span class="vh">${esc(propertyName(x.property))}</span>` : esc(propertyName(x.property))}${aspect(x) ? ` <small class="pc-asp">${esc(aspect(x))}</small>` : ''}</th>`
        + `<td class="pc-v">${esc(publishedText(x))}${tags.map((t) => `<span class="tg">${esc(t)}</span>`).join('')}${where ? `<small>${esc(where)}</small>` : ''}${folds}</td>`
        + `<td class="pc-c">${spec(x) ? `<span>${esc(spec(x))}</span>` : ''}${own.join('')}</td>`
        + `<td class="pc-u">${esc(useWords(x, ix))}</td></tr>`;
    }).join('');
    const head = `<tr class="pc-doc"><th scope="rowgroup" colspan="4">${documentRef(c, sid)}<small class="pc-doc-n">${esc(plural(xs.length, 'value'))}</small>`
      + `${alsoDocs.length ? `<span class="pc-doc-also">${esc(`The same values also in ${andList(alsoDocs.map(docName))}.`)}</span>` : ''}`
      + `${sharedSpec || shared.length ? `<span class="pc-doc-cond"><span>${esc(`Unless a row says otherwise: ${sharedSpec || 'as below'}`)}</span>${shared.join('')}</span>` : ''}</th></tr>`;
    const quiet = named.length ? `<tr class="pc-named"><td colspan="4">Also named without a value: ${named.map((x) => `<span id="${esc(x.id)}" data-rec="${esc(x.id)}">${esc(propertyName(x.property).toLowerCase())}</span>`).join(', ')}.</td></tr>` : '';
    return `<tbody data-doc="${esc(sid)}">${head}${rows}${quiet}</tbody>`;
  }).join('');
  return `<table class="pc-t"><thead><tr><th scope="col">Property</th><th scope="col">As published</th><th scope="col">Conditions</th><th scope="col">On the Overview</th></tr></thead>${body}</table>`;
}

/** Where a product's print setting was read, in content's words. */
function originWords(c, from) {
  if (!from) return 'own data sheet';
  if (from.origin === 'guide') return 'Bambu Lab Filament Guide';
  if (from.origin === 'twin') return `${productNameOrId(c.gradeById.get(from.gradeId) ?? { id: from.gradeId })}'s data sheet, shared`;
  return from.label ?? 'own data sheet';
}

/** The settings the product's print gate holds (grades[].print), each with where it was read. */
function settingsList(c, g) {
  const p = g.print;
  if (!p || (!p.profileIds?.length && !Object.keys(p.from ?? {}).length)) return '<p class="pc-none">No print settings on file for this product.</p>';
  const from = p.from ?? {};
  // A setting no document gives is "not stated" (a measured value is "not published"), and has no origin to name.
  const said = (v) => (v === 'not published' ? 'not stated' : v);
  const row = (label, value, f) => `<div><dt>${esc(label)}</dt><dd>${esc(said(value))}${said(value) === 'not stated' ? '' : `<small>${esc(originWords(c, f))}</small>`}</dd></div>`;
  const rows = [
    row('Nozzle', settingWords(p.nozzle), from.nozzle),
    row('Bed', settingWords(p.bed), from.bed),
    row('Heated chamber', settingWords(p.chamber), from.chamber),
    row('Drying', dryingWords(p.drying), from.drying),
    row('Hardened nozzle', p.hardenedNozzle === true ? 'needed' : p.hardenedNozzle === false ? 'not needed' : 'not stated', from.hardenedNozzle),
  ];
  if (p.anneal?.length) rows.push(row('Annealing', annealWords(p.anneal).join('; '), from.anneal));
  return `<dl class="pc-set">${rows.join('')}</dl>`;
}

/** The product's print profiles, in their documents' own words. */
function profilesList(c, ps) {
  if (!ps.length) return '';
  const words = (p) => [['Nozzle', p.nozzle?.text], ['Bed', p.bed?.text], ['Chamber', p.chamber?.text], ['Drying', p.drying?.text]]
    .filter(([, t]) => stated(t)).map(([k, t]) => `${k} ${String(t).trim()}`).join('; ');
  return `<details class="pc-more"><summary>${esc(`${ps.length === 1 ? 'Its print profile' : `Its ${plural(ps.length, 'print profile')}`}, in the documents' words`)}</summary><ul class="pc-list">`
    + ps.map((p) => `<li data-rec="${esc(p.id)}"><span>${esc(words(p) || 'No temperature stated')}</span>${documentRef(c, p.sourceId, p.locator)}</li>`).join('')
    + '</ul></details>';
}

/**
 * The product's price and its listings in the sample, the two counts said so they add up: the price is the median of
 * the listings used for it (regular prices per kilogram, Canadian before foreign), and the fold says how many listings
 * there are and why the others are not used.
 */
function priceBlock(c, g, listings) {
  const v = g.headline?.priceCADkg;
  const used = listings.filter((r) => r.used);
  const why = { 'no-regular': 'no regular price per kilogram recorded', another: 'a Canadian listing is used instead', quarantined: 'set aside' };
  const left = new Map();
  for (const r of listings) if (!r.used) { const w = why[r.unused] ?? 'not used'; left.set(w, (left.get(w) ?? 0) + 1); }
  const n = v?.observations ?? used.length;
  const head = v
    ? `<p class="pc-price"><b>${esc(fmtNumber(v.value))} CAD/kg</b><small>${esc(n === 1 ? 'its one regular price in the sample' : `the median of its ${fmtNumber(n)} regular prices in the sample`)}</small></p>`
    : '<p class="pc-none">Not in the price sample.</p>';
  if (!listings.length) return head;
  const summary = `${plural(listings.length, 'listing')}${left.size ? `: ${[used.length ? `${fmtNumber(used.length)} in its price` : null, ...[...left].map(([w, k]) => `${fmtNumber(k)} with ${w}`.replace(/with set aside/, 'set aside').replace(/with a Canadian/, 'where a Canadian'))].filter(Boolean).join(', ')}` : ''}`;
  const li = listings.map((r) => {
    const p = r.p;
    const price = r.perKg != null ? `${fmtNumber(r.perKg)} CAD/kg` : r.salePerKg != null ? `${fmtNumber(r.salePerKg)}${r.currency !== 'CAD' ? ` ${r.currency}` : ''} per kg, sale price` : 'no price';
    const raw = r.unused === 'quarantined' ? '' : r.unused ? '' : r.converted ? foreignPriceWords(p) : '';
    const note = readerText(raw) ? raw : '';
    const shop = /^https?:\/\//i.test(p.url ?? '') ? `<a href="${esc(p.url)}" rel="noopener" target="_blank">${esc(p.retailer)}</a>` : esc(p.retailer);
    return `<li data-rec="${esc(r.id)}"><span>${shop}: ${esc(price)}${stated(p.variant) ? `<small>${esc(p.variant)}</small>` : ''}</span>`
      + `<small>${esc([r.used ? 'in its price' : `not used: ${why[r.unused] ?? 'not in its price'}`, note, p.accessDate ? `seen ${p.accessDate}` : ''].filter(Boolean).join('; '))}</small></li>`;
  }).join('');
  return `${head}<details class="pc-more"><summary>${esc(summary)}</summary><ul class="pc-list">${li}</ul></details>`;
}

/** The maker's statements about the product, in its own words. */
function statementsList(c, ks) {
  if (!ks.length) return '';
  return `<ul class="pc-list pc-q">${ks.map((k) => `<li data-rec="${esc(k.id)}"><span class="pc-topic">${esc(k.topic)}</span><q>${esc(k.text)}</q>${documentRef(c, k.sourceId, k.locator)}</li>`).join('')}</ul>`;
}

/** How the product's test bars were made, in its documents' words (environment statements of the specimen-prep category). */
function specimenList(c, es) {
  if (!es.length) return '';
  return `<ul class="pc-list pc-q">${es.map((e) => `<li data-rec="${esc(e.id)}"><q>${esc(e.finding)}</q>${documentRef(c, e.sourceId, e.locator)}</li>`).join('')}</ul>`;
}

/** The documents' statements about the product's chemical and environmental behaviour. */
function environmentList(c, es) {
  if (!es.length) return '';
  return `<ul class="pc-list pc-q">${es.map((e) => `<li data-rec="${esc(e.id)}"><span class="pc-topic">${esc(e.categoryLabel ?? e.domain ?? '')}: ${esc(envVerdictWords(e.verdict))}</span>`
    + `<q>${esc(e.finding)}</q>${envConditionWords(e, e.categoryLabel) ? `<small>${esc(envConditionWords(e, e.categoryLabel))}</small>` : ''}${documentRef(c, e.sourceId, e.locator)}</li>`).join('')}</ul>`;
}

/** What a product is beyond its name: a data sheet it shares, the maker's toughened claim, a special formulation. */
export function productNotes(c, g, twins) {
  const t = toughenedClaim(g, c);
  return [
    twins.length ? `Data sheet shared with ${andList(twins)}: their values are one table, recorded once.` : null,
    isProduct(g) ? null : 'A resin or study reference, not a product you can buy.',
    g.variant ? `Modified: ${pageWords(g.variant)}. Its values are kept out of the material's medians.` : null,
    t ? `Sold as toughened or impact-modified: "${t.statement?.text ?? ''}"${t.where ? ` (${t.where})` : ''}. The maker's statement, not a test result.` : null,
  ].filter(Boolean);
}

/**
 * The card. `own` holds the product's records: { ms, profiles, statements, specimen, environment, listings }; `twins` the
 * products it shares a data sheet with; `ix` drawnIndex(c).
 */
export function productCard(c, g, own, twins, ix) {
  const notes = productNotes(c, g, twins);
  const docs = productDocuments(c, g);
  const block = (html, wide = false) => `<div class="pc-block${wide ? ' pc-block--wide' : ''}">${html}</div>`;
  const side = [
    block(`<h3>Print settings</h3>${settingsList(c, g)}${profilesList(c, own.profiles)}`),
    block(`<h3>Price</h3>${priceBlock(c, g, own.listings)}${docs.length ? `<h3>${esc(docs.length === 1 ? 'Its document' : `Its ${count(docs.length, 'document')}`)}</h3><ul class="pc-list pc-docs">${docs.map((sid) => `<li>${documentRef(c, sid)}</li>`).join('')}</ul>` : ''}`),
    own.statements.length || own.specimen.length || own.environment.length ? block(`${own.statements.length ? `<details class="pc-says"><summary>${esc(`What the maker says (${fmtNumber(own.statements.length)})`)}</summary>${statementsList(c, own.statements)}</details>` : ''}`
      + `${own.specimen.length ? `<details class="pc-says"><summary>${esc(`Specimen preparation (${fmtNumber(own.specimen.length)})`)}</summary>${specimenList(c, own.specimen)}</details>` : ''}`
      + `${own.environment.length ? `<details class="pc-says"><summary>${esc(`Chemicals and environment (${fmtNumber(own.environment.length)})`)}</summary>${environmentList(c, own.environment)}</details>` : ''}`, true) : '',
  ].filter(Boolean).join('');
  return `<div class="pcard">
<div class="pc-head"><p class="pc-name">${esc(productNameOrId(g))}${stated(g.manufacturer) ? `<small>${esc(g.manufacturer)}</small>` : ''}</p>${notes.map((t) => `<p class="pc-note">${esc(t)}</p>`).join('')}</div>
<div class="pc-cols">
<div class="pc-main"><h3>Published values</h3>${valuesTable(c, g, own.ms, ix)}</div>
<div class="pc-side">${side}</div>
</div>
</div>`;
}

