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

test('a polymer written as two words is one polymer', () => {
  // "PC ABS" tokenises to pc and abs, and the longest single token wins, so a PC/ABS blend read as plain ABS.
  assert.equal(classify('PC ABS', 'Polymaker').materialId, 'M094');
  assert.equal(classify('PC/ABS', 'Polymaker').materialId, 'M094');
  assert.equal(classify('PC PBT', 'Polymaker').materialId, 'M095');
  assert.equal(classify('FIBERLOGY EASY PET G', 'Fiberlogy').materialId, 'M020');
  assert.equal(classify('PA6/66', 'BigRep').materialId, 'M057');
  assert.equal(classify('AmideX Nylon 6 66', '3DXTECH').polymer, 'PA6/66');
  // And the pieces of the joined name are not a second polymer, so none of these becomes a question.
  for (const name of ['PC ABS', 'PC PBT', 'PA6/66', 'FIBERLOGY EASY PET G']) assert.equal(classify(name).needsRuling, false, name);
});

test('a short alias does not eat a longer name', () => {
  // PES is polyethersulfone. Read as PE plus a letter, a 225 °C sulfone was filed as polyethylene at confidence 1.
  assert.equal(classify('THERMAX PES', '3DXTECH').polymer, 'PESU');
  assert.equal(classify('THERMAX PES', '3DXTECH').materialId, 'M101');
  assert.notEqual(classify('THERMAX PPE PS', '3DXTECH').polymer, 'PP');
  // The suffix rule still reads a maker's own spelling: Spectrum's ASAX is an ASA.
  assert.equal(classify('spectrum asax cf10', 'Spectrum').materialId, 'M033');
});

test('a name that holds two polymers is a question, not a lower score', () => {
  const blend = classify('colorFabb PLA/PHA', 'colorFabb');
  assert.equal(blend.needsRuling, true);
  assert.match(blend.reasons.join(' '), /more than one polymer/);
  // A support product is never filed under the material it supports.
  const support = classify('PolySupport for PA12', 'Polymaker');
  assert.equal(support.needsRuling, true);
  assert.match(support.reasons.join(' '), /support or soluble/);
});

test('a product-level row needs a maker, because most documents do not name one', () => {
  // 723 of the corpus's 1,936 documents name no maker. Without this test every one of them took Bambu's SKU rows.
  assert.equal(classify('PLA BASIC', '').materialId, 'M001');
  assert.equal(classify('PLA Basic', 'SUNLU').materialId, 'M001');
  assert.equal(classify('PLA Basic', 'Bambu Lab').materialId, 'M002');
});

test('a class row is reachable however its name and its modifier are written', () => {
  // A row that carries several makers' grades is a class, whatever its Modifier says about disclosure, and its
  // name may carry an alias beside it. Without both, importing a plain POM would have created a second POM.
  assert.equal(classify('POM', 'Fabru').materialId, 'M087');
  assert.equal(classify('nGen', 'colorFabb').materialId, 'M092');
  assert.equal(classify('TPC', 'BASF Forward AM').materialId, 'M046');
  assert.equal(classify('ULTEM 9085', 'Stratasys').materialId, 'M099');
  // A material the estimate model cannot identify is reachable only by name, and only after identity has failed.
  assert.equal(classify('3DXMAX PEEK', '3DXTECH').materialId, 'M097');
  assert.equal(classify('Carbon Fiber PETG', 'SUNLU').materialId, 'M024');
});

test('an alias with no answer does not shadow one that has an answer', () => {
  // "rainbow" is a finish with no class of its own, and it was reached before "silk" because it is longer.
  assert.equal(classify('Spectrum PLA SILK Rainbow', 'Spectrum').variantClass, 'silk');
  assert.equal(classify('eSUN PLA Silk Rainbow Coral', 'eSUN').variantClass, 'silk');
});
