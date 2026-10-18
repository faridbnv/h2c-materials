// A material's facts as the drawer and the material pages show them: selected, counted, grouped and summarised from the
// compiled database (dist/db.json), before any markup and before any sentence.
//
// Two renderers draw one material: the drawer (detail.js), in the selector, and the material pages (app/pages), built by
// the build in Node. They must show the same facts and never disagree, so every choice of what a section holds (which
// records, in which order, counted how, drawn or not and why) is made here, once, and each renderer only draws it. The
// words are material-words.js's and labels.js's; the numbers are format.js's; the scales are scales.js's.
//
// Display only: nothing here is stored and nothing decides. Every value is the build's (a product's own value and print
// gate, a material's spread) or counted from its records on every call; a number the build does not hold is compiled
// there, never worked out here alone. The engine (app/js/engine) never imports from this module. The registry must be
// in use first (registry.js useRegistry), and a renderer that names the H2C's limits sets them first (labels.js
// setH2cBaseline), as main.js does.

import { REGISTRY, propertiesInDomain, propertyApplies } from './registry.js';
import { printSpread } from './print-spread.js';
import { h2cLimit, materialName } from './labels.js';
import { limitOnScale } from './scales.js';
import { stated } from './text.js';
import { evidenceSummary } from '../engine/coverage.js';

export { stated };

// ------------------------------------------------------------------ products, documents and groups

/** A material's products and its reference grades (an "-R1" study or resin grade), apart. */
export const isProduct = (g) => !/-R\d+$/.test(g.id);

/** A product as a reader names it: its product, with its maker where the product name does not already carry it; '' where neither is stated. */
export const productName = (g) => {
  if (!g) return '';
  const product = stated(g.product) ? g.product : '';
  const maker = stated(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker;
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
};
/** A product's name, or its ID where nothing is stated: what a dot or a list names it by. */
export const productNameOrId = (g) => productName(g) || g.id;

/**
 * A source by what a reader knows it as, its publisher and title, rather than its ID. The drawer headed sources
 * "B-abs-filament-TDS" and ended every measurement with that code, which named nothing a reader could look for.
 */
/** A publisher as a reader is shown it: the database's own label for a reference it was given reads "Reference" (2026-10-18). */
export const publisherName = (p) => (p === 'User-supplied reference' ? 'Reference' : p);
export const sourceName = (s, id) => (s ? [publisherName(s.publisher), s.title].filter(stated).join(', ') || id : id);

/**
 * Where a source's original can be read: `{ url, kind: 'PDF' | 'web page', local: false }` for a link, `{ url, kind:
 * null, local: true }` for a path on the compiler's own disk (said, never linked), or null where none is recorded.
 */
export function originalOf(s) {
  const url = s?.url ?? '';
  if (/^https?:\/\//i.test(url)) return { url, kind: /\.pdf($|[?#])/i.test(url) ? 'PDF' : 'web page', local: false };
  return stated(url) ? { url, kind: null, local: true } : null;
}

/** Items grouped by a key in first-appearance order, the group of `first` moved to the front: [[key, items], …]. */
export function groupBy(list, keyOf, first = null) {
  const groups = new Map();
  for (const x of list) {
    const k = keyOf(x) ?? 'Not recorded';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  }
  const out = [...groups];
  if (first != null && groups.has(first)) out.sort((a, b) => (a[0] === first ? -1 : b[0] === first ? 1 : 0));
  return out;
}

/**
 * Grades by maker, `first` first. PLA has 198 grades from sixty-odd makers, and a flat list of them was a page a reader
 * scrolled past; a maker is one collapsed line until opened.
 */
export function groupByMaker(grades, first = null) {
  return groupBy(grades, (g) => g.manufacturer, first);
}

/** The maker a material's lists open on: the one whose product is most often its typical product (D83), else none. */
export function leadMaker(m, c) {
  const count = new Map();
  // The selectable headlines only: one drawn in the drawer alone (D139) does not move the maker a tab opens on.
  for (const h of REGISTRY.headlines.map((d) => m.headline?.[d.key])) {
    const maker = h?.typical && c.gradeById.get(h.typical.gradeId)?.manufacturer;
    if (maker) count.set(maker, (count.get(maker) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
}

// ------------------------------------------------------------------ the database, indexed once

const INDEX = new WeakMap();

/**
 * The database's lookups, built once per database object and kept while it lives: records by ID, a material's records
 * by material (in the database's order; profiles, grades and prices without the retired ones), statements by product,
 * and the Filament Guide's row by material. The database is read, never changed; a caller that changes it after the
 * first call must pass a new object.
 */
export function indexDb(db) {
  let ix = INDEX.get(db);
  if (ix) return ix;
  const byMaterial = (rows, keep = () => true) => {
    const out = new Map();
    for (const r of rows ?? []) if (keep(r)) (out.get(r.materialId) ?? out.set(r.materialId, []).get(r.materialId)).push(r);
    return out;
  };
  const knowHowByGrade = new Map();
  for (const k of db.knowHow ?? []) (knowHowByGrade.get(k.gradeId) ?? knowHowByGrade.set(k.gradeId, []).get(k.gradeId)).push(k);
  const guideByMaterial = new Map();
  for (const x of db.printGuide ?? []) for (const y of x.materials) if (!guideByMaterial.has(y.materialId)) guideByMaterial.set(y.materialId, x);
  ix = {
    materialById: new Map(db.materials.map((x) => [x.id, x])),
    gradeById: new Map(db.grades.map((g) => [g.id, g])),
    sourceById: new Map(db.sources.map((s) => [s.id, s])),
    evidenceById: new Map(db.evidence.map((e) => [e.id, e])),
    knowHowById: new Map((db.knowHow ?? []).map((k) => [k.id, k])),
    measurementsByMaterial: byMaterial(db.measurements),
    evidenceByMaterial: byMaterial(db.evidence),
    polymerEvidenceByMaterial: byMaterial(db.polymerEvidence),
    coverageByMaterial: byMaterial(db.coverage),
    profilesByMaterial: byMaterial(db.profiles, (p) => !p.retired),
    gradesByMaterial: byMaterial(db.grades, (g) => !g.retired),
    pricesByMaterial: byMaterial(db.prices, (p) => !p.retired),
    knowHowByGrade,
    guideByMaterial,
  };
  INDEX.set(db, ix);
  return ix;
}

/**
 * One material's facts, the context every function below reads (the drawer calls it `c`): null for a family entry or an
 * unknown ID. `ctx` is the selector's context (main.js buildContext), whose groups it reads where given; a page passes
 * none and reads the database's own, which are the same groups main.js builds. `evaluation` is the engine's answer for
 * the material (runSelection), `scenario` the question (its policy and chosen products). With neither, the material is
 * untested: tested false, evaluation null, chosen empty, policy null. `showEstimates` defaults to the context's.
 */
export function materialContext(db, materialId, { ctx = null, evaluation = null, scenario = null, showEstimates, highlight = null, highlightSource = null } = {}) {
  const ix = indexDb(db);
  const m = ix.materialById.get(materialId);
  if (!m || m.familyEntry) return null;
  const from = ctx ?? ix;
  const ms = from.measurementsByMaterial.get(m.id) ?? [];
  const ev = from.evidenceByMaterial.get(m.id) ?? [];
  // The base polymer's published behaviour, attached by the build where the material has no record of its own (D64).
  const poly = from.polymerEvidenceByMaterial?.get(m.id) ?? [];
  // A superseded coverage row is an audit trail; the later row that replaces it is shown.
  const cov = (from.coverageByMaterial.get(m.id) ?? []).filter((r) => r.status !== 'Superseded');
  const c = {
    m, ms, ev, poly, cov,
    profiles: ix.profilesByMaterial.get(m.id) ?? [],
    grades: ix.gradesByMaterial.get(m.id) ?? [],
    prices: ix.pricesByMaterial.get(m.id) ?? [],
    evaluation: evaluation ?? null,
    summary: evidenceSummary(m, db),
    db,
    guide: ix.guideByMaterial.get(m.id) ?? null,
    tested: !!evaluation?.results.length,
    highlight, highlightSource,
    showEstimates: showEstimates ?? !!ctx?.showEstimates,
    policy: scenario?.unknownPolicy ?? null,
    sourceById: ctx?.sourceById ?? ix.sourceById,
    evidenceById: ctx?.evidenceById ?? ix.evidenceById,
    materialById: ix.materialById,
    gradeById: ix.gradeById,
    chosen: new Set((scenario?.decisions ?? []).map((d) => d.gradeId)),
    msById: new Map(ms.map((x) => [x.id, x])),
    knowHowById: ix.knowHowById,
  };
  c.documents = documents(c);
  c.counts = tabCounts(c);
  return c;
}

/**
 * Every document a material's records cite, with what each gave: Map(sourceId → { ms: [measurements], profiles: n,
 * statements: n, environment: n, guide: bool, grades: Set(gradeId) }), in the order its records first cite it
 * (measurements, profiles, maker statements, environment statements, the guide). Sources had listed only the documents
 * behind a measurement, so a data sheet that gave a product's print settings or its maker's advice was named under that
 * product and nowhere else.
 */
export function documents(c) {
  const docs = new Map();
  const doc = (sid) => {
    if (!stated(sid)) return null;
    if (!docs.has(sid)) docs.set(sid, { ms: [], profiles: 0, statements: 0, environment: 0, guide: false, grades: new Set() });
    return docs.get(sid);
  };
  for (const x of c.ms) { const d = doc(x.sourceId); if (d) { d.ms.push(x); if (stated(x.gradeId)) d.grades.add(x.gradeId); } }
  for (const p of c.profiles) for (const sid of [p.sourceId, p.h2cSourceId]) { const d = doc(sid); if (d) { d.profiles++; if (stated(p.gradeId)) d.grades.add(p.gradeId); } }
  const own = new Set(c.grades.map((g) => g.id));
  for (const k of c.db.knowHow ?? []) if (own.has(k.gradeId)) { const d = doc(k.sourceId); if (d) { d.statements++; d.grades.add(k.gradeId); } }
  for (const e of c.ev) { const d = doc(e.sourceId); if (d) { d.environment++; if (stated(e.gradeId)) d.grades.add(e.gradeId); } }
  if (c.guide) { const d = doc(c.guide.sourceId); if (d) d.guide = true; }
  return docs;
}

/** The documents a product's values, settings and statements come from, by source ID, in Sources' order. */
export const productDocuments = (c, g) => [...c.documents].filter(([, d]) => d.grades.has(g.id)).map(([sid]) => sid);

/**
 * What each of the drawer's tabs holds, by its key: products and reference grades; mechanical and thermal measurement
 * records (those named without a value too); print profiles; environment statements, the resin's included; shop
 * listings; documents. Overview is null: it is not counted.
 */
export function tabCounts(c) {
  const mechanical = tabProperties('Mechanical', c.m), thermal = tabProperties('Thermal', c.m);
  return {
    Overview: null,
    Grades: c.grades.length,
    Mechanical: c.ms.filter((x) => mechanical.includes(x.property)).length,
    Thermal: c.ms.filter((x) => thermal.includes(x.property)).length,
    Printing: c.profiles.length,
    // What the tab lists. It used to count only the records in categories the filters use, so ABS read 8 over a tab
    // of 13 records and BVOH read 0 over one; the tab itself now says how many of them the filters can use. A
    // polymer-level record is listed there too, under its own heading, and is counted.
    Environment: c.ev.length + c.poly.length,
    Price: c.prices.length,
    // Documents, not measurements: Mechanical and Thermal count those.
    Evidence: (c.documents ?? documents(c)).size,
  };
}

/**
 * What a material is, for its header: its name and the name it is also called, its full name where it says more, its
 * base polymer (or family), its filler code (facets.reinforcement.value), how many products from how many makers, and
 * Bambu Lab's standing. material-words.js identityLine says it in a line.
 */
export function identity(m, c) {
  const products = c.grades.filter(isProduct);
  const name = materialName(m.name);
  return {
    primary: name.primary, aka: name.aka,
    fullName: stated(m.fullName) && m.fullName !== m.name ? m.fullName : null,
    base: m.basePolymer && m.basePolymer !== m.name ? m.basePolymer : m.family,
    reinforcement: m.facets?.reinforcement?.value ?? null,
    products: products.length,
    makers: new Set(products.map((g) => g.manufacturer).filter(stated)).size,
    h2cStatus: m.h2cStatus,
    excluded: !!m.excluded,
  };
}

// ------------------------------------------------------------------ measurements and their properties

// The Mechanical and Thermal tabs list the registry's properties in those domains (properties.csv),
// the same classification coverage uses. A property that applies only to some materials is listed
// only for them, so a PLA is never told it has "not measured" an elastomer's Shore hardness.
// A property replaced by another holds no values (the build refuses any use of it), so it is not one a material could
// be missing: PLA was told Izod strength was not published beside its Izod impact strength values.
/** The registered properties a tab (Mechanical or Thermal) lists for a material, in registry order; 'Physical' (a material
 *  page's section, not a drawer tab) lists the physical domain's. */
export const tabProperties = (tab, m) => propertiesInDomain(tab === 'Mechanical' ? 'mechanical' : tab === 'Physical' ? 'physical' : 'thermal')
  .filter((p) => propertyApplies(p, m) && !REGISTRY.properties.find((x) => x.name === p)?.replacedBy);

/** The coverage domains whose rows say why a tab is empty, by tab key. */
export const COVERAGE_FOR_TAB = {
  Mechanical: ['Mechanical', 'Sparse properties'],
  Thermal: ['Thermal', 'Sparse properties'],
  Printing: ['Print setup', 'H2C status'],
  Environment: ['Moisture / environmental', 'Post-processing / application'],
  Grades: ['Grades'],
  Price: ['Canadian price'],
  Overview: ['Identity'],
};

/** The coverage statuses a reader needs to see under Known gaps: what is missing, uncertain or contested. */
export const GAP_STATUS = new Set(['Gap', 'Limited comparability', 'Conflict', 'Quarantined', 'Partially resolved', 'Reviewed with limitations']);

/** The coverage rows that say why a tab or section is empty (its domains in COVERAGE_FOR_TAB), in the reviewer's words. */
export const emptyReasons = (c, tab) => c.cov.filter((r) => (COVERAGE_FOR_TAB[tab] ?? []).includes(r.domain));

/** A material's coverage rows, split: the known gaps (GAP_STATUS), and the reviewer's notes on settled domains (none derived). */
export const gapSplit = (cov) => ({ gaps: cov.filter((r) => GAP_STATUS.has(r.status)), notes: cov.filter((r) => !GAP_STATUS.has(r.status) && !r.derived) });

/**
 * The conditions a measurement is taken under that a source usually states once for a whole sheet, as [label, field].
 * Notes are kept apart: nearly all of them are the record's history ("Added 2026-09-17 (m39): re-read from the source
 * document"), which is for an auditor, so they sit under a collapsed "Record notes" rather than among the test conditions
 * (D124). READER_FIELDS are the ones a reader is shown.
 */
export const CONDITION_FIELDS = [
  ['Post-processing', 'postProcessing'], ['Test temperature', 'testTemperature'],
  ['Specimen print settings', 'printParameters'], ['Notes', 'notes'],
];
export const READER_FIELDS = CONDITION_FIELDS.filter(([, f]) => f !== 'notes');

/**
 * A property the sheet lists without a value. It is a record that the source names the property, not a measurement to
 * read, so it is one name on a line rather than an entry with its own conditions.
 */
export const isNamedOnly = (x) => !x.numeric && !x.qualitative && /^not published$/i.test(String(x.dataStatus ?? '').trim());

/** The order a property's values are listed in: numbers first, largest first. */
export const largestFirst = (a, b) => (b.numeric - a.numeric) || ((b.value ?? 0) - (a.value ?? 0));

/**
 * What a Mechanical or Thermal tab holds: the properties it lists, its records with a value (`rows`) and those named
 * without one (`named`), the properties no record names (`absent`), those with a value (`shown`, registry order), and the
 * domain's own known gaps (the rarely published properties are the `absent` list, said once).
 */
export function measuredIn(c, tab) {
  const properties = tabProperties(tab, c.m);
  const all = c.ms.filter((x) => properties.includes(x.property));
  const rows = all.filter((x) => !isNamedOnly(x));
  const present = new Set(all.map((r) => r.property));
  return {
    properties, all, rows,
    named: all.filter(isNamedOnly),
    absent: properties.filter((p) => !present.has(p)),
    shown: properties.filter((p) => rows.some((x) => x.property === p)),
    gaps: emptyReasons(c, tab).filter((r) => GAP_STATUS.has(r.status) && r.domain !== 'Sparse properties'),
  };
}

/**
 * One measurement, as its line shows it: the conditions its source states once for a block (`shared`, Map(field →
 * words), from sourceBlockFacts) said only where this one differs, or "not stated" where it states none; its notes,
 * or null where they are the block's; its value's kind ('number', 'words' with the source's own text, or 'status'
 * with its Data status); a bound's operator; its source and its product's name (null where none is named). `compact`
 * keeps the two short conditions, under a property heading.
 */
export function measurementFacts(x, c, { shared = new Map(), compact = false } = {}) {
  const more = (compact ? READER_FIELDS.slice(0, 2) : READER_FIELDS).flatMap(([k, f]) => {
    if (!shared.has(f)) return stated(x[f]) ? [[k, x[f]]] : [];
    if (!stated(x[f])) return [[k, 'not stated']];
    return String(x[f]).trim() === shared.get(f) ? [] : [[k, x[f]]];
  });
  return {
    x, more,
    notes: shared.get('notes') && String(x.notes ?? '').trim() === shared.get('notes') ? null : x.notes,
    // A qualitative result ("No break") is what the source said, so it is shown in its own words.
    value: x.numeric ? { kind: 'number' } : x.qualitative && x.raw?.value ? { kind: 'words', text: x.raw.value } : { kind: 'status', status: x.dataStatus },
    operator: x.operator === '>' || x.operator === '<' ? x.operator : null,
    source: c.sourceById.get(x.sourceId),
    product: productName(c.gradeById.get(x.gradeId)) || null,
  };
}

/**
 * One document of a material's Sources (from documents(c)): what it is and where to read it, which products it covers
 * (names), what it gave (counts), its values (`entries`) and the properties it names without one (`named`). A
 * condition most of its values state in the same words is said once (`shared`, Map(field → words), and `sharedFields`
 * the reader's): more than half of them and at least two, so ABS's annealing for 19 of 20 is said once. `exceptions`
 * says whether a value states otherwise.
 */
export function sourceBlockFacts(sid, d, c) {
  const s = c.sourceById.get(sid);
  const named = d.ms.filter(isNamedOnly);
  const entries = d.ms.filter((x) => !isNamedOnly(x));
  const common = (f) => {
    const n = new Map();
    for (const x of entries) if (stated(x[f])) n.set(String(x[f]).trim(), (n.get(String(x[f]).trim()) ?? 0) + 1);
    const [text, count] = [...n].sort((a, b) => b[1] - a[1])[0] ?? [];
    return count >= 2 && count > entries.length / 2 ? text : null;
  };
  const shared = new Map(CONDITION_FIELDS.map(([, f]) => [f, common(f)]).filter(([, t]) => t));
  return {
    sid, s, name: sourceName(s, sid),
    accessDate: stated(s?.accessDate) ? s.accessDate : null,
    original: originalOf(s),
    entries, named, shared,
    sharedFields: READER_FIELDS.filter(([, f]) => shared.has(f)),
    exceptions: entries.some((x) => [...shared].some(([f, t]) => f !== 'notes' && String(x[f] ?? '').trim() !== t)),
    covers: [...d.grades].map((id) => productName(c.gradeById.get(id)) || id),
    manyProducts: d.grades.size > 1,
    about: [s?.sourceNote, s?.accessNote].filter(stated).join(' '),
    gave: { values: d.ms.length ? entries.length : null, profiles: d.profiles, statements: d.statements, environment: d.environment, guide: d.guide },
  };
}

// ------------------------------------------------------------------ family guidance behind a pointer

/** An evidence record's ID as the tables write it. */
export const EVIDENCE_POINTER = /\bQ\d{5}\b/g;

/**
 * Prose fields that point at evidence records instead of saying something. For 47 materials the Best uses cell reads
 * "Family context in Q00282, Q00283, …": IDs of family-level records filed under the family's own material. Shown as
 * written, the drawer printed database plumbing under "Good for". The pointers are resolved here, and the data is left
 * as it is: a record whose topic is Best uses is the "Good for" text, the others are the family's guidance, each named
 * with the material it belongs to and its source, and a pointer that resolves to nothing is listed rather than dropped.
 */
export function resolvePointers(text, evidenceById) {
  const ids = [...new Set(String(text ?? '').match(EVIDENCE_POINTER) ?? [])];
  if (!ids.length) return null;
  const records = ids.map((id) => evidenceById.get(id)).filter(Boolean);
  const unresolved = ids.filter((id) => !evidenceById.has(id));
  // Whatever the cell says besides its pointers, if anything.
  const prose = String(text).replace(/family context in/i, '').replace(EVIDENCE_POINTER, '').replace(/^[\s,;.:]+|[\s,;:]+$/g, '').replace(/(\s*,\s*)+/g, ', ').trim();
  return { records, unresolved, prose: /[a-z]{3}/i.test(prose) ? prose : '' };
}

/**
 * A material's Best uses and Limitations, with their pointers resolved: each field's resolution (null where it holds
 * no pointer), the records that are Typical applications (`goodFor`) and the family's other guidance, the pointers to
 * nothing, the material each record belongs to (`owner(r)`, its name) and those materials in order (`owners`), and the
 * material's own limitations as text ('' where none).
 */
export function familyGuidanceFacts(m, c) {
  const fields = [resolvePointers(m.bestUses, c.evidenceById), resolvePointers(m.limitations, c.evidenceById)];
  const records = [...new Map(fields.flatMap((f) => f?.records ?? []).map((r) => [r.id, r])).values()];
  const owner = (r) => c.materialById.get(r.materialId)?.name ?? r.materialId;
  const guidance = records.filter((r) => !/^best uses$/i.test(r.topic));
  return {
    bestUses: fields[0],
    limitations: fields[1],
    goodFor: records.filter((r) => /^best uses$/i.test(r.topic)),
    guidance,
    unresolved: [...new Set(fields.flatMap((f) => f?.unresolved ?? []))],
    owner,
    owners: [...new Set(guidance.map(owner))],
    // What is true of this material. The caveat that is true of every material (method.csv, Transferable allowables) is
    // said once, not under each material's own limitations (D124).
    ownLimitations: fields[1] ? fields[1].prose : stated(m.limitations) ? m.limitations : '',
    // Whose words the Best uses prose is, where it is a statement on record about the material in general: PLA's is
    // Prusa Research's, which the material page quotes "after Prusa Research" (C10). Null where it is no record's.
    bestUsesFrom: !fields[0] && stated(m.bestUses) ? (c.ev ?? []).find((e) => !stated(e.gradeId) && sameWords(e.finding, m.bestUses)) ?? null : null,
  };
}
/** Two texts with the same words, case and punctuation aside. */
const sameWords = (a, b) => { const w = (t) => String(t ?? '').toLowerCase().replace(/\W+/g, ' ').trim(); return !!w(a) && w(a) === w(b); };

// ------------------------------------------------------------------ headlines drawn side by side (D133, D139)

/**
 * A material's products as its spread counts them for one headline (build/src/products.js, summarise): [{ g, v,
 * variant }], each with the value it publishes (grades[].headline[key]) and whether it is a special formulation, which
 * the median leaves out. A material whose every product is a declared variant is its variants; a product that reads a
 * variant sibling's sheet is set apart as the sibling is (D57, D89).
 */
export function spreadEntries(m, c, key) {
  const products = (m.gradeIds ?? []).map((id) => c.gradeById.get(id)).filter((g) => g && !g.retired);
  const variantOnly = products.length > 0 && products.every((g) => g.variant);
  return products.filter((g) => g.headline?.[key]).map((g) => {
    const v = g.headline[key];
    return { g, v, variant: !variantOnly && (!!g.variant || (v.from?.origin === 'twin' && !!c.gradeById.get(v.from.gradeId)?.variant)) };
  });
}

export const TOUGHENED = 'Toughened or impact-modified';
/** Whether a product is sold as toughened (product_claims.csv, D133): its own claim, or its sibling's where its value `v`
 *  reads the sibling's sheet (D89). */
export const soldToughened = (g, v, c) => ((v?.from?.origin === 'twin' ? c.gradeById.get(v.from.gradeId) : g)?.claims ?? []).some((x) => x.claim === TOUGHENED);
/**
 * A product's own claim to be toughened, with the maker's statement it rests on and where it is stated (its source and
 * locator, as words), or null. The product's name is never the reason (D133).
 */
export function toughenedClaim(g, c) {
  const claim = (g?.claims ?? []).find((x) => x.claim === TOUGHENED);
  if (!claim) return null;
  const k = c.knowHowById.get(claim.evidenceId);
  const where = k ? `${sourceName(c.sourceById.get(k.sourceId), k.sourceId)}${stated(k.locator) ? `, ${k.locator}` : ''}` : '';
  return { claim, statement: k ?? null, where };
}

/** A dot's marks: 'open' (no stated orientation or load), 'annealed', 'variant' (a special formulation), 'claimed' (sold as
 *  toughened, on a headline that says so); [] for a plain dot. */
export const dotMarks = (h, e, c) => [e.v.level === 'as-published' ? 'open' : '', e.v.anneal ? 'annealed' : '', e.variant ? 'variant' : '',
  h.toughened && soldToughened(e.g, e.v, c) ? 'claimed' : ''].filter(Boolean);

/**
 * Why a product's dot is not in its row's median, or null where it is: the build's split of the spread (products.js
 * summarise), a variant first ('variant'), then a value with no stated orientation or load ('as-published'), then one
 * sold as toughened where the headline sets those apart ('toughened'; only a comparable one is). `s` is the row's
 * materials[].summary entry. material-words.js outOfMedianWords says it.
 */
export function outOfMedian(h, e, s, c) {
  if (e.variant) return 'variant';
  if (e.v.level === 'as-published') return 'as-published';
  if (s?.claimed?.setApart && soldToughened(e.g, e.v, c)) return 'toughened';
  return null;
}

/** Z as a share of XY, per product: only where both its values are compared, from one document, of one property, in one state. */
export function shareOf(a, b, byKey, c) {
  if (!a.direction || !b.direction || a.direction === b.direction || a.valueProperties.join(';') !== b.valueProperties.join(';')) return null;
  const shares = [];
  for (const ea of byKey.get(a.key)) {
    const eb = byKey.get(b.key).find((x) => x.g.id === ea.g.id);
    if (!eb || ea.variant || eb.variant || ea.v.level !== 'comparable' || eb.v.level !== 'comparable' || !(ea.v.value > 0)) continue;
    const xa = c.msById.get(ea.v.measurementId), xb = c.msById.get(eb.v.measurementId);
    const schedule = (v) => (v.anneal ? `${v.anneal.tempC}:${v.anneal.hours}` : null);
    if (!xa || !xb || xa.property !== xb.property || xa.sourceId !== xb.sourceId || schedule(ea.v) !== schedule(eb.v)) continue;
    shares.push(eb.v.value / ea.v.value);
  }
  return shares.length ? shares : null;
}

// Why a record under a comparison is not drawn, as products.js assess asks it and in its order (ASSESS_ORDER; the test
// checks the two agree), from the typed fields only. A record one of the comparison's headlines refuses on its own words
// is counted by why; a resin supplier's value, refused by a headline with no bar to orient or load (a glass
// transition), is the resin's, not a moulded bar's.
//
// The other copy is ASSESS_ORDER in build/src/products.js, which cannot be bundled (its imports read the tables through
// node:path). They differ on purpose: this one adds 'resin' (a moulded value under a headline with no bar to orient or
// load), and lacks 'notConditioned' and 'notAnnealed', which assess returns only when asked about a state (D99), which a
// comparison never is. test/drawer-comparisons.test.js holds every record of every comparison against assess.
export const NOT_DRAWN_ORDER = ['noNumber', 'property', 'unit', 'implausible', 'moulded', 'resin', 'film', 'filament', 'offRecipe', 'partialInfill', 'notPrinted',
  'conditioned', 'annealed', 'unnotched', 'notched', 'notch', 'cold', 'hot', 'standard', 'direction', 'unstatedDirection', 'load', 'unstatedLoad'];
const UNSTATED_DIRECTIONS = new Set(['unknown', 'not-applicable']);
/** Why headline `h` refuses record `x` (a NOT_DRAWN_ORDER key, "unit:<unit>" for another unit), or null where it takes it. */
export function refusedBy(x, h, c) {
  if (x.unit !== h.unit) return `unit:${x.unit}`;
  if (x.implausible) return 'implausible';
  if (x.specimenForm === 'off-recipe') return x.specimenType === 'Printed specimen at partial infill' ? 'partialInfill' : 'offRecipe';
  if (!['printed', 'not-stated'].includes(x.specimenForm)) {
    if (x.specimenForm === 'moulded') return h.direction || h.loadMPa != null ? 'moulded' : 'resin';
    return ['film', 'filament'].includes(x.specimenForm) ? x.specimenForm : 'notPrinted';
  }
  if (x.moistureState === 'conditioned') return 'conditioned';
  if (x.postProcessingState === 'annealed' && c.ms.some((y) => y !== x && y.gradeId === x.gradeId && y.property === x.property && !y.quarantined && y.postProcessingState === 'as-printed')) return 'annealed';
  if (h.notch && x.notch !== h.notch) return x.notch === 'Unnotched' ? 'unnotched' : x.notch === 'Notched' ? 'notched' : 'notch';
  if (h.testTemperatureC != null && x.testTemperatureC != null && Math.abs(x.testTemperatureC - h.testTemperatureC) > 2) return x.testTemperatureC < h.testTemperatureC ? 'cold' : 'hot';
  if (h.standard && x.standards?.length && !x.standards.includes(h.standard)) return 'standard';
  if (h.direction && x.direction !== h.direction) {
    if (!UNSTATED_DIRECTIONS.has(x.direction)) return 'direction';
    if (h.unstatedDirection === 'excluded') return 'unstatedDirection';
  }
  // A headline with no direction is a flat bar's (build/src/products.js assess).
  if (!h.direction && ['Z', 'XZ', 'ZX'].includes(x.direction)) return 'direction';
  if (h.loadMPa != null) {
    if (x.thermal?.loadStated) { if (Math.abs(x.thermal.loadMPa - h.loadMPa) > 0.01) return 'load'; }
    else if (h.unstatedLoad === 'excluded') return 'unstatedLoad';
  }
  return null;
}
const furthest = (a, b) => (NOT_DRAWN_ORDER.indexOf(b.split(':')[0]) > NOT_DRAWN_ORDER.indexOf(a.split(':')[0]) ? b : a);
/**
 * Why a record under a comparison is not a dot: drawn or named above; else refused by every headline that reads its
 * property, counted by the one it got furthest with (an XZ bar is in another orientation for both XY and Z); else taken
 * by one but not its product's chosen value, so another value of a product drawn. Returns 'drawn', 'named', 'held',
 * 'noNumber', 'property:<name>', a refusedBy key, 'retired', 'reference' or 'second'.
 */
export function notDrawnWhy(x, hs, c, drawnIds, namedIds = new Set()) {
  if (drawnIds.has(x.id)) return 'drawn';
  if (namedIds.has(x.id)) return 'named';
  if (x.quarantined) return 'held';
  if (!x.numeric) return 'noNumber';
  const reads = hs.filter((h) => h.valueProperties.includes(x.property));
  if (!reads.length) return `property:${x.property}`;
  const refused = reads.map((h) => refusedBy(x, h, c));
  if (refused.every(Boolean)) return refused.reduce(furthest);
  const g = c.gradeById.get(x.gradeId);
  return !g || g.retired ? 'retired' : !isProduct(g) ? 'reference' : 'second';
}

/**
 * The comparisons a tab draws (drawer_comparisons.csv, headline_definitions "Drawer comparison", D133, D139), as data:
 * one entry per comparison with two of its headlines applying and a numeric record behind it, in registry order.
 *
 * Each holds: `cmp` (the registry's row) and `topic`; `hs`, the headlines it reads; `properties`, what it reads or lists
 * (D140); `byKey`, each headline's spreadEntries; `graphs`, one per unit ({ unit, rows, dots: [{ h, e }] }, rows with a
 * value in registry order), of which `drawnGraphs` have two dots or more; `singles`, the one dot of a graph that has
 * one; `shown`, the rows drawn, and `dots`; `silent`, the headlines no product has, split into `silentListed` (records
 * of theirs are listed below) and `silentUnlisted`; `caption` and `noteRule`, method.csv's; `key`, the marks drawn
 * ({ filled: [h], open: [h], annealed, variant, claimed, band, median }); `pairs` ({ gr, both: [grades], shares } for a
 * two-row graph of a comparison with a pair label), `shares` (pairs with a share) and `noShare` (pairs some product
 * publishes both of, in two orientations, with no share); `drawnIds` and `namedIds`; `onGraph`, the line each drawn
 * dot's record carries ({ mid, h, e, x, marks, owner, alsoFor, claimed, reason }, in drawing order); and `tally(records)`,
 * which counts records by notDrawnWhy: { drawnN, namedN, counts: [[why, n]] largest first, rest }.
 */
export function comparisonsOf(m, c, tab) {
  const inTab = new Set(tabProperties(tab, m));
  return REGISTRY.comparisons.map((cmp) => {
    const topic = cmp.name;
    const hs = REGISTRY.allHeadlines.filter((h) => h.drawerComparison === topic && !m.headline?.[h.key]?.notApplicable
      && h.valueProperties.some((p) => inTab.has(p)));
    // What it reads, and what it lists without drawing (another endpoint of the test, D140).
    const properties = new Set([...hs.flatMap((h) => [...h.valueProperties, ...h.relatedProperties]), ...(cmp.listed ?? []).filter((p) => inTab.has(p))]);
    // Two of its headlines must apply: an elastomer, which no heat deflection applies to, keeps its glass transition as
    // a property of its own.
    if (hs.length < 2 || !c.ms.some((x) => properties.has(x.property) && x.numeric && !x.quarantined)) return null;
    const byKey = new Map(hs.map((h) => [h.key, spreadEntries(m, c, h.key)]));
    // What is drawn decides itself: a test with no product's value has no row, a mark no dot carries has no key, and a
    // scale with fewer than two products' values has no graph, only a sentence. A graph per unit, its headlines in
    // registry order, so that a product can be found on each of a unit's tests; no scale is shared across units.
    const graphs = [...new Set(hs.map((h) => h.unit))].map((unit) => {
      const rows = hs.filter((h) => h.unit === unit && byKey.get(h.key).length);
      return { unit, rows, dots: rows.flatMap((h) => byKey.get(h.key).map((e) => ({ h, e }))) };
    });
    const drawnGraphs = graphs.filter((gr) => gr.dots.length > 1);
    const singles = graphs.filter((gr) => gr.dots.length === 1).map((gr) => gr.dots[0]);
    const shown = drawnGraphs.flatMap((gr) => gr.rows);
    const dots = drawnGraphs.flatMap((gr) => gr.dots);
    const silent = hs.filter((h) => !byKey.get(h.key).length);
    // A row whose headlines all go unread is said; its results are listed below where no other row reads them.
    const own = (h) => c.ms.some((x) => h.valueProperties.includes(x.property) && !hs.some((o) => o !== h && o.valueProperties.includes(x.property)));
    const classes = dots.map(({ h, e }) => dotMarks(h, e, c));
    const has = (k) => classes.some((x) => x.includes(k));
    const marked = (keep) => [...new Set(dots.filter((d, i) => keep(classes[i])).map((d) => d.h))];
    const summaries = shown.map((h) => m.summary?.[h.key]).filter(Boolean);
    // The products that publish both of a pair: the pairs the rows are read for. Where the pair is one test on bars
    // printed two ways, the share one gives of the other, product by product.
    const pairs = (cmp.pairLabel ? drawnGraphs.filter((gr) => gr.rows.length === 2) : []).map((gr) => ({
      gr,
      both: byKey.get(gr.rows[0].key).filter((e) => byKey.get(gr.rows[1].key).some((x) => x.g.id === e.g.id)).map((e) => e.g),
      shares: shareOf(gr.rows[0], gr.rows[1], byKey, c),
    }));
    // The line a dot's record carries: its mark, where it sits, and what changed its bar. A twin's dot is its
    // sibling's record (D89), which then carries a line for each product it stands for.
    const onGraph = [];
    for (const h of shown) {
      for (const e of byKey.get(h.key)) {
        const x = c.msById.get(e.v.measurementId);
        onGraph.push({
          mid: e.v.measurementId, h, e, x, marks: dotMarks(h, e, c),
          owner: e.v.from?.origin === 'twin' ? c.gradeById.get(e.v.from.gradeId) : e.g,
          alsoFor: !!x && e.g.id !== x.gradeId,
          claimed: !!h.toughened && soldToughened(e.g, e.v, c),
          reason: outOfMedian(h, e, m.summary?.[h.key], c),
        });
      }
    }
    const drawnIds = new Set(dots.map((d) => d.e.v.measurementId));
    const namedIds = new Set(singles.map((d) => d.e.v.measurementId));
    // What the results below are, counted by why each is or is not drawn, so the counts under the headings add up.
    const tally = (records) => {
      const counts = new Map();
      for (const x of records) { const k = notDrawnWhy(x, hs, c, drawnIds, namedIds); counts.set(k, (counts.get(k) ?? 0) + 1); }
      const drawnN = counts.get('drawn') ?? 0, namedN = counts.get('named') ?? 0;
      counts.delete('drawn');
      counts.delete('named');
      return { drawnN, namedN, counts: [...counts].sort((p, q) => q[1] - p[1]), rest: records.length - drawnN - namedN };
    };
    return {
      cmp, topic, hs, properties, byKey, graphs, drawnGraphs, singles, shown, dots, silent,
      silentListed: silent.filter(own), silentUnlisted: silent.filter((h) => !own(h)),
      caption: c.db.method?.find((r) => r.topic === topic)?.rule ?? '',
      noteRule: cmp.note ? c.db.method?.find((r) => r.topic === cmp.note)?.rule : null,
      key: {
        filled: marked((x) => !x.includes('open') && !x.includes('variant')),
        open: marked((x) => x.includes('open') && !x.includes('variant')),
        annealed: has('annealed'), variant: has('variant'), claimed: has('claimed'),
        band: summaries.some((x) => x.q1 != null), median: summaries.some((x) => x.n > 1),
      },
      pairs,
      shares: pairs.filter((x) => x.shares),
      // A pair some product publishes both of, but none in one document and state, is said to have no share.
      noShare: pairs.filter((x) => !x.shares && x.both.length && x.gr.rows[0].direction && x.gr.rows[1].direction && x.gr.rows[0].direction !== x.gr.rows[1].direction),
      drawnIds, namedIds, onGraph, tally,
    };
  }).filter(Boolean);
}

// ------------------------------------------------------------------ printing

/**
 * Print temperatures across a material's products (D139), as print-spread.js reads them from each product's print gate:
 * `axes` (printSpread, all four settings); `drawn`, the settings with two values or more, one a sheet's ({ a, axis,
 * label, values, limit, onScale, rows }: `limit` the H2C's where the setting has one, `onScale` whether it is drawn on
 * the scale, scales.js limitOnScale); `dots` ({ a, e }); `products` drawn; `marks`, the key's (own, guide, variant,
 * band, median, limit); `rows`, every drawn row with a value; `typical` ({ label, low, high }: each drawn setting's
 * medians of its lowest and highest values, null where none); `outside` ({ label, axis, list: [{ g, name, verdict, min,
 * max, origin }] }) and `limits` ({ label, axis, limit }); `single`, the settings one product's sheet, or only the guide,
 * gives ({ label, axis, own: { g, name, window } | null, guide: { window, readers } | null }, a window { min, max } or {
 * tempC }); and `missing`, why the others are not drawn ({ label, axis, notDrawn: [[why, n]], oneEnd: { low, high } }).
 * Nothing is drawn where `drawn` is empty.
 */
export function printFacts(m, c) {
  const axes = printSpread(c.grades.filter(isProduct));
  // A name in a sentence: "the Bambu Lab Filament Guide (PLA column)" (build/src/print-guide.js, C05).
  const guideName = `the ${c.guide?.name ?? 'Bambu Lab Filament Guide'}`;
  const own = (a) => a.rows.flatMap((r) => r.entries).filter((e) => e.origin !== 'guide');
  const drawnAxes = axes.filter((a) => a.rows.reduce((n, r) => n + r.entries.length, 0) > 1 && own(a).length);
  const drawn = drawnAxes.map((a) => {
    const values = a.rows.flatMap((r) => r.entries.map((e) => e.value));
    const limit = a.limit ? h2cLimit(a.axis) : null;
    return { a, axis: a.axis, label: a.label, values, limit, onScale: limitOnScale(limit, values), rows: a.rows.filter((r) => r.entries.length) };
  });
  const dots = drawnAxes.flatMap((a) => a.rows.flatMap((r) => r.entries.map((e) => ({ a, e }))));
  const has = (k) => dots.some(({ e }) => k(e));
  // A setting one product's sheet, or only the guide, gives: said with its window as the sheet gives it.
  const windowOf = (a, g) => (a.axis === 'drying' ? { tempC: g.print.drying.tempC } : { min: g.print[a.axis].min, max: g.print[a.axis].max });
  return {
    axes, guideName, drawn, dots,
    products: new Set(dots.map(({ e }) => e.g.id)).size,
    marks: {
      own: has((e) => e.origin !== 'guide' && !e.variant), guide: has((e) => e.origin === 'guide' && !e.variant), variant: has((e) => e.variant),
      band: drawnAxes.some((a) => a.rows.some((r) => r.summary.q1 != null)), median: drawnAxes.some((a) => a.rows.some((r) => r.summary.n > 1)),
      limit: drawn.some((d) => d.onScale),
    },
    rows: drawn.flatMap((d) => d.rows),
    // The medians of the lowest and the highest settings, and drying's: the window most products share.
    typical: drawnAxes.map((a) => { const [low, high = null] = a.rows.map((r) => (r.summary.n ? r.summary.median : null)); return { label: a.label, low, high }; }),
    outside: axes.filter((a) => a.outside.length).map((a) => ({ label: a.label, axis: a.axis, list: a.outside.map((o) => ({ ...o, name: productNameOrId(o.g) })) })),
    limits: axes.filter((a) => a.limit).map((a) => ({ label: a.label, axis: a.axis, limit: h2cLimit(a.axis) })),
    single: axes.filter((a) => !drawnAxes.includes(a) && a.rows.some((r) => r.entries.length)).map((a) => {
      const es = a.rows.flatMap((r) => r.entries);
      const mine = own(a);
      return mine.length ? { label: a.label, axis: a.axis, own: { g: mine[0].g, name: productNameOrId(mine[0].g), window: windowOf(a, mine[0].g) }, guide: null }
        : { label: a.label, axis: a.axis, own: null, guide: { window: windowOf(a, es[0].g), readers: new Set(es.map((e) => e.g.id)).size } };
    }),
    missing: axes.filter((a) => a.notDrawn.size || a.oneEnd?.low || a.oneEnd?.high)
      .map((a) => ({ label: a.label, axis: a.axis, notDrawn: [...a.notDrawn], oneEnd: { low: a.oneEnd?.low ?? 0, high: a.oneEnd?.high ?? 0 } })),
  };
}

/**
 * How many of a material's products the H2C can print, axis by axis, from each product's own settings (grades[].print):
 * null where it has no product; else { products, axes: [{ axis, label, limit, within, over, unknown }] for nozzle, bed
 * and chamber, all (every product within on every axis), origins: { twin, guide } (settings read where a product's own
 * sheet is silent, D88, D89) }.
 */
export function printCounts(grades) {
  const products = grades.filter(isProduct);
  if (!products.length) return null;
  const origins = { twin: 0, guide: 0 };
  const count = (axis) => {
    const n = { within: 0, over: 0, unknown: 0 };
    for (const g of products) {
      const from = g.print?.from?.[axis];
      const v = g.print?.profileIds.length || from ? g.print[axis].verdict : 'unknown';
      if (v === 'within') n.within++; else if (v === 'unknown') n.unknown++; else n.over++;
      if (from && v !== 'unknown') origins[from.origin]++;
    }
    return n;
  };
  const axes = [['nozzle', 'Nozzle'], ['bed', 'Bed'], ['chamber', 'Chamber']].map(([axis, label]) => ({ axis, label, limit: h2cLimit(axis), ...count(axis) }));
  return { products: products.length, axes, all: axes.every((n) => n.within === products.length), origins };
}

/**
 * The Bambu Lab Filament Guide's row for a material's type (db.printGuide, D88), or null: the row, why it is this
 * material's column (its mapping's Reason), and how many of its products take at least one setting from it. It is read
 * for a product only where the product's own sheet, and a data sheet it shares, say nothing (D127).
 */
export function guideFacts(m, c) {
  const guide = c.guide;
  if (!guide) return null;
  return {
    guide,
    why: guide.materials.find((y) => y.materialId === m.id).reason,
    readBy: c.grades.filter((g) => Object.values(g.print?.from ?? {}).some((f) => f.guideId === guide.id)).length,
  };
}

// AMS and H2C routing are shown on a profile only where it says more than "verify the exact grade", which nearly all say.
const VERIFY = /verify|not verified|no blanket/i;
/** Whether a print profile's AMS and H2C routing cells say more than "verify the exact grade". */
export const routingSaysMore = (p) => Object.values(p.routing ?? {}).some((v) => stated(v) && !VERIFY.test(String(v)));

// ------------------------------------------------------------------ makers' statements (db.knowHow)

/**
 * Across a material's products (materials[].knowHow): how many makers say something on each topic, and where their
 * documents are silent. Null where nothing is counted. { states (products per state: collected, sheet-silent,
 * no-document-read, searched-nothing), total, collected, sitesSearched, makers, topics: [{ topic, makers, stated (some
 * maker says something on it), products | null }] in db.meta.knowHow.topics order, recipe: [[part, products silent on
 * it]] }.
 */
export function makersSayFacts(m, c) {
  const k = m.knowHow;
  const topics = c.db.meta.knowHow?.topics ?? [];
  if (!k || !topics.length) return null;
  const n = k.products;
  const total = Object.values(n).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return {
    states: n, total, collected: n.collected, sitesSearched: k.sitesSearched ?? 0, makers: k.makers,
    topics: topics.map((t) => ({ topic: t, makers: k.topics[t]?.makers ?? 0, stated: !!k.topics[t], products: k.topics[t]?.products ?? null })),
    recipe: Object.entries(k.recipe).map(([part, s]) => [part, s['sheet-silent'] + s['searched-nothing']]).filter(([, x]) => x),
  };
}

/**
 * What a product's maker's documents leave unsaid (grades[].knowHow), or null where it has no know-how record: its
 * state, the date its website was checked, the topics (of `topics`, db.meta.knowHow.topics) it says nothing on, and the
 * parts of its recipe its documents do not give. material-words.js knowHowGap says it.
 */
export function knowHowGapFacts(g, topics) {
  const k = g.knowHow;
  if (!k) return null;
  return {
    state: k.state, searchedOn: k.searchedOn ?? null,
    missing: topics.filter((t) => !k.topics[t]),
    recipe: Object.entries(k.recipe).filter(([, s]) => s !== 'collected' && s !== 'no-document-read').map(([part]) => part),
  };
}

// ------------------------------------------------------------------ environment

/**
 * A material's environment statements by category (evidence[].categoryLabel), in first-appearance order, split into
 * the categories a requirement can be set on (`usable`) and those no filter uses (`other`): [[label, records], …] each.
 */
export function envGroups(c) {
  const byCat = new Map();
  for (const e of c.ev) {
    const k = e.categoryLabel ?? 'Other';
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(e);
  }
  const cats = [...byCat];
  return { usable: cats.filter(([, list]) => list[0]?.filterable), other: cats.filter(([, list]) => !list[0]?.filterable) };
}

/**
 * A material's environment statements as a matrix, category by verdict (evidence[].verdict, as stored): `rows` ({ label,
 * category, filterable, records, counts: { verdict: n }, total }, usable categories first), `verdicts` (every verdict
 * that occurs, in first-appearance order), and `polymer`, the resin's own (D64), apart: { label, category, verdict,
 * screens, agents }. Display only; the engine's environment verdicts are its own.
 */
export function environmentMatrix(c) {
  const { usable, other } = envGroups(c);
  const verdicts = [];
  const rows = [...usable, ...other].map(([label, records]) => {
    const counts = {};
    for (const e of records) {
      if (!verdicts.includes(e.verdict)) verdicts.push(e.verdict);
      counts[e.verdict] = (counts[e.verdict] ?? 0) + 1;
    }
    return { label, category: records[0]?.category ?? null, filterable: !!records[0]?.filterable, records, counts, total: records.length };
  });
  return { rows, verdicts, polymer: c.poly.map((p) => ({ label: p.categoryLabel, category: p.category, verdict: p.verdict, screens: !!p.screens, agents: p.agents })) };
}

// ------------------------------------------------------------------ products, prices and estimates, for the pages

/** Whether a material has an estimate to show: a missing headline's, or an estimated print window. */
export const hasEstimates = (m) => !!(REGISTRY.headlines.some((d) => { const h = m.headline[d.key]; return h && !h.known && h.estimate; })
  || m.print?.nozzleEstimate || m.print?.bedEstimate || m.print?.chamberEstimate);

/** A product's estimates (grades[].estimate, D81), only where it publishes no comparable value of its own: [{ h, e }]. */
export const productEstimates = (g) => (g.estimate ? REGISTRY.headlines.filter((h) => g.estimate[h.key] && g.headline?.[h.key]?.level !== 'comparable').map((h) => ({ h, e: g.estimate[h.key] })) : []);

/**
 * A material's products and reference grades as table rows, in the database's order: { g, id, name, maker, product
 * (not a reference grade), variant, toughened (its own claim), typicalOf (the headline keys it is the typical product
 * of), values (grades[].headline by key, every headline it publishes, drawer-only too), print (grades[].print), price
 * (its headline.priceCADkg or null), documents (source IDs), estimates (productEstimates) }.
 */
export function productRows(c) {
  const typicalOf = new Map();
  for (const h of REGISTRY.allHeadlines) {
    const t = c.m.summary?.[h.key]?.typical;
    if (t) (typicalOf.get(t) ?? typicalOf.set(t, []).get(t)).push(h.key);
  }
  return c.grades.map((g) => ({
    g, id: g.id, name: productNameOrId(g), maker: stated(g.manufacturer) ? g.manufacturer : null,
    product: isProduct(g), variant: g.variant ?? null, toughened: soldToughened(g, null, c),
    typicalOf: typicalOf.get(g.id) ?? [],
    values: Object.fromEntries(REGISTRY.allHeadlines.filter((h) => g.headline?.[h.key]).map((h) => [h.key, g.headline[h.key]])),
    print: g.print ?? null,
    price: g.headline?.priceCADkg ?? null,
    documents: productDocuments(c, g),
    estimates: productEstimates(g),
  }));
}

/**
 * A material's shop listings as the Price tab reads them: { p, id, product (its grade), used (it is in its product's
 * price), unused ('quarantined', 'no-regular' or 'another', the key of material-words.js UNUSED_WORDS; null where
 * used), perKg (regular CAD per kg or null), converted (from a foreign currency, D113), salePerKg (the price shown per kg,
 * where no regular price was recorded), currency, foreign, accessDate, quarantined }.
 */
export const priceRows = (c) => c.prices.map((p) => ({
  p, id: p.id, product: c.gradeById.get(p.gradeId) ?? null,
  used: !!p.headlineSample,
  unused: p.headlineSample ? null : p.quarantined ? 'quarantined' : p.regularPerKg === null ? 'no-regular' : 'another',
  perKg: p.regularPerKg, converted: p.regularPerKg !== null && !!p.fx,
  salePerKg: p.regularPerKg === null && Number.isFinite(p.displayedPrice) && p.netMassKg > 0 ? p.displayedPrice / p.netMassKg : null,
  currency: p.currency ?? 'CAD', foreign: !!p.foreign, accessDate: p.accessDate, quarantined: !!p.quarantined,
}));

/**
 * Every material's value on each headline, for a page's context strip: { [key]: { key, unit, drawerOnly, entries: [{
 * id, name, value }] } }, one per db.registry headline, each listing every material that is not a family entry and whose
 * compiled headline[key] is known (materials[].headline[key].value, a measured median, never an estimate), ascending by
 * value, then by ID.
 */
export function rankTable(db) {
  const listed = db.materials.filter((m) => !m.familyEntry);
  return Object.fromEntries((db.registry?.headlines ?? []).map((h) => {
    const entries = listed.filter((m) => m.headline?.[h.key]?.known && Number.isFinite(m.headline[h.key].value))
      .map((m) => ({ id: m.id, name: m.name, value: m.headline[h.key].value }))
      .sort((a, b) => a.value - b.value || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return [h.key, { key: h.key, unit: h.unit, drawerOnly: !!h.drawerOnly, entries }];
  }));
}

/** Where a material stands in a rankTable entry: { of, below, above, index } (index -1 where it has no value). */
export function rankOf(rank, materialId) {
  const index = rank.entries.findIndex((x) => x.id === materialId);
  if (index < 0) return { of: rank.entries.length, below: 0, above: 0, index };
  const v = rank.entries[index].value;
  return { of: rank.entries.length, below: rank.entries.filter((x) => x.value < v).length, above: rank.entries.filter((x) => x.value > v).length, index };
}

// ------------------------------------------------------------------ reader text: the reader's words, not the maintainers'

/**
 * A reviewer's note is reader text unless it names records (a record ID, a migration, a ruling: "V000420", "m123",
 * "R166", "S-PET-TDS-AthenaX-GF10") or speaks the database's own words for itself ("headline", "representative grade").
 * Such a note is the maintainers' and leaves the pages and, since 2026-10-18, the drawer's rows (it stays behind a record's ID
 * mark). MAINTAINER_WORDS marks a review step (a date, a re-read, a digest).
 */
const RECORD_NAME = /(?<!ASTM )\b(?:V\d{6}|G\d{3}-(?:\d{2,3}|R\d+)(?:-R\d+)?|M\d{3}|P\d{4}|Q\d{5}|C\d{5}|CA\d{4}|P[BC]\d{5}|m\d{2,3}|R\d{3}|D\d{2,3}|[A-Z][A-Z0-9]{0,2}-[A-Za-z0-9]+-[A-Za-z0-9-]+)\b/;
const PROJECT_WORDS = /\b(headlines?|representative grade|workbook|migration|ruling|quarantin\w*|admitted|coverage record|aggregat\w*|observations?|family-level|screen(?:ed|ing)?|grade-specific|recorded in (?:Properties|Printing|Evidence|Coverage))\b/i;
const STORED_STATUS = /\b(Theoretical|Official Bambu product|Officially listed family)\b|"Conditional"/;
export const MAINTAINER_WORDS = /\b(?:20\d\d-\d\d-\d\d|re-read|SHA-256|estimate band|no document cited|recorded (?:with|from|as))\b/i;
export const readerText = (text) => !RECORD_NAME.test(String(text ?? '')) && !PROJECT_WORDS.test(String(text ?? '')) && !STORED_STATUS.test(String(text ?? ''));
/** A record's note a reader is shown beside it: reader text that names no review step. */
export const readerNote = (text) => !!String(text ?? '').trim() && readerText(text) && !MAINTAINER_WORDS.test(String(text ?? ''));

/**
 * A known gap a reader is shown (the drawer's Known gaps, the pages' Sources): a gap of the material in reader text, not a
 * review step's note or a note on the records; the rest are the maintainers' Review notes. Both surfaces also leave out
 * the gaps another of their sections says (shownGap).
 */
export const readerGap = (r) => GAP_STATUS.has(r.status) && r.domain !== 'Mandatory review' && readerNote(r.finding);

/**
 * Gaps a section says where the reader looks, never as a known gap: the rarely published properties (the same list on
 * every material; the property tables say "not published") and the price's (the price says where it was converted, or
 * that none is known).
 */
export const GAPS_SAID_ELSEWHERE = new Set(['Sparse properties', 'Canadian price']);
/**
 * A coverage row a reader is shown under Known gaps, and counted (the drawer's On file line): a gap of the material, in
 * reader text, not a review step's or a note on the records, and not one another section says. The one rule of both
 * surfaces since 2026-10-18 (C21, moved from app/pages/sections/common.js); the Products page's placement excuses every
 * other row.
 */
export const shownGap = (r) => readerGap(r) && !GAPS_SAID_ELSEWHERE.has(r.domain);

/** A statement in a maker's or another document's own words, not the project's reading of one (Selection interpretation). */
export const makersOwn = (e) => e.evidenceType !== 'Selection interpretation';

/** A coverage row's subject in a reader's words. */
export const GAP_DOMAIN_WORDS = {
  'Canadian price': 'Price', 'Moisture / environmental': 'Moisture and chemicals', 'Print setup': 'Printing', 'Source conflict': 'Sources that disagree',
  'Post-processing / application': 'Post-processing', 'H2C status': 'Bambu Lab status', Comparability: 'Comparing values', 'Measurement parsing': 'Reading the values',
  'Sparse properties': 'Not published by any product',
};
