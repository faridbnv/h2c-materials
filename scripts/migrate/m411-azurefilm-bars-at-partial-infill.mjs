#!/usr/bin/env node
// Migration m411 (2026-10-07): the AzureFilm test-bar rows m366 did not reach, labelled as bars printed at 20 % infill
// (D130; completeness round, item 12c, D136).
//
// m366 labelled the rows of three 3DJake (AzureFilm) sheets whose print parameters named "Infill: 20 %". The import now
// reads that block itself (specimenInfill, scripts/ingest/propose.mjs), and its census over every cached document finds
// it on four registered sheets that still hold mechanical rows typed "Printed specimen": the silk PLA sheet (eight rows,
// all of its table), the second PLA sheet's tensile modulus, and ABS-P's tensile modulus, which m366 missed because the
// row did not carry the block's words. Each sheet's block ("Test specimens print settings ... Infill: 20 %") heads the
// table these rows are cells of; each quote is checked on the cached sheet. The rows stay, labelled, so they are shown
// and never a product's value. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m411-azurefilm-bars-at-partial-infill.mjs [--dry-run]
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm411';
const TYPE = 'Printed specimen at partial infill';
const MECHANICAL = /^(Tensile|Elongation|Flexural|Charpy|Izod|Impact|Compression)/;
// The sheet, its test-bar block as printed, and the rows of its table.
const SHEETS = {
  'R-3DJAKE-SILK-TDS-4': '3D printer: Creality Ender 3; Nozzle temperature: 230 °C; Infill: 20 %; Slicer: Cura; Bed temperature: 55 °C; Shells: 2; Nozzle: 0,4 mm; Print speed: 50 mm/s; Layer height: 0,2 mm',
  'R-3DJAKE-PLA-TDS-7': '3D printer: AzureFilm; Nozzle temperature: 200 °C; Infill: 20 %; Slicer: Cura; Bed temperature: 55 °C; Shells: 2; Nozzle: 0,4 mm; Print speed: 50 mm/s; Layer height: 0,3 mm',
  'R-3DJAKE-ABS-P-TDS-1': null, // its other rows carry the block already (m358); the modulus takes theirs
};
const t = openTables();
let n = 0;
for (const [sid, block] of Object.entries(SHEETS)) {
  onCachedSheet(t, sid, 'Infill: 20 %', MIGRATION);
  const rows = t.rows('measurements').filter((m) => m.SourceID === sid && MECHANICAL.test(m.Property) && !/^Retired/.test(m['Data status']));
  const words = block ?? rows.find((m) => /Infill: 20 %/.test(m['Specimen / print parameters']))?.['Specimen / print parameters'];
  if (!words) throw new Error(`${MIGRATION}: ${sid} has no row naming its test-bar block`);
  for (const m of rows) {
    if (m['Specimen type'] === TYPE) continue;
    t.set('measurements', m.MeasurementID, 'Specimen type', TYPE, { expect: 'Printed specimen', migration: MIGRATION });
    if (/^Not published$/.test(m['Specimen / print parameters'])) t.set('measurements', m.MeasurementID, 'Specimen / print parameters', words, { expect: 'Not published', migration: MIGRATION });
    const after = t.get('measurements', m.MeasurementID);
    t.set('measurements', m.MeasurementID, 'Notes', withNote(after.Notes, `Specimen type "${TYPE}" (${MIGRATION}, D130): the sheet's "Test specimens print settings" print "Infill: 20 %", so the value is a part filled that far, not the material as a solid part; shown, never the product's value.`), { expect: after.Notes, migration: MIGRATION });
    n++;
  }
}
if (process.argv.includes('--dry-run')) { console.log(`${MIGRATION}: ${n} row(s) (dry run)`); process.exit(0); }
if (n) t.save();
console.log(`${MIGRATION}: ${n} row(s) labelled as bars printed at partial infill`);
