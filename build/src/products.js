// Products: each product's own values and print recipe, derived by rule, and each material summarised from its
// products (docs/GOALS.md: D83 and D84, decided 2026-09-25; re-center phases 1 and 4).
//
//   grades[].headline[key]     the product's own value for each measurement headline, chosen by rule, and its price;
//                              where it publishes none, its twin's (the same sheet, D89), marked `from`
//   grades[].print             the product's own print recipe from its own profiles, never a union across a material;
//                              where they are silent, its twin's (D89), then for the print gate its material's printer
//                              maker's guide (D88), each part so read marked in `print.from` and in its reason
//   materials[].summary[key]   the spread across the material's products: how many, quartiles, the typical product
//   materials[].headline[key]  where its products publish comparably: their median, spread and typical product
//
// The engine judges each product on its own values (app/js/engine/products.js), and a material by how many of its
// products pass. A material's headline is what the table, the chart and the export show for it; it decides nothing,
// and no one chooses it: until phase 4 it was one hand-picked measurement of a "representative grade".
//
// Two evidence levels (D84). A value is "comparable" when it is what the headline says it is: a printed or unstated
// specimen, the headline's direction, dry or unstated, at the headline's load. It is "as published" when the source
// leaves the direction or the load unstated: Spectrum's and Fiberlogy's "ISO 527" rows name no specimen orientation,
// and read like moulded bars (30 of 46 such PLA values reach 3 GPa; of 27 PLA products stating XY, none does). It is
// shown with its own count and decides only when the reader asks. What the headline is not (a Z, film or moulded
// value, a conditioned or implausible one, one annealed where the product publishes it as printed) is no product
// value at all, and stays evidence in the drawer.
//
// A material's range is the spread of its products, never uncertainty about one of them: PEBA's three products at
// 7.5, 25 and 30 MPa are three products (D8's example, which D83 answers by counting them, not by pooling them).

import { isPartSpecimen, annealedBesideAsPrinted } from './normalize/specimen.js';
import { median, cents } from './normalize/values.js';
import { measurementHeadlines, applies } from './registry.js';
import { aggregateGate } from './gates.js';

export const LEVEL = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };

// A direction the source leaves open is not a direction the source states otherwise: it may be the headline's.
const UNSTATED_DIRECTIONS = new Set(['unknown', 'not-applicable']);
// ASTM D648's low load is 66 psi, 0.455 MPa, and ISO 75 method B's 0.45 MPa: one test (estimate/observations.js reads
// 0.44 to 0.46 MPa as it too).
const LOAD_TOLERANCE_MPA = 0.01;

/**
 * Whether a measurement can be a product's value for a headline, and at which level. Returns { excluded } with the
 * reason when it cannot, else { level, caveat }.
 */
export function assess(m, def, gradeMeasurements) {
  if (!m.numeric) return { excluded: `no usable numeric value (${m.dataStatus})` };
  if (!def.valueProperties.includes(m.property)) return { excluded: `measures ${m.property}` };
  if (m.unit !== def.unit) return { excluded: `in ${m.unit}, not ${def.unit}` };
  if (m.implausible) return { excluded: 'flagged physically implausible' };
  if (!isPartSpecimen(m.specimenType)) return { excluded: `a ${m.specimenForm} specimen, not a printed part` };
  if (m.moistureState === 'conditioned') return { excluded: 'measured after moisture conditioning' };
  if (annealedBesideAsPrinted(m, gradeMeasurements)) return { excluded: 'annealed, and the product publishes it as printed' };
  let caveat = null;
  if (def.direction && m.direction !== def.direction) {
    if (!UNSTATED_DIRECTIONS.has(m.direction)) return { excluded: `a ${m.direction} measurement, not ${def.direction}` };
    caveat = 'unstated-direction';
  }
  if (def.loadMPa != null) {
    if (m.thermal?.loadStated) {
      if (Math.abs(m.thermal.loadMPa - def.loadMPa) > LOAD_TOLERANCE_MPA) return { excluded: `measured at ${m.thermal.loadMPa} MPa, not ${def.loadMPa} MPa` };
    } else caveat ??= 'load-not-stated';
  }
  return { level: caveat ? LEVEL.AS_PUBLISHED : LEVEL.COMPARABLE, caveat };
}

const POST_PROCESSING_ORDER = { 'as-printed': 0, 'not-stated': 1, annealed: 2 };
// A published point or mean before a published range, and either before a one-sided bound ("> 500 %").
const intervalOrder = (iv) => (!iv ? 3 : iv.kind === 'point' || iv.kind === 'uncertainty' ? 0 : iv.kind === 'range' ? 1 : 2);

/**
 * The order in which a product's candidates for one headline are preferred, most preferred first. Deterministic: the
 * last key is the measurement ID. Comparable before as published; a printed specimen before an unstated one; as
 * printed before unstated before annealed; dry before unstated; the product's own data sheet before another source;
 * the headline's first value property (its unspecified endpoint) before the others; a point before a range or bound.
 */
export function preference(m, a, grade, def) {
  return [
    a.level === LEVEL.COMPARABLE ? 0 : 1,
    m.specimenForm === 'printed' ? 0 : 1,
    POST_PROCESSING_ORDER[m.postProcessingState] ?? 1,
    m.moistureState === 'dry' ? 0 : 1,
    m.sourceId === grade.sourceId ? 0 : 1,
    def.valueProperties.indexOf(m.property),
    intervalOrder(m.interval),
  ];
}

const compareKeys = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

function productValue(m, a, def, pinned) {
  // The source, grade and conditions are the measurement's, read through its ID: nothing here copies them.
  const v = { value: m.value, level: a.level, measurementId: m.id };
  if (a.caveat) v.caveat = a.caveat;
  if (def.direction) v.direction = m.direction;
  if (m.interval && m.interval.kind !== 'point') v.interval = m.interval;
  if (m.uncertainty != null) v.uncertainty = m.uncertainty;
  // A value measured on an annealed part is reached only after annealing: the schedule the sheet states, or nulls.
  if (m.postProcessingState === 'annealed') v.anneal = m.anneal ?? { tempC: null, hours: null };
  if (pinned) v.pinned = true;
  return v;
}

/**
 * A product's own value for one headline: a pinned measurement (a row of headlines.csv on this product) if it
 * qualifies, else the most preferred candidate. Null when the product publishes nothing that qualifies.
 */
function chooseValue(grade, def, gradeMeasurements, pinnedIds) {
  const candidates = [];
  for (const m of gradeMeasurements) {
    const a = assess(m, def, gradeMeasurements);
    if (!a.excluded) candidates.push({ m, a });
  }
  if (!candidates.length) return null;
  const pinned = candidates.find((c) => pinnedIds.has(c.m.id));
  if (pinned) return productValue(pinned.m, pinned.a, def, true);
  candidates.sort((x, y) => compareKeys(preference(x.m, x.a, grade, def), preference(y.m, y.a, grade, def)) || (x.m.id < y.m.id ? -1 : 1));
  return productValue(candidates[0].m, candidates[0].a, def, false);
}

/** The value the rule alone chooses for a product, pins ignored: what `scripts/audit/rule-vs-hand-picks.mjs` compares. */
export const ruleValue = (grade, def, gradeMeasurements) => chooseValue(grade, def, gradeMeasurements, new Set());

/** The product's price: the median regular CAD/kg of its own listings in the headline sample, as a material's is. */
function productPrice(gradePrices) {
  const sample = gradePrices.filter((p) => p.headlineSample && p.regularPerKg !== null);
  if (!sample.length) return null;
  return { value: cents(median(sample.map((p) => p.regularPerKg))), level: LEVEL.COMPARABLE, observations: sample.length, priceIds: sample.map((p) => p.id) };
}

/** One axis of a product's recipe: the gate across its own profiles, and the window of the profile that decided it. */
function recipeAxis(profiles, axis) {
  const gate = aggregateGate(profiles, axis);
  const same = profiles.filter((p) => p.gates[axis].verdict === gate.verdict);
  const pick = same.find((p) => p.gates[axis].over === gate.over && p[axis].state === 'range')
    ?? same.find((p) => p[axis].state === 'range') ?? same[0];
  const t = pick?.[axis];
  return { verdict: gate.verdict, reason: gate.reason, state: t?.state ?? 'unknown', min: t?.min ?? null, max: t?.max ?? null, profileId: pick?.id ?? null };
}

const TEMPERATURE_AXES = ['nozzle', 'bed', 'chamber'];
// The parts of a recipe, in the order they are read. The guide answers the print gate's five (D88); drying and annealing
// are a product's treatment, which only its own sheet or its twin's may give.
const RECIPE_AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle', 'drying'];
export const GUIDE_AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle'];

/** Each part of a recipe read from a set of profiles (a product's own, a twin's own, or a guide row alone). */
function axisOf(profiles, axis) {
  if (TEMPERATURE_AXES.includes(axis)) return recipeAxis(profiles, axis);
  if (axis === 'enclosure') {
    // "Recommended" outranks "not needed": the stricter of two statements about one product.
    const states = profiles.map((p) => p.enclosureState);
    return states.includes('recommended') ? 'recommended' : states.includes('not-needed') ? 'not-needed' : 'unknown';
  }
  if (axis === 'hardenedNozzle') {
    const hardened = profiles.map((p) => p.abrasion.requiresHardened);
    return hardened.includes(true) ? true : hardened.includes(false) ? false : null;
  }
  const dried = profiles.find((p) => p.drying.required);
  return dried ? { tempC: dried.drying.tempC, hours: dried.drying.hours, profileId: dried.id } : null;
}

/**
 * Whether a set of profiles says anything on an axis: a reading, or words the parser could not read. What a product's
 * own sheet says always stands, even where it settles nothing; only silence is filled (D88, D89). A chamber and an
 * enclosure are one question, so a sheet that recommends an enclosure has spoken about the chamber too.
 */
function speaksTo(profiles, axis) {
  switch (axis) {
    case 'nozzle': case 'bed': return profiles.some((p) => p[axis].state !== 'unknown' || p[axis].unparsed);
    case 'chamber': return profiles.some((p) => p.chamber.state !== 'unknown' || p.chamber.unparsed || p.enclosureState !== 'unknown');
    case 'enclosure': return profiles.some((p) => p.enclosureState !== 'unknown');
    case 'hardenedNozzle': return profiles.some((p) => p.abrasion.requiresHardened != null || p.abrasion.state === 'stated' || p.abrasion.unparsed);
    default: return profiles.some((p) => p.drying.required);
  }
}

/**
 * Whether a guide row answers an axis for a silent product (D88): what it says on the print gate's parts, except a
 * nozzle list that settles nothing about a hardened nozzle (its TPU's "Hardened Steel / Stainless Steel").
 */
function guideAnswers(guide, axis) {
  if (!GUIDE_AXES.includes(axis)) return false;
  return axis === 'hardenedNozzle' ? guide.abrasion.requiresHardened != null : speaksTo([guide], axis);
}
// A source that asks for an enclosure and gives no chamber temperature has said all it will about the chamber.
const ENCLOSURE_ONLY = 'Asks for an enclosure but states no chamber temperature; an enclosure is not proof that 65 °C is enough';

/** The annealing a product's sheets state for its values measured on annealed parts, one per schedule. */
function annealOf(gradeMeasurements) {
  const anneal = [];
  const seen = new Set();
  for (const m of gradeMeasurements) {
    if (m.postProcessingState !== 'annealed' || !m.anneal) continue;
    const key = `${m.anneal.tempC}|${m.anneal.hours}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anneal.push({ tempC: m.anneal.tempC, hours: m.anneal.hours, measurementId: m.id });
  }
  return anneal;
}

/** A product as a reader names it: its maker and product, the maker once. */
export function productName(g) {
  const product = g.product && !/^Not /.test(g.product) ? g.product : '';
  const maker = g.manufacturer && !/^Not /.test(g.manufacturer) ? g.manufacturer : '';
  if (!product) return maker || g.id;
  return maker && !product.toLowerCase().startsWith(maker.toLowerCase()) ? `${maker} ${product}` : product;
}

/** Where a part of a product's values or recipe was read, when it is not the product's own sheet (D88, D89). */
const twinOrigin = (t) => ({ origin: 'twin', gradeId: t.id, label: `same sheet as ${productName(t)}` });
function guideOrigin(guide, grade, publisher) {
  // The guide's publisher may make the product too: its guide is still not the product's data sheet.
  const not = grade.manufacturer === publisher ? "not this product's data sheet" : "not this maker's sheet";
  return { origin: 'guide', guideId: guide.id, sourceId: guide.sourceId, guide: guide.name, label: `per ${guide.name}, ${not}` };
}
const labelled = (axis, from) => ({ ...axis, reason: `${axis.reason} (${from.label})` });

/**
 * A product's print recipe: its own profiles' nozzle, bed and chamber against the H2C, whether it wants an enclosure,
 * a hardened nozzle and drying, and the annealing its sheets state for the values measured on annealed parts. Where its
 * own profiles say nothing on a part, its twin's do (the same sheet, D89), and for the print gate's parts after that
 * its material's printer maker's guide (D88); each part read that way says where it came from, in `from` and in its
 * reason. Null when nothing at all is known.
 */
function productPrint(grade, own, twins, guide, publisher) {
  const out = { profileIds: own.profiles.map((p) => p.id) };
  const from = {};
  for (const axis of RECIPE_AXES) {
    let value = axisOf(own.profiles, axis);
    if (!speaksTo(own.profiles, axis)) {
      const twin = twins.find((t) => speaksTo(t.profiles, axis));
      const read = twin ? twin.profiles : guide && guideAnswers(guide, axis) ? [guide] : null;
      if (read) {
        from[axis] = twin ? twinOrigin(twin.grade) : guideOrigin(guide, grade, publisher);
        value = axisOf(read, axis);
        if (TEMPERATURE_AXES.includes(axis)) {
          if (!twin) value = { ...value, profileId: null };
          if (axis === 'chamber' && value.state === 'unknown' && value.verdict === 'unknown' && axisOf(read, 'enclosure') === 'recommended') value = { ...value, reason: ENCLOSURE_ONLY };
          value = labelled(value, from[axis]);
        }
      }
    }
    out[axis] = value;
  }
  out.anneal = own.anneal;
  const twinAnneal = twins.find((t) => t.anneal.length);
  if (!own.anneal.length && twinAnneal) { out.anneal = twinAnneal.anneal; from.anneal = twinOrigin(twinAnneal.grade); }
  if (!own.profiles.length && !out.anneal.length && !Object.keys(from).length) return null;
  if (Object.keys(from).length) out.from = from;
  return out;
}

// A quartile by linear interpolation between order statistics (Hyndman and Fan's type 7), to twelve significant digits
// so a binary remainder never reaches the snapshot.
const tidy = (x) => Number(x.toPrecision(12));
function quantile(sorted, p) {
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return tidy(sorted[lo] + (h - lo) * ((sorted[lo + 1] ?? sorted[lo]) - sorted[lo]));
}
const QUARTILES_FROM = 4;

/**
 * A material's spread for one headline, over its procurement products that are not declared variants. `n` counts the
 * comparable values, and the range, quartiles and typical product are theirs; values published without the direction
 * or load are counted apart, and so are the variants, whose values describe the product, not the polymer (D57).
 *
 * A twin counts (D89): it is a product of its own, sold under its own name, and its own sheet prints the table its
 * sibling's does. `twins` says how many of the comparable values are read that way.
 */
function summarise(entries, products) {
  const comparable = entries.filter((e) => !e.variant && e.v.level === LEVEL.COMPARABLE);
  const asPublished = entries.filter((e) => !e.variant && e.v.level === LEVEL.AS_PUBLISHED);
  const variants = entries.filter((e) => e.variant);
  const span = (list) => (list.length ? { n: list.length, min: Math.min(...list.map((e) => e.v.value)), max: Math.max(...list.map((e) => e.v.value)) } : null);
  const out = { products, n: comparable.length };
  if (comparable.length) {
    const sorted = comparable.map((e) => e.v.value).sort((a, b) => a - b);
    const mid = tidy(median(sorted));
    // The typical product is the one whose value is nearest the median; a tie goes to the lower value, then to the
    // product whose own sheet it is over a twin that reads it (D89), then the lower ID.
    const typical = [...comparable].sort((a, b) => Math.abs(a.v.value - mid) - Math.abs(b.v.value - mid) || a.v.value - b.v.value
      || (a.v.from ? 1 : 0) - (b.v.from ? 1 : 0) || (a.gradeId < b.gradeId ? -1 : 1))[0];
    Object.assign(out, { min: sorted[0], max: sorted.at(-1), median: mid, typical: typical.gradeId });
    if (sorted.length >= QUARTILES_FROM) Object.assign(out, { q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75) });
    const twins = comparable.filter((e) => e.v.from?.origin === 'twin').length;
    if (twins) out.twins = twins;
  }
  if (asPublished.length) out.asPublished = span(asPublished);
  if (variants.length) out.variants = span(variants);
  return out;
}

/**
 * A material's headline where its products publish comparably: their median, with the spread and the typical product
 * (the one nearest the median) it came from. One product's value is that product's, and cites its measurement as a
 * single value always did. It is what the table, the chart, Compare and the export show; it decides nothing (D83).
 */
function productsHeadline(unit, s, gradeById, key) {
  const typical = gradeById.get(s.typical)?.headline?.[key];
  const h = {
    known: true, value: s.median, unit, origin: 'products', verified: true,
    interval: { lo: s.median, hi: s.median, kind: 'point' },
    spread: { n: s.n, products: s.products, min: s.min, max: s.max, q1: s.q1 ?? null, q3: s.q3 ?? null,
      asPublished: s.asPublished ?? null, variants: s.variants ?? null, ...(s.twins ? { twins: s.twins } : {}) },
    typical: { gradeId: s.typical, measurementId: typical?.measurementId ?? null, value: typical?.value ?? null },
  };
  if (s.n === 1) Object.assign(h, { measurementId: typical?.measurementId ?? null, gradeId: s.typical });
  if (key === 'priceCADkg') h.observations = s.n;
  return h;
}

/**
 * A row of headlines.csv pins one product's value for one headline to a measurement the rule would not choose.
 * It must be a measurement of an active product of that material that can be the headline's value at all (assess), and
 * a product has one pin per headline. Returns the pinned measurement IDs; a pin that fails is a build error, never
 * silently ignored.
 */
function checkPins(selections, { defs, measurementById, measurementsByGrade, gradeById, rowById, issues }) {
  const pinned = new Set();
  const seen = new Map();
  for (const [materialId, list] of selections) {
    const where = `headlines ${materialId}`;
    for (const s of list) {
      const def = defs.find((d) => d.key === s.HeadlineKey);
      if (!def) { issues.push({ level: 'error', code: 'HEADLINE-KEY-UNKNOWN', where, message: `Headline key "${s.HeadlineKey}" is not a measurement headline in headline_definitions.csv` }); continue; }
      const row = rowById.get(materialId);
      if (row && !applies(def.appliesTo, row)) { issues.push({ level: 'error', code: 'HEADLINE-NOT-APPLICABLE', where, message: `${def.key} does not apply to this material (${def.appliesToText}) but pins ${s.MeasurementID}` }); continue; }
      const m = measurementById.get(s.MeasurementID);
      const g = m && gradeById.get(m.gradeId);
      const own = m ? (measurementsByGrade.get(m.gradeId) ?? []) : [];
      const a = m && assess(m, def, own);
      const problem = !m ? `${s.MeasurementID} is not an active measurement (missing or a retired duplicate)`
        : m.materialId !== materialId ? `${m.id} is a measurement of ${m.materialId}`
        : !g || g.retired ? `${m.id} is on ${m.gradeId}, which is not an active product`
        : a.excluded ? `${m.id} cannot be ${def.key}: ${a.excluded}`
        : null;
      if (problem) { issues.push({ level: 'error', code: 'HEADLINE-SELECTION-INVALID', where, message: `The pin for ${def.key} is refused: ${problem}` }); continue; }
      const k = `${m.gradeId}|${def.key}`;
      if (seen.has(k)) issues.push({ level: 'error', code: 'HEADLINE-SELECTION-MULTIPLE', where, message: `${m.gradeId} ${def.key} is pinned twice (${seen.get(k)}, ${m.id}); a product has one value` });
      seen.set(k, m.id);
      pinned.add(m.id);
    }
  }
  return pinned;
}

/**
 * Each product's twins (D89): the other active products of the same material under the same Shared formulation key,
 * whose sheets print one table (R053) that the database records once. The one holding the values comes first, then by
 * ID. A key never spans two materials (FORMULATION-KEY-SPANS-MATERIALS), so a product that reprints another material's
 * table (R166) has no twin and reads nothing.
 */
function twinsOf(grades, measurementsByGrade) {
  const byKey = new Map();
  for (const g of grades) {
    if (g.retired || /-R\d+$/.test(g.id) || !g.formulationKey || /^Not /.test(g.formulationKey)) continue;
    const k = `${g.materialId}\u0000${g.formulationKey}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(g);
  }
  const holds = (g) => (measurementsByGrade.get(g.id)?.length ? 0 : 1);
  const out = new Map();
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    for (const g of list) out.set(g.id, list.filter((x) => x !== g).sort((a, b) => holds(a) - holds(b) || (a.id < b.id ? -1 : 1)));
  }
  return out;
}

/**
 * Attach every product's own values and print recipe, every material's summary, and the headline its products give
 * it. `materialRows` are the materials table's rows (a headline's Applies to tests them); `selections` its
 * headlines.csv rows by MaterialID, which pin a product's value where the rule would choose another.
 *
 * Where a product publishes nothing for a headline, its twin's own value stands for it (D89); where its own profiles
 * say nothing on a part of its print recipe, its twin's do, and on the print gate's parts after that its material's
 * printer maker's guide (`guideByMaterial`, D88). A product's own value or statement always wins, and a price is never
 * read from another product: it is what that product's own listings cost.
 */
export function attachProducts({ grades, materials, materialRows, measurements, profiles, prices, registry, selections, guideByMaterial = new Map(), sources = [], issues = [] }) {
  const defs = measurementHeadlines(registry);
  const byGrade = (list) => {
    const out = new Map();
    for (const x of list) {
      if (!out.has(x.gradeId)) out.set(x.gradeId, []);
      out.get(x.gradeId).push(x);
    }
    return out;
  };
  const measurementsByGrade = byGrade(measurements);
  const profilesByGrade = byGrade(profiles.filter((p) => !p.retired));
  const pricesByGrade = byGrade(prices);
  const rowById = new Map(materialRows.map((r) => [r.MaterialID, r]));
  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const pinnedIds = checkPins(selections, { defs, measurementById: new Map(measurements.map((m) => [m.id, m])), measurementsByGrade, gradeById, rowById, issues });

  // Each product's own values first, then what its twin's stand for: a twin reads only a sibling's own value, never
  // one the sibling itself read.
  const ownValues = new Map();
  for (const g of grades) {
    if (g.retired) continue;
    const row = rowById.get(g.materialId);
    const own = measurementsByGrade.get(g.id) ?? [];
    const headline = {};
    for (const def of defs) {
      // A headline that does not apply to the material (heat deflection of an elastomer) has no product values either.
      if (row && !applies(def.appliesTo, row)) continue;
      const v = chooseValue(g, def, own, pinnedIds);
      if (v) headline[def.key] = v;
    }
    ownValues.set(g.id, { ...headline });
    const price = productPrice(pricesByGrade.get(g.id) ?? []);
    if (price) headline.priceCADkg = price;
    g.headline = headline;
  }
  const twins = twinsOf(grades, measurementsByGrade);
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const recipeOf = (g) => ({ grade: g, profiles: profilesByGrade.get(g.id) ?? [], anneal: annealOf(measurementsByGrade.get(g.id) ?? []) });
  for (const g of grades) {
    if (g.retired) continue;
    const siblings = twins.get(g.id) ?? [];
    if (siblings.length) {
      const headline = {};
      for (const def of defs) {
        const t = !g.headline[def.key] && siblings.find((x) => ownValues.get(x.id)?.[def.key]);
        // The sibling's pin is the sibling's: the twin reads the value, not the reviewer's choice for another product.
        if (t) { const { pinned, ...v } = ownValues.get(t.id)[def.key]; headline[def.key] = { ...v, from: twinOrigin(t) }; }
        else if (g.headline[def.key]) headline[def.key] = g.headline[def.key];
      }
      if (g.headline.priceCADkg) headline.priceCADkg = g.headline.priceCADkg;
      g.headline = headline;
    }
    const guide = guideByMaterial.get(g.materialId) ?? null;
    g.print = productPrint(g, recipeOf(g), siblings.map(recipeOf), guide, guide && sourceById.get(guide.sourceId)?.publisher);
  }

  const keys = [...defs.map((d) => d.key), 'priceCADkg'];
  for (const m of materials) {
    if (m.familyEntry) continue;
    const products = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired);
    // A material whose every product is a declared variant (PP Lightweight) is its variants: they are its range.
    const plain = products.filter((g) => !g.variant).length;
    const variantOnly = products.length > 0 && plain === 0;
    // A twin's value is its sibling's: where the sibling is a declared variant, what it reads is set apart as the
    // sibling's is (D57, D89), whatever the twin's own row says.
    const variantValue = (g, v) => !!g.variant || (v.from?.origin === 'twin' && !!gradeById.get(v.from.gradeId)?.variant);
    const summary = {};
    for (const key of keys) {
      if (m.headline[key]?.notApplicable) continue;
      const entries = products.filter((g) => g.headline?.[key]).map((g) => ({ gradeId: g.id, variant: !variantOnly && variantValue(g, g.headline[key]), v: g.headline[key] }));
      summary[key] = summarise(entries, variantOnly ? products.length : plain);
      if (summary[key].n > 0) {
        m.headline[key] = productsHeadline(m.headline[key].unit, summary[key], gradeById, key);
        // The listings behind the products the median is of: a variant's are its own, and apart (unless it is all there is).
        if (key === 'priceCADkg') m.headline[key].priceIds = products.filter((g) => variantOnly || !g.variant).flatMap((g) => g.headline?.priceCADkg?.priceIds ?? []);
      }
    }
    m.summary = summary;
  }
}
