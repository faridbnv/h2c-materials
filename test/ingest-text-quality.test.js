// Text quality and the optical sidecar (reader round, 2026-10-04): the flags a cached page earns, and tesseract's word
// boxes read into the cache's own shape. The pages are written here and the TSV is a fixture, so nothing in this file
// needs tesseract, poppler or a document cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docQuality, isBroken, labelsWithoutNumber, loadLabels, pageQuality, scoredWords, wordScore } from '../scripts/lib/text-quality.mjs';
import { chooseReading, pageList, parseTsv, pngSize, readingFromTsv, thresholdPgm, tsvToSpans } from '../scripts/ingest/ocr-pass.mjs';
import { numberOnPage } from '../scripts/lib/pdf-text.mjs';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/ingest');
const page = (n, ...texts) => ({ page: n, lines: texts.map((text, i) => ({ y: 700 - i * 12, x0: 40, x1: 300, text, spans: [] })) });

const CLEAN = page(1,
  'Recreus PET-G Technical Data Sheet',
  'Description',
  'PET-G is a highly modified copolymer, specially designed for 3D printing extrusions with excellent melt strength.',
  'Property Value Unit Test method according to',
  'Material density 1,29 g/cm3 ISO 1183',
  'Tensile modulus 3020 MPa ISO 527',
  'Elongation at break 31 % ISO 527',
  'Heat deflection temperature 68,0 °C ISO 75-2',
  'Nozzle temperature 230 - 260 °C',
  'Bed temperature 70 - 80 °C',
  'The filament should be stored dry and sealed, away from direct sunlight and from humidity.');

// The same sheet with every letter moved four places along, which is what a font table that is off by a constant does.
const shift = (s) => s.replace(/[a-z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 97 + 4) % 26) + 97));
const CIPHER = page(1, ...CLEAN.lines.map((l) => shift(l.text.toLowerCase())).slice(0, 3), shift('thermoplastic polyester filament recommended for printing and storage, without enclosure'), shift('mechanical properties measured on injection moulded specimens at room temperature'));

test('a page that prints words and numbers carries no flag', () => {
  const q = pageQuality(CLEAN);
  assert.deepEqual(q.flags, []);
  assert.ok(q.letterRatio > 0.5);
  assert.equal(isBroken(q), false);
});

test('a page with no text is empty, and only that', () => {
  const q = pageQuality(page(3, '3', 'Page 3'));
  assert.deepEqual(q.flags, ['empty']);
  assert.equal(pageQuality(page(4)).chars, 0);
});

test('private-use characters, the replacement character and (cid: are a glyph flag', () => {
  for (const bad of ['', 'Density � g/cm3', '(cid:12)(cid:34)']) {
    const lines = [...CLEAN.lines.map((l) => l.text), `Heat ${bad} 68 C`];
    assert.ok(pageQuality(page(1, ...lines)).flags.includes('glyph'), bad);
  }
  assert.equal(pageQuality(CLEAN).detail.glyphs, undefined);
});

test('a page of symbols and digits where words should be is a letters flag', () => {
  const q = pageQuality(page(1, '!"#$ %&\'( )*+,- ./012 34567 89:;< => ?@ABC', '!"#$ %&\'( )*+,- ./012 34567 89:;< => ?@ABC', '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20'));
  assert.deepEqual(q.flags, ['letters']);
});

test('words moved along the alphabet are a garble flag, which no count of characters would see', () => {
  const q = pageQuality(CIPHER);
  assert.equal(q.letterRatio > 0.8, true);
  assert.ok(q.flags.includes('garble'), JSON.stringify(q));
  assert.ok(q.detail.bigram < -3.2);
  assert.equal(isBroken(q), true);
});

test('a number with a symbol inside is a garble flag only when it recurs', () => {
  assert.deepEqual(pageQuality(page(1, ...CLEAN.lines.map((l) => l.text), 'Hardness 3] Shore D')).flags, []);
  assert.ok(pageQuality(page(1, ...CLEAN.lines.map((l) => l.text), 'Hardness 3] Shore D', 'Izod 4&4 kJ/m2')).flags.includes('garble'));
  // a citation is not a number with a symbol in it
  assert.deepEqual(pageQuality(page(1, ...CLEAN.lines.map((l) => l.text), 'See [1] and [2].')).flags, []);
});

test('a property label with no number near it is flagged when two of them stand alone', () => {
  const labels = loadLabels();
  const sheet = (...rest) => page(1, ...rest, 'The filament is made in Spain.');
  assert.deepEqual(labelsWithoutNumber(sheet('Tensile modulus', 'Heat deflection temperature', 'Notes').lines, labels).length, 2);
  assert.ok(pageQuality(sheet('Tensile modulus', 'Heat deflection temperature', 'Remarks and notes on the sheet follow below this table, nothing more.')).flags.includes('label-no-number'));
  // a value within two lines, a unit heading and a value stated in words are all rows or headings, not lost values
  assert.equal(labelsWithoutNumber(page(1, 'Tensile modulus', 'Value', '3020 MPa').lines, labels).length, 0);
  assert.equal(labelsWithoutNumber(page(1, 'Elongation (%)', 'Water absorption not determined').lines, labels).length, 0);
  assert.deepEqual(pageQuality(page(1, ...CLEAN.lines.map((l) => l.text), 'Tensile modulus')).flags, []);
});

test('the word score separates words from a shifted alphabet, and only Latin words of four letters are scored', () => {
  assert.ok(wordScore('thermoplastic') > -3);
  assert.ok(wordScore(shift('thermoplastic')) < -3.3);
  assert.deepEqual(scoredWords('Température 68 °C, ABS 玻纤 and the PET'), ['temperature']);
});

test('a document reports its pages, its counts and whether it was already read optically', () => {
  const q = docQuality({ sha: 'x', extractor: 'pdfjs-dist', pages: [CLEAN, page(2, 'x'), CIPHER], ocr: { tool: 'ocrmypdf' } });
  assert.equal(q.optical, true);
  assert.equal(q.flaggedPages, 2);
  assert.deepEqual(q.counts, { empty: 1, garble: 1 });
  assert.deepEqual(q.pages.map((p) => p.page), [1, 2, 1]);
});

// --- the optical sidecar -------------------------------------------------------------------------------------------

const tsv = readFileSync(join(fixtures, 'ocr-fixture.tsv'), 'utf8');
const geometry = { dpi: 300, pageHeightPt: (3508 * 72) / 300 };

test('tesseract word boxes become spans in PDF points, y up, one baseline to a recognised line', () => {
  assert.equal(parseTsv(tsv).filter((r) => r.level === 5).length, 8);
  const spans = tsvToSpans(tsv, geometry);
  assert.equal(spans.length, 7, 'the blank word is dropped');
  const hdt = spans.find((s) => s.str === 'HDT');
  assert.equal(hdt.x, 48);
  assert.ok(Math.abs(hdt.w - 72) < 1e-9);
  // the median bottom of the first line is 350 px: 841.92 - 350 * 0.24
  assert.ok(Math.abs(hdt.y - 757.92) < 1e-9);
  // "68,0" sits ten pixels higher in its box; it shares its line's baseline all the same
  assert.equal(spans.find((s) => s.str === '68,0').y, hdt.y);
  assert.ok(spans.find((s) => s.str === 'Density').y < hdt.y);
});

test('the spans read into lines exactly as a text layer would, top down', () => {
  const reading = readingFromTsv(tsv, 6, geometry);
  assert.deepEqual(reading.lines.map((l) => l.text), ['HDT (0,45MPa) 68,0 °C', 'Density 1,29 g/cm3']);
  assert.deepEqual(reading.lines.map((l) => l.y), [758, 734]);
  assert.equal(reading.numeric, 2);
  const text = { pages: [{ page: 1, squeezed: reading.squeezed }] };
  assert.equal(numberOnPage(text, 1, '68'), true);
  assert.equal(numberOnPage(text, 1, '63'), false);
});

test('of two readings the one with more numeric tokens is kept, then the more confident, then psm 6', () => {
  const r = (psm, numeric, confidence) => ({ psm, numeric, confidence, lines: [], squeezed: '' });
  assert.equal(chooseReading([r(6, 10, 90), r(4, 12, 80)]).psm, 4);
  assert.equal(chooseReading([r(6, 10, 80), r(4, 10, 90)]).psm, 4);
  const tie = chooseReading([r(4, 10, 90), r(6, 10, 90)]);
  assert.equal(tie.psm, 6);
  assert.deepEqual(tie.alt.map((a) => a.psm), [4]);
});

test('helpers: page lists, PNG size, binarising a grey page', () => {
  assert.deepEqual(pageList('1,3-5,3'), [1, 3, 4, 5]);
  const ihdr = Buffer.alloc(24);
  ihdr.writeUInt32BE(2480, 16);
  ihdr.writeUInt32BE(3508, 20);
  assert.deepEqual(pngSize(ihdr), { width: 2480, height: 3508 });
  const pgm = Buffer.concat([Buffer.from('P5\n3 1\n255\n'), Buffer.from([10, 231, 230])]);
  assert.deepEqual([...thresholdPgm(pgm, 230).subarray(-3)], [0, 255, 0]);
});
