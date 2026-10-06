#!/usr/bin/env node
// Migration m371 (2026-10-05): a bed the sheet calls optional, or not needed, is a recommendation, and an enclosure the
// page does not recommend is not needed (check round 3, D131; build/reports/table-detectors, negation).
//
// The negation sweep read every typed print cell beside its words and listed a positive reading on words that negate or
// hedge it. Ten were wrong, and each was a reading the parser did not know:
// - "not absolutely necessary, recommended 60-90°C" (PolyDissolve's sheet), "Nicht benötigt, 50 °C empfohlen" (not needed,
//   50 °C recommended: three German product pages), "40–60 °C Heated Bed Optional" (two pages) and Recreus's "Small
//   parts: No heating (room temperature); Large parts: 50-55°C" (three profiles of one sheet, the colon spelling of the
//   hedge m299 taught the parser) were typed as beds the filament requires; each is a window for a printer that heats
//   one, a recommendation;
// - "Enclosure is not recommended for PLA" was typed as recommending one, because the parser saw "recommended".
// The parser now reads each wording (build/src/normalize/process.js), and these profiles' typed cells are written from it.
// No bed here is above the H2C's 120 °C, so no bed verdict moves; the enclosure answer does. Each quote is checked on the
// cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m371-a-hedge-is-not-a-requirement.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';

const MIGRATION = 'm371';
const CELLS = [
  ['P1687', 'Bed °C'], ['P1688', 'Bed °C'], ['P1695', 'Bed °C'], ['P1698', 'Bed °C'], ['P1756', 'Bed °C'], ['P1761', 'Bed °C'],
  ['P1313', 'Bed °C'], ['P1353', 'Bed °C'], ['P1354', 'Bed °C'], ['P1778', 'Enclosure'],
];
const t = openTables();
let cells = 0;
for (const [id, column] of CELLS) {
  const p = t.get('profiles', id);
  // The words that hedge the cell, as the sheet prints them.
  const words = p[column].match(/not absolutely necessary|Nicht benötigt, 50 °C empfohlen|Heated Bed Optional|No heating|Enclosure is not recommended for PLA/)?.[0];
  if (!words) throw new Error(`${MIGRATION}: ${id}'s ${column} no longer holds the words this migration reads`);
  onCachedSheet(t, p.SourceID, words, MIGRATION);
  cells += retype(t, id, [column], MIGRATION);
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} typed cell(s) of ${CELLS.length} profiles read again: a hedged bed is recommended, a discouraged enclosure is not needed`);
