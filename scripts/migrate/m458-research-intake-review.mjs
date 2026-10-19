#!/usr/bin/env node
// Migration m458 (2026-10-19): what the research intake's independent review found in the records the round entered
// (docs/audits/2026-10-19-research-intake/README.md, "Review").
//
// - R02: Filamatrix tests its bars "3D printed ... using Ultimaker 2+; 100 % infill; y-axis orientation" (both data
//   sheets' footnote). On a printer the Y axis lies in the bed, so a bar along it is a flat bar, XY; m454 had typed the
//   ten rows "Stated, not a usable direction", which kept them from deciding anything.
// - R07: QIDI PA612-CF's three heat deflections m454 added sit in the sheet's one property table of printed specimens,
//   as the held 1.80 MPa row beside them (V009352) is typed; they were typed "do not assume printed".
// - R04: the class limit CL02 (a density no unfilled product can pass) decides for every polymer whose row names a
//   registered source, which is 38 since m453 cited producers' sheets for PCTG, HIPS, PA6/66 and PVB; its Basis said 32.
// Each edit names the value it replaces; a re-run is a no-op.
//
//   node scripts/migrate/m458-research-intake-review.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from '../lib/read-proposals-apply.mjs';
import { withNote } from '../lib/source-edits.mjs';

const MIGRATION = 'm458';
const t = openTables();
let n = 0;
const set = (table, id, column, value, expect) => { if (t.get(table, id)[column] === value) return; t.set(table, id, column, value, { expect, migration: MIGRATION }); n++; };

// R02
onCachedSheet(t, 'R-FILAMATRIX-INTAKE-20261019-c033c19c5de7', '100 % infill; y-axis orientation', MIGRATION);
onCachedSheet(t, 'R-FILAMATRIX-INTAKE-20261019-341954211950', 'y-axis orientation', MIGRATION);
const AXIS = 'The footnote\'s "y-axis orientation" is a bar lying along Y in the build plane: XY (m458, the research intake\'s review).';
for (const id of ['V015611', 'V015613', 'V015642', 'V015643', 'V015644', 'V015645', 'V015646', 'V015647', 'V015648', 'V015649']) {
  const m = t.get('measurements', id);
  if (m.Direction === 'XY') continue;
  set('measurements', id, 'Direction', 'XY', 'Stated, not a usable direction');
  t.set('measurements', id, 'Notes', withNote(m.Notes, AXIS), { expect: m.Notes, migration: MIGRATION });
}

// R07
onCachedSheet(t, 'R-QIDI-PA12-CF', 'Specimens printed under the following conditions', MIGRATION);
const PRINTED = 'The sheet\'s property table is of printed specimens ("Specimens printed under the following conditions", p. 3), as V009352 beside it is typed (m458).';
for (const id of ['V015636', 'V015637', 'V015638']) {
  const m = t.get('measurements', id);
  if (m['Specimen type'] === 'Printed specimen') continue;
  set('measurements', id, 'Specimen type', 'Printed specimen', 'Not published (do not assume printed)');
  t.set('measurements', id, 'Notes', withNote(m.Notes, PRINTED), { expect: m.Notes, migration: MIGRATION });
}

// R04
const cl = t.get('class_limits', 'CL02');
const before = 'It decides for the 32 polymers whose row names a registered source (22 of them recorded by stage 2c of the screening build); a polymer row that names none bounds nothing.';
if (cl.Basis.includes(before)) {
  set('class_limits', 'CL02', 'Basis', cl.Basis.replace(before, 'It decides for the 38 polymers whose row names a registered source (22 of them recorded by stage 2c of the screening build, and PCTG, HIPS, PA6/66 and PVB by the research intake, m453); a polymer row that names none bounds nothing.'), cl.Basis);
}

if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${n} cell(s) would change`); process.exit(0); }
t.save();
console.log(`${MIGRATION}: ${n} cell(s) changed`);
