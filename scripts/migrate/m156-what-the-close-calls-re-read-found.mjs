#!/usr/bin/env node
// Migration m156 (2026-09-25): what the re-read of the values that decide found wrong (re-center phase 6, lane 4;
// GOALS C3).
//
// BLOCKING-GAPS lists the products decided by 10 % or less on one value. The closest 80 were re-read against their
// pages by an AI agent (Claude, lane 4), not a person: the number, the unit, the property, the direction, the specimen
// and the moisture state. All 80 numbers, units and properties stand as recorded, and so do their conditions; one
// row's Standard / load cell holds the unit column's "°C" where the sheet prints the load's unit, and the load it
// types is right. The re-read of the colorFabb sheets for m155 found one number that is not the property it is filed
// under: varioShore TPU 85A's "Stress @ 300% elongation" line, read as an elongation at break of 300 %; the sheet's
// elongation at break is 585 % (V005953). It is quarantined, as m127 quarantined the numbers that are not their
// property, since the database has no property for a stress at a stated elongation.
//
//   node scripts/migrate/m156-what-the-close-calls-re-read-found.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct, withNote } from './source-edits.mjs';

const migration = 'm156-what-the-close-calls-re-read-found';
const date = '2026-09-25';
const READER = 'Read by an AI agent (Claude, re-center lane 4), not a person.';
const t = openTables();
let changed = 0;

const lines = (sourceId, page) => {
  const s = t.get('sources', sourceId);
  const p = cachedText(s.SHA256)?.pages.find((x) => x.page === page);
  if (!p) throw new Error(`${migration}: ${sourceId} has no cached page ${page}`);
  return p.lines.map((l) => (typeof l === 'string' ? l : l.text));
};
const onPage = (sourceId, page, ...want) => {
  const text = lines(sourceId, page);
  for (const w of want) if (!text.includes(w)) throw new Error(`${migration}: "${w}" is not a line of p. ${page} of ${sourceId}`);
};

// 3DXTECH ECOMAX Tough PLA: the heat deflection row's load, as printed.
onPage('X-ECOMAX-ECOMAX-Tough-PLA-TDS-v1', 1, 'Deflection Temperature at 0.45', 'ISO 75 °C 80', 'MPa (66psi)');
changed += correct(t, { source: 'X-ECOMAX-ECOMAX-Tough-PLA-TDS-v1', ids: ['V003212'], migration, date,
  set: { 'Standard / load': ['0.45 °C ISO 75', '0.45 MPa (66psi) ISO 75'] },
  note: `p. 1 prints "Deflection Temperature at 0.45 / ISO 75 °C 80 / MPa (66psi)" across three lines: the load is 0.45 MPa (66 psi), and "°C" is the unit column's. The cell had joined the load's number to the unit of the value; the typed load (0.45 MPa) and the value were right. ${READER}` });

// varioShore TPU 85A: "Stress @ 300% elongation", read as an elongation at break of 300 %.
{
  const id = 'V005951';
  const m = t.get('measurements', id);
  onPage('R-COLORFABB-TDS-varioShore-TPU85A', 1, 'Stress @ 300% Tenilse, ISO 37-1A 5,1 MPa', 'elongation', 'Elongation at break Tensile, ISO 37-1A 585 %');
  if (m['Data status'] !== 'Unresolved unit / layout') {
    if (m.SourceID !== 'R-COLORFABB-TDS-varioShore-TPU85A' || m.Property !== 'Elongation at break' || m['Raw value'] !== '300 %') throw new Error(`${migration}: ${id} is ${m.Property} ${m['Raw value']} from ${m.SourceID}`);
    t.set('measurements', id, 'Data status', 'Unresolved unit / layout', { expect: 'Published value' });
    t.set('measurements', id, 'Notes', withNote(m.Notes, `Quarantined ${date} (${migration}): not an elongation at break; p. 1 prints "Stress @ 300% Tenilse, ISO 37-1A 5,1 MPa / elongation", the tensile stress at 300 % elongation (5.1 MPa), and the reader took the 300 % in its label for a value. The sheet's elongation at break is 585 % (V005953). ${READER}`), { expect: m.Notes });
    changed++;
  }
}

if (changed) t.save();
console.log(`${migration}: ${changed} row(s) corrected against the page`);
