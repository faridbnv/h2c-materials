#!/usr/bin/env node
// Migration m127 (2026-09-21): the sweep's reading (PLAN-REMAINING 2.3), values and properties.
//
// A reader who did not record them read the 200 values furthest from their material's others against their sheets
// (docs/audits/2026-09-18-v2-import/sweep/sweep-200.csv, each note quoting the line). This migration acts on what
// that reading found about the number and the property; the conditions it found (specimen form, annealing, load,
// notch) are m128 to m130, and the grades it found are m131. Each class was counted across the whole table first.
//
//   - A number read from the wrong cell: Extrudr's PCTG prints "Streckdehnung ISO 527 % 4,3" beside the print
//     settings' "Kühlung 20-50%"; the row had taken the cooling fan's range.
//   - A strength whose line names its endpoint, filed as endpoint unspecified: FormFutura's template prints
//     "Tensile strength 46 Mpa ISO 527 @ yield", 3D4Makers' PEI sheet "Tensile Stress ISO 527-2/50 / Yield 105 MPa".
//     Every tensile row whose own line says yield (and not break), or break (and not yield), takes that endpoint.
//   - A stress at ISO 178's conventional deflection (3.5 % strain), filed as flexural strength: the table has its
//     property for it.
//   - A number that is not the property at all, quarantined with the reason (the shape V001540 took): LUVOCOM's and
//     three other sheets' processing blocks print "Melt temperature °C 330", a barrel setting, which had been read as
//     the polymer's melting point; 3D4Makers' PEI sheet prints its ball pressure test (IEC 60695-10-2, "125 ºC
//     Pass") and three UL 746 relative thermal indices under its Vicat heading, and each had become a Vicat
//     temperature.
//   - Numbers the sheet prints that physics, or the sheet's own other numbers, rule out, kept and flagged (D55).
//     Where the reader judged a value low but possible for a printed part (Flashforge's PC/ABS modulus 0.8-0.95 GPa,
//     Eryone's ASA 0.94 GPa) or a crystallised PLA's heat deflection the sheet does not call annealed, nothing is
//     flagged: that is a state, not a physical impossibility.
//
//   node scripts/migrate/m127-the-sweep-values-and-properties.mjs

import { openTables } from '../data/table-io.mjs';
import { correct, withNote } from './source-edits.mjs';

const migration = 'm127-the-sweep-values-and-properties';
const date = '2026-09-21';
const NA = 'Not applicable';
const t = openTables();
let changed = 0;

changed += correct(t, { source: 'R-EXTRUDR-pctg-TDS-de', ids: ['V006270'], migration, date,
  set: { 'Raw value': ['20-50 %', '4,3 %'], 'Raw numeric': ['20', '4.3'], 'Raw upper bound': ['50', NA], 'Normalized value': ['20', '4.3'],
    'Normalized upper bound': ['50', NA], 'Standard / load': ['4 3 Kühlung ISO 527', 'ISO 527'] },
  note: 'the line prints "Streckdehnung ISO 527 % 4,3 Kühlung 20-50%": 4.3 % is the elongation at yield, and 20-50 % the print settings\' cooling fan beside it.' });

// Endpoints the row's own line names.
const ENDPOINT = [
  ['Tensile yield strength', 'the line names the yield point', [
    ['R-3D-FUEL-TDS-3DFuel-Workday-ABS', 'V007453', 'Tensile Strength, 3.2mm @ Yield 50mm/min D638 520 kg/cm²'],
    ['S-PET-tds-aquasolve-pva', 'V007509', 'Tensile strength 78 Mpa ISO 527 Stress @ Yield 23° C'],
    ['S-PET-formfutura-tds-pythonflex', 'V007643', 'Tensile strength 50.0 Mpa ISO 527 1/2 @Yield'],
    ['S-PET-TDS-Matt-PLA', 'V007670', 'Tensile strength 46 Mpa (MD) ISO 527 @ yield'],
    ['R-NANOVIA-PC', 'V007723', 'Strength at yield 90 MPa ASTM D638'],
    ['R-FILLAMENTUM-TDS-OBC-905-EN-07102022-FI', 'V007764', 'Tensile strength at yield 14 MPa 11 MPa ASTM D1708'],
    ['S-PET-tds-hdglass', 'V007825', 'Tensile strength 50Mpa ASTM D638 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-High-Gloss-PLA', 'V009519', 'Tensile strength 71 Mpa ISO 527 @ yield'],
    ['S-PET-TDS-ABSpro-Flame-Retardant', 'V009525', 'Tensile strength 65,1 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-ABSpro', 'V009551', 'Tensile strength 39.9 Mpa ISO 527 Stress @ Yield 23° C'],
    ['S-PET-TDS-EasyFil-ABS', 'V009560', 'Tensile strength 38 Mpa ISO 527 Stress @ Yield 23° C'],
    ['S-PET-TDS-Galaxy-PLA', 'V009590', 'Tensile strength 70 Mpa (MD) ISO 527 @ yield'],
    ['S-PET-TDS-Silk-Gloss-PLA', 'V009594', 'Tensile strength 64 Mpa ISO 527 @ yield'],
    ['S-PET-TDS-Tough-PLA', 'V009632', 'Tensile strength 46 Mpa ISO 527 @ yield'],
    ['S-PET-TDS-EasyCork', 'V009635', 'Tensile strength 19,4 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-MetalFil-Classic-Copper', 'V009640', 'Tensile strength 18.3 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-ReForm-rPET', 'V009655', 'Tensile strength 50Mpa ASTM D638 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-EasyFil-HIPS', 'V009703', 'Tensile strength 22 Mpa ISO 527 Stress @ Yield 23° C'],
    ['S-PET-TDS-STYX-12', 'V009749', 'Tensile strength 60.0 Mpa ISO 527 -1/-2 @Yield'],
    ['S-PET-TDS-StoneFil', 'V009760', 'Tensile strength 38.0 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-ApolloX', 'V009766', 'Tensile strength 47,5 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-MetalFil-Ancient-Bronze', 'V009777', 'Tensile strength 19.0 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-ClearScent-ABS', 'V009795', 'Tensile strength 39.2 Mpa ASTM D638 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-Premium-ABS', 'V009841', 'Tensile strength 36 Mpa ISO 527 Stress @ Yield 23° C'],
    ['S-PET-TDS-Pegasus-PP-GF', 'V010418', 'Tensile strength 12Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['S-PET-TDS-ReForm-rTitan', 'V010444', 'Tensile strength 43.6 Mpa ISO 527 @Yield 50mm/min (2 inch/min)'],
    ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006874', 'Tensile Stress ISO 527-2/50 / Yield 105 MPa'],
  ]],
  ['Tensile break strength', 'the line names the break', [
    ['S-PET-TDS-FlexiFil', 'V009783', 'Tensile strength 24 Mpa ISO 527 -1/-2 Stress @ Break'],
    ['S-PET-TDS-CarbonFil', 'V009834', 'Tensile strength 92 Mpa ISO 527 @Break'],
    ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006875', 'Tensile Stress ISO 527-2/50 / Break 85.0 MPa'],
  ]],
];
for (const [property, why, rows] of ENDPOINT) {
  for (const [source, id, line] of rows) {
    changed += correct(t, { source, ids: [id], migration, date, set: { Property: ['Tensile strength (endpoint unspecified)', property] },
      note: `${why}: "${line}".` });
  }
}
// FiberFlex Aero's "Tensile Strength @ 5% / 10% Strain" is neither: a stress at a set strain, which no property holds
// yet (docs/OPEN-PROBLEMS.md, stresses at a stated elongation).

for (const [source, id, line] of [
  ['R-3D4MAKERS-TDS-PEEK-Filament-1', 'V007424', 'Flexural Strength At 3,5% strain, 23 °C ISO 178 130 MPa'],
  ['R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS', 'V009452', 'Flexural stress at 3.5% strain 88,8 MPa ISO 178'],
]) {
  changed += correct(t, { source, ids: [id], migration, date, set: { Property: ['Flexural strength', 'Flexural stress at conventional deflection'] },
    note: `the line prints "${line}": ISO 178's stress at the conventional deflection (3.5 % strain), not the flexural strength.` });
}

// Numbers that are not the property: quarantined, as V001540 was, with what the line is.
const QUARANTINE = [
  ['R-3D4MAKERS-TDS-pps-cf-9938-bk-filament-en-iso', 'V007166', 'Melting temperature', 'the processing block prints "Zone 3 °C 320 - 340 / Nozzle °C 320 - 340 / Melt temperature °C 330": the melt (barrel) temperature to process it at, a setting, not the polymer\'s melting point.'],
  ['S-PET-TDS-LUVOCOM-3F-PEEK-CF-9676-BK', 'V009608', 'Melting temperature', 'the processing block prints "Nozzle °C 360 - 380 / Melt temperature °C 390": a processing setting, not the polymer\'s melting point.'],
  ['R-3D4MAKERS-TDS-LUVOCOM-3F-PEI-50236-GY-Filament-3D-printing', 'V006921', 'Melting temperature', 'the processing block prints "Mold °C 150 - 180 / Melt temperature °C 380": a processing setting; PEI is amorphous and has no melting point.'],
  ['S-PET-TDS-LUVOCOM-3F-PP-CF-9928-BK', 'V009620', 'Melting temperature', 'the injection moulding block prints "Mold °C 40 - 80 / Melt temperature °C 230 - 60": a processing setting (its range misprinted), not the polymer\'s melting point.'],
  ['S-PET-TDS-LUVOCOM-3F-PAHT-9936-BK', 'V009737', 'Melting temperature', 'the processing block prints "Nozzle °C 250 - 290 / Melt temperature °C 280": a processing setting, not the polymer\'s melting point.'],
  ['R-3D4MAKERS-TDS-LUVOCOM-3F-PAHT-KK-50056-BK-FR-Filament-3D4Makers', 'V009746', 'Melting temperature', 'the processing block prints "Nozzle °C 250 - 290 / Melt temperature °C 280": a processing setting, not the polymer\'s melting point.'],
  ['S-PET-TDS-LUVOCOM-3F-PAHT-CF-9891-BK', 'V009830', 'Melting temperature', 'the processing block prints "Nozzle °C 250 - 290 / Melt temperature °C 280": a processing setting, not the polymer\'s melting point.'],
  ['R-3D-FUEL-TDS-3DFuel-Workday-ABS', 'V007461', 'Melting temperature', 'the processing block prints "Drying Time 2-4 hrs / Melt Temperature 210-240°C (410-464°F)": a processing range; ABS is amorphous and has no melting point.'],
  ['R-COLORFABB-TDS-copperFill-en-0', 'V009496', 'Melting temperature', 'the injection moulding block prints "Melt temperature : 160 - 230 °C / Mould temperature : 20 - 60 °C": a processing range, not the melting point.'],
  ['I-PLA-PLA-Wood-TDS', 'V009924', 'Melting temperature', 'the extrusion block prints "Temperature zone Set value Range / Melt Temperature 185℃ 175-230℃": a barrel setting, not the melting point.'],
  ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006882', 'Vicat softening temperature', 'the line under the Vicat heading prints "Ball Pressure Test 125 ºC IEC 60695-10-2 Pass": a pass at 125 °C in the ball pressure test, not a Vicat temperature (the sheet\'s Vicat B120 is 212 °C, V006881).'],
  ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006883', 'Vicat softening temperature', 'the line under the Vicat heading prints "RTI Elec 170 ºC UL 746": a relative thermal index (a long-term ageing rating), not a Vicat temperature.'],
  ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006884', 'Vicat softening temperature', 'the line under the Vicat heading prints "RTI Imp 170 ºC UL 746": a relative thermal index, not a Vicat temperature.'],
  ['R-3D4MAKERS-TDS-PEI-ULTEM-1010', 'V006885', 'Vicat softening temperature', 'the line under the Vicat heading prints "RTI Str 170 ºC UL 746": a relative thermal index, not a Vicat temperature.'],
];
for (const [source, id, property, why] of QUARANTINE) {
  const m = t.get('measurements', id);
  if (m['Data status'] === 'Unresolved unit / layout') continue;
  if (m.SourceID !== source || m.Property !== property) throw new Error(`${migration}: ${id} is ${m.Property} from ${m.SourceID}`);
  t.set('measurements', id, 'Data status', 'Unresolved unit / layout', { expect: 'Published value' });
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Quarantined ${date} (${migration}): not a ${property.toLowerCase()}; ${why}`), { expect: m.Notes });
  changed++;
}

// Kept as printed, flagged (D55): the reason is the physics, or the sheet's own other numbers.
const IMPLAUSIBLE = [
  ['S-PCGF-PETG-Matte-TDS-Siddament', 'V007970', 'a notched Izod of 82 kJ/m² (ISO 180) for a matte PETG, above a polycarbonate\'s; the maker\'s plain PETG sheet prints 17.'],
  ['S-PCGF-PETG-Matte-TDS-Siddament', 'V007966', 'a tensile strength of 78 MPa (ISO 527) for a matte PETG, half as much again as an unfilled PETG reaches, and equal to its own bending strength (79 MPa), which a PETG exceeds by a third.'],
  ['R-FIBERLOGY-FIBERLOGY-IMPACT-PLA-TDS', 'V005538', 'a notched Izod of 160 kJ/m² (ASTM D256, which reports J/m) for a PLA, beyond any PLA; 160 J/m would be a toughened PLA\'s.'],
  ['R-COLORFABB-TDS-colorFabb-PLA-High-Speed-PRO', 'V005980', 'a notched Charpy of 27.9 kJ/m² for a PLA that breaks at 5.7 % elongation: a brittle PLA notches at 2-5 kJ/m²; 27.9 is an unnotched value.'],
  ['S-PCGF-PETG-CF-v2', 'V007717', 'an elongation at break of 102 % for a carbon-fibre PETG; the same sheet prints a bending modulus of 65 MPa, a thirtieth of a PETG\'s.'],
  ['R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--fbbd78', 'V005137', 'an elastic modulus of 217 MPa for an ABS, a tenth of what an ABS has: an elastomer\'s stiffness.'],
  ['R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--1d9fed', 'V004832', 'an elastic modulus of 1345 MPa below the sheet\'s own secant modulus at break (34.8 MPa at 1.9 %, 1830 MPa); a thermoplastic\'s curve bends the other way.'],
  ['R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--25961c', 'V004845', 'a tensile modulus of 495-592 MPa beside the sheet\'s own bending modulus of 3193-3484 MPa; a printed PA12-CF\'s two moduli are within a factor of two.'],
  ['R-NANOVIA-Insublend', 'V007544', 'a tensile modulus of 67 MPa beside the sheet\'s own flexural modulus of 2430 MPa; the two measure the same stiffness.'],
  ['S-PET-formfutura-tds-highprecisionpla', 'V009535', 'a flexural strength of 192 MPa with a strain at flexural yield of 1.4 %: a PLA at 1.4 % strain carries about 50 MPa, and the sheet\'s own strength at break is 115.'],
  ['S-PEBA-79f73c22-1', 'V007105', 'a tensile strength of 11.1 MPa beside the sheet\'s flexural strength of 75.34 MPa; a PLA\'s flexural strength is 1.2-1.8 times its tensile.'],
  ['R-FILLAMENTUM-Fillamentum-ASA-CF10-Carbon', 'V006028', 'a glass transition of 65 °C for an ASA, whose styrene-acrylonitrile phase goes glassy near 105 °C; the sheet also prints a melting temperature for this amorphous polymer.'],
  ['I-ESD-ABS-TDS', 'V000605', 'a glass transition of 80 °C for an ABS, whose styrene-acrylonitrile phase goes glassy near 105 °C; nothing on the sheet (an ESD grade, no plasticiser declared) moves it 25 °C.'],
  ['R-SUNLU-ABS-GF-TDS', 'V008549', 'a glass transition of 135 °C for an ABS above its own Vicat softening point (95 °C); an amorphous polymer softens at its glass transition.'],
  ['R-FABRU-PUREFIL-241-Material-data-sheet-TPU-53D-purefil', 'V005646', 'an elongation at yield of 470 %, equal to the elongation at break the sheet prints beside it; a TPU has no yield point there.'],
  ['R-FABRU-PUREFIL-17-Materialdatenblatt-ASA-purefil', 'V005659', 'an elongation at yield of 30 % for an ASA, which yields at 3-5 %.'],
  ['R-FABRU-16-material-datat-sheet-ASA-purefil', 'V008258', 'an elongation at yield of 30 % for an ASA, which yields at 3-5 %.'],
  ['R-3DJAKE-3DJAKE-TDS-PETG-CF-23-12', 'V009087', 'a heat deflection at 1.8 MPa of 93 °C for a PETG-CF, above PETG\'s glass transition; an amorphous polymer\'s HDT does not pass its Tg. The sheet prints it in its Injection column.'],
  ['R-EXTRUDR-flex-medium-matt-TDS-en', 'V004124', 'an elongation at break of 6.9 % for a 95A TPU whose sheet prints stresses at 300 % elongation; the S2 rows are swapped with the tensile strength\'s (470, flagged as V004123).'],
  ['S-SPECTRUM-eng-tds-the-filament-petg', 'V003073', 'a yield stress of 25 MPa at 4.4 % strain with a modulus of 1874 MPa and a stress at break of 46.9 MPa; a PETG yields near 50 MPa and breaks below its yield.'],
  ['S-SPECTRUM-EN-TDS-The-Filament-PETG', 'V007586', 'a yield stress of 25 MPa at 4.4 % strain with a stress at break of 46.9 MPa; a PETG yields near 50 MPa and breaks below its yield.'],
  ['S-PET-TDS-ePETG', 'V009540', 'a yield stress of 25 MPa at 4.30 % strain with a modulus of 2980 MPa; a PETG yields near 50 MPa at that strain.'],
  ['S-SPECTRUM-en-tds-spectrum-petg-premium', 'V002647', 'a yield stress of 26 MPa at 4.30 % strain with a stress at break of 48 MPa; a PETG yields near 50 MPa and breaks below its yield.'],
  ['R-MATTERHACKERS-PRO-SERIES-4b8JqK', 'V009027', 'a yield strength of 10,800 psi (74.5 MPa) for a PETG, half as much again as a PETG reaches; the same block prints a flexural modulus of 935 kpsi (6.4 GPa), three times a PETG\'s.'],
];
for (const [source, id, why] of IMPLAUSIBLE) {
  const m = t.get('measurements', id);
  if (m['Data status'] === 'Published value (physically implausible)') continue;
  if (m.SourceID !== source) throw new Error(`${migration}: ${id} cites ${m.SourceID}`);
  if (!/^Published value/.test(m['Data status'])) throw new Error(`${migration}: ${id} is ${m['Data status']}`);
  t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: m['Data status'] });
  t.set('measurements', id, 'Notes', withNote(m.Notes, `Flagged physically implausible ${date} (${migration}, D55): the sheet prints ${why} Kept as printed; it backs nothing.`), { expect: m.Notes });
  changed++;
}

// Pegasus PP's 12 MPa is now read at its yield, where W0110 (drawn for it at an unspecified endpoint) does not reach.
// The yield window a lightened semicrystalline grade lacked, as W0104 is the amorphous one.
if (!t.find('plausibility_windows', 'W0111')) {
  t.append('plausibility_windows', {
    WindowID: 'W0111', Property: 'Tensile yield strength', 'Normalized unit': 'MPa', 'Matrix class': 'semicrystalline', 'Fill class': 'light', Condition: 'any',
    'Hard low': '0.5', 'Soft low': '2', 'Soft high': '90', 'Hard high': '150', 'Always flag': 'FALSE',
    Basis: "Physics: as W0104 on a semicrystalline matrix: a foam carries load in proportion to the polymer that is left, so its yield falls roughly with its relative density. Observation: FormFutura's Pegasus PP, 20 % lighter than polypropylene, prints \"Tensile strength 12Mpa ISO 527 @Yield\" where a solid printed PP yields at 18 to 30.",
  });
  changed++;
}

if (changed) t.save();
console.log(`${migration}: ${changed} row(s) corrected, quarantined or flagged`);
