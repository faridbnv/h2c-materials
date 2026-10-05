#!/usr/bin/env node
// Migration m364 (2026-10-05): batch b44's PA12 CF+ page filed under its sibling (gap round 2).
//
// Raise3D's "PA12 CF+" product page was admitted for Industrial PA12 CF+ (G059-03), the product the reader round found
// without a nozzle or bed, but the batch writer matched the page's product to Industrial PA12 CF (G053-09): its product
// key drops the "+", as GRADE-PRODUCT-DUPLICATE's does (OPEN-PROBLEMS §6). The profile moves to the product the page is
// for, the one its source's Applicable grades names. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m364-the-plus-the-filing-dropped.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm364';
const t = openTables();
const p = t.get('profiles', 'P1901');
const grade = t.get('grades', 'G059-03');
let moved = 0;
if (p.GradeID !== 'G059-03') {
  if (t.get('sources', p.SourceID)['Applicable grades'] !== 'G059-03') throw new Error(`${MIGRATION}: ${p.SourceID} no longer speaks for G059-03 alone`);
  t.set('profiles', 'P1901', 'GradeID', 'G059-03', { expect: 'G053-09', migration: MIGRATION });
  t.set('profiles', 'P1901', 'MaterialID', grade.MaterialID, { expect: p.MaterialID, migration: MIGRATION });
  moved++;
  t.save();
}
console.log(`${MIGRATION}: ${moved} profile(s) filed under the product its page is for`);
