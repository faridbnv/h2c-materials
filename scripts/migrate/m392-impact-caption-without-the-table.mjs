#!/usr/bin/env node
// Migration m392 (2026-10-07): the impact caption no longer points at a product table (D133).
//
// The owner found that the drawer's product-by-product impact table repeated the Charpy, Izod and test-unclear lists
// under it, and asked for the dot rows, the median table and the three lists alone. The caption m385 wrote above the
// rows said that Izod in J/m "is listed in the table, not drawn"; it is listed with the results under the rows now.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m392-impact-caption-without-the-table.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm392';
const TOPIC = 'Impact tests';
const WAS = 'it is listed in the table, not drawn.';
const NOW = 'it is listed with the results below, not drawn.';
const t = openTables();

const row = t.find('method', TOPIC);
const rule = row?.['Definition / rule'] ?? '';
if (!rule.endsWith(NOW)) {
  if (!rule.endsWith(WAS)) throw new Error(`${MIGRATION}: method ${TOPIC} does not end "${WAS}"; the data moved`);
  t.set('method', TOPIC, 'Definition / rule', rule.slice(0, -WAS.length) + NOW, { expect: rule, migration: MIGRATION });
  t.save();
  console.log(`${MIGRATION}: the Impact tests caption names the results below, not a table`);
} else console.log(`${MIGRATION}: nothing to do`);
