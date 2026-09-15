#!/usr/bin/env node
// Migration m21: values the sources publish and the tables lacked, and one source record (audit 2026-09-15, findings
// B-05, D-05, D-07). Each source re-read on 2026-09-15 with its SHA-256 matched.
//
// - IPCON PPA (S-PPA-TDS) p. 1: "Vicar Softening Temperature ISO 306, GB/T 1633 106 °C; 133 °C (annealed)" and "Heat
//   Deflection Temperature ISO 75, 0.45 MPa 103 °C; 131 °C (annealed)". Only the annealed values were transcribed,
//   and PPA's heat headline was the annealed 131 °C: a Strict pass for 104 to 131 °C that an as-printed part fails.
//   The as-printed values are added and the headline selects the as-printed HDT. The annealed rows' Standard cells
//   carried the as-printed values' text.
// - iSANMATE PLA Glass Fiber p. 1: "Tensile Streng MPa ISO 46-56" was never transcribed (its numbers match others on
//   the page, so audit:sources passed over it).
// - Kimya PEBA-S: the recorded URL is gone (HTTP 404) and no hash was ever recorded. The same 2025-12-22 edition is
//   live at the distributor under a new path; all 13 recorded values match it. Its "Printing Direction XY" is a
//   processing setting beside speed and temperatures, and the tensile tests cite ISO 37 (die-cut dumbbells), so the
//   rows keep Direction and Specimen type "Not published".
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { addValue, correct } from './source-edits.mjs';

const MIGRATION = 'm21';
const DATE = '2026-09-15';
const WHY = 'published in the source, never transcribed (re-read in audit 2026-09-15).';

export const KIMYA = {
  URL: 'https://www.samaro.fr/app/uploads/2026/09/ba38ba38d87e28552202938c4c1cc670d8ef6fea3287_Kimya_PEBA_S_3D_Filament_EN.pdf',
  'Access date': '2026-09-15',
  'Access status': 'Retrieved',
  SHA256: '66c7b5b1e19bf57ba52811611ef420b1d4d409ad9e043b389b164e45da1c9ce3',
};

export function migrate(t) {
  correct(t, { source: 'S-PPA-TDS', ids: ['V001288'], set: { 'Standard / load': ['ISO 306, GB/T 1633 106 °C;', 'ISO 306, GB/T 1633'] }, note: 'the Standard cell carried the as-printed value "106 °C;".', migration: MIGRATION, date: DATE });
  correct(t, { source: 'S-PPA-TDS', ids: ['V001289'], set: { 'Standard / load': ['ISO 75, 0.45 MPa 103 °C;', 'ISO 75, 0.45 MPa'] }, note: 'the Standard cell carried the as-printed value "103 °C;".', migration: MIGRATION, date: DATE });

  const asPrinted = { 'Post-processing': 'As printed', 'Specimen type': 'Not published (do not assume printed)', Notes: null };
  addValue(t, { like: 'V001288', migration: MIGRATION, date: DATE, why: WHY, note: 'The as-printed value; V001288 is the annealed one.',
    set: { ...asPrinted, Property: 'Vicat softening temperature', 'Raw value': '106 °C', 'Raw unit': '°C', 'Raw numeric': '106', 'Normalized value': '106', 'Normalized unit': '°C', 'Standard / load': 'ISO 306, GB/T 1633', Locator: 'p. 1: Vicar Softening Temperature (as printed)' } });
  const hdt = addValue(t, { like: 'V001289', migration: MIGRATION, date: DATE, why: WHY, note: 'The as-printed value; V001289 is the annealed one.',
    set: { ...asPrinted, Property: 'HDT', 'Raw value': '103 °C', 'Raw unit': '°C', 'Raw numeric': '103', 'Normalized value': '103', 'Normalized unit': '°C', 'Standard / load': 'ISO 75, 0.45 MPa', 'Test load MPa': '0.45', Locator: 'p. 1: Heat Deflection Temperature (as printed)' } });
  const hdtId = hdt ?? t.rows('measurements').find((r) => r.SourceID === 'S-PPA-TDS' && r.Locator === 'p. 1: Heat Deflection Temperature (as printed)').MeasurementID;
  t.update('headlines', { MaterialID: 'M069', HeadlineKey: 'hdt045', Use: 'value' }, 'MeasurementID', hdtId, { expect: hdt ? 'V001289' : hdtId });

  addValue(t, { like: 'V000379', migration: MIGRATION, date: DATE, why: WHY,
    set: { Property: 'Tensile strength (endpoint unspecified)', 'Raw value': '46-56', 'Raw unit': 'MPa', 'Raw numeric': '46', 'Raw upper bound': '56',
      'Normalized value': '46', 'Normalized upper bound': '56', 'Normalized unit': 'MPa', 'Standard / load': 'ISO', Locator: 'p. 1: Tensile Streng' } });

  for (const [field, value] of Object.entries(KIMYA)) t.set('sources', 'R-KIMYA-PEBA-S-TDS', field, value);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
