#!/usr/bin/env node
// Migration m443 (2026-10-18): two carbon-fibre PETG densities lighter than plain PETG, a modulus whose label and
// standard name different tests, and a moulded bar read as unstated (D149; the screening review's changes C14 and C13,
// findings F26 and F25). Each page read by Claude Opus 5.5 on its cached text, and Recreus's on its rendered image.
//
// - Recreus PET-G CF prints "Material density 1,1 g/cm3 ISO 1183" for "a highly modified, carbon fibre-additivated
//   amorphous PET copolymer". Carbon fibre (about 1.8 g/cm³) makes a compound denser than its resin, and neat PETG is
//   1.22 to 1.30 (polymers.csv): a carbon-fibre PETG cannot weigh 1.1. Flagged physically implausible.
// - FormFutura CarbonFil's undated revision prints "Specific gravity 1.19 g/cc ISO 1183" for a PETG "reinforced with 20%
//   ... carbon fibres", which by the rule of mixtures is about 1.35; its 2024 revision (batch b46, m442) prints 1,32 for its
//   15 % fibre. Flagged physically implausible; the product's density is the 2024 sheet's.
//   The new check MEAS-PHYSICS-FILLED-DENSITY finds these two; eight more fibre-filled products print 1 to 2 % under their
//   neat polymer's minimum, within a density test's scatter and a filament's voids, and are left as published
//   (OPEN-PROBLEMS §17 names them).
// - purefil ABS prints "Tensile modulus (ASTM D790) 2700 MPa": ASTM D790 is the flexural test, and the sheet prints no
//   other modulus and no specimen. An ABS's tensile and flexural moduli are close, so the number does not say which test
//   it is, and the page does not either. Held back (Data status "Unresolved unit / layout"), as Extrudr's Izod rows whose
//   label and standard disagree on the notch are (m63): it no longer decides a tensile or a flexural requirement. Its
//   property and its Standards stay the page's words (Tensile modulus, ASTM D790).
// - iSANMATE PLA CF's table names "ISO 3167 A", ISO's injection-moulded multipurpose bar, in its Specimen column on every
//   row and says nothing of printing; its modulus, elongation, flexural and water rows are raw-material values (b29, by
//   the importer's rule of m198), but its tensile strength of 120 MPa, added by m410's reading, was left unstated and so
//   decided as a printed part's. It takes its siblings' specimen type.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m443-densities-and-a-modulus-label.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm443';
const DATE = '2026-10-18';
const FLAG = 'Published value (physically implausible)';
const HELD = 'Unresolved unit / layout';
const t = openTables();
let n = 0;

const CHANGES = [
  ['V015320', 'R-RECREUS-PET-G-CF-TECHNICAL-DATA-SHEET-TDS-2022', 'Density', FLAG, 'Material density 1,1 | ISO 1183 | carbon fibre-additivated amorphous PET copolymer', null,
    `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149): the sheet prints a density of 1,1 g/cm3 for "a highly modified, carbon fibre-additivated amorphous PET copolymer". Carbon fibre (about 1.8 g/cm³) makes a compound denser than its resin, and neat PETG is 1.22 to 1.30 g/cm³ (polymers.csv), so a carbon-fibre PETG cannot weigh 1.1; the sheet gives one significant figure and no fibre content. Kept as printed; it backs nothing.`],
  ['V009831', 'S-PET-TDS-CarbonFil', 'Density', FLAG, 'Specific gravity 1.19 g/cc ISO 1183 | reinforced with 20% ultra-light and relatively long stringer', ['R-FORMFUTURA-SB-20261018-7b525961687e', 'Specific gravity 1,32 g/cm3 ISO 1183 | CarbonFil is a 15% carbon fiber reinforced PETG'],
    `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149): this undated revision prints a specific gravity of 1.19 g/cc for a PETG "reinforced with 20% ... carbon fibres"; neat PETG is 1.22 to 1.30 g/cm³ and carbon fibre about 1.8, so 20 % of it gives about 1.35, and no carbon-fibre PETG is lighter than plain PETG. The 2024 revision (R-FORMFUTURA-SB-20261018-7b525961687e) prints 1,32 for its 15 % fibre, and is the product's. Kept as printed; it backs nothing.`],
  ['V005563', 'R-FABRU-PUREFIL-3-material-data-sheet-ABS-purefil', 'Tensile modulus', HELD, 'Tensile modulus (ASTM D790) 2700 MPa | Yield stress (ASTM D638) 47 MPa', null,
    `Held back ${DATE} (${MIGRATION}, D149): the row is labelled "Tensile modulus" and names ASTM D790, the flexural test (the sheet's tensile rows name ASTM D638). The sheet prints no other modulus and says nothing of its specimens, and an ABS's tensile and flexural moduli are close, so which test the 2700 MPa is cannot be read from the page; it backs nothing until it can. Property and standard stay the page's words.`],
];
for (const [id, sid, property, status, quote, other, note] of CHANGES) {
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== property) throw new Error(`${MIGRATION}: ${id} is not ${sid}'s ${property}`);
  if (r['Data status'] === status) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  if (other) onCachedSheet(t, other[0], other[1], MIGRATION);
  t.set('measurements', id, 'Data status', status, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, note), { expect: r.Notes, migration: MIGRATION });
  n++;
}

// iSANMATE PLA CF's tensile strength: the same moulded bar as the rest of its table.
{
  const id = 'V015178', sid = 'I-PLA-PLA-CF-TDS', RAW = 'Raw material value';
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'Tensile strength (endpoint unspecified)') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s tensile strength`);
  if (r['Specimen type'] !== RAW) {
    onCachedSheet(t, sid, 'Physical Properties Test Method Specimen Units Typical Value | Tensile Strength dry, @50mm/min ISO 527 ISO 3167 A MPa 120 | Modulus of Elasticity dry, @1 mm/min ISO 527 ISO 3167 A GPa 25', MIGRATION);
    t.set('measurements', id, 'Specimen type', RAW, { expect: 'Not published (do not assume printed)', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Corrected ${DATE} (${MIGRATION}, D149): the table's Specimen column names "ISO 3167 A", ISO's injection-moulded multipurpose bar, on this row as on every other, and the page says nothing of printing; its siblings (V009910 to V009914) are raw-material values by the importer's rule (m198), and this row is one too.`), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) flagged, held back or corrected`);
