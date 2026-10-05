#!/usr/bin/env node
// Migration m343 (2026-10-04): held rows the reader round found wrong on their own pages (D125).
//
// While they read every page of the gap documents, the readers flagged rows the database already held that the page
// contradicts. The automatic proposals could not correct them safely: of 59 corrections they proposed, an independent
// reader found every one a mis-pairing (the page's value for another load, notch, temperature or column). So each flagged
// row was compiled and decided on its page image by a Claude Sonnet verifier, one row at a time
// (docs/audits/2026-10-04-reader-round/proposals/corrections/held-errors.csv), and checked by Claude Opus:
//   - a test temperature or a method designation read as the value (Yousu PC and PVB "tensile 23 MPa", I-PC-CF's
//     "Melting Point (270℃, 2160g)" and "A/120"), a "Method 1" read as a value;
//   - a value filed under the wrong property: elongation at yield as at break, a strength "@ Yield" as unspecified, the
//     strain at maximum stress as an elongation at break, a D790 modulus as a tensile one;
//   - a printed range or bound held as a point ("85A - 88A", a shrinkage range, ">"), a column's direction, specimen form,
//     moisture or treatment the page states otherwise (PA12-CF's "Mechanical Properties by 3D printed");
//   - profile cells the text layer garbled (Bambu PC's bed "55-69" where the page prints 35-65), a test bar's chamber held
//     as guidance (BASF ASA's 65 °C), the label fragment "/ modification" held as a plate;
//   - a number that belongs to another row is quarantined ("Unresolved unit / layout"), as m127 did; nothing is deleted.
// Every quote is checked on the cached sheet (line view, reading-order view or optical sidecar). P1101 and P0619 were read
// on the page image, because their text layer is the garble being corrected; their quotes are the image's. Each edit
// names the value it replaces; profiles are typed again by the parsers. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m343-held-rows-the-pages-correct.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { readStandards } from '../../build/src/normalize/standards.js';

const MIGRATION = 'm343';
const FILE = join(projectRoot, 'docs/audits/2026-10-04-reader-round/proposals/corrections/held-errors.csv');
const READ_ON_IMAGE = new Set(['P1101', 'P0619']);
const TYPED_COLUMNS = new Set(Object.values(TYPED).flat());
const t = openTables();
let cells = 0;
const profiles = new Set();
const checked = new Set();
for (const e of rowsOf(FILE)) {
  if (!e.column || !['fix', 'flag', 'remove-from-row'].includes(e.decision)) continue;
  // A profile's typed cells are the parsers' reading of its raw cells, typed again below, never written by hand.
  if (e.table === 'profiles' && TYPED_COLUMNS.has(e.column)) continue;
  const r = t.get(e.table, e.id);
  if ((r[e.column] ?? '') === (e.value ?? '')) continue;
  const source = r.SourceID;
  if (source !== e.source) throw new Error(`${MIGRATION}: ${e.id} cites ${source}, not ${e.source}`);
  const key = `${e.id}|${e.quote}`;
  if (!checked.has(key) && !READ_ON_IMAGE.has(e.id)) { onCachedSheet(t, source, e.quote, MIGRATION); checked.add(key); }
  t.set(e.table, e.id, e.column, e.value ?? null, { expect: e.expect ?? null, migration: MIGRATION });
  if (e.table === 'measurements' && e.column === 'Standard / load') {
    const standards = readStandards(e.value).join('; ') || 'Not published';
    if (t.get('measurements', e.id).Standards !== standards) t.set('measurements', e.id, 'Standards', standards, { expect: t.get('measurements', e.id).Standards, migration: MIGRATION });
  }
  if (e.table === 'profiles') profiles.add(e.id);
  cells++;
}
// A corrected profile is typed again by the parsers, except in a column its Parse review explains (D115).
let retyped = 0;
for (const id of profiles) {
  const r = t.get('profiles', id);
  const reviewed = reviewFields(r) ?? new Set();
  const typed = typedOf(r);
  for (const cols of Object.values(TYPED)) for (const c of cols) {
    if (reviewed.has(c) || r[c] === typed[c]) continue;
    t.set('profiles', id, c, typed[c], { expect: r[c], migration: MIGRATION });
    retyped++;
  }
}
if (cells || retyped) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) corrected on ${profiles.size} profile(s) and their measurements; ${retyped} typed cell(s) read again`);
