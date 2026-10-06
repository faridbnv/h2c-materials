import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageFromLines, rowFromPlainLine, cellsOfLine } from './text-source.mjs';
import { classify } from './compare.mjs';

// Lines as the text cache holds them: y, spans [{ x, w, str }]. A 5-point character, so a gap over 7.5 points is a column.
const span = (x, str) => ({ x, w: str.length * 5, str });
const line = (y, ...cells) => ({ y, text: cells.map(([, s]) => s).join(' '), spans: cells.map(([x, s]) => span(x, s)) });
const target = (label, value, o = {}) => ({ Kind: 'value', Record: 'V1', Field: 'x', Locator: `p. 1: ${label}`, Value: value, ...o });

test('cells split at gaps wider than 1.5 characters; a header line above gives each column its header', () => {
  const lines = [
    line(700, [50, 'Property'], [250, 'X-Y'], [330, 'Z']),
    line(680, [50, 'Tensile strength'], [250, '37.6'], [330, '26.8']),
  ];
  const page = pageFromLines(1, lines);
  assert.deepEqual(page.rows[1].cells, ['Tensile strength', '37.6', '26.8']);
  assert.deepEqual(page.rows[1].headers, ['', 'X-Y', 'Z']);
  assert.equal(classify(target('Tensile strength', '26.8 MPa'), page, { direction: 'Z' }).outcome, 'pairing-confirmed');
  assert.equal(classify(target('Tensile strength', '37.6 MPa'), page, { direction: 'Z' }).outcome, 'elsewhere');
  assert.equal(classify(target('Tensile strength', '37.6 MPa'), page, {}).outcome, 'row-only');
});

test('two header lines stack: Tensile / X-Y', () => {
  const lines = [
    line(720, [50, 'Property'], [250, 'Dry'], [330, 'Conditioned']),
    line(705, [250, 'X-Y'], [290, 'Z'], [330, 'X-Y']),
    line(680, [50, 'Modulus'], [250, '2.2'], [290, '1.9'], [330, '1.6']),
  ];
  const page = pageFromLines(1, lines);
  const hdr = page.rows.at(-1).headers;
  assert.match(hdr[1], /X-Y/); assert.match(hdr[3], /Conditioned/);
  assert.equal(classify(target('Modulus', '1.6'), page, { direction: 'XY', moistureState: 'conditioned' }).outcome, 'pairing-confirmed');
  assert.notEqual(classify(target('Modulus', '1.6'), page, { direction: 'XY', moistureState: 'dry' }).outcome, 'pairing-confirmed');
});

test('a value on its own baseline attaches to the nearest label line only when it is clearly nearest', () => {
  const lines = [
    line(700, [50, 'Density'], [200, 'ISO 1183']), line(692, [320, '1.24']),
    line(660, [50, 'Melt index'], [200, 'ISO 1133']), line(652, [320, '24.4']),
  ];
  const page = pageFromLines(1, lines);
  assert.equal(classify(target('Density', '1.24'), page).outcome, 'pairing-confirmed');
  assert.notEqual(classify(target('Melt index', '1.24'), page).outcome, 'pairing-confirmed');
  // equidistant: not attached, so nothing is confirmed
  const mid = pageFromLines(1, [line(700, [50, 'Density']), line(690, [320, '1.24']), line(680, [50, 'Melt index'])]);
  assert.notEqual(classify(target('Density', '1.24'), mid).outcome, 'pairing-confirmed');
});

test('a label with its value under it in the same column (stacked)', () => {
  const page = pageFromLines(1, [line(700, [50, 'Printing temperature']), line(686, [50, '210-240 °C']), line(672, [50, 'Heated bed temperature']), line(658, [50, '60-80 °C'])]);
  const g = (field, locator, value) => ({ Kind: 'gate', Field: field, Locator: locator, Value: value });
  assert.equal(classify(g('Nozzle °C', 'p. 1: Printing temperature', '210-240 °C'), page).outcome, 'pairing-confirmed');
  assert.notEqual(classify(g('Nozzle °C', 'p. 1: Printing temperature', '60-80 °C'), page).outcome, 'pairing-confirmed');
  assert.equal(classify(g('Bed °C', 'p. 1: Heated bed temperature', '60-80 °C'), page).outcome, 'pairing-confirmed');
});

test('a standard split from its letter ("A/" then "120") is not a value', () => {
  const page = pageFromLines(1, [line(700, [50, 'Vicat Softening Point A/'], [200, '120']), line(686, [50, '℃'], [90, 'ASTM D-648'], [200, '110'])]);
  assert.notEqual(classify(target('Vicat Softening', '120 ℃'), page).outcome, 'pairing-confirmed');
  assert.equal(classify(target('Vicat Softening', '110 ℃'), page).outcome, 'pairing-confirmed');
});

test('the row label names the other direction: not confirmed', () => {
  const page = pageFromLines(1, [line(700, [50, 'Elongation at break (X-Y)'], [300, '3.0 ± 0.1 %'])]);
  assert.equal(classify(target('Elongation at break (X-Y)', '3.0 ± 0.1 %'), page, { direction: 'XY' }).outcome, 'pairing-confirmed');
  assert.equal(classify(target('Elongation at break (X-Y)', '3.0 ± 0.1 %'), page, { direction: 'Z' }).outcome, 'elsewhere');
});

test('tesseract rows: the label, then each value its own cell, no headers', () => {
  const r = rowFromPlainLine('Tensile strength 37.6 26.8 MPa');
  assert.deepEqual(r.cells.slice(0, 3), ['Tensile strength', '37.6', '26.8 MPa']);
  const range = rowFromPlainLine('Nozzle temperature 190 - 230 °C');
  assert.deepEqual(range.cells, ['Nozzle temperature', '190 - 230 °C']);
});

test('cellsOfLine', () => {
  assert.deepEqual(cellsOfLine(line(1, [0, 'Tensile'], [40, 'strength'], [200, '37.6']), 7.5).map((c) => c.text), ['Tensile strength', '37.6']);
});
