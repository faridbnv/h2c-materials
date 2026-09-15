// Display formatting that must not contradict a verdict (audit 2026-09-15, A-01).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtAgainst, fmtNumber } from '../app/js/ui/format.js';
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
