#!/usr/bin/env node
// Migration m358 (2026-10-05): the test bars' printing conditions on the sheets m192 and m300 did not reach (gap round 2;
// D63, D116; OPEN-PROBLEMS §12).
//
// m170 read a block about how the test bars were printed on 122 sheets beside their recommended rows; m192 and m300 put
// it on the values of 75 of them. The other 96 held 1,078 values with no print parameters, so a bar the sheet says was
// printed still read "do not assume printed": Flashforge's "Attachment 1" settings (31 sheets), eSUN's "Printing Test
// Conditions" (13), the older Polymaker sheets' "How to make specimens" (23), Raise3D Premium's "All testing specimens
// were printed under the following conditions" (13), and AzureFilm's, 3DJake's and SIDDAMENT's blocks. Claude Sonnet
// readers read each block on its page and named the scopes it speaks for (tensile, flexural, impact; thermal only where
// the block names the heat-deflection bars), the page its values are on and, where a page holds two tables of a scope,
// the table it heads (docs/audits/2026-10-05-gap-round-2/specimen-blocks/blocks.csv); Claude Opus reviewed the scopes.
// Eleven eSUN V1 sheets say their values come from "the injection molding spline test": their rows were already
// moulded bars (m128), and they get nothing here. 3DJake's AzureFilm-made sheets print their bars at 20 % infill; the
// words go on the rows as printed, and OPEN-PROBLEMS §31 says what that leaves.
//
// As m300 does: a page_context row per sheet, page and scope says the bars were printed, and every value of that page
// and scope that holds no print parameters of its own and is a printed or unstated bar gets the block's words. Beside
// them, eleven eSUN profiles held the first size of "Nozzle Size 0.2,0.4,0.6,0.8mm" as their nozzle; they hold the row.
// Every quote is checked on the cached, hash-checked sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m358-the-specimen-blocks-left.mjs
import { join } from 'node:path';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';
import { pageOf, scopeOf } from '../../build/src/page-context.js';
import { specimenForm } from '../../build/src/normalize/specimen.js';

const MIGRATION = 'm358';
const DIR = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2/specimen-blocks');
const REVIEWED = 'Read 2026-10-05 by Claude Sonnet readers on the page image and the cached sheet, quote-checked and scoped by Claude Opus; gap round 2 (m358)';
const NP = 'Not published';
const NA = 'Not applicable';
const t = openTables();
const hasTable = 'Table' in (t.rows('page_context')[0] ?? {});
const norm = (s) => String(s ?? '').toLowerCase().replace(/[°º˚]/g, '°').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

const blocks = rowsOf(join(DIR, 'blocks.csv'));
let added = 0, cells = 0;
for (const b of blocks) {
  onCachedSheet(t, b.source, b.quote, MIGRATION);
  const table = b.table && hasTable ? b.table : null;
  if (b.specimen_type === 'Printed specimen') {
    for (const scope of b.scopes.split(';').map((s) => s.trim()).filter(Boolean)) {
      const row = {
        SourceID: b.source, Page: b.values_page, 'Applies to': scope, Statement: `Printed test bars: ${b.print_parameters}`, 'Specimen type': 'Printed specimen',
        'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA, Standard: NP, 'Test temperature °C': NP,
        Locator: `p. ${b.page}: the block on how the test bars were printed${String(b.page) === String(b.values_page) ? '' : `, for the values of p. ${b.values_page}`}`,
        ...(hasTable ? { Table: table ?? NA } : {}),
      };
      const held = t.rows('page_context').find((c) => c.SourceID === row.SourceID && String(c.Page) === String(row.Page) && c['Applies to'] === scope
        && c['Specimen type'] === 'Printed specimen' && (!hasTable || (c.Table ?? NA) === row.Table));
      if (held) continue;
      t.append('page_context', { PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), ...row, 'Reviewed by': REVIEWED }, { migration: MIGRATION });
      added++;
    }
  }
  const scopes = new Set(b.scopes.split(';').map((s) => s.trim()));
  for (const m of t.rows('measurements')) {
    if (m.SourceID !== b.source || String(pageOf(m.Locator)) !== String(b.values_page) || !scopes.has(scopeOf(m.Property))) continue;
    if (table && !norm(m.Locator).includes(norm(table))) continue;
    if (/^Retired|implausible|Unresolved/.test(m['Data status']) || !['printed', 'not-stated'].includes(specimenForm(m['Specimen type']))) continue;
    if (m['Specimen / print parameters'] !== NP) continue;
    t.set('measurements', m.MeasurementID, 'Specimen / print parameters', b.print_parameters, { expect: NP, migration: MIGRATION });
    const after = t.get('measurements', m.MeasurementID);
    t.set('measurements', m.MeasurementID, 'Notes', withNote(after.Notes, `Specimen / print parameters from the sheet's block on how its test bars were printed, read 2026-10-05 (${MIGRATION}).`), { expect: after.Notes, migration: MIGRATION });
    cells++;
  }
}

// eSUN's recommended row lists every nozzle size it supports; the profiles kept only the first.
let nozzles = 0;
for (const p of rowsOf(join(DIR, 'sb2-profiles.csv'))) {
  const held = p['Nozzle diameter (current)'];
  if (!/^0[.,]2$/.test(String(held).trim())) continue;
  const r = t.get('profiles', p.ProfileID);
  const value = '0.2,0.4,0.6,0.8mm';
  if (r['Nozzle diameter'] === value) continue;
  onCachedSheet(t, r.SourceID, 'Nozzle Size 0.2,0.4,0.6,0.8mm', MIGRATION);
  t.set('profiles', p.ProfileID, 'Nozzle diameter', value, { expect: r['Nozzle diameter'], migration: MIGRATION });
  nozzles++;
}
if (added || cells || nozzles) t.save();
console.log(`${MIGRATION}: ${added} page_context row(s); ${cells} measurement(s) given their bars' print parameters; ${nozzles} nozzle-size row(s) held whole`);
