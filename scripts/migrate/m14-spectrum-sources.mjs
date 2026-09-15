#!/usr/bin/env node
// Migration m14: the Spectrum data sheets against the tables, re-read 2026-09-14 (npm run audit:sources; every
// SHA-256 matched). Spectrum prints its heat deflection results beside a feature list, and the transcription
// dropped most of them.
//
// - Heat deflection at both loads was never transcribed for PCTG, PCTG CF10, PA12 CF15, PC CF and PPS AM230,
//   nor PA6 Neat's HDT A or PC/ABS FR V0's 1.8 MPa value; also PA6 Neat's and PPS AM230's tensile moduli,
//   impact results of PCTG CF10, ASA-X GF10 and PC/ABS FR V0, PC CF's notched Izod, and melt flow rates.
// - Values the sheet marks "*injection moulding" (PPS AM230, PEBA) are moulded specimens ("Raw material value"),
//   as the ASA-X GF10 rows already were; they convert to printed values through the moulded conversions.
// - "ISO 179 1eU" is the un-notched Charpy test: PA6 Neat's and PA12 CF15's rows now say so.
// - ASA-X GF10's 1.81 MN/m² heat deflection row is the 1.8 MPa load, as is Formfutura PET's "ISO 75-2, HDT A"
//   (the parser now reads 1.81, 1.820 and ISO 75's method letters).
// Re-runnable; stops if the data moved.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct, addValue } from './source-edits.mjs';

const MIGRATION = 'm14';
const S = (name) => `S-SPECTRUM-en-tds-spectrum-${name}`;
const NOT_ASSUMED = 'Not published (do not assume printed)';
const MOULDED = 'Raw material value';
const num = (raw) => raw.replace(/(\d),(\d)/, '$1.$2').match(/-?[\d.]+/)[0]; // "5,5" is 5.5

const hdt = (raw, load, standard, locator, extra = {}) => ({
  Property: 'HDT', 'Raw value': raw, 'Raw unit': '°C', 'Raw numeric': num(raw), 'Normalized value': num(raw), 'Normalized unit': '°C',
  'Standard / load': standard, 'Test load MPa': String(load), Locator: locator, Direction: 'Not applicable', ...extra,
});
const mfr = (raw, conditions, locator) => ({
  Property: 'Melt mass-flow rate', 'Raw value': raw, 'Raw unit': 'g/10 min', 'Raw numeric': num(raw), 'Normalized value': num(raw), 'Normalized unit': 'g/10 min',
  'Standard / load': conditions, Locator: locator, Direction: 'Not applicable', 'Specimen type': 'Not published',
});
const impact = (property, raw, unit, notch, standard, locator, extra = {}) => ({
  Property: property, 'Raw value': raw, 'Raw unit': unit, 'Raw numeric': num(raw), 'Normalized value': num(raw), 'Normalized unit': unit.replace('m2', 'm²'),
  Notch: notch, 'Standard / load': standard, Locator: locator, Direction: 'Not published', ...extra,
});
const noBreak = (standard, temperature, locator) => ({
  Property: 'Charpy strength', 'Raw value': 'NB', 'Raw unit': 'Qualitative (no fracture)', 'Raw numeric': 'Not applicable', 'Normalized value': 'Insufficient comparable data',
  'Normalized unit': 'Qualitative (no fracture)', 'Data status': 'Published qualitative result', Notch: 'Unnotched', 'Standard / load': standard,
  'Test temperature': temperature, Locator: locator, Direction: 'Not published',
});

export const CORRECTIONS = [
  { source: S('pps-am230'), ids: ['V001348', 'V001349', 'V001350', 'V001351', 'V001352'], set: { 'Specimen type': [NOT_ASSUMED, MOULDED] },
    note: 'the sheet marks this value "*injection moulding".' },
  { source: S('peba'), ids: ['V000849', 'V000850', 'V000851', 'V000852', 'V000853'], set: { 'Specimen type': [NOT_ASSUMED, MOULDED] },
    note: 'the sheet labels this value "23°C, injection moulding".' },
  { source: S('pa6-neat-bk'), ids: ['V000921'], set: { Notch: ['Not published', 'Unnotched'] }, note: 'ISO 179 1eU is the un-notched Charpy test.' },
  { source: S('pa12-cf15'), ids: ['V001005'], set: { Notch: ['Not published', 'Unnotched'] },
    note: 'ISO 179/1eU is the un-notched Charpy test; the sheet lists the notched result separately (V001006, whose code also reads 1eU).' },
  { source: S('asax-x-gf10'), ids: ['V002001'], set: { 'Test load MPa': ['Not published', '1.8'] }, note: '1.81 MN/m² is the 1.8 MPa load.' },
  // Not Spectrum: the parser's new "HDT A" spelling reads this Formfutura row's load, so its typed value follows.
  { source: 'S-PET-TDS', ids: ['V001762'], set: { 'Test load MPa': ['Not published', '1.8'] }, note: 'ISO 75-2 method A (HDT A) is the 1.80 MPa load.' },
  { source: S('pctg-cf10'), ids: ['V001546'], set: { 'Standard / load': ['•', 'Not published'] }, note: 'the standard cell held a bullet from the feature list.' },
  { source: S('petg-esd'), ids: ['V000545'], set: { Notes: ['Not applicable', 'The sheet gives two densities: Specific Gravity 1.23 g/cm3 (D 792, V000535) in its property table and this 1.19 g/cm3 in its print settings block.'] },
    note: 'two densities are printed.' },
];

export const ADDITIONS = [
  // PA6 Neat BK (G049-01); template: its tensile strength row.
  { like: 'V000919', set: { Property: 'Tensile modulus', 'Raw value': '3.4 GPa', 'Raw unit': 'GPa', 'Raw numeric': '3.4', 'Normalized value': '3.4', 'Normalized unit': 'GPa',
    'Standard / load': 'ISO 527, dry, 1 mm/min', 'Moisture condition': 'Dry (source row); table heading 50% RH', 'Test temperature': '23°C', Locator: 'p. 1: Modulus of elasticity (dry, at 1 mm/min)' } },
  { like: 'V000919', set: hdt('90°C', 1.8, 'ISO 75 (HDT A)', 'p. 1: Heat distortion temperature (HDT A)') },
  { like: 'V000919', set: { Property: 'Continuous service temperature', 'Raw value': '120°C', 'Raw unit': '°C', 'Raw numeric': '120', 'Normalized value': '120', 'Normalized unit': '°C',
    'Standard / load': 'IEC 60216; 20,000 h', Direction: 'Not applicable', Locator: 'p. 1: Continous service temperature (20.000h)' } },
  { like: 'V000919', set: mfr('5,5 g/10 min', 'ISO 1133; 250 °C, 2.16 kg', 'p. 1: Melt flow rate (MFR), 250°C / 2,16kg') },
  // PC CF (G037-02); template: its Vicat row.
  { like: 'V000732', set: hdt('140°C', 0.45, 'D 648, 0.45 MN/m²', 'p. 1: Heat Deflection Temperature 0.45mn/m2') },
  { like: 'V000732', set: hdt('129°C', 1.8, 'D 648, 1.81 MN/m²', 'p. 1: Heat Deflection Temperature 1.81mn/m2') },
  { like: 'V000732', set: impact('Izod strength', '70 kg∙cm/cm', 'kg·cm/cm', 'Notched', 'D 256', 'p. 1: Izod Impact Strength, Notched @ 23°C',
    { 'Test temperature': '23°C', 'Conversion factor': '9.80665', 'Normalized value': '686.5', 'Normalized unit': 'J/m' }),
    note: '70 kgf·cm/cm is 686.5 J/m (× 9.80665).' },
  // PPS AM230 (G072-02); template: its tensile strength row, now a moulded specimen.
  { like: 'V001351', set: { Property: 'Tensile modulus', 'Raw value': '3650 MPa', 'Raw unit': 'MPa', 'Raw numeric': '3650', 'Conversion factor': '0.001', 'Normalized value': '3.65', 'Normalized unit': 'GPa',
    'Standard / load': 'ISO 527 (1), 1 mm/min', 'Specimen type': MOULDED, Locator: 'p. 1: Elastic modulus tensile* (speed 1mm/min)' }, note: 'Marked "*injection moulding".' },
  { like: 'V001351', set: hdt('129°C', 0.45, 'ISO 75, 0.45 MN/m²', 'p. 1: Heat Deflection Temperature 0.45mn/m2*', { 'Specimen type': MOULDED }), note: 'Marked "*injection moulding".' },
  { like: 'V001351', set: hdt('107°C', 1.8, 'ISO 75, 1.81 MN/m²', 'p. 1: Heat Deflection Temperature 1.81mn/m2*', { 'Specimen type': MOULDED }), note: 'Marked "*injection moulding".' },
  // PCTG (G088-02); template: its Vicat row.
  { like: 'V001541', set: hdt('76°C', 0.45, 'ISO 75, 0.455 MPa', 'p. 1: Heat Distortion Temperature @ 0.455MPa') },
  { like: 'V001541', set: hdt('64°C', 1.8, 'ISO 75, 1.820 MPa', 'p. 1: Heat Distortion Temperature @ 1.820 MPa') },
  // PCTG CF10 (G090-02); template: its Vicat row.
  { like: 'V001546', set: hdt('78°C', 0.45, '0.455 MPa (standard not stated)', 'p. 1: Heat Distortion Temperature @ 0.455MPa') },
  { like: 'V001546', set: hdt('68°C', 1.8, '1.820 MPa (standard not stated)', 'p. 1: Heat Distortion Temperature @ 1.820 MPa') },
  { like: 'V001546', set: impact('Impact strength', '45kJ/m2', 'kJ/m2', 'Unnotched', 'ISO 179-1eU', 'p. 1: Izod Impact Strenght, Unnotched @ 23°C', { 'Test temperature': '23°C' }),
    note: 'The sheet heads the rows "Izod Impact Strenght" but cites ISO 179-1eU (Charpy), so the test type is recorded as unspecified.' },
  { like: 'V001546', set: impact('Impact strength', '4kJ/m2', 'kJ/m2', 'Notched', 'ISO 179-1eU (as printed)', 'p. 1: Izod Impact Strenght, Notched @ 23°C', { 'Test temperature': '23°C' }),
    note: 'The sheet heads the rows "Izod Impact Strenght" but cites ISO 179-1eU (Charpy), so the test type is recorded as unspecified.' },
  // PA12 CF15 (G053-03); template: its tensile modulus row.
  { like: 'V001004', set: hdt('170°C', 0.45, 'ISO 75-1/2, 0.45 MPa', 'p. 1: Temperature of deflection under load 0.45 MPa') },
  { like: 'V001004', set: hdt('150°C', 1.8, 'ISO 75-1/2, 1.8 MPa', 'p. 1: Temperature of deflection under load 1.8 MPa') },
  { like: 'V001004', set: mfr('3 g/10min', '210 °C, 2.16 kg (the sheet cites ISO 1183)', 'p. 1: MFR (210°C, 2.16kg)') },
  // PC/ABS FR V0 (G094-03); template: its Vicat row.
  { like: 'V001582', set: hdt('90°C', 1.8, 'ISO 75-2/A, 1.8 MPa', 'p. 1: Heat Deflection Temperature 1.8 MPa') },
  { like: 'V001582', set: noBreak('ISO 179', '-30°C', 'p. 1: Charpy impact strength, unnotched, -30°C') },
  { like: 'V001582', set: noBreak('ISO 179', '23°C', 'p. 1: Charpy impact strength, unnotched, 23°C') },
  // ASA-X GF10 (G034-01); template: its moulded tensile strength row.
  { like: 'V001997', set: impact('Charpy strength', '25 kJ/m2', 'kJ/m2', 'Unnotched', 'ISO 179-1eU', 'Mechanical properties: Charpy impact strength* unnotched (at 23°C)', { 'Test temperature': '23°C' }),
    note: 'Marked "*injection moulding".' },
  { like: 'V001997', set: impact('Charpy strength', '8.3 kJ/m2', 'kJ/m2', 'Notched', 'ISO 179-1eA', 'Mechanical properties: Charpy impact strength* notched (at 23°C)', { 'Test temperature': '23°C' }),
    note: 'Marked "*injection moulding".' },
  // HIPS-X (G081-02); template: its density row.
  { like: 'V001478', set: mfr('12 g/10min', 'ISO 1133; 200 °C, 5.0 kg', 'p. 1: Melt Flow Rate, (200°C/5.0kg)') },
];

// Coverage findings the added values make untrue.
export const COVERAGE = [
  { id: 'C00547', from: ['Gap', 'Insufficient grade-specific evidence in sampled sources. Shared family notes may be available; no numerical substitution.'],
    to: ['Evidence recorded', 'Spectrum PA6 Neat publishes HDT A (1.8 MPa) 90 °C and a continuous service temperature of 120 °C (20,000 h); no 0.45 MPa value. HDT, Tg and Vicat are not continuous-service ratings.'] },
];

export function migrate(t) {
  for (const c of COVERAGE) {
    const row = t.get('coverage', c.id);
    if (row.Status === c.to[0] && row.Finding === c.to[1]) continue;
    t.set('coverage', c.id, 'Status', c.to[0], { expect: c.from[0] });
    t.set('coverage', c.id, 'Finding', c.to[1], { expect: c.from[1] });
  }
  for (const c of CORRECTIONS) {
    // A Notes-only correction writes the note itself rather than a second note about it.
    if (Object.keys(c.set).length === 1 && c.set.Notes) {
      const row = t.get('measurements', c.ids[0]);
      if (row.Notes !== c.set.Notes[1]) t.set('measurements', c.ids[0], 'Notes', c.set.Notes[1], { expect: c.set.Notes[0] });
      continue;
    }
    correct(t, { ...c, migration: MIGRATION });
  }
  return ADDITIONS.map((a) => addValue(t, { ...a, migration: MIGRATION }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const by = new Map();
  for (const c of t.save()) by.set(`${c.table} ${c.action} ${c.field ?? ''}`, (by.get(`${c.table} ${c.action} ${c.field ?? ''}`) ?? 0) + 1);
  for (const [k, n] of by) console.log(`${String(n).padStart(4)}  ${k}`);
}
