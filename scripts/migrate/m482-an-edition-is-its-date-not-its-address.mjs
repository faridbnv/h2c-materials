#!/usr/bin/env node
// Migration m482 (2026-10-20): two Revision cells m464 filled with a web address beside the edition's date (the independent
// review of the owner's rulings track T1, F9).
//
// m464 wrote each older edition's words for its edition into its Revision cell where the cell said Not published. For
// Spectrum's two PP data sheets the reader's words began with the footer's address, "www.spectrumfilaments.com
// Preparation date: 06-04-2022" (and 27-10-2025 on the newer sheet): an address is no edition. Each cell keeps the words
// the sheet prints for its edition, "Preparation date: …", checked on its cached sheet first. A re-run is a no-op; a run
// after the data moved stops.
//
//   node scripts/migrate/m482-an-edition-is-its-date-not-its-address.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm482';
const t = openTables();
let n = 0;
for (const [id, date] of [['S-SPECTRUM-en-tds-spectrum-pp', '06-04-2022'], ['S-SPECTRUM-en-tds-spectrum-pp-42aa71', '27-10-2025']]) {
  const s = t.get('sources', id);
  const now = `Preparation date: ${date}`;
  if (s.Revision === now) continue;
  onCachedSheet(t, id, now, MIGRATION);
  t.set('sources', id, 'Revision', now, { expect: `www.spectrumfilaments.com Preparation date: ${date}`, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} Revision cell(s) written as the edition's words`);
