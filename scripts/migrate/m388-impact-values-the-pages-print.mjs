#!/usr/bin/env node
// Migration m388 (2026-10-06): the impact results registered sheets print and no row held, read from their pages (the
// impact round, D133; GOALS 2026-10-06, later).
//
// The round froze 345 registered documents whose cached text prints an impact result (a Charpy, Izod or impact line with
// a unit or a standard) that the tables held fewer rows of (docs/audits/2026-10-06-impact-round/targets.mjs). Claude
// Sonnet readers read every impact row of them from the page images (IMPACT-READER-PROMPT.md); `ingest:read-reconcile`
// checked each reading against the page's text and the held rows, a second, blind Sonnet reader read again every row the
// text did not pair and every headline row; `ingest:read-proposals` mapped what passed. Claude Opus reviewed the
// proposals (curate.mjs): the corrections it proposed paired held rows with other rows of their page and were all held,
// as were comparison pages' columns, rows a column the reading did not capture tells apart, resin guides' moulded data
// and four rows one by one; what is left is applied here (docs/audits/2026-10-06-impact-round/applied/). Each document
// that now speaks for a product it did not list names it in Applicable grades. Reading a registered, hash-checked sheet
// again is not an import (D123).
//
// applyProposals checks every quote on the cached sheet before it writes. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m388-impact-values-the-pages-print.mjs [--dry-run]
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { applyProposals } from './read-proposals-apply.mjs';

const MIGRATION = 'm388';
const DIR = join(projectRoot, 'docs/audits/2026-10-06-impact-round/applied');
const READ = 'Read 2026-10-06 by Claude Sonnet readers from the page image (impact round, D133), checked against the cached text layer, and where the text did not pair it or it decides, read again blind; reviewed and applied by Claude Opus';
const t = openTables();

// A document's scope names the products it now speaks for.
const grade = new Map(t.rows('grades').map((g) => [g.GradeID, g]));
const wanted = new Map();
for (const f of ['values-add.csv', 'page-context-add.csv'].map((n) => join(DIR, n)).filter(existsSync)) {
  for (const r of rowsOf(f)) {
    if (!r.GradeID || !r.SourceID || !grade.has(r.GradeID)) continue;
    (wanted.get(r.SourceID) ?? wanted.set(r.SourceID, new Set()).get(r.SourceID)).add(r.GradeID);
  }
}
let scoped = 0;
const GRADE = /G\d{3}-(?:\d+(?:-R\d+)?|R\d+)/g;
for (const [sourceId, grades] of wanted) {
  const s = t.get('sources', sourceId);
  const before = s['Applicable grades'];
  const entries = [...new Set(String(before ?? '').split(';').map((e) => e.trim()).filter((e) => e && !/^Not (published|applicable)$/.test(e)))];
  const listed = new Set(entries.flatMap((e) => e.match(GRADE) ?? []));
  const add = [...grades].filter((g) => !listed.has(g)).sort();
  const text = [...entries, ...add.map((g) => `${grade.get(g).MaterialID} / ${g}`)].join('; ');
  if (text === before) continue;
  t.set('sources', sourceId, 'Applicable grades', text, { expect: before, migration: MIGRATION });
  scoped += add.length;
}

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-06' });
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, scoped, ...counts, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, scoped, ...counts }, null, 2));
