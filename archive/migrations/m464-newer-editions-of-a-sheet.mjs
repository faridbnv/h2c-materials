#!/usr/bin/env node
// Migration m464 (2026-10-20): which of two editions of a product's sheet is the newer (the owner's ruling of 2026-10-20,
// D171: a data sheet speaks before a product page, and a newer edition of a sheet before an older one).
//
// sources.csv gains a column, Superseded by: the SourceID of a newer edition of the same document the database holds,
// Not applicable on every other row. A Claude Sonnet reader read the 123 pairs of one product's documents of one class
// that print different figures or print windows for it, from what each document prints about its edition
// (docs/audits/2026-10-20-owner-rulings/evidence/editions.csv): 44 are two editions with a printed date or version that
// orders them, and Bambu Lab PC's sheets, which print their versions in their own headings ("Technical Data Sheet V2.0",
// "V3.0"), are the 45th; the other pairs are two different documents, one edition twice, or two editions nothing printed
// orders, and are left as they are (OPEN-PROBLEMS §37.3). Each older edition names its newer one, and where its Revision
// cell says Not published it takes the words it prints for its edition. Both editions' words are checked on their cached,
// hash-checked sheets before anything is written (D35). A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m464-newer-editions-of-a-sheet.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm464';
const NA = 'Not applicable';
const t = openTables();
if (!t.header('sources').includes('Superseded by')) t.addColumn('sources', 'Superseded by', { after: 'Publication date', fill: () => NA });

// [older, newer, older's edition words, newer's], each "p<N>: words" or a heading's words, as the pages print them.
const pairs = rowsOf(join(projectRoot, 'docs/audits/2026-10-20-owner-rulings/evidence/editions.csv'))
  .filter((r) => r.verdict === 'A_NEWER' || r.verdict === 'B_NEWER')
  .map((r) => (r.verdict === 'A_NEWER' ? [r.b, r.a, r.b_edition, r.a_edition] : [r.a, r.b, r.a_edition, r.b_edition]));
pairs.push(['B-PC-TDS', 'B-PC-Bambu-PC-Technical-Data-Sheet', 'p1: Technical Data Sheet V2.0', 'p1: Technical Data Sheet V3.0']);

// One newer edition per document: where a document is older than two held editions, the newest of them.
const newer = new Map();
for (const [older, newest] of pairs) {
  const had = newer.get(older);
  if (had && had !== newest && !pairs.some(([o, n]) => o === had && n === newest) && !pairs.some(([o, n]) => o === newest && n === had)) {
    throw new Error(`${MIGRATION}: ${older} has two newer editions that nothing orders (${had}, ${newest})`);
  }
  // Keep the newer of the two: the one the other is older than.
  if (!had || pairs.some(([o, n]) => o === had && n === newest)) newer.set(older, newest);
}
const words = (cell) => String(cell ?? '').split(' | ').map((x) => x.replace(/^p\d+:\s*/, '').trim()).filter(Boolean);
let n = 0;
for (const [older, newest] of newer) {
  const pair = pairs.find(([o, nw]) => o === older && nw === newest);
  for (const [sid, w] of [[older, pair[2]], [newest, pair[3]]]) if (words(w).length) onCachedSheet(t, sid, words(w).join(' | '), MIGRATION);
  const row = t.get('sources', older);
  if (!row || !t.get('sources', newest)) throw new Error(`${MIGRATION}: ${older} or ${newest} is not a source`);
  if (row['Superseded by'] !== newest) { t.set('sources', older, 'Superseded by', newest, { expect: NA, migration: MIGRATION }); n++; }
  for (const [sid, w] of [[older, pair[2]], [newest, pair[3]]]) {
    const r = t.get('sources', sid);
    const edition = words(w).join('; ');
    if (r.Revision === 'Not published' && edition && edition !== 'Not printed') t.set('sources', sid, 'Revision', edition, { expect: 'Not published', migration: MIGRATION });
  }
}
t.save();
console.log(`${MIGRATION}: ${n} older edition(s) name their newer one, of ${newer.size}`);
