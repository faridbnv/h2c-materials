#!/usr/bin/env node
// Migration m485 (2026-10-20): a printed part's tensile strength is floored by printed bars only (the owner's ruling of
// 2026-10-20 on a test bar the sheet does not describe, D172; the independent review of track T1, F6).
//
// headline_definitions.csv: tensileStrengthXY's Lower bound specimens, `printed or not stated` since D126, becomes
// `printed`, as elongation's did in D161 and the heat deflection's in m466: a yield or break stress on a bar no document
// describes as printed (possibly a moulded bar's, which flatters a print) no longer floors a printed part's strength, so
// the ruling is one rule wherever a value bounds another. Back-tested before it was made
// (docs/audits/2026-10-20-owner-rulings/evidence/BACKTEST.md, the stage-4 method): the material rule's floors, hidden
// value by hidden value, hold 78.9 % in the likely range and 94.7 % in the plausible one with printed bars (86.0 and
// 93.0 % with undescribed bars too), with 2 hidden values under the plausible range instead of 4, and EST-CALIBRATION
// holds; no product's or material's value moves. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m485-tensile-strength-floored-by-printed-bars.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm485';
const t = openTables();
let n = 0;
if (t.get('headline_definitions', 'tensileStrengthXY')['Lower bound specimens'] !== 'printed') {
  t.set('headline_definitions', 'tensileStrengthXY', 'Lower bound specimens', 'printed', { expect: 'printed or not stated', migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} change(s)`);
