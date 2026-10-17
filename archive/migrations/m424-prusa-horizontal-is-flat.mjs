#!/usr/bin/env node
// Migration m424 (2026-10-17): Prusa Polymers' "Horizontal" test bar is the flat XY bar, and its "Vertical xz" the bar on
// its edge (D143; data review fixes, item 3; read on the cached sheets and their rendered pages by Claude Opus).
//
// Every Prusament data sheet heads its printed-specimen table "Property\Print Direction | Horizontal | Vertical xz"
// (the TPU 95A sheet "Horizontal" alone), and the database typed the two columns as the sheet's own words, "Horizontal
// (source label)" and "Vertical XZ (source label)", which are compared with nothing: 201 values of 19 Prusament
// products stood beside every XY and Z value without being one. Prusa's own documents say what the columns are:
// - The PLA High Speed sheet (S-PVB-269cd3c8-…, p. 2) prints "Tensile strength anisotropy coefficient (3) 0.6" with the
//   note "(3) Tensile strength anisotropy coefficient characterizes the ratio between tensile strength in the Z axis and
//   in the XY axis", beside "Interlayer Adhesion [MPa] 41 ± 3" and the Horizontal "Tensile Yield Strength [MPa] 68 ± 1":
//   41 / 68 = 0.60. The tensile strength "in the XY axis" is the Horizontal column's (the filament's 64 and the Vertical
//   xz bar's 65 give 0.64 and 0.63).
// - Prusa's PLA High Speed page (PR-prusament-pla-high-speed) gives the coefficient of three more products, "PLA and PC
//   Blend both have r = 0.33, whereas PETG has r = 0.38", and each is that product's interlayer adhesion over its
//   Horizontal tensile yield strength: PLA 17 / 51 = 0.33, PC Blend 21 / 63 = 0.33, PETG 18 / 47 = 0.38.
// - The later edition of the same template, on Prusament PA11's sheet (in the import ledger, not registered; SHA-256
//   dc108feb91aa1ac51f0de672c29ca2697fbd27cdbfd2f59d8e198ed29746f0f9, p. 2), heads the columns "Horizontal xy |
//   Vertical xz", and its coefficient 0.84 is 32 / 38.3 again.
// - The Vertical xz bar is printed standing on its edge, in the XZ plane, and pulled along its layers: its strength is
//   the Horizontal bar's or more (PLA 59 against 51) and two to five times the sheet's own interlayer adhesion, which is
//   the Z value. ISO/ASTM 52921 calls such a bar XZ, the sheet's own label.
// So every Horizontal value of a Prusament sheet is XY and every Vertical xz value is XZ (shown, and never compared with
// XY or Z, D92, D140). Each row's sheet is checked for its column heading. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m424-prusa-horizontal-is-flat.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm424';
const DATE = '2026-10-17';
const TO = { 'Horizontal (source label)': 'XY', 'Vertical XZ (source label)': 'XZ' };
const WHY = {
  XY: 'Prusa\'s "Horizontal" column is the flat bar its own documents call the XY axis (D143): the PLA High Speed sheet\'s anisotropy coefficient, Z over XY tensile strength, is its interlayer adhesion over its Horizontal tensile strength, and the template\'s later edition heads the column "Horizontal xy".',
  XZ: 'Prusa\'s "Vertical xz" column is the bar printed on its edge, in the XZ plane, and pulled along its layers (D143): it is as strong as the Horizontal bar or stronger, far above the sheet\'s own interlayer adhesion, and ISO/ASTM 52921 names it XZ, the sheet\'s label.',
};

const t = openTables();
// The proof, checked on the pages it is read from.
onCachedSheet(t, 'S-PVB-269cd3c8-prusament-pla-hs-technical-datasheet', 'Interlayer Adhesion [MPa] 41 ± 3 | Tensile strength anisotropy coefficient characterizes the ratio between tensile strength in the Z axis and in the XY axis | Tensile Yield Strength [MPa] 68 ± 1', MIGRATION);
onCachedSheet(t, 'PR-prusament-pla-high-speed', 'PLA and PC Blend both have r = 0.33, whereas PETG has r = 0.38', MIGRATION);
const rows = t.rows('measurements').filter((m) => TO[m.Direction]);
const sheets = new Set(rows.map((m) => m.SourceID));
for (const sid of sheets) {
  if (!/^(S-PVB-|PR-prusament)/.test(sid)) throw new Error(`${MIGRATION}: ${sid} is not a Prusa Polymers sheet; D143 speaks for Prusa's template only`);
  onCachedSheet(t, sid, sid.startsWith('PR-') ? 'Horizontal' : 'Property\\Print Direction Horizontal', MIGRATION);
}
let n = 0;
for (const m of rows) {
  const to = TO[m.Direction];
  t.set('measurements', m.MeasurementID, 'Direction', to, { expect: m.Direction, migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', withNote(m.Notes, `Direction ${to}, was "${m.Direction}", since ${DATE} (${MIGRATION}): ${WHY[to]}`), { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) on ${sheets.size} Prusa Polymers sheets typed with the build direction Prusa's documents give their columns`);
