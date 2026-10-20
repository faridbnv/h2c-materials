#!/usr/bin/env node
// Migration m462 (2026-10-20): a heat deflection above its plastic's melting point (AGENTS.md, "Flag a value physics rules
// out"; D149).
//
// Eryone's PA12-CF data sheet prints "Heat distortion temperature(° C) ASTM D648 0.45MPa" 185 °C (V004841, p. 1) on a bar
// it does not describe. Polyamide 12 melts at about 178 °C (its material's products put the melting point at 174.5 °C,
// median), and the sheet's own melt index is measured at 210 °C: a bar cannot carry a load above the temperature at which
// its matrix melts, so the figure is not a heat deflection of this product. Until the owner's rulings of 2026-10-20 it
// was the product's comparable value and no estimate was made; set apart (D172), the product's own estimate was held up
// at 180 °C by this figure, above its melting point (EST-ORDER). The number is kept, flagged implausible, with the reason
// in Notes; it backs no product value, estimate or bound. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m462-a-heat-deflection-above-its-melting-point.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm462';
const t = openTables();
const m = t.get('measurements', 'V004841');
let n = 0;
if (m['Data status'] !== 'Published value (physically implausible)') {
  onCachedSheet(t, m.SourceID, 'Heat distortion temperature(° C) ASTM D648 0.45MPa', MIGRATION);
  const note = `Flagged physically implausible by ${MIGRATION} (2026-10-20): 185 °C at 0.45 MPa lies above the melting point of polyamide 12 (about 178 °C; its material's products put it at 174.5 °C, median), and the sheet measures its own melt index at 210 °C, so it cannot be a heat deflection of this product's bar.`;
  t.set('measurements', 'V004841', 'Data status', 'Published value (physically implausible)', { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', 'V004841', 'Notes', withNote(m.Notes, note), { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) flagged`);
