// Products: each product's own values and print recipe, derived by rule, and each material summarised from its
// products (docs/GOALS.md: D83 and D84, decided 2026-09-25; re-center phase 1).
//
// Nothing here decides a verdict yet. A material's headline is still one measurement of its representative grade
// (compile.js), and the engine reads only that. This adds, beside it, what the engine will read instead:
//
//   grades[].headline[key]     the product's own value for each measurement headline, chosen by rule, and its price
//   grades[].print             the product's own print recipe from its own profiles, never a union across a material
//   materials[].summary[key]   the spread across the material's products: how many, quartiles, the typical product
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
// ASTM D648's low load is 66 psi, 0.455 MPa, and ISO 75 method B's 0.45 MPa: one test (validate.js, HDT-LOAD-WRONG).
const LOAD_TOLERANCE_MPA = 0.01;

/**
 * Whether a measurement can be a product's value for a headline, and at which level. Returns { excluded } with the
 * reason when it cannot, else { level, caveat }. The same tests as a material headline's selection (compile.js),
 * less the representative grade, which a product value does not need.
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
 * A product's own value for one headline: a pinned measurement (a `value` row of headlines.csv on this product) if it
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

/**
 * A product's print recipe: its own profiles' nozzle, bed and chamber against the H2C, whether it wants an enclosure,
 * a hardened nozzle and drying, and the annealing its sheets state for the values measured on annealed parts. Null
 * when the product has neither a profile nor an annealing schedule.
 */
function productPrint(profiles, gradeMeasurements) {
  const anneal = [];
  const seen = new Set();
  for (const m of gradeMeasurements) {
    if (m.postProcessingState !== 'annealed' || !m.anneal) continue;
    const key = `${m.anneal.tempC}|${m.anneal.hours}`;
    if (seen.has(key)) continue;
    seen.add(key);
    anneal.push({ tempC: m.anneal.tempC, hours: m.anneal.hours, measurementId: m.id });
  }
  if (!profiles.length && !anneal.length) return null;
  const states = profiles.map((p) => p.enclosureState);
  const hardened = profiles.map((p) => p.abrasion.requiresHardened);
  const dried = profiles.find((p) => p.drying.required);
  return {
    profileIds: profiles.map((p) => p.id),
    nozzle: recipeAxis(profiles, 'nozzle'),
    bed: recipeAxis(profiles, 'bed'),
    chamber: recipeAxis(profiles, 'chamber'),
    // "Recommended" outranks "not needed": the stricter of two statements about one product.
    enclosure: states.includes('recommended') ? 'recommended' : states.includes('not-needed') ? 'not-needed' : 'unknown',
    hardenedNozzle: hardened.includes(true) ? true : hardened.includes(false) ? false : null,
    drying: dried ? { tempC: dried.drying.tempC, hours: dried.drying.hours, profileId: dried.id } : null,
    anneal,
  };
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
    // The typical product is the one whose value is nearest the median; a tie goes to the lower value, then the lower ID.
    const typical = [...comparable].sort((a, b) => Math.abs(a.v.value - mid) - Math.abs(b.v.value - mid) || a.v.value - b.v.value || (a.gradeId < b.gradeId ? -1 : 1))[0];
    Object.assign(out, { min: sorted[0], max: sorted.at(-1), median: mid, typical: typical.gradeId });
    if (sorted.length >= QUARTILES_FROM) Object.assign(out, { q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75) });
  }
  if (asPublished.length) out.asPublished = span(asPublished);
  if (variants.length) out.variants = span(variants);
  return out;
}

/**
 * Attach every product's own values and print recipe, and every material's summary. `materialRows` are the materials
 * table's rows (a headline's Applies to tests them); `selections` its headlines.csv rows by MaterialID.
 */
export function attachProducts({ grades, materials, materialRows, measurements, profiles, prices, registry, selections }) {
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
  const pinnedIds = new Set();
  for (const list of selections.values()) for (const s of list) if (s.Use === 'value') pinnedIds.add(s.MeasurementID);

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
    const price = productPrice(pricesByGrade.get(g.id) ?? []);
    if (price) headline.priceCADkg = price;
    g.headline = headline;
    g.print = productPrint(profilesByGrade.get(g.id) ?? [], own);
  }

  const gradeById = new Map(grades.map((g) => [g.id, g]));
  const keys = [...defs.map((d) => d.key), 'priceCADkg'];
  for (const m of materials) {
    if (m.familyEntry) continue;
    const products = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired);
    const plain = products.filter((g) => !g.variant).length;
    const summary = {};
    for (const key of keys) {
      if (m.headline[key]?.notApplicable) continue;
      const entries = products.filter((g) => g.headline?.[key]).map((g) => ({ gradeId: g.id, variant: !!g.variant, v: g.headline[key] }));
      summary[key] = summarise(entries, plain);
    }
    m.summary = summary;
  }
}
