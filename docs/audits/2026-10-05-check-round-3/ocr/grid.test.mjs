import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlTableToGrid, gridLines } from './grid.mjs';

test('a plain table: header from th, body from td', () => {
  const g = htmlTableToGrid('<table><tr><th>Property</th><th>Value</th></tr><tr><td>Density</td><td>1.24</td></tr></table>');
  assert.deepEqual(g.grid, [['Property', 'Value'], ['Density', '1.24']]);
  assert.equal(g.headerRows, 1);
  assert.deepEqual(g.headers, ['Property', 'Value']);
  assert.deepEqual(g.body, [['Density', '1.24']]);
});

test('rowspan: the label is carried down to every row it spans', () => {
  const g = htmlTableToGrid('<table><tr><th>Property</th><th>Direction</th><th>Value</th></tr><tr><td rowspan="2">Tensile strength</td><td>X-Y</td><td>37.6</td></tr><tr><td>Z</td><td>26.8</td></tr></table>');
  assert.deepEqual(g.body, [['Tensile strength', 'X-Y', '37.6'], ['Tensile strength', 'Z', '26.8']]);
  assert.equal(g.spanned[2][0], true);
  assert.equal(g.spanned[1][0], false);
});

test('colspan: the cell fills its columns and is marked as a copy after the first', () => {
  const g = htmlTableToGrid('<table><tr><th>Property</th><th colspan="2">Dry</th></tr><tr><td>Modulus</td><td colspan="2">2270</td></tr></table>');
  assert.deepEqual(g.grid[0], ['Property', 'Dry', 'Dry']);
  assert.deepEqual(g.grid[1], ['Modulus', '2270', '2270']);
  assert.deepEqual(g.spanned[1], [false, false, true]);
});

test('stacked headers: two header rows are joined per column with " / "', () => {
  const g = htmlTableToGrid('<table><thead><tr><th rowspan="2">Property</th><th colspan="2">Tensile</th></tr><tr><th>X-Y</th><th>Z</th></tr></thead><tbody><tr><td>Strength</td><td>37.6</td><td>26.8</td></tr></tbody></table>');
  assert.equal(g.headerRows, 2);
  assert.deepEqual(g.headers, ['Property', 'Tensile / X-Y', 'Tensile / Z']);
  assert.deepEqual(g.body, [['Strength', '37.6', '26.8']]);
});

test('an empty cell stays empty and the grid stays rectangular', () => {
  const g = htmlTableToGrid('<table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>x</td><td></td></tr></table>');
  assert.deepEqual(g.grid, [['A', 'B', 'C'], ['x', '', '']]);
  assert.equal(g.width, 3);
});

test('entities and line breaks inside a cell', () => {
  const g = htmlTableToGrid('<table><tr><td>Density<br/>(g/cm&sup3;)</td><td>1.24&nbsp;&plusmn; 0.01</td></tr></table>');
  assert.deepEqual(g.grid[0], ['Density (g/cm³)', '1.24 ± 0.01']);
});

test('no th: the first row is the header only when it holds no digit', () => {
  const a = htmlTableToGrid('<table><tr><td>Property</td><td>Value</td></tr><tr><td>Density</td><td>1.24</td></tr></table>');
  assert.equal(a.headerRows, 1);
  const b = htmlTableToGrid('<table><tr><td>Density</td><td>1.24</td></tr><tr><td>Tg</td><td>60</td></tr></table>');
  assert.equal(b.headerRows, 0);
  assert.deepEqual(gridLines(b), ['Density | 1.24', 'Tg | 60']);
});
