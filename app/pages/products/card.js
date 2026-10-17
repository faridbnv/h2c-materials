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
import { tabProperties, productNameOrId, sourceName, originalOf, stated, productDocuments, toughenedClaim, isProduct } from '../../js/ui/material-facts.js';
import { settingWords, annealWords, outOfMedianWords, noPriceWords, foreignPriceWords, UNUSED_WORDS, envConditionWords, andList, plural } from '../../js/ui/material-words.js';
import { orientationWords, specimenWords, standardWords, conditionChips } from '../records/common.js';
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
 * Whether the Overview uses a measurement, in content's words: "In the median", "Shown, not in the median: {why}",
 * "Not shown: {why}", "Shown as published (the only value of its test)"; nothing where no figure draws its property.
 * `ix` is records/measurements.js drawnIndex (the drawer's comparisons, material-facts.js notDrawnWhy).
 */
function useWords(x, ix) {
  const why = ix.why(x);
  if (why === 'none') return '';
  if (why === 'named') return 'Shown as published (the only value of its test)';
  if (why !== 'drawn') return pageWords(`Not shown: ${whyOne(why)}`);
  const reasons = (ix.lines.get(x.id) ?? []).map((o) => (o.reason ? outOfMedianWords(o.reason, o.h) : null));
  if (reasons.length && reasons.every((r) => r === null)) return 'In the median';
  const r = reasons.find(Boolean);
  return r ? pageWords(`Shown, not in the median: ${r}`) : 'In the median';
}

/** A measurement's orientation or load beside its property's name ("XY", "at 0.45 MPa"). */
function aspect(x) {
  const o = orientationWords(x);
  const load = x.thermal?.loadStated && Number.isFinite(x.thermal.loadMPa) ? `at ${fmtNumber(x.thermal.loadMPa)} MPa` : '';
  return [o && o !== 'not stated' ? o : o ? 'orientation not stated' : '', load].filter(Boolean).join(', ');
}

/**
 * The product's measurements, grouped by the document they were read from (its name, linked to the original, once as
 * the group's head), each group's rows by property in the registry's order: the value as published with the sheet's
 * row label beneath it, its conditions, and whether the Overview uses it. Each row carries its record's ID.
 */
function valuesTable(c, g, ms, ix) {
  if (!ms.length) return '<p class="pc-none">No value is on file for this product.</p>';
  const order = new Map(DOMAINS.flatMap(([tab]) => tabProperties(tab, c.m)).map((p, i) => [p, i]));
  const dir = { XY: 0, Z: 1 };
  const byProperty = (a, b) => (order.get(a.property) ?? 1e9) - (order.get(b.property) ?? 1e9) || a.property.localeCompare(b.property)
    || (dir[a.direction] ?? 2) - (dir[b.direction] ?? 2) || (a.thermal?.loadMPa ?? 0) - (b.thermal?.loadMPa ?? 0) || (a.id < b.id ? -1 : 1);
  // Documents in the order of the first value each gave, most values first where they tie on that.
  const docs = new Map();
  for (const x of [...ms].sort(byProperty)) (docs.get(x.sourceId) ?? docs.set(x.sourceId, []).get(x.sourceId)).push(x);
  const groups = [...docs].sort((a, b) => b[1].length - a[1].length);
  const body = groups.map(([sid, xs]) => {
    let last = null;
    const rows = xs.map((x) => {
      const same = x.property === last;
      last = x.property;
      const std = standardWords(x);
      const tags = [x.quarantined ? 'held back' : null, x.implausible ? 'physically implausible' : null, x.corrected ? 'transcription corrected' : null].filter(Boolean);
      return `<tr id="${esc(x.id)}" data-rec="${esc(x.id)}"${same ? ' class="same"' : ''}>`
        + `<th scope="row">${same ? `<span class="vh">${esc(propertyName(x.property))}</span>` : esc(propertyName(x.property))}${aspect(x) ? `<small>${esc(aspect(x))}</small>` : ''}</th>`
        + `<td class="pc-v">${esc(publishedText(x))}${tags.map((t) => `<span class="tg">${esc(t)}</span>`).join('')}${readerLocator(x.locator) ? `<small>${esc(readerLocator(x.locator))}</small>` : ''}</td>`
        + `<td class="pc-c"><span>${esc(specimenWords(x))}, ${esc(std ?? 'no standard stated')}</span>${conditionChips(x)}</td>`
        + `<td class="pc-u">${esc(useWords(x, ix))}</td></tr>`;
    }).join('');
    return `<tbody data-doc="${esc(sid)}"><tr class="pc-doc"><th scope="rowgroup" colspan="4">${documentRef(c, sid)}<small class="pc-doc-n">${esc(plural(xs.length, 'value'))}</small></th></tr>${rows}</tbody>`;
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

/** The product's price and its listings in the sample. */
function priceBlock(c, g, listings) {
  const v = g.headline?.priceCADkg;
  const head = v ? `<p class="pc-price"><b>${esc(fmtNumber(v.value))} CAD/kg</b>${v.observations ? `<small>${esc(`median of ${plural(v.observations, 'listing')}`)}</small>` : ''}</p>` : '<p class="pc-none">Not in the price sample.</p>';
  if (!listings.length) return head;
  const li = listings.map((r) => {
    const p = r.p;
    const price = r.perKg != null ? `${fmtNumber(r.perKg)} CAD/kg` : r.salePerKg != null ? `${fmtNumber(r.salePerKg)}${r.currency !== 'CAD' ? ` ${r.currency}` : ''} per kg, sale price` : 'no price';
    // A listing set aside is said so, without the reviewer's note on it; a reason in the project's words is left off.
    const raw = r.unused === 'quarantined' ? '' : r.unused === 'no-regular' ? noPriceWords(p) : r.unused ? UNUSED_WORDS[r.unused] : r.converted ? foreignPriceWords(p) : '';
    const why = readerText(raw) ? raw : '';
    const shop = /^https?:\/\//i.test(p.url ?? '') ? `<a href="${esc(p.url)}" rel="noopener" target="_blank">${esc(p.retailer)}</a>` : esc(p.retailer);
    return `<li data-rec="${esc(r.id)}"><span>${shop}: ${esc(price)}${stated(p.variant) ? `<small>${esc(p.variant)}</small>` : ''}</span>`
      + `<small>${esc([r.used ? 'in its price' : r.unused === 'quarantined' ? 'Not used: the listing was set aside' : 'not in its price', why, p.accessDate ? `seen ${p.accessDate}` : ''].filter(Boolean).join('; '))}</small></li>`;
  }).join('');
  return `${head}<details class="pc-more"><summary>${esc(plural(listings.length, 'listing'))}</summary><ul class="pc-list">${li}</ul></details>`;
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
  const block = (html) => `<div class="pc-block">${html}</div>`;
  const side = [
    block(`<h3>Print settings</h3>${settingsList(c, g)}${profilesList(c, own.profiles)}`),
    block(`<h3>Price</h3>${priceBlock(c, g, own.listings)}${docs.length ? `<h3>${esc(docs.length === 1 ? 'Its document' : `Its ${count(docs.length, 'document')}`)}</h3><ul class="pc-list pc-docs">${docs.map((sid) => `<li>${documentRef(c, sid)}</li>`).join('')}</ul>` : ''}`),
    own.statements.length || own.specimen.length || own.environment.length ? block(`${own.statements.length ? `<h3>Maker's statements</h3>${statementsList(c, own.statements)}` : ''}`
      + `${own.specimen.length ? `<h3>Specimen preparation</h3>${specimenList(c, own.specimen)}` : ''}`
      + `${own.environment.length ? `<h3>Chemicals and environment</h3>${environmentList(c, own.environment)}` : ''}`) : '',
  ].filter(Boolean).join('');
  return `<div class="pcard">
<div class="pc-head"><p class="pc-name">${esc(productNameOrId(g))}${stated(g.manufacturer) ? `<small>${esc(g.manufacturer)}</small>` : ''}</p>${notes.map((t) => `<p class="pc-note">${esc(t)}</p>`).join('')}</div>
<div class="pc-cols">
<div class="pc-main"><h3>Published values</h3>${valuesTable(c, g, own.ms, ix)}</div>
<div class="pc-side">${side}</div>
</div>
</div>`;
}

