// A product is filed where a ruling puts it, and a TPU where its rating puts it (D86, D87). The world is the tables as
// they stand, so the classes and the materials are the real ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { classifyProduct } from '../scripts/ingest/classify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades') };

test('a material ruling files the product it names under the material it names, and nothing else', () => {
  // Antero 800NA's first page names no polymer; the maker's second page says PEKK-based, and PEKK has no row in
  // polymers.csv for an identity ruling to name. The ruling names the material instead.
  const ruled = [{ Ruling: 'R0', Kind: 'material', Subject: 'Antero 800NA', Value: 'M098', Reason: '' }];
  const before = classifyProduct('Antero 800NA', { manufacturer: 'Stratasys' }, { ...world, rulings: [] });
  assert.equal(before.needsRuling, true);
  const after = classifyProduct('Antero 800NA', { manufacturer: 'Stratasys' }, { ...world, rulings: ruled });
  assert.equal(after.materialId, 'M098');
  assert.equal(after.needsRuling, false, after.reasons.join('; '));
  assert.ok(after.signals.some((s) => /^ruling R0: filed under M098/.test(s)));
  // Another product is not answered by it, and a family entry is never a home (D44).
  assert.equal(classifyProduct('Antero 840CN03', { manufacturer: 'Stratasys' }, { ...world, rulings: ruled }).materialId, null);
  const family = [{ Ruling: 'R0', Kind: 'material', Subject: 'Antero 800NA', Value: 'M047', Reason: '' }];
  assert.equal(classifyProduct('Antero 800NA', { manufacturer: 'Stratasys' }, { ...world, rulings: family }).needsRuling, true);
});

test('a TPU is filed in the hardness class its rating falls in, from its name or else its sheet', () => {
  const at = (product, context = {}) => classifyProduct(product, { manufacturer: 'SUNLU', ...context }, { ...world, rulings: [] }).materialId;
  // Until the reader read the rating, every new TPU went to the table's first class, 87A or softer.
  assert.equal(at('TPU 95A'), 'M161');
  assert.equal(at('TPU 90A'), 'M160');
  assert.equal(at('TPU 83A'), 'M159');
  assert.equal(at('TPU 98A'), 'M162');
  assert.equal(at('TPU 64D'), 'M162');
  // A TPU that states no rating had a class of its own until m223, which found every product in it rated by its maker
  // after all and made it a family entry (D106): such a product now waits for a ruling, never the first class.
  assert.equal(at('TPU'), null);
  const unrated = classifyProduct('TPU', { manufacturer: 'SUNLU' }, { ...world, rulings: [] });
  assert.equal(unrated.needsRuling, true);
  assert.ok(unrated.reasons.some((r) => /Shore rating its maker gives it/.test(r)), unrated.reasons.join('; '));
  // A name with no rating takes the one the sheet's own hardness row prints.
  assert.equal(at('TPU', { hardness: '92A' }), 'M160');
});

test('a ruling on a word says what the word means, and does not read as a ruling on the product', () => {
  const word = [{ Ruling: 'R0', Kind: 'identity', Subject: 'nylon', Value: 'PA6', Reason: '' }];
  const c = classifyProduct('Nylon FX256', { manufacturer: 'Fillamentum' }, { ...world, rulings: word });
  assert.equal(c.polymer, 'PA6');
  assert.ok(c.signals.includes('ruling R0 on the word "nylon": PA6'));
  assert.ok(!c.signals.some((s) => /^ruling R\d+:/.test(s)));
  // A product whose whole name is the word is the product being named, and the ruling answers for it.
  assert.ok(classifyProduct('Nylon', { manufacturer: 'Yousu' }, { ...world, rulings: word }).signals.includes('ruling R0: PA6'));
});
