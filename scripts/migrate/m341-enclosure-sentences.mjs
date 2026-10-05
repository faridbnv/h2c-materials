#!/usr/bin/env node
// Migration m341 (2026-10-04): an enclosure wording the parser now reads (the reader round, D125).
//
// 3DXTECH's archived 3DXMAX PC/ASA page (b41, P1403) prints "We recommend using a printer with an enclosure to help keep
// some heat in while printing with PC/ASA": an enclosure is recommended, and the enclosure parser
// (build/src/normalize/process.js) reads it so now. P1403's Parse review, which explained the state by hand, names a
// column the parser agrees with (D115) and leaves; every live profile whose typed enclosure the parser now reads
// differently is typed again, except in a column a review explains. Raise3D's "Enclosed-frame (rec.), open-frame" stays
// unread on purpose: it allows both frames, and a reviewer reads it.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m341-enclosure-sentences.mjs
import { openTables } from '../data/table-io.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm341';
const t = openTables();
let cells = 0;
const p = t.get('profiles', 'P1403');
if (/^Fields: Enclosure state\./.test(p['Parse review'] ?? '')) {
  t.set('profiles', 'P1403', 'Parse review', 'Not applicable', { expect: p['Parse review'], migration: MIGRATION });
  cells++;
}
for (const r of t.rows('profiles')) {
  if (r.Profile === 'Retired duplicate record') continue;
  const reviewed = reviewFields(r) ?? new Set();
  const typed = typedOf(r);
  for (const c of TYPED.Enclosure) {
    if (reviewed.has(c) || r[c] === typed[c]) continue;
    t.set('profiles', r.ProfileID, c, typed[c], { expect: r[c], migration: MIGRATION });
    cells++;
  }
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s)`);
