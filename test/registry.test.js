// The property registry replaces constants that were hardcoded across the build. It must reproduce
// them exactly, and a property limited to some materials must behave as a statement, not a gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { buildDatabase } from '../build/src/pipeline.js';
import { compileRegistry, parseAppliesTo, applies, propertiesInDomain } from '../build/src/registry.js';
import { estimateKeys } from '../build/src/estimate/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legacy = JSON.parse(readFileSync(join(root, 'test/fixtures/legacy-constants.json'), 'utf8')).build;
const base = loadTables(join(root, 'data'));
const registry = compileRegistry(base, []);
const measured = registry.headlines.filter((h) => h.kind === 'measurement');

// `estimates: false` where a test looks only for an error the compiler, validator or registry raises: the estimate
// stage cannot remove one.
function build(edit = () => {}, { estimates = true } = {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test', estimates });
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}

test('the registry reproduces the headline constants it replaced', () => {
  // The constants named five measured headlines. A headline added since (the layer strength, the notched impact
  // strength and the glass transition, D92) is a registry row they never had, and leaves those five as they were.
  const replaced = new Set(legacy.HEADLINES.map(([key]) => key));
  const old = measured.filter((h) => replaced.has(h.key));
  assert.deepEqual(old.map((h) => [h.key, h.unit, h.evidenceGroup, h.valueProperties.length === 1 ? h.valueProperties[0] : null, h.direction]), legacy.HEADLINES);
  assert.deepEqual(Object.fromEntries(old.map((h) => [h.key, h.relatedProperties])), legacy.RELATED);
  assert.deepEqual(Object.fromEntries(old.map((h) => [h.key, { unit: h.unit, properties: h.valueProperties }])), legacy.HEADLINE_TYPES);
  assert.deepEqual(old.filter((h) => h.direction === 'XY').map((h) => h.key), legacy.XY_KEYS);
  // What an unstated direction is to each of them: a printed bar read flat, and a bar no document describes as printed set
  // apart (D172; it was as published, counted apart, D84, until the owner's ruling of 2026-10-20).
  assert.deepEqual(old.filter((h) => h.direction).map((h) => h.unstatedDirection), old.filter((h) => h.direction).map(() => 'flat if printed'));
  assert.deepEqual(estimateKeys(registry), legacy.ESTIMATE_KEYS);
  assert.deepEqual(Object.fromEntries(registry.headlines.filter((h) => h.referenceProperty).map((h) => [h.referenceProperty, h.key])), legacy.AXIS_EQUIVALENCE);
});

test('property domains still carry every property the constants they replaced named', () => {
  // The registry replaced two hardcoded lists, and it must still hold every name that was in them: a property
  // that fell out of its domain would empty a drawer tab and a coverage domain in silence. It may hold more.
  // properties.csv is the registry's source, and the import adds a row to it whenever a maker's sheets publish
  // something the database had no property for, so the set grows and a fixed list here would only say when it
  // last grew.
  for (const domain of ['mechanical', 'thermal']) {
    const now = propertiesInDomain(registry, domain);
    const named = domain === 'mechanical' ? legacy.MECHANICAL_PROPERTIES : legacy.THERMAL_PROPERTIES;
    assert.deepEqual([...named].filter((p) => !now.has(p)), [], domain);
    assert.deepEqual([...now].filter((p) => !base['Property registry'].rows.some((r) => r.Property === p && r.Domain === domain)), [], domain);
  }
});

test('an applicability rule is checked against real fields and values', () => {
  const issues = [];
  assert.equal(parseAppliesTo('', 'x', issues, base.Materials.rows), null);
  const rule = parseAppliesTo('Family: Flexible Elastomers | PETG; Scope: H2C-relevant', 'x', issues, base.Materials.rows);
  assert.deepEqual(issues, []);
  assert.ok(applies(rule, { family: 'PETG', scope: 'H2C-relevant' }));
  assert.ok(!applies(rule, { family: 'PETG', scope: 'Excluded' }));
  assert.ok(applies(rule, { Family: 'Flexible Elastomers', Scope: 'H2C-relevant' }), 'a Materials row works too');
  parseAppliesTo('Colour: Black; Family: Flexibles; nonsense', 'properties Hardness', issues, base.Materials.rows);
  assert.deepEqual(issues.map((i) => i.message), [
    'Applies to tests "Colour"; it may test Family, Base polymer, Modifier / filler, Role, Scope, H2C status, Morphology, Printed state, Can crystallise',
    'Applies to names Family "Flexibles", which no material has',
    'Applies to "nonsense" is not "Field: value | value"',
  ]);
});

test('a measurement of a material a property does not apply to is an error', () => {
  const { errors } = build((wb) => {
    Object.assign(wb['Property registry'].rows.find((p) => p.Property === 'Hardness'), { 'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Shore hardness describes elastomers' });
  }, { estimates: false });
  const hardnessOutside = base.Properties.rows.filter((r) => r.Property === 'Hardness' && base.Materials.rows.find((m) => m.MaterialID === r.MaterialID).Family !== 'Flexible Elastomers' && r['Data status'] !== 'Retired duplicate record');
  assert.ok(hardnessOutside.length > 0, 'the fixture needs hardness recorded outside elastomers');
  for (const r of hardnessOutside) assert.ok(errors.some((e) => e.startsWith(`measurements ${r.MeasurementID}: Hardness does not apply to`)), `${r.MeasurementID}: ${errors.join(' | ')}`);
  const noReason = build((wb) => { wb['Property registry'].rows.find((p) => p.Property === 'Hardness')['Applies to'] = 'Family: Flexible Elastomers'; }, { estimates: false }).errors;
  assert.ok(noReason.includes('properties Hardness: Applies to is set, so a Not applicable reason is required'), noReason.join(' | '));
});

test('a numeric measurement in a unit its property does not allow is an error', () => {
  const { errors } = build((wb) => { wb['Property registry'].rows.find((p) => p.Property === 'Density').Units = 'g/cm³'; }, { estimates: false });
  assert.ok(errors.some((e) => /^measurements V\d+: Density in kg\/m³; properties\.csv allows g\/cm³$/.test(e)), errors.slice(0, 5).join(' | '));
});

test('a headline limited to some materials is not applicable, with its reason, everywhere else', () => {
  const { db, errors } = build((wb) => {
    Object.assign(wb['Headline definitions'].rows.find((h) => h.HeadlineKey === 'elongationXY'), { 'Applies to': 'Scope: H2C-relevant', 'Not applicable reason': 'test rule' });
  }, { estimates: false });
  const excluded = db.materials.filter((m) => m.scope === 'Excluded');
  assert.ok(excluded.length);
  for (const m of excluded) {
    assert.equal(m.headline.elongationXY.missing, 'not-applicable');
    assert.deepEqual(m.headline.elongationXY.notApplicable, { reason: 'test rule', rule: 'Scope: H2C-relevant' });
  }
  const selected = base.Headlines.rows.filter((r) => r.HeadlineKey === 'elongationXY' && excluded.some((m) => m.id === r.MaterialID));
  for (const r of selected) assert.ok(errors.some((e) => e.includes(`elongationXY does not apply to this material (Scope: H2C-relevant) but pins ${r.MeasurementID}`)), errors.join(' | '));
});

test('a registry row cannot switch on estimation for a headline the model does not know', () => {
  const r = structuredClone(registry);
  r.headlines.find((h) => h.key === 'priceCADkg').estimated = true;
  assert.throws(() => estimateKeys(r), /marks priceCADkg Estimated, but the estimate model has no entry for it/);
});

test('a replaced property keeps its record, and no measurement or headline may use it (Izod merge, m22)', () => {
  const izod = registry.properties.find((p) => p.name === 'Izod strength');
  assert.equal(izod.replacedBy, 'Izod impact strength');
  assert.ok(!build().errors.some((e) => /replaced by/.test(e)), 'the tables use no replaced property');
  const reused = build((wb) => { wb.Properties.rows.find((r) => r.Property === 'Izod impact strength').Property = 'Izod strength'; }, { estimates: false }).errors;
  assert.ok(reused.some((e) => /^measurements V\d+: Izod strength is replaced by Izod impact strength$/.test(e)), reused.slice(0, 5).join(' | '));
  const chained = build((wb) => {
    wb['Property registry'].rows.find((r) => r.Property === 'Izod impact strength')['Replaced by'] = 'Charpy strength';
    wb['Property registry'].rows.find((r) => r.Property === 'Charpy strength')['Replaced by'] = 'Izod impact strength';
  }, { estimates: false }).errors;
  assert.ok(chained.some((e) => /itself replaced/.test(e)), chained.slice(0, 5).join(' | '));
});

test('a headline lower bound and the physical relations order the same pairs (RELATIONS-HEADLINE-DRIFT)', () => {
  const drift = (edit) => {
    const wb = structuredClone(base);
    edit(wb);
    const issues = [];
    compileRegistry(wb, issues);
    return issues.filter((i) => i.code === 'RELATIONS-HEADLINE-DRIFT').map((i) => i.message);
  };
  assert.deepEqual(drift(() => {}), []);
  // A relation the headline projection reads cannot go: the break stress would bound the headline with no physics behind it.
  const without = drift((wb) => { wb['Physical relations'].rows = wb['Physical relations'].rows.filter((r) => r.RelationID !== 'PR09'); });
  assert.equal(without.length, 1);
  assert.match(without[0], /tensileStrengthXY takes Tensile break strength as a lower bound/);
  // Nor can a relation that says it is a headline's go unread: HDT at 1.8 MPa under HDT at 0.45 MPa is hdt045's bound.
  const unread = drift((wb) => { wb['Headline definitions'].rows.find((r) => r.HeadlineKey === 'hdt045')['Lower bound properties'] = 'Not applicable'; });
  assert.equal(unread.length, 1);
  assert.match(unread[0], /PR08 .* has Scope both, but no headline/);
  // A bound load the relation does not state is a different bound.
  const load = drift((wb) => { wb['Physical relations'].rows.find((r) => r.RelationID === 'PR08')['Lower load MPa'] = '3.2'; });
  assert.ok(load.some((m) => /hdt045 takes HDT as a lower bound at 1.8 MPa/.test(m)));
});

test("the physical relations travel in the registry, each over real properties and a test it can read", () => {
  assert.equal(registry.relations.length, base['Physical relations'].rows.length);
  const names = new Set(registry.properties.map((p) => p.name));
  for (const rel of registry.relations) {
    assert.ok(names.has(rel.lower) && names.has(rel.higher), rel.id);
    assert.ok(rel.sameTest.length > 0, rel.id);
    // One property ordered against itself is ordered by its test load.
    if (rel.lower === rel.higher) assert.ok(rel.lowerLoadMPa > rel.higherLoadMPa, `${rel.id}: the heavier load is the lower value`);
  }
});

// The drawer's comparisons (drawer_comparisons.csv, D133, D139, D140): what a comparison and a Drawer-only headline must be is
// checked while the registry compiles. Each case starts from the real tables, changes one thing and compiles the registry
// alone (no database is built).
const HDT = 'Heat deflection and glass transition';
const FLEX = 'Flexural tests, XY and Z';
const registryIssues = (edit = () => {}) => {
  const wb = structuredClone(base);
  edit(wb);
  const issues = [];
  const compiled = compileRegistry(wb, issues);
  return { compiled, issues: issues.filter((i) => i.level === 'error' && (i.code === 'REGISTRY-COMPARISON' || i.code === 'REGISTRY-HEADLINE')) };
};
const headlineRow = (wb, key) => wb['Headline definitions'].rows.find((r) => r.HeadlineKey === key);
const messages = (issues, code) => issues.filter((i) => i.code === code).map((i) => `${i.where}: ${i.message}`);

test('the drawer comparisons compile from the tables with no comparison or headline issue', () => {
  const { compiled, issues } = registryIssues();
  assert.deepEqual(issues, []);
  assert.deepEqual(compiled.comparisons.map((c) => c.name), ['Impact tests', 'Tensile tests, XY and Z', HDT, FLEX]);
  assert.deepEqual(compiled.comparisons.map((c) => c.pairLabel), ['Both tests', 'Both orientations', null, 'Both orientations']);
  assert.deepEqual(compiled.comparisons.map((c) => c.listed), [[], ['Tensile strain at strength'], [], ['Flexural elongation at break', 'Flexural stress at conventional deflection']]);
  assert.deepEqual(compiled.comparisons.map((c) => c.note), [null, null, null, 'How flexural and tensile results relate']);
  assert.deepEqual(compiled.headlines.filter((h) => h.drawerOnly).map((h) => h.key),
    ['tensileModulusZ', 'elongationZ', 'flexuralModulusXY', 'flexuralModulusZ', 'flexuralStrengthXY', 'flexuralStrengthZ', 'hdt18']);
});

test('a comparison with no caption in method.csv is an error', () => {
  const { issues } = registryIssues((wb) => {
    wb.Method.rows = wb.Method.rows.filter((r) => !(r.Section === 'Comparison' && r.Topic === 'Tensile tests, XY and Z'));
  });
  assert.deepEqual(messages(issues, 'REGISTRY-COMPARISON'), ['drawer_comparisons Tensile tests, XY and Z: Its caption, a method.csv row of Section Comparison and this Topic, is missing']);
});

test('a comparison that fewer than two headlines name is an error', () => {
  const { issues } = registryIssues((wb) => {
    for (const key of ['hdt045', 'glassTransition']) headlineRow(wb, key)['Drawer comparison'] = 'Not applicable';
  });
  assert.deepEqual(messages(issues, 'REGISTRY-COMPARISON'), [`drawer_comparisons ${HDT}: 1 headline(s) name it; a comparison draws two or more`]);
});

test('a comparison whose headlines read properties of two domains is an error', () => {
  const { issues } = registryIssues((wb) => { headlineRow(wb, 'density')['Drawer comparison'] = HDT; });
  const found = messages(issues, 'REGISTRY-COMPARISON');
  assert.equal(found.length, 1, found.join(' | '));
  assert.match(found[0], new RegExp(`^drawer_comparisons ${HDT}: Its headlines read properties of (physical and thermal|thermal and physical); one heading is drawn on one tab$`));
});

test('a property in two comparisons is an error', () => {
  const { issues } = registryIssues((wb) => {
    const again = structuredClone(headlineRow(wb, 'charpyNotched'));
    Object.assign(again, { HeadlineKey: 'charpyNotchedAgain', 'Export header': 'Notched Charpy again', 'Drawer comparison': 'Impact tests again' });
    wb['Headline definitions'].rows.push(again);
    wb['Drawer comparisons'].rows.push({ ...structuredClone(wb['Drawer comparisons'].rows[0]), Comparison: 'Impact tests again' });
    wb.Method.rows.push({ ...structuredClone(wb.Method.rows.find((r) => r.Section === 'Comparison' && r.Topic === 'Impact tests')), Topic: 'Impact tests again' });
  });
  const found = messages(issues, 'REGISTRY-COMPARISON');
  assert.ok(found.includes('drawer_comparisons Impact tests again: Charpy strength is already in the comparison Impact tests; a record is listed under one heading'), found.join(' | '));
  assert.ok(found.includes('drawer_comparisons Impact tests again: Impact strength is already in the comparison Impact tests; a record is listed under one heading'), found.join(' | '));
});

test('a pair label on a comparison with three headlines in one unit is an error', () => {
  const { issues } = registryIssues((wb) => { wb['Drawer comparisons'].rows.find((r) => r.Comparison === HDT)['Pair label'] = 'All three'; });
  assert.deepEqual(messages(issues, 'REGISTRY-COMPARISON'), [`drawer_comparisons ${HDT}: Pair label "All three" names a pair, but 3 of its headlines are in °C`]);
});

test('a headline naming a comparison that has no row is an error', () => {
  const { issues } = registryIssues((wb) => { headlineRow(wb, 'charpyNotched')['Drawer comparison'] = 'Impact test'; });
  const found = messages(issues, 'REGISTRY-COMPARISON');
  assert.ok(found.includes('headline_definitions charpyNotched: Drawer comparison "Impact test" names no row of drawer_comparisons.csv'), found.join(' | '));
});

test('a Drawer-only headline must hold no value a decision could read', () => {
  const cases = [
    ['hdt18', { 'Table column': 'TRUE' }, 'Table column is TRUE'],
    ['hdt18', { Estimated: 'TRUE' }, 'Estimated is TRUE'],
    ['hdt18', { 'Lower bound properties': 'HDT', 'Lower bound load MPa': '1.8' }, 'it has lower bound properties'],
    ['hdt18', { 'Drawer comparison': 'Not applicable' }, 'it names no Drawer comparison'],
  ];
  for (const [key, change, problem] of cases) {
    const { issues } = registryIssues((wb) => { Object.assign(headlineRow(wb, key), change); });
    const found = messages(issues, 'REGISTRY-COMPARISON').filter((m) => m.startsWith(`headline_definitions ${key}: Drawer only, but `));
    assert.equal(found.length, 1, `${key} ${JSON.stringify(change)}: ${messages(issues, 'REGISTRY-COMPARISON').join(' | ')}`);
    assert.ok(found[0].includes(problem), `${key} ${JSON.stringify(change)}: ${found[0]}`);
  }
});

test('a Drawer-only headline may draw a value with no stated orientation, hollow and counted apart (D140)', () => {
  const { issues } = registryIssues((wb) => { headlineRow(wb, 'tensileModulusZ')['Unstated direction'] = 'flat if printed'; });
  assert.deepEqual(messages(issues, 'REGISTRY-COMPARISON'), []);
});

test('a listed property a test of the comparison already reads, or one of another comparison, is an error', () => {
  const read = registryIssues((wb) => { wb['Drawer comparisons'].rows.find((r) => r.Comparison === FLEX)['Listed properties'] = 'Flexural modulus'; });
  assert.ok(messages(read.issues, 'REGISTRY-COMPARISON').some((m) => m === `drawer_comparisons ${FLEX}: Flexural modulus is listed, but a headline of the comparison already reads it`), messages(read.issues, 'REGISTRY-COMPARISON').join(' | '));
  const twice = registryIssues((wb) => { wb['Drawer comparisons'].rows.find((r) => r.Comparison === FLEX)['Listed properties'] = 'Tensile strain at strength'; });
  assert.ok(messages(twice.issues, 'REGISTRY-COMPARISON').some((m) => /Tensile strain at strength is already in the comparison Tensile tests, XY and Z/.test(m)), messages(twice.issues, 'REGISTRY-COMPARISON').join(' | '));
  const domain = registryIssues((wb) => { wb['Drawer comparisons'].rows.find((r) => r.Comparison === FLEX)['Listed properties'] = 'Vicat softening temperature'; });
  assert.ok(messages(domain.issues, 'REGISTRY-COMPARISON').some((m) => /one heading is drawn on one tab/.test(m)), messages(domain.issues, 'REGISTRY-COMPARISON').join(' | '));
});

test('a note that names no caption in method.csv is an error', () => {
  const { issues } = registryIssues((wb) => { wb['Drawer comparisons'].rows.find((r) => r.Comparison === FLEX)['Note topic'] = 'How bending works'; });
  assert.deepEqual(messages(issues, 'REGISTRY-COMPARISON'), [`drawer_comparisons ${FLEX}: Note topic "How bending works" is no method.csv row of Section Comparison`]);
});

test('a headline with a load but no Unstated load is an error', () => {
  const { issues } = registryIssues((wb) => { headlineRow(wb, 'hdt045')['Unstated load'] = 'Not applicable'; });
  assert.deepEqual(messages(issues, 'REGISTRY-HEADLINE'), ['headline_definitions hdt045: Load MPa 0.45 needs an Unstated load (as-published or excluded)']);
});
