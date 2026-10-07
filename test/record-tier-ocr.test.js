// A scanned page's words are found by the full-text index (completeness round, 2026-10-07): the record tier indexes the
// optical reading (.cache/ocr-text) of each page ingest:quality flags as empty or garbled, beside the text layer, and a
// SQLite file goes stale when an optical reading or a flag is added. The document cache here is a temporary one, so
// nothing below reads or writes the real one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = mkdtempSync(join(tmpdir(), 'h2c-ocr-index-'));
process.env.H2C_DOCUMENT_CACHE = cache;
const { opticalPages, recordInputs } = await import('../scripts/data/record-tier.mjs');
test.after(() => rmSync(cache, { recursive: true, force: true }));

const sha = 'a'.repeat(64);
const write = (dir, body) => { mkdirSync(join(cache, dir), { recursive: true }); writeFileSync(join(cache, dir, `${sha}.json`), JSON.stringify(body)); };

test('a flagged page is indexed from its optical reading; a page that reads, or has no reading, is not', () => {
  write('quality', { sha, pages: [{ page: 1, flags: ['label-no-number'] }, { page: 2, flags: ['empty'] }, { page: 3, flags: ['garble'] }] });
  assert.deepEqual(opticalPages(sha), { flagged: [2, 3], optical: [] }, 'no optical reading yet: two pages flagged, none indexed');
  write('ocr-text', { sha, tool: 'tesseract', pages: [
    { page: 1, lines: [{ text: 'Tensile strength 50 MPa' }] },
    { page: 2, lines: [{ text: 'Heat deflection temperature' }, { text: '0.45 MPa 61 °C' }] },
  ] });
  const { flagged, optical } = opticalPages(sha);
  assert.deepEqual(flagged, [2, 3]);
  assert.deepEqual(optical, [{ page: 2, text: 'Heat deflection temperature\n0.45 MPa 61 °C' }], 'page 1 reads and keeps its text layer; page 3 has no optical reading');
});

test('an optical reading added changes what the record tier is read from', () => {
  const before = recordInputs(root);
  if (before.state === 'absent') return; // a checkout without the import's ledger writes no record tier
  write('ocr-text', { sha, tool: 'tesseract', pages: [{ page: 3, lines: [{ text: 'Charpy notched 4 kJ/m²' }] }] });
  const after = recordInputs(root);
  assert.notEqual(after.digest, before.digest, 'a SQLite file written before the optical pass would still call itself current');
});
