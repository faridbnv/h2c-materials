#!/usr/bin/env node
// Migration m304 (2026-10-02): two copies of Eryone's PETG-GF sheet on one product (D72's retired duplicates).
//
// R-ERYONE-PETG-GF-TDS and Eryone's file-manager copy (…eryone--881af5) are the same "Technical Data Sheet (TDS) PETG-GF",
// both recorded on G025-02. Their X-Z rows differed only in the direction they were read with ("Stated, not a usable
// direction" on one, XZ on the other), which hid the copy; m301 made both Z, and MEAS-CROSS-SOURCE-TWIN found it. The
// file-manager copy holds every row the other does and two more (melt flow, impact), so it stays, and each row of the
// other is retired as a duplicate naming its twin. No value moves: the product held each number twice.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m304-eryone-petg-gf-copy.mjs
import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm304';
const COPY = 'R-ERYONE-PETG-GF-TDS';
const KEEP = 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--881af5';
const t = openTables();
const live = (m) => !/^Retired/.test(m['Data status']);
const key = (m) => [m.GradeID, m.Property, m.Direction, m['Normalized value'], m['Normalized unit'], m['Specimen type']].join('|');
const kept = new Map(t.rows('measurements').filter((m) => m.SourceID === KEEP && live(m)).map((m) => [key(m), m.MeasurementID]));
let retired = 0;
for (const m of t.rows('measurements').filter((x) => x.SourceID === COPY && live(x))) {
  const twin = kept.get(key(m));
  if (!twin) throw new Error(`${MIGRATION}: ${m.MeasurementID} (${m.Property} ${m['Normalized value']}) has no twin on ${KEEP}`);
  t.set('measurements', m.MeasurementID, 'Data status', 'Retired duplicate record', { expect: m['Data status'], migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', withNote(m.Notes, `Retired 2026-10-02 (${MIGRATION}): a copy of ${twin} from another copy of the same Eryone PETG-GF sheet (${KEEP}).`), { expect: m.Notes, migration: MIGRATION });
  retired++;
}
if (retired) t.save();
console.log(`${MIGRATION}: ${retired} row(s) of the copy retired as duplicates`);
