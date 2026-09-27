// The property registry: what every measured property and every headline means, read from
// data/tables/properties.csv and data/tables/headline_definitions.csv.
//
// Nothing else in the build or the app names a property's unit, direction, load, related evidence,
// domain, labels, filter, axis, table column or export header. A new property or headline is a row,
// and it reaches compile, validate, coverage, the drawer, the filter rail, the charts, the table and
// the CSV export with no code change (test/registry.test.js adds one to prove it).
//
// "Applies to" limits a property or headline to some materials, for properties that only mean
// something for some filaments (Shore A for elastomers, fibre content for reinforced grades):
//
//   Family: Flexible Elastomers
//   Modifier / filler: Carbon fibre | Glass fibre; Role: Structural / functional / appearance
//   Morphology: amorphous | semicrystalline | not modelled
//
// Clauses are separated by ";" and must all hold; values within a clause are alternatives. Morphology is the material's
// polymer's (polymers.csv, through its Estimate identity), "not modelled" where it names none.

const NA = 'Not applicable';

/** Materials columns an applicability rule may test, and the compiled material field each becomes. */
export const APPLICABILITY_FIELDS = {
  'Family': 'family',
  'Base polymer': 'basePolymer',
  'Modifier / filler': 'modifier',
  'Role': 'role',
  'Scope': 'scope',
  'H2C status': 'h2cStatus',
  'Morphology': 'morphology',
};

export const NOT_MODELLED = 'not modelled';

/** The materials table's rows, each with the Morphology of its polymer, which an applicability rule may test. */
export function materialRowsOf(wb) {
  const morphology = new Map((wb.Polymers?.rows ?? []).map((p) => [p.PolymerID, p.Morphology]));
  return wb.Materials.rows.map((r) => ({ ...r, Morphology: morphology.get(r['Estimate identity']) ?? NOT_MODELLED }));
}

const list = (cell) => (cell == null || cell === NA ? [] : String(cell).split(';').map((s) => s.trim()).filter(Boolean));
const bool = (cell) => cell === 'TRUE';
const numOrNull = (cell) => (cell == null || cell === NA ? null : Number(cell));
const orNull = (cell) => (cell == null || cell === NA ? null : cell);

/** Parse an "Applies to" rule. Returns null for "all materials". Unknown fields or values are errors. */
export function parseAppliesTo(text, where, issues, materialRows) {
  if (text == null || !String(text).trim()) return null;
  const clauses = [];
  for (const part of String(text).split(';').map((s) => s.trim()).filter(Boolean)) {
    const m = /^([^:]+):(.+)$/.exec(part);
    if (!m) { issues.push({ level: 'error', code: 'REGISTRY-APPLIES-TO', where, message: `Applies to "${part}" is not "Field: value | value"` }); continue; }
    const column = m[1].trim();
    const field = APPLICABILITY_FIELDS[column];
    if (!field) { issues.push({ level: 'error', code: 'REGISTRY-APPLIES-TO', where, message: `Applies to tests "${column}"; it may test ${Object.keys(APPLICABILITY_FIELDS).join(', ')}` }); continue; }
    const values = m[2].split('|').map((s) => s.trim()).filter(Boolean);
    const seen = new Set(materialRows.map((r) => r[column]));
    for (const v of values) if (!seen.has(v)) issues.push({ level: 'error', code: 'REGISTRY-APPLIES-TO', where, message: `Applies to names ${column} "${v}", which no material has` });
    clauses.push({ column, field, values });
  }
  return clauses.length ? clauses : null;
}

/** Does a rule include this material? Accepts a compiled material or a Materials row. */
export function applies(rule, material) {
  if (!rule) return true;
  return rule.every((c) => c.values.includes(material[c.field] ?? material[c.column]));
}

export function compileRegistry(wb, issues) {
  const materialRows = materialRowsOf(wb);
  const err = (code, where, message) => issues.push({ level: 'error', code, where, message });

  const properties = wb['Property registry'].rows.map((r) => {
    const where = `properties ${r.Property}`;
    const appliesTo = parseAppliesTo(r['Applies to'], where, issues, materialRows);
    if (appliesTo && !r['Not applicable reason']) err('REGISTRY-NA-REASON', where, 'Applies to is set, so a Not applicable reason is required');
    return {
      name: r.Property, domain: r.Domain, units: list(r.Units),
      appliesTo, appliesToText: r['Applies to'] ?? null, notApplicableReason: r['Not applicable reason'] ?? null,
      description: r.Description ?? null,
      replacedBy: r['Replaced by'] ?? null,
    };
  });
  const propertyByName = new Map(properties.map((p) => [p.name, p]));
  // A replaced property names a current one (audit 2026-09-15: the two Izod names are one test, migration m22).
  for (const p of properties.filter((x) => x.replacedBy)) {
    const next = propertyByName.get(p.replacedBy);
    if (!next || next.replacedBy) err('REGISTRY-REPLACED', `properties ${p.name}`, `Replaced by "${p.replacedBy}", which is ${next ? 'itself replaced' : 'not a property'}`);
  }

  const headlines = wb['Headline definitions'].rows.map((r) => {
    const where = `headline_definitions ${r.HeadlineKey}`;
    const appliesTo = parseAppliesTo(r['Applies to'], where, issues, materialRows);
    if (appliesTo && !r['Not applicable reason']) err('REGISTRY-NA-REASON', where, 'Applies to is set, so a Not applicable reason is required');
    const h = {
      key: r.HeadlineKey, kind: r.Kind, unit: r.Unit,
      valueProperties: list(r['Value properties']), relatedProperties: list(r['Related properties']),
      // Measurements of a material that bound the headline from below (an implied bound, D48 and D55): core, not inference.
      lowerBounds: list(r['Lower bound properties']).length ? {
        properties: list(r['Lower bound properties']), loadMPa: numOrNull(r['Lower bound load MPa']),
        excludeMoisture: list(r['Lower bound excludes']), why: orNull(r['Lower bound basis']),
      } : null,
      direction: orNull(r.Direction),
      // A value whose source states no direction: this headline's as published (D84), or none of its values (D92).
      unstatedDirection: orNull(r['Unstated direction']),
      loadMPa: numOrNull(r['Load MPa']),
      // The conditions an impact value is defined at (D92): the notch it must state, and the test temperature a stated
      // one must be.
      notch: orNull(r.Notch), testTemperatureC: numOrNull(r['Test temperature °C']),
      // The test standard a value that names one must name (D94): an Izod value to ASTM D256 printed in kJ/m² is that
      // test's energy per metre of notch, converted by its maker, not an ISO 180 bar. A value naming no standard counts.
      standard: orNull(r.Standard),
      evidenceGroup: orNull(r['Evidence group']),
      endpointNote: bool(r['Endpoint note']),
      comparisonNote: orNull(r['Comparison note']),
      labels: { short: r.Short, plain: r.Plain, technical: r.Technical, hint: r.Hint, axis: r['Axis label'], export: r['Export header'] },
      better: r.Better,
      filter: { group: r['Filter group'], operator: r['Filter operator'], example: r['Filter example'], nonNegative: bool(r['Non-negative']) },
      tableColumn: bool(r['Table column']), estimated: bool(r.Estimated), referenceProperty: orNull(r['Reference property']),
      appliesTo, appliesToText: r['Applies to'] ?? null, notApplicableReason: r['Not applicable reason'] ?? null,
    };
    for (const name of [...h.valueProperties, ...h.relatedProperties, ...(h.lowerBounds?.properties ?? [])]) {
      if (propertyByName.get(name)?.replacedBy) err('REGISTRY-REPLACED', where, `${name} is replaced by ${propertyByName.get(name).replacedBy}; name that instead`);
    }
    if (h.kind === 'measurement') {
      if (!h.valueProperties.length) err('REGISTRY-HEADLINE', where, 'A measurement headline needs at least one value property');
      if (!h.evidenceGroup) err('REGISTRY-HEADLINE', where, 'A measurement headline needs an evidence group');
      for (const name of h.valueProperties) {
        const p = propertyByName.get(name);
        if (p && !p.units.includes(h.unit)) err('REGISTRY-HEADLINE', where, `Value property ${name} is never measured in ${h.unit} (its units: ${p.units.join(', ')})`);
      }
      // A headline with a direction says what a value without one is; a headline without a direction has nothing to say.
      if (!!h.direction !== !!h.unstatedDirection) err('REGISTRY-HEADLINE', where, h.direction ? `Direction ${h.direction} needs an Unstated direction (as-published or excluded)` : 'Unstated direction is set, but the headline has no Direction');
    } else if (h.valueProperties.length || h.relatedProperties.length || h.unstatedDirection || h.notch || h.testTemperatureC != null || h.standard) {
      err('REGISTRY-HEADLINE', where, 'A price headline is not backed by measurements; its value and related properties and its test conditions must be Not applicable');
    }
    return h;
  });
  if (headlines.filter((h) => h.kind === 'price').length > 1) err('REGISTRY-HEADLINE', 'headline_definitions', 'Only one price headline exists');

  return { properties, headlines };
}

/** Convenience lookups over a compiled registry (db.registry). */
export const measurementHeadlines = (registry) => registry.headlines.filter((h) => h.kind === 'measurement');
export const headlineByKey = (registry, key) => registry.headlines.find((h) => h.key === key) ?? null;
export const propertiesInDomain = (registry, domain) => new Set(registry.properties.filter((p) => p.domain === domain).map((p) => p.name));
