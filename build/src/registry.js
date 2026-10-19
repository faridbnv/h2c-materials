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

import { compileRelations, headlineDrift } from './physical-relations.js';

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
  'Printed state': 'printedState',
};

export const NOT_MODELLED = 'not modelled';

/**
 * How a material's part is as printed (D158): rubbery for an elastomer; glassy for an amorphous polymer and for a
 * semicrystalline one that prints amorphous (PLA, PET: polymers.csv As printed), unless fibre nucleates it in a hot print
 * (PPA); crystalline otherwise. A physics rule about a glassy bar (its heat deflection near its glass transition) reads
 * this, not the morphology: PLA is semicrystalline and prints glassy.
 */
export function printedStateOf(polymer, modifier) {
  if (!polymer) return NOT_MODELLED;
  if (polymer.Morphology === 'elastomer') return 'rubbery';
  if (polymer.Morphology !== 'semicrystalline') return 'glassy';
  const fibre = modifier === 'Carbon fibre' || modifier === 'Glass fibre';
  if (polymer['As printed'] === 'prints amorphous' || (polymer['As printed'] === 'prints amorphous unless fibre-filled' && !fibre)) return 'glassy';
  return 'crystalline';
}

/** A materials row with what an applicability rule may test of its polymer: its Morphology and its Printed state. */
export const withPolymer = (row, polymer) => ({ ...row, Morphology: polymer?.Morphology ?? NOT_MODELLED, 'Printed state': printedStateOf(polymer, row['Modifier / filler']) });

/** The materials table's rows, each with its polymer's Morphology and Printed state, which an applicability rule may test. */
export function materialRowsOf(wb) {
  const polymers = new Map((wb.Polymers?.rows ?? []).map((p) => [p.PolymerID, p]));
  return wb.Materials.rows.map((r) => withPolymer(r, polymers.get(r['Estimate identity'])));
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

  // The comparisons the drawer draws (drawer_comparisons.csv, D133, D139): a heading each, with the words that belong to
  // the whole comparison. Its caption is the method.csv rule of the same Topic.
  // A comparison may list properties it does not draw (another endpoint of the test, D140) and carry a second closed
  // line, a method.csv rule of its own Topic.
  const comparisons = (wb['Drawer comparisons']?.rows ?? []).map((r) => ({ name: r.Comparison, about: r.About, pairLabel: orNull(r['Pair label']),
    listed: list(r['Listed properties']), note: orNull(r['Note topic']) }));
  const comparisonNames = new Set(comparisons.map((x) => x.name));
  const captions = new Set((wb.Method?.rows ?? []).filter((r) => r.Section === 'Comparison').map((r) => r.Topic));
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
      // A value whose source states no load: this headline's as published (D84), or none of its values (D139).
      unstatedLoad: orNull(r['Unstated load']),
      // The conditions an impact value is defined at (D92): the notch it must state, and the test temperature a stated
      // one must be.
      notch: orNull(r.Notch), testTemperatureC: numOrNull(r['Test temperature °C']),
      // The test standard a value that names one must name (D94): an Izod value to ASTM D256 printed in kJ/m² is that
      // test's energy per metre of notch, converted by its maker, not an ISO 180 bar. A value naming no standard counts.
      standard: orNull(r.Standard),
      // How far one maker's published figure moves between its own bars and sheets (D152): a value the way the
      // requirement asks that misses by less is on the line, one that meets it by less passes with a thin margin.
      // { value, is: 'relative' (a percentage of the limit) | 'absolute' (the headline's unit) }, or null.
      testScatter: numOrNull(r['Test scatter']) == null ? null : { value: numOrNull(r['Test scatter']), is: r['Test scatter is'] },
      // Whether annealing, or absorbed water, changes the part's value (D99): a value measured in one of those states is
      // the product's in that state only. False: the product's in every state (a density is the resin's).
      changesWithAnnealing: bool(r['Changes with annealing']), changesWithMoisture: bool(r['Changes with moisture']),
      evidenceGroup: orNull(r['Evidence group']),
      endpointNote: bool(r['Endpoint note']),
      comparisonNote: orNull(r['Comparison note']),
      // The comparison the drawer draws it in, beside the headlines that name the same one (D133): a row of
      // drawer_comparisons.csv, whose method.csv rule is the caption. Nothing is converted between them.
      drawerComparison: orNull(r['Drawer comparison']),
      // Drawn in the drawer alone (D139): each product's value and the material's spread, but never a filter, an axis, a
      // table or export column, a scenario key or a decision state.
      drawerOnly: bool(r['Drawer only']),
      // What its spread does with the products sold as toughened (product_claims.csv, D133): named, it says how many and
      // what the others give, and keeps them in the median; set apart, they leave the median as a variant's values do.
      toughened: orNull(r['Sold as toughened']),
      labels: { short: r.Short, plain: r.Plain, technical: r.Technical, hint: r.Hint, axis: r['Axis label'], export: r['Export header'] },
      better: r.Better,
      filter: { group: r['Filter group'], operator: r['Filter operator'], example: r['Filter example'], nonNegative: bool(r['Non-negative']) },
      tableColumn: bool(r['Table column']), estimated: bool(r.Estimated), referenceProperty: orNull(r['Reference property']),
      appliesTo, appliesToText: r['Applies to'] ?? null, notApplicableReason: r['Not applicable reason'] ?? null,
    };
    if (h.drawerComparison && !comparisonNames.has(h.drawerComparison)) err('REGISTRY-COMPARISON', where, `Drawer comparison "${h.drawerComparison}" names no row of drawer_comparisons.csv`);
    // A scatter says what it is a scatter of, and nothing else does (D152).
    if ((h.testScatter == null) !== (orNull(r['Test scatter is']) == null)) err('REGISTRY-HEADLINE', where, 'Test scatter and Test scatter is are set together, or both Not applicable');
    if (h.toughened && h.kind !== 'measurement') err('REGISTRY-HEADLINE', where, 'Only a measurement headline\'s spread names the products sold as toughened');
    if (h.drawerComparison && h.kind !== 'measurement') err('REGISTRY-HEADLINE', where, 'Only a measurement headline is drawn product by product in a drawer comparison');
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
      // The same for a load: a headline defined at one says what a value with none is.
      if ((h.loadMPa != null) !== !!h.unstatedLoad) err('REGISTRY-HEADLINE', where, h.loadMPa != null ? `Load MPa ${h.loadMPa} needs an Unstated load (as-published or excluded)` : 'Unstated load is set, but the headline has no Load MPa');
    } else if (h.valueProperties.length || h.relatedProperties.length || h.unstatedDirection || h.notch || h.testTemperatureC != null || h.standard || h.changesWithAnnealing || h.changesWithMoisture || h.testScatter) {
      err('REGISTRY-HEADLINE', where, 'A price headline is not backed by measurements; its value and related properties, its test conditions and its test scatter must be Not applicable');
    }
    return h;
  });
  if (headlines.filter((h) => h.kind === 'price').length > 1) err('REGISTRY-HEADLINE', 'headline_definitions', 'Only one price headline exists');
  checkComparisons(comparisons, headlines, { captions, propertyByName, err });

  // The orderings physics fixes between two properties (physical_relations.csv). A headline's lower bounds are their
  // projection onto a material, so the two lists must agree (RELATIONS-HEADLINE-DRIFT).
  const relations = compileRelations(wb['Physical relations']?.rows, parseAppliesTo, materialRows, issues);
  for (const rel of relations) {
    for (const name of [rel.lower, rel.higher]) {
      if (propertyByName.get(name)?.replacedBy) err('REGISTRY-REPLACED', `physical_relations ${rel.id}`, `${name} is replaced by ${propertyByName.get(name).replacedBy}; name that instead`);
    }
  }
  if (wb['Physical relations']) for (const problem of headlineDrift(relations, headlines.filter((h) => h.kind === 'measurement'))) err('RELATIONS-HEADLINE-DRIFT', 'physical_relations', problem);

  return { properties, headlines, comparisons, relations };
}

/**
 * What a drawer comparison must be to be drawn as one heading on one tab (D139, D140): its caption written, and its note
 * where it names one, two headlines or more, their properties and the ones it lists in one domain and in no other
 * comparison, a pair where it names one; and a headline drawn in the drawer alone must be drawn there, and must hold no
 * value a decision could read: none estimated, none in the table, no bound and no reference envelope. Its values with no
 * stated orientation are drawn hollow and counted apart, as a selectable headline's are, and never reach a decision.
 */
function checkComparisons(comparisons, headlines, { captions, propertyByName, err }) {
  const owner = new Map();
  for (const cmp of comparisons) {
    const where = `drawer_comparisons ${cmp.name}`;
    const hs = headlines.filter((h) => h.drawerComparison === cmp.name);
    if (!captions.has(cmp.name)) err('REGISTRY-COMPARISON', where, 'Its caption, a method.csv row of Section Comparison and this Topic, is missing');
    if (cmp.note && !captions.has(cmp.note)) err('REGISTRY-COMPARISON', where, `Note topic "${cmp.note}" is no method.csv row of Section Comparison`);
    if (hs.length < 2) err('REGISTRY-COMPARISON', where, `${hs.length} headline(s) name it; a comparison draws two or more`);
    const read = new Set(hs.flatMap((h) => [...h.valueProperties, ...h.relatedProperties]));
    for (const p of cmp.listed.filter((x) => read.has(x))) err('REGISTRY-COMPARISON', where, `${p} is listed, but a headline of the comparison already reads it`);
    const props = new Set([...read, ...cmp.listed]);
    const domains = new Set([...hs.flatMap((h) => h.valueProperties), ...cmp.listed].map((p) => propertyByName.get(p)?.domain));
    if (domains.size > 1) err('REGISTRY-COMPARISON', where, `Its headlines read properties of ${[...domains].join(' and ')}; one heading is drawn on one tab`);
    for (const p of props) {
      if (owner.has(p)) err('REGISTRY-COMPARISON', where, `${p} is already in the comparison ${owner.get(p)}; a record is listed under one heading`);
      else owner.set(p, cmp.name);
    }
    if (cmp.pairLabel) {
      for (const unit of new Set(hs.map((h) => h.unit))) {
        const n = hs.filter((h) => h.unit === unit).length;
        if (n !== 2) err('REGISTRY-COMPARISON', where, `Pair label "${cmp.pairLabel}" names a pair, but ${n} of its headlines are in ${unit}`);
      }
    }
  }
  for (const h of headlines.filter((x) => x.drawerOnly)) {
    const where = `headline_definitions ${h.key}`;
    const problems = [
      h.kind !== 'measurement' ? 'it is not a measurement headline' : null,
      !h.drawerComparison ? 'it names no Drawer comparison' : null,
      h.tableColumn ? 'Table column is TRUE' : null,
      h.estimated ? 'Estimated is TRUE' : null,
      h.lowerBounds ? 'it has lower bound properties' : null,
      h.referenceProperty ? 'it has a reference property' : null,
    ].filter(Boolean);
    if (problems.length) err('REGISTRY-COMPARISON', where, `Drawer only, but ${problems.join('; ')}`);
  }
}

/** Convenience lookups over a compiled registry (db.registry). */
export const measurementHeadlines = (registry) => registry.headlines.filter((h) => h.kind === 'measurement');
export const headlineByKey = (registry, key) => registry.headlines.find((h) => h.key === key) ?? null;
export const propertiesInDomain = (registry, domain) => new Set(registry.properties.filter((p) => p.domain === domain).map((p) => p.name));
