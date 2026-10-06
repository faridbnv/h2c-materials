#!/usr/bin/env node
// What of the impact round's proposals Claude Opus accepted, and why the rest is held (D133). The proposal tool gates on
// the page (text, reading order, second reading); this is the review it leaves to a person: rows it cannot see are wrong.
//
//   node docs/audits/2026-10-06-impact-round/curate.mjs     proposals/ -> applied/ (what m388 applies) and opus-held.csv
//
// Held, with the reason written beside each row:
//   - every values-set row: each paired a held row with another row of its page (a held Z value with the page's XY one,
//     a notched value with the unnotched one, a 23 °C value with the -30 °C one); none corrects what it names.
//   - a maker's product page that compares products in columns (Bambu Lab's "Toughness (Impact Strength - XY)" tables):
//     every column's value was given to the page's own product; the data sheets hold each product's own.
//   - rows of one source, product, property, notch, direction, temperature, moisture and treatment with different values:
//     the page separates them by a column the reading did not capture (QIDI's three columns, Stratasys' slice heights,
//     DuPont's resin grades and states); recorded as they are, they would be one product's contradictory values.
//   - page statements that speak for every property ("all"): they would move values other than impact ones, which is
//     not this round's; only those for the impact table are applied.
//   - a handful held one by one on review (ONE_BY_ONE): a sheet given to another product, a cell whose number or unit
//     is not settled, moulded resin-guide data, and one comparison page.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../../../build/src/csv.js';

const here = dirname(fileURLToPath(import.meta.url));
const rows = (name) => readCsv(join(here, 'proposals', name)).records.map((r) => r.values);
const header = (name) => readFileSync(join(here, 'proposals', name), 'utf8').split('\n')[0].split(',');
const held = [];
const hold = (file, r, reason) => held.push({ file, source: r.SourceID ?? r.source ?? '', product: r.GradeID ?? r.id ?? '', value: r['Raw value'] ?? r.value ?? r.Statement ?? '', reason });

const COMPARISON_PAGE = /^R-BAMBU-(PRIORITY|PLA-TOUGH)-/;
const key = (x) => [x.SourceID, x.GradeID, x.Property, x.Notch, x.Direction, x['Test temperature °C'], x['Moisture state'], x['Post-processing state'], x['Specimen type'], x['Normalized unit']].join('|');
const add = rows('values-add.csv');
const values = new Map();
for (const x of add) values.set(key(x), new Set([...(values.get(key(x)) ?? []), x['Normalized value']]));
// Held one by one on review (Claude Opus, 2026-10-06), each for the reason beside it.
const ONE_BY_ONE = [
  [(x) => x.SourceID === 'S-PET-formfutura-tds-athenax', 'FormFutura AthenaX\'s sheet given to 3D-Fuel Pro PCTG, and its cell prints "93°C KJ/m2": neither the product nor the unit is settled'],
  [(x) => x.GradeID === 'G097-05' && /7 C/.test(x['Raw value']), 'a Charpy row citing ASTM 256 (an Izod method) with "7 C" for a value: the test and the number are not settled'],
  [(x) => /-R\d+$/.test(x.GradeID) && x['Specimen type'] !== 'Printed specimen', 'a resin supplier\'s reference grade read from its guide: moulded data whose specimen the reading did not record'],
  [(x) => /^(G071-01|G069-01)$/.test(x.GradeID) && /Layer Adhesion/.test(x.quote), 'IPCON\'s page compares products in columns (5.4, 4.8, 4.6 ...), and its first column was given to two products'],
  // Found by the context audit (npm run audit:context) on the first apply, and held:
  [(x) => /ASTM\s?D\s?256/.test(x['Standard / load']) && /ISO\s?179/.test(x['Standard / load']), 'the row names ASTM D256 (Izod) beside ISO 179 (Charpy): older Polymaker sheets, whose test is not settled; a held test refuses it as a guessed Charpy or Izod value'],
  [(x) => x.SourceID === 'S-PVB-technisches-datenblatt-2' && /\( ?30\s?°C\)/.test(x.quote), 'the line prints "( 30°C)", a -30 °C row whose sign the text lost; recorded without it, a cold bar would read as a room-temperature one'],
  [(x) => /^R-POLYMAKER-PRIORITY-20261003-(46df2b78af77|540bc284ede5|aa05f44c1437|effcc17a7754)$/.test(x.SourceID), 'the page tells the reader to anneal and moisture-condition after printing, and its table does not say which state its bars were in'],
];
const kept = add.filter((x) => {
  const one = ONE_BY_ONE.find(([test]) => test(x));
  if (one) return hold('values-add', x, one[1]), false;
  if (COMPARISON_PAGE.test(x.SourceID)) return hold('values-add', x, 'a product page comparing products in columns: each column was given to the page\'s product'), false;
  if (values.get(key(x)).size > 1) return hold('values-add', x, 'the page separates these values by a column the reading did not capture; recorded alike they would contradict'), false;
  return true;
});
for (const x of rows('values-set.csv')) hold('values-set', x, 'paired the held row with another row of its page (another direction, notch or temperature)');
const context = rows('page-context-add.csv').filter((x) => x['Applies to'] === 'impact' || (hold('page-context-add', x, 'speaks for every property: not this round\'s'), false));

mkdirSync(join(here, 'applied'), { recursive: true });
writeFileSync(join(here, 'applied', 'values-add.csv'), csvText(header('values-add.csv'), kept));
writeFileSync(join(here, 'applied', 'page-context-add.csv'), csvText(header('page-context-add.csv'), context));
writeFileSync(join(here, 'opus-held.csv'), csvText(['file', 'source', 'product', 'value', 'reason'], held));
console.log(`applied: ${kept.length} values, ${context.length} page statements; held by review: ${held.length}`);
