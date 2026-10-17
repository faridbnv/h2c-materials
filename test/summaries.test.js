// Written summaries (D142): a material's paragraph states no number by hand. Every number is a placeholder the build
// fills from the material's compiled values (build/src/written.js), a placeholder it cannot fill stops the build, and the
// lint finds a number typed outside a placeholder (SUMMARY-NUMBER, build/src/lint-rules.js). This guards the fill, its
// refusals, the lint's reading of a summary, and that the compiled database holds what the fill gives for the real rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { fillContext, fillField, fillSummary, attachWritten, indexForFill, COUNT_FIELDS, HEADLINE_PARTS } from '../build/src/written.js';
import { lintData, summaryNames, summaryNumbers } from '../build/src/lint-rules.js';
import { RULES } from '../build/src/rules.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- a small synthetic database
const registry = {
  headlines: [
    { key: 'hdt045', unit: '°C', labels: { plain: 'HDT at 0.45 MPa' } },
    { key: 'tensile', unit: 'MPa', labels: { plain: 'Tensile strength' } },
    { key: 'elong', unit: '%', labels: { plain: 'Elongation at break' } },
    { key: 'flexMod', unit: 'GPa', labels: { plain: 'Flexural modulus' } },
    { key: 'impact', unit: 'kJ/m²', labels: { plain: 'Impact strength' } },
    { key: 'glassT', unit: '°C', labels: { plain: 'Glass transition' } },
    { key: 'price', unit: 'CAD/kg', labels: { plain: 'Price' } },
  ],
};
const grade = (id, materialId, manufacturer, product, extra = {}) => ({ id, materialId, manufacturer, product, retired: false, ...extra });
const grades = [
  grade('G1-01', 'M1', 'Acme', 'Acme PLA'),
  grade('G1-02', 'M1', 'Acme', 'Super PLA'),
  grade('G1-03', 'M1', 'Beta', 'Old PLA', { retired: true }),
  grade('G1-R1', 'M1', 'Gamma', 'Reference PLA'),
  grade('G1-04', 'M1', 'Not published', 'Plain PLA'),
  grade('G1-05', 'M1', 'Beta', 'Beta Bright PLA'),
  grade('G2-01', 'M2', 'Acme', 'Acme Family'),
];
const measurements = [
  { id: 'V1', materialId: 'M1', numeric: true }, { id: 'V2', materialId: 'M1', numeric: true }, { id: 'V3', materialId: 'M1', numeric: true },
  { id: 'V4', materialId: 'M1', numeric: false }, { id: 'V5', materialId: 'M2', numeric: true },
];
const profiles = [
  { id: 'P1', materialId: 'M1', retired: false }, { id: 'P2', materialId: 'M1', retired: false },
  { id: 'P3', materialId: 'M1', retired: true }, { id: 'P4', materialId: 'M2', retired: false },
];
const spread = (extra) => ({ n: 5, products: 6, min: 50, q1: 55, median: 60, q3: 70, max: 80, typical: 'G1-02', ...extra });
const m1 = () => ({
  id: 'M1', name: 'PLA', familyEntry: false,
  summary: {
    hdt045: spread(),
    tensile: { n: 2, products: 2, min: 40, median: 45, max: 50, typical: 'G1-01' },
    elong: spread({ min: 2, median: 5, max: 500, q1: 3, q3: 9, bounds: { min: 'upper', max: 'lower' } }),
    flexMod: spread({ min: 2, median: 3, max: 4, q1: 2.5, q3: 3.5, typical: 'G1-01' }),
    impact: { n: 0, products: 3 },
    glassT: spread({ min: 55, median: 58, max: 61 }),
    price: spread({ min: 20, median: 25, max: 40, q1: 22, q3: 30, typical: 'G1-01' }),
  },
  headline: {
    hdt045: { value: 60, typical: { value: 60, interval: { lo: 60, hi: 60 } } },
    flexMod: { value: 3, typical: { value: 3, interval: { lo: 3, hi: null, openLow: true } } },
    glassT: { notApplicable: true },
  },
});
const m2 = () => ({ id: 'M2', name: 'Family', familyEntry: true, summary: {}, headline: {} });
const fcFor = (m) => fillContext(m, indexForFill({ grades, measurements, profiles }), registry);
const fc = () => fcFor(m1());
const field = (f, c = fc()) => fillField(f, c);

// ---- counts and names
test('the counts are the material\'s live products, their distinct makers, its numeric values and its live profiles', () => {
  const c = fc();
  assert.deepEqual(COUNT_FIELDS, ['products', 'makers', 'values', 'profiles']);
  // G1-01, G1-02, G1-04, G1-05: the retired G1-03 and the reference G1-R1 are not products.
  assert.deepEqual(field('products', c), { parts: [{ field: 'products', value: 4 }] });
  // Acme and Beta; "Not published" is no maker.
  assert.deepEqual(field('makers', c), { parts: [{ field: 'makers', value: 2 }] });
  assert.deepEqual(field('values', c), { parts: [{ field: 'values', value: 3 }] });
  assert.deepEqual(field('profiles', c), { parts: [{ field: 'profiles', value: 2 }] });
});

test('a material with no records counts zero', () => {
  const empty = fcFor({ id: 'M9', name: 'Empty', summary: {}, headline: {} });
  for (const f of COUNT_FIELDS) assert.deepEqual(field(f, empty), { parts: [{ field: f, value: 0 }] });
});

test('{name} is the material\'s name, as text', () => {
  assert.deepEqual(field('name'), { parts: [{ text: 'PLA' }] });
});

// ---- headline parts
test('median, min and max carry the headline\'s unit', () => {
  assert.deepEqual(field('hdt045.median'), { parts: [{ field: 'hdt045.median', value: 60, unit: '°C' }] });
  assert.deepEqual(field('hdt045.min'), { parts: [{ field: 'hdt045.min', value: 50, unit: '°C' }] });
  assert.deepEqual(field('hdt045.max'), { parts: [{ field: 'hdt045.max', value: 80, unit: '°C' }] });
});

test('the quartiles carry the unit when the summary has them', () => {
  assert.deepEqual(field('hdt045.q1'), { parts: [{ field: 'hdt045.q1', value: 55, unit: '°C' }] });
  assert.deepEqual(field('hdt045.q3'), { parts: [{ field: 'hdt045.q3', value: 70, unit: '°C' }] });
});

test('the range is its lowest, a dash and its highest, with the unit on the last number only', () => {
  assert.deepEqual(field('hdt045.range'), {
    parts: [{ field: 'hdt045.min', value: 50 }, { text: '–' }, { field: 'hdt045.max', value: 80, unit: '°C' }],
  });
});

test('{key.n} and {key.products} are counts with no unit', () => {
  assert.deepEqual(field('hdt045.n'), { parts: [{ field: 'hdt045.n', value: 5 }] });
  assert.deepEqual(field('hdt045.products'), { parts: [{ field: 'hdt045.products', value: 6 }] });
});

test('{key.typical} names the typical product, the maker once when the product name starts with it', () => {
  assert.deepEqual(field('hdt045.typical'), { parts: [{ text: 'Acme Super PLA' }] });
  assert.deepEqual(field('flexMod.typical'), { parts: [{ text: 'Acme PLA' }] });
});

test('a typical product that is not in the database is refused', () => {
  const m = m1();
  m.summary.hdt045.typical = 'G9-99';
  assert.match(field('hdt045.typical', fcFor(m)).refused, /G9-99/);
});

test('{key.label} is the headline\'s plain name, even where no product publishes it', () => {
  assert.deepEqual(field('hdt045.label'), { parts: [{ text: 'HDT at 0.45 MPa' }] });
  assert.deepEqual(field('impact.label'), { parts: [{ text: 'Impact strength' }] });
  assert.deepEqual(field('glassT.label'), { parts: [{ text: 'Glass transition' }] });
});

test('the price is a headline like any other, in its own unit', () => {
  assert.deepEqual(field('price.median'), { parts: [{ field: 'price.median', value: 25, unit: 'CAD/kg' }] });
  assert.deepEqual(field('price.range').parts.at(-1), { field: 'price.max', value: 40, unit: 'CAD/kg' });
});

test('every part a summary may ask of a headline is filled for a headline with a full spread', () => {
  for (const part of HEADLINE_PARTS) {
    const f = field(`hdt045.${part}`);
    assert.equal(f.refused, undefined, part);
    assert.ok(f.parts.length >= 1, part);
  }
});

test('whitespace inside the braces is trimmed', () => {
  const { parts, refusals } = fillSummary('Median { hdt045.median } and { name }.', fc());
  assert.deepEqual(refusals, []);
  assert.deepEqual(parts, [{ text: 'Median ' }, { field: 'hdt045.median', value: 60, unit: '°C' }, { text: ' and PLA.' }]);
});

// ---- bounds
test('a median is a bound only where the typical product\'s value is the median and that value is one-sided', () => {
  const median = (interval, value = 3) => {
    const m = m1();
    m.headline.flexMod = { value: 3, typical: { value, interval } };
    return field('flexMod.median', fcFor(m)).parts[0];
  };
  assert.equal(median({ lo: 3, hi: null, openLow: true }).bound, '>');
  assert.equal(median({ lo: 3, hi: null }).bound, '≥');
  assert.equal(median({ lo: null, hi: 3, openHigh: true }).bound, '<');
  assert.equal(median({ lo: null, hi: 3 }).bound, '≤');
  assert.equal('bound' in median({ lo: 3, hi: 3 }), false, 'a two-sided interval is no bound');
  assert.equal('bound' in median({ lo: 3, hi: null, openLow: true }, 2.5), false, 'the typical product\'s value is not the headline\'s');
  assert.equal('bound' in median(null), false, 'no interval, no bound');
});

test('a minimum or maximum is a bound where the summary says its end is a lower or an upper limit', () => {
  assert.deepEqual(field('elong.max'), { parts: [{ field: 'elong.max', value: 500, unit: '%', bound: '>' }] });
  assert.deepEqual(field('elong.min'), { parts: [{ field: 'elong.min', value: 2, unit: '%', bound: '<' }] });
  assert.equal('bound' in field('hdt045.max').parts[0], false);
});

test('the range carries the bounds of its two ends on its two numbers', () => {
  assert.deepEqual(field('elong.range'), {
    parts: [{ field: 'elong.min', value: 2, bound: '<' }, { text: '–' }, { field: 'elong.max', value: 500, unit: '%', bound: '>' }],
  });
});

// ---- refusals
test('a field the build does not know is refused', () => {
  for (const f of ['bogus', 'hdt0450.median', 'material', 'products.median']) assert.match(field(f).refused ?? '', /\{/, f);
});

test('a known headline with an unknown part is refused', () => {
  assert.match(field('hdt045.foo').refused, /hdt045/);
  assert.match(field('hdt045').refused, /hdt045/, 'a headline with no part at all');
});

test('a headline that none of the products publishes is refused, except its label', () => {
  assert.match(field('impact.median').refused, /Impact strength/);
  const m = m1();
  delete m.summary.tensile;
  assert.match(field('tensile.median', fcFor(m)).refused, /Tensile strength/, 'no summary at all');
});

test('a headline that does not apply to the material is refused', () => {
  assert.match(field('glassT.median').refused, /does not apply to PLA/);
});

test('quartiles of fewer than four products are refused', () => {
  assert.match(field('tensile.q1').refused, /four products/);
  assert.match(field('tensile.q3').refused, /four products/);
  assert.equal(field('tensile.median').refused, undefined, 'its median is still filled');
});

test('a stray or doubled brace, a lone brace and an empty placeholder are refused', () => {
  for (const text of ['Made of {{products}} products.', 'A lone { brace.', 'A lone } brace.', 'Nothing in {} here.', 'Open {products and close', '{products}} extra']) {
    const { refusals } = fillSummary(text, fc());
    assert.ok(refusals.length >= 1, text);
  }
});

test('a well-formed placeholder refused for its reason leaves the others filled and the sentence stands', () => {
  const { parts, refusals } = fillSummary('{products} products, {bogus} unknown.', fc());
  assert.equal(refusals.length, 1);
  assert.deepEqual(parts[0], { field: 'products', value: 4 });
});

// ---- reassembly
test('adjacent text is merged, so the parts read as the sentence does', () => {
  const { parts, refusals } = fillSummary('{name} is sold by {makers} makers; HDT {hdt045.range} (typically {hdt045.typical}, {hdt045.label}).', fc());
  assert.deepEqual(refusals, []);
  assert.deepEqual(parts, [
    { text: 'PLA is sold by ' }, { field: 'makers', value: 2 }, { text: ' makers; HDT ' },
    { field: 'hdt045.min', value: 50 }, { text: '–' }, { field: 'hdt045.max', value: 80, unit: '°C' },
    { text: ' (typically Acme Super PLA, HDT at 0.45 MPa).' },
  ]);
  for (let i = 1; i < parts.length; i++) assert.ok(!(parts[i].text != null && parts[i - 1].text != null), 'no two text parts in a row');
  const sentence = parts.map((p) => (p.text != null ? p.text : `${p.value}${p.unit ? ' ' + p.unit : ''}`)).join('');
  assert.equal(sentence, 'PLA is sold by 2 makers; HDT 50–80 °C (typically Acme Super PLA, HDT at 0.45 MPa).');
});

test('text with no placeholder is one text part, and an empty summary has no parts', () => {
  assert.deepEqual(fillSummary('Plain words.', fc()), { parts: [{ text: 'Plain words.' }], refusals: [] });
  assert.deepEqual(fillSummary('', fc()), { parts: [], refusals: [] });
});

test('a name placeholder next to words joins them into one text part', () => {
  assert.deepEqual(fillSummary('{name} filament', fc()).parts, [{ text: 'PLA filament' }]);
});

// ---- attachWritten
const row = (MaterialID, Summary, extra = {}) => ({ MaterialID, Summary, 'Written by': 'Claude', 'Written on': '2026-10-17', 'Review status': 'draft', Notes: null, ...extra });
const attach = (rows, mats = [m1(), m2()]) => {
  const issues = [];
  attachWritten(mats, rows, { grades, measurements, profiles, registry, issues });
  return { mats, issues };
};

test('a row gives its material a written summary with who wrote it, when, its status and its parts', () => {
  const { mats, issues } = attach([row('M1', 'There are {products} products.')]);
  assert.deepEqual(issues, []);
  assert.deepEqual(mats[0].written, {
    by: 'Claude', on: '2026-10-17', status: 'draft',
    parts: [{ text: 'There are ' }, { field: 'products', value: 4 }, { text: ' products.' }],
  });
});

test('a material with no row gets no written key at all', () => {
  const { mats } = attach([row('M1', 'Words.')]);
  assert.equal('written' in mats[1], false);
  const none = attach([row('M3', 'Words.')], [m1()]);
  assert.equal('written' in none.mats[0], false);
});

test('an empty or missing list of rows does nothing', () => {
  for (const rows of [[], undefined, null]) {
    const { mats, issues } = attach(rows);
    assert.deepEqual(issues, []);
    assert.equal(mats.some((m) => 'written' in m), false);
  }
});

test('a placeholder the material cannot fill is an error naming the material and the Summary field, and the material gets no written', () => {
  const { mats, issues } = attach([row('M1', 'HDT {hdt045.median}; impact {impact.median}; {bogus}.')]);
  assert.equal(issues.length, 2);
  for (const i of issues) {
    assert.equal(i.level, 'error');
    assert.equal(i.code, 'SUMMARY-PLACEHOLDER');
    assert.equal(i.table, 'material_summaries');
    assert.equal(i.record, 'M1');
    assert.equal(i.field, 'Summary');
    assert.match(i.message, /PLA/);
  }
  assert.equal('written' in mats[0], false);
});

test('a row on a family entry, or on no material, is an error on its MaterialID', () => {
  for (const [id, text] of [['M2', /family entry/], ['M404', /no such material/]]) {
    const { issues, mats } = attach([row(id, 'Words.')]);
    assert.equal(issues.length, 1, id);
    assert.deepEqual({ level: issues[0].level, code: issues[0].code, table: issues[0].table, record: issues[0].record, field: issues[0].field },
      { level: 'error', code: 'SUMMARY-PLACEHOLDER', table: 'material_summaries', record: id, field: 'MaterialID' });
    assert.match(issues[0].message, text);
    assert.equal(mats.some((m) => 'written' in m), false);
  }
});

test('one refused row does not stop the next', () => {
  const { mats, issues } = attach([row('M1', '{bogus}'), row('M2', 'Words.')]);
  assert.equal(issues.length, 2);
  assert.equal('written' in mats[0], false);
});

// ---- the catalogue
test('a placeholder the build cannot fill stops the build; a hand-typed number is only a lint finding', () => {
  assert.equal(RULES['SUMMARY-PLACEHOLDER'].level, 'error');
  assert.equal(RULES['SUMMARY-NUMBER'].level, 'lint');
});

// ---- the lint's reading of a summary
const tables = {
  materials: { header: [], rows: [
    { 'Original name': 'TPU 95A', Abbreviation: 'TPU', 'Full name': 'Thermoplastic polyurethane', 'Base polymer': 'TPU' },
    { 'Original name': 'PA6-CF', Abbreviation: 'PA6-CF', 'Full name': 'Carbon-fibre PA6', 'Base polymer': 'PA6' },
  ] },
  grades: { header: [], rows: [
    { 'Product name': 'ECOMAX PLA', Manufacturer: '3DXTECH' },
    { 'Product name': 'PLA 1.75mm', Manufacturer: 'Not published' },
  ] },
};
const names = summaryNames(tables);

test('the names that may carry figures come from the fixed list and the tables', () => {
  assert.ok(names instanceof RegExp);
  for (const n of ['H2C', 'AMS 2 Pro', '3D', 'TPU 95A', '95A', '3DXTECH', 'PA6-CF']) assert.ok(new RegExp(names.source, 'i').test(n), n);
});

test('the numbers typed by hand are found, and nothing else is', () => {
  const cases = [
    // hand-typed figures
    ['Holds 240 °C in the nozzle.', ['240 °C']],
    ['Tested at 0.45 MPa.', ['0.45 MPa']],
    ['A density of 1,200 kg/m³.', ['1,200 kg/m³']],
    ['Dry it for 6 h first.', ['6 h']],
    ['About 30 % glass.', ['30 %']],
    ['The GF30 grade.', ['GF30']],
    ['Written in 2026.', ['2026']],
    // counts of records in words
    ['Sold by three makers.', ['three makers']],
    ['Two of its products are reinforced.', ['Two of its products']],
    ['It rests on twenty published values.', ['twenty published values']],
    ['Only one product publishes it.', ['one product']],
    // placeholders, standards, names and the like are not numbers
    ['Median {hdt045.median} across {products} products.', []],
    ['Tested to ISO 527-2/1A and ISO 179-1/1eA.', []],
    ['Tested to ASTM D638.', []],
    ['Rated UL 94 V-0.', []],
    ['Antistatic to IEC 61340-5-1.', []],
    ['Terms follow ISO/ASTM 52900.', []],
    ['PA6, PA12 and PA6T are polyamides.', []],
    // A material whose Base polymer is "PA6" must not leave the "/66" of PA6/66 behind as a number.
    ['PA6/66 is a copolymer.', []],
    ['Printed on the H2C with the AMS 2 Pro or the AMS HT.', []],
    ['Good for 3D printing.', []],
    ['One of the most common filaments.', []],
    ['Words with no figure.', []],
    ['', []],
    // names given in the tables
    ['TPU 95A is soft.', []],
    ['3DXTECH sells ECOMAX PLA.', []],
    ['PA6-CF is stiff.', []],
    // a product word that is only a number with a unit does not exempt that figure in prose
    ['It comes as 1.75 mm filament.', ['1.75 mm']],
    ['PLA 1.75mm is sold as 1.75 mm.', ['1.75 mm']],
  ];
  for (const [text, expected] of cases) assert.deepEqual(summaryNumbers(text, names), expected, JSON.stringify(text));
});

test('a polyamide copolymer by its types is not a number where the tables name no PA6', () => {
  assert.deepEqual(summaryNumbers('PA6/66 and PA12 and PA6T.', summaryNames({})), []);
});

test('summaryNumbers reads a missing text as empty', () => {
  assert.deepEqual(summaryNumbers(undefined, names), []);
  assert.deepEqual(summaryNumbers(null, names), []);
});

const lint = (summaryRows, extra = {}) => lintData(
  { material_summaries: { header: ['MaterialID', 'Summary'], rows: summaryRows }, ...tables, ...extra },
  { material_summaries: { primaryKey: 'MaterialID' } },
);

test('a summary with a hand-typed number is a SUMMARY-NUMBER finding naming the token; a clean one is not', () => {
  const found = lint([{ MaterialID: 'M1', Summary: 'It softens near 240 °C.' }, { MaterialID: 'M2', Summary: 'It softens near {hdt045.median}.' }]);
  const hits = found.filter((f) => f.code === 'SUMMARY-NUMBER');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].level, 'lint');
  assert.equal(hits[0].table, 'material_summaries');
  assert.equal(hits[0].record, 'M1');
  assert.equal(hits[0].field, 'Summary');
  assert.match(hits[0].message, /240 °C/);
});

test('every hand-typed token is named in the one finding of a row', () => {
  const [hit] = lint([{ MaterialID: 'M1', Summary: 'Three makers sell it at 240 °C.' }]).filter((f) => f.code === 'SUMMARY-NUMBER');
  assert.match(hit.message, /240 °C/);
  assert.match(hit.message, /Three makers/);
});

test('no summaries, no finding', () => {
  assert.deepEqual(lint([]).filter((f) => f.code === 'SUMMARY-NUMBER'), []);
  assert.deepEqual(lintData({}, {}).filter((f) => f.code === 'SUMMARY-NUMBER'), []);
});

test('a summary cell with two spaces in a row is a TEXT-SPACING finding', () => {
  const found = lint([{ MaterialID: 'M1', Summary: 'Two  spaces.' }, { MaterialID: 'M2', Summary: 'One space.' }]).filter((f) => f.code === 'TEXT-SPACING');
  assert.equal(found.length, 1);
  assert.equal(found[0].table, 'material_summaries');
  assert.equal(found[0].record, 'M1');
  assert.equal(found[0].field, 'Summary');
});

// ---- the real data
test('each real summary fills without a refusal into the parts the compiled database holds, and a material without a row has none', () => {
  const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  const rows = readCsv(join(root, 'data/tables/material_summaries.csv')).records.map((r) => r.values);
  const ix = indexForFill(db);
  const byId = new Map(db.materials.map((m) => [m.id, m]));
  const withRow = new Set(rows.map((r) => r.MaterialID));
  for (const r of rows) {
    const m = byId.get(r.MaterialID);
    assert.ok(m, `${r.MaterialID} is a material`);
    assert.ok(!m.familyEntry, `${r.MaterialID} is not a family entry`);
    const { parts, refusals } = fillSummary(r.Summary ?? '', fillContext(m, ix, db.registry));
    assert.deepEqual(refusals, [], r.MaterialID);
    assert.deepEqual(m.written?.parts, parts, `${r.MaterialID}: the database holds what the fill gives`);
    assert.deepEqual({ by: m.written.by, on: m.written.on, status: m.written.status }, { by: r['Written by'], on: r['Written on'], status: r['Review status'] }, r.MaterialID);
  }
  for (const m of db.materials) if (!withRow.has(m.id)) assert.equal('written' in m, false, `${m.id} has no row and no written summary`);
});
