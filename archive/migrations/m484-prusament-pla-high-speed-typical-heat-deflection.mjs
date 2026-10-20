#!/usr/bin/env node
// Migration m484 (2026-10-20): Prusament PLA High Speed's data sheet heat deflection at 0.45 MPa, never transcribed (the
// independent review of the owner's rulings track T1, F3).
//
// Prusa Polymers' data sheet for Prusament PLA High Speed prints, on p. 2 under "Typical material properties",
// "Heat Deflection Temperature (0.45 MPa) [°C] 57 ISO 75" beside "Heat Deflection Temperature (1.80 MPa) [°C] 55 ISO 75";
// the reader round recorded the 1.8 MPa row (V013554, m342) and not this one. The product page repeats the 57 °C
// ("High-temperature resistance 57 °C; At 0.45 MPa load", V013530), where its Horizontal rows imply a printed bar; the
// data sheet, which speaks for the product first (D171), prints the figure in a table it sets apart from its "Mechanical
// properties of 3D printed testing specimens" (D172). Recorded as the sheet prints it, its bar undescribed; with it the
// rule that a better document's set-apart figure sets apart the same figure on a lower-ranked one (markOutranked) reaches
// the product page's copy. Both rows are checked on the cached, hash-checked sheet first. A re-run is a no-op; a run
// after the data moved stops.
//
//   node scripts/migrate/m484-prusament-pla-high-speed-typical-heat-deflection.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { addValue } from '../../scripts/lib/source-edits.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm484';
const SOURCE = 'S-PVB-269cd3c8-prusament-pla-hs-technical-datasheet';
const t = openTables();
const like = t.get('measurements', 'V013554');
if (like.SourceID !== SOURCE || like.GradeID !== 'G001-87') throw new Error(`${MIGRATION}: V013554 is not Prusament PLA High Speed's data sheet row`);
onCachedSheet(t, SOURCE, 'Typical material properties | Heat Deflection Temperature (0.45 MPa) [°C] 57 ISO 75', MIGRATION);
onCachedSheet(t, 'PR-prusament-pla-high-speed', 'High-temperature resistance 57 °C; At 0.45 MPa load', MIGRATION);
const id = addValue(t, {
  like: 'V013554', migration: MIGRATION, date: '2026-10-20',
  why: 'published in the source, never transcribed (the review of the owner\'s rulings track T1, F3).',
  set: {
    'Raw value': '57', 'Raw numeric': '57', 'Normalized value': '57', 'Standard / load': 'ISO 75; 0.45 MPa', Standards: 'ISO 75', 'Test load MPa': '0.45',
    'Specimen type': 'Not published (do not assume printed)', Direction: 'Not applicable', Locator: 'p. 2: Heat Deflection Temperature (0.45 MPa) [°C]',
  },
  note: 'p. 2, "Heat Deflection Temperature (0.45 MPa) [°C]" under "Typical material properties": the page prints "57" (ISO 75). The sheet sets that table apart from its "Mechanical properties of 3D printed testing specimens" (D172), so the bar is undescribed; the product page\'s 57 °C (V013530) repeats it.',
});
if (id) { t.save(); console.log(`${MIGRATION}: recorded as ${id}`); } else console.log(`${MIGRATION}: 0 value(s) recorded`);
