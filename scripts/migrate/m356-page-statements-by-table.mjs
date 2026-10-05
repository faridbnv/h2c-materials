#!/usr/bin/env node
// Migration m356 (2026-10-05): a page's statement can head one table of the page (D128).
//
// A row of page_context.csv said what a page states once for every measurement on that page in its scope. A heading or
// footnote that heads only one of two tables on a page (a footnote under the mechanical table, a "Dry" table beside a
// "Wet" one) therefore reached the other table too; two blind checks of the gap round found it. The table gains a column,
// Table: the heading or locator text the statement heads. A measurement inherits a table's row only if its Locator
// contains that text (case, spacing, punctuation, the degree glyphs and the dashes ignored), and a table's own row is read
// before a scope's and the page's (build/src/page-context.js). Not applicable keeps today's meaning, the whole page within
// its scope.
//
//   1. Every existing row gets Table = Not applicable, so nothing moves in the compiled database.
//   2. If docs/audits/2026-10-05-gap-round-2/page-tables/verdicts.csv exists (the readers' decisions on the detector's
//      candidates, page-tables.mjs), it is applied. Columns: PageContextID; decision (keep | table | split); table (the
//      Table text; for a split, every table, separated by " || "); scopes (optional: the Applies to of the row, for a
//      split one per table in the same order, separated by " || "; empty keeps the row's); quote (checked on the cached
//      sheet); reason.
//        keep   the statement speaks for its whole page: nothing changes;
//        table  the row heads one table: its Table is set;
//        split  the page states it under several tables: the row takes the first, and one copy per further table is added
//               (next PageContextID), each with its Table.
//
// Each edit names the value it replaces, so a re-run is a no-op and a run after the data moved stops.
//
//   node scripts/migrate/m356-page-statements-by-table.mjs
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { tidy } from '../ingest/read-proposals.mjs';

const MIGRATION = 'm356';
const NA = 'Not applicable';
const FILE = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2/page-tables/verdicts.csv');
const list = (s) => String(s ?? '').split('||').map((x) => x.trim()).filter(Boolean);

const t = openTables();
let column = 0, tabled = 0, split = 0;
if (!t.header('page_context').includes('Table')) {
  t.addColumn('page_context', 'Table', { after: 'Applies to', fill: () => NA });
  column = t.rows('page_context').length;
}
const note = (row, text) => (String(row['Reviewed by'] ?? '').includes(text) ? row['Reviewed by'] : `${row['Reviewed by']}; ${text}`);

if (existsSync(FILE)) {
  for (const v of rowsOf(FILE).filter((x) => x.decision === 'table' || x.decision === 'split')) {
    const row = t.get('page_context', v.PageContextID);
    const tables = list(v.table), scopes = list(v.scopes);
    if (!tables.length) throw new Error(`${MIGRATION}: ${v.PageContextID}: ${v.decision} without a table`);
    if (v.decision === 'table' && tables.length !== 1) throw new Error(`${MIGRATION}: ${v.PageContextID}: table takes one Table text; use split for several`);
    const why = `table-scoped ${MIGRATION} (D128)${v.reason ? `: ${tidy(v.reason)}` : ''}`;
    // The row itself takes the first table (and scope).
    const first = tables[0];
    if (row.Table !== first || (scopes[0] && row['Applies to'] !== scopes[0])) {
      if (row.Table !== NA) throw new Error(`${MIGRATION}: ${v.PageContextID}: Table is "${row.Table}", expected ${NA}; the data moved since the verdict was written`);
      if (v.quote) onCachedSheet(t, row.SourceID, v.quote, MIGRATION);
      t.set('page_context', row.PageContextID, 'Table', tidy(first), { expect: NA, migration: MIGRATION });
      if (scopes[0] && row['Applies to'] !== scopes[0]) t.set('page_context', row.PageContextID, 'Applies to', scopes[0], { expect: row['Applies to'], migration: MIGRATION });
      t.set('page_context', row.PageContextID, 'Reviewed by', note(row, why), { expect: row['Reviewed by'], migration: MIGRATION });
      tabled++;
    }
    if (v.decision !== 'split') continue;
    // One copy per further table, unless the page already holds a row for that scope and table.
    tables.slice(1).forEach((table, i) => {
      const scope = scopes[i + 1] || row['Applies to'];
      if (t.rows('page_context').some((c) => c.SourceID === row.SourceID && c.Page === row.Page && c['Applies to'] === scope && c.Table === tidy(table))) return;
      if (v.quote) onCachedSheet(t, row.SourceID, v.quote, MIGRATION);
      t.append('page_context', { ...row, PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), 'Applies to': scope, Table: tidy(table), 'Reviewed by': `${row['Reviewed by']}; copy of ${row.PageContextID}` });
      split++;
    });
  }
}
if (column || tabled || split) t.save();
console.log(`${MIGRATION}: Table added to ${column} row(s), ${tabled} row(s) scoped to a table, ${split} copie(s) added`);
