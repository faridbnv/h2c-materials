#!/usr/bin/env node
// Migration m115 (2026-09-21): the two foamed-grade windows D80 left out.
//
// D80 gave a foamed or lightened grade ("light" fill) windows of its own, drawn for the amorphous and
// semicrystalline matrices the database then held foamed grades of. Batch b30 brings the first foamed elastomer
// and a lightened polypropylene's unqualified tensile strength, and both fell back to the windows for any fill,
// which were drawn from solid grades:
//
//   - Siraya Tech's PEBA Air prints its printed parts' density at four nozzle temperatures, 0.73 down to 0.55
//     g/cm³ (ISO 845), against a window whose hard low of 0.80 is a solid elastomer's.
//   - FormFutura's Pegasus PP, "20% lower weight and/or density than regular PP", prints a tensile strength of
//     12 MPa against the solid semicrystalline floor of 15.
//
// Neither is a surprise for a foam: its density is what the printer foams it to, and its strength falls with the
// polymer that is left (W0084, W0102). The windows are written as those are, and nothing already recorded moves
// under them: no other elastomer or lightened semicrystalline row sits where the two differ from the "any" ones.
//
//   node scripts/migrate/m115-two-windows-for-foamed-grades.mjs

import { openTables } from '../data/table-io.mjs';

const WINDOWS = [
  {
    WindowID: 'W0109', Property: 'Density', 'Normalized unit': 'kg/m³', 'Matrix class': 'elastomer', 'Fill class': 'light', Condition: 'any',
    'Hard low': '300', 'Soft low': '400', 'Soft high': '1300', 'Hard high': '1500', 'Always flag': 'FALSE',
    Basis: "Physics: as the amorphous light window (W0084): a foamed elastomer's density is set by how much the printer foams it, and a hotter nozzle foams it more. Observation: Siraya Tech's PEBA Air prints 0.73, 0.63, 0.60 and 0.55 g/cm³ (ISO 845) for parts printed at 240 to 270 °C; its solid filament and Recreus' Filaflex Foamy weigh 1.05 to 1.20 before foaming.",
  },
  {
    WindowID: 'W0110', Property: 'Tensile strength (endpoint unspecified)', 'Normalized unit': 'MPa', 'Matrix class': 'semicrystalline', 'Fill class': 'light', Condition: 'any',
    'Hard low': '0.5', 'Soft low': '2', 'Soft high': '90', 'Hard high': '150', 'Always flag': 'FALSE',
    Basis: "Physics: as W0102 on a semicrystalline matrix: a foam carries load in proportion to the polymer that is left, so its strength falls roughly with its relative density. Observation: FormFutura's Pegasus PP, 20 % lighter than polypropylene, prints 12 MPa where a solid printed PP reaches 18 to 30.",
  },
];

const t = openTables();
let written = 0;
for (const w of WINDOWS) {
  if (t.find('plausibility_windows', w.WindowID)) continue;
  t.append('plausibility_windows', w);
  written++;
}
if (written) t.save();
console.log(`m115: ${written} window(s) written`);
