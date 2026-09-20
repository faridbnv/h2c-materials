// Reading a data sheet into candidate rows. The fixture is written by hand, so every value the test expects is a
// value the sheet really prints, and the cases that must not be read matter as much as the ones that must.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { documentText } from '../scripts/lib/pdf-text.mjs';
import { propose, readRow, readSheet, targetUnit, impactMethod, notchOf, readSetting, settingValue, profileFor, profilesFor, splitAtNeighbour, unreadRowReason, pageRows, labelHeads, labelFor, productName, printedTitle, looksDamaged } from '../scripts/ingest/propose.mjs';

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
  // The locator names the page, the way a measurement's does, so the applier can check every number in the row.
  assert.equal(p.row.Locator, 'p. 1: Recommended printing settings');
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

test('a heading and the row under it name a property neither names alone', () => {
  // Spectrum's ASA-X GF10 prints "Tensile Elongation*" and then "At yield 2.80%" three lines below, with the
  // marketing bullets of the column beside it in between. A label that carried across the page read "• 10% glass
  // fiber" as that elongation; one that stopped at the first foreign line never reached the row at all.
  const sheet = readSheet(text, registry);
  assert.ok(sheet.values.length, 'the fixture must still read');
  // The row is named after the heading that matched it, not after whichever label was held last.
  const rows = sheet.values.filter((v) => v.label && v.label.length);
  assert.ok(rows.every((v) => v.property), 'every value names a property');
});


// A page as the extractor leaves it: pieces at the x the page's own columns stand at. A data sheet that prints
// its property table and its print-settings table side by side arrives one row at a time, both columns together.
const at = (...pieces) => {
  const spans = pieces.map(([x, str]) => ({ x, w: str.length * 5, str }));
  return { y: 0, x0: spans[0].x, x1: spans.at(-1).x + spans.at(-1).w, text: spans.map((s) => s.str).join('  '), spans };
};

test('a line that runs two tables together states a row and a setting, and both are read', () => {
  // Extrudr prints "LABEL | TEST METHOD | UNIT | VALUE" with the print settings in a column beside it, so
  // extraction interleaves the two. Read whole, the row was offered the nozzle's temperature as its value; and
  // because a line that names a property is never taken for a setting, the nozzle was never read at all.
  const line = at([67, 'Tensile modulus (E-Modulus) ISO 527-2/5A/500 MPa 40'], [391, 'Nozzle 230-260°C']);
  const [row, neighbour] = splitAtNeighbour(line);
  assert.equal(row.text, 'Tensile modulus (E-Modulus) ISO 527-2/5A/500 MPa 40');
  assert.deepEqual([readSetting(neighbour).field, readSetting(neighbour).raw], ['nozzle', '230-260°C']);
  assert.equal(read(row.text).match.Property, 'Tensile modulus');
  assert.equal(read(row.text).rawNumber, '40');
  // A line with nothing beside it is not cut.
  assert.equal(splitAtNeighbour(at([67, 'Compressive strength DIN 53453 MPa 40']))[1], null);
});

test('a standard designation is never a value, however many parts it names', () => {
  // "ISO 527-2/5A/500" ends in 500 and "DIN 53453" in 53453; neither is a number the sheet published.
  assert.equal(read('Tensile modulus (E-Modulus) ISO 527-2/5A/500 MPa 40').rawNumber, '40');
  assert.deepEqual(read('Tensile modulus (E-Modulus) ISO 527-2/5A/500 MPa 40').standards, ['ISO 527-2/5A/500']);
  assert.equal(read('Compressive strength DIN 53453 MPa 40').rawNumber, '40');
  // "ISO 527-1,-2" is one method. Half-read, its ",-2" was a minus sign and the yield strength read as -2 MPa.
  const yielded = read('Yield Strength ISO 527-1,-2 MPa 70,2');
  assert.deepEqual([yielded.match.Property, yielded.rawNumber], ['Tensile yield strength', '70.2']);
  assert.deepEqual(yielded.standards, ['ISO 527-1,-2']);
});

test('where the unit comes first, what qualifies the value comes after it', () => {
  // A window: read as a point, a sheet that publishes 190 to 210 recorded a melting temperature of 190.
  const melting = read('Melting temperature ISO 3146-C °C 190-210');
  assert.deepEqual([melting.rawNumber, melting.upper, melting.raw], ['190', '210', '190-210 °C']);
  assert.equal(melting.range, false);
  // A spread behind the value is the same statement as one in front of it.
  const elongation = read('Elongation at yield ISO 527-2 % 3,5 ± 0,1');
  assert.deepEqual([elongation.rawNumber, elongation.uncertainty], ['3.5', '0.1']);
  // A bound is a bound, and a negative value is negative.
  const bound = read('Tensile Elongation, Break ISO 527 % >300');
  assert.deepEqual([bound.rawNumber, bound.operator], ['300', '>']);
  assert.equal(read('Glass transition temperature °C -24').rawNumber, '-24');
  // The unit may stand beside a "number unit" pair that is not the result: the test temperature is a condition.
  assert.equal(read('Notched impact strength ASTM D256 kj/m² 100 @ 23°C').rawNumber, '100');
});

test('a unit that ends in a digit keeps its digit, and does not lend it to the value', () => {
  // "kJ/m2 19" joined into "kJ/m219" and the impact rows of that layout were invisible; "g/cm3 1.14" offered the
  // 3 of the unit as the value and its 1.14 as the spread, and the density read as 3000 kg/m³.
  assert.equal(read('Notched impact strength ISO 179/1eA kJ/m2 19').rawNumber, '19');
  const density = read('Density ASTM D792 g/cm3 1.14');
  assert.deepEqual([density.rawNumber, density.uncertainty], ['1.14', null]);
});

// A page laid out the way Extrudr lays one out.
const twoColumns = { pages: [{ page: 1, lines: [
  at([67, '3. PROPERTIES']),
  at([67, 'Tensile modulus (E-Modulus) ISO 527-2/5A/500 MPa 40'], [391, 'Nozzle 230-260°C']),
  at([67, 'Ultimate elongation ISO 527-2/5A/500 % 490'], [391, 'Heatbed 50-90°C']),
  at([67, 'Stress at break ISO 527-2/5A/500 MPa 16 (50%)'], [391, 'Adhesive not required']),
  at([67, 'Density ISO 2781 g/cm³ 1.2'], [391, 'Max. Volumetric Speed 4,6 mm³/s']),
  at([391, 'Recommended settings for printers with a 0.4mm Nozzle.']),
  at([67, 'Tear strength ISO 34-1B kN/m 175']),
  at([67, 'Compressive strength DIN 53453 MPa 40']),
] }] };

test('a section heading governs the column it stands in, not the rest of the page', () => {
  const sheet = readSheet(twoColumns, registry);
  // The print-settings column heads itself halfway down the property table. A section that took the whole page
  // from there explained the four rows below it as printing guidance and read none of them.
  assert.deepEqual(sheet.values.map((v) => [v.property, v.read.rawNumber]), [
    ['Tensile modulus', '40'], ['Elongation at break', '490'], ['Density', '1.2'],
    ['Tear strength', '175'], ['Compression strength', '40'],
  ]);
  // The settings of the column beside it are read, on the same lines as the rows.
  assert.deepEqual(sheet.settings.map((s) => [s.field, s.raw]), [
    ['nozzle', '230-260°C'], ['bed', '50-90°C'], ['note', 'not required'], ['note', '4,6 mm³/s'],
  ]);
});

test('a stress the sheet states at an elongation is not the strength at break its label names', () => {
  // "16 (50%)" is one of three stresses printed under one label, at 50 %, 100 % and 300 % elongation.
  // properties.csv carries no property for a stress at a stated elongation and no vocabulary states the
  // condition, so the number is left for the owner rather than recorded as a tensile strength at break.
  const sheet = readSheet(twoColumns, registry);
  assert.ok(!sheet.values.some((v) => v.read.rawNumber === '16'));
  const left = sheet.skipped.find((s) => /Stress at break/.test(s.text));
  assert.match(left.reason, /stress at 50 % elongation/);
});

test('a row the reader cannot read says what the database is missing, and proposes nothing', () => {
  // "no property and value this line states together" does not tell the owner whether the fix is a lexicon
  // entry, a unit or a property; the audit closes the loop on these reasons.
  assert.equal(
    unreadRowReason(at([67, 'Flexural strain at break ISO 178 % 3.2']), registry),
    'properties.csv carries no property for "Flexural strain at break" (%)');
  assert.equal(
    unreadRowReason(at([67, 'MFR ASTM D1238 g/cm³ 9']), registry),
    'the sheet states Melt mass-flow rate in g/cm³, and the database keeps it in g/10 min');
  // A sentence that happens to carry a number is not a row of a table, and gets no such reason.
  assert.equal(unreadRowReason(at([67, 'Store in a dry room at room temperature (18-27°C / 65-80°F).']), registry), null);
});

test('a label the lexicon cannot read in full is not read as the unqualified one', () => {
  // Extrudr's DuraPro PA12 prints both "Tensile Elongation (Indentation Depth) 5 %" and "Nominal Elongation at
  // Break > 50 %". Read as one property they are a grade that breaks at 5 % and at over 50 %.
  assert.equal(read('Nominal Elongation at Break ISO 527-2 % >50').match.Property, 'Elongation at break');
  assert.equal(read('Tensile Elongation (Indentation Depth) ISO 527-2 % 5.0'), null);
  // A bracket that states a direction, a unit or a condition is not a qualifier of that kind.
  assert.equal(read('Elongation (X-Y) ISO 527 % 28').match.Property, 'Elongation at break');
  assert.equal(read('Elongation (23°C) ISO 527 % 28').match.Property, 'Elongation at break');
});

test('a test temperature keeps its minus sign', () => {
  // "(-30°C)" and "(+23°C)" are two tests of one property; stripping the bracket took the minus with it, and an
  // impact strength measured at minus thirty was recorded as measured at plus thirty.
  const row = read('Charpy Notched Impact Strength (-30°C) ISO 179/1eA kJ/m² 6.0');
  assert.equal(row.rawNumber, '6');
  assert.match(row.conditions, /\(-30\s?°C\)/);
});

// A page whose value column is set on a baseline of its own: the pieces at the x and y the page prints them at.
// SUNLU's sheets are laid out this way, and every one of the numbers below stands a point or two off the line
// its label is on, which is the whole of what made them invisible.
const piece = (y, ...pieces) => {
  const spans = pieces.map(([x, str, w]) => ({ x, w: w ?? str.length * 5, str }));
  return { y, x0: spans[0].x, x1: spans.at(-1).x + spans.at(-1).w, text: spans.map((s) => s.str).join('  '), spans };
};

test('a value set a point above its label is part of that row, and the page says so', () => {
  // The extractor groups spans by baseline, so a line is a baseline and not a row. Read a line at a time, the
  // sheet offered a label with no value and a number with no label on every row of its table.
  const rows = pageRows([
    piece(538, [498, '35±5']),
    piece(537, [67, '(X-Y) Tensile Strength'], [274, 'ISO 527/2'], [350, '50 mm/min'], [431, 'MPa']),
    piece(522, [507, '/']),
    piece(521, [67, '(X-Y) Young’s Modulus'], [274, 'ISO 527/2'], [352, '1 mm/min'], [431, 'MPa']),
  ]);
  assert.deepEqual(rows.map((r) => r.text), [
    '(X-Y) Tensile Strength ISO 527/2 50 mm/min MPa 35±5',
    '(X-Y) Young’s Modulus ISO 527/2 1 mm/min MPa /',
  ]);
  // The row keeps the label's place on the page, because that is where the table's column starts.
  assert.deepEqual(rows.map((r) => r.x0), [67, 67]);
});

test('a piece of the column beside the table is not a piece of the row', () => {
  // Spectrum prints its marketing text three points off the table's baselines. A row that took whatever shared
  // its band read "Charpy impact strength* ness, making printed parts resistant to loads and" and lost the
  // three values of that block; what keeps it out is that a row's own piece is a short statement of a number.
  const rows = pageRows([
    piece(656, [26, 'Charpy impact strength*']),
    piece(653, [390, 'ness, making printed parts resistant to loads and']),
    piece(640, [26, 'unnotched (at 23°C) 25 kJ/m2 ISO 179-1eU']),
    piece(638, [390, 'prolonged exposure to UV radiation.']),
  ]);
  assert.equal(rows.length, 4, 'four lines of two columns are four lines');
});

test('a superscript joins the unit it raises, and an exponent is not a digit of the number below it', () => {
  // "kJ/m" and its 2 are printed hard against each other, and a value stands a column away. Joined, the unit is
  // the one the property is kept in; read apart, every impact row of the layout was lost.
  const [impact] = pageRows([
    piece(450, [448, '2', 3]),
    piece(448, [498, '15±5']),
    piece(447, [278, 'ISO 180'], [363, '23℃'], [428, 'KJ/m']),
  ]);
  assert.equal(impact.text, 'ISO 180 23℃ KJ/m2 15±5');
  // "6.75×10" and a raised "14" run together read as 1014, which is neither the number nor a reading of it.
  const [power] = pageRows([
    piece(204, [523, '14', 7]),
    piece(201, [488, '6.75×10']),
    piece(199, [67, 'Volume Resistivity'], [273, 'IEC 60093'], [424, 'ohm-cm']),
  ]);
  assert.equal(power.text, 'Volume Resistivity IEC 60093 ohm-cm 6.75×10^14');
  // A power of ten is one number: neither 6.75 nor 10 is offered as a value, and the reason says why the row
  // waits for the owner rather than proposing one.
  assert.equal(readRow(power.text, registry), null);
  assert.match(unreadRowReason(power, registry),
    /names Volume resistivity and states no value in a unit the database keeps it in \(Ω·cm\).*power of ten \("6\.75×10\^14"\)/);
});

test('the axis a row states, and the maker’s own language, are not part of the property’s name', () => {
  // "(X-Y) Tensile Strength" and "拉伸强度(X-Y) Tensile Strength" are the tensile strength, and the axis has a
  // column of its own. Matched whole, neither line named a property at all.
  assert.equal(labelFor('(X-Y) Tensile Strength ISO 527/2 MPa 35').Property, 'Tensile strength (endpoint unspecified)');
  assert.equal(labelFor('拉伸强度(X-Y) Tensile Strength ISO 527/2 MPa 43').Property, 'Tensile strength (endpoint unspecified)');
  // A maker may set its own language one character to a space, and it is still a prefix and not a sentence.
  assert.equal(labelHeads('悬 臂 梁 缺 口 冲 击 强 度 (X-Y) Izod Impact').at(-1), 'Izod Impact');
  const sheet = readSheet({ pages: [{ page: 1, lines: pageRows([
    piece(538, [498, '35±5']),
    piece(537, [67, '(X-Y) Tensile Strength'], [274, 'ISO 527/2'], [350, '50 mm/min'], [431, 'MPa']),
    piece(505, [498, '20±5']),
    piece(504, [67, '(Z-X) Tensile Strength'], [274, 'ISO 527/2'], [350, '50 mm/min'], [431, 'MPa']),
  ]) }] }, registry);
  assert.deepEqual(sheet.values.map((v) => [v.property, v.read.rawNumber, v.read.uncertainty]), [
    ['Tensile strength (endpoint unspecified)', '35', '5'],
    ['Tensile strength (endpoint unspecified)', '20', '5'],
  ]);
  // The database keeps ZX and XZ, so a row that states the plane's letters apart still states a direction, which
  // is read from the label the row keeps.
  assert.deepEqual(sheet.values.map((v) => v.label.slice(0, 5)), ['(X-Y)', '(Z-X)']);
});

test('a test condition the row states is a condition, whichever degree sign it is written with', () => {
  // "10 ℃/min" is the rate the test was heated at and "23℃" is the temperature it was run at. Read as results
  // they are a glass transition of 10 °C; read as nothing, the temperature the sheet states is lost.
  const glass = readRow('Glass Transition (Tg) ISO 11357-2 10 ℃/min ℃ 109', registry);
  assert.deepEqual([glass.match.Property, glass.rawNumber, glass.target.unit], ['Glass transition temperature', '109', '°C']);
  const density = readRow('Density ISO 1183 23℃ g/cm3 1.02', registry);
  assert.deepEqual([density.rawNumber, density.printedUnit], ['1.02', 'g/cm3']);
  const flow = readRow('Melt Mass-flow Rate ISO 1133 220℃/10 kg g/10 min 20±10', registry);
  assert.deepEqual([flow.rawNumber, flow.uncertainty, flow.target.unit], ['20', '10', 'g/10 min']);
});

test('a hardness whose scale the sheet does not settle is recorded as the scale not settled', () => {
  // "HA/HD" names the durometer family and settles nothing: Shore A 85 and Shore D 85 are different hardnesses,
  // and the database has a unit for exactly this reading (V000420, V002456).
  const family = readRow('Shore Hardness ISO 868 23℃ HA/HD 85', registry);
  assert.deepEqual([family.rawNumber, family.printedUnit], ['85', 'Shore (scale not specified by source)']);
  // The row states the temperature it was measured at, and reading the first number on the line recorded a
  // hardness of 23.
  const stated = readRow('Shore Hardness ISO 868 23℃ HA/HD 90A±2', registry);
  assert.deepEqual([stated.rawNumber, stated.uncertainty, stated.printedUnit], ['90', '2', 'Shore A']);
  assert.equal(readRow('Shore Hardness ISO 868 23℃ HA/HD 80D', registry).printedUnit, 'Shore D');
});

test('a row whose value column is empty publishes no value, and says so', () => {
  // "the line states no value in a unit the database keeps it in" is true and useless where the sheet states no
  // value at all: nothing is missing here but the maker's measurement.
  const [row] = pageRows([
    piece(522, [507, '/']),
    piece(521, [67, '(X-Y) Young’s Modulus'], [274, 'ISO 527/2'], [352, '1 mm/min'], [431, 'MPa']),
  ]);
  assert.equal(unreadRowReason(row, registry), 'the sheet publishes no value for Tensile modulus in this row: its value column prints "/"');
});

test('a bound is a bound however the sheet types it, and never a point', () => {
  // A Chinese sheet writes "＞950" with the fullwidth sign; read as a point it is a filament that breaks at
  // exactly 950 %, and read as nothing it is a row the sheet published and the proposal lost.
  const wide = readRow('(X-Y) Elongation at break ISO 527/2 50 mm/min % ＞950', registry);
  assert.deepEqual([wide.rawNumber, wide.operator], ['950', '>']);
  const plain = readRow('(X-Y) Elongation at break ISO 527/2 50 mm/min % ≥1000', registry);
  assert.deepEqual([plain.rawNumber, plain.operator], ['1000', '>']);
});

test('a row that states the plane its bars were printed in states a direction the database keeps', () => {
  // "(X-Y)" and "(Z-X)" are two rows of one table, and a reader that could not read the second wrote Unstated
  // over a direction the sheet prints.
  const world = {
    materials: readCsv(join(root, 'data/tables/materials.csv')).records.map((r) => r.values),
    polymers: readCsv(join(root, 'data/tables/polymers.csv')).records.map((r) => r.values),
    grades: [], sources: [], headlineDefinitions: [], rulings: [],
    properties: readCsv(join(root, 'data/tables/properties.csv')).records.map((r) => r.values),
  };
  const pages = [{ page: 1, lines: pageRows([
    piece(700, [67, 'TECHNICAL DATA SHEET']),
    piece(698, [67, 'Product Name: ABS']),
    piece(538, [498, '35±5']),
    piece(537, [67, '(X-Y) Tensile Strength'], [274, 'ISO 527/2'], [350, '50 mm/min'], [431, 'MPa']),
    piece(505, [498, '20±5']),
    piece(504, [67, '(Z-X) Tensile Strength'], [274, 'ISO 527/2'], [350, '50 mm/min'], [431, 'MPa']),
  ]) }];
  const p = propose({ sha256: 'x'.repeat(64), url: 'https://example.invalid/tds.pdf', provider: 'SUNLU', product_raw: 'ABS' }, { pages }, world);
  assert.deepEqual(p.measurements.map((m) => [m.row.Direction, m.row['Raw numeric'], m.row['Raw uncertainty ±']]), [['XY', '35', '5'], ['ZX', '20', '5']]);
  // The condition column keeps what the row says about the test, and not the property's own name or the axis.
  assert.deepEqual(p.measurements.map((m) => m.row['Standard / load']), ['50 mm/min ISO 527/2', '50 mm/min ISO 527/2']);
});

// ---------------------------------------------------------------------------------------------------------
// A row the page set on more than one baseline, and the columns a table may leave for a condition or a unit.
// ---------------------------------------------------------------------------------------------------------

test('a row whose label, method and value stand on baselines of their own is one row', () => {
  // Eryone sets the label of every row a point or two below the rest of it, and Flashforge a point above.
  const [density] = pageRows([
    piece(170, [224, 'ASTM D792 (ISO 1183, GB/T 1033)'], [390, 'g/cm³']),
    piece(169, [489, '1.32']),
    piece(166, [69, 'Density(g/cm³ at 21.5 ° C）']),
  ], registry);
  assert.equal(density.text, 'Density(g/cm³ at 21.5 ° C） ASTM D792 (ISO 1183, GB/T 1033) g/cm³ 1.32');
  assert.equal(read(density.text).rawNumber, '1.32');
  // The rest of a row may be several cells wide, and a label is still a label when a designation follows it.
  const [tensile] = pageRows([
    piece(688, [68, 'Tensile strength X-Y']),
    piece(687, [204, '50mm/min'], [302, 'GB/T 1040.4'], [403, 'MPa'], [478, '55.2']),
  ], registry);
  assert.equal(tensile.text, 'Tensile strength X-Y 50mm/min GB/T 1040.4 MPa 55.2');
  assert.equal(read(tensile.text).rawNumber, '55.2');
  // A sentence beside the table shares the band and is never gathered, however close its baseline.
  const prose = pageRows([
    piece(602, [25, 'Izod Impact Strenght']),
    piece(601, [381, 'to classic PCTG. The use of carbon fibres increas-']),
  ], registry);
  assert.equal(prose.length, 2, 'a phrase is prose, not a piece of a row');
});

test('a piece belongs to the row that begins to its left, not to the table beside it', () => {
  // purefil sets a printing table and a property table side by side, one baseline apart. "190-230 °C" is the
  // printing table's value and stands to the left of the property row whose band it shares.
  const rows = pageRows([
    piece(250, [70, '190-230 °C']),
    piece(248, [304, 'MFR (ISO 1133)']),
    piece(246, [488, '2.5- 5 g/10min']),
  ], registry);
  assert.deepEqual(rows.map((r) => r.text), ['190-230 °C', 'MFR (ISO 1133) 2.5- 5 g/10min']);
});

test('a unit standing on its own baseline is a piece of the row it belongs to', () => {
  const [vicat] = pageRows([
    piece(143, [55, 'Vicat Softening Temperature(° C) ASTM D1525 (ISO 306 GB/T 1633)'], [480, '56']),
    piece(140, [421, '℃']),
  ], registry);
  assert.match(vicat.text, /56.*℃|℃.*56/);
  assert.equal(read(vicat.text).rawNumber, '56');
});

test('a condition carrying its own unit is not the value of the unit column', () => {
  // "kJ/m2 2.75J 2.83": 2.75 J is the pendulum the test was run with and 2.83 kJ/m² is the result.
  const charpy = read('Charpy Impact strenght GB/T 1043.1-2008 kJ/m2 2.75J 2.83');
  assert.equal(charpy.rawNumber, '2.83');
  // A word standing apart from the number in front of it is the column beside the table, not a condition.
  assert.equal(read('Tensile modulus ISO 527-2/5A/500 MPa 40 Nozzle 230-260°C').rawNumber, '40');
});

test('a method and unit cell merged across two rows belongs to both of them', () => {
  // Flashforge tests two rows to one method in one unit and prints the cell once, between them.
  const rows = pageRows([
    piece(330, [57, 'Bending Modulus (X-Y)'], [440, '2100~2400']),
    piece(313, [299, 'ISO 178'], [385, 'Mpa']),
    piece(303, [57, 'Bending Modulus (X-Z)'], [440, '1960~2000']),
  ], registry);
  assert.equal(rows.length, 2, 'the shared cell is not a row of its own');
  assert.deepEqual(rows.map((r) => read(r.text).raw), ['2100-2400 Mpa', '1960-2000 Mpa']);
  // A row that prints its own unit is complete, and the method column between two such rows is left alone.
  const own = pageRows([
    piece(330, [57, 'Bending strength (X-Y)'], [440, '86.41 MPa']),
    piece(313, [299, 'ISO 178, GB/T 9341']),
    piece(303, [57, 'Bending strength (Z)'], [440, '29.21 MPa']),
  ], registry);
  assert.equal(own.length, 3);
});

test('a row with two value columns is two statements, and neither is joined to the other', () => {
  // 3DXTECH prints "Tensile Strength, Break | ASTM D638 | MPa | 44 | 37" and colorFabb "Tensile modulus |
  // Tensile, ISO 527-1A | 2290 | 1290 | MPa". Read as one row, the two columns were joined into a break
  // strength of 4437 MPa and a modulus of 22 901 290 MPa, neither of which the sheet prints.
  const sheet = readSheet({ pages: [{ page: 1, lines: [
    at([87, 'Tensile Strength, Break'], [279, 'ASTM D638'], [370, 'MPa'], [464, '44'], [500, '37']),
    at([87, 'Tensile Modulus'], [279, 'ASTM D638'], [370, 'GPa'], [464, '3.5']),
  ] }] }, registry);
  assert.deepEqual(sheet.values.map((v) => [v.property, v.read.rawNumber]), [['Tensile modulus', '3.5']]);
  assert.match(sheet.skipped[0].reason, /states 2 values in columns of its own \(44, 37\)/);
  // Two whole numbers of three figures are never joined, whatever else the line says.
  assert.equal(read('Tensile modulus Tensile, ISO 527-1A 2290 1290 MPa').rawNumber, '1290');
  // A number extraction split into fragments is still joined: "2 433 .4" is one number.
  assert.equal(read('Charpy impact strength ISO 179 2 433 .4 kJ/m2').rawNumber, '2433.4');
});

test('a setting may stand under its label, behind a unit column, or across a window', () => {
  // purefil prints the label and the value one under the other, in one column.
  const label = piece(264, [70, 'Printing Temperature:']);
  assert.equal(readSetting(label, 1, '190-230 °C').raw, '190-230 °C');
  assert.equal(readSetting(label, 1), null, 'the label alone states nothing');
  // colorFabb stands the unit in a column of its own, and the row states a temperature once it is put back.
  assert.equal(readSetting(at([70, 'Nozzle Temp.'], [200, '˚C'], [300, '240-260']), 1).raw, '240-260 °C');
  assert.equal(readSetting(at([70, 'Print Speed'], [200, 'mm/s'], [300, '40-100']), 1).raw, '40-100 mm/s');
  // A window keeps both ends even where the sheet prints the unit on each of them.
  assert.equal(settingValue('210°C - 230°C'), '210°C - 230°C');
  assert.equal(settingValue('240~270°C (250°C recommended)'), '240~270°C (250°C recommended)');
});

test('a degree sign is a degree sign however the maker typed it, and a scan’s question mark is a superscript', () => {
  // colorFabb sets every temperature with a ring above; a scanned Fiberlogy sheet lost the superscript entirely.
  assert.equal(read('Heat Deflection Temp. HDT-B, ISO 75 74 ˚C').rawNumber, '74');
  assert.equal(read('Glass Transition Temp. DSC, ISO 11357 67,6 ºC').target.unit, '°C');
  assert.equal(read('Specific Density ASTM D792 g/cm? 1.24').raw, '1.24 g/cm3');
  assert.equal(read('Charpy Impact Strength (Notched) @ 23°C ISO 179 kJ/m? 40').raw, '40 kJ/m2');
});

test('a value a property cannot take is not that property\'s value', () => {
  // A minus sign in front of a density is a dash, a footnote marker or what is left of a designation, never a
  // value: colorFabb's "Specific Gravity ASTM D-2240 1,19 g/cm3" proposed a specific gravity of -2240, and
  // purefil's "Density (ASTM D792) 0.35*-1.24 g/cm3" one of -1.24. Both lines print a positive number.
  assert.equal(read('Specific Gravity ASTM D-2240 1,19 g/cm3').rawNumber, '1.19');
  assert.deepEqual(read('Specific Gravity ASTM D-2240 1,19 g/cm3').standards, ['ASTM D-2240']);
  assert.equal(read('Density (ASTM D792) 0.35*-1.24 g/cm3'), null);
  // A property whose window says it may be negative still is: a PLA's glass transition is not -60 °C, but a
  // TPU's is -24 °C and its sheet prints it.
  assert.equal(read('Glass transition temperature °C -24').rawNumber, '-24');
});


// ---------------------------------------------------------------------------------------------------------
// The name a grade would enter under: the page's own words, the maker's taken off, and a reason where the page
// does not say.
// ---------------------------------------------------------------------------------------------------------

const page = (...lines) => ({ pages: [{ page: 1, lines: lines.map((text, i) => ({ y: 800 - i * 20, x0: 60, x1: 400, text, spans: [{ x: 60, w: text.length * 5, str: text }] })) }] });

test('a maker\u2019s name in front of its product is the maker\u2019s, not the product\u2019s', () => {
  // Fiberlogy labels every sheet "TRADE NAME: Fiberlogy FiberSilk", and colorFabb prints the same product with
  // its name on one sheet and without it on the next.
  assert.equal(productName('Fiberlogy FiberSilk', 'Fiberlogy'), 'FiberSilk');
  assert.equal(productName('colorFabb woodFill', 'colorFabb'), 'woodFill');
  assert.equal(productName('colorFabb_XT', 'colorFabb'), 'XT');
  // A scan may misread the maker's own name; a word that differs by a letter is still that word.
  assert.equal(productName('Fioerlogy', 'Fiberlogy'), '');
  // But never the front of a longer word: Prusament begins with Prusa, and five letters off the front of it
  // proposed a product called "ment PETG by Prusa Polymers".
  assert.equal(productName('Prusament PETG', 'Prusa'), 'Prusament PETG');
  assert.equal(productName('Prusament PETG by Prusa Polymers', 'Prusa Research / Prusament'), 'PETG by Prusa Polymers');
  // The maker may stand at the end, and the word that attributed the product goes with it.
  assert.equal(productName('Fishy Filaments\u2019 Porthcurno by Fillamentum', 'Fillamentum'), 'Fishy Filaments\u2019 Porthcurno');
  // The category words this reader already took off are still taken off, glued to the name or not.
  assert.equal(productName('3DXMAX\u00ae ABS 3D Printing Filament', '3DXTECH'), '3DXMAX ABS');
  assert.equal(productName('ABSESDFilament', '3D4Makers'), 'ABSESD');
});

test('a title line that did not survive the scan is not a name', () => {
  assert.equal(looksDamaged('San ieA3D 7) Y2\u2014 RABE LOARY\u2014(IPE)714a xv bk'), true);
  assert.equal(looksDamaged('TI-AWST \u201432y\u2014|'), true);
  // A short name may carry the debris of a bracket that opened on the line above it, and is still a name.
  assert.equal(looksDamaged('iw) XPETG CF'), false);
  assert.equal(looksDamaged('Polyethylenterephthalat Typ G (PETG)'), false);
  assert.equal(looksDamaged('ThermaX\u2122 PEI [Made using ULTEM\u2122 1010]'), false);
});

test('the name comes from the page, wherever the page puts it', () => {
  // A sheet that labels its product says so plainly, whatever the line above it says.
  assert.equal(printedTitle(page('TECHNICAL DATA SHEET', 'Fioerlogy', 'FIBERLOGY EASY PLA',
    'TRADE NAME: Fiberlogy EASY PLA', 'MANUFACTURER: Fiberlab S.A.'), 'Fiberlogy').product, 'Fiberlogy EASY PLA');
  // A sheet that announces nothing this reader reads prints its product first, and the word under it is the
  // sheet's own structure: purefil heads every sheet with the product and then "General".
  assert.equal(printedTitle(page('Acrylnitrilbutadienstyrol (ABS)', 'General', 'Acrylonitrile-butadiene-styrene is a copolymer'),
    'Fabru / purefil').product, 'Acrylnitrilbutadienstyrol (ABS)');
  // A sheet whose first line announces it in a language this reader does not read still puts the name below it.
  assert.equal(printedTitle(page('KARTA TECHNICZNA', 'ASA-X GF10', 'W\u0141A\u015aCIWO\u015aCI MATERIA\u0141U OPIS'), 'Spectrum').product, 'ASA-X GF10');
  // A version, a trademark sign on a line of its own and half of the words that announce the sheet are not names.
  assert.equal(printedTitle(page('TECHNICAL', 'DATA SHEET', 'V6.0', 'TM', 'PolyLite PETG'), 'Polymaker').product, 'PolyLite PETG');
  // How long a name is, is measured on the name and not on the line that announces it.
  assert.equal(printedTitle(page('TDS Rev 1.0', 'Technical Data Sheet: CarbonX\u2122 Carbon Fiber ezPC Polycarbonate 3D Printing Filament',
    'Physical Properties Standard Unit Typical Value'), '3DXTECH').product, 'CarbonX\u2122 Carbon Fiber ezPC Polycarbonate 3D Printing Filament');
  // The maker's own name names no product, so the page is read on past it.
  assert.equal(printedTitle(page('Preliminary Data Sheet', 'colorFabb', 'Copper filled PLA', 'Latest revision: May 2015'), 'colorFabb').product, 'Copper filled PLA');
});

test("a standard's digits are not a value, and do not reach into what follows them", () => {
  // "Glass Transition Temp. DSC, ISO 11357 -55 ˚C" gave a glass transition of 11357 °C on four colorFabb sheets:
  // the designation's number was read as the value, and the rule that reads "55-60" as a window took the minus
  // in front of the real one for a range dash, because it saw 11357 before it.
  const tg = read('Glass Transition Temp. DSC, ISO 11357 -55 ˚C');
  assert.equal(tg.match.Property, 'Glass transition temperature');
  assert.equal(tg.rawNumber, '-55');
  // The window and the dash still read as they did.
  assert.equal(read('Glass Transition Temperature 55-60°C DSC').upper, '60');
  assert.equal(read('Melting temperature ISO 3146-C °C 190-210').upper, '210');
});
