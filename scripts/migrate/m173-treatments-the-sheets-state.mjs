#!/usr/bin/env node
// Migration m173 (2026-09-26): the treatments of the printed part the products' own sheets state and the database did
// not record (phase 6, lane 2, finished; GOALS step 5, C9).
//
// - Seventeen Flashforge sheets end their printing advice with "After the printing process, it is recommended to dry
//   the model in the oven at 80-100°C for 1-3 hours to increase the strength of the model.", and five SIDDAMENT sheets
//   print the same advice in their own words ("After the model is printed, it is recommended to dry it in an oven at a
//   temperature of 80 ~100°C for 1 ~ 3 hours to improve the strength of the model"). That is not drying the filament
//   before printing (a print recipe's Drying) but a treatment of the part, like annealing: recorded the way m136
//   recorded annealing, as the maker's statement under Post-processing, its words in Finding and the schedule in
//   Exposure / conditions. Three (Flashforge's PET-GF and TPU 64D, SIDDAMENT's PET CF) print 120-130°C for 6-8 hours;
//   each is recorded as printed. A sheet that tells the reader to dry the filament in an oven is not one of these.
// - Of the four annealing statements lane 2 left, three name another product in the sentence (Bambu ASA Aero's and
//   ASA-CF's sheets say "Bambu ASA", PLA Silk Dual Color's "Bambu PLA Silk") and are not the product's own, so they stay
//   out. PETG-CF's names PETG-CF and is recorded as printed, "65 to 70 hours" and all; Exposure says every other Bambu
//   sheet gives 6 to 12 hours, so a reader sees the likely misprint rather than a schedule we corrected.
//
// Each statement is checked on its cached, hash-checked page before it is written (its words stand there in order). The
// reviewer is an agent (Claude Opus 5.5); no person has reviewed them. A re-run is a no-op.
//
//   node scripts/migrate/m173-treatments-the-sheets-state.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { pageReader } from './printed-on.mjs';

const migration = 'm173-treatments-the-sheets-state';
const here = dirname(fileURLToPath(import.meta.url));
const rows = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NA = 'Not applicable';
const NP = 'Not published';

const t = openTables();
const printed = pageReader(t, migration);
const WHAT = {
  drying: 'Drying the printed part in an oven, to increase its strength',
  annealing: 'Annealing the printed part',
};

let changed = 0;
for (const r of rows) {
  if (t.get('grades', r.GradeID).Status !== 'active') throw new Error(`${migration}: ${r.GradeID} is not active`);
  if (!printed(r.SourceID, r.Page, r.Finding)) throw new Error(`${migration}: the statement for ${r.GradeID} is not printed on p. ${r.Page} of ${r.SourceID}`);
  if (t.rows('evidence').some((e) => e.GradeID === r.GradeID && e.SourceID === r.SourceID && e.Domain === 'Post-processing' && e.Finding === r.Finding)) continue;
  t.append('evidence', {
    EvidenceID: t.nextId('evidence'), MaterialID: t.get('grades', r.GradeID).MaterialID, GradeID: r.GradeID,
    Domain: 'Post-processing', Topic: 'Post-processing', Finding: r.Finding,
    'Exposure / conditions': `${WHAT[r.Kind]}: ${r.Exposure}`,
    'Rating 1–5': NP, RubricID: NA, 'Evidence type': 'Manufacturer statement', SourceID: r.SourceID, Locator: `p. ${r.Page}: ${r.Label}`,
  });
  changed++;
}

if (changed) t.save();
console.log(`${migration}: ${changed} treatment(s) written from the products' own sheets`);
