#!/usr/bin/env node
// Migration m390 (2026-10-06): the products their makers sell as toughened leave the impact medians (D133, policy B).
//
// The owner chose to name the toughened products first (m386, the median over every product) and to set them apart from
// the impact numbers once the marks were checked for products they missed. The check is done: a random draw of 20
// unmarked products that publish an impact value found one claim the marks missed (colorFabb PET HIGH SPEED PRO, added by
// m389), within the one in twenty the plan allowed (docs/audits/2026-10-06-impact-round/blind-draw/RESULT.md). So the
// two impact headlines' "Sold as toughened" goes from named to set apart: a material's notched Charpy and notched Izod
// median, range and middle half are its other products', and the toughened ones are listed apart, as special
// formulations are, unless every comparable value is theirs. No verdict reads a material's median; nothing else moves.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m390-toughened-products-set-apart-from-impact-medians.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm390';
const t = openTables();
let changed = 0;
for (const key of ['charpyNotched', 'izodNotched']) {
  const row = t.get('headline_definitions', key);
  if (row['Sold as toughened'] === 'set apart') continue;
  t.set('headline_definitions', key, 'Sold as toughened', 'set apart', { expect: 'named', migration: MIGRATION });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} headline(s) set the products sold as toughened apart`);
