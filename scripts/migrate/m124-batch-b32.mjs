#!/usr/bin/env node
// Migration m124 (2026-09-21): batch b32, the rest of the twins.
//
// Every held document proposed once more (`--propose --held any`); what the pipeline could take without a person
// was nine twins. Seven of 3DJake's "The Filament" sheets and its PCTG print the tables Spectrum's own sheets carry
// (R053, one material). Spectrum's PET-G FX120 prints colorFabb nGen_FLEX's table, whose values sit under
// nGen FLEX (M143): R166, registered with no values of its own and a coverage row; 3DJake's copy of it is
// registered to the same grade. The twins step shaped it as R053 in b31's first pass because nGen_FLEX's source is
// not its grade's own; it now reads a source's material from the grades the source applies to.
//
//   node scripts/migrate/m124-batch-b32.mjs

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { applyBatch, Refusal } from '../ingest/apply.mjs';
import { openTables, nextId, projectRoot } from '../data/table-io.mjs';

const MIGRATION = 'm124-batch-b32';
const DATE = '2026-09-21';
try {
  const { log, applied } = applyBatch('b32', { migration: MIGRATION, date: DATE });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error(`Nothing written. ${error.problems.length} reason(s):`);
  for (const p of error.problems.slice(0, 20)) console.error(`  [${p.code}] ${p.where}: ${p.message}`);
  process.exit(1);
}

// R166: one coverage row per material, naming each product whose sheet reprints another material's table.
const dir = join(projectRoot, 'docs/audits/2026-09-18-v2-import/proposals/b32');
const reprinting = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))).filter((p) => p.reprints);
const t = openTables();
const byMaterial = new Map();
for (const p of reprinting) {
  const g = p.grades[0].row;
  (byMaterial.get(g.MaterialID) ?? byMaterial.set(g.MaterialID, []).get(g.MaterialID)).push(`${g.Manufacturer} ${g['Product name']} (${p.source.row.SourceID}) reprints the table ${p.reprints.source} carries under ${p.reprints.material}`);
}
let added = 0;
for (const [material, lines] of byMaterial) {
  const finding = `Reviewed ${DATE} (ruling R166, ${MIGRATION}). ${lines.join('; ')}. Each product and its sheet are registered; the numbers are the other material's and are not repeated here.`;
  if (t.rows('coverage').some((c) => c.MaterialID === material && c.Finding.includes(lines[0]))) continue;
  // One R166 row per material: a material that already has one gains the lines.
  const row = t.rows('coverage').find((c) => c.MaterialID === material && c.Domain === 'Source conflict' && /\(ruling R166, m1\d\d-/.test(c.Finding));
  if (row) {
    t.set('coverage', row.CoverageID, 'Finding', row.Finding.replace(/\. (Each product|The product) and its sheet/, `; ${lines.join('; ')} (${MIGRATION}). $1 and its sheet`), { expect: row.Finding });
    added++;
    continue;
  }
  t.append('coverage', { CoverageID: nextId('coverage', t.rows('coverage').map((c) => c.CoverageID)), MaterialID: material, Domain: 'Source conflict', Status: 'Reviewed with limitations', 'Manufacturer count': 'Not applicable', Finding: finding });
  added++;
}
if (added) t.save();
console.log(`${MIGRATION}: ${added} coverage row(s) for R166`);
