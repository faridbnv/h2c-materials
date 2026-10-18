// Parallel lines and the family colours the charts share (coherence build C40 to C44, C51).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AXIS_DEFS } from '../app/js/ui/axes.js';
import { openingAxes } from '../app/js/ui/parallel.js';
import { buildFamilyColors, familyColors } from '../app/js/ui/format.js';

// The registry's order, as the axis chips show it.
const KEYS = ['density', 'tensileModulusXY', 'tensileStrengthXY', 'tensileStrengthZ', 'elongationXY', 'charpy', 'izod', 'hdt045', 'tg', 'priceCADkg'];
if (!AXIS_DEFS.length) AXIS_DEFS.push(...KEYS.map((key) => ({ key, unit: '' })));
const need = (property, mandatory = true) => ({ kind: 'numeric', property, operator: '>=', value: 1, mandatory });

test('Parallel lines opens on the properties the scenario asks about, filled to four from the usual four (C42)', () => {
  // Nothing asked: the usual four.
  assert.deepEqual(openingAxes([]), ['density', 'tensileModulusXY', 'elongationXY', 'hdt045']);
  // Asks only about price, and reports it: price is there, in the chips' order, and one of the usual four makes way.
  assert.deepEqual(openingAxes([need('priceCADkg', false)]), ['density', 'tensileModulusXY', 'elongationXY', 'priceCADkg']);
  // Asks about what is already usual: unchanged.
  assert.deepEqual(openingAxes([need('hdt045')]), ['density', 'tensileModulusXY', 'elongationXY', 'hdt045']);
  assert.deepEqual(openingAxes([need('tensileModulusXY'), need('hdt045', false)]), ['density', 'tensileModulusXY', 'elongationXY', 'hdt045']);
  // A property no axis draws, and a requirement that is not a number, name nothing.
  assert.deepEqual(openingAxes([need('shoreA'), { kind: 'gate', gate: 'nozzle' }]), ['density', 'tensileModulusXY', 'elongationXY', 'hdt045']);
  // Many asked: the required ones first, then the reported, five at most.
  const many = openingAxes([need('izod', false), need('tg', false), need('density'), need('charpy'), need('hdt045'), need('priceCADkg'), need('tensileStrengthZ')]);
  assert.equal(many.length, 5);
  assert.deepEqual(many, ['density', 'tensileStrengthZ', 'charpy', 'hdt045', 'priceCADkg']);
  assert.deepEqual(many, [...many].sort((a, b) => KEYS.indexOf(a) - KEYS.indexOf(b)), 'drawn in the order of the chips');
});

/** A colour's hue in degrees, 0 to 360, and its saturation. */
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (!d) return { h: 0, s: 0 };
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: d / (1 - Math.abs(max + min - 1)) };
}
const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

test('no family is drawn in the accent blue, and PLA and PETG are well apart (C51)', () => {
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
  const colors = buildFamilyColors(db.materials);
  assert.equal(colors.named.length, 8);
  for (const f of colors.named) {
    const { h, s } = hsl(colors.color(f));
    assert.ok(!(s > 0.25 && h >= 195 && h <= 270), `${f} is drawn in a blue (${colors.color(f)}), which means "this material"`);
  }
  const pla = hsl(colors.color('PLA')), petg = hsl(colors.color('PETG'));
  assert.ok(gap(pla.h, petg.h) >= 90, `PLA ${colors.color('PLA')} and PETG ${colors.color('PETG')} are ${gap(pla.h, petg.h).toFixed(0)} degrees apart`);
  // Every family past the palette shares the one grey.
  assert.equal(new Set(colors.other.map((f) => colors.color(f))).size, 1);
  assert.ok(colors.other.length > 1);
});

test('one call gives every chart the same colours: a family asked for takes the first (C43)', () => {
  const materials = ['Nylon', 'Nylon', 'Nylon', 'PLA', 'PLA', 'ABS', 'ASA', 'PC', 'PET', 'PP', 'PE', 'PS', 'PVB', 'POM'].map((family, i) => ({ id: `M${i}`, family }));
  const state = (asked, promoted) => ({ db: { materials }, scenario: { constraints: asked ? [{ kind: 'facet', facet: 'family', in: asked }] : [], plot: { promotedFamilies: promoted } } });
  const plain = familyColors(state(null, undefined));
  assert.equal(plain.color('Nylon'), buildFamilyColors(materials).color('Nylon'));
  assert.ok(plain.isOther('POM'));
  // Filtered for the last family: it is no longer grey, and every chart reading this call agrees.
  const asked = familyColors(state(['POM'], undefined));
  assert.ok(!asked.isOther('POM'));
  assert.equal(asked.named[0], 'POM');
  assert.equal(familyColors(state(null, ['POM'])).color('POM'), asked.color('POM'));
});
