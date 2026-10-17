#!/usr/bin/env node
// Migration m432 (2026-10-17): what the round's blind read found (data review fixes; a Claude Sonnet reader re-read 20
// changed records drawn at random, seed 20261017, against their pages; judged on the rendered pages by Claude Opus).
//
// One record was wrong: m428 gave six sheets 3DJake hosts the publisher "3DJake" because their text layer names no maker,
// and the reader found the Creality logo heading Hyper PETG's pages. Each of the six was rendered: the five Hyper sheets
// (Hyper-PLA+, Hyper-PLA+ CF, Hyper-PLA RFID, Hyper-ABS, Hyper PETG) are headed by the CREALITY logo, as their products
// are filed (Creality), and the PLA Basic sheet by the "nice|essentials" logo, as its product is filed. A logo is the
// publisher's own mark: each is its maker's, as the other hosted sheets are since m428. The other 3DJake sheets are titled
// "Technical Data Sheet 3DJAKE ...", 3DJake's own. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m432-what-the-blind-read-found.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm432';
const DATE = '2026-10-17';
const ROWS = [
  ['R-3DJAKE-3DJAKE-13-TDS-hyper-PLA-EN', 'Creality', 'the CREALITY logo'],
  ['R-3DJAKE-3DJAKE-14-TDS-hyper-PLA-CF-EN', 'Creality', 'the CREALITY logo'],
  ['R-3DJAKE-3DJAKE-15-TDS-Hyper-RFID-PLA-EN', 'Creality', 'the CREALITY logo'],
  ['R-3DJAKE-3DJAKE-TDS-hyper-ABS-EN', 'Creality', 'the CREALITY logo'],
  ['R-3DJAKE-3DJAKE-23-TDS-HYPER-PETG-EN', 'Creality', 'the CREALITY logo'],
  ['R-3DJAKE-3DJAKE-Technical-Data-Sheet-nice-essentials-PLA-Basic-V1-0', 'nice essentials', 'the "nice|essentials" logo'],
];
const WAS = 'Publisher spelt "3DJake" since 2026-10-17 (m428), was "3DJake / 3DJAKE": one company, one spelling.';
const t = openTables();
const maker = new Map(t.rows('grades').filter((g) => g.Status === 'active').map((g) => [g.SourceID, g.Manufacturer]));
let n = 0;
for (const [id, publisher, logo] of ROWS) {
  const s = t.get('sources', id);
  if (s.Publisher === publisher) continue;
  if (maker.get(id) !== publisher) throw new Error(`${MIGRATION}: ${id}'s product is filed as ${maker.get(id)}'s, not ${publisher}'s`);
  if (!s['Source note'].includes(WAS)) throw new Error(`${MIGRATION}: ${id}'s note no longer reads as m428 wrote it`);
  t.set('sources', id, 'Publisher', publisher, { expect: '3DJake', migration: MIGRATION });
  t.set('sources', id, 'Source note', s['Source note'].replace(WAS, `Publisher "${publisher}" since ${DATE} (${MIGRATION}), was "3DJake / 3DJAKE": the sheet is headed by ${logo}, its maker's mark, and 3DJake hosts it (the round's blind read).`), { expect: s['Source note'], migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} hosted sheet(s) given the maker their logo names`);
