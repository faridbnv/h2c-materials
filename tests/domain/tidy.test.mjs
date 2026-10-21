// WP-07 copies agree: packages/domain tidy against the four old copies, on every number of a real build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tidy } from '../../packages/domain/src/core/tidy.ts';
import { tidy as ledgerTidy } from '../../app/js/engine/ledger.js';
import { realDb, privateCopy } from './real.mjs';

const TIDY = /^const tidy = (\(x\) => Number\(x\.toPrecision\(12\)\));$/m;
const COPIES = {
  'app/js/engine/ledger.js (exported)': ledgerTidy,
  ...Object.fromEntries(['build/src/products.js', 'app/js/engine/constraints.js', 'app/js/ui/print-spread.js']
    .map((file) => [file, privateCopy(file, TIDY).value])),
};

/** Every finite number in the build, and the sums, thirds and tenths a computation makes of them. */
function inputs() {
  const seen = new Set();
  const walk = (v) => {
    if (typeof v === 'number') seen.add(v);
    else if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(realDb());
  const real = [...seen].filter(Number.isFinite);
  const derived = real.flatMap((v, i) => [v / 3, v * 1.1, v + 0.1, v - 0.7, (v + (real[i + 1] ?? 0)) / 2, -v]);
  return { real, all: [...real, ...derived, 0, -0, 0.1 + 0.2, 1e-13, 1e21, NaN, Infinity, -Infinity] };
}

test('the ledger exports tidy, and the three private copies are each one line of the same text', () => {
  assert.equal(Object.keys(COPIES).length, 4);
  assert.equal(ledgerTidy.toString(), '(x) => Number(x.toPrecision(12))');
});

test('tidy equals every old copy on every number of the real build (Object.is)', () => {
  const { real, all } = inputs();
  assert.ok(real.length > 5_000, `expected thousands of distinct real numbers, found ${real.length}`);
  let checked = 0;
  for (const x of all) {
    const want = tidy(x);
    for (const [where, copy] of Object.entries(COPIES)) {
      const got = copy(x);
      if (!Object.is(got, want)) assert.fail(`${where}: tidy(${x}) = ${got}, the shared core gives ${want}`);
      checked++;
    }
  }
  assert.ok(checked >= real.length * 4);
});
