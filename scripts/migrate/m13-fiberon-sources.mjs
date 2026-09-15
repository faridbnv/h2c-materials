#!/usr/bin/env node
// Migration m13: the four Fiberon data sheets against the tables, re-read 2026-09-14 (npm run audit:sources;
// every SHA-256 matched).
//
// - Each Fiberon impact block prints XY notched, then XY un-notched, then Z un-notched. The un-notched rows of
//   PA612-CF15, PA612-ESD and PPS-GF20 (and their retired copies) said "Notched"; their locators say otherwise.
// - Post-processing held the preparation note with the next section's heading pasted on ("... MECHANICAL
//   PROPERTIES - WET STATUS PROPERTY TESTING"); the wet rows lacked their water immersion; thermal rows carried
//   the mechanical note. Each group now carries its own note, and thermal rows "Not published" except where the
//   sheet says how the HDT bars were prepared.
// - Published thermal values, melt index and water absorption were never transcribed.
// - PA612-ESD had no heat deflection headline; its representative grade's 0.45 MPa value is now selected.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct, addValue } from './source-edits.mjs';

const MIGRATION = 'm13';
const PA612CF = 'S-FIBER-PA612', PA612ESD = 'S-POLYCN-TDS-FIBERON-PA612-ESD-V1-0-EN-1', PPSGF = 'S-FIBER-PPSGF-TDS-2', PETGF = 'R-FIBERON-PETGF15-TDS';
const PASTED = (note) => new RegExp(`^${note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} [A-Z -]+ PROPERTY TESTING$`);
const PA612_NOTE = 'All specimens were annealed at 100°C for 16h.';
const PPS_NOTE = 'All specimens were annealed at 130°C for 10h.';

const byRows = (t, source, test) => t.rows('measurements').filter((r) => r.SourceID === source && test(r)).map((r) => r.MeasurementID);

function corrections(t) {
  for (const source of [PA612CF, PA612ESD, PPSGF]) {
    correct(t, { migration: MIGRATION, source, ids: byRows(t, source, (r) => /un-notched/i.test(r.Locator) && r.Notch === 'Notched'), set: { Notch: ['Notched', 'Unnotched'] },
      note: 'the row is the un-notched Charpy result, as its locator says.' });
  }
  const wet = { [PA612CF]: '2.57%', [PA612ESD]: '4.64%' };
  for (const source of [PA612CF, PA612ESD]) {
    const pasted = PASTED(PA612_NOTE);
    correct(t, { migration: MIGRATION, source, ids: byRows(t, source, (r) => r['Moisture condition'] === 'Dry' && pasted.test(r['Post-processing'])),
      set: { 'Post-processing': [pasted, 'All specimens were annealed at 100 °C for 16 h'] }, note: 'the dry-status table\'s note, without the next heading.' });
    correct(t, { migration: MIGRATION, source, ids: byRows(t, source, (r) => /^Wet/.test(r['Moisture condition']) && pasted.test(r['Post-processing'])),
      set: { 'Post-processing': [pasted, `All specimens were annealed at 100 °C for 16 h, and immersed in water at 60 °C for 48 h prior to testing (average moisture content ${wet[source]})`] },
      note: 'the wet-status table\'s own note.' });
    correct(t, { migration: MIGRATION, source, ids: byRows(t, source, (r) => r['Moisture condition'] === 'Not published' && pasted.test(r['Post-processing'])),
      set: { 'Post-processing': [pasted, 'Not published'] }, note: 'the sheet gives no preparation for its physical and thermal rows; the annealing note belongs to the mechanical table.' });
  }
  const pps = PASTED(PPS_NOTE);
  correct(t, { migration: MIGRATION, source: PPSGF, ids: byRows(t, PPSGF, (r) => r.Property !== 'HDT' && r.Property !== 'Density' && pps.test(r['Post-processing'])),
    set: { 'Post-processing': [pps, 'All specimens were annealed at 130 °C for 10 h'] }, note: 'the mechanical table\'s note, without the next heading.' });
  correct(t, { migration: MIGRATION, source: PPSGF, ids: byRows(t, PPSGF, (r) => r.Property === 'HDT' && pps.test(r['Post-processing'])),
    set: { 'Post-processing': [pps, 'HDT specimens annealed at 130 °C'] }, note: 'the HDT note: "The HDT test specimens were annealed by 130°C".' });
  correct(t, { migration: MIGRATION, source: PPSGF, ids: byRows(t, PPSGF, (r) => r.Property === 'Density' && pps.test(r['Post-processing'])),
    set: { 'Post-processing': [pps, 'Not published'] }, note: 'the annealing note belongs to the mechanical table.' });
}

const thermal = (property, raw, standard, locator, extra = {}) => ({
  Property: property, 'Raw value': raw, 'Raw unit': '°C', 'Raw numeric': raw.match(/[\d.]+/)[0], 'Normalized value': raw.match(/[\d.]+/)[0], 'Normalized unit': '°C',
  'Standard / load': standard, Locator: locator, 'Post-processing': 'Not published', ...extra,
});
const hdt = (raw, load, locator, extra = {}) => thermal('HDT', raw, `ISO 75 ${load}MPa`, locator, { 'Test load MPa': String(load), ...extra });
const mfr = (raw, conditions, locator) => ({ Property: 'Melt mass-flow rate', 'Raw value': raw, 'Raw unit': 'g/10 min', 'Raw numeric': raw.match(/[\d.]+/)[0], 'Normalized value': raw.match(/[\d.]+/)[0], 'Normalized unit': 'g/10 min', 'Standard / load': conditions, Locator: locator, 'Post-processing': 'Not published' });
const water = (raw, locator) => ({ Property: 'Water absorption', 'Raw value': raw, 'Raw unit': '%', 'Raw numeric': raw.match(/[\d.]+/)[0], 'Normalized value': raw.match(/[\d.]+/)[0], 'Normalized unit': '%', 'Standard / load': 'Equilibrium water absorption, 70% RH, 23 °C (moisture absorption curve)', Locator: locator, 'Post-processing': 'Not published' });

export const ADDITIONS = [
  // Fiberon PA612-CF15 (G059-01); template: its crystallization temperature row.
  ...[
    thermal('Melting temperature', '210 °C', 'DSC, 10°C/min', 'p. 1: Melting temperature'),
    thermal('Vicat softening temperature', '206.2 °C', 'ISO 306, GB/T 1633', 'p. 1: Vicat softening temp.'),
    hdt('114 °C', 1.8, 'p. 1: Heat deflection temp. 1.8MPa'),
    mfr('9.9 g/10min', '260 °C, 2.16 kg', 'p. 1: Melt index'),
    water('2.2 %', 'p. 1: Equilibrium water absorption'),
  ].map((set) => ({ like: 'V001053', set })),
  // Fiberon PA612-ESD (G065-01); template: its crystallization temperature row.
  ...[
    thermal('Glass transition temperature', '41.8 °C', 'DSC, 10°C/min', 'p. 1: Glass transition temp.'),
    thermal('Melting temperature', '187.3 °C', 'DSC, 10°C/min', 'p. 1: Melting temperature'),
    thermal('Vicat softening temperature', '190.0 °C', 'ISO 306, GB/T 1633', 'p. 1: Vicat softening temp.'),
    hdt('125.4 °C', 1.8, 'p. 1: Heat deflection temp. 1.8MPa'),
    hdt('157.0 °C', 0.45, 'p. 1: Heat deflection temp. 0.45MPa'),
    mfr('17.4 g/10min', '275 °C, 5 kg', 'p. 1: Melt index'),
  ].map((set) => ({ like: 'V001237', set })),
  // Fiberon PPS-GF20 (G074-02); template: its 1.8 MPa HDT row.
  ...[
    thermal('Glass transition temperature', '95.0 °C', 'DSC, 10°C/min', 'p. 1: Glass transition temp.', { 'Test load MPa': 'Not applicable' }),
    thermal('Melting temperature', '279.6 °C', 'DSC, 10°C/min', 'p. 1: Melting temperature', { 'Test load MPa': 'Not applicable' }),
    thermal('Crystallization temperature', '225.8 °C', 'DSC, 10°C/min', 'p. 1: Crystallization temp.', { 'Test load MPa': 'Not applicable' }),
    thermal('Vicat softening temperature', '272.5 °C', 'ISO 306, GB/T 1633', 'p. 1: Vicat softening temp.', { 'Test load MPa': 'Not applicable' }),
    hdt('236.3 °C', 0.45, 'p. 1: Heat deflection temp. 0.45MPa', { 'Post-processing': 'HDT specimens annealed at 130 °C' }),
    hdt('248.9 °C', 0.45, 'p. 1: HDT note, specimens annealed at 230 °C (0.45MPa)', { 'Post-processing': 'HDT specimens annealed at 230 °C (deeper coloration)' }),
    hdt('219.6 °C', 1.8, 'p. 1: HDT note, specimens annealed at 230 °C (1.8MPa)', { 'Post-processing': 'HDT specimens annealed at 230 °C (deeper coloration)' }),
    { ...mfr('27 g/10min', '300 °C, 5 kg', 'p. 1: Melt index'), 'Test load MPa': 'Not applicable' },
    { ...water('0.11 %', 'p. 1: Equilibrium water absorption'), 'Test load MPa': 'Not applicable' },
  ].map((set) => ({ like: 'V001392', set })),
  // Fiberon PET-GF15 (G068-02); template: its melting temperature row.
  ...[
    thermal('Crystallization temperature', '201.4 °C', 'DSC, 10 °C/min', 'Thermal properties: Crystallization temp.'),
    water('0.32 %', 'Physical properties: Equilibrium water absorption'),
  ].map((set) => ({ like: 'V001928', set })),
];

export function migrate(t) {
  corrections(t);
  const added = ADDITIONS.map((a) => addValue(t, { ...a, migration: MIGRATION }));
  // PA612-ESD's heat deflection headline: its representative grade publishes the 0.45 MPa value.
  const hdt045 = t.rows('measurements').find((r) => r.SourceID === PA612ESD && r.Locator === 'p. 1: Heat deflection temp. 0.45MPa');
  if (!t.rows('headlines').some((h) => h.MaterialID === 'M065' && h.HeadlineKey === 'hdt045')) {
    if (hdt045.GradeID !== t.get('materials', 'M065')['Representative grade']) throw new Error('m13: PA612-ESD\'s representative grade moved');
    t.append('headlines', { MaterialID: 'M065', HeadlineKey: 'hdt045', MeasurementID: hdt045.MeasurementID, Use: 'value' });
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
