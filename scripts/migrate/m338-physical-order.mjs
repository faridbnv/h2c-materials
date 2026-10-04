#!/usr/bin/env node
// Migration m338 (2026-10-04): what the stress at break may not exceed (data/tables/physical_relations.csv PR09, D126).
//
// The reader round made the physical orderings data, and added the one the lint did not know: the stress at break is
// at most the ultimate tensile strength of the same test. Three pairs on two products broke it; each sheet was read again
// (cached, hash-checked) and prints exactly what the rows hold, so the numbers stay and the sheet's contradiction is
// flagged (AGENTS.md, "Flag a value physics rules out"):
//   - Spectrum PP (G082-03) prints "Tensile Stress 12 Mpa" beside "Tensile Strength at Yield 16 Mpa" and "Tensile
//     Strength at Break 26 Mpa". A stress below both is not the bar's ultimate strength; it reads as a stress at a strain
//     the sheet does not name. The 12 is flagged; the yield and break stand.
//   - extrudr PLA basic (G001-34), on both its sheets, prints "Tensile strength ASTM D882 MPa 53" above "Stress at break
//     ASTM D882 MPa 60". Which one is misprinted the sheet does not say, so both of each pair are flagged.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m338-physical-order.mjs
import { openTables } from '../data/table-io.mjs';
import { onSheet } from './m277-m279-sweep-shared.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm338';
const FLAG = 'Published value (physically implausible)';
const t = openTables();

const SPECTRUM = 'The sheet prints "Tensile Stress 12 Mpa" beside "Tensile Strength at Yield 16 Mpa" and "Tensile Strength at Break 26 Mpa": a stress below the yield and break strength of the same bar is not its ultimate strength (physical_relations PR06, PR09); it reads as a stress at a strain the sheet does not name. Kept as printed, flagged';
const EXTRUDR = 'The sheet prints "Tensile strength ASTM D882 MPa 53" and "Stress at break ASTM D882 MPa 60": the stress at break cannot exceed the tensile strength of the same test (physical_relations PR09), and the sheet does not say which is misprinted. Kept as printed, both flagged';
const FLAGS = [
  { id: 'V002767', value: '12', quote: 'Tensile Stress 12 Mpa | Tensile Strength at Yield 16 Mpa | Tensile Strength at Break 26 Mpa', why: SPECTRUM },
  { id: 'V004256', value: '53', quote: 'Tensile strength ASTM D882 MPa 53 | Stress at break ASTM D882 MPa 60', why: EXTRUDR },
  { id: 'V004257', value: '60', quote: 'Tensile strength ASTM D882 MPa 53 | Stress at break ASTM D882 MPa 60', why: EXTRUDR },
  { id: 'V006410', value: '53', quote: 'Tensile strength ASTM D882 MPa 53 | Stress at break ASTM D882 MPa 60', why: EXTRUDR },
  { id: 'V006411', value: '60', quote: 'Tensile strength ASTM D882 MPa 53 | Stress at break ASTM D882 MPa 60', why: EXTRUDR },
];

let flagged = 0;
for (const f of FLAGS) {
  const r = t.get('measurements', f.id);
  if (r['Data status'] === FLAG) continue;
  if (r['Normalized value'] !== f.value) throw new Error(`${MIGRATION}: ${f.id} holds ${r['Normalized value']}, not ${f.value}`);
  onSheet(t, r.SourceID, f.quote, MIGRATION);
  t.set('measurements', f.id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', f.id, 'Notes', withNote(r.Notes, `${f.why} (${MIGRATION}, 2026-10-04).`), { expect: r.Notes, migration: MIGRATION });
  flagged++;
}
if (flagged) t.save();
console.log(`${MIGRATION}: ${flagged} value(s) flagged physically implausible`);
