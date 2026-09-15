#!/usr/bin/env node
// Migration m25: HyperLite PP becomes its own material, PP Lightweight (audit 2026-09-15, finding D-10; owner ruling).
//
// 3DXTECH HyperLite PP carries a specialty additive for low density: 0.75-0.81 g/cm³, a 1.53 GPa flexural modulus and
// 13 % elongation, against iSANMATE PP's 0.89 g/cm³, 0.39 GPa and 460 %. As PP's representative grade it made PP's
// headlines and its "unfilled" facet describe a lightweight compound. It is filed as PLA Aero and ASA Aero are: its own
// material, the same base polymer, its values its own.
//
// Nothing is deleted. G082-01 is retired; its eight measurements are re-filed under G103-01 and the originals retired
// as duplicates naming their twins; its profile is copied. PP's representative grade becomes iSANMATE PP (G082-02):
// its density and its unstated-load heat deflection are values; its flexural modulus and its elongation without a
// stated direction are context, so PP's stiffness and elongation are estimated.
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';
import { retireGrade } from '../data/records.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm25';
const DATE = '2026-09-15';
const NEW = 'M103', GRADE = 'G103-01', OLD_GRADE = 'G082-01';

export function migrate(t) {
  if (t.find('materials', NEW)) return;

  t.append('materials', {
    ...t.get('materials', 'M082'),
    MaterialID: NEW, 'Original name': 'PP Lightweight', 'Full name': 'Lightweight Polypropylene', Abbreviation: 'PP Lightweight', 'Normalized name': 'PP Lightweight',
    'Modifier / filler': 'Commercial variant / undisclosed', 'Representative grade': GRADE,
    'Best uses': 'Low-density parts where mass matters more than stiffness or strength; verify exact exposure.',
    'Identity notes': `Filed ${DATE} (${MIGRATION}) from PP: 3DXTECH HyperLite PP carries a low-density additive (0.75-0.81 g/cm³), so its values are not unfilled polypropylene's.`,
    'Printability rating 1–5': 'Not published',
  });
  t.set('materials', 'M082', 'Representative grade', 'G082-02', { expect: OLD_GRADE });

  t.append('grades', { ...t.get('grades', OLD_GRADE), GradeID: GRADE, MaterialID: NEW });
  retireGrade(t, OLD_GRADE);
  t.set('grades', OLD_GRADE, 'Selected-grade rationale', `Retired ${DATE} (${MIGRATION}): re-filed as ${GRADE}, PP Lightweight; a lightweight compound is its own material.`);

  const twins = new Map();
  for (const r of t.rows('measurements').filter((m) => m.GradeID === OLD_GRADE && m['Data status'] !== 'Retired duplicate record')) {
    const id = nextId('measurements', t.rows('measurements').map((m) => m.MeasurementID));
    t.append('measurements', { ...r, MeasurementID: id, MaterialID: NEW, GradeID: GRADE, Notes: withNote(r.Notes, `Re-filed ${DATE} (${MIGRATION}) from ${r.MeasurementID}: HyperLite PP is its own material, PP Lightweight.`) });
    t.set('measurements', r.MeasurementID, 'Data status', 'Retired duplicate record', { expect: r['Data status'] });
    t.set('measurements', r.MeasurementID, 'Notes', withNote(r.Notes, `Retired ${DATE} (${MIGRATION}): re-filed under ${NEW} as ${id}.`), { expect: r.Notes });
    twins.set(r.MeasurementID, id);
  }

  const profile = nextId('profiles', t.rows('profiles').map((p) => p.ProfileID));
  t.append('profiles', { ...t.get('profiles', 'P0103'), ProfileID: profile, MaterialID: NEW, GradeID: GRADE });

  // The retired grade keeps its print profile (P0103), so the source names both.
  for (const s of ['X-Hyperlite-PP-TDS-v1', 'R-TRINITY3DS-HYPERLITE-PP']) t.set('sources', s, 'Applicable grades', `${GRADE}; ${OLD_GRADE} until ${DATE}`, { expect: OLD_GRADE });
  // PP's printing guidance is iSANMATE PP's profile, not HyperLite's.
  t.update('material_links', { MaterialID: 'M082', Link: 'printing', RecordID: 'P0103' }, 'RecordID', 'P0104', { expect: 'P0103' });

  // PP's headlines: iSANMATE PP's values, or context where iSANMATE publishes no XY headline value.
  const repoint = [
    ['density', 'V001490', 'V002053', 'value'],
    ['tensileModulusXY', 'V001492', 'V001499', 'context'],
    ['elongationXY', 'V001493', 'V001497', 'context'],
    ['hdt045', 'V001496', 'V001501', 'value'],
  ];
  for (const [key, from, to, use] of repoint) {
    const match = { MaterialID: 'M082', HeadlineKey: key, MeasurementID: from };
    t.update('headlines', match, 'MeasurementID', to, { expect: from });
    if (use !== 'value') t.update('headlines', { MaterialID: 'M082', HeadlineKey: key, MeasurementID: to }, 'Use', use, { expect: 'value' });
    t.append('headlines', { MaterialID: NEW, HeadlineKey: key, MeasurementID: twins.get(from), Use: 'value' });
  }

  for (const [link, record] of [['printing', profile], ['h2c-status', 'H2C-WIKI'], ['h2c-status', 'H2C-MANUAL'], ['durability', 'Q00318'], ['safety', 'Q00320']]) {
    t.append('material_links', { MaterialID: NEW, Link: link, RecordID: record });
  }

  const coverage = t.rows('coverage').filter((c) => c.MaterialID === 'M082' && !['Resolved', 'Superseded'].includes(c.Status));
  for (const c of coverage) {
    const text = {
      Grades: '1 distinct manufacturer documented (3DXTECH HyperLite PP) against target 3.',
      'Print setup': `HyperLite PP specimens were printed at 235 °C nozzle and 60 °C bed (${profile}). No recommended window or chamber temperature is published.`,
    }[c.Domain];
    t.append('coverage', { ...c, CoverageID: nextId('coverage', t.rows('coverage').map((x) => x.CoverageID)), MaterialID: NEW, ...(text ? { Finding: text } : {}) });
  }
  const grades = t.get('coverage', 'C00036');
  t.set('coverage', 'C00036', 'Finding', '1 distinct manufacturer (iSANMATE) documented against target 3. HyperLite PP is filed as PP Lightweight since 2026-09-15. Other sampled sources were missing, inaccessible, insufficiently specific, or not selected as independent formulations.', { expect: grades.Finding });
  const pp = t.get('coverage', 'C00879');
  t.set('coverage', 'C00879', 'Finding', 'iSANMATE PP recommends a 240-260 °C nozzle (recovered 2026-09-13 from the hash-matched TDS) and a 40-60 °C bed (P0104). No chamber temperature is published. HyperLite PP is filed as PP Lightweight since 2026-09-15.', { expect: pp.Finding });

  const band = t.get('chamber_bands', 'M082');
  t.append('chamber_bands', { ...band, MaterialID: NEW });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
