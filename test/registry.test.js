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

function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = buildDatabase(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  return { db, errors: issues.filter((i) => i.level === 'error').map((i) => `${i.where}: ${i.message}`) };
}

test('the registry reproduces the headline constants it replaced', () => {
  assert.deepEqual(measured.map((h) => [h.key, h.unit, h.evidenceGroup, h.valueProperties.length === 1 ? h.valueProperties[0] : null, h.direction]), legacy.HEADLINES);
  assert.deepEqual(Object.fromEntries(measured.map((h) => [h.key, h.relatedProperties])), legacy.RELATED);
  assert.deepEqual(Object.fromEntries(measured.map((h) => [h.key, { unit: h.unit, properties: h.valueProperties }])), legacy.HEADLINE_TYPES);
  assert.deepEqual(measured.filter((h) => h.direction === 'XY').map((h) => h.key), legacy.XY_KEYS);
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
    'Applies to tests "Colour"; it may test Family, Base polymer, Modifier / filler, Role, Scope, H2C status',
    'Applies to names Family "Flexibles", which no material has',
    'Applies to "nonsense" is not "Field: value | value"',
  ]);
});

test('a measurement of a material a property does not apply to is an error', () => {
  const { errors } = build((wb) => {
    Object.assign(wb['Property registry'].rows.find((p) => p.Property === 'Hardness'), { 'Applies to': 'Family: Flexible Elastomers', 'Not applicable reason': 'Shore hardness describes elastomers' });
  });
  const hardnessOutside = base.Properties.rows.filter((r) => r.Property === 'Hardness' && base.Materials.rows.find((m) => m.MaterialID === r.MaterialID).Family !== 'Flexible Elastomers' && r['Data status'] !== 'Retired duplicate record');
  assert.ok(hardnessOutside.length > 0, 'the fixture needs hardness recorded outside elastomers');
  for (const r of hardnessOutside) assert.ok(errors.some((e) => e.startsWith(`measurements ${r.MeasurementID}: Hardness does not apply to`)), `${r.MeasurementID}: ${errors.join(' | ')}`);
  const noReason = build((wb) => { wb['Property registry'].rows.find((p) => p.Property === 'Hardness')['Applies to'] = 'Family: Flexible Elastomers'; }).errors;
  assert.ok(noReason.includes('properties Hardness: Applies to is set, so a Not applicable reason is required'), noReason.join(' | '));
});

test('a numeric measurement in a unit its property does not allow is an error', () => {
  const { errors } = build((wb) => { wb['Property registry'].rows.find((p) => p.Property === 'Density').Units = 'g/cm³'; });
  assert.ok(errors.some((e) => /^measurements V\d+: Density in kg\/m³; properties\.csv allows g\/cm³$/.test(e)), errors.slice(0, 5).join(' | '));
});

test('a headline limited to some materials is not applicable, with its reason, everywhere else', () => {
  const { db, errors } = build((wb) => {
    Object.assign(wb['Headline definitions'].rows.find((h) => h.HeadlineKey === 'elongationXY'), { 'Applies to': 'Scope: H2C-relevant', 'Not applicable reason': 'test rule' });
  });
  const excluded = db.materials.filter((m) => m.scope === 'Excluded');
  assert.ok(excluded.length);
  for (const m of excluded) {
    assert.equal(m.headline.elongationXY.missing, 'not-applicable');
    assert.deepEqual(m.headline.elongationXY.notApplicable, { reason: 'test rule', rule: 'Scope: H2C-relevant' });
  }
  const selected = base.Headlines.rows.filter((r) => r.HeadlineKey === 'elongationXY' && r.Use === 'value' && excluded.some((m) => m.id === r.MaterialID));
  for (const r of selected) assert.ok(errors.some((e) => e.includes(`elongationXY does not apply to this material (Scope: H2C-relevant) but selects ${r.MeasurementID}`)), errors.join(' | '));
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
  const reused = build((wb) => { wb.Properties.rows.find((r) => r.Property === 'Izod impact strength').Property = 'Izod strength'; }).errors;
  assert.ok(reused.some((e) => /^measurements V\d+: Izod strength is replaced by Izod impact strength$/.test(e)), reused.slice(0, 5).join(' | '));
  const chained = build((wb) => {
    wb['Property registry'].rows.find((r) => r.Property === 'Izod impact strength')['Replaced by'] = 'Charpy strength';
    wb['Property registry'].rows.find((r) => r.Property === 'Charpy strength')['Replaced by'] = 'Izod impact strength';
  }).errors;
  assert.ok(chained.some((e) => /itself replaced/.test(e)), chained.slice(0, 5).join(' | '));
});
