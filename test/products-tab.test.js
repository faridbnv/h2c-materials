// The drawer's Products tab (coherence round, 2026-10-18, C34 to C37): the search above the products, the order the
// products are listed in and said to be, the figures on a closed product line, and a product's link to its card on the
// Products page. The order is the Products page's own key (product-order.js), so the two surfaces put the same product
// first; nothing here decides a verdict.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shownProduct } from '../app/js/ui/explain.js';
import { pageOf, productsPageOf, productsHref } from '../app/js/ui/page-rule.js';
import { mostDocumentedFirst, orderRow } from '../app/js/ui/product-order.js';
import { leadMaker, materialContext } from '../app/js/ui/material-facts.js';
import { db, material, situation, drawer, unescape } from './fixtures/drawer-situation.js';

test('C34: the search heads the products, above the passing group and the rest, and filters both', () => {
  const html = drawer(situation('Indoor prototype'), material('PETG').id);
  const search = html.indexOf('data-search');
  assert.ok(search > 0, 'a search box');
  assert.ok(search < html.indexOf('pass-block'), 'above the products that meet the requirements');
  assert.ok(search < html.indexOf('class="maker-block"'), 'and above the makers');
  // Both lists are searchable: every product block, in either, carries its search text.
  assert.equal((html.match(/class="grade-block"/g) ?? []).length, (html.match(/class="grade-block" data-search-item=/g) ?? []).length);
  assert.ok(html.indexOf('data-search-group') > search, 'the groups it filters follow it');
});

test('C35: the passing products open with the product Your requirements shows, then most documented first, and the first line says so', () => {
  const sit = situation('Indoor prototype');
  const m = material('PETG');
  const evaluation = sit.selection.evaluations.find((e) => e.materialId === m.id);
  const shown = shownProduct(evaluation).gradeId;
  assert.ok(shown, 'a product is shown');
  const html = drawer(sit, m.id);
  const passBlock = html.slice(html.indexOf('pass-block'), html.indexOf('class="spread-context"'));
  const listed = [...passBlock.matchAll(/data-grade-toggle="([^"]+)" aria-expanded="(true|false)"/g)].map((x) => [x[1], x[2]]);
  assert.equal(listed[0][0], shown, 'the product the Overview names leads');
  assert.equal(listed[0][1], 'true', 'and is open');
  assert.ok(listed.slice(1).every(([, open]) => open === 'false'), 'the others are closed');
  // The rest are the page's own order: documented values, then maker and name (product-order.js, which the page reads).
  const c = materialContext(db, m.id, { ctx: sit.ctx, evaluation, scenario: sit.scenario });
  const pass = new Set(evaluation.products.filter((p) => p.verdict === 'PASS').map((p) => p.gradeId));
  const expected = mostDocumentedFirst(c.m, c.grades.filter((g) => pass.has(g.id)).map(orderRow)).map((r) => r.g.id).filter((id) => id !== shown);
  assert.deepEqual(listed.slice(1).map(([id]) => id), expected);
  assert.equal(listed.length, pass.size, 'every passing product is in the group');
  // The first line says it.
  const lead = leadMaker(c.m, c);
  const help = unescape(html.match(/id="drawer-help">([^<]*)</)[1]);
  assert.match(help, /Those that meet your requirements come first: the one shown under Your requirements, then the most documented; all products follow by maker; /);
  assert.ok(help.includes(`${lead} first, its products most often the material's typical value.`), help);
});

test('C35: with no requirement the products are by maker, the maker whose products are most often typical first and open', () => {
  const sit = situation();
  for (const name of ['PETG', 'PLA']) {
    const m = material(name);
    const html = drawer(sit, m.id);
    const c = materialContext(db, m.id, {});
    const lead = leadMaker(c.m, c);
    assert.ok(lead, `${name} has a lead maker`);
    assert.match(unescape(html.match(/id="drawer-help">([^<]*)</)[1]), new RegExp(`By maker; ${lead} first, its products most often the material's typical value\\.$`));
    assert.doesNotMatch(html, /pass-block/);
    const makers = [...html.matchAll(/class="maker-name">([^<]*)</g)].map((x) => unescape(x[1]));
    assert.equal(makers[0], lead, `${name}: the lead maker is the first group`);
    assert.match(html, new RegExp(`<details class="maker-block" data-search-group open>\\s*<summary><span class="maker-name">${lead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<`), `${name}: and it is open`);
  }
});

test('C36: a closed product line shows the first three of modulus XY, strength XY, HDT at 0.45 MPa and price it publishes, a bound with its sign', () => {
  const html = drawer(situation(), material('PEI-CF').id);
  const lines = [...html.matchAll(/class="grade-keys">([^<]*)</g)].map((x) => unescape(x[1]));
  assert.equal(lines.length, 3);
  assert.equal(lines[0], 'Modulus XY 7.7 GPa · Strength XY 145 MPa · HDT 0.45 205 °C');
  // The product with a bound on HDT, and no strength: the bound keeps its sign, and only what it publishes is listed.
  assert.ok(lines.includes('Modulus XY 4.68 GPa · HDT 0.45 > 200 °C'), lines.join(' | '));
  assert.ok(lines.every((l) => !/^Density|· Density/.test(l)), 'density is not on the line');
  // A product that publishes none of the first three gives its price.
  const pla = drawer(situation(), material('PLA').id);
  assert.ok([...pla.matchAll(/class="grade-keys">([^<]*)</g)].some((x) => /^Price \d/.test(x[1])), 'a priced product with no other figure shows its price');
});

test('C37: each product links to its card on the Products page, where the material has a page, and only there', () => {
  const m = material('PETG');
  const html = drawer(situation(), m.id);
  const links = [...html.matchAll(/class="card-link" href="([^"]+)" data-card-href="([^"]+)"/g)];
  const grades = db.grades.filter((g) => g.materialId === m.id && !g.retired);
  assert.equal(links.length, grades.length, 'one link per product');
  for (const g of grades) assert.ok(html.includes(`href="materials/${productsHref(m.id)}#${g.id}"`), g.id);
  assert.ok(links.every(([, href, data]) => href === data));
  assert.match(html, /Its card on the Products page/);
  // A material with no page has no page to link to.
  const none = db.materials.find((x) => !x.familyEntry && x.gradeIds.length && !pageOf(x, db.measurements.filter((r) => r.materialId === x.id)));
  assert.ok(none, 'a material without a page');
  assert.doesNotMatch(drawer(situation(), none.id), /card-link/);
});

test('C37, C38: the page address of a product is the page rule\'s own', () => {
  const m = material('PETG');
  const ms = db.measurements.filter((x) => x.materialId === m.id);
  assert.equal(productsPageOf(m, ms), `materials/${m.id}-products.html`);
  assert.equal(productsPageOf(m, ms, 'G020-01'), `materials/${m.id}-products.html#G020-01`);
  assert.equal(productsPageOf({ ...m, gradeIds: [] }, ms, 'G020-01'), null);
});

