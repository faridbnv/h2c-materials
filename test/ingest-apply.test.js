// The guard on the way in: what a batch must satisfy before anything is written, and that writing twice changes
// nothing. The document is the fixture data sheet, so every number the test claims is on a page really is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentText, sha256, cacheDir } from '../scripts/lib/pdf-text.mjs';
import { guard, rehearse, worldOf, writeBatch } from '../scripts/ingest/apply.mjs';
import { openTables } from '../scripts/data/table-io.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = join(root, 'test/fixtures/ingest/fixture-tds.pdf');
const bytes = readFileSync(fixture);
const sha = sha256(bytes);
mkdirSync(cacheDir('sources/by-sha'), { recursive: true });
copyFileSync(fixture, cacheDir('sources/by-sha', `${sha}.pdf`));
await documentText(bytes, { sha, refresh: true });

const reviewed = { status: 'accepted', by: 'the test', date: '2026-09-18' };
const source = {
  SourceID: 'R-FIXTURE-PETG-TDS', Publisher: 'Fixture Filament', Title: 'Fixture Filament Technical Data Sheet',
  Revision: 'Not published', 'Publication date': 'Not published', 'Access date': '2026-09-18',
  'Source class': 'Manufacturer TDS', 'Source note': 'Not applicable', 'Citation role': 'cited',
  URL: 'https://example.invalid/fixture-petg.pdf', Locator: 'p. 1: properties', 'Applicable grades': '${grade:main}',
  'Access state': 'retrieved', 'Access note': 'Not applicable', SHA256: sha,
};
const grade = {
  key: 'main', review: reviewed,
  row: {
    MaterialID: 'M020', Role: 'procurement', Status: 'active', Manufacturer: 'Spectrum', 'Product name': 'Fixture PETG',
    'Shared formulation key': 'R-FIXTURE-PETG-TDS', 'Composition / filler': 'Not published', Variant: 'Not applicable',
    'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: 'Fixture only',
    'Certification claims': 'Not published', 'Selected-grade rationale': 'A fixture for the ingest tests',
    SourceID: 'R-FIXTURE-PETG-TDS', 'Source locator': 'p. 1', 'Diameter compatibility': 'Not published',
  },
};
const measurement = (over = {}) => ({
  id: 'm01', gradeKey: 'main', review: reviewed, evidence: { page: 1, line: 3, text: 'Tensile strength (X-Y) ISO 527 52 MPa' },
  row: {
    MaterialID: 'M020', GradeID: 'G020-01', Property: 'Tensile strength (endpoint unspecified)',
    'Raw value': '52 MPa', 'Raw unit': 'MPa', 'Raw numeric': '52', 'Raw uncertainty ±': 'Not applicable',
    'Raw upper bound': 'Not applicable', Operator: '=', 'Conversion factor': '1', 'Normalized value': '52',
    'Normalized uncertainty ±': 'Not applicable', 'Normalized upper bound': 'Not applicable', 'Normalized unit': 'MPa',
    'Data status': 'Published value', 'Specimen type': 'Printed specimen', Direction: 'XY',
    'Moisture condition': 'Not published', 'Moisture state': 'not-stated', 'Post-processing': 'Not published',
    'Post-processing state': 'not-stated', 'Anneal °C': 'Not applicable', 'Anneal h': 'Not applicable',
    'Test temperature': 'Not published', 'Standard / load': 'ISO 527', Standards: 'ISO 527',
    'Test load MPa': 'Not applicable', Notch: 'Not applicable', 'Specimen / print parameters': 'Not published',
    SourceID: 'R-FIXTURE-PETG-TDS', Locator: 'p. 1: Tensile strength (X-Y)', Notes: 'Not applicable',
    'Parse review': 'Not applicable', ...over,
  },
});
const proposal = (over = {}) => ({
  file: 'fixture.json', review: { status: 'reviewed', by: 'the test', date: '2026-09-18' },
  document: { sha256: sha, url: source.URL, pages: 2 },
  source: { row: { ...source }, review: reviewed }, grades: [structuredClone(grade)], measurements: [measurement()],
  ...over,
});

const codes = (p, world = worldOf()) => guard([p].flat(), world).map((x) => x.code);

test('a batch whose every row was read and reviewed is allowed through', () => {
  assert.deepEqual(codes(proposal()), []);
});

test('nothing enters unreviewed, or accepted by nobody', () => {
  assert.ok(codes(proposal({ review: { status: 'proposed' } })).includes('APPLY-UNREVIEWED'));
  const unread = proposal();
  unread.measurements[0].review = { status: 'proposed' };
  assert.ok(codes(unread).includes('APPLY-UNREVIEWED'));
  const anonymous = proposal();
  anonymous.measurements[0].review = { status: 'accepted' };
  assert.ok(codes(anonymous).includes('APPLY-UNREVIEWED'));
});

test('a number that is not printed on the page its locator names stops the batch', () => {
  const wrong = proposal();
  wrong.measurements[0].row['Raw numeric'] = '53';
  wrong.measurements[0].row['Normalized value'] = '53';
  assert.ok(codes(wrong).includes('APPLY-NUMBER-NOT-ON-PAGE'));
  // The page matters as much as the number: 52 MPa is on page 1, not page 2.
  const elsewhere = proposal();
  elsewhere.measurements[0].row.Locator = 'p. 2: Tensile strength (X-Y)';
  assert.ok(codes(elsewhere).includes('APPLY-NUMBER-NOT-ON-PAGE'));
  // A number the extractor split on the page is still on the page.
  const split = proposal();
  split.measurements[0].evidence = { page: 1, line: 7, text: 'Charpy impact strength 2 43 3 .4 ± 79.4 kJ/m2 ISO 179' };
  split.measurements[0].row = { ...split.measurements[0].row, Property: 'Charpy strength', 'Raw value': '2433.4 kJ/m²',
    'Raw unit': 'kJ/m²', 'Raw numeric': '2433.4', 'Normalized value': '2433.4', 'Normalized unit': 'kJ/m²',
    'Raw uncertainty ±': '79.4', 'Normalized uncertainty ±': '79.4', Notch: 'Unnotched', Locator: 'p. 1: Charpy impact strength' };
  assert.deepEqual(codes(split), []);
});

// The review of 2026-09-27 (A01, F06): the page-wide test above passed a 52 MPa row rewritten to 5 MPa, because "52" on
// a page prints a 5. A decision value is bound to its own evidence line, whole (D97).
test("a value its own evidence line does not print stops the batch, however many of its digits are on the page", () => {
  const corrupt = proposal();
  Object.assign(corrupt.measurements[0].row, { 'Raw value': '5 MPa', 'Raw numeric': '5', 'Normalized value': '5' });
  assert.deepEqual(codes(corrupt), ['APPLY-VALUE-NOT-IN-EVIDENCE']);
  // Nor is a digit of another number, or of the standard the line names, a value of the row.
  for (const fragment of ['2', '527', '27']) {
    const wrong = proposal();
    Object.assign(wrong.measurements[0].row, { 'Raw value': `${fragment} MPa`, 'Raw numeric': fragment, 'Normalized value': fragment });
    assert.ok(codes(wrong).includes('APPLY-VALUE-NOT-IN-EVIDENCE'), fragment);
  }
  // A decimal comma, and a row the reviewer read on the page image, still enter.
  const density = proposal();
  density.measurements[0].evidence = { page: 1, line: 3, text: 'Density ISO 1183 1,24 g/cm3' };
  Object.assign(density.measurements[0].row, { Property: 'Density', 'Raw value': '1.24 g/cm3', 'Raw unit': 'g/cm3', 'Raw numeric': '1.24',
    'Conversion factor': '1000', 'Normalized value': '1240', 'Normalized unit': 'kg/m³', Direction: 'Not applicable', 'Standard / load': 'ISO 1183', Standards: 'ISO 1183', Locator: 'p. 1: Density' });
  assert.deepEqual(codes(density), []);
  const seen = proposal();
  seen.measurements[0].evidence = { page: 1, line: 3, text: 'Tensile strength (X-Y)' };
  assert.deepEqual(codes(seen), ['APPLY-VALUE-NOT-IN-EVIDENCE']);
  seen.measurements[0].review = { ...reviewed, visual: 'read on the page image: 52 MPa in the Typical Value column' };
  assert.deepEqual(codes(seen), []);
});

test('a number the line prints once has one role: a value is not also its own test temperature (D97)', () => {
  const hdt = proposal();
  hdt.measurements[0].evidence = { page: 1, line: 5, text: 'Heat deflection temperature ISO 75, 0.45 MPa 68 °C' };
  Object.assign(hdt.measurements[0].row, { Property: 'HDT', 'Raw value': '68 °C', 'Raw unit': '°C', 'Raw numeric': '68', 'Normalized value': '68',
    'Normalized unit': '°C', Direction: 'Not applicable', 'Standard / load': 'ISO 75, 0.45 MPa', Standards: 'ISO 75', 'Test load MPa': '0.45',
    Locator: 'p. 1: Heat deflection temperature' });
  assert.deepEqual(codes(hdt), []);
  hdt.measurements[0].row['Test temperature'] = '68 °C';
  assert.deepEqual(codes(hdt), ['APPLY-CONDITION-ROLE']);
});

test('a batch applied before is not refused after the fact by a rule of today; the audit lists what it finds', () => {
  const world = worldOf();
  const applied = { ...world, sources: [...world.sources, { SourceID: 'R-FIXTURE-PETG-TDS', SHA256: sha, URL: source.URL }] };
  const old = proposal();
  Object.assign(old.measurements[0].row, { 'Raw value': '5 MPa', 'Raw numeric': '5', 'Normalized value': '5' });
  assert.ok(!guard([old], applied).map((x) => x.code).includes('APPLY-VALUE-NOT-IN-EVIDENCE'));
});

test('a locator that names no page, or a page the document does not have, stops the batch', () => {
  const vague = proposal();
  vague.measurements[0].row.Locator = 'the properties table';
  assert.ok(codes(vague).includes('APPLY-LOCATOR'));
  const beyond = proposal();
  beyond.measurements[0].row.Locator = 'p. 9: Tensile strength (X-Y)';
  assert.ok(codes(beyond).includes('APPLY-LOCATOR'));
});

test('a property that is not in the registry, or a unit that is not one of its, stops the batch', () => {
  const unknown = proposal();
  unknown.measurements[0].row.Property = 'Vibrancy';
  assert.ok(codes(unknown).includes('APPLY-PROPERTY'));
  const wrongUnit = proposal();
  wrongUnit.measurements[0].row['Normalized unit'] = '°C';
  assert.ok(codes(wrongUnit).includes('APPLY-UNIT'));
});

test('a document, a product or a formulation already recorded is not recorded twice', () => {
  const world = worldOf();
  const already = { ...world, sources: [...world.sources, { SourceID: 'R-OTHER', SHA256: sha, URL: 'https://example.invalid/other.pdf' }] };
  assert.ok(guard([proposal()], already).map((x) => x.code).includes('APPLY-SHA-DUPLICATE'));

  // A product already recorded under another material is a mis-filing, and is refused. Under the same material it
  // is a second sheet for one product, a revision or a copy, and its rows go on the grade that is already there.
  const misfiled = proposal();
  misfiled.grades[0].row.Manufacturer = 'Polymaker';
  misfiled.grades[0].row['Product name'] = 'PolyLite PETG';
  misfiled.grades[0].row.MaterialID = 'M024';
  assert.ok(codes(misfiled).includes('APPLY-PRODUCT-DUPLICATE'));

  const revision = proposal();
  revision.grades[0].row.Manufacturer = 'Polymaker';
  revision.grades[0].row['Product name'] = 'PolyLite PETG';
  assert.ok(!codes(revision).includes('APPLY-PRODUCT-DUPLICATE'));

  // Any active product's formulation key, borrowed by a product of another material. (A key once named here retired with
  // its grade when m174 put PolyLite PETG's sheets on one grade.)
  const owned = world.grades.find((g) => g.Status === 'active' && g.MaterialID !== 'M024' && g['Shared formulation key']);
  const borrowed = proposal();
  borrowed.grades[0].row['Shared formulation key'] = owned['Shared formulation key'];
  borrowed.grades[0].row.MaterialID = 'M024';
  assert.ok(codes(borrowed).includes('APPLY-KEY'));
});

test('a family entry owns no product, and a material that does not exist needs a ruling', () => {
  const family = proposal();
  family.grades[0].row.MaterialID = 'M047';   // PA, a family entry
  assert.ok(codes(family).includes('APPLY-IDENTITY'));
  const nowhere = proposal();
  nowhere.grades[0].row.MaterialID = 'M998';
  assert.ok(codes(nowhere).includes('APPLY-IDENTITY'));
});

test('a value read by optical character recognition waits for someone to look at the page', () => {
  const scanned = proposal();
  scanned.measurements[0].evidence.ocr = true;
  assert.ok(codes(scanned).includes('APPLY-OCR-UNVERIFIED'));
  scanned.measurements[0].review = { ...reviewed, visual: true };
  assert.deepEqual(codes(scanned), []);
});

test('applying a batch a second time adds nothing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-twice-'));
  try {
    cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
    cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
    const t = openTables(dir);
    const first = writeBatch(t, [proposal()], { migration: 'test', date: '2026-09-18' });
    t.save();
    assert.ok(first.length >= 3, first.join(' | '));

    const again = openTables(dir);
    const second = writeBatch(again, [proposal()], { migration: 'test', date: '2026-09-18' });
    assert.deepEqual(second, [], `a second run wrote ${second.join(', ')}`);
    assert.deepEqual(again.changes(), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('distinct statements and product scopes under one source heading survive admission and remain idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'h2c-evidence-heading-'));
  try {
    cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
    cpSync(join(root, 'schema'), join(dir, 'schema'), { recursive: true });
    const row = { MaterialID: 'M020', GradeID: 'G020-01', Domain: "Makers' know-how", Topic: 'Good for',
      Finding: 'Electronics housings', 'Exposure / conditions': 'Maker intended use only', 'Rating 1–5': 'Not published',
      RubricID: 'Not applicable', 'Evidence type': 'Manufacturer statement', SourceID: source.SourceID, Locator: 'p. 1: Applications' };
    const evidence = [
      { row: { ...row }, review: reviewed },
      { row: { ...row, Finding: 'PCB assembly fixtures' }, review: reviewed },
      { row: { ...row, GradeID: 'G020-02' }, review: reviewed },
      { row: { ...row }, review: reviewed },
    ];
    const p = proposal({ evidence });
    const t = openTables(dir);
    writeBatch(t, [p], { migration: 'test', date: '2026-09-18' });
    t.save();
    const rows = t.rows('evidence').filter(r => r.SourceID === source.SourceID);
    assert.equal(rows.length, 3);
    assert.equal(rows.filter(r => r.GradeID === 'G020-01').length, 2);
    assert.equal(rows.filter(r => r.GradeID === 'G020-02').length, 1);
    const again = openTables(dir);
    assert.deepEqual(writeBatch(again, [p], { migration: 'test', date: '2026-09-18' }), []);
    assert.deepEqual(again.changes(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a batch that writes passes the gate, the lint and the core build', () => {
  const first = rehearse([proposal()], { migration: 'test', date: '2026-09-18' });
  assert.deepEqual(first.gate, [], first.gate.map((i) => i.message).join(' | '));
  assert.deepEqual(first.lint.map((i) => `${i.code} ${i.record}`), []);
  assert.deepEqual(first.build.map((i) => `${i.code} ${i.message}`), []);
  assert.ok(first.log.some((l) => l.startsWith('grade G020-')), first.log.join(' | '));
  assert.ok(first.log.some((l) => l.startsWith('source R-FIXTURE-PETG-TDS')));
  assert.ok(first.log.some((l) => l.startsWith('measurement V')));

  // The source's Applicable grades names the grade the batch allocated, so AUDIT-SOURCE-SCOPE holds.
  assert.ok(!first.log.some((l) => l.includes('${grade:')));
});
