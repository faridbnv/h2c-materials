#!/usr/bin/env node
// Migration m24: published values that physics rules out (audit 2026-09-15, findings B-09 and B-10; owner ruling:
// "physically implausible outliers should be recorded and flagged, and either not included or weighed down").
//
// Each value is faithful to its source; the source is what physics contradicts. The row keeps its number with Data
// status "Published value (physically implausible)" and the reason in Notes. It stays evidence in the drawer, and it
// backs no headline, estimate, conversion or bound. A headline that selected one becomes a context citation, so the
// headline is estimated from the evidence that remains, and the flagged value is listed beside it with its reason.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm24';
const FLAG = 'Published value (physically implausible)';

export const FLAGS = [
  { ids: ['V000682', 'V000683'], source: 'B-PC-TDS',
    reason: 'HDT at 0.45 MPa (112 °C) is below HDT at 1.8 MPa (117 °C) on the same sheet; a lighter load cannot deflect a bar at a lower temperature, so at least one of the pair is wrong and the sheet does not say which' },
  { ids: ['V000765', 'V000766'], source: 'I-TPU-TDS',
    reason: 'a heat deflection on a TPU whose sheet gives a 26 MPa modulus; ISO 75 and ASTM D648 end at 0.2 % outer-fibre strain, which a bar reaches where its modulus falls to about 225 MPa (0.45 MPa) or 900 MPa (1.8 MPa), so this bar deflects at room temperature' },
  { ids: ['V000775', 'V000776'], source: 'B-tpu-for-ams-TDS',
    reason: 'a modulus of 1190 MPa (XY) and 600 MPa (Z) on a 68D elastomer: the Qi-Joyce-Boyce hardness relation gives about 208 MPa, the sheet gives an elongation above 650 % and lists HDT as N/A, none of which fits a 1.19 GPa bar; a secant, flexural or misprinted value is likely' },
  { ids: ['V000970'], source: 'X-CarbonX-CF-PA12-TDS-v1', reason: 'a glass transition of 158 °C for PA12, whose glass transition is 40-55 °C; a template value' },
  { ids: ['V001013'], source: 'X-FIBREX-PA12-GF30-TDS-v1-0', reason: 'a glass transition of 158 °C for PA12, whose glass transition is 40-55 °C; a template value' },
  { ids: ['V001206'], source: 'X-3DXSTAT-ESD-PA12-TDS-v1', reason: 'a glass transition of 158 °C for PA12, whose glass transition is 40-55 °C; a template value' },
  { ids: ['V000008'], source: 'X-ECOMAX-PLA-TDS-v3',
    reason: 'a heat deflection of 80 °C at 0.45 MPa for a PLA the sheet does not say was annealed or nucleated; as printed, PLA (glass transition 55-60 °C) deflects at 50-65 °C, and 80 °C needs a crystallised bar' },
];

// Headlines that selected a flagged value: the selection becomes a context citation.
export const HEADLINES = [
  { MaterialID: 'M001', HeadlineKey: 'hdt045', MeasurementID: 'V000008' },
  { MaterialID: 'M035', HeadlineKey: 'hdt045', MeasurementID: 'V000683' },
  { MaterialID: 'M040', HeadlineKey: 'tensileModulusXY', MeasurementID: 'V000775' },
];

export function migrate(t) {
  for (const { ids, source, reason } of FLAGS) {
    for (const id of ids) {
      const row = t.get('measurements', id);
      if (row.SourceID !== source) throw new Error(`${MIGRATION}: ${id} cites ${row.SourceID}, not ${source}`);
      if (row['Data status'] === FLAG) continue;
      // A transcription correction keeps its history in Notes; the flag is the status that now governs the value.
      if (!/^Published value( \(transcription corrected\))?$/.test(row['Data status'])) throw new Error(`${MIGRATION}: ${id} Data status is "${row['Data status']}"; the data moved`);
      t.set('measurements', id, 'Data status', FLAG, { expect: row['Data status'] });
      t.set('measurements', id, 'Notes', withNote(row.Notes, `Flagged 2026-09-15 (${MIGRATION}) as physically implausible: ${reason}.`), { expect: row.Notes });
    }
  }
  for (const h of HEADLINES) {
    const match = { MaterialID: h.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID };
    const row = t.rows('headlines').find((r) => Object.entries(match).every(([k, v]) => r[k] === v));
    if (row?.Use === 'value') t.update('headlines', match, 'Use', 'context', { expect: 'value' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
