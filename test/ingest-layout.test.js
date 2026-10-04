// A page's reading order (scripts/lib/pdf-layout.mjs) and what reading the sheet in that order adds. The CI has no
// document cache, so the pages here are fixtures: a trimmed page of purefil's LCP sheet, the hand-written TDS, and
// tables built in the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { documentText } from '../scripts/lib/pdf-text.mjs';
import { readingOrder, withReadingOrder } from '../scripts/lib/pdf-layout.mjs';
import { readSheet } from '../scripts/ingest/propose.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = new Map(readCsv(join(root, 'data/tables/properties.csv')).records.map((r) => [r.values.Property, r.values]));
const lcp = JSON.parse(readFileSync(join(root, 'test/fixtures/ingest/purefil-lcp-p1.json'), 'utf8'));
const tds = await documentText(readFileSync(join(root, 'test/fixtures/ingest/fixture-tds.pdf')), { refresh: true });

// A page of rows the way pageLines would cache it: [y, [x, text]...], every piece five units a character.
const page = (rows) => ({
  page: 1,
  lines: rows.map(([y, ...cells]) => {
    const spans = cells.map(([x, str]) => ({ x, w: str.length * 5, str }));
    return { y, x0: spans[0].x, x1: spans.at(-1).x + spans.at(-1).w, text: spans.map((s) => s.str).join(' '), spans };
  }),
  squeezed: '',
});
const sheet = (p) => ({ extractor: 'pdfjs-dist test', pages: [p] });
const raws = (read, field) => read.settings.filter((s) => s.field === field).map((s) => s.raw);

test('the processing table and the property table beside it are two blocks, each read top to bottom', () => {
  const { blocks, lines, pairs } = readingOrder(lcp.pages[0]);
  assert.equal(blocks.length, 2);
  const left = lines.filter((l) => l.block === 0).map((l) => l.text);
  assert.deepEqual(left.slice(0, 4), ['Printing temperature', '280-300 °C', 'Heated bed temperature', '120-150 °C']);
  assert.deepEqual(left.slice(-2), ['Drying time', '4-6 h']);
  assert.ok(lines.filter((l) => l.block === 1).every((l) => l.x0 >= 300));
  assert.equal(lines.length, lcp.pages[0].lines.length);
  assert.deepEqual(pairs.filter((p) => p.mode === 'under-label').map((p) => [p.label, p.value]).slice(0, 2), [['Printing temperature', '280-300 °C'], ['Heated bed temperature', '120-150 °C']]);
  assert.ok(pairs.some((p) => p.mode === 'same-row' && p.label === 'Yield stress (ISO 527-2/1A)' && p.value === '200 MPa'));
});

test('withReadingOrder keeps the shape of documentText and the squeezed page', () => {
  const ordered = withReadingOrder(lcp);
  assert.equal(ordered.pages[0].squeezed, lcp.pages[0].squeezed);
  assert.equal(ordered.pages[0].blocks.length, 2);
  assert.deepEqual(Object.keys(ordered.pages[0].lines[0]).sort(), [...Object.keys(lcp.pages[0].lines[0]), 'block'].sort());
  // Text that is not a PDF's (a web page's rows) has no columns to find and is returned as it is.
  const web = { extractor: 'html/tables v4', pages: lcp.pages };
  assert.equal(withReadingOrder(web), web);
});

test('the reader gains what a page that stretches one column past the other prints, and only with the layout on', () => {
  // The left column's rows are spread twice as far apart, so a label and its value have the right column's rows
  // between them and no neighbouring line holds the value.
  const stretched = JSON.parse(JSON.stringify(lcp));
  for (const l of stretched.pages[0].lines) if (l.x0 < 200) l.y = 307 - (307 - l.y) * 2;
  stretched.pages[0].lines.sort((a, b) => b.y - a.y);
  const off = readSheet(stretched, registry, { layout: false }), on = readSheet(stretched, registry, { layout: true });
  assert.deepEqual(raws(off, 'nozzle'), []);
  assert.deepEqual(raws(off, 'bed'), []);
  assert.deepEqual(raws(on, 'nozzle'), ['280-300 °C']);
  assert.deepEqual(raws(on, 'bed'), ['120-150 °C']);
  assert.deepEqual(raws(on, 'drying'), ['150 °C']);
  assert.ok(on.settings.every((s) => s.viaLayout));
  assert.deepEqual(on.values.map((v) => v.property), off.values.map((v) => v.property));
});

test('a page the reader already reads is read the same with the layout on, and nothing is read twice', () => {
  const off = readSheet(lcp, registry, { layout: false }), on = readSheet(lcp, registry, { layout: true });
  assert.deepEqual(on.settings.map((s) => [s.field, s.raw]), off.settings.map((s) => [s.field, s.raw]));
  assert.ok(raws(off, 'drying')[0].includes('4-6 h'));
  assert.ok(!on.settings.some((s) => s.viaLayout) && !on.values.some((v) => v.viaLayout));
});

test('a three-column property table is one block and reads the same either way', () => {
  for (const p of tds.pages) assert.equal(readingOrder(p).blocks.length, 1);
  const off = readSheet(tds, registry, { layout: false }), on = readSheet(tds, registry, { layout: true });
  assert.deepEqual(on, off);
  assert.ok(off.values.length > 0);
});

test('two tables side by side whose rows share baselines are not cut', () => {
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push([700 - i * 14, [70, `Property ${i}`], [160, `${i + 1}.2 MPa`], [300, `Other ${i}`], [400, `${i + 3}.5 %`]]);
  assert.equal(readingOrder(page(rows)).blocks.length, 1);
});

test('two columns of text with no row in common are cut, and a heading across both is split at the cut', () => {
  const rows = [[720, [70, 'Heading left'], [300, 'Heading right']]];
  for (let i = 0; i < 6; i++) rows.push([700 - i * 14, [70, `left ${i}`]], [696 - i * 14, [300, `right ${i}`]]);
  const { blocks, lines } = readingOrder(page(rows));
  assert.equal(blocks.length, 2);
  assert.deepEqual(lines.slice(0, 2).map((l) => l.text), ['Heading left', 'left 0']);
  assert.equal(lines.find((l) => l.text === 'Heading right').block, 1);
});

test('too few lines on a side make no column', () => {
  const rows = [];
  for (let i = 0; i < 3; i++) rows.push([700 - i * 14, [70, `left ${i}`]], [696 - i * 14, [300, `right ${i}`]]);
  assert.equal(readingOrder(page(rows)).blocks.length, 1);
});
