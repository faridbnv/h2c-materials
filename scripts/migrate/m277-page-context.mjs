#!/usr/bin/env node
// Migration m277 (2026-10-01): what 92 source pages state once for their values (D116, the data audit's RC3).
//
// Every page `npm run audit:context` found stating a specimen form, moisture state, annealing or standard once, with its
// rows recording nothing, was read by an agent from its cached sheet (m277-page-context.csv). The rows inherit it in
// compile.js where they state nothing of their own; a row stating the opposite is flagged, not rewritten.
//
//   node scripts/migrate/m277-page-context.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { READ, rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm277';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const have = new Set(t.rows('page_context').map((r) => `${r.SourceID}|${r.Page}|${r['Applies to']}`));
let n = 0;
for (const r of rowsOf(join(here, `${MIGRATION}-page-context.csv`))) {
  if (have.has(`${r.source}|${r.page}|${r.scope}`)) continue;
  onSheet(t, r.source, r.quote, MIGRATION);
  t.append('page_context', {
    PageContextID: t.nextId('page_context'), SourceID: r.source, Page: r.page, 'Applies to': r.scope, Statement: r.statement || r.quote,
    'Specimen type': r.specimen, 'Moisture state': r.moisture, 'Post-processing state': r.treatment, 'Anneal °C': r.annealC, 'Anneal h': r.annealH,
    Standard: r.standard, 'Test temperature °C': r.testC, Locator: r.locator, 'Reviewed by': `${READ} (${MIGRATION}, card ${r.card})`,
  });
  have.add(`${r.source}|${r.page}|${r.scope}`); n++;
}
t.save();
console.log(`${MIGRATION}: ${n} page statements recorded`);
