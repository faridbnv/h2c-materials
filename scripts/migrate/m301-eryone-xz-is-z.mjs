#!/usr/bin/env node
// Migration m301 (2026-10-02): Eryone's template labels its upright, across-the-layers tensile bar "X-Z" (the owner's
// ruling of 2026-10-02; OPEN-PROBLEMS §18; D92, D123).
//
// Eryone's sheets print one table template, "Part III Mechanical Properties of Printed Samples", with a tensile row per
// bar, "X-Y" and "X-Z". m191 made two of them Z because those sheets say what the bar is ("a Z-axis tensile strength
// approaching 20 MPa" beside X-Z 19.1 MPa; "its Z-axis tensile strength reaches 34 MPa" beside X-Z 34.2 MPa), and left
// the others as labelled (27 sheets, one of them read with "Stated, not a usable direction"), since nothing on their
// page says how the bar stood: applying the two sheets' words to the
// template was a ruling, not a reading. The owner took the recommendation to rule it: the template's "X-Z" bar is the Z
// bar, on every Eryone sheet of that template, and its tensile rows (strength, modulus, elongation) are Direction Z, the
// layer strength (D92). A Claude Sonnet reader confirmed on each cached sheet that the row is the template's "X-Z" row
// (m301-eryone-xz.csv: the label quoted, the layout checked); the quote is checked here again.
//
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m301-eryone-xz-is-z.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm301';
const RULING = 'Eryone\'s template labels its upright bar "X-Z", as two of its sheets say (m191): Z by the owner\'s ruling of 2026-10-02 (D123)';
const TENSILE = /^(Tensile strength \(endpoint unspecified\)|Tensile modulus|Elongation at break)$/;
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
let moved = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-eryone-xz.csv`))) {
  if (e.template_ok !== 'yes') continue;
  onSheet(t, e.source, e.label_quote, MIGRATION);
  for (const id of e.ids.split(';')) {
    const m = t.get('measurements', id);
    if (m.SourceID !== e.source) throw new Error(`${MIGRATION}: ${id} cites ${m.SourceID}, not ${e.source}`);
    if (!TENSILE.test(m.Property)) throw new Error(`${MIGRATION}: ${id} is ${m.Property}, not a tensile row`);
    if (m.Direction === 'Z') continue;
    if (!['XZ', 'Stated, not a usable direction'].includes(m.Direction)) throw new Error(`${MIGRATION}: ${id} is ${m.Direction}; the data moved since this migration was written`);
    t.set('measurements', id, 'Direction', 'Z', { expect: m.Direction, migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(m.Notes, `Direction Z since 2026-10-02 (${MIGRATION}): the sheet labels the bar "X-Z"; ${RULING}.`), { expect: m.Notes, migration: MIGRATION });
    moved++;
  }
}
if (moved) t.save();
console.log(`${MIGRATION}: ${moved} tensile row(s) of Eryone's "X-Z" bar are Z`);
