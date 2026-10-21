// WP-07 copies agree: the tolerances (packages/domain/src/core/tolerances.ts) against every old copy, on every stated
// test temperature and test load of a real build, against every headline that sets one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEST_TEMPERATURE_TOLERANCE_C, LOAD_TOLERANCE_MPA, ESTIMATE_LOW_LOAD_BAND_MPA, H2C_LOW_END_C,
  offTestTemperature, offLoad, inEstimateLowLoadBand,
} from '../../packages/domain/src/core/tolerances.ts';
import { assess, TEST_TEMPERATURE_TOLERANCE_C as BUILD_TEMP } from '../../build/src/products.js';
import { H2C_LOW_END_C as BUILD_LOW_END } from '../../build/src/normalize/process.js';
import { refusedBy } from '../../app/js/ui/material-facts.js';
import { realDb, privateCopy, privateText, source } from './real.mjs';

const headlines = (field) => realDb().registry.headlines.filter((h) => h[field] != null);
const distinct = (xs) => [...new Set(xs)];

/** A bar that passes every other test of the headline, so only the condition under test can refuse it. */
const bar = (h, extra) => ({
  numeric: true, property: h.valueProperties[0], unit: h.unit, specimenType: 'Printed specimen', specimenForm: 'printed',
  moistureState: 'dry', postProcessingState: 'as-printed', notch: h.notch ?? undefined, direction: h.direction ?? 'XY', standards: [], ...extra,
});

test('the constants are the old ones', () => {
  assert.equal(TEST_TEMPERATURE_TOLERANCE_C, BUILD_TEMP);
  assert.equal(H2C_LOW_END_C, BUILD_LOW_END);
  assert.equal(privateCopy('build/src/products.js', /^const LOAD_TOLERANCE_MPA = ([\d.]+);$/m).value, LOAD_TOLERANCE_MPA);
  // compile.js conditionNote reads the build's exported constant; refusedBy writes the two numbers as literals.
  assert.match(source('build/src/compile.js'), /Math\.abs\(m\.testTemperatureC - def\.testTemperatureC\) > TEST_TEMPERATURE_TOLERANCE_C\)/);
  assert.match(source('app/js/ui/material-facts.js'), /Math\.abs\(x\.testTemperatureC - h\.testTemperatureC\) > 2\)/);
  assert.match(source('app/js/ui/material-facts.js'), /Math\.abs\(x\.thermal\.loadMPa - h\.loadMPa\) > 0\.01\)/);
});

test('test temperature: every real stated temperature against every headline that sets one, in assess and in refusedBy', () => {
  const temps = distinct(realDb().measurements.map((m) => m.testTemperatureC).filter((t) => t != null));
  const hs = headlines('testTemperatureC');
  assert.ok(temps.length > 20 && hs.length >= 2, `${temps.length} temperatures, ${hs.length} headlines`);
  let off = 0;
  for (const h of hs) {
    for (const t of [...temps, h.testTemperatureC - 2, h.testTemperatureC + 2, h.testTemperatureC - 2.001, h.testTemperatureC + 2.001]) {
      const want = offTestTemperature(t, h.testTemperatureC);
      const side = t < h.testTemperatureC ? 'cold' : 'hot';
      const built = assess(bar(h, { testTemperatureC: t }), h, []);
      assert.equal(built.why === 'cold' || built.why === 'hot', want, `assess ${h.key} at ${t} °C: ${built.why}`);
      if (want) assert.equal(built.why, side);
      const page = refusedBy(bar(h, { testTemperatureC: t }), h, { ms: [] });
      assert.equal(page === 'cold' || page === 'hot', want, `refusedBy ${h.key} at ${t} °C: ${page}`);
      if (want) { assert.equal(page, side); off++; }
    }
  }
  assert.ok(off > 0);
});

test('test load: every real stated load against every headline that sets one, in assess and in refusedBy', () => {
  const loads = distinct(realDb().measurements.filter((m) => m.thermal?.loadStated).map((m) => m.thermal.loadMPa));
  const hs = headlines('loadMPa');
  assert.ok(loads.length >= 2 && hs.length >= 2, `${loads.length} loads, ${hs.length} headlines`);
  for (const h of hs) {
    for (const load of loads) {
      const want = offLoad(load, h.loadMPa);
      const x = bar(h, { thermal: { loadStated: true, loadMPa: load } });
      assert.equal(assess(x, h, []).why === 'load', want, `assess ${h.key} at ${load} MPa`);
      assert.equal(refusedBy(x, h, { ms: [] }) === 'load', want, `refusedBy ${h.key} at ${load} MPa`);
    }
  }
});

test('the estimate stage\'s 0.45 MPa band agrees with the load tolerance on every real stated load', () => {
  // observations.js:113, inside a module-private function: its condition, read from the source and run as written.
  const old = new Function('load', `return ${privateText('build/src/estimate/observations.js', /^\s*if \((load >= [\d.]+ && load <= [\d.]+)\) return `HDT 0\.45/m)};`);
  assert.equal(ESTIMATE_LOW_LOAD_BAND_MPA.lo, 0.44);
  assert.equal(ESTIMATE_LOW_LOAD_BAND_MPA.hi, 0.46);
  const loads = distinct(realDb().measurements.filter((m) => m.thermal?.loadStated).map((m) => m.thermal.loadMPa));
  for (const load of loads) {
    assert.equal(inEstimateLowLoadBand(load), old(load), `${load}`);
    assert.equal(inEstimateLowLoadBand(load), !offLoad(load, 0.45), `${load} MPa: the band and the tolerance disagree on real data`);
  }
});

test('known: the band and the tolerance disagree at exactly 0.44 and 0.46 MPa (docs/next/defects.md WP07-D1); no real load sits there', () => {
  for (const load of [0.44, 0.46]) {
    assert.equal(inEstimateLowLoadBand(load), true, `${load} is in the estimate band`);
    assert.equal(offLoad(load, 0.45), true, `${load} is off the 0.45 MPa headline by more than 0.01 in floating point`);
  }
  const loads = realDb().measurements.filter((m) => m.thermal?.loadStated).map((m) => m.thermal.loadMPa);
  assert.ok(!loads.includes(0.44) && !loads.includes(0.46));
});
