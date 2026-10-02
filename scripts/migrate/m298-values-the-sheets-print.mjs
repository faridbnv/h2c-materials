#!/usr/bin/env node
// Migration m298 (2026-10-02): values sheets the database already holds print, and nobody transcribed (OPEN-PROBLEMS §11,
// §15, §18, §28), recorded on the owner's word of 2026-10-02 that reading a registered, hash-checked sheet again is not
// an import.
//
//   nobufil        Thirteen Nobufil sheets (3DJake copies) print one table with two value columns, "FDM H" and
//                  "Injection". The original reader took only the rows with one value (Injection, m128); the tensile,
//                  elongation and Izod rows that carry both were never read, so the printed values were missing. Each
//                  row is now read per column (m225 did PCTG CF's): FDM H is a printed bar whose direction no sheet
//                  states ("Stated, not a usable direction", D84), Injection a moulded one.
//   basf           BASF Forward AM's Extended TDS sheets (PET CF15, PAHT CF15, ASA) print each value per print
//                  direction (XY, XZ, ZX) and the impact table (Charpy and Izod, notched and unnotched); the import kept
//                  one number per row. Each column is a measurement now, in the direction its column names (a tensile
//                  ZX bar pulled along Z is Z, as m191 reads the same sheets' "longest axis first" convention; an upright
//                  flexural or impact bar keeps ZX), dry or conditioned as its heading's footnote says.
//   untranscribed  Raise3D Industrial PET CF's V4.0 table (XY and ZX, before and after annealing), colorFabb LW-PLA's and
//                  LW-PLA-HT's foamed and unfoamed columns (D95, as m197 read the lightweight PETs), LW-ASA's moulded
//                  rows, Stratasys PA6/66-GF30-FR's XZ heat deflections, Polymaker PolyMide CoPA V5.5's wet table, and
//                  Nanovia Flex V0's tensile rows to VDE 0282-10 (two of them stresses at a stated elongation, D122).
//
// m298-values-add.csv holds each new value as a reader proposed it: the row of the same sheet and product it copies
// (`like`), every column the sheet states, its Locator and the quote it is printed in; m298-values-set.csv each cell of an
// existing row the sheet contradicts. Claude Sonnet readers read every sheet, rendering a page wherever the text layer runs
// columns together; every quote is checked here on the cached, hash-checked sheet before anything is written (D35). The
// typed columns are the parsers' reading (Standards, Test temperature °C) or the reader's (Test load MPa), and the build's
// PARSE-MISMATCH and audit:context check them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m298-values-the-sheets-print.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { addValue, withNote } from './source-edits.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';

const MIGRATION = 'm298';
const DATE = '2026-10-02';
const READ = 'Read 2026-10-02 by an agent (Claude Sonnet) on the cached sheet, rendered where the text layer runs columns together; quote-checked by Claude Opus';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const NUM = (s) => String(Number(Number(s).toPrecision(12)));

// ---------------------------------------------------------------- corrections to existing rows
let cells = 0;
const touched = new Map();
for (const e of rowsOf(join(here, `${MIGRATION}-values-set.csv`))) {
  if (e.table !== 'measurements') throw new Error(`${MIGRATION}: ${e.table} is not a table this migration edits`);
  const r = t.get('measurements', e.id);
  if (r[e.column] === e.value) continue;
  if (r.SourceID !== e.source) throw new Error(`${MIGRATION}: ${e.id} cites ${r.SourceID}, not ${e.source}`);
  onSheet(t, e.source, e.quote, MIGRATION);
  t.set('measurements', e.id, e.column, e.value, { expect: e.expect, migration: MIGRATION });
  if (e.column === 'Standard / load') {
    const standards = readStandards(e.value).join('; ') || 'Not published';
    if (t.get('measurements', e.id).Standards !== standards) t.set('measurements', e.id, 'Standards', standards, { expect: t.get('measurements', e.id).Standards, migration: MIGRATION });
  }
  if (!touched.has(e.id)) touched.set(e.id, new Set());
  touched.get(e.id).add(e.column);
  cells++;
}
for (const [id, columns] of touched) {
  const r = t.get('measurements', id);
  if (String(r.Notes).includes(`(${MIGRATION})`)) continue;
  t.set('measurements', id, 'Notes', withNote(r.Notes, `${READ} (${MIGRATION}): ${[...columns].join(', ')} as the sheet prints them.`), { expect: r.Notes, migration: MIGRATION });
}

// ---------------------------------------------------------------- values never transcribed
const COLUMNS = ['Property', 'Raw value', 'Raw unit', 'Raw numeric', 'Conversion factor', 'Normalized value', 'Normalized unit', 'Operator',
  'Specimen type', 'Direction', 'Notch', 'Moisture condition', 'Moisture state', 'Post-processing', 'Post-processing state', 'Anneal °C',
  'Anneal h', 'Test temperature', 'Standard / load', 'Test load MPa', 'Specimen / print parameters', 'Locator'];
const added = {};
for (const e of rowsOf(join(here, `${MIGRATION}-values-add.csv`))) {
  const like = t.get('measurements', e.like);
  onSheet(t, like.SourceID, e.quote, MIGRATION);
  const set = Object.fromEntries(COLUMNS.map((c) => [c, e[c]]));
  if (Number(NUM(Number(e['Raw numeric']) * Number(e['Conversion factor']))) !== Number(e['Normalized value'])) throw new Error(`${MIGRATION}: ${e.Locator} on ${like.SourceID}: ${e['Raw numeric']} × ${e['Conversion factor']} is not ${e['Normalized value']}`);
  // An uncertainty the sheet prints beside the value ("5731 ± 261 MPa") is the row's, raw and normalized.
  const pm = /±\s*(\d+(?:[.,]\d+)?)/.exec(e['Raw value']);
  if (pm) { const u = Number(pm[1].replace(',', '.')); set['Raw uncertainty ±'] = NUM(u); set['Normalized uncertainty ±'] = NUM(u * Number(e['Conversion factor'])); }
  set.Standards = readStandards(e['Standard / load']).join('; ') || 'Not published';
  set['Data status'] = 'Published value';
  set['Parse review'] = 'Not applicable';
  const id = addValue(t, { like: e.like, set, migration: MIGRATION, date: DATE,
    why: 'published in the source, never transcribed.', note: `${e.note} ${READ}.` });
  if (id) added[e.task] = (added[e.task] ?? 0) + 1;
}
t.save();
console.log(`${MIGRATION}: ${cells} cell(s) corrected on ${touched.size} row(s); added ${Object.entries(added).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing'}`);
