// The property registry replaces constants that were hardcoded across the build. It must reproduce
// them exactly, and a property limited to some materials must behave as a statement, not a gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTables, snapshotDate } from '../build/src/load.js';
import { compile } from '../build/src/compile.js';
import { validate } from '../build/src/validate.js';
import { compileRegistry, parseAppliesTo, applies, propertiesInDomain } from '../build/src/registry.js';
import { estimateKeys } from '../build/src/estimates.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const legacy = JSON.parse(readFileSync(join(root, 'test/fixtures/legacy-constants.json'), 'utf8')).build;
const base = loadTables(join(root, 'data'));
const registry = compileRegistry(base, []);
const measured = registry.headlines.filter((h) => h.kind === 'measurement');

function build(edit = () => {}) {
  const wb = structuredClone(base);
  edit(wb);
  const { db, issues } = compile(wb, { snapshot: snapshotDate(wb.Method.rows), build: 'test' });
  issues.push(...validate(db, wb));
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

test('property domains reproduce the mechanical and thermal evidence sets', () => {
  assert.deepEqual([...propertiesInDomain(registry, 'mechanical')].sort(), [...legacy.MECHANICAL_PROPERTIES].sort());
  assert.deepEqual([...propertiesInDomain(registry, 'thermal')].sort(), [...legacy.THERMAL_PROPERTIES].sort());
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
