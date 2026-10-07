// A witness staged from the copy saved when it was read (R084, R089): the bytes are the file's, they must hash to the
// digest the reader recorded, and the row says who saved it and when. Asserted on rows written for the purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { stagedBytes, witnessRow } from '../scripts/ingest/witness.mjs';

const bytes = Buffer.from('<html><body>Printing advice: dry before use.</body></html>');
const digest = createHash('sha256').update(bytes).digest('hex');
const sheet = { doc_key: 'abc123', provider: 'Maker', provider_kind: 'manufacturer', brand: 'Maker', manufacturer: 'Maker', product_raw: 'PLA', language: 'en' };

test('a staged copy is the document only when its bytes hash to the digest recorded when it was read', () => {
  assert.equal(stagedBytes(bytes, digest, 'page.html'), digest);
  assert.equal(stagedBytes(bytes, digest.toUpperCase(), 'page.html'), digest);
  assert.throws(() => stagedBytes(Buffer.from('another page'), digest, 'page.html'), /not the .* recorded when it was read/);
});

test('a staged witness is keyed by its page and the product it witnesses, and dated by its reading', () => {
  const staged = { accessed: '2026-09-26', by: 'a research agent' };
  const row = witnessRow({ row: sheet, page: 'https://maker.example/pla', found: true, staged, today: '2026-09-27' });
  assert.equal(row.doc_key, 'https://maker.example/pla#witness-for=abc123');
  assert.equal(row.duplicate_of, 'abc123');
  assert.equal(row.duplicate_kind, 'product-page');
  assert.equal(row.checked, '2026-09-26');
  assert.equal(row.updated, '2026-09-27');
  assert.match(row.discovery, /saved by a research agent on 2026-09-26 and staged from that copy/);
});

test('a witness for a source that predates the ledger is keyed by that source, and duplicates no ledger row', () => {
  const row = witnessRow({ row: { ...sheet, doc_key: '' }, page: 'https://maker.example/pla', found: true, staged: { accessed: '2026-09-26', by: 'x', forSource: 'S-PLA' } });
  assert.equal(row.doc_key, 'https://maker.example/pla#witness-for=source:S-PLA');
  assert.equal(row.duplicate_of, '');
});

test('a document a search found for a product the catalogue does not hold is keyed by its material', () => {
  const row = witnessRow({ row: { ...sheet, doc_key: '' }, page: 'https://maker.example/tpc-esd.pdf', found: true, staged: { accessed: '2026-10-07', by: 'x', forSource: 'material:M114' } });
  assert.equal(row.doc_key, 'https://maker.example/tpc-esd.pdf#witness-for=material:M114');
});

test('a page the ledger holds from another reading, with other bytes, is a second reading keyed by its day', () => {
  const row = witnessRow({ row: sheet, page: 'https://maker.example/pla', found: true, staged: { accessed: '2026-09-26', by: 'x' }, reread: true });
  assert.equal(row.doc_key, 'https://maker.example/pla#witness-for=abc123&read=2026-09-26');
});
