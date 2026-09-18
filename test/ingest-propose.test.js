// Reading a data sheet into candidate rows. The fixture is written by hand, so every value the test expects is a
// value the sheet really prints, and the cases that must not be read matter as much as the ones that must.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { documentText } from '../scripts/lib/pdf-text.mjs';
import { readRow, readSheet, targetUnit } from '../scripts/ingest/propose.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = new Map(readCsv(join(root, 'data/tables/properties.csv')).records.map((r) => [r.values.Property, r.values]));
const text = await documentText(readFileSync(join(root, 'test/fixtures/ingest/fixture-tds.pdf')), { refresh: true });
const read = (line) => readRow(line, registry);

test('a row gives its property, its value in the unit the database keeps, and the standard it names', () => {
  const sheet = readSheet(text, registry);
  assert.deepEqual(sheet.values.map((v) => [v.property, v.read.rawNumber, v.target.unit, String(Number(v.read.rawNumber) * v.target.factor)]), [
    ['Density', '1.24', 'kg/m³', '1240'],
    ['Tensile strength (endpoint unspecified)', '52', 'MPa', '52'],
    ['HDT', '68', '°C', '68'],
    ['Melting temperature', '160', '°C', '160'],
    ['Charpy strength', '2433.4', 'kJ/m²', '2433.4'],
    ['Hardness', '43', 'Shore D', '43'],
  ]);
  // The method is read whether the sheet prints it before the value or after it, and a standard's own digits are
  // never joined into the value beside them.
  assert.deepEqual(sheet.values.map((v) => v.read.standards), [['ISO 1183'], ['ISO 527'], ['ISO 75'], [], ['ISO 179'], ['ISO 868']]);
  assert.equal(sheet.values[0].label, 'Density ISO 1183');
});

test('a published spread belongs to its value, not instead of it', () => {
  const charpy = readSheet(text, registry).values.find((v) => v.property === 'Charpy strength');
  assert.equal(charpy.read.rawNumber, '2433.4');
  assert.equal(charpy.read.uncertainty, '79.4');
  assert.equal(charpy.read.raw, '2433.4 ± 79.4 kJ/m2');
  // An unqualified Charpy row is the unnotched one; a sheet that prints both says which.
  assert.equal(charpy.notch, 'Unnotched');
});

test('the value is the one in the unit the property is kept in, not the first number on the line', () => {
  // A condition carries units of its own. Reading left to right recorded a water absorption of 23 degrees.
  assert.equal(read('Water absorption, 23°C/24h <0.3% ISO 62').rawNumber, '0.3');
  assert.equal(read('Water absorption, 23°C/24h <0.3% ISO 62').operator, '<');
  assert.equal(read('Heat Distortion Temperature @ 0.455MPa 78°C').rawNumber, '78');
  assert.equal(read('Heat Distortion Temperature @ 0.455MPa 78°C').target.unit, '°C');
});

test('a unit is converted to the one the database keeps, by the build own table', () => {
  assert.deepEqual(targetUnit('Tensile modulus', 'MPa', registry), { unit: 'GPa', factor: 0.001 });
  assert.deepEqual(targetUnit('Density', 'g/cm3', registry), { unit: 'kg/m³', factor: 1000 });
  assert.equal(read('Tensile Modulus 8000 MPa ISO 527-1/2').target.unit, 'GPa');
  assert.equal(targetUnit('Density', 'MPa', registry), null);
});

test('a hardness states its scale in the label, because the scale is the unit', () => {
  for (const [line, unit, value] of [
    ['Shore D Hardness 43 ISO 868', 'Shore D', '43'],
    ['Rockwell Hardness (R-Scale) 55 ISO 2039-2', 'Rockwell R', '55'],
    ['Rockwell Hardness, R Scale 108 ISO 2039-2', 'Rockwell R', '108'],
  ]) {
    const r = read(line);
    assert.ok(r, line);
    assert.equal(r.printedUnit, unit, line);
    assert.equal(r.rawNumber, value, line);
  }
});

test('what the digits mean is the build own reading, and what is ambiguous says so', () => {
  assert.equal(read('Flexural Strength 13,085 psi D 790').rawNumber, '13085');
  assert.equal(read('Elongation at break 4,40% ISO 527').rawNumber, '4.4');
  // "24.000 kg/cm2" is twenty-four thousand on a European sheet and twenty-four on an American one, and only the
  // sheet says which. The row is read and flagged, never guessed.
  const ambiguous = read('Flexural Modulus 24.000 kg/cm2 D 790');
  assert.ok(ambiguous.ambiguous, 'a number with three digits after a separator is not settled by a rule');
});

test('a print setting is not a test result, and a storage note is neither', () => {
  const sheet = readSheet(text, registry);
  // A setting keeps the whole window the sheet prints, because a profile is a window and not a number.
  assert.deepEqual(sheet.settings.map((s) => [s.label, s.raw]), [['Nozzle temperature', '230 - 250 °C'], ['Bed temperature', '80 °C']]);
  assert.ok(!sheet.values.some((v) => /Nozzle|Bed/.test(v.label)));
  assert.ok(sheet.skipped.some((s) => /storage|shelf/.test(s.reason)), JSON.stringify(sheet.skipped));
});

test('a rate is a condition of a test, not its result', () => {
  // "Melting temperature DSC, 10 °C/min 160 °C" states one result and one heating rate.
  const melting = readSheet(text, registry).values.find((v) => v.property === 'Melting temperature');
  assert.equal(melting.read.rawNumber, '160');
});

test('everything a sheet prints is either a row or a reasoned omission', () => {
  const sheet = readSheet(text, registry);
  for (const s of sheet.skipped) assert.ok(s.reason && s.page, JSON.stringify(s));
});
