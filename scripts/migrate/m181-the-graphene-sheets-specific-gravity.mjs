#!/usr/bin/env node
// Migration m181 (2026-09-26): the density four graphene sheets print and nobody transcribed (re-center phase 6,
// lane 4; GOALS C3, method step 2).
//
// BLOCKING-GAPS lists PETG-GR (M153) and PLA-GR (M155) as "not published" on density in two templates: none of their
// products publishes one. Each of their four sheets, 3DJake's PROGRAFEN data sheets, prints "Specific Gravity 1.29
// D792" (the two PET-G) or "Specific Gravity 1.24 D792" (the two PLA) in its Physical Properties table. The reader
// skipped the line because it prints no unit (the record tier keeps it: source_facts, "the line names Density and
// states no value in a unit the database keeps it in"). A specific gravity to ASTM D792 is the density in g/cm³, and
// the database records one so already (V002176, m16: Raw unit "Specific gravity", factor 1000).
//
// No document is fetched: each value is on its sheet's cached, hash-recorded page 1, and is checked there before it
// is written. The reader is an AI agent (claude-opus-5.5, lane 4), not a person. A re-run is a no-op.
//
//   node scripts/migrate/m181-the-graphene-sheets-specific-gravity.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { addValue } from './source-edits.mjs';

const migration = 'm181-the-graphene-sheets-specific-gravity';
const date = '2026-09-26';
const t = openTables();

// Each sheet, the row of it whose grade and conditions the density is copied from, and the figure it prints.
const SHEETS = [
  { source: 'R-3DJAKE-EN-TDS-PETG-Graphene-Light', like: 'V010439', sg: '1.29' },
  { source: 'R-3DJAKE-EN-TDS-PETG-Graphene-Strong', like: 'V010307', sg: '1.29' },
  { source: 'R-3DJAKE-EN-TDS-PLA-Graphene-LIGHT', like: 'V010355', sg: '1.24' },
  { source: 'R-3DJAKE-EN-TDS-PLA-Graphene-STRONG', like: 'V010379', sg: '1.24' },
];

let added = 0;
for (const s of SHEETS) {
  const src = t.get('sources', s.source);
  const text = cachedText(src.SHA256);
  if (!text) throw new Error(`${migration}: ${s.source} has no cached text for ${src.SHA256}; fetch and extract it first`);
  const line = `Specific Gravity ${s.sg} D792`;
  const page = text.pages.find((p) => p.lines.some((l) => (typeof l === 'string' ? l : l.text).replace(/\s+/g, ' ').trim() === line));
  if (page?.page !== 1) throw new Error(`${migration}: "${line}" is not a line of p. 1 of ${s.source}`);
  const like = t.get('measurements', s.like);
  if (like.SourceID !== s.source) throw new Error(`${migration}: ${s.like} is not a row of ${s.source}`);
  const id = addValue(t, {
    like: s.like, migration, date,
    why: `published in the source, never transcribed: the reader skipped the line "${line}" because it prints no unit (source_facts).`,
    note: `p. 1, Physical Properties: a specific gravity to ASTM D792 is the density in g/cm³, recorded as V002176 (m16) records one. Read by an AI agent (claude-opus-5.5, re-center lane 4), not a person.`,
    set: {
      Property: 'Density', 'Raw value': s.sg, 'Raw unit': 'Specific gravity', 'Raw numeric': s.sg, 'Conversion factor': '1000',
      'Normalized value': String(Math.round(Number(s.sg) * 1000)), 'Normalized unit': 'kg/m³',
      'Specimen type': 'Not published (density specimen form not explicitly established)', Direction: 'Not applicable',
      'Standard / load': 'D792', Standards: 'ASTM D792', 'Specimen / print parameters': 'Not published', Locator: 'p. 1: Specific Gravity',
    },
  });
  if (id) { added++; console.log(`  ${id}  ${s.source}  density ${s.sg} g/cm³`); }
}
if (added) t.save();
console.log(`${migration}: ${added} density value(s) added`);
