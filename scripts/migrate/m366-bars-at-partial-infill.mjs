#!/usr/bin/env node
// Migration m366 (2026-10-05): test bars printed at 20 % infill are labelled as such and decide nothing (D130; the
// owner's answer of 2026-10-05: "flagged, in a way that reading their info gives correct and aware info").
//
// Three 3DJake sheets (ABS-P, PLA and ASA) print their test bars' settings beside the values: "Infill: 20 %" (m358 put
// the words on the rows). A bar filled to 20 % measures a part that hollow, not the material as a solid part, and its
// strength and stiffness sit far below a solid bar's. Those values stay recorded and shown, with the Specimen type
// "Printed specimen at partial infill" (Form off-recipe), so the drawer says what they are and they never become a
// product's value, a bound or an estimate observation. The page statements that carry the block say the same, so a row
// that states no specimen of its own inherits it. Each quote is checked on the cached sheet. A re-run is a no-op, and a
// run after the data moved stops.
//
//   node scripts/migrate/m366-bars-at-partial-infill.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm366';
const SHEETS = ['R-3DJAKE-ABS-P-TDS-1', 'R-3DJAKE-PLA-TDS', 'R-3DJAKE-3DJAKE-ASA-TDS-1'];
const TYPE = 'Printed specimen at partial infill';
const INFILL = /Infill:\s*20\s*%/;
const t = openTables();
let statements = 0, rows = 0;

for (const sid of SHEETS) {
  onCachedSheet(t, sid, 'Infill: 20 %', MIGRATION);
  for (const c of t.rows('page_context').filter((x) => x.SourceID === sid && INFILL.test(x.Statement))) {
    if (c['Specimen type'] === TYPE) continue;
    t.set('page_context', c.PageContextID, 'Specimen type', TYPE, { expect: 'Printed specimen', migration: MIGRATION });
    statements++;
  }
  for (const m of t.rows('measurements').filter((x) => x.SourceID === sid && INFILL.test(x['Specimen / print parameters']))) {
    if (m['Specimen type'] !== 'Printed specimen') continue;
    t.set('measurements', m.MeasurementID, 'Specimen type', TYPE, { expect: 'Printed specimen', migration: MIGRATION });
    const after = t.get('measurements', m.MeasurementID);
    t.set('measurements', m.MeasurementID, 'Notes', withNote(after.Notes, `Specimen type "${TYPE}" (${MIGRATION}, D130): the sheet prints its bars at "Infill: 20 %", so the value is a part filled that far, not the material as a solid part; shown, never the product's value.`), { expect: after.Notes, migration: MIGRATION });
    rows++;
  }
}
if (statements || rows) t.save();
console.log(`${MIGRATION}: ${statements} page statement(s) and ${rows} measurement(s) labelled as bars printed at partial infill`);
