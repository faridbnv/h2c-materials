// Display formatting that must not contradict a verdict (audit 2026-09-15, A-01).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fmtAgainst, fmtNumber, fmtRange, fmtRangeParts, rangeStep, estimateDisplay, readableUnit } from '../app/js/ui/format.js';
import { compareInterval, STATUS } from '../app/js/engine/constraints.js';

test('a number is never rounded across a requirement on its column', () => {
  const cases = [[50.99, '<', 51], [27.99, '<=', 27.99], [107.4, '>', 107.2], [53.05, '>', 53], [1.755, '>', 1.75], [2.758, '>=', 2.76], [115.98, '>=', 116], [99.6, '>=', 100]];
  for (const [v, operator, value] of cases) {
    const shown = Number(fmtAgainst(v, [{ operator, value }]).replace(/,/g, ''));
    const side = (x) => compareInterval({ lo: x, hi: x }, operator, value) === STATUS.PASS;
    assert.equal(side(shown), side(v), `${v} shown as ${shown} for ${operator} ${value}`);
  }
  // Without a requirement nearby the usual precision stands.
  assert.equal(fmtAgainst(50.99, []), fmtNumber(50.99));
  assert.equal(fmtAgainst(4.431, [{ operator: '>=', value: 3 }]), '4.43');
});

// Estimated ranges (plan D3): both ends on one step, so a rough estimate never shows more digits than it carries, and
// rounded outward, so the printed range always contains the range it stands for.

test('an estimated range prints both ends on one step, from its width and magnitude, rounded outward', () => {
  const cases = [
    // OBC's stiffness and stretch, which read "0.00896–0.203" GPa and "731–1,390" %.
    [0.00896, 0.203, '0.008–0.21'],
    [731, 1390, '730–1,390'],
    [197, 1030, '190–1,030'],
    // A wide range still keeps its lower end: on a step of a fifth of the width PA6's strength read "40–110".
    [49.5, 107, '49–107'],
    [109, 159, '109–159'],
    // The decimals are kept, so both ends read to the same place.
    [2.4, 6.98, '2.4–7.0'],
    [1.9, 5.29, '1.9–5.3'],
    [0.917, 2.12, '0.9–2.2'],
    // Rounded to the nearest, 46.9–57.5 read "47–58", narrower than the range at its bottom.
    [46.9, 57.5, '46–58'],
    [55.1, 118, '55–118'],
    [87.1, 112, '87–112'],
    [54.5, 118, '54–118'],
    // A narrow range never gains digits over a single number's three significant digits.
    [1150, 1240, '1,150–1,240'],
    [270, 285, '270–285'],
    [0.00805, 0.0506, '0.008–0.051'],
    // Outward below zero too: the lower end goes further below.
    [-5.5, 12.3, '-6–13'],
  ];
  for (const [lo, hi, want] of cases) assert.equal(fmtRange(lo, hi), want, `${lo}–${hi}`);
  // An open end is a dash, and the other end keeps its ordinary digits, rounded outward; equal ends likewise.
  assert.equal(fmtRange(null, 3), '—–3');
  assert.equal(fmtRange(null, 3.456), '—–3.46');
  assert.equal(fmtRange(45, 45), '45–45');
  assert.equal(fmtRange(45.678, 45.678), '45.6–45.7');
  // A value inside the range, such as its centre, is on the same step and keeps nearest rounding.
  assert.deepEqual(fmtRangeParts(0.00896, 0.203, 0.0426), ['0.008', '0.21', '0.04']);
  assert.deepEqual(fmtRangeParts(46.9, 57.5, 50.8), ['46', '58', '51']);
  // Measured single values are untouched.
  assert.equal(fmtNumber(0.00896), '0.00896');
  assert.equal(fmtNumber(731), '731');
});

const shownNumber = (s) => Number(String(s).replace(/,/g, ''));

test('every estimate in the database: one step, three significant digits at most, and the printed range contains the true one', () => {
  const db = JSON.parse(readFileSync(new URL('../dist/db.json', import.meta.url), 'utf8'));
  const decimals = (s) => (s.split('.')[1] ?? '').length;
  // Trailing zeros of a whole number are placeholders ("1,000" has one significant digit); after a decimal point they count.
  const significant = (s) => {
    const [whole, fraction] = s.replace(/[,-]/g, '').split('.');
    return fraction === undefined ? whole.replace(/^0+/, '').replace(/0+$/, '').length || 1 : `${whole}${fraction}`.replace(/^0+/, '').length;
  };
  // A printed range must contain the true one, read back from the string exactly as a reader would read it.
  const contains = (what, [lo, hi], trueLo, trueHi) => {
    assert.ok(shownNumber(lo) <= trueLo + 1e-9 * Math.abs(trueLo), `${what}: printed low end ${lo} is above ${trueLo}`);
    assert.ok(shownNumber(hi) >= trueHi - 1e-9 * Math.abs(trueHi), `${what}: printed high end ${hi} is below ${trueHi}`);
  };
  let n = 0;
  for (const m of db.materials) {
    for (const [key, h] of Object.entries(m.headline)) {
      const e = !h?.known && h?.estimate;
      if (!e || !Number.isFinite(e.lo) || !Number.isFinite(e.hi) || e.lo === e.hi) continue;
      n++;
      const what = `${m.name} ${key} ${e.lo}–${e.hi}`;
      const step = rangeStep(e.lo, e.hi);
      const [lo, hi] = fmtRangeParts(e.lo, e.hi);
      assert.ok(significant(hi) <= 3, `${what} shows ${hi}`);
      // Ten or more steps across the range, unless three digits of the larger end are coarser still.
      assert.ok((e.hi - e.lo) / step >= 10 || step === 10 ** (Math.floor(Math.log10(e.hi)) - 2), `${what} step ${step}`);
      // Outward, and never by more than one step.
      contains(what, [lo, hi], e.lo, e.hi);
      assert.ok(shownNumber(hi) - e.hi < step + 1e-12, `${what}: high end ${hi} more than a step above`);
      // The low end is on the same step, or keeps one significant digit of its own where the step is coarser than it.
      const ownLo = 10 ** Math.floor(Math.log10(e.lo));
      if (ownLo >= step) assert.equal(decimals(lo), decimals(hi), `${what}: ${lo}–${hi}`);
      else assert.equal(significant(lo), 1, `${what}: ${lo}`);
      assert.ok(e.lo - shownNumber(lo) < Math.min(step, ownLo) + 1e-12, `${what}: low end ${lo} more than a step below`);
      // Outward rounding never widens the range by more than a tenth of its width at either end, so a printed estimate
      // is not read as rougher than it is.
      const width = e.hi - e.lo;
      assert.ok(e.lo - shownNumber(lo) <= width / 10 + 1e-12 && shownNumber(hi) - e.hi <= width / 10 + 1e-12, `${what}: ${lo}–${hi} moves an end by more than a tenth of the width`);

      // Every view of it: in its column's unit and in the drawer's own unit, likely and plausible ranges alike.
      for (const ownUnit of [false, true]) {
        const d = estimateDisplay(e, { ownUnit });
        const factor = d.rescaled ? readableUnit(e.unit, e.hi).factor : 1;
        contains(`${what} (${d.unit})`, [d.lo, d.hi], e.lo * factor, e.hi * factor);
        if (e.plausible && Number.isFinite(e.plausible.lo) && Number.isFinite(e.plausible.hi)) {
          contains(`${what} plausible (${d.unit})`, d.plausible, e.plausible.lo * factor, e.plausible.hi * factor);
        }
        if (d.inColumn) contains(`${what} in its column`, d.inColumn, e.lo, e.hi);
      }
    }
    // The estimated print windows the Printing columns and the drawer show.
    for (const k of ['nozzleEstimate', 'bedEstimate', 'chamberEstimate']) {
      const w = m.print?.[k];
      if (w && Number.isFinite(w.lo) && Number.isFinite(w.hi)) contains(`${m.name} ${k}`, fmtRange(w.lo, w.hi).split('–'), w.lo, w.hi);
    }
  }
  assert.ok(n > 50, `only ${n} estimates checked`);
});

test('a range printed with its unit may read in a smaller prefix, and then names its column unit', () => {
  assert.deepEqual(readableUnit('GPa', 0.203), { unit: 'MPa', factor: 1000 });
  assert.deepEqual(readableUnit('GPa', 2.1), { unit: 'GPa', factor: 1 });
  assert.deepEqual(readableUnit('%', 0.5), { unit: '%', factor: 1 });
  const obc = { lo: 0.00896, hi: 0.203, centre: 0.0426, plausible: { lo: 0.00592, hi: 0.307 }, unit: 'GPa' };
  const own = estimateDisplay(obc, { ownUnit: true });
  assert.deepEqual([own.lo, own.hi, own.centre, own.unit, own.rescaled], ['8', '210', '40', 'MPa', true]);
  assert.deepEqual(own.inColumn, ['0.008', '0.21']);
  // The plausible range is on the likely range's step, so it never seems to start inside the likely one.
  assert.deepEqual(own.plausible, ['5', '310']);
  const column = estimateDisplay(obc);
  assert.deepEqual([column.lo, column.hi, column.unit, column.rescaled, column.inColumn], ['0.008', '0.21', 'GPa', false, null]);
  const pa66cf = estimateDisplay({ lo: 3.85, hi: 7.87, centre: 5.51, plausible: { lo: 3.51, hi: 8.65 }, unit: 'GPa' });
  assert.deepEqual(pa66cf.plausible, ['3.5', '8.7']);
});
