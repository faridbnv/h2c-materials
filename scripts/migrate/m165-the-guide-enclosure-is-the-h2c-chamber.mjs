#!/usr/bin/env node
// Migration m165 (2026-09-26): where Bambu Lab's Filament Guide asks for an enclosure, the H2C's chamber meets it (D90;
// the owner's decision 1 of 2026-09-26, docs/GOALS.md).
//
// The guide (R-BAMBU-GUIDE-202609, read by m150) answers "Print with Enclosure" for each of its types and gives no chamber
// temperature. For nine types it draws a tick, which its January 2025 revision prints as "Required": ABS, ABS-GF, ASA,
// PC, PAHT-CF, PA6-CF, PA6-GF, PPA-CF and PPS-CF. Until now a product whose own sheet (and twin's) is silent read that
// tick and stayed unknown on the chamber, because an enclosure is not proof that 65 °C is enough. The owner ruled that
// for these types it is: the guide is written for Bambu Lab's own enclosed printers (its drying rows name the X1 Series),
// and the H2C is one, with a heated, enclosed chamber to 65 °C. A maker's own chamber statement still wins, stricter or
// looser (products.js reads the guide only where a product's own sheet and its twin's say nothing on the chamber).
//
// The ruling is data: each of the nine rows declares its chamber "enclosed" (schema/vocab/process-states.csv), which the
// gate reads as within the H2C, and says why in Parse review. The raw Chamber °C stays "Not published": the guide prints
// no chamber row. Only a guide row that asks for an enclosure may declare it (PROCESS-ENCLOSED).
//
// The reviewer is an agent, claude-opus-5.5 (agent reviewer); no person has reviewed it. A re-run is a no-op, and a run
// after the data moved stops.
//
//   node scripts/migrate/m165-the-guide-enclosure-is-the-h2c-chamber.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm165-the-guide-enclosure-is-the-h2c-chamber';
const GUIDE = 'R-BAMBU-GUIDE-202609';
const TYPES = ['ABS', 'ABS-GF', 'ASA', 'PC', 'PAHT-CF', 'PA6-CF', 'PA6-GF', 'PPA-CF', 'PPS-CF'];
const NA = 'Not applicable';
const REVIEW = 'Chamber state enclosed and requirement required are the owner\'s ruling of 2026-09-26 (D90, m165), not a '
  + 'reading of a chamber row, which the guide does not print: it asks to print with an enclosure (the drawn tick; its '
  + 'January 2025 revision prints Required) on Bambu Lab\'s own enclosed printers (its drying rows name the X1 Series), '
  + 'and the H2C\'s heated chamber, to 65 °C, is that enclosure. The other typed columns are the parsers\' reading.';

const t = openTables();

// The rows that ask for an enclosure are exactly the nine the owner named: a tenth, or one fewer, is a guide this
// ruling did not see.
const asking = t.rows('print_guide').filter((r) => r.SourceID === GUIDE && r['Enclosure state'] === 'recommended');
const names = asking.map((r) => r['Guide type']).sort();
if (names.join() !== [...TYPES].sort().join()) throw new Error(`${migration}: the guide asks for an enclosure for ${names.join(', ')}, not the nine types the owner ruled on; the data moved`);

let n = 0;
for (const r of asking) {
  const id = r.PrintGuideID;
  if (r.Enclosure !== '✓') throw new Error(`${migration}: ${id} Enclosure is "${r.Enclosure}", not the guide's tick`);
  if (!/X1 Series/.test(r.Drying)) throw new Error(`${migration}: ${id}'s drying row does not name Bambu Lab's X1 Series`);
  if (r['Chamber °C'] !== 'Not published') throw new Error(`${migration}: ${id} now prints a chamber temperature ("${r['Chamber °C']}"); a stated temperature decides, not this ruling`);
  if (r['Chamber state'] === 'enclosed' && r['Parse review'] === REVIEW) continue;
  t.set('print_guide', id, 'Chamber state', 'enclosed', { expect: 'unknown' });
  t.set('print_guide', id, 'Chamber requirement', 'required', { expect: 'unknown' });
  for (const c of ['Chamber min °C', 'Chamber max °C']) if (r[c] !== NA) throw new Error(`${migration}: ${id} ${c} is "${r[c]}"`);
  t.set('print_guide', id, 'Parse review', REVIEW, { expect: NA });
  n++;
}

if (n) t.save();
console.log(`${migration}: ${n} guide row(s) declare the H2C's chamber (${asking.length} ask for an enclosure)`);
