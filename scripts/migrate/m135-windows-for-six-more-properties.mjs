#!/usr/bin/env node
// Migration m135 (2026-09-21): physics windows for the properties that had none, and the high-temperature fibre
// windows redrawn (PLAN-REMAINING 2.3, D82).
//
// Six properties with thirty measurements or more had no window, so nothing questioned a value of theirs however far
// out: elongation at yield (180 rows), mould shrinkage (60), continuous service temperature (58), decomposition
// temperature (38), crystallisation temperature (35) and tensile strain at strength (30). Each window is drawn from
// what the polymer class can physically do, then checked against the rows: the soft bounds hold the credible values,
// and what falls outside was read against its sheet. Two values are flagged (D55): purefil's MABS yielding at 17 %,
// and Raise3D's transparent PC "decomposing" at 129-132 °C by TGA, below its own print temperature. Four are
// accepted with what makes each credible.
//
// W0024 and W0080 were drawn before a thirty-per-cent carbon PEEK was in the corpus, and two now are (Ensinger's
// TECAFIL PEEK EV CF30, LEHVOSS's LUVOCOM 3F PEEK CF 9676). A fibre-filled high-temperature polymer gets a tensile
// strength window of its own, and the fibre modulus window reaches what 30 wt% short carbon does; the four accepted
// TECAFIL findings stop occurring and their acceptances go.
//
//   node scripts/migrate/m135-windows-for-six-more-properties.mjs

import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const migration = 'm135-windows-for-six-more-properties';
const date = '2026-09-21';
const t = openTables();
let changed = 0;

const W = (WindowID, Property, unit, matrix, fill, [hl, sl, sh, hh], Basis) => ({
  WindowID, Property, 'Normalized unit': unit, 'Matrix class': matrix, 'Fill class': fill, Condition: 'any',
  'Hard low': String(hl), 'Soft low': String(sl), 'Soft high': String(sh), 'Hard high': String(hh), 'Always flag': 'FALSE', Basis,
});
const WINDOWS = [
  W('W0112', 'Elongation at yield', '%', 'amorphous', 'any', [0.3, 1, 15, 200], 'Physics: a glassy polymer yields at 2 to 5 % strain, where its chains begin to slide; an elastomer-modified or declared softer grade yields late, so the hard high is the soft grade\'s and not the rigid polymer\'s. Observation: 0.9 (a wood-filled PLA that breaks where it yields) to 150 (purefil\'s COC flex).'),
  W('W0113', 'Elongation at yield', '%', 'semicrystalline', 'any', [0.5, 2, 30, 100], 'Physics: a semicrystalline polymer yields at 4 to 25 %: polypropylene and polyethylene draw late, a fibre-filled polyamide yields at 3. Observation: 2.9 (PET) to 30 (POM, PP).'),
  W('W0114', 'Elongation at yield', '%', 'elastomer', 'any', [1, 5, 100, 800], 'Physics: an elastomer has no sharp yield point; where a sheet names one it is the knee of the curve, 10 to 70 %. Observation: 10 (OBC) to 65 (TPU).'),
  W('W0115', 'Elongation at yield', '%', 'high-temp', 'any', [0.5, 2, 15, 100], 'Physics: PEEK, PEI and the sulfones yield at 4 to 8 %, a fibre-filled grade earlier. Observation: 2.6 (PEEK-CF) to 7.2 (PPSU).'),
  W('W0116', 'Mould shrinkage', '%', 'any', 'any', [0, 0, 2.5, 5], 'Physics: a moulded part shrinks by what its polymer contracts on cooling: 0.1 to 0.8 % for a glassy polymer, 1 to 2.5 % for a crystallising one (PP, PE, POM, PA), less with fibre, and a liquid crystal polymer barely at all. Observation: 0 (LCP) to 1.5 (PP).'),
  W('W0117', 'Continuous service temperature', '°C', 'amorphous', 'any', [20, 40, 150, 200], 'Physics: a glassy polymer serves below its glass transition, which for the printable ones runs from about 55 °C (PLA) to 150 °C (PC). Observation: 45 (PLA) to 130 (PC).'),
  W('W0118', 'Continuous service temperature', '°C', 'semicrystalline', 'any', [20, 50, 240, 300], 'Physics: a semicrystalline polymer serves up towards its melting point, the more so with a fibre load. Observation: 65 (PP, PA12) to 220 (PPS-CF).'),
  W('W0119', 'Continuous service temperature', '°C', 'elastomer', 'any', [20, 40, 150, 200], 'Physics: a thermoplastic elastomer serves below the melting of its hard segments, 100 to 150 °C. Observation: 90 (TPU).'),
  W('W0120', 'Continuous service temperature', '°C', 'high-temp', 'any', [80, 120, 280, 320], 'Physics: PEI is rated for about 170 °C of continuous service and PEEK for 250 to 260. Observation: 170 (PEI) to 250 (PEEK-CF).'),
  W('W0121', 'Decomposition temperature', '°C', 'any', 'any', [150, 200, 500, 650], 'Physics: a thermoplastic begins to lose mass by TGA at 200 to 300 °C (PVB, PVA, PLA) or 350 to 500 °C (the aromatic polymers); one that decomposed below 150 °C would decompose in the nozzle that prints it. Observation: 230 (PVB) to 446 (PA6-CF).'),
  W('W0122', 'Crystallization temperature', '°C', 'amorphous', 'any', [50, 70, 200, 260], 'Physics: PLA, glassy as printed, crystallises on heating at 80 to 125 °C; a blend with a crystallising partner (PC-PBT) shows the partner\'s 170 to 200. Observation: 77 (PLA) to 186 (PC-PBT).'),
  W('W0123', 'Crystallization temperature', '°C', 'semicrystalline', 'any', [40, 60, 280, 340], 'Physics: a semicrystalline polymer crystallises on cooling some 20 to 60 °C below its melting point. Observation: 122 (BVOH) to 226 (PPS-GF).'),
  W('W0124', 'Tensile strain at strength', '%', 'amorphous', 'any', [0.5, 1, 20, 60], 'Physics: a glassy polymer carries its greatest load at 2 to 6 % strain, a toughened grade near its break. Observation: 2.1 (PLA) to 14.5 (Spectrum\'s PLA Tough).'),
  W('W0125', 'Tensile strain at strength', '%', 'semicrystalline', 'any', [0.3, 0.8, 30, 60], 'Physics: a fibre-filled semicrystalline polymer peaks at 1 to 3 %, an unfilled one at its yield, 4 to 25 %. Observation: 1.2 (PA6-CE, PP-CF) to 6 (PP).'),
  W('W0126', 'Tensile strain at strength', '%', 'elastomer', 'any', [5, 20, 1000, 1500], 'Physics: an elastomer carries its greatest load at break, hundreds of per cent. Observation: 500 (TPC) to 550 (PEBA).'),
  W('W0127', 'Tensile strain at strength', '%', 'high-temp', 'any', [0.5, 1, 15, 60], 'Physics: as the semicrystalline window, for PEEK, PEKK and PEI. Observation: 3.4 (PEEK-CF) to 5 (PEKK).'),
  W('W0128', 'Tensile strength (endpoint unspecified)', 'MPa', 'high-temp', 'fibre', [20, 60, 230, 320], 'Physics: 30 wt% short carbon fibre in PEEK moulds at 200 to 260 MPa, and a printed bar keeps 60 to 80 % of it. Observation: 145 (LEHVOSS PEEK CF 9676, moulded) to 196.5 (Ensinger TECAFIL PEEK EV CF30). W0024 stays the window for an undisclosed fill.'),
];
for (const w of WINDOWS) {
  if (t.find('plausibility_windows', w.WindowID)) continue;
  t.append('plausibility_windows', w);
  changed++;
}
const w80 = t.get('plausibility_windows', 'W0080');
if (w80['Soft high'] === '16') {
  t.set('plausibility_windows', 'W0080', 'Soft high', '22', { expect: '16' });
  t.set('plausibility_windows', 'W0080', 'Basis', 'Physics: 20 to 30 wt% short carbon fibre in PEEK or PEI reaches 10 to 13 GPa printed and 20 to 25 moulded, and the unfilled matrix is 3.2 to 4.1. Observation: 8.1 to 10.1 over four grades of 3DXTECH PEEK, PEKK and PEI, 10 for LEHVOSS PEEK CF 9676 and 17.3 to 20 for Ensinger TECAFIL PEEK EV CF30. The window for any fill class stops at 8, which is the unfilled one and catches every filled grade.', { expect: w80.Basis });
  changed++;
}

for (const [id, source, why] of [
  ['V005680', 'R-FABRU-PUREFIL-88-material-data-sheet-MABS-purefil', 'an elongation at yield of 17 % for an MABS whose sheet prints a yield stress of 54 MPa and a modulus of 2540 MPa, which reach each other at about 2 %; an ABS yields at 2 to 4 %, and purefil\'s ASA sheets print 30 % the same way (m127).'],
  ['V006849', 'D-RAISE3D-Raise3d-Premium-PC-Transparent-TDS-V6', 'a decomposition temperature of 129-132 °C by TGA for a polycarbonate the same sheet melt-indexes at 260 °C and deflects at 107 °C under 1.8 MPa; a PC begins to lose mass above 450 °C.'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] === 'Published value (physically implausible)') continue;
  if (m.SourceID !== source) throw new Error(`${migration}: ${id} cites ${m.SourceID}`);
  t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: 'Published value' });
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Flagged physically implausible ${date} (${migration}, D55): the sheet prints ${why} Kept as printed; it backs nothing.`), { expect: m.Notes });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} record(s) written`);
