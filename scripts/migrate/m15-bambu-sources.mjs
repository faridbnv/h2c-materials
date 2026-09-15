#!/usr/bin/env node
// Migration m15: the Bambu Lab data sheets against the tables, re-read 2026-09-14 (npm run audit:sources; every
// SHA-256 matched).
//
// - Seven sheets print two X-Y impact results in one cell, "32.0 ± 2.5 kJ/m²; 8.2 ± 1.6 kJ/m² (notched)". Only the
//   first was transcribed, with no notch state; it is the un-notched result (the other is marked notched, and
//   PLA Tough Upgrade's rows were already split this way). The notched results are added.
// - PLA Tough Upgrade's Z cell reads "25.9 ± 3.3 kJ/m²  18.6 ± 2.3 kJ/m² (Silver)" (checked on the rendered page):
//   the recorded 18.6 is the Silver colour's; the 25.9 is added.
// - Every sheet's melt index ("Melt Index 210 °C, 2.16 kg 23.2 ± 3.5 g/10 min") was never transcribed: 40 values.
// Re-runnable; stops if the data moved.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct, addValue, withNote } from './source-edits.mjs';

const MIGRATION = 'm15';
const NA = 'Not applicable';

// [the X-Y impact row, notched value, uncertainty]
const NOTCHED = [
  ['V000651', '8.2', '1.6'], // ASA Aero
  ['V000182', '8.2', '0.5'], // PLA Silk Dual Color
  ['V000281', '17.6', '2.2'], // PLA Galaxy
  ['V000461', '6.2', '1.8'], // PETG HF
  ['V000585', '4.2', '1.1'], // ABS-GF
  ['V000669', '6.2', '1.4'], // ASA-CF
  ['V001320', '6.5', '2.3'], // PPA-CF
];

// [the sheet's density row (for grade and source), value, uncertainty, °C, kg, page], extracted from the cached
// documents and checked against each printed line (shown after each entry).
export const MELT_INDEX = [
  ["V000042", "23.2", "3.5", "210", "2.16", 2], // B-pla-basic-filament-TDS: Melt Index 210 °C, 2.16 kg 23.2 ± 3.5 g/10 min
  ["V000063", "18.0", "3.2", "210", "2.16", 2], // B-pla-matte-TDS: Melt Index 210 °C, 2.16 kg 18.0 ± 3.2 g/ 10 min
  ["V000083", "45.8", "6.6", "210", "2.16", 2], // B-pla-basic-gradient-TDS: Melt Index 210 ° C , 2.16 kg 4 5 . 8 ± 6 . 6 g/ 10 min
  ["V000104", "18.0", "2.5", "210", "2.16", 2], // B-pla-tough-upgrade-TDS: Melt Index 2 10 ° C, 2.16 kg 18.0 ± 2.5 g/10 min
  ["V000124", "4.08", "1.5", "210", "2.16", 2], // B-pla-translucent-TDS: Melt Index 210 ° C, 2.16 kg 4.08 ± 1.5 g/10 min
  ["V000144", "14.5", "1.2", "210", "2.16", 2], // B-pla-silk-upgrade-TDS: Melt Index 210 ° C , 2.16 kg 14.5 ± 1.2 g/10 min
  ["V000164", "20.5", "1.2", "210", "2.16", 2], // B-pla-silk-dual-color-TDS: Melt Index 210 ° C , 2.16 kg 20.5 ± 1.2 g/10 min
  ["V000184", "38.6", "3.7", "210", "2.16", 2], // B-pla-metal-TDS: Melt Index 210 ° C , 2.16 kg 38.6 ± 3.7 g/10 min
  ["V000204", "32.2", "4.5", "210", "2.16", 2], // B-pla-marble-TDS: Melt Index 210 °C, 2.16 kg 32.2 ± 4.5 g/10 min
  ["V000224", "34.2", "3.3", "210", "2.16", 2], // B-pla-sparkle-TDS: Melt Index 210 °C, 2.16 kg 34.2 ± 3.3 g/10 min
  ["V000244", "29.4", "1.7", "210", "2.16", 2], // B-pla-wood-TDS: Melt Index 210 °C, 2.16 kg 29.4 ± 1.7 g/10 min
  ["V000264", "11.0", "1.7", "210", "2.16", 2], // B-pla-galaxy-TDS: Melt Index 210 ° C , 2.16 kg 11.0 ± 1.7 g/10 min
  ["V000283", "23.3", "2.4", "210", "2.16", 2], // B-pla-glow-TDS: Melt Index 210 ° C , 2.16 kg 23.3± 2.4 g/10 min
  ["V000303", "7.7", "0.6", "260", "2.16", 2], // B-pla-aero-TDS: Melt Index 260 ° C, 2.16 kg 7.7 ± 0.6 g/10 min
  ["V000323", "3.7", "0.6", "210", "2.16", 2], // B-pla-cf-TDS: Melt Index 210 ° C , 2.16 kg 3 . 7 ± 0 . 6 g/ 10 min
  ["V000423", "22.9", "2.4", "245", "2.16", 2], // B-petg-basic-TDS: Melt Index 2 45 °C, 2.16 kg 22.9 ± 2 . 4 g/10 min
  ["V000443", "28.2", "2.7", "210", "2.16", 2], // B-petg-hf-TDS: Melt Index 210 ° C , 2.16 kg 28.2 ± 2.7 g/10 min
  ["V000463", "11.7", "1.5", "230", "2.16", 2], // B-petg-translucent-TDS: Melt Index 230 °C, 2.16 kg 11.7 ± 1.5 g/10 min
  ["V000484", "19.3", "2.4", "250", "2.16", 2], // B-petg-cf-TDS: Melt Inde x 2 5 0 ° C , 2.16 kg 19.3 ± 2.4 g/ 10 min
  ["V000546", "34.2", "3.8", "260", "2.16", 2], // B-abs-filament-TDS: Melt Index 260 °C, 2.16 kg 34.2 ± 3.8 g/10 min
  ["V000567", "7.56", "1.4", "210", "2.16", 2], // B-abs-gf-TDS: Melt Index 210 ° C , 2.16 kg 7.56 ± 1.4 g/10 min
  ["V000612", "7.0", "0.8", "260", "2.16", 2], // B-asa-filament-TDS: Melt Index 260 °C, 2.16 kg 7.0 ± 0.8 g/10 min
  ["V000633", "1.56", "0.5", "210", "2.16", 2], // B-asa-aero-TDS: Melt Index 210 ° C , 2.16 kg 1.56 ± 0.5 g/10 min
  ["V000653", "1.74", "0.3", "210", "2.16", 2], // B-asa-cf-TDS: Melt Index 210 ° C , 2.16 kg 1 .74 ± 0.3 g/10 min
  ["V000677", "32.2", "2.9", "260", "2.16", 2], // B-PC-TDS: Melt Index 260 ° C , 2.16 kg 32.2 ± 2.9 g/10 min
  ["V000698", "26.4", "2.7", "260", "2.16", 2], // B-pc-fr-TDS: Melt Index 260 ° C, 2.16 kg 26.4 ± 2.7 g/10 min
  ["V000768", "21.8", "0.3", "210", "2.16", 2], // B-tpu-for-ams-TDS: Melt Index 210 ° C, 2.16 kg 21.8 ± 0.3 g/10 min
  ["V000784", "36.5", "2.6", "210", "2.16", 2], // B-tpu-95a-hf-TDS: Melt Index 210 ° C , 2.16 kg 36.5 ± 2.6 g/10 min
  ["V000803", "9.36", "2.6", "210", "2.16", 2], // B-TPU-SOFT-TDS-4: Melt Index 210 ° C , 2.16 kg 9.36 ± 2.6 g/10 min
  ["V000819", "8.76", "2.6", "210", "2.16", 2], // B-TPU-SOFT-TDS-5: Melt Index 210 ° C , 2.16 kg 8.76 ± 2.6 g/10 min
  ["V000896", "14.4", "2.0", "280", "2.16", 2], // B-paht-cf-TDS: Melt Inde x 280 ° C , 2.16 kg 14 . 4 ± 2 . 0 g/ 10 min
  ["V000922", "6.8", "0.6", "280", "2.16", 2], // B-pa6-cf-TDS: Melt Index 280 °C, 2.16 kg 6.8 ± 0.6 g/10 min
  ["V000943", "9.0", "0.8", "280", "2.16", 2], // B-pa6-gf-TDS: Melt Index 280 ° C, 2.16 kg 9.0 ± 0.8 g/10 min
  ["V001264", "25.3", "2.5", "280", "2.16", 2], // B-pet-cf-TDS: Melt Index 280 ° C , 2.16 kg 25.3 ± 2.5 g/10 min
  ["V001302", "8.4", "0.7", "280", "2.16", 2], // B-ppa-cf-TDS: Melt Index 2 8 0 ° C , 2.16 kg 8.4 ± 0.7 g/10 min
  ["V001353", "11.48", "1.23", "320", "2.16", 2], // B-pps-cf-TDS: Melt Index 320 ° C, 2.16 kg 11.48 ± 1.23 g/10 min
  ["V001406", "7.2", "1.1", "210", "2.16", 2], // B-pva-TDS: Melt Index 210 ° C , 2.16 kg 7.2 ± 1.1 g/10 min
  ["V001427", "14.3", "1.2", "210", "2.16", 2], // B-support-for-pla-petg-TDS: Melt Index 210 ° C, 2.16 kg 14.3 ± 1.2 g/10 min
  ["V001439", "11.6", "0.7", "210", "2.16", 2], // B-support-for-abs-TDS: Melt Index 210 ° C , 2.16 kg 11. 6 ± 0 .7 g/10 min
  ["V001458", "29.2", "2.1", "280", "2.16", 2], // B-support-for-pa-pet-TDS: Melt Index 280 °C, 2.16 kg 29.2 ± 2.1 g/10 min
];

export function migrate(t) {
  for (const [id, value, u] of NOTCHED) {
    const row = t.get('measurements', id);
    correct(t, { migration: MIGRATION, source: row.SourceID, ids: [id], set: { Notch: ['Not published', 'Unnotched'] },
      note: `the sheet pairs this value with ${value} ± ${u} kJ/m² marked (notched).` });
    addValue(t, { migration: MIGRATION, like: id, set: {
      'Raw value': `${value} ± ${u} kJ/m² (notched)`, 'Raw numeric': value, 'Raw uncertainty ±': u, 'Normalized value': value, 'Normalized uncertainty ±': u,
      Notch: 'Notched', Direction: row.Direction, 'Moisture condition': row['Moisture condition'], 'Test temperature': row['Test temperature'], Locator: `${row.Locator} (notched)`,
    } });
  }

  const silver = t.get('measurements', 'V000123');
  const silverNote = 'The sheet\'s Z cell gives 25.9 ± 3.3 kJ/m² and this 18.6 ± 2.3 kJ/m² marked (Silver): this is the Silver colour\'s value (m15, checked on the rendered page).';
  if (!silver.Notes.includes(silverNote)) t.set('measurements', 'V000123', 'Notes', withNote(silver.Notes, silverNote), { expect: silver.Notes });
  if (silver.Locator !== 'p. 2: Impact Strength (Z) (Silver)') t.set('measurements', 'V000123', 'Locator', 'p. 2: Impact Strength (Z) (Silver)', { expect: 'p. 2: Impact Strength (Z)' });
  addValue(t, { migration: MIGRATION, like: 'V000123', set: {
    'Raw value': '25.9 ± 3.3 kJ/m²', 'Raw numeric': '25.9', 'Raw uncertainty ±': '3.3', 'Normalized value': '25.9', 'Normalized uncertainty ±': '3.3',
    Notch: silver.Notch, Direction: 'Z', 'Moisture condition': silver['Moisture condition'], Locator: 'p. 2: Impact Strength (Z)',
  } });

  for (const [density, value, u, temperature, kg, page] of MELT_INDEX) {
    addValue(t, { migration: MIGRATION, like: density, set: {
      Property: 'Melt mass-flow rate', 'Raw value': `${value} ± ${u} g/10 min`, 'Raw unit': 'g/10 min', 'Raw numeric': value, 'Raw uncertainty ±': u,
      'Normalized value': value, 'Normalized uncertainty ±': u, 'Normalized unit': 'g/10 min', 'Specimen type': 'Not published', 'Post-processing': 'Not published',
      'Standard / load': `${temperature} °C, ${kg} kg`, Locator: `p. ${page}: Melt Index`,
    } });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  const by = new Map();
  for (const c of t.save()) by.set(`${c.table} ${c.action} ${c.field ?? ''}`, (by.get(`${c.table} ${c.action} ${c.field ?? ''}`) ?? 0) + 1);
  for (const [k, n] of by) console.log(`${String(n).padStart(4)}  ${k}`);
}
