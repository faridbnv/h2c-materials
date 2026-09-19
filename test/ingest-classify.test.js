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
  // A filler the vocabulary has no value for is a ruling, not a near-enough match. Aramid, PTFE, ceramic and a
  // conductive load gained values with the Spectrum batch that needed them; tungsten has none.
  assert.match(classify('Spectrum PETG Tungsten', 'Spectrum').reasons.join(' '), /tungsten/);
  assert.equal(classify('Spectrum ABS Kevlar', 'Spectrum').modifier, 'Aramid fibre');
  // A polymer with no row in polymers.csv cannot be estimated, so no material of it can be created. It can still
  // be filed under one that exists and already says so: the six high-temperature materials are not estimated.
  assert.equal(classify('PEEK', '3DXTECH').materialId, 'M097');
  assert.equal(classify('PEEK', '3DXTECH').needsRuling, false);
  assert.match(classify('Spectrum PBT', 'Spectrum').reasons.join(' '), /polymers\.csv/);
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

test('a filler is read from the sheet only where the sheet makes it a filler', () => {
  // "Glass" appears in "Glass Transition Temperature" on nearly every sheet. Read as a filler, it filed a
  // toughened PLA under glass-filled PLA.
  const body = 'Spectrum PLA Tough is a specially modified PLA-based material. Glass Transition Temperature 60 °C.';
  assert.equal(classifyProduct('PLA Tough', { manufacturer: 'Spectrum', body }, world).materialId, 'M001');
  // Where the sheet does make it a filler, it is one.
  const filled = 'a PLA reinforced with 20% glass fibre for stiffness';
  assert.equal(classifyProduct('PLA Pro', { manufacturer: 'Spectrum', body: filled }, world).modifier, 'Glass fibre');
  // A load the sheet names in its own words, and only in them: this sheet says "The applied ceramic fillers".
  const ceramic = 'a flame-resistant material based on polyamide 6. The applied ceramic fillers enhance thermal stability';
  assert.equal(classifyProduct('PA6 CS20 FR V0', { manufacturer: 'Spectrum', body: ceramic }, world).modifier, 'Ceramic');
  // A percentage near the word is not a filler word. The table and the marketing column are interleaved, so
  // "Tensile Strain at Break 10% lower carbon footprint" put a percentage twelve characters before "carbon".
  const footprint = 'FlameGuard PLA is a flame-retardant material. Tensile Strain at Break 10% lower carbon footprint than ABS FR';
  assert.equal(classifyProduct('FlameGuard PLA', { manufacturer: 'Spectrum', body: footprint }, world).modifier, 'Unfilled / unspecified');
  // A hollow glass sphere is a load, and it is not a reinforcing fibre.
  const spheres = 'PA6 GK10 is a polyamide 6. Filled with hollow glass spheres, it is stiffer and lighter';
  assert.equal(classifyProduct('PA6 GK10', { manufacturer: 'Spectrum', body: spheres }, world).modifier, 'Glass spheres');
});

test('a fibre load is read by the shape of its code, not by a list of spellings', () => {
  for (const [name, modifier, materialId] of [
    ['PA6 Low Warp CF15S', 'Carbon fibre', 'M050'],
    ['FIBERON ASA CF08', 'Carbon fibre', 'M033'],
    ['PA12 CF+', 'Carbon fibre', 'M053'],
    ['PETG GF30', 'Glass fibre', 'M025'],
    ['rPETG CF', 'Carbon fibre', 'M024'],
  ]) {
    const c = classify(name, 'Spectrum');
    assert.equal(c.modifier, modifier, name);
    assert.equal(c.materialId, materialId, name);
  }
});

test('a polymer named only to be contrasted with is not the product', () => {
  // Spectrum ecoPET 9021: "Unlike the more widely used PETG in 3D printing, it is based on a non-glycol-modified
  // variant of PET", and "its advantages over classic PETG". Every mention of PETG contrasts; the product is PET.
  const body = 'Spectrum ecoPET 9021 is another polyester technical material. Unlike the Water absorption 0.3% ISO 62'
    + ' more widely used PETG in 3D printing, it is based on a non-glycol-modified variant of PET retaining 90%'
    + ' recycled content. Its advantages over classic PETG are not only ecological.';
  const read = classifyProduct('ecoPET 9021', { manufacturer: 'Spectrum', body }, world);
  assert.equal(read.polymer, 'PET');
  // A support product says so in its own words as often as in its name.
  const aqua = 'AquaPrint is a water-soluble support material designed for complex multi-extrusion 3D printing.';
  const support = classifyProduct('AquaPrint', { manufacturer: 'Spectrum', body: aqua }, world);
  assert.equal(support.support, true);
  assert.equal(support.needsRuling, true);
});

test('an identity ruling answers a name that says only a family', () => {
  // SUNLU's Easy PA sheet says "PA", which names a family and owns no product (D44). Its own store says the
  // product is a PA6/66 copolymer, and the ruling carries that answer to every sheet that says the same thing.
  const before = classifyProduct('Easy PA', { manufacturer: 'SUNLU' }, { ...world, rulings: [] });
  assert.equal(before.needsRuling, true);
  assert.match(before.reasons.join(' '), /names a family/);
  const ruled = [{ Ruling: 'R054', Kind: 'identity', Subject: 'SUNLU Easy PA', Value: 'PA6/66', Reason: 'its own store' }];
  const after = classifyProduct('Easy PA', { manufacturer: 'SUNLU' }, { ...world, rulings: ruled });
  assert.equal(after.polymer, 'PA6/66');
  assert.equal(after.needsRuling, false);
  // A ruling of another kind, for another product, or naming something that is not a polymer, answers nothing.
  const other = [{ Ruling: 'R0', Kind: 'identity', Subject: 'SUNLU Easy PA', Value: 'Nylon', Reason: '' }];
  assert.equal(classifyProduct('Easy PA', { manufacturer: 'SUNLU' }, { ...world, rulings: other }).needsRuling, true);
  const elsewhere = [{ Ruling: 'R0', Kind: 'identity', Subject: 'Eryone Easy PA', Value: 'PA6/66', Reason: '' }];
  assert.equal(classifyProduct('Easy PA', { manufacturer: 'SUNLU' }, { ...world, rulings: elsewhere }).needsRuling, true);
});
