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
// A headline may set more of what it is (D92), each a column of headline_definitions.csv: a notch (the notched impact
// strength takes only a bar stated to be notched), a test temperature (and no bar struck away from 23 ± 2 °C), and
// whether a value with no stated direction is as published or none of its values (the layer strength, along Z, takes
// only a bar the source says it pulled along Z). And a test standard (D94): the notched Izod strength takes no value that
// names ASTM D256 and not ISO 180.
//
// A material's range is the spread of its products, never uncertainty about one of them: PEBA's three products are
// three products (D8's example, which D83 answers by counting them, not by pooling them).

import { isPartSpecimen, annealedBesideAsPrinted, offRecipeWhy } from './normalize/specimen.js';
import { median, cents } from './normalize/values.js';
import { priceSample, convertedFrom } from './prices.js';
import { measurementHeadlines, applies } from './registry.js';
import { aggregateGate } from './gates.js';
import { CLAIM } from './product-claims.js';

export const LEVEL = { COMPARABLE: 'comparable', AS_PUBLISHED: 'as-published' };

// A direction the source leaves open is not a direction the source states otherwise: it may be the headline's.
const UNSTATED_DIRECTIONS = new Set(['unknown', 'not-applicable']);
// ASTM D648's low load is 66 psi, 0.455 MPa, and ISO 75 method B's 0.45 MPa: one test (estimate/observations.js reads
// 0.44 to 0.46 MPa as it too).
const LOAD_TOLERANCE_MPA = 0.01;
// The standard laboratory atmosphere of ISO 291 and ASTM D618 is 23 ± 2 °C: a bar struck at 25 °C was struck in it, one
// at -30 °C was not (D92).
export const TEST_TEMPERATURE_TOLERANCE_C = 2;

/** Two annealing schedules are one where both parts agree, an unstated part with an unstated part (D99). */
const sameSchedule = (a, t) => (a?.tempC ?? null) === (t?.tempC ?? null) && (a?.hours ?? null) === (t?.hours ?? null);
/** A schedule as a reader says it: "at 120 °C for 16 h", with what the sheet does not state said so. */
export const scheduleText = (t) => `at ${t?.tempC != null ? `${t.tempC} °C` : 'a temperature not stated'} for ${t?.hours != null ? `${t.hours} h` : 'a time not stated'}`;

/**
 * Whether a measurement can be a product's value for a headline, and at which level. Returns { excluded } with the
 * reason when it cannot, else { level, caveat }.
 *
 * With a `state` (D99: { treatment: null | { tempC, hours }, moisture: 'dry' | 'conditioned' }) it asks whether the value
 * is the product's in that state: for a headline annealing changes, a value as printed or unstated is the as-printed
 * state's and one annealed at a schedule is that schedule's only; for one water changes, a conditioned value is the
 * conditioned state's and a dry or unstated one the dry state's. Without a state it is the product's published value,
 * as the table and the material's spread show it (an annealed value where the product publishes none as printed).
 */
export function assess(m, def, gradeMeasurements, state = null) {
  if (!m.numeric) return { excluded: `no usable numeric value (${m.dataStatus})` };
  if (!def.valueProperties.includes(m.property)) return { excluded: `measures ${m.property}` };
  if (m.unit !== def.unit) return { excluded: `in ${m.unit}, not ${def.unit}` };
  if (m.implausible) return { excluded: 'flagged physically implausible' };
  if (!isPartSpecimen(m.specimenType)) {
    // A bar printed at a setting the product is not meant for (D95), or below 100 % infill (D130), is printed, but not
    // the product as it is printed.
    return { excluded: m.specimenForm === 'off-recipe' ? offRecipeWhy(m.specimenType, { brief: true }) : `a ${m.specimenForm} specimen, not a printed part` };
  }
  if (state && def.changesWithMoisture) {
    if (state.moisture === 'conditioned' && m.moistureState !== 'conditioned') return { excluded: 'not measured after moisture conditioning' };
    if (state.moisture !== 'conditioned' && m.moistureState === 'conditioned') return { excluded: 'measured after moisture conditioning' };
  } else if (m.moistureState === 'conditioned') return { excluded: 'measured after moisture conditioning' };
  if (state && def.changesWithAnnealing) {
    if (state.treatment && (m.postProcessingState !== 'annealed' || !sameSchedule(m.anneal, state.treatment))) return { excluded: `not measured after annealing ${scheduleText(state.treatment)}` };
    if (!state.treatment && m.postProcessingState === 'annealed') return { excluded: `measured after annealing ${scheduleText(m.anneal)}, not as printed` };
  } else if (annealedBesideAsPrinted(m, gradeMeasurements)) return { excluded: 'annealed, and the product publishes it as printed' };
  // An impact headline is defined on a notched bar at room temperature (D92). An unnotched bar absorbs several times the
  // energy, and a notch the source does not state may be either, so neither is ever the headline's value; nor is a
  // bar struck cold. A temperature the source does not state is the laboratory's, as it is for every other headline.
  if (def.notch && m.notch !== def.notch) {
    return { excluded: m.notch === 'Unnotched' ? `an unnotched bar, not ${def.notch.toLowerCase()}` : m.notch === 'Notched' ? `a notched bar, not ${def.notch.toLowerCase()}`
      : 'the source does not state whether the bar was notched' };
  }
  if (def.testTemperatureC != null && m.testTemperatureC != null && Math.abs(m.testTemperatureC - def.testTemperatureC) > TEST_TEMPERATURE_TOLERANCE_C) {
    return { excluded: `tested at ${m.testTemperatureC} °C, not ${def.testTemperatureC} °C` };
  }
  // A headline may name its test standard (D94): a value that names only others is another test's, even in the
  // headline's unit (an Izod value to ASTM D256 printed in kJ/m² is that test's energy per metre of notch, converted by
  // its maker). A value that names no standard is not refused for it.
  if (def.standard && m.standards?.length && !m.standards.includes(def.standard)) {
    return { excluded: `measured to ${m.standards.join(', ')}, not ${def.standard}` };
  }
  let caveat = null;
  if (def.direction && m.direction !== def.direction) {
    if (!UNSTATED_DIRECTIONS.has(m.direction)) return { excluded: `a ${m.direction} measurement, not ${def.direction}` };
    // A value that states no direction may be an XY bar, the way makers test unless they say otherwise, and is counted
    // apart (D84); it is never a Z value, which a maker who pulls a bar across its layers says it is (D92).
    if (def.unstatedDirection === 'excluded') return { excluded: `the source states no direction, and a ${def.direction} value is one it says is ${def.direction}` };
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
// A published bound is an interval open at one end ("> 500 %": lo set, hi null), which a point, a range and a band are not.
const oneSided = (iv) => !!iv && (iv.lo == null) !== (iv.hi == null);

/**
 * The order in which a product's candidates for one headline are preferred, most preferred first. Deterministic: the
 * last key is the measurement ID. Comparable before as published; a printed specimen before an unstated one; for a
 * headline with no direction, a flat bar before an edge or upright one; as printed before unstated before annealed; dry before unstated; the product's own data sheet before another source;
 * the headline's first value property (its unspecified endpoint) before the others; a point before a range or bound.
 */
export function preference(m, a, grade, def) {
  return [
    a.level === LEVEL.COMPARABLE ? 0 : 1,
    m.specimenForm === 'printed' ? 0 : 1,
    // A headline with no direction (heat deflection, density) takes a flat bar's value before an edge or upright one's:
    // makers test flat unless they say otherwise, and an XZ, ZX or Z value is another bar's (D92; Stratasys prints its
    // heat deflections XY and XZ side by side).
    !def.direction && ['Z', 'XZ', 'ZX'].includes(m.direction) ? 1 : 0,
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
  // What the screening policy admitted unstated (D99; GOALS 2026-09-28, decision 5): a "comparable" value is a policy,
  // not an equivalence, and a verdict says which of the conditions that could change this value its source left open.
  const admitted = [];
  if ((def.changesWithAnnealing || def.changesWithMoisture) && m.specimenForm === 'not-stated') admitted.push('specimen');
  if (def.changesWithMoisture && m.moistureState === 'not-stated') admitted.push('moisture');
  if (def.changesWithAnnealing && m.postProcessingState === 'not-stated') admitted.push('treatment');
  if (admitted.length) v.admitted = admitted;
  // The method, which a reason names: an ISO 75 and an ASTM D648 heat deflection are pooled by the screen, not equal.
  if (m.standards?.length) v.standards = m.standards;
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
function chooseValue(grade, def, gradeMeasurements, pinnedIds, state = null) {
  const candidates = [];
  for (const m of gradeMeasurements) {
    const a = assess(m, def, gradeMeasurements, state);
    if (!a.excluded) candidates.push({ m, a });
  }
  if (!candidates.length) return null;
  const pinned = candidates.find((c) => pinnedIds.has(c.m.id));
  if (pinned) return productValue(pinned.m, pinned.a, def, true);
  candidates.sort((x, y) => compareKeys(preference(x.m, x.a, grade, def), preference(y.m, y.a, grade, def)) || (x.m.id < y.m.id ? -1 : 1));
  const { chosen, endpoints } = endpointMaximum(candidates[0], candidates, def);
  const v = productValue(chosen.m, chosen.a, def, false);
  if (endpoints) v.endpoints = endpoints;
  return v;
}

/**
 * The ultimate strength of a test is its maximum stress, so it is at least the stress at yield and at break that the same
 * test prints (headline_definitions.csv Lower bound properties; D126). Where the rule chose one of these endpoints, the
 * value is the greatest of the endpoints of that test: the same source, product, direction, specimen, moisture and
 * post-processing state, test temperature. Another source's number is another test and is not compared. Returns the
 * candidate to read and, where more than one endpoint was compared, which ones, so the drawer can say "maximum of yield 43
 * and break 52". A headline whose bound is another test (heat deflection at a heavier load) has no endpoints and is
 * untouched, and so is a published upper bound ("< 60"), which proves nothing about the value.
 */
function endpointMaximum(first, candidates, def) {
  const rel = def.lowerBounds;
  const m = first.m;
  const upper = (x) => !!x.m.interval && x.m.interval.lo == null && x.m.interval.hi != null;
  if (!rel || rel.loadMPa != null || !rel.properties.includes(m.property) || upper(first)) return { chosen: first, endpoints: null };
  const sameTest = (x) => rel.properties.includes(x.m.property) && !upper(x)
    && x.m.sourceId === m.sourceId && x.m.gradeId === m.gradeId && x.m.direction === m.direction && x.m.specimenType === m.specimenType
    && x.m.moistureState === m.moistureState && x.m.postProcessingState === m.postProcessingState && sameSchedule(x.m.anneal, m.anneal)
    && (x.m.testTemperatureC ?? null) === (m.testTemperatureC ?? null);
  // One endpoint per property, the one the rule prefers: two rows of one property are repeats of a test, not its endpoints.
  const test = [];
  for (const x of candidates) if (sameTest(x) && !test.some((y) => y.m.property === x.m.property)) test.push(x);
  if (test.length < 2) return { chosen: first, endpoints: null };
  // The preferred endpoint wins a tie, so a test whose endpoints agree or that already ends on its maximum is unchanged.
  const chosen = test.reduce((best, x) => (x.m.value > best.m.value ? x : best), first);
  return { chosen, endpoints: test.map((x) => ({ measurementId: x.m.id, property: x.m.property, value: x.m.value })) };
}

/** The value the rule alone chooses for a product, pins ignored: what `scripts/audit/rule-vs-hand-picks.mjs` compares. */
export const ruleValue = (grade, def, gradeMeasurements) => chooseValue(grade, def, gradeMeasurements, new Set());

/**
 * The product's price: the median regular CAD/kg of its own listings in the headline sample, as a material's is. Its
 * Canadian listings where it has any; its foreign ones, converted at the rate in force, only where it has none (D113),
 * and then it says so.
 */
function productPrice(gradePrices) {
  const sample = priceSample(gradePrices);
  if (!sample.length) return null;
  const converted = convertedFrom(sample);
  return { value: cents(median(sample.map((p) => p.regularPerKg))), level: LEVEL.COMPARABLE, observations: sample.length, priceIds: sample.map((p) => p.id), ...(converted ? { converted } : {}) };
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
// The parts of a recipe, in the order they are read. The guide answers the print gate's five (D88) and drying (D127); the
// annealing of a product's parts is its treatment, which only its own sheet or its twin's may give.
const RECIPE_AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle', 'drying'];
export const GUIDE_AXES = ['nozzle', 'bed', 'chamber', 'enclosure', 'hardenedNozzle', 'drying'];
// The strongest drying statement of a set of profiles decides the axis: a schedule it requires, then one it advises for a
// condition, then a statement that none is needed (D127).
const DRYING_ORDER = ['required', 'optional', 'not-needed'];

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
  for (const need of DRYING_ORDER) {
    const said = profiles.filter((p) => p.drying.need === need);
    const dried = said.find((p) => p.drying.tempC != null) ?? said[0];
    if (dried) return { need, tempC: dried.drying.tempC, hours: dried.drying.hours, hoursOpen: dried.drying.hoursOpen, profileId: dried.id };
  }
  return null;
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
    default: return profiles.some((p) => p.drying.need !== 'unknown');
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
// A source that asks for an enclosure and gives no chamber temperature has said all it will about the chamber. A
// printer maker's guide row that means its own enclosed printers declares its chamber "enclosed" instead (D90).
const ENCLOSURE_ONLY = 'Asks for an enclosure but gives no chamber temperature, so 65 °C is not shown to be enough';

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
const twinOrigin = (t) => ({ origin: 'twin', gradeId: t.id, label: `data sheet shared with ${productName(t)}` });
// "from" the guide says it is not the product's own sheet, whoever makes the product (D124 amends D88's wording).
// eslint-disable-next-line no-unused-vars
function guideOrigin(guide, grade, publisher) {
  return { origin: 'guide', guideId: guide.id, sourceId: guide.sourceId, guide: guide.name, label: `from ${guide.name}` };
}
const labelled = (axis, from) => ({ ...axis, reason: `${axis.reason} (${from.label})` });

/**
 * A product's print recipe: its own profiles' nozzle, bed and chamber against the H2C, whether it wants an enclosure,
 * a hardened nozzle and drying, and the annealing its sheets state for the values measured on annealed parts. Where its
 * own profiles say nothing on a part, its twin's do (the same sheet, D89), and for the print gate's parts after that
 * its material's printer maker's guide (D88; its drying statement too, D127); each part read that way says where it
 * came from, in `from` and in its reason. Null when nothing at all is known.
 */
function productPrint(grade, own, twins, guide, publisher) {
  const out = { profileIds: own.profiles.map((p) => p.id) };
  const from = {};
  for (const axis of RECIPE_AXES) {
    let value = axisOf(own.profiles, axis);
    if (!speaksTo(own.profiles, axis)) {
      // A product that holds a profile of its own does not read its twin's hardened-nozzle statement: whether a filament
      // wears a brass nozzle is the product's to say, and a sibling's sheet is not evidence for it (D127, amending D89).
      const twin = axis === 'hardenedNozzle' && own.profiles.length ? undefined : twins.find((t) => speaksTo(t.profiles, axis));
      const read = twin ? twin.profiles : guide && guideAnswers(guide, axis) ? [guide] : null;
      if (read) {
        from[axis] = twin ? twinOrigin(twin.grade) : guideOrigin(guide, grade, publisher);
        value = axisOf(read, axis);
        if (axis === 'drying' && !twin) value = { ...value, profileId: null };
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

/**
 * A product's states with its twin's where its own are silent (D89, D99): a state a twin publishes and it does not is
 * its state too, and a value its own state lacks is the twin's of the same state, labelled. The first state stays first.
 */
function twinStates(own, siblings) {
  if (!siblings.length) return own;
  const out = own.map((s) => ({ ...s, values: { ...s.values } }));
  for (const { grade: t, states } of siblings) {
    for (const s of states) {
      let mine = out.find((x) => x.id === s.id);
      if (!mine) { mine = { ...s, values: {} }; out.push(mine); }
      for (const [key, v] of Object.entries(s.values)) {
        if (mine.values[key] || v.from) continue;
        const { pinned, ...value } = v;
        mine.values[key] = { ...value, from: twinOrigin(t) };
      }
    }
  }
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
    // A published bound ("> 650 %") counts here as its number, which is all the median can take; the page says which
    // values were bounds, and which end of the range (or the median itself) is one, so none reads as a measurement.
    const bounded = comparable.filter((e) => oneSided(e.v.interval));
    if (bounded.length) {
      const at = (value) => { const b = bounded.find((e) => e.v.value === value); return b ? (b.v.interval.lo != null ? 'lower' : 'upper') : null; };
      out.bounds = { n: bounded.length, min: at(out.min), max: at(out.max) };
    }
    if (sorted.length >= QUARTILES_FROM) Object.assign(out, { q1: quantile(sorted, 0.25), q3: quantile(sorted, 0.75) });
    const twins = comparable.filter((e) => e.v.from?.origin === 'twin').length;
    if (twins) out.twins = twins;
    // Prices converted from another currency (D113): how many, from what, at which rate date.
    const converted = comparable.filter((e) => e.v.converted);
    if (converted.length) {
      out.converted = { products: converted.length, currencies: [...new Set(converted.flatMap((e) => e.v.converted.currencies))].sort(),
        rateDate: converted.map((e) => e.v.converted.rateDate).filter(Boolean).sort().at(-1) ?? null };
    }
  }
  if (asPublished.length) out.asPublished = span(asPublished);
  if (variants.length) out.variants = span(variants);
  return out;
}

/**
 * The comparable values of a spread from products their makers sell as toughened (product_claims.csv, D133), and what
 * the other comparable products give. Both stay in the median; the page names the split so the high end is not read as
 * the material's. A twin reads its sibling's claim as it reads its sibling's value (D89). Null where none is claimed.
 */
function claimedSplit(entries, claim, isClaimed) {
  const comparable = entries.filter((e) => !e.variant && e.v.level === LEVEL.COMPARABLE);
  const claimed = comparable.filter(isClaimed);
  if (!claimed.length) return null;
  const values = (list) => list.map((e) => e.v.value).sort((a, b) => a - b);
  const c = values(claimed);
  const o = values(comparable.filter((e) => !isClaimed(e)));
  return {
    claim, n: c.length, min: c[0], max: c.at(-1), gradeIds: claimed.map((e) => e.gradeId).sort(),
    others: o.length ? { n: o.length, min: o[0], max: o.at(-1), median: tidy(median(o)),
      ...(o.length >= QUARTILES_FROM ? { q1: quantile(o, 0.25), q3: quantile(o, 0.75) } : {}) } : null,
  };
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
      asPublished: s.asPublished ?? null, variants: s.variants ?? null, ...(s.twins ? { twins: s.twins } : {}), ...(s.claimed ? { claimed: s.claimed } : {}) },
    typical: { gradeId: s.typical, measurementId: typical?.measurementId ?? null, value: typical?.value ?? null },
  };
  if (s.bounds) h.spread.bounds = s.bounds;
  if (oneSided(typical?.interval)) h.typical.interval = typical.interval;
  if (s.n === 1) Object.assign(h, { measurementId: typical?.measurementId ?? null, gradeId: s.typical });
  if (key === 'priceCADkg') {
    h.observations = s.n;
    // How many of the prices the median is of were converted from another currency, which the page says (D113).
    if (s.converted) h.converted = s.converted;
  }
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
 * whose sheets print one table (R053) that the database records once. One holding values comes first, then one of the
 * same maker, then the one holding the most values, then by ID. A key never spans two materials (FORMULATION-KEY-SPANS-MATERIALS), so a product
 * that reprints another material's table (R166) has no twin and reads nothing.
 */
function twinsOf(grades, measurementsByGrade) {
  const byKey = new Map();
  for (const g of grades) {
    if (g.retired || /-R\d+$/.test(g.id) || !g.formulationKey || /^Not /.test(g.formulationKey)) continue;
    const k = `${g.materialId}\u0000${g.formulationKey}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(g);
  }
  const count = (g) => measurementsByGrade.get(g.id)?.length ?? 0;
  const holds = (g) => (count(g) ? 0 : 1);
  const out = new Map();
  for (const list of byKey.values()) {
    if (list.length < 2) continue;
    // A product reads its own maker's sheet before another maker's reprint of the table (m281's clusters).
    const sameMaker = (g, x) => (x.manufacturer === g.manufacturer ? 0 : 1);
    // Among those, the carrier of the shared table holds most of its values: a sibling holding a statement or two of
    // its own (a portfolio's row for it) is not where the others read the table from (completeness round, D136).
    for (const g of list) out.set(g.id, list.filter((x) => x !== g).sort((a, b) => holds(a) - holds(b) || sameMaker(g, a) - sameMaker(g, b) || count(b) - count(a) || (a.id < b.id ? -1 : 1)));
  }
  return out;
}

/** A state's identifier: "as-printed", "annealed:120:16", "conditioned", "annealed:120:16+conditioned" (x: not stated). */
export const stateId = (treatment, moisture) => [treatment ? `annealed:${treatment.tempC ?? 'x'}:${treatment.hours ?? 'x'}` : null,
  moisture === 'conditioned' ? 'conditioned' : null].filter(Boolean).join('+') || 'as-printed';

/**
 * A product's decision states (D99): the states it can be made in that its own sheets publish values for. As printed
 * and dry, always and first; each annealing schedule its annealed values state; conditioned, where it publishes a
 * conditioned value; and each combination the values reach. A state holds, for each headline that state changes, the
 * value the rule chooses among the measurements of that state only; the first state holds every headline. Two
 * properties measured in different states are never joined as one part: a state has only its own values, and a headline
 * the state does not change (a density) is read from the first. Where a state lacks a value it is unknown, never filled
 * from another state; the engine says which state does have one.
 */
function productStates(grade, defs, own, pinnedIds) {
  const schedules = [];
  for (const m of own) {
    if (!m.numeric || m.postProcessingState !== 'annealed') continue;
    const t = { tempC: m.anneal?.tempC ?? null, hours: m.anneal?.hours ?? null };
    if (!schedules.some((s) => sameSchedule(s, t))) schedules.push(t);
  }
  schedules.sort((a, b) => (a.tempC ?? Infinity) - (b.tempC ?? Infinity) || (a.hours ?? Infinity) - (b.hours ?? Infinity));
  const moistures = ['dry', ...(own.some((m) => m.numeric && m.moistureState === 'conditioned') ? ['conditioned'] : [])];
  const states = [];
  for (const treatment of [null, ...schedules]) {
    for (const moisture of moistures) {
      const first = !treatment && moisture === 'dry';
      const values = {};
      for (const def of defs) {
        if (!first && !((treatment && def.changesWithAnnealing) || (moisture === 'conditioned' && def.changesWithMoisture))) continue;
        const v = chooseValue(grade, def, own, pinnedIds, { treatment, moisture });
        if (v) values[def.key] = v;
      }
      if (first || Object.keys(values).length) states.push({ id: stateId(treatment, moisture), treatment, moisture, values });
    }
  }
  return states;
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
  // one the sibling itself read. The same for its decision states (D99).
  const ownValues = new Map();
  const ownStates = new Map();
  for (const g of grades) {
    if (g.retired) continue;
    const row = rowById.get(g.materialId);
    const own = measurementsByGrade.get(g.id) ?? [];
    const headline = {};
    // A headline that does not apply to the material (heat deflection of an elastomer) has no product values either.
    const applicable = defs.filter((def) => !row || applies(def.appliesTo, row));
    for (const def of applicable) {
      const v = chooseValue(g, def, own, pinnedIds);
      if (v) headline[def.key] = v;
    }
    ownValues.set(g.id, { ...headline });
    ownStates.set(g.id, productStates(g, applicable, own, pinnedIds));
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
    g.states = twinStates(ownStates.get(g.id), siblings.map((t) => ({ grade: t, states: ownStates.get(t.id) ?? [] })));
    // The first state holds every headline, the product's own price too: a price is never a state's, nor a twin's.
    if (g.headline.priceCADkg) g.states[0].values.priceCADkg = g.headline.priceCADkg;
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
    // A guide row is mapped to the material its type is (D88); a variant of that material (a dense or lightweight
    // filler its type does not have) is not that type, and reads nothing from it (D129).
    const guide = g.variant ? null : guideByMaterial.get(g.materialId) ?? null;
    g.print = productPrint(g, recipeOf(g), siblings.map(recipeOf), guide, guide && sourceById.get(guide.sourceId)?.publisher);
    // Who prints the same sheet (D89): the engine reads their records of that sheet for this product too (D98).
    if (siblings.length) g.twins = siblings.map((x) => x.id);
  }

  const keys = [...defs.map((d) => d.key), 'priceCADkg'];
  const defByKey = new Map(defs.map((d) => [d.key, d]));
  for (const m of materials) {
    if (m.familyEntry) continue;
    const products = m.gradeIds.map((id) => gradeById.get(id)).filter((g) => g && !g.retired);
    // A material whose every product is a declared variant (PP Lightweight) is its variants: they are its range.
    const plain = products.filter((g) => !g.variant).length;
    const variantOnly = products.length > 0 && plain === 0;
    // A twin's value is its sibling's: where the sibling is a declared variant, what it reads is set apart as the
    // sibling's is (D57, D89), whatever the twin's own row says.
    const variantValue = (g, v) => !!g.variant || (v.from?.origin === 'twin' && !!gradeById.get(v.from.gradeId)?.variant);
    // The same for what a maker sells a product as (D133): a twin's value is its sibling's, and so is its claim.
    const claimsOf = (g, v) => (v.from?.origin === 'twin' ? gradeById.get(v.from.gradeId) : g)?.claims?.map((c) => c.claim) ?? [];
    const summary = {};
    for (const key of keys) {
      if (m.headline[key]?.notApplicable) continue;
      const entries = products.filter((g) => g.headline?.[key]).map((g) => ({ gradeId: g.id, variant: !variantOnly && variantValue(g, g.headline[key]), v: g.headline[key] }));
      // A headline whose spread names the products sold as toughened (D133) says how many and what the others give.
      // Set apart, their comparable values leave the median as a variant's do, unless every comparable value is theirs.
      const def = defByKey.get(key);
      const split = def?.toughened ? claimedSplit(entries, CLAIM.TOUGHENED, (e) => claimsOf(gradeById.get(e.gradeId), e.v).includes(CLAIM.TOUGHENED)) : null;
      const apart = def?.toughened === 'set apart' && split?.others ? new Set(split.gradeIds) : null;
      const counted = apart ? entries.filter((e) => !(apart.has(e.gradeId) && !e.variant && e.v.level === LEVEL.COMPARABLE)) : entries;
      summary[key] = summarise(counted, (variantOnly ? products.length : plain) - (apart?.size ?? 0));
      if (split) summary[key].claimed = apart ? { ...split, setApart: true } : split;
      if (summary[key].n > 0) {
        m.headline[key] = productsHeadline(m.headline[key].unit, summary[key], gradeById, key);
        // The listings behind the products the median is of: a variant's are its own, and apart (unless it is all there is).
        if (key === 'priceCADkg') m.headline[key].priceIds = products.filter((g) => variantOnly || !g.variant).flatMap((g) => g.headline?.priceCADkg?.priceIds ?? []);
      }
    }
    m.summary = summary;
  }
}
