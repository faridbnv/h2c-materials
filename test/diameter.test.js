// A product found only in 2.85 mm (D175, the owner's ruling of 2026-10-20): it stays, counted as before, and its detail
// in the drawer and its card on its material's page say that only a 2.85 mm filament was found, which the H2C (1.75 mm)
// does not take. grades.csv Diameter holds what its documents print, typed against schema/vocab/diameters.csv.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../build/src/csv.js';
import { diameterWarning } from '../app/js/ui/format.js';
import { diametersIn, diameterCell } from '../scripts/lib/diameters.mjs';
import { db, situation, drawer } from './fixtures/drawer-situation.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fits = new Map(readCsv(join(root, 'schema/vocab/diameters.csv')).records.map((r) => [r.values.Value, r.values['Fits the H2C'] === 'TRUE']));
const rows = readCsv(join(root, 'data/tables/grades.csv')).records.map((r) => r.values);

test('every grade carries its Diameter, and the database says whether the H2C takes it', () => {
  const byId = new Map(db.grades.map((g) => [g.id, g]));
  for (const r of rows) {
    const g = byId.get(r.GradeID);
    if (r.Diameter === 'Not published') assert.equal(g.diameter, undefined, r.GradeID);
    else assert.deepEqual(g.diameter, { found: r.Diameter, fits: fits.get(r.Diameter) }, r.GradeID);
  }
});

test('a product found only in 2.85 mm is kept and counted, and its detail and its card say so', () => {
  const larger = db.grades.filter((g) => !g.retired && g.diameter && !g.diameter.fits);
  assert.ok(larger.length >= 12, `${larger.length} products found only in a larger diameter`);
  for (const g of larger) {
    const m = db.materials.find((x) => x.id === g.materialId);
    assert.ok(m.gradeIds.includes(g.id), `${g.id} is still among ${m.name}'s products`);
    assert.equal(diameterWarning(g), 'Only 2.85 mm filament was found; the H2C takes 1.75 mm.', g.id);
  }
  const bvoh = larger.find((g) => g.manufacturer === 'BigRep' && g.product === 'BVOH');
  assert.ok(bvoh, 'BigRep BVOH, the case OPEN-PROBLEMS §37.5 named');
  const html = drawer(situation(), bvoh.materialId);
  const block = html.slice(html.indexOf(`data-grade-body="${bvoh.id}"`));
  assert.match(block.slice(0, block.indexOf('grade-block')), /data-diameter="2\.85 mm only">Only 2\.85 mm filament was found; the H2C takes 1\.75 mm\./, 'in the product\'s detail');
  // Not on the drawer's first lines: only inside the product's own block.
  assert.ok(html.indexOf('data-diameter') > html.indexOf(`data-grade-body="${bvoh.id}"`));
  const page = join(root, 'dist/materials', `${bvoh.materialId}-products.html`);
  if (existsSync(page)) assert.match(readFileSync(page, 'utf8'), /class="pc-note pc-note--warn" data-diameter="2\.85 mm only">Only 2\.85 mm filament was found; the H2C takes 1\.75 mm\./, 'on its card');
  // A product the H2C takes says nothing.
  assert.equal(diameterWarning(db.grades.find((g) => g.diameter?.fits)), null);
  assert.equal(diameterWarning(db.grades.find((g) => !g.diameter)), null);
});

test('the reader reads a diameter, not a density or a ratio, and a larger one alone only where no 1.75 mm is printed', () => {
  assert.ok(diametersIn('Filament Diameter - 2.85 mm +/- 0.05').mm285);
  assert.equal(diametersIn('Filament Diameter - 2.85 mm +/- 0.05').mm175, null);
  assert.ok(diametersIn('Diameter Tolerance 1.75mm ± 0.05mm').mm175);
  assert.ok(diametersIn('1,75 / 2,85 mm').mm175);
  assert.equal(diametersIn('Density 1.75 g/cm3').mm175, null);
  assert.equal(diameterCell([diametersIn('Diameter 2.85 mm')]), '2.85 mm only');
  assert.equal(diameterCell([diametersIn('Diameter 2.85 mm'), diametersIn('1.75 mm and 2.85 mm')]), '1.75 mm');
  assert.equal(diameterCell([diametersIn('Diameter 2.85 mm')], { priced: true }), '1.75 mm', 'a listing is the 1.75 mm filament');
  assert.equal(diameterCell([diametersIn('Ø 3 mm')]), '3 mm only');
  assert.equal(diameterCell([]), 'Not published');
});
