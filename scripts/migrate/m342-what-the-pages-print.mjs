#!/usr/bin/env node
// Migration m342 (2026-10-04): what the pages of every document tied to a gap print, read from the page images (the
// reader round, D125).
//
// Claude Sonnet readers read every page of the 1,377 registered documents tied to a material or product gap (printing,
// mechanical, thermal) and the coverage notes' conflicts, from the rendered page (a web page from its cached text), and
// checked every row the tables hold from each. `npm run ingest:read-reconcile` checked each reading against the page's
// text layer, its reading-order view and its optical sidecar, and against the tables; a reading that decides something
// (a print setting the H2C gate reads, a headline property, a page statement) and that the page's own text does not
// pair, or that contradicts a held row, was read again by a second, blind reader, or agreed with the importer's own
// sheet reader. `npm run ingest:read-proposals` turned what passed into the files of
// docs/audits/2026-10-04-reader-round/proposals/final/, mapped to the vocabularies and typed by the parsers; everything
// else is in its held.csv with the reason. Reading a registered, hash-checked sheet again is not an import (D123).
//
// Here: each document that now speaks for a product it did not list names it in Applicable grades (a maker's portfolio
// or comparison page, matched to the maker's own product by its exact name), and the proposals are applied by
// applyProposals, which checks every quote on the cached sheet and every replaced value before it writes. A re-run is a
// no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m342-what-the-pages-print.mjs [--dry-run]
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { applyProposals } from './read-proposals-apply.mjs';

const MIGRATION = 'm342';
const DIR = join(projectRoot, 'docs/audits/2026-10-04-reader-round/proposals/final');
const READ = 'Read 2026-10-04 by Claude Sonnet readers from the page image (reader round, D125), checked against the cached text layer, reading-order view or optical sidecar, and where it decides, read again blind or by the importer\'s reader; applied by Claude Opus';
const t = openTables();

// ---------------------------------------------------------------- a document's scope names the products it speaks for
const files = ['profiles-add.csv', 'profiles-set.csv', 'values-add.csv', 'values-set.csv', 'page-context-add.csv'].map((f) => join(DIR, f)).filter(existsSync);
const grade = new Map(t.rows('grades').map((g) => [g.GradeID, g]));
const wanted = new Map();
for (const f of files) {
  for (const r of rowsOf(f)) {
    const g = r.GradeID ?? r.Grade; const s = r.SourceID ?? r.source;
    if (!g || !s || !grade.has(g)) continue;
    (wanted.get(s) ?? wanted.set(s, new Set()).get(s)).add(g);
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

// ---------------------------------------------------------------- the pages' own values, settings and statements
const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ });
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, scoped, ...counts, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, scoped, ...counts }, null, 2));
