#!/usr/bin/env node
// Migration m300 (2026-10-02): the test bars' printing conditions a sheet states once, on the values it speaks for
// (D63, D116; OPEN-PROBLEMS §12 and §18).
//
//   Polymaker   Its newer sheets (and Fiberon's) print "HOW TO MAKE SPECIMENS", which their text layer sets letter by
//               letter ("H O W T O M A K E S P E C I M E N S"), so the reader never matched it: 498 bar rows on 49 sheets
//               said "do not assume printed" although the block says how the bars were printed. A page_context row per
//               sheet, page and scope the block names (tensile, flexural, impact) now says so, as PC00017 to PC00019 did
//               for PLA Pro, and every value of that page and scope that states nothing of its own inherits it (D116).
//               A heat deflection or a DSC value is not a bar the block names, and stays as it was.
//   Eryone      "Note: All splines are printed under the following conditions: printing temperature=210° C, printing
//               speed=80mm/s, base plate 60 ° C, filling=100%, nozzle diameter=0.4mm", under Part III, "Mechanical
//               Properties of Printed Samples" (30 sheets).
//   SUNLU       "测试样条打印速度 45 mm/s，打印温度 255 ℃。填充 100%" (the test bars' print speed, temperature and infill),
//               footnote [1] under its mechanical table (7 sheets).
//
// Each block's words go in Specimen / print parameters on every value of its page and scope that holds none and is a
// printed or unstated bar (never a moulded, film or off-recipe value); Eryone's and SUNLU's notes, which say the bars
// were printed, are page_context rows too. Claude Sonnet readers read every block and named the scopes it speaks for
// (m300-polymaker-context.csv, m300-print-parameters.csv); each quote is checked here on the cached, hash-checked sheet.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m300-specimen-blocks.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { withNote } from './source-edits.mjs';
import { pageOf, scopeOf } from '../../build/src/page-context.js';
import { specimenForm } from '../../build/src/normalize/specimen.js';

const MIGRATION = 'm300';
const REVIEWED = 'Read 2026-10-02 by an agent (Claude Sonnet) on the cached sheet, quote-checked by Claude Opus; open-problems pass (m300)';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
const NP = 'Not published';

const contexts = [];
for (const e of rowsOf(join(here, `${MIGRATION}-polymaker-context.csv`))) {
  const { quote, ...row } = e;
  contexts.push({ row, quote });
}
const params = rowsOf(join(here, `${MIGRATION}-print-parameters.csv`));
for (const p of params.filter((x) => x.specimen_type === 'Printed specimen')) {
  for (const scope of p.scopes.split(';')) {
    // SUNLU prints its note as footnote [1] on p. 3, under values printed on p. 1: the row speaks for the values' page.
    contexts.push({ quote: p.quote, row: {
      SourceID: p.source, Page: p.values_page, 'Applies to': scope, Statement: `Printed samples: ${p.print_parameters}`, 'Specimen type': 'Printed specimen',
      'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': 'Not applicable', 'Anneal h': 'Not applicable',
      Standard: NP, 'Test temperature °C': NP, Locator: `p. ${p.page}: the note on how the test bars were printed${p.page === p.values_page ? '' : `, under the values of p. ${p.values_page}`}`,
    } });
  }
}
let added = 0;
for (const { row, quote } of contexts) {
  const held = t.rows('page_context').find((c) => c.SourceID === row.SourceID && String(c.Page) === String(row.Page) && c['Applies to'] === row['Applies to'] && c['Specimen type'] === row['Specimen type']);
  if (held) continue;
  onSheet(t, row.SourceID, quote, MIGRATION);
  t.append('page_context', { PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), ...row, 'Reviewed by': REVIEWED }, { migration: MIGRATION });
  added++;
}

let cells = 0;
for (const p of params) {
  onSheet(t, p.source, p.quote, MIGRATION);
  const scopes = new Set(p.scopes.split(';'));
  for (const m of t.rows('measurements')) {
    if (m.SourceID !== p.source || String(pageOf(m.Locator)) !== String(p.values_page) || !scopes.has(scopeOf(m.Property))) continue;
    if (/^Retired|implausible|Unresolved/.test(m['Data status']) || !['printed', 'not-stated'].includes(specimenForm(m['Specimen type']))) continue;
    if (m['Specimen / print parameters'] !== NP) continue;
    t.set('measurements', m.MeasurementID, 'Specimen / print parameters', p.print_parameters, { expect: NP, migration: MIGRATION });
    t.set('measurements', m.MeasurementID, 'Notes', withNote(m.Notes, `Specimen / print parameters from the sheet's note on how its test bars were printed, read 2026-10-02 (${MIGRATION}).`), { expect: m.Notes, migration: MIGRATION });
    cells++;
  }
}
if (added || cells) t.save();
console.log(`${MIGRATION}: ${added} page_context row(s); ${cells} measurement(s) given their bars' print parameters`);
