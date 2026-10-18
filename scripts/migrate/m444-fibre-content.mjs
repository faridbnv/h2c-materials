#!/usr/bin/env node
// Migration m444 (2026-10-18): the fibre load each fibre-filled product's own sheets state, as the new property Fibre
// content (D150; the screening review's change C37).
//
// Three Claude Sonnet readers read every registered sheet of the 252 active products of the fibre-filled materials
// (carbon, glass, aramid and natural fibre) for a stated fibre load, in the reading schema, one row per statement and a
// `none` row for each sheet that states none. The Claude Opus reviewer then read the registered sheets of those products
// the readers' packets had not included, wherever the readers found nothing or only a name, and the page a reader had
// filed under the wrong sheet (readings/readings-opus-review.csv). `npm run ingest:read-reconcile` checked every reading
// against the page's text layer, and `npm run ingest:read-proposals` mapped what the page bore out
// (docs/audits/2026-10-18-screening-build/fibre/proposals/). The reviewer's decisions on the readers' judgement calls are
// review.csv, applied by review.mjs into reviewed/, which this migration applies:
//
// - a figure only the product's name gives (PA6-GF30) is recorded with the name as its raw value and Data status
//   "Nominal from product designation": evidence of the product's grade, never a test result;
// - a skin-core filament's figure says whose it is: QIDI states its core's (the filament holds less), Raise3D and Siraya
//   Tech the filament's, most of it in the core;
// - a load by volume (Extrudr DuraPro ASA CF, 12 %vol) is another quantity and is not recorded here; the grade's
//   Composition / filler keeps the sheet's words;
// - "approximately", "circa" and "about" stay in the note; CarbonFil's two revisions (20 % undated, 15 % of 23-8-2024)
//   are a row each; Flashforge PET-GF's cached sheet says 15 % where its uncached description says 30 % (OPEN-PROBLEMS).
//
// applyProposals checks every quote on the cached, hash-checked sheet and every raw × factor before it writes. A re-run
// is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m444-fibre-content.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';
import { applyProposals } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm444';
const DIR = join(projectRoot, 'docs/audits/2026-10-18-screening-build/fibre/reviewed');
const READ = 'Read 2026-10-18 by three Claude Sonnet readers and the Claude Opus reviewer from the cached text of each registered sheet (the screening build\'s fibre sweep, C37), every quote checked on its page; reviewed and applied by Claude Opus';
const NOMINAL = 'Nominal from product designation';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-18' });

// A figure only the product's name gives is the name's rating, never a test result (D150).
let nominal = 0;
for (const e of rowsOf(join(DIR, 'values-add.csv')).filter((r) => r.data_status === NOMINAL)) {
  const m = t.rows('measurements').find((r) => r.SourceID === e.SourceID && r.Locator === e.Locator && r.GradeID === e.GradeID && r.Property === e.Property);
  if (!m) throw new Error(`${MIGRATION}: no row for ${e.GradeID} at ${e.SourceID} "${e.Locator}"`);
  if (m['Data status'] === NOMINAL) continue;
  t.set('measurements', m.MeasurementID, 'Data status', NOMINAL, { expect: 'Published value', migration: MIGRATION });
  nominal++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, nominal, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts, nominal }, null, 2));
