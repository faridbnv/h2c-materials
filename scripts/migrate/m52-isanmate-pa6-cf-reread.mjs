#!/usr/bin/env node
// Migration m52 (2026-09-18): two values read off the wrong column of the iSANMATE PA6 CF sheet, and three
// published elongations that physics rules out.
//
// The sheet (I-PA6-CF-TDS, SHA-256 matched, re-read page by page on 2026-09-18) prints its properties table as
// property, condition, standard, value, with the unit on the line above or below. Two rows were transcribed from
// the wrong part of that line:
//
//   "Notched I mpact S trength K j/m ²" / "ISO 180-A 4 5"
//       The standard is ISO 180-A and the value is 45 kJ/m², printed with the digits split. The row carried
//       "180-A" as its raw value and 180 kJ/m² as its result, which is the standard's number. A notched impact
//       strength of 180 kJ/m² is not a thing a carbon-filled PA6 does; 45 is ordinary. ISO 180 is the Izod test,
//       so the row is an Izod impact strength, which is what its own standard says it is.
//
//   "Vicat Softening Point A/120 ASTM D-648 140" / "℃"
//       A/120 is the test condition (method A, 120 °C per hour) and the value is 140 °C. The row carried 120 °C,
//       which is the heating rate. The sheet's own description corroborates 140: "a temperature resistance of 140
//       degrees". The standard it prints for a Vicat row is ASTM D-648, which is the heat-deflection standard, not
//       ASTM D1525; that is the sheet's error and it is recorded as printed (D76), with the disagreement noted.
//
// Three elongations are a different matter: the sheets really do print them, and they are impossible.
//
//   V001159  iSANMATE PA6 CF      "Elongation At Break ASTM D-638 113"      113 %
//   V000508  iSANMATE PETG GF     "Elongation % ASTM D-638 98"               98 %
//   V000729  Spectrum PC-CF       "Tensile Elongation at Break* >100 % D 638" > 100 %
//
// A short-fibre compound at 15 to 30 wt% cannot draw: the fibre ends nucleate failure at a few per cent of strain.
// Every filled grade in this database that publishes an honest elongation sits between 0.5 and 6.6 %. Each of these
// three reads as the neat resin's elongation printed on a filled product's sheet. Under D55 the number is kept and
// flagged, with the reason in its Notes: it then backs no headline, estimate, conversion, implied bound or plot
// point. The Spectrum row matters most, because a ">" bound is an implied lower bound and was asserting that a
// carbon-filled polycarbonate stretches at least 100 %.
//
// Nothing here was decided from a report. Each sheet was fetched from .cache/sources, hash-checked against
// sources.csv, and read page by page (D35).
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm52';
const DATE = '2026-09-18';

const IMPLAUSIBLE = [
  ['V001159', 'I-PA6-CF-TDS', 'the sheet prints 113 % for a carbon-filled PA6. A short-fibre compound cannot draw: its fibre ends nucleate failure at a few per cent of strain, and every filled grade here that publishes an honest elongation sits between 0.5 and 6.6 %. This reads as the neat resin\'s elongation printed on a filled product\'s sheet.'],
  ['V000508', 'I-PETG-Glass-Fiber-Technical-Data-Sheet', 'the sheet prints 98 % for a glass-filled PETG, which cannot draw. Unfilled PETG reaches it; this grade cannot. The same publisher prints the same kind of value on its PA6 CF sheet.'],
  ['V000729', 'S-SPECTRUM-en-tds-spectrum-pc-cf', 'the sheet prints "> 100 %" for a carbon-filled polycarbonate, which cannot draw. As a bound it was asserting that the grade stretches at least 100 %, which under D55 would limit its own estimate from below.'],
];

export function migrate(t) {
  // The two values read off the wrong column.
  correct(t, {
    source: 'I-PA6-CF-TDS', ids: ['V001161'], migration: MIGRATION, date: DATE,
    set: {
      'Raw value': ['180-A', '4 5'],
      'Raw numeric': ['180', '45'],
      'Normalized value': ['180', '45'],
      Property: ['Impact strength', 'Izod impact strength'],
      'Standard / load': ['ISO', 'ISO 180-A'],
      Standards: ['Not published', 'ISO 180'],
      Locator: ['p. 1: Notched', 'p. 1: Notched Impact Strength'],
    },
    note: 'the row reads "Notched Impact Strength Kj/m²" then "ISO 180-A 4 5": the standard is ISO 180-A and the value is 45 kJ/m², printed with its digits split. The row had carried the standard\'s number as the result. ISO 180 is the Izod test, so the property is the Izod impact strength its own standard names.',
  });

  correct(t, {
    source: 'I-PA6-CF-TDS', ids: ['V001157'], migration: MIGRATION, date: DATE,
    set: {
      'Raw value': ['120 ℃', '140'],
      'Raw numeric': ['120', '140'],
      'Normalized value': ['120', '140'],
      'Standard / load': ['Not published', 'A/120 ASTM D-648'],
      Standards: ['Not published', 'ASTM D648'],
      Locator: ['p. 1: Vicat Softening Point A/', 'p. 1: Vicat Softening Point A/120'],
    },
    note: 'the row reads "Vicat Softening Point A/120 ASTM D-648 140" with the unit on the next line: A/120 is the condition (method A, 120 °C per hour) and 140 °C is the value. The row had carried the heating rate. The sheet\'s own description says "a temperature resistance of 140 degrees". It cites ASTM D-648, the heat-deflection standard, for a Vicat row; that is what it prints and it is recorded as printed (D76).',
  });

  // Three published values physics rules out (D55).
  for (const [id, source, why] of IMPLAUSIBLE) {
    correct(t, {
      source, ids: [id], migration: MIGRATION, date: DATE,
      set: { 'Data status': ['Published value', 'Published value (physically implausible)'] },
      note: why,
    });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field}`);
}
