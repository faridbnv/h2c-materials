// Reading a source document: lines, columns, the squeezed page a guard matches numbers against, and the cache.
// The fixture is a data sheet written by hand (test/fixtures/ingest/fixture-tds.pdf), so the test owns every glyph
// on it: a three-column table, a decimal comma, a number the extractor splits, and a rate that is not a result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentText, cachedText, sha256, pageLines, pdfPages, lineCells, cellsAt, columnPositions, joinDigits, numberOnPage, statementRe, allLines } from '../scripts/lib/pdf-text.mjs';

const fixture = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/ingest/fixture-tds.pdf');
const bytes = readFileSync(fixture);
const text = await documentText(bytes, { refresh: true });

test('a document reads into pages of lines, top down and left to right', () => {
  assert.equal(text.pages.length, 2);
  assert.deepEqual(text.pages[0].lines.map((l) => l.text), [
    'Fixture Filament Technical Data Sheet',
    'Property Testing Method Typical Value',
    'Density ISO 1183 1,24 g/cm3',
    'Tensile strength (X-Y) ISO 527 52 MPa',
    'Heat deflection temperature ISO 75, 0.45 MPa 68 °C',
    'Melting temperature DSC, 10 °C/min 160 °C',
    'Charpy impact strength 2 43 3 .4 ± 79.4 kJ/m2 ISO 179',
    'Shore D Hardness 43 ISO 868',
  ]);
});

test('a table reads as columns, so a property, its method and its value stay apart', () => {
  const table = text.pages[0].lines.slice(1, 5);
  const columns = columnPositions(table);
  assert.equal(columns.length, 3);
  assert.deepEqual(table.map((l) => cellsAt(l, columns).map((c) => c.text)), [
    ['Property', 'Testing Method', 'Typical Value'],
    ['Density', 'ISO 1183', '1,24 g/cm3'],
    ['Tensile strength (X-Y)', 'ISO 527', '52 MPa'],
    ['Heat deflection temperature', 'ISO 75, 0.45 MPa', '68 °C'],
  ]);
  // Reading that row as one line is what left 133 measurements holding a fragment of the column beside them:
  // "Heat deflection temperature | ISO 75, 0.45 MPa" read straight across gives neither the property nor the method.
  const flat = text.pages[0].lines[4].text;
  assert.match(flat, /Heat deflection temperature ISO 75/);
});

test('a line outside a table keeps its own words', () => {
  assert.deepEqual(lineCells(text.pages[0].lines[0]).map((c) => c.text), ['Fixture Filament Technical Data Sheet']);
});

test('a number the extractor split is joined before it is read, and a standard is not a value', () => {
  assert.equal(joinDigits('Charpy impact strength 2 43 3 .4 kJ/m2'), 'Charpy impact strength 2433.4 kJ/m2');
  assert.equal(joinDigits('Heat deflection ISO 75 0.45 MPa'), 'Heat deflection  §  0.45 MPa');
});

test('the squeezed page answers whether a number is printed on it, however the layout split it', () => {
  assert.equal(numberOnPage(text, 1, '2433.4'), true);   // printed as "2 43 3 .4"
  assert.equal(numberOnPage(text, 1, '1.24'), true);     // printed with a decimal comma
  assert.equal(numberOnPage(text, 1, '99'), false);
  assert.equal(numberOnPage(text, 9, '52'), false);      // no such page
});

test('a rate and a humidity are conditions, not results', () => {
  const found = allLines(text).flatMap(({ text: line }) => [...joinDigits(line).matchAll(statementRe())].map((m) => `${m[1]}${m[3]}`));
  assert.ok(found.includes('52MPa'), found.join(' '));
  assert.ok(!found.includes('10°C'), 'a 10 °C/min heating rate is not a result');
  assert.ok(!found.includes('20%'), 'a 20% RH storage limit is not a result');
});

test('the text is cached by digest, and a second read comes from the cache', () => {
  const sha = sha256(bytes);
  assert.equal(text.sha, sha);
  const again = cachedText(sha);
  assert.deepEqual(again.pages.map((p) => p.lines.length), text.pages.map((p) => p.lines.length));
});

test('lines are rebuilt from spans, so a caller may read a document without the cache', async () => {
  const pages = await pdfPages(bytes);
  assert.deepEqual(pageLines(pages[0].spans).map((l) => l.text), text.pages[0].lines.map((l) => l.text));
});
