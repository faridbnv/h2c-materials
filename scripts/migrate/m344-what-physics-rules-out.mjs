#!/usr/bin/env node
// Migration m344 (2026-10-04): the physics checks on what the reader round recorded (D125, D126).
//
// m342 recorded what the gap documents' pages print, and the physics lint (MEAS-PHYSICS-*, physical_relations.csv,
// plausibility_windows.csv) found 89 values that break an order or a window. A Claude Sonnet verifier read each on its
// page (docs/audits/2026-10-04-reader-round/proposals/corrections/physics-verdicts.csv), checked by Claude Opus:
//   - fix: the reading misplaced a column (Raise3D's PET-CF and PETG-CF "ZX, Flat" column read as XY; Fillamentum's
//     comparison page, whose AF80 and FX256 columns were filed under Nylon CF15), so the row moves to the column or
//     product the page prints it under;
//   - flag: the sheet prints what cannot be (a GPa value under an MPa label, "2403 GPa", an elastomer's HDT, a strain
//     below its own stress over modulus), so the number stays, flagged "Published value (physically implausible)" with
//     the reason (D55);
//   - accept: a credible value outside a soft window, or a pair the lint matched across two tables; the reason is
//     recorded in data/review/accepted-findings.csv.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m344-what-physics-rules-out.mjs
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { withNote } from './source-edits.mjs';
import { readCsv, csvText } from '../../build/src/csv.js';

const MIGRATION = 'm344';
const FILE = join(projectRoot, 'docs/audits/2026-10-04-reader-round/proposals/corrections/physics-verdicts.csv');
const FLAG = 'Published value (physically implausible)';
const t = openTables();
const verdicts = rowsOf(FILE);
let cells = 0;
for (const v of verdicts.filter((x) => (x.decision === 'fix' || x.decision === 'flag') && x.id)) {
  const r = t.get('measurements', v.id);
  if ((r[v.column] ?? '') === (v.value ?? '')) continue;
  t.set('measurements', v.id, v.column, v.value, { expect: v.expect, migration: MIGRATION });
  const note = v.decision === 'flag' ? `Flagged ${MIGRATION} (2026-10-04): ${v.reason}` : `Corrected ${MIGRATION} (2026-10-04): ${v.column} ${v.expect} → ${v.value}; ${v.reason}`;
  const after = t.get('measurements', v.id);
  if (!String(after.Notes ?? '').includes(note)) t.set('measurements', v.id, 'Notes', withNote(after.Notes, note), { expect: after.Notes, migration: MIGRATION });
  cells++;
}
// A row moved to another product of its page: its source names that product.
for (const v of verdicts.filter((x) => x.decision === 'fix' && x.column === 'GradeID')) {
  const s = t.get('sources', t.get('measurements', v.id).SourceID);
  const g = t.get('grades', v.value);
  if (new RegExp(`\\b${v.value}\\b`).test(s['Applicable grades'] ?? '')) continue;
  t.set('sources', s.SourceID, 'Applicable grades', `${s['Applicable grades']}; ${g.MaterialID} / ${v.value}`, { expect: s['Applicable grades'], migration: MIGRATION });
}
if (cells) t.save();

// The accepted findings, each with its verifier's reason.
const ACC = join(projectRoot, 'data/review/accepted-findings.csv');
const acc = readCsv(ACC);
const have = new Set(acc.records.map((r) => [r.values.Code, r.values.Table, r.values.Record, r.values.Field ?? ''].join('|')));
const added = [];
for (const v of verdicts.filter((x) => x.decision === 'accept')) {
  const parts = String(v.record).trim().split(/\s+/);
  const [table, record] = parts.length > 1 ? parts : ['measurements', parts[0]];
  const row = { Code: v.code, Table: table, Record: record, Field: v.field ?? '', Reason: `${v.reason} (reader round, ${MIGRATION}, 2026-10-04)`, Accepted: '2026-10-04' };
  const k = [row.Code, row.Table, row.Record, row.Field].join('|');
  if (have.has(k)) continue;
  have.add(k); added.push(row);
}
if (added.length) writeFileSync(ACC, csvText(acc.header, [...acc.records.map((r) => r.values), ...added]));
console.log(`${MIGRATION}: ${cells} cell(s) fixed or flagged; ${added.length} finding(s) accepted with their reason`);
