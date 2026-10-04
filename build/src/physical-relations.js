// Physical relations: the orderings physics fixes between two properties, read from data/tables/physical_relations.csv.
//
// One list serves three readers. The data lint (lint-rules.js) judges every pair of published measurements of one
// product against it (MEAS-PHYSICS-ORDER, MEAS-PHYSICS-HDT-LOADS). The registry (registry.js) refuses a headline's
// lower bounds (headline_definitions.csv) that no relation with Scope headline or both covers, and a headline relation
// that no headline reads (RELATIONS-HEADLINE-DRIFT), so the two cannot disagree. The compiled list travels in the
// database's registry for whatever else wants the same orderings.
//
// A relation is: Lower <= Higher, within a margin, for two values that share what its Same test names. The margin is
// `lower > higher x (1 + relative) + absolute`; a pair outside it is a finding.

const NA = 'Not applicable';

/** A film or a filament strand is not the bar a sheet's other rows were measured on, and neither is a bar printed at a
 *  setting its product is not meant for (D95): a pair across two forms is two claims about two things. */
export const specimenForm = (r) => (/^(Film|Filament)/.test(r['Specimen type'] ?? '') ? 'strand'
  : r['Specimen type'] === "Printed off the product's recipe" ? 'off-recipe' : 'bar');

// What each name in Same test reads off a measurement row (schema/vocab/relation-keys.csv).
const KEYS = {
  'grade': (r) => r.GradeID,
  'source': (r) => r.SourceID,
  'direction': (r) => r.Direction,
  'unit': (r) => r['Normalized unit'],
  'specimen form': specimenForm,
  'moisture condition': (r) => r['Moisture condition'],
  'post-processing': (r) => r['Post-processing'],
};

// A Vicat point is where a loaded needle sinks 1 mm, and the load decides where that is. Under the light load
// (10 N, method A) the needle waits for the polymer to go rubbery, so the Vicat sits at or above the glass
// transition. Under the heavy one (50 N on a 1 mm² tip, method B) it presses at 50 MPa and sinks as soon as a glassy
// bar has softened enough to yield, which on a printed PLA or ABS is below the glass transition, by as much as the
// polymer's hot strength allows. So a Vicat whose own words name the heavy load ("5 kg", "50 N", ISO 306's "B50" or
// "B120") is not ordered against the glass transition; a load the row does not state is still ordered. ASTM D1525's
// "Rate B" is a heating rate, not a load, and names nothing here.
const HEAVY_VICAT = /\b5\s?kg\b|\b50\s?N\b|(?<!Rate\s?)\bB\s?\/?\s?(50|120)\b/i;
const EXEMPT = {
  'Heavy-load Vicat': (r) => r.Property === 'Vicat softening temperature' && HEAVY_VICAT.test(r['Standard / load'] ?? ''),
};

const LOAD_TOLERANCE = 0.05;   // a stated test load matches its relation's within this fraction
const numOrNull = (cell) => (cell == null || cell === NA || cell === '' ? null : Number(cell));
const num = (r) => Number(r['Normalized value']);

/** The rows of physical_relations.csv as the checks read them. `appliesTo` is the parsed rule (registry.js parseAppliesTo). */
export function compileRelations(rows, parseAppliesTo, materialRows, issues = []) {
  return (rows ?? []).map((r) => ({
    id: r.RelationID, lower: r['Lower property'], higher: r['Higher property'],
    lowerLoadMPa: numOrNull(r['Lower load MPa']), higherLoadMPa: numOrNull(r['Higher load MPa']),
    sameTest: String(r['Same test']).split(';').map((s) => s.trim()).filter(Boolean),
    relativeMargin: Number(r['Relative margin']), absoluteMargin: Number(r['Absolute margin']),
    appliesTo: parseAppliesTo(r['Applies to'], `physical_relations ${r.RelationID}`, issues, materialRows), appliesToText: r['Applies to'] || null,
    exempt: r['Exempt rows'] === NA || !r['Exempt rows'] ? null : r['Exempt rows'],
    code: r['Finding code'], findingOn: r['Finding on'], scope: r.Scope, basis: r.Basis,
  }));
}

const sentenceTail = (basis) => String(basis).replace(/\.$/, '').replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());
const loadOk = (r, want) => want == null || Math.abs(Number(r['Test load MPa']) - want) <= want * LOAD_TOLERANCE;
const label = (property, load) => (load == null ? property : `${property} at ${load} MPa`);

/**
 * Every pair of `rows` (measurements already filtered to the numeric published values) that breaks `relation`.
 * `materialOf(row)` is the row's material in the shape the Applies to rule reads (a Morphology field), or null.
 */
export function* relationFindings(relation, rows, materialOf, applies) {
  const keyOf = (r) => relation.sameTest.map((k) => KEYS[k](r)).join('\u0000');
  const exempt = relation.exempt ? EXEMPT[relation.exempt] : () => false;
  const highers = new Map();
  for (const b of rows) {
    if (b.Property !== relation.higher || !loadOk(b, relation.higherLoadMPa)) continue;
    const k = keyOf(b);
    if (!highers.has(k)) highers.set(k, []);
    highers.get(k).push(b);
  }
  for (const a of rows) {
    if (a.Property !== relation.lower || !loadOk(a, relation.lowerLoadMPa)) continue;
    if (relation.appliesTo && !applies(relation.appliesTo, materialOf(a) ?? {})) continue;
    for (const b of highers.get(keyOf(a)) ?? []) {
      if (a === b || exempt(a) || exempt(b)) continue;
      if (num(a) > num(b) * (1 + relation.relativeMargin) + relation.absoluteMargin) {
        const message = `${label(relation.lower, relation.lowerLoadMPa)} ${num(a)} above ${label(relation.higher, relation.higherLoadMPa)} ${num(b)} (${relation.findingOn === 'lower' ? b.MeasurementID : a.MeasurementID}): ${sentenceTail(relation.basis)}`;
        yield { relation, lower: a, higher: b, record: relation.findingOn === 'lower' ? a : b, message };
      }
    }
  }
}

/**
 * A headline's lower bounds (headline_definitions.csv) are the projection of the relations onto a material's headline,
 * and the two must agree. Each lower-bound property of a headline needs a relation with Scope headline or both that
 * puts it under one of the headline's value properties (and, where the headline names a bound load, at that load);
 * the headline's own endpoint (its first value property), with no bound load, is the same property in another
 * direction, which the headline's direction rule handles. Each relation with Scope headline or both must be read by some headline.
 * Returns the disagreements as sentences.
 */
export function headlineDrift(relations, headlines) {
  const problems = [];
  const reads = (rel, h) => rel.scope !== 'measurement' && h.lowerBounds?.properties.includes(rel.lower) && h.valueProperties.includes(rel.higher)
    && (h.lowerBounds.loadMPa == null || (rel.lowerLoadMPa === h.lowerBounds.loadMPa && rel.higherLoadMPa === h.loadMPa));
  for (const h of headlines) {
    for (const property of h.lowerBounds?.properties ?? []) {
      if (relations.some((rel) => reads(rel, h) && rel.lower === property)) continue;
      if (property === h.valueProperties[0] && h.lowerBounds.loadMPa == null) continue;
      problems.push(`${h.key} takes ${property} as a lower bound${h.lowerBounds.loadMPa == null ? '' : ` at ${h.lowerBounds.loadMPa} MPa`}, but no relation with Scope headline or both puts it under ${h.valueProperties.join(' or ')}`);
    }
  }
  for (const rel of relations) {
    if (rel.scope === 'measurement') continue;
    if (!headlines.some((h) => reads(rel, h))) problems.push(`${rel.id} (${rel.lower} under ${rel.higher}) has Scope ${rel.scope}, but no headline lists ${rel.lower} as a lower bound of ${rel.higher}`);
  }
  return problems;
}
