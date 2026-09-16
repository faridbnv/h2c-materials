#!/usr/bin/env node
// Migration m33: "Specimen / print parameters" cells that held a sheet's marketing paragraph or a description of the
// source instead of the specimen preparation and print conditions the sheet ties to its test values (D63). Each of
// the eight sources was re-read on 2026-09-16 from .cache/sources/ with its SHA-256 matched to sources.csv.
//
// - iSANMATE PLA, PETG, CF-ABS, TPU: the cell was the description paragraph of p. 1 ("... printing temperature, ...
//   bed temperature, having excellent interlayer adhesion ..."), a recommended printing range in marketing prose. The
//   sheets publish no specimen preparation or print conditions for their test values; their Print Recommendation
//   table is a printing guide. The cell becomes Not published; the range is kept in Notes, with its page.
// - Bambu Support for PLA: the cell described the source. The sheet has no Specimen Printing Conditions table (its
//   siblings do); p. 3 says only that values are tested by standard samples at Bambu Lab. Not published.
// - BASF Ultrafuse PC GF30: p. 3 heads its mechanical columns "Print direction XY Flat / XZ On its edge / ZX Upright";
//   that is the only specimen preparation the sheet states, and the cell now carries it. The p. 2 Recommended
//   3D-Print processing parameters are a printing guide, not stated as the specimen's. General and thermal rows:
//   Not published.
// - Essentium PPS-CF: p. 1 heads its mechanical columns "Print Orientation XY / 45/45 / ZX" and says "Standard
//   deviations listed in parentheses"; the cell carries the orientation and Notes keep the remark. The p. 2
//   Recommended FFF Print Settings are a printing guide. Material-property rows: Not published.
// - Kimya PEBA-S: the sheet ties no print conditions to its values. Its PROCESSING block (Printing Direction XY,
//   Printing Speed 44 mm/s, nozzle 235-245 °C, bed 80-90 °C) is a processing setting beside the tensile tests'
//   ISO 37 (m21); Not published, with the block and the sheet's NOTES kept in Notes.
//
// Standard / load cells the sheets plainly contradict are corrected here too, each with its own note: iSANMATE TPU
// prints ASTM D638 for its tensile rows and DSC for the glass transition, ASTM D570 (24h) for moisture absorption;
// iSANMATE PETG prints ASTM D570 and ASTM D3418.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm33';
const DATE = '2026-09-16';
const FIELD = 'Specimen / print parameters';
const NP = 'Not published';
const ids = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => `V${String(from + i).padStart(6, '0')}`);

const ISANMATE = /^printing temperature,/;
const GUIDE = (nozzle, bed, page) => `the cell held the description paragraph of p. 1, a recommended printing range (${nozzle} printing temperature, ${bed} bed temperature) in marketing prose, not a test-specimen condition; the sheet publishes no specimen preparation or print conditions for its test values, and its Print Recommendation table (${page}) is a printing guide.`;

export const EDITS = [
  { source: 'I-PLA-TDS', ids: ['V000038', 'V000039', 'V000040', 'V000041', 'V002179', 'V002180', 'V002181'],
    set: { [FIELD]: [ISANMATE, NP] }, note: `${GUIDE('190-220 ºC', '50 ºC', 'p. 2')} Its mechanical values are ASTM D882 film results.` },
  { source: 'I-PETG-TDS', ids: [...ids(410, 422), ...ids(2182, 2185)], set: { [FIELD]: [ISANMATE, NP] }, note: GUIDE('210-235 ºC', '50-80 ºC', 'p. 2') },
  { source: 'I-CF-ABS-TDS', ids: ['V000595', ...ids(2169, 2175)], set: { [FIELD]: [ISANMATE, NP] }, note: GUIDE('220-240 ºC', '100-110 ºC', 'p. 1') },
  { source: 'I-TPU-TDS', ids: [...ids(755, 767), ...ids(2176, 2178)], set: { [FIELD]: [ISANMATE, NP] }, note: GUIDE('235 ºC', '50 ºC', 'p. 2') },

  { source: 'R-BAMBU-SUPPORT-PLA-NEW-TDS', ids: ids(1808, 1828), set: { [FIELD]: ['Manufacturer TDS; support-interface material', NP] },
    note: 'the cell described the source, not a specimen condition; the sheet has no Specimen Printing Conditions table, p. 1 lists Recommended Printing Settings (a printing guide) and p. 3 says only that the values are tested by standard samples at Bambu Lab.' },

  ...[['XY', 'Flat', ['V001835', 'V001837', 'V001839', 'V001841', 'V001844', 'V001847', 'V001850', 'V001853', 'V001856', 'V001859']],
    ['XZ', 'On its edge', ['V001842', 'V001845', 'V001848', 'V001851', 'V001854', 'V001857', 'V001860']],
    ['ZX', 'Upright', ['V001836', 'V001838', 'V001840', 'V001843', 'V001846', 'V001849', 'V001852', 'V001855', 'V001858', 'V001861']]]
    .map(([dir, orientation, list]) => ({ source: 'R-BASF-PCGF30-TDS', ids: list, set: { [FIELD]: ['Printed-part values in manufacturer TDS v1.2', `Print direction ${dir}, ${orientation}`] },
      note: `the cell described the source; p. 3 heads the column "Print direction ${dir}, ${orientation}", the only specimen preparation the sheet states. The p. 2 Recommended 3D-Print processing parameters (nozzle 280-330 °C, bed 80-100 °C, nozzle diameter ≥ 0.6 mm, 30-60 mm/s) are a printing guide, not stated as the specimen's.` })),
  { source: 'R-BASF-PCGF30-TDS', ids: ids(1829, 1834), set: { [FIELD]: ['Printed-part values in manufacturer TDS v1.2', NP] },
    note: 'the cell described the source; the sheet states no specimen preparation for its general and thermal properties (p. 2), and the Recommended 3D-Print processing parameters there (nozzle 280-330 °C, bed 80-100 °C, nozzle diameter ≥ 0.6 mm, 30-60 mm/s) are a printing guide, not stated as the specimen\'s.' },

  ...[['XY', ['V001862', 'V001865', 'V001868', 'V001871', 'V001874', 'V001877']],
    ['45/45', ['V001863', 'V001866', 'V001869', 'V001872', 'V001875', 'V001878']],
    ['ZX', ['V001864', 'V001867', 'V001870', 'V001873', 'V001876', 'V001879']]]
    .map(([dir, list]) => ({ source: 'R-ESSENTIUM-PPSCF-TDS', ids: list, set: { [FIELD]: ['Manufacturer TDS v1.0; standard deviations in parentheses', `Print Orientation ${dir}`] },
      note: `the cell described the source; p. 1 heads the column "Print Orientation ${dir}", the only specimen preparation the sheet states, and prints the standard deviation in parentheses after each value (Raw uncertainty ± carries it). The p. 2 Recommended FFF Print Settings (nozzle 330-400 ºC, bed 100-120 ºC, 25-75 mm/s, infill 10-90 %) are a printing guide, not stated as the specimen's.` })),
  { source: 'R-ESSENTIUM-PPSCF-TDS', ids: ids(1880, 1886), set: { [FIELD]: ['Manufacturer TDS v1.0; standard deviations in parentheses', NP] },
    note: 'the cell described the source; the Material Properties table (p. 1) states no specimen preparation and prints no standard deviations, and the p. 2 Recommended FFF Print Settings (nozzle 330-400 ºC, bed 100-120 ºC, 25-75 mm/s, infill 10-90 %) are a printing guide, not stated as the specimen\'s.' },

  { source: 'R-KIMYA-PEBA-S-TDS', ids: ids(1887, 1899), set: { [FIELD]: ['Airtech Europe TDS; properties are indicative and production-condition dependent', NP] },
    note: 'the cell described the source; the sheet ties no print conditions to its test values. Its PROCESSING block (p. 1: Printing Direction XY, Printing Speed 44 mm/s, Nozzle Temperature 235-245 °C, Bed Temperature 80-90 °C) is a processing setting beside tensile tests that cite ISO 37 (m21). Its NOTES (p. 1) say the data should be considered as indicative values and properties can be influenced by production conditions.' },

  // Standard / load cells the sheet plainly contradicts.
  { source: 'I-TPU-TDS', ids: ids(755, 759), set: { 'Standard / load': [NP, 'ASTM D638'] }, note: 'p. 1 prints "ASTM D638" as the Test Method of the tensile rows (modulus, stress at yield and break, elongation at yield and break).' },
  { source: 'I-TPU-TDS', ids: ['V002178'], set: { 'Standard / load': [NP, 'DSC'] }, note: 'p. 1 prints "DSC" as the Test Method of the glass transition.' },
  { source: 'I-TPU-TDS', ids: ['V000767'], set: { 'Standard / load': ['n', 'ASTM D570 (24h)'] }, note: 'p. 2 prints "ASTM D570 (24h)" as the Test Method of Moisture Absorption; the cell held "n".' },
  { source: 'I-PETG-TDS', ids: ['V000411'], set: { 'Standard / load': ['on ASTM D570', 'ASTM D570'] }, note: 'p. 1 prints "ASTM D570"; the cell had a stray "on".' },
  { source: 'I-PETG-TDS', ids: ['V000422'], set: { 'Standard / load': ['ASTM', 'ASTM D3418'] }, note: 'p. 2 prints "ASTM D3418" as the Test Method of the glass transition; the cell held only "ASTM".' },
];

export function migrate(t) {
  let changed = 0;
  for (const e of EDITS) changed += correct(t, { ...e, migration: MIGRATION, date: DATE });
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  const n = migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
  console.log(`${MIGRATION}: ${n} row(s) corrected`);
}
