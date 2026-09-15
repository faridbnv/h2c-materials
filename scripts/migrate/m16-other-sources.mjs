#!/usr/bin/env node
// Migration m16: the remaining data sheets the source-completeness audit flagged, re-read 2026-09-14 (every
// SHA-256 matched; iSANMATE CF-ABS checked on the rendered page).
//
// Polymaker: equilibrium water absorption (nine sheets), -30 °C impact results (PC-ABS, PC-PBT), HT-PLA-GF's melt
//   index and PolyFlex TPU90's Shore hardness were never transcribed.
// eSUN PEBA90A: the "(Z-axis)" rows had no direction; the XY tensile strength (> 16.5 MPa), the XY Izod "NB" and
//   the melt flow range were never transcribed.
// iSANMATE: CF-ABS had one of its eight values; TPU lacked density, hardness and Tg; PLA lacked its film TD values;
//   PETG's "Elongation at Stress" 4 % was filed as elongation at break while the nominal break strain (31 %), the
//   stress at break and both heat deflection values were missing; ESD-ABS lacked its X-Y break strength and melt
//   index, and prints a heat deflection pair that contradicts itself (quarantined, see below); PPSU's HDT row
//   states 1.8 MPa and unannealed specimens, and its elongations and melt flow range were missing.
// IPCON: ASA-GF lacked its melting point, hardness, water absorption, melt index and impacts; PPS-GF and both PPA
//   sheets their melt indices and PPS-GF its hardness.
// Flashforge ASA-GF10: the sheet swaps its bending labels (a 72.5-74.1 "modulus" in MPa and a 3359-3368 "strength");
//   bending, Izod, water absorption, melt index and continuous service temperature were never transcribed. Its
//   "X-Z" results are about half the X-Y ones, so, as with Eryone PETG-GF, they are not read as an on-edge XZ bar.
// Also: 3DXTECH PEKK-A and PEKK-C melting points, Fillamentum CPE HG100's hardness and melt flow, PC-GF's and
//   Prusament PVB's melt flow.
// Re-runnable; stops if the data moved.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct, addValue } from './source-edits.mjs';

const MIGRATION = 'm16';
const NA = 'Not applicable', NP = 'Not published';

const rowOf = (t, source, test) => {
  const row = t.rows('measurements').find((r) => r.SourceID === source && r['Data status'] !== 'Retired duplicate record' && test(r));
  if (!row) throw new Error(`${MIGRATION}: no template row in ${source}`);
  return row.MeasurementID;
};
const byId = (id) => () => id;
const byProperty = (property) => (t, source) => rowOf(t, source, (r) => r.Property === property);
const anyRow = (t, source) => rowOf(t, source, () => true);

/** A numeric value; `range` gives an upper end, `op` a bound. Units in kJ/m2 and MPa->GPa handled by the caller. */
const v = (property, raw, rawUnit, lo, { unit = rawUnit, factor = '1', hi, u, op = '=', ...rest } = {}) => {
  const scale = (x) => (x == null ? NA : String(Number((Number(x) * Number(factor)).toPrecision(8))));
  return {
    Property: property, 'Raw value': raw, 'Raw unit': rawUnit, 'Raw numeric': String(lo), 'Conversion factor': factor, Operator: op,
    'Normalized value': scale(lo), 'Normalized unit': unit,
    'Raw upper bound': hi == null ? NA : String(hi), 'Normalized upper bound': scale(hi),
    'Raw uncertainty ±': u == null ? NA : String(u), 'Normalized uncertainty ±': scale(u),
    ...rest,
  };
};
const mfr = (raw, lo, conditions, locator, extra = {}) => v('Melt mass-flow rate', raw, 'g/10 min', lo, { 'Standard / load': conditions, Locator: locator, Direction: NA, 'Specimen type': NP, 'Post-processing': NP, 'Moisture condition': NP, ...extra });
const water = (raw, lo, conditions, locator, extra = {}) => v('Water absorption', raw, '%', lo, { 'Standard / load': conditions, Locator: locator, Direction: NA, 'Specimen type': NP, ...extra });
const hardness = (raw, lo, scale, standard, locator) => v('Hardness', raw, scale, lo, { 'Standard / load': standard, Locator: locator, Direction: NP });
const temp = (property, raw, lo, standard, locator, extra = {}) => v(property, raw, '°C', lo, { 'Standard / load': standard, Locator: locator, Direction: NA, ...extra });
const noBreak = (property, standard, locator, extra = {}) => ({
  Property: property, 'Raw value': 'NB', 'Raw unit': 'Qualitative (no fracture)', 'Raw numeric': NA, 'Normalized value': 'Insufficient comparable data',
  'Normalized unit': 'Qualitative (no fracture)', 'Data status': 'Published qualitative result', 'Standard / load': standard, Locator: locator, ...extra,
});

const POLYMAKER_WATER = [
  ['S-POLYCN-PolySonic-PLA-EN-V5-3-TDS', '0.40'], ['S-POLYCN-PolyLite-PETG-TDS-V5-3', '0.54'], ['S-POLYCN-PolyFlex-TPU95-TDS-V5-1', '0.82'],
  ['S-POLYCN-PolyFlex-TPU90-TDS-V5-1', '0.67'], ['S-POLYCN-PolyMide-CoPA-TDS-V5-2', '2.82'], ['S-POLYCN-PolyMide-PA6-GF-TDS-V5-1', '3.22'],
  ['S-POLYCN-Polymaker-PC-ABS-TDS-V5-1', '0.352'], ['S-POLYCN-Polymaker-PC-PBT-TDS-V5-1', '0.257'],
];

/** [source, template(t, source) -> id, fields, note] */
export const ADDITIONS = [
  ...POLYMAKER_WATER.map(([s, x]) => [s, byProperty('Density'), water(`${x} %`, x, 'Equilibrium water absorption', 'p. 2: Equilibrium water absorption (%)')]),
  ['S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1', byProperty('Density'), water('~1.5 %', '1.5', 'Estimated equilibrium water absorption', 'p. 2: Estimated equilibrium water absorption (%)'),
    'The sheet calls this value an estimate ("~ 1.5 %").'],
  ['S-POLYCN-Polymaker-PC-ABS-TDS-V5-1', byId('V001573'), v('Charpy strength', '13 ± 2 kJ/m2', 'kJ/m2', 13, { unit: 'kJ/m²', u: 2, Notch: 'Notched', Direction: 'XY', 'Standard / load': 'ISO 179-1/1eA:2010', 'Test temperature': '-30°C', Locator: 'p. 4: Low temperature impact strength (X-Y) -30°C' })],
  ['S-POLYCN-Polymaker-PC-ABS-TDS-V5-1', byId('V001573'), v('Charpy strength', '1.5 ± 0.2 kJ/m2', 'kJ/m2', 1.5, { unit: 'kJ/m²', u: 0.2, Notch: 'Notched', Direction: 'Z', 'Standard / load': 'ISO 179-1/1eA:2010', 'Test temperature': '-30°C', Locator: 'p. 4: Low temperature impact strength (Z) -30°C' })],
  ['S-POLYCN-Polymaker-PC-PBT-TDS-V5-1', byId('V001601'), v('Charpy strength', '15 ± 3 kJ/m2', 'kJ/m2', 15, { unit: 'kJ/m²', u: 3, Notch: 'Notched', Direction: 'XY', 'Standard / load': 'ISO 179-1/1eA:2010', 'Test temperature': '-30°C', Locator: 'p. 4: Low temperature impact strength (X-Y) -30°C' })],
  ['S-POLYCN-Polymaker-PC-PBT-TDS-V5-1', byId('V001601'), v('Charpy strength', '7.3 ± 2 kJ/m2', 'kJ/m2', 7.3, { unit: 'kJ/m²', u: 2, Notch: 'Notched', Direction: 'Z', 'Standard / load': 'ISO 179-1/1eA:2010', 'Test temperature': '-30°C', Locator: 'p. 4: Low temperature impact strength (Z) -30°C' })],
  ['S-POLYCN-Polymaker-HT-PLA-GF-TDS-EN-V1-1', byProperty('Density'), mfr('22.9 g/10min', '22.9', '210 °C, 2.16 kg', 'p. 2: Melt index')],
  ['S-POLYCN-PolyFlex-TPU90-TDS-V5-1', byProperty('Density'), hardness('90 A', '90', 'Shore A', 'ISO 7619-1, GB/T 531.1', 'p. 2: Shore hardness')],

  // eSUN PEBA90A
  ['S-PEBA-PEBA90A-TDS-en', byId('V000839'), v('Tensile strength (endpoint unspecified)', '> 16.5', 'MPa', 16.5, { op: '>', Direction: 'XY', Locator: 'p. 1: Tensile Strength (XY-axis)' }),
    'The sheet gives no unit on this row; the other tensile strengths in the table are MPa.'],
  ['S-PEBA-PEBA90A-TDS-en', byId('V000839'), noBreak('Izod strength', 'GB/T 1843', 'p. 1: IZOD Impact Strength (XY-axis)', { Direction: 'XY', Notch: NP })],
  ['S-PEBA-PEBA90A-TDS-en', byProperty('Density'), mfr('10~16 g/10min', '10', 'GB/T 3682; 190 °C, 2.16 kg', 'p. 1: Melt Flow Index (190℃, 2.16kg)', { 'Raw upper bound': '16', 'Normalized upper bound': '16' })],

  // iSANMATE CF-ABS (the whole table, confirmed on the rendered page)
  ['I-CF-ABS-TDS', anyRow, v('Density', '1.10 g/cc', 'g/cc', '1.10', { unit: 'kg/m³', factor: '1000', 'Standard / load': 'ISO 1183', Direction: NA, 'Specimen type': 'Not published (density specimen form not explicitly established)', Locator: 'p. 1: Density' })],
  ['I-CF-ABS-TDS', anyRow, v('Tensile break strength', '48 MPa', 'MPa', 48, { 'Standard / load': 'ISO 527', Locator: 'p. 1: Tensile Strength, Break' })],
  ['I-CF-ABS-TDS', anyRow, v('Tensile modulus', '5200 MPa', 'MPa', 5200, { unit: 'GPa', factor: '0.001', 'Standard / load': 'ISO 527', Locator: 'p. 1: Tensile Modulus' })],
  ['I-CF-ABS-TDS', anyRow, v('Flexural strength', '78 MPa', 'MPa', 78, { 'Standard / load': 'ISO 178', Locator: 'p. 1: Flexural Strength' })],
  ['I-CF-ABS-TDS', anyRow, v('Flexural modulus', '5280 MPa', 'MPa', 5280, { unit: 'GPa', factor: '0.001', 'Standard / load': 'ISO 178', Locator: 'p. 1: Flexural Modulus' })],
  ['I-CF-ABS-TDS', anyRow, temp('Glass transition temperature', '105 °C', 105, 'DSC', 'p. 1: Glass Transition Temperature (Tg)')],
  ['I-CF-ABS-TDS', anyRow, temp('HDT', '78 °C', 78, 'ISO 75, 0.45 MPa (66psi)', 'p. 1: Deflection Temperature at 0.45 MPa (66psi)', { 'Test load MPa': '0.45' })],

  // iSANMATE TPU
  ['I-TPU-TDS', anyRow, v('Density', '1.22', 'Specific gravity', '1.22', { unit: 'kg/m³', factor: '1000', 'Standard / load': 'ASTM D782 (as printed; the density method is D792)', Direction: NA, 'Specimen type': 'Not published (density specimen form not explicitly established)', Locator: 'p. 2: Specific Gravity' })],
  ['I-TPU-TDS', anyRow, hardness('95 (Shore A)', '95', 'Shore A', 'ASTM D2240', 'p. 1: Hardness')],
  ['I-TPU-TDS', anyRow, temp('Glass transition temperature', '-24 C', -24, 'Not published', 'p. 1: Glass Transition')],

  // iSANMATE PLA film, transverse direction (the machine-direction rows are recorded)
  ['I-PLA-TDS', byId('V000039'), v('Tensile strength (endpoint unspecified)', '144,7 MPa', 'MPa', 144.7, { 'Standard / load': 'ASTM D882, transverse direction', Locator: 'p. 1: Tensile Strength TD' })],
  ['I-PLA-TDS', byId('V000040'), v('Tensile modulus', '3861 MPa', 'MPa', 3861, { unit: 'GPa', factor: '0.001', 'Standard / load': 'ASTM D882, transverse direction', Locator: 'p. 1: Tensile Modulus TD' })],
  ['I-PLA-TDS', byId('V000041'), v('Elongation at break', '100%', '%', 100, { 'Standard / load': 'ASTM D882, transverse direction', Locator: 'p. 1: Elongation at Break TD' })],

  // iSANMATE PETG
  ['I-PETG-TDS', byId('V000414'), v('Elongation at break', '31 %', '%', 31, { 'Standard / load': 'ISO 527-2', Locator: 'p. 1: Nominal Elongation at Break' })],
  ['I-PETG-TDS', byId('V000414'), v('Tensile break strength', '19 MPa', 'MPa', 19, { 'Standard / load': 'ISO 527-2', Locator: 'p. 1: Stress at Break' })],
  ['I-PETG-TDS', byId('V000421'), temp('HDT', '68 ºC', 68, 'ISO 75-2, 0,45 MPa', 'p. 2: Heat Deflection Temperature 0,45 MPa', { 'Test load MPa': '0.45' })],
  ['I-PETG-TDS', byId('V000421'), temp('HDT', '62 ºC', 62, 'ISO 75-2, 1.8 MPa', 'p. 2: Heat Deflection Temperature 1.8 MPa', { 'Test load MPa': '1.8' })],

  // iSANMATE ESD-ABS
  ['I-ESD-ABS-TDS', byId('V000607'), v('Tensile break strength', '34.00±0.16 MPa', 'MPa', 34, { u: 0.16, 'Standard / load': 'ISO 527', Direction: 'XY', Locator: 'p. 1: Tensile Breaking Strength (X-Y)' })],
  ['I-ESD-ABS-TDS', byProperty('Density'), mfr('2 g/10min', '2', '280 °C, 5 kg', 'p. 1: Melt Index')],
  // Quarantined: the sheet pairs "Method A" with 0.45 MPa and "Method B" with 1.80 MPa, the reverse of ISO 75-2, and
  // read by its loads the higher load would give the higher temperature, which cannot be.
  ...[['70℃', '70', 'ISO 75: Method A (0.45 MPa)', '0.45'], ['75℃', '75', 'ISO 75: Method B (1.80 MPa)', '1.8']].map(([raw, x, std, load]) => ['I-ESD-ABS-TDS', byProperty('Glass transition temperature'),
    { ...temp('HDT', raw, x, std, `p. 1: Heat Distortion Temperature, ${std.slice(7)}`, { 'Test load MPa': load, 'Post-processing': 'After annealing' }), 'Data status': 'Unresolved unit / layout' },
    'Quarantined: the sheet pairs Method A with 0.45 MPa and Method B with 1.80 MPa (ISO 75-2 defines A as 1.80 and B as 0.45), and by its stated loads the 1.80 MPa value (75 °C) would exceed the 0.45 MPa value (70 °C), which cannot be. Which value belongs to which load is unresolved.']),

  // iSANMATE PPSU
  ['I-PPSU-TDS', byId('V001670'), v('Elongation at yield', '7.20%', '%', 7.2, { 'Standard / load': 'ASTM D638, 3.18 mm', Locator: 'p. 1: Tensile Elongation, Yield 3.18 mm' })],
  ['I-PPSU-TDS', byId('V001670'), v('Elongation at break', '60 to 120 %', '%', 60, { hi: 120, 'Standard / load': 'ASTM D638, 3.18 mm', Locator: 'p. 1: Tensile Elongation, Break 3.18 mm' })],
  ['I-PPSU-TDS', byProperty('Density'), mfr('14 to 20 g/10 min', '14', 'ASTM D1238; 365 °C, 5.0 kg', 'p. 1: Melt volume-flow rate, 365 °C / 5.0 kg', { 'Raw upper bound': '20', 'Normalized upper bound': '20' }),
    'The sheet heads the row "Melt volume-flow rate" but gives g/10 min, a mass-flow unit.'],

  // IPCON ASA-GF
  ['R-IPCON-ASA-GF-TDS', byId('V001981'), temp('Melting temperature', '221 °C', 221, 'DSC, 10 °C/min', "Filament's properties: Melting Temperature")],
  ['R-IPCON-ASA-GF-TDS', byId('V001980'), hardness('Shore hardness 80D', '80', 'Shore D', 'Shore hardness', "Filament's properties: Surface Hardness")],
  ['R-IPCON-ASA-GF-TDS', byId('V001980'), water('0.31 %', '0.31', 'Saturated water absorption rate, 25 °C, 55% RH, room air', "Filament's properties: Saturated Water Absorption Rate")],
  ['R-IPCON-ASA-GF-TDS', byId('V001980'), mfr('19.5 g/10 min', '19.5', '270 °C, 2.16 kg', "Filament's properties: Melt Index")],
  ['R-IPCON-ASA-GF-TDS', byId('V001983'), v('Charpy strength', '23.5 kJ/m²', 'kJ/m²', 23.5, { Notch: NP, 'Standard / load': 'ISO 179, GB/T 1043', Direction: 'XY', Locator: 'Mechanical properties: Impact Strength XY' })],
  ['R-IPCON-ASA-GF-TDS', byId('V001984'), v('Charpy strength', '8.2 kJ/m²', 'kJ/m²', 8.2, { Notch: NP, 'Standard / load': 'ISO 179, GB/T 1043', Direction: 'Z', Locator: 'Mechanical properties: Impact Strength Z' })],
  // IPCON PPS-GF and PPA
  ['S-PPSGF-TDS-0', byId('V001376'), hardness('Shore hardness 83D', '83', 'Shore D', 'Shore hardness', 'p. 1: Surface Hardness')],
  ['S-PPSGF-TDS-0', byId('V001376'), mfr('22.3 g/10 min', '22.3', '340 °C, 2.16 kg', 'p. 1: Melt Index')],
  ['S-PPA-TDS', byId('V001287'), mfr('15.6 g/10 min', '15.6', '290 °C, 2.16 kg', 'p. 1: Melt Index')],
  ['D-IPCON-PPA', byId('V001324'), mfr('13.2 g/10 min', '13.2', '290 °C, 2.16 kg', 'p. 1: Melt Index')],

  // Flashforge ASA-GF10 (G034-04); the X-Y template is its tensile strength row, others its density row.
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Flexural strength', '72.5~74.1 Mpa', 'MPa', 72.5, { hi: 74.1, 'Standard / load': 'ISO 178', Locator: 'Mechanical Properties: Bending Modulus (X-Y) [sheet label; the value is the strength]' }),
    'The sheet labels 72.5~74.1 MPa "Bending Modulus" and 3359~3368 MPa "Bending Strength"; the labels are swapped.'],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Flexural modulus', '3359~3368 Mpa', 'MPa', 3359, { hi: 3368, unit: 'GPa', factor: '0.001', 'Standard / load': 'ISO 178', Locator: 'Mechanical Properties: Bending Strength (X-Y) [sheet label; the value is the modulus]' }),
    'The sheet labels 72.5~74.1 MPa "Bending Modulus" and 3359~3368 MPa "Bending Strength"; the labels are swapped.'],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Flexural strength', '27.2~31.7 Mpa', 'MPa', 27.2, { hi: 31.7, Direction: NP, 'Standard / load': 'ISO 178', Locator: 'Mechanical Properties: Bending Modulus (X-Z) [sheet label; the value is the strength]' }),
    'Source label X-Z; the labels are swapped as in the X-Y rows. Less than half the X-Y value, so not read as an on-edge XZ bar; direction recorded as not published.'],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Flexural modulus', '1359~1590 Mpa', 'MPa', 1359, { hi: 1590, unit: 'GPa', factor: '0.001', Direction: NP, 'Standard / load': 'ISO 178', Locator: 'Mechanical Properties: Bending Strength (X-Z) [sheet label; the value is the modulus]' }),
    'Source label X-Z; the labels are swapped as in the X-Y rows. Less than half the X-Y value, so not read as an on-edge XZ bar; direction recorded as not published.'],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Izod strength', '6.3~6.9 KJ/m2', 'kJ/m²', 6.3, { hi: 6.9, Notch: NP, 'Standard / load': 'ISO 180', Locator: 'Mechanical Properties: Izod Impact Strength (X-Y)' })],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001994'), v('Izod strength', '2.5~3.2 KJ/m2', 'kJ/m²', 2.5, { hi: 3.2, Notch: NP, Direction: NP, 'Standard / load': 'ISO 180', Locator: 'Mechanical Properties: Izod Impact Strength (X-Z)' }),
    'Source label X-Z; not read as an on-edge XZ bar (see the bending rows); direction recorded as not published.'],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001993'), mfr('9~15 g/10min', '9', 'ISO 1133; 220 °C, 5 kg', 'Physical Properties: Melt Index (MFR)', { 'Raw upper bound': '15', 'Normalized upper bound': '15' })],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001993'), water('< 0.5 %', '0.5', 'ISO 62, 23 °C / 24 h', 'Physical Properties: Water Absorption', { Operator: '<' })],
  ['R-FLASHFORGE-ASA-GF10-TDS', byId('V001993'), temp('Continuous service temperature', '85 ℃', 85, 'IEC 60216', 'Thermal Properties: Continuous Service Temperature')],

  // 3DXTECH PEKK, Fillamentum CPE HG100, PC-GF, Prusament PVB
  ['X-Thermax-PEKK-A-TDS-v2-1', byId('V001625'), temp('Melting temperature', '305', 305, 'DSC', 'p. 1: Melt Temperature (Tm)')],
  ['X-Thermax-PEKK-C-TDS-v3-3', byId('V001633'), temp('Melting temperature', '335', 335, 'DSC', 'p. 1: Melt Temperature (Tm)')],
  ['R-FILLAMENTUM-CPE-HG100-TDS', anyRow, hardness('115 R-Scale', '115', 'Rockwell R', 'ASTM D785', 'Physical properties: Rockwell hardness')],
  ['R-FILLAMENTUM-CPE-HG100-TDS', anyRow, mfr('1,6 g/10 min', '1.6', 'ASTM D1238; 230 °C, 1.2 kg', 'Physical properties: Melt flow index (230 °C, 1,2 kg)')],
  ['R-FILLAMENTUM-CPE-HG100-TDS', anyRow, mfr('5,9 g/10 min', '5.9', 'ASTM D1238; 230 °C, 3.8 kg', 'Physical properties: Melt flow index (230 °C, 3,8 kg)')],
  ['S-PCGF-TDS-1', byId('V000751'), mfr('8±3 g/10min', '8', 'GB/T 3682.1-2018', 'p. 1: Melt flow rate (MFR)', { 'Raw uncertainty ±': '3', 'Normalized uncertainty ±': '3' })],
  ['S-PVB-PVB-Prusament-TDS-2021-10-EN', byProperty('Density'), mfr('6–7', '6', 'ISO 1133; 230 °C, 2.16 kg', 'p. 1: MFR [g/10 min]', { 'Raw upper bound': '7', 'Normalized upper bound': '7' })],
];

export const CORRECTIONS = [
  { source: 'S-PEBA-PEBA90A-TDS-en', ids: ['V000843', 'V000844'], set: { Direction: [NP, 'Z'] }, note: 'the sheet labels the row "(Z-axis)".' },
  { source: 'I-PETG-TDS', ids: ['V000415'], set: { Property: ['Elongation at break', 'Tensile strain at strength'] },
    note: 'the row is "Elongation at Stress" (strain at tensile strength); the nominal elongation at break is a separate row (31 %).' },
  { source: 'I-PPSU-TDS', ids: ['V001674'], set: { 'Standard / load': ['ASTM', 'ASTM D648, 1.8 MPa, unannealed, 3.18 mm'], 'Test load MPa': [NP, '1.8'] },
    note: 'p. 2 prints "ASTM D648, 1.8MPa, Unannealed, 3.18 mm".' },
  { source: 'I-PPSU-TDS', ids: ['V001673'], set: { 'Standard / load': ['ASTM', 'ASTM D256, 3.18 mm'] }, note: 'p. 1 prints "Notched Izod Impact, ASTM D256, 3.18 mm".' },
  { source: 'I-PPSU-TDS', ids: ['V001675'], set: { 'Standard / load': ['ASTM', 'ASTM E1356'] }, note: 'p. 2 prints "Glass Transition Temperature, ASTM E1356".' },
];

export function migrate(t) {
  for (const c of CORRECTIONS) correct(t, { ...c, migration: MIGRATION });
  const added = [];
  for (const [source, template, set, note] of ADDITIONS) {
    const like = template(t, source);
    if (t.get('measurements', like).SourceID !== source) throw new Error(`${MIGRATION}: template ${like} is not from ${source}`);
    added.push(addValue(t, { migration: MIGRATION, like, set, note }));
  }
  return added;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const by = new Map();
  for (const c of t.save()) by.set(`${c.table} ${c.action} ${c.field ?? ''}`, (by.get(`${c.table} ${c.action} ${c.field ?? ''}`) ?? 0) + 1);
  for (const [k, n] of by) console.log(`${String(n).padStart(4)}  ${k}`);
}
