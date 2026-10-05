// The reader round's proposals (scripts/ingest/read-proposals.mjs) and the helper that applies them
// (scripts/migrate/read-proposals-apply.mjs), on fixture readings: CI has no document cache, so the quote guard is
// injected. What is asserted is the rule: the gate, the mapping to the vocabularies with nothing guessed, the units
// converted by the import's own table, a profile typed by the parsers or held, and an apply that is idempotent and
// stops when the data moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openTables } from '../scripts/data/table-io.mjs';
import { applyProposals } from '../scripts/migrate/read-proposals-apply.mjs';
import {
  buildProposals, conditionsOf, directionOf, gateOf, labelledAnswers, loadFullTables, matchProduct, moistureOf, nameTokens, postProcessingOf, quoteViews, valueProposal, writeProposals,
} from '../scripts/ingest/read-proposals.mjs';

const COLUMNS = ['RowID', 'Class', 'Kind', 'SourceID', 'Page', 'Grade', 'Product', 'Field', 'Label', 'Raw', 'Lo', 'Hi', 'Unit', 'Operator', 'Direction', 'Specimen', 'Moisture', 'PostProcessing', 'Standard', 'TestConditions',
  'TableHeading', 'Quote', 'Presence', 'SecondRead', 'HeldIDs', 'HeldValues', 'Reader', 'Confidence', 'Flags', 'Note'];
let n = 0;
const reading = (o) => ({ ...Object.fromEntries(COLUMNS.map((c) => [c, ''])), RowID: `t#${++n}`, Class: 'new', SourceID: 'S-1', Page: '1', Grade: 'G001-01', Presence: 'text', SecondRead: 'not-required', Reader: 'reader-1', Confidence: 'high', ...o });
const value = (o) => reading({ Kind: 'value', Unit: 'MPa', Operator: '=', Quote: 'q', ...o });
const setting = (o) => reading({ Kind: 'setting', Unit: '°C', Quote: 'q', ...o });

const tables = {
  grades: [
    { GradeID: 'G001-01', MaterialID: 'M001', Manufacturer: 'Acme', 'Product name': 'Acme PA12-CF', Status: 'active', 'Shared formulation key': 'Not applicable' },
    { GradeID: 'G001-02', MaterialID: 'M001', Manufacturer: 'Acme', 'Product name': 'Silk PLA', Status: 'active', 'Shared formulation key': 'KEY' },
    { GradeID: 'G001-03', MaterialID: 'M001', Manufacturer: 'Acme', 'Product name': 'Silk PLA Dual-Color', Status: 'active', 'Shared formulation key': 'KEY' },
  ],
  sources: [{ SourceID: 'S-1', SHA256: 'x', 'Applicable grades': 'G001-01' }, { SourceID: 'S-2', SHA256: 'y', 'Applicable grades': 'G001-02 G001-03' }],
  properties: [
    { Property: 'Tensile modulus', Units: 'GPa' }, { Property: 'Tensile strength (endpoint unspecified)', Units: 'MPa' }, { Property: 'Density', Units: 'kg/m³' },
    { Property: 'HDT', Units: '°C' }, { Property: 'Charpy strength', Units: 'kJ/m²' }, { Property: 'Izod strength', Units: 'kJ/m²; J/m', 'Replaced by': 'Izod impact strength' },
    { Property: 'Hardness', Units: 'Shore A; Shore D' }, { Property: 'Relative permittivity', Units: 'Dimensionless' },
  ],
  measurements: [
    { MeasurementID: 'V1', SourceID: 'S-1', GradeID: 'G001-01', MaterialID: 'M001', Property: 'Tensile modulus', 'Data status': 'Published value', 'Raw value': '3000 MPa', 'Raw unit': 'MPa', 'Raw numeric': '3000', 'Raw uncertainty ±': 'Not applicable', 'Raw upper bound': 'Not applicable', Operator: '=', 'Normalized value': '3', Locator: 'p. 1: Modulus' },
  ],
  profiles: [{ ProfileID: 'P3', SourceID: 'S-3', GradeID: 'G001-01', MaterialID: 'M001', Profile: 'Manufacturer published guidance', 'Nozzle diameter': '0.2 mm', Locator: 'p. 1: Nozzle' }, { ProfileID: 'P1', SourceID: 'S-2', GradeID: 'G001-02', MaterialID: 'M001', Profile: 'Manufacturer published guidance', Plate: 'Not published', Locator: 'p. 1: Settings', 'Nozzle °C': '230', 'Nozzle min °C': '230', 'Nozzle max °C': '230', 'Nozzle state': 'range', 'Bed °C': 'Not published' }, { ProfileID: 'P0', SourceID: 'S-0', GradeID: 'G001-01', MaterialID: 'M001', Profile: 'Manufacturer published guidance', Locator: 'p. 1' }],
  page_context: [],
};
const build = (rows, ctx = {}) => buildProposals({ rows, tables, ctx });

test('a reading is ready when the page bears it out or a second reading agrees, and low confidence or a disagreeing second reading always holds', () => {
  assert.equal(gateOf(reading({ Presence: 'text' })).gate, 'ready');
  assert.equal(gateOf(reading({ Presence: 'block' })).gate, 'ready');
  assert.equal(gateOf(reading({ Presence: 'ocr' })).gate, 'ready');
  assert.equal(gateOf(reading({ Presence: 'visual-only', SecondRead: 'pending' })).reason, 'gate:visual-only-awaiting-second-read');
  assert.equal(gateOf(reading({ Presence: 'visual-only', SecondRead: 'agreed' })).gate, 'ready');
  assert.equal(gateOf(reading({ Presence: 'visual-only', SecondRead: 'agreed-reader' })).gate, 'ready');
  assert.equal(gateOf(reading({ Presence: 'text', Confidence: 'low' })).reason, 'gate:low-confidence');
  assert.equal(gateOf(reading({ Presence: 'text', SecondRead: 'disagrees' })).reason, 'gate:second-read-disagrees');
});

test('the reader\'s words map to the vocabularies, and a word that maps to none is refused', () => {
  assert.equal(directionOf('X-Y', 'Tensile modulus').value, 'XY');
  assert.equal(directionOf('XY Flat', 'Tensile modulus').value, 'XY');
  assert.equal(directionOf('X-Z', 'Tensile modulus').value, 'XZ');
  assert.equal(directionOf('ZX', 'Tensile modulus').value, 'ZX');
  assert.equal(directionOf('upright', 'Tensile modulus').value, 'Z');
  assert.equal(directionOf('upright', 'Flexural modulus').value, 'ZX');
  assert.equal(directionOf('parallel (in flow direction)', 'Mould shrinkage').value, 'Along flow');
  assert.equal(directionOf('normal (perpendicular to flow)', 'Mould shrinkage').value, 'Stated, not a usable direction');
  assert.equal(directionOf('', 'Tensile modulus').value, 'Unstated');
  assert.equal(directionOf('', 'Density').value, 'Not applicable');
  assert.match(directionOf('diagonal', 'Tensile modulus').error, /^direction-unmapped/);
  assert.deepEqual(moistureOf('DAM'), { condition: 'DAM', state: 'dry' });
  assert.equal(moistureOf('50% RH').state, 'conditioned');
  assert.equal(moistureOf('').state, 'not-stated');
  assert.match(moistureOf('DAM / 50% RH').error, /^moisture-ambiguous/);
  assert.match(moistureOf('fresh from the bag').error, /^moisture-unmapped/);
  assert.equal(postProcessingOf('annealed at 100 °C for 16 h').tempC, '100');
  assert.equal(postProcessingOf('As printed').state, 'as-printed');
  assert.equal(postProcessingOf('annealed').tempC, 'Not published');
  assert.match(postProcessingOf('polished').error, /^post-processing-unmapped/);
  assert.deepEqual(conditionsOf('temp=23°C; notch=notched; rate=50 mm/min'), { temp: ['23°C'], load: [], notch: ['notched'], other: ['rate=50 mm/min'] });
});

test('a value converts by the import\'s table, keeps the sheet\'s words, and checks Raw numeric × factor against the normalized value', () => {
  const registry = new Map(tables.properties.map((p) => [p.Property, p]));
  const p = (o) => valueProposal(value(o), { registry, grade: 'G001-01' });
  const modulus = p({ Field: 'Tensile modulus', Raw: '5731 ± 261 MPa', Lo: '5731', Direction: 'X-Y', Specimen: 'printed', Moisture: 'DAM', TestConditions: 'rate=1 mm/min', Standard: 'ISO 527' });
  assert.equal(modulus['Normalized value'], '5.731'); assert.equal(modulus['Normalized unit'], 'GPa'); assert.equal(modulus['Conversion factor'], '0.001');
  assert.equal(modulus['Raw uncertainty ±'], '261'); assert.equal(modulus['Normalized uncertainty ±'], '0.261');
  assert.equal(modulus['Specimen type'], 'Printed specimen'); assert.equal(modulus.Direction, 'XY'); assert.equal(modulus['Moisture state'], 'dry');
  assert.equal(modulus['Standard / load'], 'ISO 527; rate=1 mm/min'); assert.equal(modulus.Standards, 'ISO 527'); assert.equal(modulus.decision, 'headline');
  const density = p({ Field: 'Density', Raw: '1.24 g/cm3', Lo: '1.24', Unit: 'g/cm3', TestConditions: 'temp=23°C' });
  assert.equal(density['Normalized value'], '1240'); assert.equal(density['Test temperature'], '23°C'); assert.equal(density['Test temperature °C'], '23');
  assert.equal(density['Specimen type'], 'Not published (density specimen form not explicitly established)');
  const hdt = p({ Field: 'HDT', Raw: '57 ℃', Lo: '57', Unit: '℃', Standard: 'ISO 75', TestConditions: 'load=0.45 MPa' });
  assert.equal(hdt['Standard / load'], 'ISO 75; 0.45 MPa'); assert.equal(hdt['Test load MPa'], '0.45'); assert.equal(hdt['Normalized unit'], '°C');
  const bound = p({ Field: 'Tensile strength (endpoint unspecified)', Raw: '>300 %', Lo: '300', Unit: 'MPa', Operator: '>' });
  assert.equal(bound.Operator, '>');
  assert.equal(p({ Field: 'Charpy strength', Raw: '4 kJ/m2', Lo: '4', Unit: 'kJ/m2', Standard: 'ISO 179/1eA' }).Notch, 'Notched');
  assert.equal(p({ Field: 'Charpy strength', Raw: '4 kJ/m2', Lo: '4', Unit: 'kJ/m2', Label: 'Charpy unnotched' }).Notch, 'Unnotched');
  assert.equal(p({ Field: 'Hardness', Raw: '90A', Lo: '90', Unit: '' })['Raw unit'], 'Shore A');
  assert.equal(p({ Field: 'Relative permittivity', Raw: '3.2', Lo: '3.2', Unit: '' })['Normalized unit'], 'Dimensionless');
  assert.equal(p({ Field: 'HDT', Raw: 'HDT of 120C', Lo: '120', Unit: 'C' })['Raw value'], '120C', 'a cell that leads with words is recorded from its number');
  // refused, not guessed
  assert.match(p({ Field: 'Izod strength', Raw: '4 kJ/m2', Lo: '4', Unit: 'kJ/m2' }).error, /^property-replaced/);
  assert.match(p({ Field: 'Tensile modulus', Raw: '3 furlongs', Lo: '3', Unit: 'furlongs' }).error, /^unit-unconvertible/);
  assert.match(p({ Field: 'Tensile modulus', Raw: 'N/A MPa', Lo: '' }).error, /^no-number/);
  assert.match(p({ Field: 'Tensile modulus', Raw: '5 MPa', Lo: '6' }).error, /^raw-numeric-disagrees/);
  assert.match(p({ Field: 'Tensile modulus', Raw: '3 MPa', Lo: '3', Direction: 'diagonal' }).error, /^direction-unmapped/);
  assert.match(p({ Field: 'Tensile modulus', Raw: '3 MPa', Lo: '3', TestConditions: 'temp=23°C; temp=80°C' }).error, /^conditions-ambiguous/);
});

test('a value is added with a like-row, a locator that tells its twins apart, and is held when the product is unknown or the quote is not on the sheet', () => {
  const rows = [
    value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Direction: 'X-Y' }),
    value({ Field: 'Tensile modulus', Raw: '2500 MPa', Lo: '2500', Label: 'Modulus', Direction: 'Z' }),
    value({ Field: 'Density', Raw: '1.2 g/cm3', Lo: '1.2', Unit: 'g/cm3', Label: 'Density', Grade: 'G999-99' }),
    value({ Field: 'Density', Raw: '1.3 g/cm3', Lo: '1.3', Unit: 'g/cm3', Label: 'Density 2', Quote: 'not printed' }),
  ];
  const out = build(rows, { quoteOnSheet: (s, q) => q !== 'not printed' });
  assert.equal(out.valuesAdd.length, 2);
  assert.equal(out.valuesAdd[0].like, 'V1');
  assert.deepEqual(out.valuesAdd.map((v) => v.Locator), ['p. 1: Modulus (XY)', 'p. 1: Modulus (Z)']);
  assert.ok(out.valuesAdd.every((v) => v.gate === 'ready'));
  const reasons = out.held.map((h) => h.reason);
  assert.ok(reasons.includes('grade-unknown:G999-99'));
  assert.ok(reasons.includes('quote-not-on-cached-text'));
});

test('a visual-only reading is held until a second reading agrees, and then goes out', () => {
  const r = value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Presence: 'visual-only', SecondRead: 'pending' });
  assert.equal(build([r]).valuesAdd.length, 0);
  assert.equal(build([r]).held[0].reason, 'gate:visual-only-awaiting-second-read');
  assert.equal(build([{ ...r, SecondRead: 'agreed' }]).valuesAdd.length, 1);
});

test('the same reading from two batches is read once', () => {
  const a = value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Reader: 'reader-1' });
  const b = { ...a, RowID: 'u#9', Reader: 'reader-2', Presence: 'visual-only', SecondRead: 'pending' };
  const out = build([b, a]);
  assert.equal(out.valuesAdd.length, 1);
  assert.equal(out.duplicates.length, 1);
  assert.equal(out.duplicates[0].RowID, 'u#9');
  assert.equal(out.duplicates[0].KeptRowID, a.RowID);
});

test('a product\'s settings become one profile typed by the parsers; what the parsers read differently from the reader is held', () => {
  const rows = [
    setting({ Field: 'nozzle', Label: 'Extruder Temp', Raw: '260-300C', Lo: '260', Hi: '300' }),
    setting({ Field: 'bed', Label: 'Bed Temp', Raw: '110-120C', Lo: '110', Hi: '120' }),
    setting({ Field: 'drying', Label: 'Drying Specs', Raw: '120C for 4 hours', Lo: '120', TestConditions: 'hours=4' }),
    setting({ Field: 'chamber', Label: 'Heated Chamber', Raw: 'Not Required' }),
    setting({ Field: 'nozzle', Label: 'Wide range', Raw: '265-300C', Lo: '265', Hi: '300' }),
    setting({ Field: 'fan', Label: 'Fan', Raw: 'ON' }),
    setting({ Field: 'plate', Label: 'Bed material', Raw: 'glass', TableHeading: 'Printed Specimen Conditions' }),
  ];
  const out = build(rows);
  assert.equal(out.profilesAdd.length, 1);
  const p = out.profilesAdd[0];
  assert.equal(p['Nozzle °C'], '260-300C'); assert.equal(p['Nozzle min °C'], '260'); assert.equal(p['Nozzle max °C'], '300');
  assert.equal(p['Drying °C'], '120'); assert.equal(p['Drying hours'], '4'); assert.equal(p['Chamber state'], 'not-required');
  assert.equal(p.Plate, 'Not published'); assert.equal(p.parsed_vs_read, 'agrees'); assert.equal(p.Profile, 'Manufacturer published guidance');
  assert.equal(p.Locator, 'p. 1: Extruder Temp; p. 1: Bed Temp; p. 1: Drying Specs; p. 1: Heated Chamber');
  const why = Object.fromEntries(out.held.map((h) => [h.Field + h.Label, h.reason]));
  assert.equal(why['nozzleWide range'], 'conflicting-setting');
  assert.equal(why.fanFan, 'no-table-column');
  assert.equal(why['plateBed material'], 'specimen-condition-not-guidance');

  const pm = build([setting({ Field: 'nozzle', Label: 'Print temperature', Raw: '225°C ± 10', Lo: '225' }), setting({ Field: 'bed', Label: 'Bed', Raw: '60 °C', Lo: '60' })]);
  assert.equal(pm.profilesAdd.length, 1);
  assert.equal(pm.profilesAdd[0]['Nozzle °C'], 'Not published', 'a ± the parser reads as a range is not the single number the reader gave');
  assert.ok(pm.held.some((h) => h.reason === 'parsed-vs-read'));
  const noGrade = build([setting({ Field: 'nozzle', Label: 'x', Raw: '200', Lo: '200', Grade: '', SourceID: 'S-2' })]);
  assert.equal(noGrade.profilesAdd.length, 0);
  assert.match(noGrade.held[0].reason, /^no-grade:.*G001-02 Silk PLA; G001-03 Silk PLA Dual-Color/, 'a sheet of two products needs the product, and the reason names the candidates');
});

test('a sheet whose twin already has a profile gets cells set, not a second profile; several recipes only share the product\'s own settings', () => {
  const out = build([
    setting({ SourceID: 'S-2', Grade: 'G001-03', Field: 'plate', Label: 'Bed material', Raw: 'PEI', TableHeading: 'Settings' }),
    setting({ SourceID: 'S-2', Grade: 'G001-03', Field: 'bed', Label: 'Bed', Raw: '60 °C', Lo: '60' }),
  ]);
  assert.equal(out.profilesAdd.length, 0);
  const cells = out.profilesSet.filter((r) => r.column !== 'Locator');
  assert.deepEqual(cells.map((r) => [r.id, r.column, r.expect, r.value]), [['P1', 'Plate', 'Not published', 'PEI'], ['P1', 'Bed °C', 'Not published', '60 °C']]);
  const locator = out.profilesSet.filter((r) => r.column === 'Locator');
  assert.equal(locator.length, 1, 'one Locator edit per profile, chained from the Locator the table holds');
  assert.equal(locator[0].expect, 'p. 1: Settings');
  assert.equal(locator[0].value, 'p. 1: Settings; p. 1: Bed material; p. 1: Bed');
});

test('a context heading goes out only where it would change a held row; a value the page contradicts only where the held number is not also on the page', () => {
  const context = (o) => reading({ Kind: 'context', Class: 'context', Field: 'tensile', Specimen: 'printed', Moisture: 'dry', TableHeading: 'Mechanical Properties (Dry state)', Quote: 'Mechanical Properties (Dry state)', ...o });
  const out = build([context({ HeldValues: 'V1(moisture=dry)' }), context({ Field: 'flexural', HeldValues: '' }), context({ Field: 'impact', HeldValues: 'V1(moisture=dry)', Flags: 'contradicts:V1:moisture' })]);
  assert.equal(out.pageContextAdd.length, 1);
  assert.equal(out.pageContextAdd[0]['Specimen type'], 'Printed specimen'); assert.equal(out.pageContextAdd[0]['Moisture state'], 'dry');
  assert.deepEqual(out.held.map((h) => h.reason).sort(), ['changes-no-held-row', 'contradicts-held-rows']);

  const mismatch = value({ Class: 'mismatch', Field: 'Tensile modulus', Raw: '3300 MPa', Lo: '3300', Label: 'Modulus', HeldIDs: 'V1' });
  const set = build([mismatch], { numberOnPage: () => false });
  assert.deepEqual(set.valuesSet.map((r) => [r.column, r.expect, r.value]), [['Raw value', '3000 MPa', '3300 MPa'], ['Raw numeric', '3000', '3300'], ['Normalized value', '3', '3.3'], ['Data status', 'Published value', 'Published value (transcription corrected)']]);
  assert.equal(build([mismatch], { numberOnPage: () => true }).valuesSet.length, 0);
  assert.equal(build([mismatch], { numberOnPage: () => true }).held[0].reason, 'held-number-also-on-page');
});

// ---- the apply helper, on the real tables in memory (nothing is saved) ----------------------------------------------

test('applyProposals writes the ready rows, is a no-op the second time, and stops when the data moved', () => {
  const real = loadFullTables();
  const grade = real.grades.find((g) => g.GradeID === 'G116-01');
  assert.ok(grade, 'the fixture reads a product the tables hold');
  const heldHdt = real.measurements.find((m) => m.MeasurementID === 'V000544');
  const rows = [
    setting({ SourceID: 'S-FIXTURE', Grade: 'G116-01', Field: 'nozzle', Label: 'Extruder Temp', Raw: '260-300C', Lo: '260', Hi: '300', Quote: 'Extruder Temp 260-300C' }),
    setting({ SourceID: 'S-FIXTURE', Grade: 'G116-01', Field: 'bed', Label: 'Bed Temp', Raw: '110-120C', Lo: '110', Hi: '120', Quote: 'Bed Temp 110-120C' }),
    value({ SourceID: 'S-FIXTURE', Grade: 'G116-01', Field: 'Tensile modulus', Raw: '2010 MPa', Lo: '2010', Label: 'Modulus', Direction: 'X-Y', Standard: 'ISO 527', Quote: 'Modulus 2010' }),
    value({ SourceID: heldHdt.SourceID, Class: 'mismatch', Grade: heldHdt.GradeID, Field: 'HDT', Raw: '75°C', Lo: '75', Unit: '°C', Label: 'Heat Deflection', HeldIDs: 'V000544', Quote: 'Heat Deflection 75' }),
    reading({ Kind: 'context', Class: 'context', SourceID: 'S-FIXTURE', Field: 'tensile', Specimen: 'printed', Moisture: 'dry', TableHeading: 'Dry state', Quote: 'Dry state', HeldValues: 'V1(moisture=dry)' }),
  ];
  const out = buildProposals({ rows, tables: real });
  const dir = mkdtempSync(join(tmpdir(), 'proposals-'));
  writeProposals(out, dir, { run: 'fixture', readRows: rows.length });
  const t = openTables();
  const seen = [];
  const sheet = (_t, source, quote) => seen.push([source, quote]);
  const opts = { migration: 'm000', read: 'Read 2026-10-05 by Claude Sonnet vision readers (reader round)', sheet };
  const first = applyProposals(t, dir, opts);
  assert.deepEqual(first, { profilesAdded: 1, profileCells: 0, valueCells: 4, valuesAdded: 1, contextAdded: 1, causes: { 'gap-fill': 2, 'page-contradicts': 4, 'page-context': 1 } });
  assert.ok(seen.length >= 4 && seen.every(([s, q]) => s && q), 'every quote goes through the sheet guard');
  const profile = t.rows('profiles').find((p) => p.SourceID === 'S-FIXTURE');
  assert.equal(profile['Nozzle min °C'], '260'); assert.equal(profile['Bed state'], 'range'); assert.equal(profile.GradeID, 'G116-01');
  const added = t.rows('measurements').find((m) => m.SourceID === 'S-FIXTURE');
  assert.equal(added['Normalized value'], '2.01'); assert.equal(added.Direction, 'XY'); assert.match(added.Notes, /m000/);
  const fixed = t.get('measurements', 'V000544');
  assert.equal(fixed['Raw numeric'], '75'); assert.equal(fixed['Data status'], 'Published value (transcription corrected)'); assert.match(fixed.Notes, /\(m000/);
  assert.deepEqual(applyProposals(t, dir, opts), { profilesAdded: 0, profileCells: 0, valueCells: 0, valuesAdded: 0, contextAdded: 0, causes: {} }, 'a re-run changes nothing');
  // the data moved: the held row is no longer what the proposal expected
  const moved = openTables();
  moved.set('measurements', 'V000544', 'Raw value', '99°C');
  moved.set('measurements', 'V000544', 'Raw numeric', '99');
  assert.throws(() => applyProposals(moved, dir, opts), /expected|moved/);
  // a row that is not ready is never applied
  const held = mkdtempSync(join(tmpdir(), 'proposals-'));
  writeProposals({ ...out, valuesAdd: out.valuesAdd.map((v) => ({ ...v, gate: 'held' })) }, held, { run: 'fixture', readRows: 0 });
  assert.throws(() => applyProposals(openTables(), held, opts), /only ready rows/);
});

test('a product name is matched to one of the document\'s products only when exactly one fits, and the match is recorded', () => {
  assert.deepEqual(nameTokens('Silk PLA™ Filament 1.75 mm - Black'), ['silk', 'pla']);
  assert.notDeepEqual(nameTokens('PLA+'), nameTokens('PLA'), 'PLA+ is not PLA');
  const candidates = tables.grades;
  assert.deepEqual(matchProduct('SILK PLA', candidates), { id: 'G001-02', from: 'matched:exact' });
  assert.deepEqual(matchProduct('Acme Silk PLA Dual-Color 1.75mm', candidates), { id: 'G001-03', from: 'matched:exact' });
  assert.equal(matchProduct('PA12', candidates).from, 'matched:tokens', 'the reading\'s tokens are all in one name, and in no other');
  assert.equal(matchProduct('Acme PA12-CF Pro', candidates).id, undefined, 'a reading with a token the product lacks is a variant');
  assert.equal(matchProduct('Silk PLA', candidates.concat([{ GradeID: 'G9', Manufacturer: 'Acme', 'Product name': 'Silk PLA Pro' }])).from, 'matched:exact', 'an exact name wins over longer names');
  assert.equal(matchProduct('PLA', candidates).id, undefined, 'PLA is a subset of two products');
  assert.equal(matchProduct('Nylon', candidates).why, 'no product has its tokens');
  assert.equal(matchProduct('', candidates).why, 'no product name');

  const rows = [
    value({ SourceID: 'S-2', Grade: '', Product: 'Silk PLA', Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Direction: 'XY' }),
    value({ SourceID: 'S-2', Grade: '', Product: 'PLA', Field: 'Tensile modulus', Raw: '2000 MPa', Lo: '2000', Label: 'Modulus', Direction: 'XY' }),
    value({ SourceID: 'S-1', Grade: '', Product: 'whatever it is called', Field: 'Tensile modulus', Raw: '1000 MPa', Lo: '1000', Label: 'Modulus', Direction: 'XY' }),
    value({ SourceID: 'S-1', Grade: 'G001-01', Field: 'Tensile modulus', Raw: '1100 MPa', Lo: '1100', Label: 'Modulus 2', Direction: 'XY' }),
  ];
  const out = build(rows);
  assert.deepEqual(out.valuesAdd.map((v) => [v.GradeID, v.grade_from]), [['G001-02', 'matched:exact'], ['G001-01', 'single-product'], ['G001-01', 'reader']]);
  assert.match(out.held[0].reason, /^no-grade:several products share its tokens: G001-02 Silk PLA; G001-03 Silk PLA Dual-Color/);
});

test('the view that bore a quote out is recorded, and a quote the reading-order view alone prints is not held', () => {
  const rows = [value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Direction: 'XY', Quote: 'Printing temperature | 280-300 °C' })];
  const out = build(rows, { quoteOnSheet: () => 'block' });
  assert.equal(out.valuesAdd.length, 1);
  assert.equal(out.valuesAdd[0].quote_view, 'block');
  assert.equal(quoteViews(null, 'x'), null);
  assert.equal(build(rows, { quoteOnSheet: () => false }).valuesAdd.length, 0);
});

test('a bound the page prints where the record holds a point value becomes an Operator edit, only when the sign sits against the number on that page', () => {
  const held = (o) => value({ Class: 'confirms', Field: 'Tensile modulus', Label: 'Modulus', Lo: '3000', HeldIDs: 'V1', Unit: 'MPa', ...o });
  const onPage = (view) => ({ needleOnPage: (s, page, needles) => (needles.includes('>3000') || needles.includes('<3000') || needles.includes('≤3000') ? view : '') });
  const inCell = build([held({ Raw: '> 3000 MPa', Operator: '>' })], onPage('line'));
  assert.deepEqual(inCell.valuesSet.map((r) => [r.column, r.expect, r.value, r.cause]), [['Operator', '=', '>', 'bound-sign'], ['Raw value', '3000 MPa', '> 3000 MPa', 'bound-sign']]);
  assert.equal(inCell.valuesSet[0].sign_view, 'line');
  const operatorOnly = build([held({ Class: 'mismatch', Raw: '3000 MPa', Operator: '<' })], onPage('block'));
  assert.deepEqual(operatorOnly.valuesSet.map((r) => [r.column, r.value]), [['Operator', '<']], 'the cell is kept where it prints no sign');
  const atMost = build([held({ Raw: '≤ 3000 MPa', Operator: '' })], onPage('ocr'));
  assert.equal(atMost.valuesSet[0].value, '<', 'at most is the nearest of the two bounds the database keeps');
  const absent = build([held({ Raw: '> 3000 MPa', Operator: '>' })], onPage(''));
  assert.equal(absent.valuesSet.length, 0); assert.ok(absent.held[0].reason.includes('bound-sign-not-on-page'));
  assert.equal(build([held({ Raw: '> 3001 MPa', Operator: '>', Lo: '3001' })], onPage('line')).valuesSet.length, 0, 'another number is no bound on this one');
  assert.equal(build([held({ Raw: '3000 MPa', Operator: '=' })], onPage('line')).valuesSet.length, 0, 'no sign, no bound');
});

test('a held list of nozzle sizes cut short is replaced by the page\'s longer list, as printed, when it holds every size the record has', () => {
  const size = (o) => setting({ Class: 'confirms', Field: 'nozzle_diameter', Label: 'Nozzle Diameter', Unit: 'mm', HeldIDs: 'P3', Lo: '0.2', ...o });
  const out = build([size({ Raw: '0.2, 0.4, 0.6, 0.8 mm' })]);
  const cells = out.profilesSet.filter((r) => r.column === 'Nozzle diameter');
  assert.deepEqual(cells.map((r) => [r.id, r.expect, r.value, r.cause]), [['P3', '0.2 mm', '0.2, 0.4, 0.6, 0.8 mm', 'nozzle-list']]);
  assert.equal(build([size({ Raw: '0.2 mm' })]).profilesSet.length, 0, 'a list no longer than the record\'s changes nothing');
  assert.equal(build([size({ Raw: '0.4, 0.6 mm', Lo: '0.4' })]).profilesSet.length, 0, 'a list that lacks a size the record holds is not its completion');
});

test('a mismatch whose held number is also on the page is held, unless a blind second reading agreed with the first', () => {
  const mismatch = (o) => value({ Class: 'mismatch', Field: 'Tensile modulus', Raw: '3300 MPa', Lo: '3300', Label: 'Modulus', HeldIDs: 'V1', ...o });
  const ctx = { numberOnPage: () => true };
  assert.equal(build([mismatch({ SecondRead: 'pending' })], ctx).valuesSet.length, 0);
  assert.equal(build([mismatch({ SecondRead: 'agreed-text' })], ctx).valuesSet.length, 0, 'only a second reading of the page lifts it');
  const agreed = build([mismatch({ SecondRead: 'agreed' })], ctx);
  assert.ok(agreed.valuesSet.length >= 3 && agreed.valuesSet.every((r) => r.cause === 'agreed-mismatch'));
  assert.match(agreed.valuesSet[0].note, /record held 3000 MPa/);
  assert.equal(build([mismatch({ SecondRead: 'agreed' })], { numberOnPage: () => false }).valuesSet[0].cause, 'page-contradicts');
});

test('every proposal carries its cause', () => {
  const out = build([value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus 2', Direction: 'Z' }), setting({ Field: 'nozzle', Label: 'Nozzle', Raw: '230 °C', Lo: '230' })]);
  assert.equal(out.valuesAdd[0].cause, 'gap-fill'); assert.equal(out.profilesAdd[0].cause, 'gap-fill');
});

test('a bare answer cell is written with the sheet\'s label when the parsers cannot read it alone, and held when they still cannot', () => {
  assert.deepEqual(labelledAnswers({ Field: 'hardened_nozzle', Label: 'Hardened nozzle:' }, 'Yes'), ['Hardened nozzle: Yes', 'Hardened nozzle Yes']);
  assert.equal(labelledAnswers({ Field: 'hardened_nozzle', Label: 'Hardened nozzle' }, '0.4 mm'), null, 'a number is not a bare answer');
  assert.equal(labelledAnswers({ Field: 'hardened_nozzle', Label: 'Hardened nozzle' }, 'one two three four'), null);
  assert.equal(labelledAnswers({ Field: 'nozzle', Label: 'Nozzle' }, 'Yes'), null, 'only the answer settings');
  assert.equal(labelledAnswers({ Field: 'hardened_nozzle', Label: 'Hardened nozzle' }, 'Hardened nozzle: Yes'), null, 'a cell that already carries its label');
  const answer = (o) => setting({ Field: 'hardened_nozzle', Label: 'Hardened nozzle', Unit: '', Raw: 'Yes', Quote: 'Hardened nozzle | Yes', ...o });
  const out = build([answer({}), setting({ Field: 'bed', Label: 'Bed', Raw: '60 °C', Lo: '60' })]);
  assert.equal(out.profilesAdd.length, 1);
  assert.equal(out.profilesAdd[0]['Abrasion / clogging'], 'Hardened nozzle: Yes');
  assert.equal(out.profilesAdd[0]['Hardened nozzle'], 'TRUE');
  const held = build([answer({ Label: 'Gehärtete Nozzle', Raw: 'ja' }), setting({ Field: 'bed', Label: 'Bed', Raw: '60 °C', Lo: '60' })]);
  assert.ok(held.held.some((h) => h.reason === 'parsed-vs-read'), 'a word the parsers do not know stays held');
  // in profiles-set
  const set = build([answer({ SourceID: 'S-2', Grade: 'G001-03', Raw: 'No' })]);
  assert.deepEqual(set.profilesSet.filter((r) => r.column === 'Abrasion / clogging').map((r) => [r.id, r.value]), [['P1', 'Hardened nozzle: No']]);
});

test('a quote no view prints is replaced by its label and value when each is on the page, only for a reading the page or a second reading bears out', () => {
  const rows = (o) => [value({ Field: 'Tensile modulus', Raw: '3000 MPa', Lo: '3000', Label: 'Modulus', Direction: 'XY', Quote: 'Modulus (garbled) 3000', ...o })];
  const ctx = { quoteOnSheet: (s, q) => q === 'Modulus | 3000 MPa', piecesOnPage: () => true };
  const ok = build(rows({}), ctx);
  assert.equal(ok.valuesAdd.length, 1);
  assert.equal(ok.valuesAdd[0].quote, 'Modulus | 3000 MPa'); assert.equal(ok.valuesAdd[0].quote_view, 'pieces');
  assert.equal(build(rows({}), { ...ctx, piecesOnPage: () => false }).valuesAdd.length, 0, 'a piece not on the page keeps the hold');
  assert.equal(build(rows({ Presence: 'block' }), ctx).valuesAdd.length, 0, 'a block-only reading is not enough without a second reading');
  assert.equal(build(rows({ Presence: 'block', SecondRead: 'agreed-text' }), ctx).valuesAdd.length, 1);
  assert.equal(build(rows({ Label: '' }), ctx).valuesAdd.length, 0, 'no label, no pieces');
  assert.ok(build(rows({}), { ...ctx, quoteOnSheet: () => false }).held[0].reason.includes('quote-not-on-cached-text'));
});
