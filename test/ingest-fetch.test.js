// Staging a document the owner supplies (R084): the pipeline hashes what it is given, and never guesses which
// row a file belongs to. What is asserted is the matching rule, on rows written for the purpose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { rowForStagedFile, adapter } from '../scripts/ingest/fetch.mjs';

const rows = [
  { doc_key: 'a', provider: 'iSANMATE', product_raw: 'ABS', url: 'https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf' },
  { doc_key: 'b', provider: 'iSANMATE', product_raw: 'ABS GF', url: 'https://www.isanmate.com/wp-content/uploads/2024/09/ABS-GF_TDS.pdf' },
  { doc_key: 'c', provider: 'FormFutura', product_raw: 'ABSpro', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro.pdf' },
  { doc_key: 'd', provider: 'FormFutura', product_raw: 'ABSpro Flame Retardant', url: 'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/TDS%20-%20ABSpro%20-%20Flame%20Retardant.pdf' },
];

test('a staged file finds its row by the file name the URL carries, whatever the case or punctuation', () => {
  assert.equal(rowForStagedFile('ABS_TDS.pdf', rows).row.doc_key, 'a');
  assert.equal(rowForStagedFile('abs-gf_tds.PDF', rows).row.doc_key, 'b');
  // A SharePoint name is percent-encoded in the URL and plain on disk.
  assert.equal(rowForStagedFile('TDS - ABSpro - Flame Retardant.pdf', rows).row.doc_key, 'd');
});

test('a file no URL names is matched by a product name that one row alone carries, and refused where two do', () => {
  assert.equal(rowForStagedFile('iSANMATE ABS GF datasheet 2026.pdf', rows).row.doc_key, 'b');
  // The longest name the file contains is the product: a file named for the flame-retardant grade is not the plain one.
  assert.equal(rowForStagedFile('ABSpro Flame Retardant datasheet.pdf', rows).row.doc_key, 'd');
  assert.equal(rowForStagedFile('ABSpro datasheet.pdf', rows).row.doc_key, 'c');
  // Two names of one length that the file contains alike are two products: it is listed, not guessed.
  const twins = [...rows, { doc_key: 'e', provider: 'X', product_raw: 'PLA Pro', url: 'https://x.example/1' }, { doc_key: 'f', provider: 'X', product_raw: 'PET Pro', url: 'https://x.example/2' }];
  const ambiguous = rowForStagedFile('PLA Pro and PET Pro.pdf', twins);
  assert.equal(ambiguous.row, undefined);
  assert.match(ambiguous.why, /2 products' names fit/);
  assert.match(rowForStagedFile('something else.pdf', rows).why, /no row carries this file name/);
});

test('the host that disallows fetching tools is the one the owner stages by hand', () => {
  assert.equal(adapter('https://www.isanmate.com/wp-content/uploads/2022/09/ABS_TDS.pdf').kind, 'manual');
});
