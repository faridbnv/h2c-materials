#!/usr/bin/env node
// Write material summaries into data/tables/material_summaries.csv (D142), all of a file's rows or none.
//
//   npm run pages:add-summaries -- <file.csv>             append its rows (materials with no summary yet)
//   npm run pages:add-summaries -- <file.csv> --revise    replace the rows of materials that have one: an owner's
//                                                         review (Review status) or a rewrite
//   npm run pages:add-summaries -- <file.csv> --check     change nothing; say what would be refused
//
// The file has the table's columns (MaterialID, Summary, Written by, Written on, Review status, Notes). A row is refused,
// and with it the file, when its material has no page (app/js/ui/page-rule.js), already has a summary (or, with
// --revise, has none), its Review status is not in schema/vocab/summary-status.csv, its date is not a date, a
// placeholder cannot be filled (the build's own fill, build/src/written.js: SUMMARY-PLACEHOLDER), or the lint finds a
// number typed by hand or a text fault in it (SUMMARY-NUMBER, TEXT-*). A summary outside 60 to 100 words is said, not
// refused. Rows go in through table-io (scripts/data/table-io.mjs); a revision names the cells it replaces, so a row
// that changed since the file was written stops it. Then: npm run build, npm run data:diff.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readCsv } from '../../build/src/csv.js';
import { fillSummary, fillContext, indexForFill } from '../../build/src/written.js';
import { lintData } from '../../build/src/lint-rules.js';
import { pageOf } from '../../app/js/ui/page-rule.js';
import { openTables } from '../data/table-io.mjs';
import { loadDb, root } from './lib.mjs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const check = args.includes('--check');
const revise = args.includes('--revise');
if (!file) { console.error('Name the file: npm run pages:add-summaries -- summaries.csv [--check | --revise]'); process.exit(2); }

const COLUMNS = ['MaterialID', 'Summary', 'Written by', 'Written on', 'Review status', 'Notes'];
const { header, records } = readCsv(resolve(file));
if (header.join() !== COLUMNS.join()) { console.error(`${file}: the columns must be ${COLUMNS.join(', ')}; they are ${header.join(', ')}.`); process.exit(2); }
const rows = records.map((r) => r.values);

const db = loadDb({ quiet: true });
const t = openTables(root);
const existing = new Map(t.rows('material_summaries').map((r) => [r.MaterialID, r]));
const statuses = new Set(readCsv(resolve(root, 'schema/vocab/summary-status.csv')).records.map((r) => r.values.Value));
const byId = new Map(db.materials.map((m) => [m.id, m]));
const msOf = new Map();
for (const x of db.measurements) (msOf.get(x.materialId) ?? msOf.set(x.materialId, []).get(x.materialId)).push(x);
const ix = indexForFill(db);
// The lint as data:lint runs it, on these rows beside the names the tables hold.
const findings = lintData({ material_summaries: { header, rows }, materials: { rows: t.rows('materials') }, grades: { rows: t.rows('grades') } }, { material_summaries: { primaryKey: 'MaterialID' } })
  .filter((f) => f.table === 'material_summaries');

const refused = [];
const notes = [];
const seen = new Set();
for (const r of rows) {
  const id = r.MaterialID;
  const no = (why) => refused.push(`${id}: ${why}`);
  const m = byId.get(id);
  if (!m) { no('no such material'); continue; }
  if (seen.has(id)) no('a second row for it in the file'); else seen.add(id);
  if (!pageOf(m, msOf.get(id) ?? [])) no(`${m.name} has no page (npm run pages:fields -- ${id})`);
  if (!revise && existing.has(id)) no(`${m.name} already has a summary; pass --revise to replace it`);
  if (revise && !existing.has(id)) no(`${m.name} has no summary to revise; leave out --revise to add it`);
  if (!statuses.has(r['Review status'])) no(`Review status "${r['Review status']}" is not one of ${[...statuses].join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r['Written on'] ?? '')) no(`Written on "${r['Written on']}" is not a date (YYYY-MM-DD)`);
  for (const c of COLUMNS) if (!String(r[c] ?? '').trim()) no(`${c} is empty`);
  if (m.familyEntry) continue;
  for (const reason of fillSummary(r.Summary ?? '', fillContext(m, ix, db.registry)).refusals) no(`SUMMARY-PLACEHOLDER ${reason}`);
  for (const f of findings.filter((x) => x.record === id)) no(`${f.code} ${f.field}: ${f.message}`);
  const words = String(r.Summary ?? '').replace(/\{[^{}]*\}/g, 'x').split(/\s+/).filter(Boolean).length;
  if (words < 60 || words > 100) notes.push(`${id}: ${words} words (the checklist asks for 60 to 100)`);
}

for (const n of notes) console.log(`  note     ${n}`);
if (refused.length) {
  for (const x of refused) console.error(`  refused  ${x}`);
  console.error(`\n${refused.length} refusal(s) in ${rows.length} row(s): nothing written.`);
  process.exit(1);
}
if (check) { console.log(`${rows.length} row(s) would be ${revise ? 'revised' : 'added'}; nothing written (--check).`); process.exit(0); }

for (const r of rows) {
  if (!revise) { t.append('material_summaries', r); continue; }
  const old = existing.get(r.MaterialID);
  for (const c of COLUMNS.slice(1)) if (old[c] !== r[c]) t.set('material_summaries', r.MaterialID, c, r[c], { expect: old[c] });
}
t.save();
console.log(`${rows.length} summar${rows.length === 1 ? 'y' : 'ies'} ${revise ? 'revised' : 'added'} in data/tables/material_summaries.csv. Next: npm run build, npm run data:diff.`);
