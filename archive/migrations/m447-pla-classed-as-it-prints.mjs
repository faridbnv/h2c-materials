#!/usr/bin/env node
// Migration m447 (2026-10-18): PLA is classed as it prints, semicrystalline and glassy as printed, as PET is; five PLA
// grades that crystallise in the print are declared a variant; the glassy-bar heat check reads the printed state (the
// screening build's stage 4, its change C36, D158).
//
// PLA is a semicrystalline polymer: NatureWorks' Ingeo 3D850 sheet, a PLA grade for 3D-printing monofilament, prints a
// "Peak Melt Temperature, °C 165-180" and a glass transition of 55-60 °C (p. 1). It crystallises too slowly to do so in a
// print, so a printed PLA bar is glassy and softens near its glass transition. polymers.csv classed it amorphous, which
// the estimate model read as "no melting point", so nothing held a PLA estimate under its melting point and annealed
// PLA values were read as the glassy bar's. The row now says: semicrystalline, melting point 165 °C (the low end of the
// printed range, a ceiling every grade of the range stays under), prints amorphous.
//
// Five grades crystallise in the print, as their sheets show without annealing. Read by Claude Opus 5.5 on the cached text:
//   G019-01 Polymaker HT-PLA-GF: a Vicat of 148.9 °C as printed (148.3 °C annealed) beside a glass transition of
//     59.76 °C, and a crystallisation peak at 81.56 °C.
//   G001-09 Spectrum THE FILAMENT HT-PLA, and G001-196 The Filament HT-PLA, which shares its sheet: a heat deflection of
//     108 °C and a Vicat of 140 °C, "Features VICAT - 140°", no annealing stated.
//   G001-56 purefil PLA+: "an impact-resistant and heat-optimized PLA", a heat deflection of 90 °C at 0.45 MPa, no
//     annealing stated, printed on a 70-90 °C bed.
//   G001-101 FormFutura Volcano PLA 150C: "achieved without annealing or post-processing", a crystallisation temperature
//     of 105 °C and an HDT B of 110 °C.
// Not declared: the grades whose high heat deflection is measured annealed (Polymaker HT-PLA and HT-PLA Pro, colorFabb
// PLA-HP, Spectrum's, Fiberlogy's, 3D-Fuel's, FormFutura Volcano PLA) or moulded (Extrudr PLA HIGH-SPEED), the values
// stage 2a flagged physically implausible (3DXTECH, Nanovia), MatterHackers Tough PLA (its sheet gives an annealing
// procedure beside its 75-80 °C) and AzureFilm LumberLay (its 87* °C names no state the page explains).
// A variant's values stay its own and stand apart from PLA's spread; "crystallising grade" reads its type's guide and
// chamber need (grade-variants.csv), so no print answer moves.
//
// PR12 (a glassy bar holds 0.45 MPa at most 15 °C above its glass transition, D149) applied to the amorphous morphology,
// which PLA no longer is; it now applies to the glassy printed state (registry.js printedStateOf), PLA's 98 pairs as
// before, and PET's too.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m447-pla-classed-as-it-prints.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm447';
const NA = 'Not applicable', NP = 'Not published';
const t = openTables();
let changed = 0;
const set = (table, id, column, value, expect) => {
  const now = t.get(table, id)[column];
  if (now === value) return;
  t.set(table, id, column, value, { expect, migration: MIGRATION });
  changed++;
};

// ---- PLA's row ---------------------------------------------------------------------------------------------------
const PLA_SOURCE = 'R-NATUREWORKS-INGEO-3D850-TDS';
for (const q of ['Peak Melt Temperature, °C 165-180 D3418', 'Glass Transition Temperature, °C 55-60 D3418']) onSheet(t, PLA_SOURCE, q, MIGRATION);
set('polymers', 'PLA', 'Morphology', 'semicrystalline', 'amorphous');
set('polymers', 'PLA', 'Melting point °C', '165', NA);
set('polymers', 'PLA', 'As printed', 'prints amorphous', NA);
const OLD = 'The melting point column stays Not applicable while this row classes PLA as amorphous; that class is the estimate model\'s to change, with a back-test (screening build, stage 4).';
const NEW = 'PLA is semicrystalline and prints amorphous (D158): the melting point column holds 165 °C, the low end of the printed range, a ceiling every grade of the range stays under.';
const basis = t.get('polymers', 'PLA').Basis;
if (basis.includes(OLD)) set('polymers', 'PLA', 'Basis', basis.replace(OLD, NEW), basis);
else if (!basis.includes(NEW)) throw new Error(`${MIGRATION}: PLA's Basis is not what this migration expects`);

// ---- the crystallising grades ---------------------------------------------------------------------------------------
const GRADES = [
  { id: 'G019-01', source: 'S-POLYCN-TDS-Polymaker-HT-PLA-GF-V1-2-2025-12-09-EN',
    quotes: ['Vicat softening temp. ISO 306, GB/T 1633 148.9°C', 'Vicat softening temp. ISO 306, GB/T 1633 148.3°C (annealed)', 'Glass transition temp. DSC, 10°C/min 59.76°C', 'Crystallization temp. DSC, 10°C/min 81.56°C'],
    why: 'Crystallises in the print: its 2025 sheet prints a Vicat of 148.9 °C as printed (148.3 °C annealed) beside a glass transition of 59.76 °C, and a crystallisation peak at 81.56 °C (S-POLYCN-TDS-Polymaker-HT-PLA-GF-V1-2-2025-12-09-EN, p. 1); a glassy PLA softens near 60 °C. Recorded as a Variant (m447, D158).' },
  { id: 'G001-09', source: 'S-SPECTRUM-en-tds-the-filament-ht-pla',
    quotes: ['Heat Deflection Temperature 108°C', 'VICAT 140°C', 'Features VICAT - 140°'],
    why: 'Sold to crystallise in the print: its sheet prints a heat deflection of 108 °C and a Vicat of 140 °C, "Features VICAT - 140°", and states no annealing (S-SPECTRUM-en-tds-the-filament-ht-pla, p. 1); a glassy PLA softens near 60 °C. Recorded as a Variant (m447, D158).' },
  { id: 'G001-196', source: 'S-SPECTRUM-en-tds-the-filament-ht-pla',
    quotes: ['Heat Deflection Temperature 108°C', 'VICAT 140°C'],
    why: 'The sheet it shares with Spectrum\'s THE FILAMENT HT-PLA prints a heat deflection of 108 °C and a Vicat of 140 °C with no annealing stated (S-SPECTRUM-en-tds-the-filament-ht-pla, p. 1): a grade that crystallises in the print, where a glassy PLA softens near 60 °C. Recorded as a Variant (m447, D158).' },
  { id: 'G001-56', source: 'R-FABRU-PUREFIL-8503-Material-data-sheet-PLA-purefil',
    quotes: ['PLA+ is an impact-resistant and heat-optimized PLA', 'Heat deflection temperature 90 °C', '0.45 MPa (ISO 75-1/-2)', '70-90°C'],
    why: 'A heat-optimised PLA: its sheet prints a heat deflection of 90 °C at 0.45 MPa with no annealing stated, on a 70-90 °C bed (R-FABRU-PUREFIL-8503-Material-data-sheet-PLA-purefil, p. 1); a glassy PLA deflects near 55 °C. Recorded as a Variant (m447, D158).' },
  { id: 'G001-101', source: 'S-PET-TDS-Volcano-PLA-150C',
    quotes: ['achieved without annealing or post-processing, for non-load-bearing parts', 'Crystallization temperature 105 °C DSC', 'HDT B 110 °C ISO 75'],
    why: 'Crystallises in the print: its sheet states its heat resistance is "achieved without annealing or post-processing", with a crystallisation temperature of 105 °C and an HDT B of 110 °C (S-PET-TDS-Volcano-PLA-150C, p. 1). Recorded as a Variant (m447, D158).' },
];
for (const g of GRADES) {
  for (const q of g.quotes) onSheet(t, g.source, q, MIGRATION);
  set('grades', g.id, 'Composition / filler', g.why, NP);
  set('grades', g.id, 'Variant', 'crystallising grade', NA);
}

// ---- PR12 reads the printed state -----------------------------------------------------------------------------------
set('physical_relations', 'PR12', 'Applies to', 'Printed state: glassy', 'Morphology: amorphous');

// ---- PLA-GF's summary ------------------------------------------------------------------------------------------------
// Its {zshare.tensileStrength} was HT-PLA-GF's, the one product of PLA-GF printing a flat and an across-the-layers
// strength on one sheet, now set apart from the spread: the build stops on a placeholder it cannot fill
// (SUMMARY-PLACEHOLDER), and the sentence leaves rather than a number typed in. pages:add-summaries builds first, which
// that error stops, so the revision is made here, guarded as any edit is.
const ZSHARE = ' A part keeps about {zshare.tensileStrength} of its flat tensile strength across the layers.';
const summary = t.get('material_summaries', 'M019');
if (summary.Summary.includes(ZSHARE)) {
  set('material_summaries', 'M019', 'Summary', summary.Summary.replace(ZSHARE, ''), summary.Summary);
  set('material_summaries', 'M019', 'Written on', '2026-10-18', summary['Written on']);
  const notes = summary.Notes.replace('; share kept across the layers (Mechanical properties, Across the layers)', '')
    + ' Revised 2026-10-18 by Claude Opus (agent), stage 4 (m447, D158): the across-the-layers share left the summary, since Polymaker HT PLA GF, the one product that printed both from one sheet, is now a crystallising grade set apart from the material\'s spread.';
  set('material_summaries', 'M019', 'Notes', notes, summary.Notes);
}

t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
