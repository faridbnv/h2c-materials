// Reading a data sheet into candidate rows. The fixture is written by hand, so every value the test expects is a
// value the sheet really prints, and the cases that must not be read matter as much as the ones that must.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { documentText } from '../scripts/lib/pdf-text.mjs';
import { readRow, readSheet, targetUnit, impactMethod, notchOf, readSetting, settingValue, profileFor, profilesFor } from '../scripts/ingest/propose.mjs';

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

test('an impact result is named by its method, not by the word above it', () => {
  // ISO 180, ASTM D256 and GB/T 1843 are Izod; ISO 179 and GB/T 1043 are Charpy.
  assert.equal(impactMethod('Impact strength', 'Notched impact', 'ISO 180').property, 'Izod impact strength');
  assert.equal(impactMethod('Izod impact strength', 'Izod impact, notched', 'ASTM D256').property, 'Izod impact strength');
  assert.equal(impactMethod('Impact strength', 'Impact strength', 'ISO 179').property, 'Charpy strength');
  // A sheet that heads a row "Izod" and cites ISO 179 contradicts itself, and naming either test would invent a
  // method the sheet denies. This is what V002092, V002093 and V002328 record, and why they are not Izod rows.
  const contradiction = impactMethod('Izod impact strength', 'Izod Impact Strenght Unnotched @ 23°C', 'ISO 179-1eU');
  assert.equal(contradiction.property, 'Impact strength');
  assert.match(contradiction.note, /which is the other test/);
  // A sheet that names no method keeps the generic property.
  assert.equal(impactMethod('Impact strength', 'Impact strength (XY)', '').property, 'Impact strength');
  // The method states the notch where the row does not.
  assert.equal(notchOf('ISO 179/1eA'), 'Notched');
  assert.equal(notchOf('ISO 179-1eU'), 'Unnotched');
  assert.equal(notchOf('ISO 1183'), null);
});

test('a heading must be the heading, not a line that happens to contain the word', () => {
  // A data sheet prints its marketing column beside the table, and extraction interleaves the two. "es the
  // thermal resistance of the filament, further" once ended a section in the middle of one, which cost the sheet
  // its impact rows.
  const sheet = readSheet(text, registry);
  assert.ok(sheet.values.some((v) => v.property === 'Charpy strength'), 'a section ended where no heading was');
  assert.deepEqual(sheet.settings.map((s) => s.label), ['Nozzle temperature', 'Bed temperature']);
});

test('a printing setting is read by its own label, wherever the page puts it', () => {
  // The sections cannot be trusted on a two-column sheet: extraction interleaves the printing table with the
  // storage paragraph beside it, and "Bed temperature 60-80°C" arrived under a Storage heading.
  const bed = readSetting({ text: 'Bed temperature 60-80°C Filament should be stored in a dry room at room' });
  assert.equal(bed.field, 'bed');
  assert.equal(bed.raw, '60-80°C');
  const fan = readSetting({ text: 'Active cooling fan YES (up to 100%)' });
  assert.deepEqual([fan.field, fan.topic, fan.raw], ['note', 'Cooling', 'YES (up to 100%)']);
  // A chamber row with no temperature of its own is about the enclosure, not about a chamber setpoint.
  assert.equal(readSetting({ text: 'Closed chamber not necessary' }).field, 'enclosure');
  assert.equal(readSetting({ text: 'Chamber temperature 60°C' }).field, 'chamber');
  // "Abrasion resistance" is a measured property (ISO 4649), not a statement about the nozzle.
  assert.equal(readSetting({ text: 'Abrasion Resistance 30 mm3 ISO 4649' }), null);
  assert.equal(readSetting({ text: 'Tensile strength 55 MPa' }), null);
});

test("a setting's value stops where the next column begins", () => {
  // What follows a complete value is the neighbouring column's text, not part of the setting: the register holds
  // "230-260°C STORAGE AND SHELF LIFE" and "recommended No" because nothing cut them.
  assert.equal(settingValue('230-260°C STORAGE AND SHELF LIFE'), '230-260°C');
  assert.equal(settingValue('60-80°C Filament should be stored in a dry room'), '60-80°C');
  assert.equal(settingValue('** 30 - 70 mm/s'), '30 - 70 mm/s');
  // A value that continues into its own parenthesis or bound is not cut.
  assert.equal(settingValue('YES (up to 100%)'), 'YES (up to 100%)');
  assert.equal(settingValue('not necessary'), 'not necessary');
});

test('a print setup is the sheet’s words and what the build’s own parsers read from them', () => {
  const settings = [
    { page: 1, field: 'nozzle', topic: '', label: 'Nozzle temperature', raw: '230-255°C', line: 'Nozzle temperature 230-255°C' },
    { page: 1, field: 'bed', topic: '', label: 'Bed temperature', raw: '60-80°C', line: 'Bed temperature 60-80°C' },
    { page: 1, field: 'enclosure', topic: '', label: 'Closed chamber', raw: 'for printing not necessary', line: 'Closed chamber for printing not necessary' },
    { page: 1, field: 'note', topic: 'Cooling', label: 'Active cooling fan', raw: '0-20%', line: 'Active cooling fan 0-20%' },
  ];
  const p = profileFor(settings, { sourceId: 'S-X', materialId: 'M020', modifier: 'Unfilled / unspecified' });
  assert.equal(p.row['Nozzle °C'], '230-255°C');
  assert.deepEqual([p.row['Nozzle state'], p.row['Nozzle min °C'], p.row['Nozzle max °C']], ['range', '230', '255']);
  assert.deepEqual([p.row['Bed min °C'], p.row['Bed max °C']], ['60', '80']);
  // A cell the build's parser cannot read is a cell the build cannot use, so the raw words and the state agree.
  assert.equal(p.row['Enclosure state'], 'not-needed');
  assert.equal(p.row['Chamber state'], 'unknown');
  assert.deepEqual(p.notes, [{ Topic: 'Cooling', Text: '0-20%' }]);
  assert.equal(p.row.Locator, 'Recommended printing settings');
});

test('a sheet that prints a nozzle temperature per speed publishes two setups, not one', () => {
  const settings = [
    { page: 1, field: 'nozzle', topic: '', label: 'Nozzle temperature - standard speed', raw: '190 - 215°C', line: 'a' },
    { page: 1, field: 'nozzle', topic: '', label: 'Nozzle temperature - high speed', raw: '225 - 250°C', line: 'b' },
    { page: 1, field: 'bed', topic: '', label: 'Bed temperature', raw: '40-50°C', line: 'c' },
  ];
  const profiles = profilesFor(settings, { sourceId: 'S-X', materialId: 'M001', modifier: 'Unfilled / unspecified' });
  assert.equal(profiles.length, 2);
  assert.deepEqual(profiles.map((p) => p.row['Nozzle °C']), ['190 - 215°C', '225 - 250°C']);
  // Each names the row of the sheet it came from, so neither is the other's duplicate.
  assert.equal(new Set(profiles.map((p) => p.row.Locator)).size, 2);
  assert.deepEqual(profiles.map((p) => p.row['Bed °C']), ['40-50°C', '40-50°C']);
});

test('what wears a nozzle out is the sheet’s statement, and the register’s rule only where the sheet is silent', () => {
  const says = [{ page: 1, field: 'nozzle-material', topic: '', label: 'Ruby or hardened nozzle', raw: 'Yes', line: 'Ruby or hardened nozzle Yes' }];
  const said = profileFor(says, { sourceId: 'S-X', materialId: 'M001', modifier: 'Unfilled / unspecified' });
  assert.equal(said.row['Abrasion / clogging'], 'Ruby or hardened nozzle Yes');
  assert.equal(said.row['Hardened nozzle'], 'TRUE');
  assert.deepEqual(said.editorial, []);
  // A sheet that says one is not needed is not paraphrased into a claim it did not make.
  const no = profileFor([{ ...says[0], raw: 'not necessary' }], { sourceId: 'S-X', materialId: 'M001', modifier: 'Unfilled / unspecified' });
  assert.equal(no.row['Abrasion / clogging'], 'Not published');
  assert.equal(no.row['Nozzle material'], 'not necessary');
  // A fibre wears brass out whatever the sheet says about it, and the proposal says those words are ours.
  const fibre = profileFor([{ page: 1, field: 'bed', topic: '', label: 'Bed temperature', raw: '80°C', line: 'x' }], { sourceId: 'S-X', materialId: 'M049', modifier: 'Carbon fibre' });
  assert.match(fibre.row['Abrasion / clogging'], /abrasion-resistant nozzle/);
  assert.deepEqual(fibre.editorial, ['Abrasion / clogging']);
});

test('the method column keeps how the row was measured, not the property it names', () => {
  // The register's own Spectrum rows are the convention: Standard / load holds "D 792", Standards "ASTM D792",
  // and the property's label lives in the Locator. Writing the label here is the damage OPEN-PROBLEMS §1 records.
  const sheet = readSheet(text, registry);
  const row = (property) => sheet.values.find((v) => v.property === property);
  assert.ok(row('Density'), 'the fixture must still publish a density');
  // ASTM sheets print the designation without the body, and requiring the word ASTM left those rows with none.
  assert.deepEqual(readRow('Specific Gravity 1.27 g/cm3 D 792', registry).standards, ['D 792']);
  assert.deepEqual(readRow('Heat deflection temperature (0.45MPa) 60°C E 2092', registry).standards, ['E 2092']);
  // A word that ends in D does not start a designation.
  assert.deepEqual(readRow('LED 100 test 5 MPa', registry)?.standards ?? [], []);
});

test('a published window is one statement, not the number beside the unit', () => {
  // "Glass Transition Temperature 55-60°C" read as a point recorded -60 °C, because the dash became a sign.
  const tg = read('Glass Transition Temperature 55-60°C D3418');
  assert.equal(tg.raw, '55-60 °C');
  assert.equal(tg.rawNumber, '55');
  assert.equal(tg.upper, '60');
  assert.equal(tg.range, false);
  // A minus with no number before it is still a sign.
  assert.equal(read('Izod Impact Strength, Notched @ -40°C 57 J/m D 256').rawNumber, '57');
  assert.equal(read('Charpy notched impact strength, -30°C 10 kJ/m2 ISO 179').rawNumber, '10');
  // A decimal comma the extractor split apart is one number.
  assert.equal(read('Impact strength - charpy method 5, 7 kJ/m2 ISO 179').rawNumber, '5.7');
  // And a standard whose digits it split is one designation.
  assert.deepEqual(read('Specific Gravity 1. 12 g/cm3 ISO 11 8 3').standards, ['ISO 1183']);
});
