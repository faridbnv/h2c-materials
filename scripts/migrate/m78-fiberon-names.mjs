#!/usr/bin/env node
// Migration m78 (2026-09-20): six Fiberon products named after a sentence, and six sheets titled after a word.
//
// Polymaker's Fiberon library sets "T E C H N I C A L  D A T A  S H E E T" across the head of every sheet, one
// letter at a time, and follows it with a description. b11 read the title as far as its spacing allowed and
// then took the first line that looked like a name, which was the first line of the description:
//
//   PPS-CF10 is a carbon fiber reinforced PPS
//   PET-GF15 is the bridge of the gap between every
//
// The name each product goes by is the one the maker's own file and catalogue give, which is what the ledger
// records: FIBERON PPS CF10, FIBERON PET GF15. The sheet's printed title is unreadable as printed, so the
// source takes the product's name rather than a fragment of a letter-spaced heading (the m71 pattern).
//
// What the reader learned from this is in scripts/ingest/propose.mjs: a name never has a verb saying what the
// product does, which is what tells "PPS-CF10 is a carbon fiber reinforced PPS" from "CarbonX Carbon Fiber High
// Temp Nylon (HTN)", a name of seven words.
//
//   node scripts/migrate/m78-fiberon-names.mjs

import { openTables } from '../data/table-io.mjs';

const t = openTables();
const ROWS = [
  ['G068-03', 'PET-GF15 is the bridge of the gap between every', 'FIBERON PET GF15', 'R-POLYMAKER-FIBERON-TDS-FIBERON-PET-GF15-v2-0-2026-02-02'],
  ['G053-08', 'PA12-CF10 is carbon fiber reinforced long chain', 'FIBERON PA12 CF10', 'R-POLYMAKER-FIBERON-TDS-FIBERON-PA12-CF10-V1-1-EN'],
  ['G073-04', 'PPS-CF10 is a carbon fiber reinforced PPS', 'FIBERON PPS CF10', 'R-POLYMAKER-FIBERON-TDS-FIBERON-PPS-CF10-V1-1-EN-1'],
  ['G051-09', 'PA6-GF25 is a glass fiber reinforced PA6', 'FIBERON PA6 GF25', 'R-POLYMAKER-FIBERON-TDS-FIBERON-PA6-GF25-V1-1-EN'],
  ['G033-11', 'ASA-CF08 is an easy-to-print, multi-colored outdoor', 'FIBERON ASA CF08', 'R-POLYMAKER-FIBERON-TDS-FIBERON-ASA-CF08-V1-0-EN'],
  ['G050-11', 'PA6-CF20 is a carbon fiber reinforced PA6', 'FIBERON PA6 CF20', 'R-POLYMAKER-FIBERON-TDS-FIBERON-PA6-CF20-V1-1-EN'],
];

let n = 0;
for (const [gradeId, was, name, sourceId] of ROWS) {
  const grade = t.rows('grades').find((g) => g.GradeID === gradeId);
  if (grade && grade['Product name'] === was) { t.set('grades', gradeId, 'Product name', name, { expect: was }); n += 1; }
  const source = t.rows('sources').find((s) => s.SourceID === sourceId);
  if (source && source.Title === 'T E C H N I C A L') { t.set('sources', sourceId, 'Title', name, { expect: 'T E C H N I C A L' }); n += 1; }
}

if (n) t.save();
console.log(`${n} cell(s) written`);
