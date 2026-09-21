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
  const sources = (role, id = 'S1') => ({ SourceID: id, 'Source class': 'Manufacturer TDS', 'Citation role': role, 'Access state': 'retrieved', URL: 'https://example.com' });
  const run = (rows, measurements = []) => lintData({
    sources: { header: Object.keys(rows[0]), rows },
    measurements: { header: ['MeasurementID', 'SourceID'], rows: measurements },
  }, { sources: { primaryKey: 'SourceID', fields: [] }, measurements: { primaryKey: 'MeasurementID', fields: [] } }).map((f) => `${f.code} ${f.record}`);
  assert.deepEqual(run([sources('cited')]), ['SOURCE-UNCITED S1']);
  assert.deepEqual(run([sources('corroboration')]), []);
  assert.deepEqual(run([sources('not-retrieved')], [{ MeasurementID: 'V1', SourceID: 'S1' }]), ['SOURCE-ROLE-CITED S1']);
});

test('a source Title is what the publisher printed, not shop chrome, a file name or a placeholder', () => {
  const src = (id, Title) => ({ SourceID: id, Title, 'Source class': 'Manufacturer TDS', 'Citation role': 'corroboration', 'Access state': 'retrieved', URL: 'https://example.com/' + id });
  const run = (rows) => lintData({ sources: { header: Object.keys(rows[0]), rows } }, { sources: { primaryKey: 'SourceID', fields: [] } }).filter((f) => f.code === 'SOURCE-TITLE-NOT-TITLE').map((f) => f.record);
  assert.deepEqual(run([
    src('S1', 'CARBONX™ ABS+CF Ach Direct Debit Amazon American Express Apple Pay Visa'), src('S2', 'B pla basic filament'), src('S3', 'B PC'),
    src('S4', 'untitled'), src('S5', 'CF_PA12_v1.xlsx'), src('S6', 'TDS_FIBERON PA612-CF15_V1.1_EN'),
    src('S7', 'Bambu Filament Technical Data Sheet - PLA Basic'), src('S8', 'CARBONX™ ABS+CF'), src('S9', 'Bambu Lab Filament Guide'), src('S10', 'PLA Basic | Bambu Lab CA Store'),
  ]), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
});

test('a superseded coverage row is history, not a duplicate', () => {
  const row = (id, status, finding) => ({ CoverageID: id, MaterialID: 'M1', Domain: 'Thermal', Status: status, Finding: finding });
  const run = (rows) => lintData({ coverage: { header: Object.keys(rows[0]), rows } }, { coverage: { primaryKey: 'CoverageID', fields: [] } }).map((f) => f.code);
  assert.deepEqual(run([row('C1', 'Gap', 'x'), row('C2', 'Gap', 'x')]), ['COVERAGE-DUPLICATE']);
  assert.deepEqual(run([row('C1', 'Superseded', 'Superseded by C2: x'), row('C2', 'Gap', 'x')]), []);
});

test('a locator that names one direction must agree with the Direction column; mixed labels are left alone', () => {
  const f = (id, Locator, Direction) => row({ MeasurementID: id, Locator, Direction, 'Normalized value': id.slice(-1) });
  const found = codes([
    f('V1', 'p. 1: Tensile Strength Z', 'Not published'), f('V2', 'p. 1: Tensile Strength Z', 'Z'),
    f('V3', 'Young\'s modulus (X-Y)', 'Not applicable'), f('V4', 'Tensile strength (X-Z)', 'Not published'),
    f('V5', 'p. 2: Bending modulus (Z)', 'Z'), f('V6', 'Zytel resin sheet', 'Not published'),
  ]).filter((c) => c.startsWith('MEAS-LOCATOR-DIRECTION'));
  assert.deepEqual(found, ['MEAS-LOCATOR-DIRECTION V1', 'MEAS-LOCATOR-DIRECTION V3']);
});

test('HDT at 0.45 MPa below HDT at 1.8 MPa on one grade and state is caught, unless the pair is flagged implausible', () => {
  const hdt = (id, load, value, o = {}) => row({ MeasurementID: id, Property: 'HDT', Direction: 'Not applicable', 'Test load MPa': String(load), 'Normalized value': String(value), 'Normalized unit': '°C', Locator: `p. 2: HDT ${load}`, ...o });
  const physics = (rows) => codes(rows).filter((c) => c.startsWith('MEAS-PHYSICS'));
  assert.deepEqual(physics([hdt('V1', 0.45, 112), hdt('V2', 1.8, 117)]), ['MEAS-PHYSICS-HDT-LOADS V1']);
  assert.deepEqual(physics([hdt('V1', 0.45, 112), hdt('V2', 1.8, 117, { 'Post-processing': 'Annealed (schedule not stated)' })]), []);
  const flagged = { 'Data status': 'Published value (physically implausible)' };
  assert.deepEqual(physics([hdt('V1', 0.45, 112, flagged), hdt('V2', 1.8, 117, flagged)]), []);
});

test('a per-record build finding needs an acceptance, and an acceptance that no longer occurs is stale (C-10)', async () => {
  const { reviewFindings } = await import('../scripts/data/review-findings.mjs');
  const { compareWithBaseline } = await import('../scripts/data/lint.mjs');
  const issues = [
    { level: 'warn', code: 'EST-OUTLIER', where: 'materials', message: '2 outliers', records: ['M070 tensileModulusXY', 'M094 elongationXY'] },
    { level: 'info', code: 'EST-SUMMARY', where: 'materials', message: 'summary' },
  ];
  const findings = reviewFindings(issues);
  assert.deepEqual(findings.map((f) => f.record), ['M070 tensileModulusXY', 'M094 elongationXY']);
  const { fresh, stale } = compareWithBaseline(findings, [
    { Code: 'EST-OUTLIER', Table: 'materials', Record: 'M070 tensileModulusXY', Field: null },
    { Code: 'EST-OUTLIER', Table: 'materials', Record: 'M019 hdt045', Field: null },
  ]);
  assert.deepEqual(fresh.map((f) => f.record), ['M094 elongationXY']);
  assert.deepEqual(stale.map((b) => b.Record), ['M019 hdt045']);
});

test('one product has one grade, and one formulation key names one product of one material', () => {
  const grade = (o) => ({ GradeID: 'G1-01', MaterialID: 'M1', Status: 'active', Manufacturer: 'Spectrum', 'Product name': 'PETG CF', 'Shared formulation key': 'S-PETG-CF', ...o });
  const run = (rows) => lintData({ grades: { header: Object.keys(rows[0]), rows } }, { grades: { primaryKey: 'GradeID', fields: [] } }).map((f) => `${f.code} ${f.record}`);
  // Two makers may both sell a "PETG CF"; one maker selling it twice is a duplicate.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G2-01', MaterialID: 'M2', Manufacturer: 'iSANMATE', 'Shared formulation key': 'I-PETG-CF' })]), []);
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G1-02', 'Product name': 'petg cf', 'Shared formulation key': 'S-PETG-CF-2' })]), ['GRADE-PRODUCT-DUPLICATE G1-02']);
  // A retired copy is an audit trail, not a second product.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G1-02', Status: 'retired' })]), []);
  // One key on two materials: the estimate model predicts a formulation once, so it cannot belong to both. This is
  // the Panchroma case, where two products came from columns of one sheet and the model read them as one.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G2-01', MaterialID: 'M2', 'Product name': 'CoPE' })]), ['FORMULATION-KEY-SPANS-MATERIALS G1-01 | G2-01']);
  // A sheet that prints several products gives each its own key.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G1-02', 'Product name': 'PETG GF' })]), ['GRADE-KEY-PRODUCTS G1-01 | G1-02']);
  assert.deepEqual(run([grade({ 'Shared formulation key': 'S-SHEET#petg-cf' }), grade({ GradeID: 'G1-02', 'Product name': 'PETG GF', 'Shared formulation key': 'S-SHEET#petg-gf' })]), []);
  // R053's twin: a product whose own sheet prints another sheet's numbers is "a grade each, citing its own
  // sheet, with the values recorded once". It carries no measurement, so it is not a second product competing
  // for the key — sharing the key is what says the two are one formulation, which is the ruling's whole point.
  const withValues = (rows, measurements) => lintData(
    { grades: { header: Object.keys(rows[0]), rows }, measurements: { header: ['MeasurementID', 'GradeID'], rows: measurements } },
    { grades: { primaryKey: 'GradeID', fields: [] }, measurements: { primaryKey: 'MeasurementID', fields: [] } },
  ).map((f) => `${f.code} ${f.record}`);
  const twin = [grade({}), grade({ GradeID: 'G1-02', 'Product name': 'PETG GF' })];
  assert.deepEqual(withValues(twin, [{ MeasurementID: 'V1', GradeID: 'G1-01' }]), []);
  // And the shape the rule exists for is unchanged: two grades that each carry values under one key.
  assert.deepEqual(withValues(twin, [{ MeasurementID: 'V1', GradeID: 'G1-01' }, { MeasurementID: 'V2', GradeID: 'G1-02' }]), ['GRADE-KEY-PRODUCTS G1-01 | G1-02']);
});

test('two sources that publish the same sheet are one document registered twice', () => {
  const value = (id, source, property, v) => row({ MeasurementID: id, SourceID: source, Property: property, 'Normalized value': String(v), Locator: `p. 1: ${property}` });
  const sheet = (source, offset = 0) => [
    value(`${source}1`, source, 'Tensile modulus', 2.1 + offset), value(`${source}2`, source, 'Tensile strength (endpoint unspecified)', 47 + offset),
    value(`${source}3`, source, 'Elongation at break', 8.4 + offset), value(`${source}4`, source, 'Flexural modulus', 2.3 + offset),
    value(`${source}5`, source, 'Flexural strength', 71 + offset), value(`${source}6`, source, 'HDT', 68 + offset),
  ];
  const run = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows } }, schemas).filter((f) => f.code === 'MEAS-CROSS-SOURCE-TWIN').map((f) => f.record);
  assert.deepEqual(run([...sheet('A'), ...sheet('B')]), ['A | B']);
  // A sheet whose numbers are its own is not a copy, however much it looks like one.
  assert.deepEqual(run([...sheet('A'), ...sheet('B', 0.5)]), []);
  // Too few values to tell a copy from a coincidence.
  assert.deepEqual(run([...sheet('A').slice(0, 4), ...sheet('B').slice(0, 4)]), []);
});

test('two source records may not hold the same document', () => {
  const digest = 'a'.repeat(64);
  const src = (id, sha) => ({ SourceID: id, Title: 'Technical Data Sheet', 'Source class': 'Manufacturer TDS', 'Citation role': 'corroboration', 'Access state': 'retrieved', URL: `https://example.com/${id}`, SHA256: sha });
  const run = (rows) => lintData({ sources: { header: Object.keys(rows[0]), rows } }, { sources: { primaryKey: 'SourceID', fields: [] } }).filter((f) => f.code === 'SOURCE-SHA-DUPLICATE').map((f) => f.record);
  assert.deepEqual(run([src('S1', digest), src('S2', digest)]), ['S2']);
  assert.deepEqual(run([src('S1', digest), src('S2', 'b'.repeat(64))]), []);
  // "Not recorded" is not a digest, so it is not a match.
  assert.deepEqual(run([src('S1', 'Not recorded'), src('S2', 'Not recorded')]), []);
});

test('a value outside what its polymer can do is a finding, and a Z value is not', () => {
  const windows = [
    { WindowID: 'W0001', Property: 'Tensile modulus', 'Normalized unit': 'GPa', 'Matrix class': 'elastomer', 'Fill class': 'any', Condition: 'any',
      'Hard low': '0.0005', 'Soft low': '0.002', 'Soft high': '0.2', 'Hard high': '0.5', 'Always flag': 'FALSE', Basis: 'physics' },
    { WindowID: 'W0002', Property: 'Tensile modulus', 'Normalized unit': 'GPa', 'Matrix class': 'any', 'Fill class': 'any', Condition: 'any',
      'Hard low': '0.05', 'Soft low': '1', 'Soft high': '20', 'Hard high': '40', 'Always flag': 'FALSE', Basis: 'physics' },
    { WindowID: 'W0003', Property: 'HDT', 'Normalized unit': '°C', 'Matrix class': 'elastomer', 'Fill class': 'any', Condition: 'any',
      'Hard low': 'Not applicable', 'Soft low': 'Not applicable', 'Soft high': 'Not applicable', 'Hard high': 'Not applicable', 'Always flag': 'TRUE', Basis: 'an elastomer has no heat deflection temperature' },
  ];
  const tables = (rows) => ({
    measurements: { header: Object.keys(rows[0]), rows },
    materials: { header: ['MaterialID', 'Estimate identity', 'Modifier / filler'], rows: [
      { MaterialID: 'M1', 'Estimate identity': 'TPU', 'Modifier / filler': 'Unfilled / unspecified' },
      { MaterialID: 'M2', 'Estimate identity': 'PLA', 'Modifier / filler': 'Unfilled / unspecified' },
    ] },
    polymers: { header: ['PolymerID', 'Morphology'], rows: [{ PolymerID: 'TPU', Morphology: 'elastomer' }, { PolymerID: 'PLA', Morphology: 'amorphous' }] },
    plausibility_windows: { header: Object.keys(windows[0]), rows: windows },
  });
  const run = (rows) => lintData(tables(rows), schemas).filter((f) => f.code === 'MEAS-PHYSICS-WINDOW').map((f) => `${f.record} ${f.message}`);

  const modulus = (o) => row({ MaterialID: 'M1', Property: 'Tensile modulus', 'Normalized unit': 'GPa', 'Normalized value': '0.05', ...o });
  assert.deepEqual(run([modulus({})]), []);
  // The most specific window wins: an elastomer is judged as an elastomer, not against the fallback.
  assert.match(run([modulus({ MeasurementID: 'V2', 'Normalized value': '1.19' })])[0] ?? '', /impossible/);
  assert.match(run([modulus({ MeasurementID: 'V3', 'Normalized value': '0.3' })])[0] ?? '', /surprising/);
  // A part printed across its layers is weakest there, so the low side says nothing about a Z value.
  assert.deepEqual(run([modulus({ MeasurementID: 'V4', 'Normalized value': '0.001', Direction: 'Z' })]), []);
  assert.match(run([modulus({ MeasurementID: 'V5', 'Normalized value': '0.001' })])[0] ?? '', /surprising/);
  // A film is not a printed bar, and D55 already keeps it out of every headline.
  assert.deepEqual(run([modulus({ MeasurementID: 'V6', 'Normalized value': '1.19', 'Specimen type': 'Film specimen (ASTM D882); not a printed or moulded bar' })]), []);
  // A value the database already flags has been dealt with.
  assert.deepEqual(run([modulus({ MeasurementID: 'V7', 'Normalized value': '1.19', 'Data status': 'Published value (physically implausible)' })]), []);
  // Some findings are the existence of the value, whatever its number.
  assert.match(run([row({ MaterialID: 'M1', Property: 'HDT', 'Normalized unit': '°C', 'Normalized value': '74', Direction: 'Not applicable' })])[0] ?? '', /no heat deflection temperature/);
});

// D80: a grade may declare a load its material does not carry, and a window chosen by the material alone judges a
// bronze-filled PLA as an unfilled one. What the filler does is the class, and the grade declares it first.
test('a grade that declares its load is judged by the window for that load, not by its material\'s', () => {
  const windows = [
    { WindowID: 'W0001', Property: 'Density', 'Normalized unit': 'kg/m³', 'Matrix class': 'amorphous', 'Fill class': 'unfilled', Condition: 'any',
      'Hard low': '700', 'Soft low': '950', 'Soft high': '1450', 'Hard high': '1800', 'Always flag': 'FALSE', Basis: 'physics' },
    { WindowID: 'W0002', Property: 'Density', 'Normalized unit': 'kg/m³', 'Matrix class': 'amorphous', 'Fill class': 'dense', Condition: 'any',
      'Hard low': '900', 'Soft low': '1100', 'Soft high': '4000', 'Hard high': '8000', 'Always flag': 'FALSE', Basis: 'the filler decides the density' },
    { WindowID: 'W0003', Property: 'Density', 'Normalized unit': 'kg/m³', 'Matrix class': 'amorphous', 'Fill class': 'light', Condition: 'any',
      'Hard low': '300', 'Soft low': '400', 'Soft high': '1250', 'Hard high': '1450', 'Always flag': 'FALSE', Basis: 'a foam is as dense as it is foamed' },
  ];
  const tables = (rows, grades) => ({
    measurements: { header: Object.keys(rows[0]), rows },
    grades: { header: ['GradeID', 'MaterialID', 'Variant'], rows: grades },
    materials: { header: ['MaterialID', 'Estimate identity', 'Modifier / filler'], rows: [
      { MaterialID: 'M1', 'Estimate identity': 'PLA', 'Modifier / filler': 'Unfilled / unspecified' },
      { MaterialID: 'M2', 'Estimate identity': 'PLA', 'Modifier / filler': 'Foaming' },
    ] },
    polymers: { header: ['PolymerID', 'Morphology'], rows: [{ PolymerID: 'PLA', Morphology: 'amorphous' }] },
    plausibility_windows: { header: Object.keys(windows[0]), rows: windows },
  });
  const density = (o) => row({ MaterialID: 'M1', GradeID: 'G1', Property: 'Density', 'Normalized unit': 'kg/m³', 'Normalized value': '3900', Direction: 'Not applicable', ...o });
  const run = (rows, grades) => lintData(tables(rows, grades), schemas).filter((f) => f.code === 'MEAS-PHYSICS-WINDOW').map((f) => f.message);

  // colorFabb's BronzeFill is a grade of PLA at 3.9 g/cm³. Judged by its material it is an impossible PLA.
  assert.match(run([density({})], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'Not applicable' }])[0] ?? '', /impossible/);
  // Judged by what its own grade declares, it is a densely filled PLA, which is what it is.
  assert.deepEqual(run([density({})], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'undisclosed dense filler' }]), []);
  // A load the maker declares is the same load, and the same class (R095): copperFill says "loaded with copper".
  assert.deepEqual(run([density({})], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'declared dense filler' }]), []);
  // The class says what the filler does, so a lightened grade is not judged by a dense one's floor.
  assert.deepEqual(run([density({ 'Normalized value': '750' })], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'lightweight additive' }]), []);
  assert.match(run([density({ 'Normalized value': '750' })], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'undisclosed dense filler' }])[0] ?? '', /impossible/);
  assert.match(run([density({ 'Normalized value': '1050' })], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'undisclosed dense filler' }])[0] ?? '', /surprising/);
  // A foaming material declares it for every grade, and a grade that declares nothing takes its material's word.
  assert.deepEqual(run([density({ MaterialID: 'M2', 'Normalized value': '420' })], [{ GradeID: 'G1', MaterialID: 'M2', Variant: 'Not applicable' }]), []);
  assert.match(run([density({ 'Normalized value': '420' })], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'Not applicable' }])[0] ?? '', /impossible/);
  // And the message names the class it was judged by, so a reader can see which window spoke.
  assert.match(run([density({ 'Normalized value': '8100' })], [{ GradeID: 'G1', MaterialID: 'M1', Variant: 'undisclosed dense filler' }])[0] ?? '', /densely filled/);
});

test('two values a sheet orders the wrong way round are a swapped line, unless they are merely close', () => {
  const thermal = (id, property, value) => row({ MeasurementID: id, Property: property, 'Normalized value': String(value),
    'Normalized unit': '°C', Direction: 'Not applicable', Locator: `p. 1: ${property}` });
  const run = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows } }, schemas)
    .filter((f) => f.code === 'MEAS-PHYSICS-ORDER').map((f) => f.record);

  // A needle cannot sink into a bar below the temperature at which its polymer goes rubbery.
  assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 145), thermal('V2', 'Vicat softening temperature', 119)]), ['V1']);
  // But two different tests cross by a little where the polymer puts them close: a PLA's Vicat and its glass
  // transition sit within a couple of degrees, and which comes first is scatter, not a swapped line.
  assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 60), thermal('V2', 'Vicat softening temperature', 57)]), []);
  assert.deepEqual(run([thermal('V1', 'Vicat softening temperature', 190), thermal('V2', 'Melting temperature', 187.3)]), []);
  // A polymer melts above its glass transition and crystallises below where it melted.
  assert.deepEqual(run([thermal('V1', 'Crystallization temperature', 240), thermal('V2', 'Melting temperature', 180)]), ['V1']);
  // Rows of different grades are not a pair.
  assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 145), { ...thermal('V2', 'Vicat softening temperature', 119), GradeID: 'G2-01' }]), []);
  // Nor are a film and a bar: FormFutura prints Ingeo's film tensile strength beside its own bars' flexural one.
  const strength = (id, property, value, specimen) => row({ MeasurementID: id, Property: property, 'Normalized value': String(value),
    'Normalized unit': 'MPa', Direction: 'Unstated', Locator: `p. 1: ${property}`, 'Specimen type': specimen });
  const film = 'Film specimen (ASTM D882); not a printed or moulded bar';
  const bar = 'Not published (do not assume printed)';
  assert.deepEqual(run([strength('V1', 'Flexural strength', 55, bar), strength('V2', 'Tensile strength (endpoint unspecified)', 110, film)]), []);
  // The same two values measured on one kind of specimen are still one of them on the wrong line.
  assert.deepEqual(run([strength('V1', 'Flexural strength', 55, bar), strength('V2', 'Tensile strength (endpoint unspecified)', 110, bar)]), ['V1']);
});
