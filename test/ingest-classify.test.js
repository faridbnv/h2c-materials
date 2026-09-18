// What a product is, from the words a maker prints. The cases are real product names out of the research
// inventory, and the ones that must come back as a question matter as much as the ones that must not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { classifyProduct, tokenise, shoreFromName } from '../scripts/ingest/classify.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const table = (n) => readCsv(join(root, 'data/tables', `${n}.csv`)).records.map((r) => r.values);
const world = { materials: table('materials'), polymers: table('polymers'), grades: table('grades') };
const classify = (product, maker = '') => classifyProduct(product, { manufacturer: maker }, world);

test('a name that states its polymer and filler finds the material it belongs to', () => {
  for (const [product, maker, materialId] of [
    ['PolyLite PETG', 'Polymaker', 'M020'],
    ['Carbon Fiber PETG', 'SUNLU', 'M024'],
    ['FIBERLOGY ABSGF', 'Fiberlogy', 'M028'],
    ['spectrum asax cf10', 'Spectrum', 'M033'],
    ['Spectrum asax x gf10', 'Spectrum', 'M034'],
    ['ESD PETG', '3DXTECH', 'M026'],
  ]) {
    const c = classify(product, maker);
    assert.equal(c.materialId, materialId, `${product} -> ${c.materialId} ${c.materialName} (${c.polymer}, ${c.modifier})`);
    assert.equal(c.needsRuling, false, c.reasons.join('; '));
  }
});

test('makers run the polymer and the filler together, and write a nylon as a name and a number', () => {
  assert.equal(classify('3DXSTAT ESD Nylon 12', '3DXTECH').polymer, 'PA12');
  assert.equal(classify('PETGCF').polymer, 'PETG');
  assert.equal(classify('FIBERLOGY ABSGF').modifier, 'Glass fibre');
  // The guard on that: a word that merely starts like a polymer is not one.
  assert.equal(classify('pack of tools').polymer, '');
  assert.ok(!tokenise('packaging').includes('pa'));
});

test('a product-level row answers only for the maker whose product it is', () => {
  assert.equal(classify('PLA Matte', 'Bambu Lab').materialId, 'M003');
  // Another maker's matte PLA is a finish on plain PLA, not Bambu's product.
  assert.equal(classify('PLA Matte', 'SUNLU').materialId, 'M001');
  assert.equal(classify('matte PLA', 'Fiberlogy').materialId, 'M001');
});

test('a class is a class whoever sells it', () => {
  // ABS-GF carries an Official Bambu product status today because Bambu is the only maker in the database. It is
  // still a material class: another maker's glass-filled ABS joins it as a grade.
  assert.equal(classify('ABS GF', 'Fiberlogy').materialId, 'M028');
  assert.equal(classify('ABS-GF10', 'Flashforge').materialId, 'M028');
});

test('a name that does not say what the polymer is becomes a question, never a guess', () => {
  const nylon = classify('Nylon', 'Yousu');
  assert.equal(nylon.needsRuling, true);
  assert.match(nylon.reasons.join(' '), /family/);
  assert.equal(nylon.materialId, null);
  // A copolymer beside a polyamide is the case that put one data sheet under three materials in 2026-09-13.
  const amidex = classify('AmideX PA6 Copolymer', '3DXTECH');
  assert.equal(amidex.needsRuling, true);
  assert.ok(amidex.confidence < 1);
  // A filler the vocabulary has no value for is a ruling, not a near-enough match.
  assert.match(classify('Spectrum ABS Kevlar', 'Spectrum').reasons.join(' '), /aramid/);
  // A polymer with no row in polymers.csv cannot be estimated, and says so.
  assert.match(classify('PEEK', '3DXTECH').reasons.join(' '), /polymers\.csv/);
});

test('a hardness a product states in its own name is read from it', () => {
  assert.equal(shoreFromName('Filaflex 82A'), '82A');
  assert.equal(shoreFromName('PolyFlex TPU95'), null);      // no scale letter: the sheet must say
  assert.equal(shoreFromName('Flexfill PEBA 90A'), '90A');
  assert.equal(shoreFromName('PLA 1.75'), null);
});

test('every material a classification can return is one a product may be filed under', () => {
  const byId = new Map(world.materials.map((m) => [m.MaterialID, m]));
  for (const product of ['PolyLite PETG', 'PLA Matte', 'ABS GF', 'ESD PETG', 'Carbon Fiber PETG']) {
    const c = classify(product, 'Polymaker');
    if (!c.materialId) continue;
    const m = byId.get(c.materialId);
    assert.notEqual(m.Scope, 'Family entry', `${product} was filed under the family entry ${m['Original name']}`);
  }
});
