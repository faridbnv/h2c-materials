// Data lint rules: each catches the defect it names, and leaves legitimate look-alikes alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintData } from '../build/src/lint-rules.js';

const schemas = { measurements: { primaryKey: 'MeasurementID' } };
const row = (o) => ({
  MeasurementID: 'V1', GradeID: 'G1-01', Property: 'Tensile modulus', Direction: 'XY', Notch: 'Not applicable', 'Standard / load': 'ISO 527',
  'Test load MPa': 'Not applicable', 'Test temperature': 'Not published', 'Moisture condition': 'Not published', 'Post-processing': 'Not published',
  'Specimen type': 'Printed specimen', 'Specimen / print parameters': 'Printing temperature 300 °C', SourceID: 'S1', Locator: 'p. 4: Young’s modulus (X-Y)',
  'Normalized value': '4.431', 'Normalized unit': 'GPa', 'Data status': 'Published value', ...o,
});
const codes = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows } }, schemas).filter((f) => f.code.startsWith('MEAS-')).map((f) => `${f.code} ${f.record}`);

test('two tables of one data sheet with the same stated conditions are caught', () => {
  const dry = row({ MeasurementID: 'V1' });
  const conditioned = row({ MeasurementID: 'V2', 'Normalized value': '2.053', Locator: 'p. 4: Young’s modulus (X -Y)' });
  assert.deepEqual(codes([dry, conditioned]), ['MEAS-CONDITIONS-INDISTINCT V2']);
  assert.deepEqual(codes([dry, { ...conditioned, 'Moisture condition': 'Conditioned: 70% RH' }]), []);
});

test('HDT at two stated loads, and a retired copy, are not indistinct', () => {
  const hdt = (id, load, v) => row({ MeasurementID: id, Property: 'HDT', 'Test load MPa': load, 'Normalized value': v, Locator: 'p. 3: Heat deflection temperature' });
  assert.deepEqual(codes([hdt('V1', '1.8', '105'), hdt('V2', '0.45', '131')]), []);
  assert.deepEqual(codes([row({ MeasurementID: 'V1' }), row({ MeasurementID: 'V2', 'Normalized value': '2.053', 'Data status': 'Retired duplicate record' })]), []);
});

test('raw columns keep their spelling; a short-list column that is not raw must pick one', () => {
  const schema = { primaryKey: 'ProfileID', fields: [{ name: 'ProfileID', role: 'key' }, { name: 'Cooling', role: 'raw' }, { name: 'Kind', role: 'canonical' }] };
  const rows = [{ ProfileID: 'P1', Cooling: 'OFF', Kind: 'Guide' }, { ProfileID: 'P2', Cooling: 'Off', Kind: 'guide' }];
  const found = lintData({ profiles: { header: ['ProfileID', 'Cooling', 'Kind'], rows } }, { profiles: schema }).filter((f) => f.code === 'VOCAB-NEAR-DUPLICATE');
  assert.deepEqual(found.map((f) => f.field), ['Kind']);
});

test('a source needs a citation only when its role says it is cited; a source never read must not be cited', () => {
  const sources = (role, id = 'S1') => ({ SourceID: id, 'Source class': 'Manufacturer TDS', 'Citation role': role, 'Access status': 'Retrieved', URL: 'https://example.com' });
  const run = (rows, measurements = []) => lintData({
    sources: { header: Object.keys(rows[0]), rows },
    measurements: { header: ['MeasurementID', 'SourceID'], rows: measurements },
  }, { sources: { primaryKey: 'SourceID', fields: [] }, measurements: { primaryKey: 'MeasurementID', fields: [] } }).map((f) => `${f.code} ${f.record}`);
  assert.deepEqual(run([sources('cited')]), ['SOURCE-UNCITED S1']);
  assert.deepEqual(run([sources('corroboration')]), []);
  assert.deepEqual(run([sources('not-retrieved')], [{ MeasurementID: 'V1', SourceID: 'S1' }]), ['SOURCE-ROLE-CITED S1']);
});

test('a superseded coverage row is history, not a duplicate', () => {
  const row = (id, status, finding) => ({ CoverageID: id, MaterialID: 'M1', Domain: 'Thermal', Status: status, Finding: finding });
  const run = (rows) => lintData({ coverage: { header: Object.keys(rows[0]), rows } }, { coverage: { primaryKey: 'CoverageID', fields: [] } }).map((f) => f.code);
  assert.deepEqual(run([row('C1', 'Gap', 'x'), row('C2', 'Gap', 'x')]), ['COVERAGE-DUPLICATE']);
  assert.deepEqual(run([row('C1', 'Superseded', 'Superseded by C2: x'), row('C2', 'Gap', 'x')]), []);
});
