#!/usr/bin/env node
// Migration m375 (2026-10-05): rows of tables the profiles held in part, read whole (check round 3, D131; OPEN-PROBLEMS
// §31 "Partial rows of multi-product tables" and "Statements the readers left"; read on the page images by a Claude
// Sonnet reader, docs/audits/2026-10-05-check-round-3/leftovers/partial-rows.csv, decided by Claude Opus).
//
// - QIDI's filament guide answers "Is drying highly recommended?" with "Required" or "Optional" and prints the oven
//   schedule beside it ("Blast Drying Oven: 70-80°C / 4-6 h"). Its eleven product rows held the answer alone; each now
//   holds both, so the product's drying shows its schedule.
// - Spectrum's Polish product sheets answer the closed chamber "Komora zamknięta: niewymagane" (not required) and the
//   nozzle "Dysza rubinowa lub hartowana: niewymagane" (ruby or hardened nozzle: not required), or "zalecane"
//   (recommended) for the carbon- and aramid-filled ones. The seven profiles left both unknown, and the printer guide
//   answered instead; the product's own answer now does. (Their "Suszarka do filamentu" row, a filament dryer, is a
//   dry-box answer and stays out of Drying, as D129 holds.) The parsers read the Polish answers.
// Not applied: the nozzle, bed and closed-chamber cells of Spectrum's 2024 and 2025 portfolio tables. They were read and
// checked (partial-rows.csv), but every product they belong to has its print gates answered by its own data sheet, and
// a portfolio row is a summary of that sheet: where the two differ the sheet is the product's own statement (OPEN-
// PROBLEMS §32). Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m375-rows-read-whole.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype } from './m290-profile-settings.mjs';
import { readCsv } from '../../build/src/csv.js';

const MIGRATION = 'm375';
const NP = 'Not published';
const t = openTables();
const rows = readCsv(new URL('../../docs/audits/2026-10-05-check-round-3/leftovers/partial-rows.csv', import.meta.url).pathname).records.map((r) => r.values);
let cells = 0;

for (const r of rows) {
  const qidi = /^R-QIDI-FILAMENT-GUIDE$/.test(r.SourceID) && r.Column === 'Drying';
  const polish = /^S-SPECTRUM-pl-/.test(r.SourceID) && (r.Column === 'Enclosure' || r.Column === 'Hardened nozzle');
  if (!qidi && !polish) continue;
  const column = r.Column === 'Hardened nozzle' ? 'Abrasion / clogging' : r.Column;
  const p = t.get('profiles', r.Record);
  if (p[column] === r.PagePrints) continue;
  // The QIDI row held its answer alone; a Polish profile held nothing.
  const expect = qidi ? p[column] : NP;
  if (qidi && !/^(Required|Optional)$/.test(expect)) throw new Error(`${MIGRATION}: ${r.Record}'s Drying holds "${expect}", not the guide's answer alone`);
  for (const q of r.Quote.split(' | ').filter(Boolean)) onCachedSheet(t, p.SourceID, q, MIGRATION);
  t.set('profiles', r.Record, column, r.PagePrints, { expect, migration: MIGRATION });
  retype(t, r.Record, [column], MIGRATION);
  const after = t.get('profiles', r.Record);
  t.set('profiles', r.Record, 'Locator', `${after.Locator}; ${column} read with its row whole (${MIGRATION})`, { expect: after.Locator, migration: MIGRATION });
  cells++;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} profile cell(s) read with their row whole (QIDI's drying schedules, Spectrum's Polish chamber and nozzle answers)`);
