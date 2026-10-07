#!/usr/bin/env node
// Migration m403 (2026-10-07): colorFabb's varioShore TPU and varioShore Prosthetic TPU are a foaming grade (quality round
// 2026-10-07, item 4; D57, D129, D134).
//
// The round's outlier reading found varioShore's printed tensile strength (24 MPa, and 12 MPa in its foamed column) far
// below its material's, and the reader judged it right as printed: each sheet says "This special formulation has an active
// foaming technology", expanding the material "up to 1,6x its volume" at about 230 °C. That is the lightweight-additive
// variant PolyWood and Pegasus PP are filed as (a foaming agent lowers the density, and stiffness and strength move with
// it): its values stay its own and the estimate model keeps them from pulling its family. The Prosthetic grade is the same
// formulation (its sheet prints the same table and the same sentence, and it shares the key), so both are filed alike.
// Each quote is checked on the product's own cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m403-varioshore-foams.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm403';
const GRADES = [
  { grade: 'G039-25', source: 'R-COLORFABB-TDS-varioShore-TPU-95A', quote: 'This special formulation has an active foaming technology to achieve light' },
  { grade: 'G039-60', source: 'R-COLORFABB-TDS-varioShore-Prosthetic-TPU', quote: 'This special formulation has an active foaming technology to' },
];
const why = 'The sheet declares it: "This special formulation has an active foaming technology", expanding the material "up to 1,6x its volume" at about 230 °C. Its printed strength sits below what an unfoamed TPU of its hardness reaches; recorded as a Variant under D57 (quality round 2026-10-07, m403).';
const t = openTables();
let changed = 0;
for (const { grade, source, quote } of GRADES) {
  onCachedSheet(t, source, quote, MIGRATION);
  const g = t.get('grades', grade);
  if (g.Variant !== 'lightweight additive') { t.set('grades', grade, 'Variant', 'lightweight additive', { expect: 'Not applicable', migration: MIGRATION }); changed++; }
  const before = g['Composition / filler'];
  if (before !== why) {
    if (before !== 'Not published' && !before.includes(`${MIGRATION})`)) throw new Error(`${MIGRATION}: ${grade}'s Composition / filler moved: ${before}`);
    t.set('grades', grade, 'Composition / filler', why, { expect: before, migration: MIGRATION });
    changed++;
  }
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
