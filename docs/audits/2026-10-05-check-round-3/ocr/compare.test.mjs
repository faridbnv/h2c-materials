import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, stripLatex, valuesIn, parseHeld, numberStyle, containsRun } from './compare.mjs';

// A synthetic stored page: tables as the API gives them, no markdown.
const page = (...tables) => ({ page: 1, markdown: '', tables: tables.map((html, i) => ({ id: `tbl-${i}.html`, html })), lines: [] });
const tgt = (o) => ({ Kind: 'value', Record: 'V1', Field: 'x', Locator: 'p. 1: ' + o.label, Value: o.value, SheetType: o.sheet ?? '', ...(o.extra ?? {}) });
const table = (head, ...rows) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.map((r) => `<tr>${r.map((c) => (typeof c === 'string' ? `<td>${c}</td>` : `<td rowspan="${c.rowspan}">${c.t}</td>`)).join('')}</tr>`).join('')}</table>`;

test('LaTeX is stripped before matching', () => {
  assert.equal(stripLatex('$1.24 \\pm 0.01\\ \\mathrm{g/cm}^{3}$'), '1.24 ± 0.01 g/cm³');
  assert.equal(stripLatex('$60^{\\circ}\\mathrm{C}$ \\times 2 \\%'), '60°C × 2 %');
});

test('a range is one value: both ends in one cell, in order', () => {
  const p = page(table(['Property', 'Value'], ['Nozzle temperature', '190 - 230 °C'], ['Bed temperature', '50 - 60 °C']));
  const t = { Kind: 'gate', Field: 'Nozzle °C', Locator: 'p. 1: Recommended settings: Nozzle temperature', Value: '190~230°C' };
  assert.equal(classify(t, p).outcome, 'pairing-confirmed');
  // the ends in two different cells are not the range
  const q = page(table(['Property', 'Min', 'Max'], ['Nozzle temperature', '190', '230']));
  assert.notEqual(classify(t, q).outcome, 'pairing-confirmed');
  assert.ok(containsRun(valuesIn('190 to 230 °C'), valuesIn('190 - 230')));
  assert.ok(!containsRun(valuesIn('230 - 190'), valuesIn('190 - 230')));
});

test('a ± spread and a parenthesised spread are not values; the first number is', () => {
  assert.deepEqual(valuesIn('2.27 ± 0.05 GPa').map((v) => v.value), [2.27]);
  assert.deepEqual(valuesIn('37.6+/-1.1').map((v) => v.value), [37.6]);
  assert.deepEqual(valuesIn('9.94 (0.24) kJ/m²').map((v) => v.value), [9.94]);
  const p = page(table(['Property', 'Value'], ['Young\'s modulus', '2.27 ± 0.05 GPa']));
  assert.equal(classify(tgt({ label: 'Young\'s modulus', value: '2.27 ± 0.05 GPa' }), p).outcome, 'pairing-confirmed');
  // the spread itself is not the value
  assert.notEqual(classify(tgt({ label: 'Young\'s modulus', value: '0.05 GPa' }), p).outcome, 'pairing-confirmed');
});

test('decimal comma against thousands separator, decided from the page', () => {
  const comma = 'Specific gravity 1,24 g/cm3\nDensity 1,29 g/cm3';
  assert.equal(numberStyle(comma), 'comma');
  assert.deepEqual(valuesIn('1,24 g/cm3', 'comma').map((v) => v.value), [1.24]);
  assert.deepEqual(valuesIn('1,050', 'comma').map((v) => v.value), [1.05]);
  assert.equal(numberStyle('Density 1.24 g/cm3 and modulus 1,050 MPa'), 'dot');
  assert.deepEqual(valuesIn('1,050 MPa', 'dot').map((v) => v.value), [1050]);
  assert.deepEqual(valuesIn('2 270 MPa', 'dot').map((v) => v.value), [2270]);
  const p = page(table(['Property', 'Value'], ['Elongation at break', '10,00 %'], ['Density', '1,29 g/cm3']));
  assert.equal(classify(tgt({ label: 'Elongation at Break', value: '10,00 %' }), p).outcome, 'pairing-confirmed');
  const q = page(table(['Property', 'Value'], ['Tensile modulus', '2,990 MPa'], ['Density', '1.24 g/cm3']));
  assert.equal(classify(tgt({ label: 'Tensile Modulus', value: '2990 MPa' }), q).outcome, 'pairing-confirmed');
});

test('a standard\'s or a test condition\'s number is not the value, so it is never "elsewhere"', () => {
  assert.deepEqual(valuesIn('ISO 527-2 at 50 mm/min, 23 °C, 50 % RH, 2.16 kg').map((v) => v.value), [23]);
  assert.deepEqual(valuesIn('Heat deflection temp. 0.45MPa (as printed) 56.3°C').map((v) => v.value), [56.3]);
  const p = page(table(['Property', 'Test method', 'Value'], ['Tensile strength', 'ISO 527-1 (50 mm/min)', '41 MPa'], ['Flexural modulus', 'ISO 178', '2900 MPa']));
  // 527 / 50 appear only as the standard / the speed: the value 50 is absent, not "elsewhere"
  const r = classify(tgt({ label: 'Flexural modulus', value: '50 MPa' }), p);
  assert.equal(r.outcome, 'absent');
});

test('an X-Y / Z two-column row: the column is chosen by Direction', () => {
  const p = page(table(['Property', 'X-Y', 'Z'], ['Tensile strength', '37.6', '26.8']));
  const t = (value, direction) => classify(tgt({ label: 'Tensile strength', value }), p, { direction });
  assert.equal(t('37.6', 'XY').outcome, 'pairing-confirmed');
  assert.equal(t('26.8', 'Z').outcome, 'pairing-confirmed');
  assert.equal(t('26.8', 'XY').outcome, 'elsewhere');     // the Z value filed as X-Y: the wrong column
  assert.equal(t('37.6', '').outcome, 'row-only');        // no direction: the column cannot be decided
});

test('a multi-product sheet: the column is chosen by the product\'s name in the header', () => {
  const p = page(table(['Property (unit)', 'Onyx', 'Onyx FR', 'Nylon'], ['Tensile Modulus (GPa)', '2.4', '3.0', '1.7']));
  const t = (value, product) => classify(tgt({ label: 'Tensile Modulus (GPa)', value, sheet: 'multi-product' }), p, { product, multi: true });
  assert.equal(t('2.4', 'Onyx').outcome, 'pairing-confirmed');
  assert.equal(t('3.0', 'Onyx FR').outcome, 'pairing-confirmed');
  assert.equal(t('1.7', 'Nylon').outcome, 'pairing-confirmed');
  assert.equal(t('3.0', 'Onyx').outcome, 'elsewhere');
});

test('a rowspan label is carried down to the rows it spans', () => {
  const html = '<table><tr><th>Property</th><th>Direction</th><th>Value</th></tr><tr><td rowspan="2">Tensile strength</td><td>X-Y</td><td>37.6 MPa</td></tr><tr><td>Z</td><td>26.8 MPa</td></tr></table>';
  const p = page(html);
  const r = classify(tgt({ label: 'Tensile strength (Z)', value: '26.8 MPa' }), p, { direction: 'Z' });
  assert.equal(r.outcome, 'pairing-confirmed');
  assert.match(r.matchedRow, /Tensile strength \| Z \| 26.8/);
  // the value of the other row under this label is not confirmed
  assert.equal(classify(tgt({ label: 'Tensile strength (Z)', value: '37.6 MPa' }), p, { direction: 'Z' }).outcome, 'elsewhere');
});

test('outcomes: label-not-found, absent, one-digit, words, no-claim, no-ocr', () => {
  const p = page(table(['Property', 'Value'], ['Density', '1.24 g/cm3'], ['Enclosure', 'not necessary']));
  assert.equal(classify(tgt({ label: 'Glass transition', value: '1.24 g/cm3' }), p).outcome, 'label-not-found');
  assert.equal(classify(tgt({ label: 'Density', value: '1.31 g/cm3' }), p).outcome, 'absent');
  assert.equal(classify({ Kind: 'gate', Field: 'Enclosure', Locator: 'p. 1: Recommended: Enclosure', Value: 'not necessary' }, p).outcome, 'pairing-confirmed');
  assert.equal(classify({ Kind: 'gate', Field: 'Enclosure', Locator: 'p. 1: Recommended: Enclosure', Value: 'required' }, p).outcome, 'absent');
  assert.equal(classify({ Kind: 'gate', Field: 'Chamber °C', Locator: 'p. 1: x', Value: 'Not published' }, p).outcome, 'no-claim');
  assert.equal(classify(tgt({ label: 'Density', value: '1.24' }), null).outcome, 'no-ocr');
  // a one-digit value counts only in its own cell: a "1" printed elsewhere is not "elsewhere"
  const q = page(table(['Property', 'Value'], ['Density', '1.24 g/cm3'], ['Shore hardness', '5']));
  assert.equal(classify(tgt({ label: 'Density', value: '1' }), q).outcome, 'absent');
});

test('a key: value line outside any table', () => {
  const p = { page: 1, markdown: 'Density: 1.24 g/cm³\nGlass transition temp. (Tg) 60 °C', tables: [], lines: [] };
  assert.equal(classify(tgt({ label: 'Density', value: '1.24 g/cm3' }), p).outcome, 'pairing-confirmed');
  assert.equal(classify(tgt({ label: 'Glass transition temp.', value: '60 °C' }), p).outcome, 'pairing-confirmed');
});

test('parseHeld: kinds', () => {
  assert.equal(parseHeld('Not published').kind, 'none');
  assert.equal(parseHeld('not necessary').kind, 'words');
  assert.deepEqual(parseHeld('60°C/6H').numbers.map((n) => n.value), [60, 6]);
});
