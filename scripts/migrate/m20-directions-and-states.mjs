#!/usr/bin/env node
// Migration m20: directions, specimen forms and post-processing states against re-read sources (audit 2026-09-15,
// findings B-03, B-05, B-06, D-03, D-04, D-08). Every source was re-read on 2026-09-15 with its SHA-256 matched.
//
// - IPCON PPA, PPA GF and PPS GF print their Z results as "Tensile Strength Z" and so on; 18 rows had Direction
//   "Not published", and their pairs taught the unknown-direction conversions a positive offset (B-04). The sheets'
//   footnote says the mechanical properties "were tested on specimens printed by IPCON".
// - IPCON PPA prints "Vicat ... 106 °C; 133 °C (annealed)" and "HDT ISO 75, 0.45 MPa 103 °C; 131 °C (annealed)": the
//   recorded 133 and 131 °C are the annealed values (m21 adds the as-printed ones).
// - Bambu Lab sheets print "Test Specimen Printing Conditions" and "All the specimens were annealed and dried at ...
//   before testing"; eleven sheets were coded as if they said neither. They now follow the coding of the sheets that
//   were (B-pa6-cf-TDS): printed specimens, and the sentence on every row but the melt index.
// - Flashforge ASA-GF10 prints its bending and Izod rows "(X-Y)"; eleven rows on sheets that print no direction said
//   "Not applicable", which is reserved for density and thermal transitions.
// - I-PPSU-TDS prints its HDT "unannealed"; I-TPU-TDS names ASTM D256 at 23 °C; MatterHackers PCTG's ISO 180/A is
//   the notched type-A specimen; PEBA 90A's Izod row is on p. 2.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm20';
const DATE = '2026-09-15';
const NA = 'Not applicable';
const NP = 'Not published';
const UNSTATED_SPECIMEN = 'Not published (do not assume printed)';
const PRINTED = 'Printed specimen';

const range = (a, b, prefix = 'V') => Array.from({ length: b - a + 1 }, (_, i) => `${prefix}${String(a + i).padStart(6, '0')}`);

const IPCON = {
  'S-PPA-TDS': { z: ['V001291', 'V001293', 'V001295', 'V001297', 'V001299', 'V001301'], mechanical: range(1290, 1301) },
  'D-IPCON-PPA': { z: ['V001328', 'V001330', 'V001332', 'V001334', 'V001336', 'V001338'], mechanical: range(1327, 1338) },
  'S-PPSGF-TDS-0': { z: ['V001380', 'V001382', 'V001384', 'V001386', 'V001388', 'V001390'], mechanical: range(1379, 1390) },
};

// Each sheet's own preparation sentence, as printed (spacing normalised). null: the post-processing is already coded.
const BAMBU = {
  'B-abs-gf-TDS': 'All the specimens were annealed and dried at 80 °C for 12 h before testing',
  'B-pa6-gf-TDS': 'All the specimens were annealed and dried at 80 °C for 12 h before testing',
  'B-pc-fr-TDS': 'All the specimens were annealed and dried at 80 °C for 12 h before testing',
  'B-pet-cf-TDS': 'All the specimens were annealed and dried at 80 °C for 12 h before testing',
  'B-pla-sparkle-TDS': 'All the specimens were annealed and dried at 55 °C for 8 hours before testing',
  'B-pla-tough-upgrade-TDS': 'All the specimens were annealed and dried at 50 °C for 8 h before testing',
  'B-pla-translucent-TDS': 'All the specimens were annealed and dried at 50 °C for 8 h before testing',
  'B-tpu-for-ams-TDS': 'All the specimens were annealed and dried at 70 °C for 12 h before testing',
  'B-petg-hf-TDS': null,
  'B-pla-aero-TDS': null,
  'B-pla-galaxy-TDS': null,
  'B-pla-silk-dual-color-TDS': null,
  'B-pla-silk-upgrade-TDS': null,
  'B-pps-cf-TDS': null,
};

export const POST_PROCESSING_WORDINGS = [
  ['All the specimens were annealed and dried at 50 °C for 8 h before testing', 'annealed'],
  ['All the specimens were annealed and dried at 55 °C for 8 hours before testing', 'annealed'],
  ['Annealed (schedule not stated)', 'annealed'],
];

export function migrate(t) {
  const fix = (source, ids, set, note) => correct(t, { source, ids, set, note, migration: MIGRATION, date: DATE });
  const rowsOf = (source) => t.rows('measurements').filter((r) => r.SourceID === source && r['Data status'] !== 'Retired duplicate record');

  for (const [source, { z, mechanical }] of Object.entries(IPCON)) {
    fix(source, z, { Direction: [NP, 'Z'] }, 'Direction Z: the sheet prints this result under its "Z" label.');
    fix(source, mechanical, { 'Specimen type': [UNSTATED_SPECIMEN, PRINTED] }, 'the footnote says the mechanical properties "were tested on specimens printed by IPCON".');
  }
  fix('S-PPA-TDS', ['V001288', 'V001289'], { 'Post-processing': [NP, 'Annealed (schedule not stated)'] },
    'p. 1 prints the as-printed value first and this one "(annealed)" after it; no schedule is given.');

  for (const [source, sentence] of Object.entries(BAMBU)) {
    const rows = rowsOf(source);
    fix(source, rows.filter((r) => r['Specimen type'] === UNSTATED_SPECIMEN).map((r) => r.MeasurementID),
      { 'Specimen type': [UNSTATED_SPECIMEN, PRINTED] }, 'the sheet gives the "Test Specimen Printing Conditions" of every specimen.');
    if (sentence) {
      fix(source, rows.filter((r) => r.Property !== 'Melt mass-flow rate' && r['Post-processing'] === NP).map((r) => r.MeasurementID),
        { 'Post-processing': [NP, sentence] }, `the sheet prints "${sentence}".`);
    }
  }

  fix('R-FLASHFORGE-ASA-GF10-TDS', ['V002203', 'V002204', 'V002207'], { Direction: [NA, 'XY'] }, 'the sheet prints this row "(X-Y)".');
  for (const [source, ids] of Object.entries({
    'I-CF-ABS-TDS': ['V002170', 'V002171', 'V002172', 'V002173'], 'I-PETG-TDS': ['V002182', 'V002183'],
    'I-PPSU-TDS': ['V002190', 'V002191'], 'I-ASA-Glass-Fiber-Technical-Data-Sheet': ['V002219', 'V002220', 'V002221'],
  })) fix(source, ids, { Direction: [NA, NP] }, 'the sheet prints no direction; "Not applicable" is for density and thermal transitions.');

  fix('I-PPSU-TDS', ['V001674'], { 'Post-processing': [NP, 'Unannealed'] }, 'p. 2 prints "ASTM D648 ... Unannealed, 3.18".');
  fix('I-TPU-TDS', ['V000762'], { 'Standard / load': [NP, 'ASTM D256'], 'Test temperature': [NP, '23 °C'] }, 'p. 1 prints "Izod Impact Strength, notched (at 23 C) ASTM D256".');
  fix('X-MAXG-PCTG-TDS-v1-0', ['V001529'], { Notch: [NP, 'Notched'] }, 'ISO 180/A is the notched type-A specimen.');
  fix('S-PEBA-PEBA90A-TDS-en', ['V002167'], { Locator: ['p. 1: IZOD Impact Strength (XY-axis)', 'p. 2: IZOD Impact Strength (XY-axis)'] }, 'the Izod row is printed on p. 2.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
