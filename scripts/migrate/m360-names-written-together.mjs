#!/usr/bin/env node
// Migration m360 (2026-10-05): values a maker's portfolio prints for a product under its name written another way (gap
// round 2, phase 4; D125).
//
// The reader round held 403 readings because no product of the database had the name the page printed. Most name
// products the database does not hold (QIDI's guide, Spectrum's portfolio of its whole range). Some are the database's
// products written without their spaces or hyphens: Spectrum's 2024 portfolio prints "HIPS-X" for the product its sheet
// calls "hipsx". The product matcher (scripts/ingest/read-proposals.mjs matchProduct) now reads a name joined as the same
// name, and the readings that become proposals by it alone are applied here (proposals/joined-only/): Spectrum HIPS-X's
// heat deflection at both loads and its Vicat. The other proposals the re-run made are not taken: they reverse decisions
// m345 and m354 took on their pages (Extrudr's moulded bars, Recreus Foamy's unlabelled hardness). A re-run is a no-op.
//
//   node scripts/migrate/m360-names-written-together.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { applyProposals } from './read-proposals-apply.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm360';
const t = openTables();
// The portfolio speaks for the product now: it names it in Applicable grades, as m342 named the products a page spoke for.
const DIR = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2/proposals/joined-only');
let scoped = 0;
for (const e of rowsOf(join(DIR, 'values-add.csv'))) {
  const s = t.get('sources', e.SourceID);
  if (new RegExp(`\\b${e.GradeID}\\b`).test(s['Applicable grades'] ?? '')) continue;
  t.set('sources', e.SourceID, 'Applicable grades', `${s['Applicable grades']}; ${t.get('grades', e.GradeID).MaterialID} / ${e.GradeID}`, { expect: s['Applicable grades'], migration: MIGRATION });
  scoped++;
}
const counts = applyProposals(t, DIR, {
  migration: MIGRATION, date: '2026-10-05',
  read: 'Read 2026-10-04 by Claude Sonnet readers from the page image (reader round, D125), matched to the product by its name written together (gap round 2); applied by Claude Opus',
});
t.save();
console.log(`${MIGRATION}: ${scoped} source(s) scoped, ${counts.valuesAdded} value(s) added`);
