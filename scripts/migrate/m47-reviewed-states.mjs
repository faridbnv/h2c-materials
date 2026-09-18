#!/usr/bin/env node
// Migration m47: thirteen printed mechanical measurements carried Direction "Not published" and an accepted
// MEAS-PRINTED-NO-DIRECTION finding each. The acceptance was doing the work a state should do: every one had been
// re-read, and the reason was recorded in a review file rather than in the row. A reader of the table could not tell
// them from a row nobody had checked yet, which is what "Not published" should mean.
//
// The reasons are not one case, so they do not become one value:
//
//   Unstated                       the source publishes the printed result and states no direction (4 rows)
//   Stated, not a usable direction the source states an orientation the database cannot use: a 0°-90° raster it has
//                                  no value for, or an X-Z label the source's own numbers contradict (9 rows)
//
// Both are an unknown direction to the build, so nothing downstream moves. What changes is that the row says why,
// MEAS-PRINTED-NO-DIRECTION goes back to meaning "nobody has checked this", and thirteen acceptances retire.
//
// npm run build:diff: measurements[].directionText on the thirteen rows; nothing else.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv, csvText } from '../../build/src/csv.js';
import { openTables, projectRoot } from '../data/table-io.mjs';

// The source states no direction at all: the data table and the charts give none.
export const UNSTATED = ['V001918', 'V001924', 'V001976', 'V001977'];

// The source states something that is not a build direction the database can use. Each row's Notes say which.
export const NOT_USABLE = ['V001973', 'V001974', 'V001975', 'V002205', 'V002206', 'V002208', 'V002302', 'V002304', 'V002306'];

const RETIRED_ACCEPTANCES = ['MEAS-PRINTED-NO-DIRECTION', 'EST-WIDE'];

export function migrate(t) {
  if (t.get('measurements', UNSTATED[0]).Direction !== 'Not published') return;
  for (const id of UNSTATED) t.set('measurements', id, 'Direction', 'Unstated', { expect: 'Not published' });
  for (const id of NOT_USABLE) t.set('measurements', id, 'Direction', 'Stated, not a usable direction', { expect: 'Not published' });
}

/**
 * The acceptances these states replace. MEAS-PRINTED-NO-DIRECTION no longer fires on a reviewed row, and EST-WIDE
 * now asks whether the material had a usable published value the estimate ignored, which none of its thirteen
 * records did: each is thin evidence, which EST-THIN reports without asking for a reviewer.
 */
export function retireAcceptances(root = projectRoot) {
  const path = join(root, 'data/review/accepted-findings.csv');
  const { header, records } = readCsv(path);
  const rows = records.map((r) => r.values);
  const keep = rows.filter((r) => !RETIRED_ACCEPTANCES.includes(r.Code));
  writeFileSync(path, csvText(header, keep));
  console.log(`retired ${rows.length - keep.length} acceptance(s); ${keep.length} remain`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record} ${c.field ?? ''}`);
  retireAcceptances();
}
