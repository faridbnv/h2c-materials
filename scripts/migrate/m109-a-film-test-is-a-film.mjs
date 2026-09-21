#!/usr/bin/env node
// Migration m109 (2026-09-21): a tensile value measured by ASTM D882 is a film's.
//
// ASTM D882 is "Tensile Properties of Thin Plastic Sheeting". A filament sheet that cites it for a tensile row is
// printing the resin maker's film data — FormFutura's EasyFil PLA prints "Tensile strength 110 Mpa (MD) ASTM D882",
// machine direction and all, which is NatureWorks' Ingeo sheet — and a film at 110 MPa is not a printed bar at 110.
// 81 tensile rows from 25 sources name the standard and record their specimen as "Not published (do not assume
// printed)", so the estimate model has been reading film strengths as a printed part's. Each row's own Standards
// column, read from its sheet, names D882; what that standard tests is not a reading but its definition. The
// specimen becomes the film type the vocabulary already has, which D55 keeps out of every headline and estimate.
// No headline rests on any of them (checked before this was written). The reader now does the same (propose.mjs).
//
// The two Charpy rows that also name "D 882" (Spectrum PLA HS, V002945 and V006179) are not changed: an impact
// test is not a film test, and why their cell names it is a reading of the sheet's layout, not this class.
//
//   node scripts/migrate/m109-a-film-test-is-a-film.mjs

import { openTables } from '../data/table-io.mjs';

const FILM = 'Film specimen (ASTM D882); not a printed or moulded bar';
const t = openTables();
const rows = t.rows('measurements').filter((m) => /\bD\s?-?\s?882\b/i.test(m.Standards ?? '')
  && /^(Tensile|Elongation)/.test(m.Property) && /^Not published/.test(m['Specimen type']));
for (const m of rows) {
  t.set('measurements', m.MeasurementID, 'Specimen type', FILM, { expect: m['Specimen type'] });
  const note = 'Specimen type set to film (m109): the row names ASTM D882, the tensile test for thin plastic sheeting, so the value is a film’s and not a printed bar’s.';
  t.set('measurements', m.MeasurementID, 'Notes', /^(Not applicable|Not published|)$/.test(m.Notes ?? '') ? note : `${m.Notes} ${note}`, { expect: m.Notes });
}
if (rows.length) t.save();
console.log(`m109: ${rows.length} row(s) now a film specimen`);
