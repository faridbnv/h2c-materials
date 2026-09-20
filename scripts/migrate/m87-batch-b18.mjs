#!/usr/bin/env node
// Migration m87 (2026-09-20): batch b18, Wave D's first half.
//
// 3DJake's own catalogue, fetched and read for the first time: 319 documents fetched, 215 new, 176 of them
// readable and the rest duplicates of sheets already registered or scans that wait for a reader. With them, the
// documents the ledger had no reason to hold.
//
// Twenty-four print another source's numbers and are queued as questions rather than registered twice (R053);
// the ledger now says which source each repeats, so the queue answers that without anybody re-deriving it.
//
// A hundred and eleven are held because the sheet is hosted by a shop and names no maker of its own. Whether
// 3DJake is the brand or only the shop is the owner's to say, and the rest of Wave D waits on it.
//
// Two standards enter with the data that cites them: ASTM E2402 and ISO 11358, both thermogravimetry, which is
// how a sheet states the temperature at which its filament has lost five per cent of its mass.
//
// Seventeen findings are accepted for one reason, and it is worth writing down: this maker measures its Vicat
// point at 5 kg ("ASTM D1525 5kg, 50°C/h"), which is the heavy load, and a needle under 50 N goes into a bar as
// soon as the polymer softens. A Vicat at or just below the glass transition is what that load gives; the rule
// is drawn from sheets that state the light one. Seventeen more are accepted per record, most of them notched
// impact strengths that read as unnotched ones and two hardnesses whose scale the sheet prints as "HA/HD" and
// so does not state at all.
//
// One row is rejected: the low end of a foaming filament's density range, for the fourth batch running.
//
//   node scripts/migrate/m87-batch-b18.mjs

import { applyBatch, Refusal } from '../ingest/apply.mjs';

try {
  const { log, applied } = applyBatch('b18', { migration: 'm87-batch-b18', date: '2026-09-20' });
  console.log(`${log.length} record(s) written; ${applied} document(s) marked applied in the ledger`);
} catch (error) {
  if (!(error instanceof Refusal)) throw error;
  console.error('b18 refused:');
  console.error(error.message);
  process.exit(1);
}
