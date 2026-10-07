// Data lint rules: each catches the defect it names, and leaves legitimate look-alikes alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lintData } from '../build/src/lint-rules.js';
import { readCsv } from '../build/src/csv.js';

const schemas = { measurements: { primaryKey: 'MeasurementID' } };
const row = (o) => ({
  MeasurementID: 'V1', GradeID: 'G1-01', Property: 'Tensile modulus', Direction: 'XY', Notch: 'Not applicable', 'Standard / load': 'ISO 527',
  'Test load MPa': 'Not applicable', 'Test temperature': 'Not published', 'Moisture condition': 'Not published', 'Post-processing': 'Not published',
  'Specimen type': 'Printed specimen', 'Specimen / print parameters': 'Printing temperature 300 °C', SourceID: 'S1', Locator: 'p. 4: Young’s modulus (X-Y)',
  'Normalized value': '4.431', 'Normalized unit': 'GPa', 'Data status': 'Published value', ...o,
});
// The orderings physics fixes are data (physical_relations.csv); the lint reads them from the table it is given.
const physicalRelations = (() => {
  const { header, records } = readCsv(fileURLToPath(new URL('../data/tables/physical_relations.csv', import.meta.url)));
  return { header, rows: records.map((r) => r.values) };
})();
const codes = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows }, physical_relations: physicalRelations }, schemas).filter((f) => f.code.startsWith('MEAS-')).map((f) => `${f.code} ${f.record}`);

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

test('a source Title is what the publisher printed, not shop chrome, a file name, a placeholder or page furniture', () => {
  const src = (id, Title) => ({ SourceID: id, Title, 'Source class': 'Manufacturer TDS', 'Citation role': 'corroboration', 'Access state': 'retrieved', URL: 'https://example.com/' + id });
  const run = (rows) => lintData({ sources: { header: Object.keys(rows[0]), rows } }, { sources: { primaryKey: 'SourceID', fields: [] } }).filter((f) => f.code === 'SOURCE-TITLE-NOT-TITLE').map((f) => f.record);
  assert.deepEqual(run([
    src('S1', 'CARBONX™ ABS+CF Ach Direct Debit Amazon American Express Apple Pay Visa'), src('S2', 'B pla basic filament'), src('S3', 'B PC'),
    src('S4', 'untitled'), src('S5', 'CF_PA12_v1.xlsx'), src('S6', 'TDS_FIBERON PA612-CF15_V1.1_EN'),
    src('S7', 'Bambu Filament Technical Data Sheet - PLA Basic'), src('S8', 'CARBONX™ ABS+CF'), src('S9', 'Bambu Lab Filament Guide'), src('S10', 'PLA Basic | Bambu Lab CA Store'),
  ]), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
  // Page furniture a reader took from a sheet's first line (m149): a credit line whose name is a logo, a lone mark or
  // number, the first word of a two-line heading, a page, version or date label. A sheet that prints no title says so.
  assert.deepEqual(run([
    src('F1', 'supported by'), src('F2', 'A product by'), src('F3', 'TM'), src('F4', '®'), src('F5', '1'), src('F6', 'S.I.'),
    src('F7', 'TECHNICAL'), src('F8', 'T E C H N I C A L'), src('F9', 'Page: 1'), src('F10', 'Version: 3.0'), src('F11', 'Date of issue: November 1%, 2024'),
    src('T1', 'MD¹ Flex Antibacterial Nanocomposite'), src('T2', 'PolyLite™ PETG Technical Data Sheet'), src('T3', 'Technical Data Sheet'),
    src('T4', 'PEEK'), src('T5', 'Not published'), src('T6', 'Version history of PolyLite PLA'),
  ]), ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11']);
});

test('a superseded coverage row is history, not a duplicate', () => {
  const row = (id, status, finding) => ({ CoverageID: id, MaterialID: 'M1', Domain: 'Thermal', Status: status, Finding: finding });
  const run = (rows) => lintData({ coverage: { header: Object.keys(rows[0]), rows } }, { coverage: { primaryKey: 'CoverageID', fields: [] } }).map((f) => f.code);
  assert.deepEqual(run([row('C1', 'Gap', 'x'), row('C2', 'Gap', 'x')]), ['COVERAGE-DUPLICATE']);
  assert.deepEqual(run([row('C1', 'Superseded', 'Superseded by C2: x'), row('C2', 'Gap', 'x')]), []);
  // Two open findings in one domain may be one overtaken by the other; two closed ones are a log of what was fixed.
  assert.deepEqual(run([row('C1', 'Gap', 'no HDT'), row('C2', 'Gap', 'no HDT at 0.45 MPa')]), ['COVERAGE-SUPERSEDED']);
  assert.deepEqual(run([row('C1', 'Resolved', 'V1 resolved: unit corrected'), row('C2', 'Resolved', 'V2 resolved: unit corrected')]), []);
});

test('a headline limited to named families names every family with candidates, or a reason is accepted', () => {
  const materials = [{ MaterialID: 'M1', Family: 'PLA', Scope: 'H2C-relevant' }, { MaterialID: 'M2', Family: 'Flexible Elastomers', Scope: 'H2C-relevant' },
    { MaterialID: 'M3', Family: 'Metal and Ceramic Sintering', Scope: 'Excluded' }, { MaterialID: 'M4', Family: 'Polyketones', Scope: 'H2C-relevant' }];
  const run = (appliesTo) => lintData({
    materials: { header: Object.keys(materials[0]), rows: materials },
    headline_definitions: { header: ['HeadlineKey', 'Applies to'], rows: [{ HeadlineKey: 'hdt045', 'Applies to': appliesTo }, { HeadlineKey: 'density', 'Applies to': '' }] },
  }, {}).filter((f) => f.code === 'HEADLINE-FAMILY-UNLISTED').map((f) => f.record);
  // A family that arrived after the list was written is named; an excluded family is not a candidate.
  assert.deepEqual(run('Morphology: amorphous | not modelled; Family: PLA'), ['hdt045 | Flexible Elastomers', 'hdt045 | Polyketones']);
  assert.deepEqual(run('Family: PLA | Polyketones | Flexible Elastomers'), []);
  assert.deepEqual(run('Morphology: amorphous'), []);
});

test('a locator that names one direction must agree with the Direction column; mixed labels are left alone', () => {
  const f = (id, Locator, Direction) => row({ MeasurementID: id, Locator, Direction, 'Normalized value': id.slice(-1) });
  const found = codes([
    f('V1', 'p. 1: Tensile Strength Z', 'Not published'), f('V2', 'p. 1: Tensile Strength Z', 'Z'),
    f('V3', 'Young\'s modulus (X-Y)', 'Not applicable'), f('V4', 'Tensile strength (X-Z)', 'Not published'),
    f('V5', 'p. 2: Bending modulus (Z)', 'Z'), f('V6', 'Zytel resin sheet', 'Not published'),
  ]).filter((c) => c.startsWith('MEAS-LOCATOR-DIRECTION'));
  assert.deepEqual(found, ['MEAS-LOCATOR-DIRECTION V1', 'MEAS-LOCATOR-DIRECTION V3']);
  // A thermal row carries no direction by convention, and there the locator's "XY" is how the bar was printed. A
  // mechanical row with the same locator is still held to it.
  const properties = { header: ['Property', 'Domain'], rows: [{ Property: 'HDT', Domain: 'thermal' }, { Property: 'Tensile modulus', Domain: 'mechanical' }] };
  const withDomains = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows }, properties }, schemas)
    .filter((x) => x.code === 'MEAS-LOCATOR-DIRECTION').map((x) => x.record);
  assert.deepEqual(withDomains([
    row({ MeasurementID: 'V1', Property: 'HDT', Locator: '94.7 °C (XY)', Direction: 'Not applicable', 'Normalized value': '94.7' }),
    row({ MeasurementID: 'V2', Property: 'HDT', Locator: 'p. 2: HDT (Z)', Direction: 'Not published', 'Normalized value': '80' }),
    row({ MeasurementID: 'V3', Locator: 'Young\'s modulus (X-Y)', Direction: 'Not applicable' }),
  ]), ['V2', 'V3']);
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

test('an outlier acceptance holds for the value it was written for: dormant while it stands, stale when it moves (D131)', async () => {
  const { reviewFindings, splitStale } = await import('../scripts/data/review-findings.mjs');
  const { compareWithBaseline } = await import('../scripts/data/lint.mjs');
  const findings = reviewFindings([{ level: 'warn', code: 'EST-OUTLIER', where: 'materials', message: '1 outlier', records: ['M028 hdt045'], values: [97] }]);
  assert.equal(findings[0].field, 'measured 97');
  const accepted = (record, value) => ({ Code: 'EST-OUTLIER', Table: 'materials', Record: record, Field: `measured ${value}` });
  // The same value: accepted. Another value: a new finding, and the old acceptance no longer matches.
  assert.equal(compareWithBaseline(findings, [accepted('M028 hdt045', 97)]).fresh.length, 0);
  const moved = compareWithBaseline(findings, [accepted('M028 hdt045', 95)]);
  assert.equal(moved.fresh.length, 1);
  // Gone below the threshold: dormant while the material's value is still 145, stale once it is not.
  const gone = compareWithBaseline(findings, [accepted('M028 hdt045', 97), accepted('M048 hdt045', 145), accepted('M049 hdt045', 140)]).stale;
  const { dormant, stale } = splitStale(gone, (record) => ({ 'M048 hdt045': 145, 'M049 hdt045': 152 })[record] ?? null);
  assert.deepEqual(dormant.map((b) => b.Record), ['M048 hdt045']);
  assert.deepEqual(stale.map((b) => b.Record), ['M049 hdt045']);
});

test('one product has one grade, and one formulation key names one product of one material', () => {
  const grade = (o) => ({ GradeID: 'G1-01', MaterialID: 'M1', Status: 'active', Manufacturer: 'Spectrum', 'Product name': 'PETG CF', 'Shared formulation key': 'S-PETG-CF', ...o });
  const run = (rows) => lintData({ grades: { header: Object.keys(rows[0]), rows } }, { grades: { primaryKey: 'GradeID', fields: [] } }).map((f) => `${f.code} ${f.record}`);
  // Two makers may both sell a "PETG CF"; one maker selling it twice is a duplicate.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G2-01', MaterialID: 'M2', Manufacturer: 'iSANMATE', 'Shared formulation key': 'I-PETG-CF' })]), []);
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G1-02', 'Product name': 'petg cf', 'Shared formulation key': 'S-PETG-CF-2' })]), ['GRADE-PRODUCT-DUPLICATE G1-02']);
  // A retired copy is an audit trail, not a second product.
  assert.deepEqual(run([grade({}), grade({ GradeID: 'G1-02', Status: 'retired' })]), []);
  // One product entered twice from two revisions of its sheet: the maker's words and a revision mark aside, it is one
  // name. A rating or a product generation is not a revision.
  const second = (name) => run([grade({}), grade({ GradeID: 'G1-02', 'Product name': name, 'Shared formulation key': 'S-PETG-CF-2' })]);
  for (const name of ['Spectrum PETG CF', 'PETG CF V5.6', 'PETG CF Version 2', 'PETG CF TDS', 'PETG CF by Spectrum']) assert.deepEqual(second(name), ['GRADE-PRODUCT-DUPLICATE G1-02'], name);
  for (const name of ['PETG CF V0', 'PETG CF 2.0', 'PETG CF Version B']) assert.deepEqual(second(name), [], name);
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
  // A twin whose copied rows were retired as duplicates carries no value of its own either (m402).
  assert.deepEqual(withValues(twin, [{ MeasurementID: 'V1', GradeID: 'G1-01' }, { MeasurementID: 'V2', GradeID: 'G1-02', 'Data status': 'Retired duplicate record' }]), []);

  // Two products whose sheets print one table (GRADE-VALUES-TWIN) are one formulation, and one key says so (R053, m281);
  // without the key the twin rule asks for it.
  const v = (id, gradeId, property, value) => ({ MeasurementID: id, GradeID: gradeId, Property: property, 'Normalized value': String(value), 'Normalized unit': 'MPa', 'Data status': 'Published value' });
  const table = (gradeId) => [['Tensile modulus', 2100], ['Tensile strength (endpoint unspecified)', 47], ['Flexural modulus', 2300], ['Flexural strength', 71], ['Elongation at break', 8]].map(([p, x], i) => v(`${gradeId}-${i}`, gradeId, p, x));
  const lintAll = (rows, measurements) => lintData(
    { grades: { header: Object.keys(rows[0]), rows }, measurements: { header: Object.keys(measurements[0]), rows: measurements } },
    { grades: { primaryKey: 'GradeID', fields: [] }, measurements: { primaryKey: 'MeasurementID', fields: [] } },
  ).filter((f) => /^GRADE-/.test(f.code)).map((f) => `${f.code} ${f.record}`);
  assert.deepEqual(lintAll(twin, [...table('G1-01'), ...table('G1-02')]), []);
  assert.deepEqual(lintAll([grade({}), grade({ GradeID: 'G1-02', 'Product name': 'PETG GF', 'Shared formulation key': 'S-OTHER' })], [...table('G1-01'), ...table('G1-02')]), ['GRADE-VALUES-TWIN G1-01 | G1-02']);
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
  const run = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows }, physical_relations: physicalRelations }, schemas)
    .filter((f) => f.code === 'MEAS-PHYSICS-ORDER').map((f) => f.record);

  // A needle cannot sink into a bar below the temperature at which its polymer goes rubbery.
  assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 145), thermal('V2', 'Vicat softening temperature', 119)]), ['V1']);
  // Under the light load, that is. A needle pressed at 50 N sinks into a glassy bar once it yields, below the glass
  // transition, so a Vicat whose own words name the heavy load is not ordered against it; a load the row does not
  // state, the light load, and ASTM's "Rate B" (a heating rate) still are.
  const vicat = (standard, value = 54) => ({ ...thermal('V2', 'Vicat softening temperature', value), 'Standard / load': standard });
  for (const heavy of ['5kg ISO 306', '5kg ASTM D1525', 'ISO 306/B50', 'ISO 306, 50 N, 50 °C/h', '50N ASTM D1525', 'ISO 306 B120']) {
    assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 63), vicat(heavy)]), [], heavy);
  }
  for (const light of ['ISO 306', 'VST 10N ISO 306', 'ISO 306/A50', '1 kg load D 1525', 'Rate B ASTM D1525', '150 N']) {
    assert.deepEqual(run([thermal('V1', 'Glass transition temperature', 63), vicat(light)]), ['V1'], light);
  }
  // The heavy load does not move a Vicat past the melting point.
  assert.deepEqual(run([vicat('5kg ISO 306', 190), thermal('V3', 'Melting temperature', 160)]), ['V2']);
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

test('the stress at break cannot exceed the ultimate stress, nor the strain at maximum stress the strain at break, within one test', () => {
  const cell = (id, property, value, o = {}) => row({ MeasurementID: id, Property: property, 'Normalized value': String(value),
    'Normalized unit': /strain|Elongation/.test(property) ? '%' : 'MPa', Direction: 'XY', Locator: `p. 1: ${property}`, ...o });
  const run = (rows) => lintData({ measurements: { header: Object.keys(rows[0]), rows }, physical_relations: physicalRelations }, schemas)
    .filter((f) => f.code === 'MEAS-PHYSICS-ORDER').map((f) => f.record);
  const ultimate = 'Tensile strength (endpoint unspecified)';
  // A stress at break of 26 MPa above an ultimate stress of 12 MPa printed in the same table: one is on the wrong line.
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26), cell('V2', ultimate, 12)]), ['V1']);
  // The ultimate stress is the highest on the curve, so a break stress below it, or equal to it, is ordinary; a rounding
  // half a megapascal wide is not a finding.
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 11), cell('V2', ultimate, 12)]), []);
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 12.4), cell('V2', ultimate, 12)]), []);
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 12.6), cell('V2', ultimate, 12)]), ['V1']);
  // Not one test: another direction, another source, a conditioned table or a film.
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26), cell('V2', ultimate, 12, { Direction: 'Z' })]), []);
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26), cell('V2', ultimate, 12, { SourceID: 'S2' })]), []);
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26), cell('V2', ultimate, 12, { 'Moisture condition': 'Conditioned: 50% RH' })]), []);
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26), cell('V2', ultimate, 12, { 'Specimen type': 'Film specimen (ASTM D882); not a printed or moulded bar' })]), []);
  // A value flagged physically implausible has been dealt with.
  assert.deepEqual(run([cell('V1', 'Tensile break strength', 26, { 'Data status': 'Published value (physically implausible)' }), cell('V2', ultimate, 12)]), []);
  // The strain where the stress peaks is reached on the way to the break.
  assert.deepEqual(run([cell('V1', 'Tensile strain at strength', 9), cell('V2', 'Elongation at break', 4)]), ['V1']);
  assert.deepEqual(run([cell('V1', 'Tensile strain at strength', 4.3), cell('V2', 'Elongation at break', 4)]), []);
});

test('a semicrystalline bar does not deflect under load above its melting point; a Vicat above the HDT is ordinary', () => {
  const thermal = (id, property, value, o = {}) => row({ MeasurementID: id, MaterialID: 'M1', Property: property, 'Normalized value': String(value),
    'Normalized unit': '°C', Direction: 'Not applicable', 'Test load MPa': 'Not applicable', Locator: `p. 1: ${property}`, ...o });
  const run = (rows, morphology = 'semicrystalline') => lintData({
    measurements: { header: Object.keys(rows[0]), rows }, physical_relations: physicalRelations,
    materials: { header: ['MaterialID', 'Estimate identity'], rows: [{ MaterialID: 'M1', 'Estimate identity': 'POLY' }] },
    polymers: { header: ['PolymerID', 'Morphology'], rows: [{ PolymerID: 'POLY', Morphology: morphology }] },
  }, schemas).filter((f) => f.code === 'MEAS-PHYSICS-ORDER').map((f) => f.record);
  const hdt = (id, load, value, o = {}) => thermal(id, 'HDT', value, { 'Test load MPa': String(load), ...o });
  assert.deepEqual(run([hdt('V1', 0.45, 270), thermal('V2', 'Melting temperature', 255)]), ['V1']);
  assert.deepEqual(run([hdt('V1', 1.8, 270), thermal('V2', 'Melting temperature', 255)]), ['V1']);
  // Five degrees of scatter between a heat deflection and a melting point read twice.
  assert.deepEqual(run([hdt('V1', 0.45, 259), thermal('V2', 'Melting temperature', 255)]), []);
  // An annealed bar is still no stiffer than its crystals: the pair holds across a post-processing the sheet states.
  assert.deepEqual(run([hdt('V1', 0.45, 270, { 'Post-processing': 'Annealed at 100 °C for 4 h' }), thermal('V2', 'Melting temperature', 255)]), ['V1']);
  // An amorphous polymer has no melting point to order against.
  assert.deepEqual(run([hdt('V1', 0.45, 270), thermal('V2', 'Melting temperature', 255)], 'amorphous'), []);
  // HDT is not ordered against the Vicat: a heavily filled bar can deflect above it.
  assert.deepEqual(run([hdt('V1', 0.45, 130), thermal('V2', 'Vicat softening temperature', 110)]), []);
});

test('a Shore number whose scale the sheet does not publish is judged against both scales, and no wider', async () => {
  // The unit records the missing scale (m160), so the window says only whether the number could be a Shore reading
  // at all: its bounds are the union of the A and D windows it could belong to, and drift in either shows here.
  const { readCsv } = await import('../build/src/csv.js');
  const windows = readCsv(fileURLToPath(new URL('../data/tables/plausibility_windows.csv', import.meta.url))).records.map((r) => r.values)
    .filter((w) => w.Property === 'Hardness');
  const unsettled = windows.filter((w) => w['Normalized unit'] === 'Shore (scale not specified by source)');
  assert.ok(unsettled.length > 0, 'no window for a hardness whose scale is not published');
  const n = (x, f) => Number(x[f]);
  for (const w of unsettled) {
    const scales = windows.filter((x) => ['Shore A', 'Shore D'].includes(x['Normalized unit']) && x['Matrix class'] === w['Matrix class'] && x['Fill class'] === w['Fill class']);
    assert.equal(scales.length, 2, `${w.WindowID}: the Shore A and Shore D windows it is drawn from`);
    assert.equal(w['Always flag'], 'FALSE', `${w.WindowID} flags every value, which the unit already does`);
    const lowest = (f) => Math.min(...scales.map((x) => n(x, f)));
    const highest = (f) => Math.max(...scales.map((x) => n(x, f)));
    assert.deepEqual(['Hard low', 'Soft low', 'Soft high', 'Hard high'].map((f) => n(w, f)), [lowest('Hard low'), lowest('Soft low'), highest('Soft high'), highest('Hard high')], w.WindowID);
  }
});

test("one product's setup read twice from one sheet is a duplicate; rows of the sheet are not, but share its statements (D120)", () => {
  const profile = (id, locator, cells = {}) => ({ ProfileID: id, GradeID: 'G001-01', SourceID: 'S-X', Profile: 'Manufacturer published guidance', Locator: locator,
    'Chamber °C': 'Not published', Enclosure: 'Not published', Drying: 'Not published', 'Abrasion / clogging': 'Not published', ...cells });
  const run = (rows) => lintData({ profiles: { header: Object.keys(rows[0]), rows } }, schemas).filter((f) => f.code.startsWith('PROFILE-')).map((f) => `${f.code} ${f.record} ${f.field}`.trim());
  assert.deepEqual(run([profile('P1', 'p. 1: Nozzle temperature'), profile('P2', 'p. 1: Printing temperature')]), ['PROFILE-DUPLICATE P2']);
  assert.deepEqual(run([profile('P1', 'p. 1: Nozzle temperature'), profile('P2', 'Retired duplicate of P1 (D120): p. 1', { Profile: 'Retired duplicate record' })]), []);
  assert.deepEqual(run([profile('P1', 'p. 1: Nozzle temperature - standard speed', { Drying: '60 °C, 6 h' }), profile('P2', 'p. 1: Nozzle temperature - high speed')]), ['PROFILE-SIBLING-SILENT P2 Drying']);
});

test('a row of the sheet is named by its row, not by any word "speed" (D120)', () => {
  const profile = (id, locator) => ({ ProfileID: id, GradeID: 'G001-01', SourceID: 'S-X', Profile: 'Manufacturer published guidance', Locator: locator, 'Chamber °C': 'Not published', Enclosure: 'Not published', Drying: 'Not published', 'Abrasion / clogging': 'Not published' });
  const run = (rows) => lintData({ profiles: { header: Object.keys(rows[0]), rows } }, schemas).filter((f) => f.code === 'PROFILE-DUPLICATE').map((f) => f.record);
  assert.deepEqual(run([profile('P1', 'p. 1: Nozzle temperature; p. 1: Print speed'), profile('P2', 'p. 1: Nozzle temperature')]), ['P2']);
  assert.deepEqual(run([profile('P1', 'p. 1: Nozzle diameter 0.4 mm'), profile('P2', 'p. 1: Nozzle diameter 0.6 mm')]), []);
});

