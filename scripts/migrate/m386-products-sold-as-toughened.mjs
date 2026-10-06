#!/usr/bin/env node
// Migration m386 (2026-10-06): the products their makers sell as toughened or impact-modified, from statements already
// held (D133).
//
// PLA's notched Charpy median is 13.5 kJ/m² over 16 products, and its range runs to 72.3; most plain PLAs publish 5 to
// 8. The owner asked that a reader not take a few toughened products' values for every product's. So a material's
// spread now names them, and the drawer says what the others give:
//
//   Sold as toughened    a new column of headline_definitions.csv: "named" on the two impact headlines, whose spread
//                        then says how many of its values are from such products and what the rest give, and keeps
//                        them in the median; Not applicable on every other row.
//   product_claims.csv   a row per product whose maker's own statement, already recorded, meets the rule in
//                        schema/vocab/product-claims.csv. Each was judged on its words by Claude Opus (the reason
//                        names the part of the rule it meets); a product's name was never enough. 345 held statements
//                        speak of toughness or impact; these are the ones, on products that publish an impact value,
//                        that present the product as a tougher form of its polymer. The rest of the 258 products are
//                        the claims round's (GOALS, 2026-10-06, later).
//
// Each statement is checked on its cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m386-products-sold-as-toughened.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm386';
const NA = 'Not applicable';
const CLAIM = 'Toughened or impact-modified';
const REVIEWED = 'Claude Opus 5.5, 2026-10-06, on the statement\'s words (m386)';
const t = openTables();

// [product, statement, the words that make the claim, the part of the rule they meet]
const CLAIMS = [
  ['G006-01', 'Q05757', 'Engineered for real-world impact', 'designed for impact: "Engineered for real-world impact", with toughness "on par with ABS"'],
  ['G001-06', 'Q00577', 'improved strength properties in terms of impact', 'more impact resistance than the standard form: "improved strength properties in terms of impact … compared to elements made of classic PLA"'],
  ['G001-20', 'Q00976', 'is a tough PLA', 'called a tough grade of its polymer: "PolySonic PLA PRO is a tough PLA"'],
  ['G027-08', 'Q02147', 'enhanced heat resistance, strength, and impact resistance', 'more impact resistance than its maker\'s standard grade: "enhanced … impact resistance, ABS Pro is the ideal upgrade"'],
  ['G001-23', 'Q00985', 'extra toughness', 'more toughness than the standard form: organic material "than ordinary PLA which brings … extra toughness"'],
  ['G001-24', 'Q00990', 'impact resistance significantly higher than regular PLA', 'more impact resistance than the standard form: "impact resistance significantly higher than regular PLA"'],
  ['G001-29', 'Q00995', 'is a tough PLA', 'called a tough grade of its polymer: "HT-PLA Pro is a tough PLA engineered for functional parts"'],
  ['G001-30', 'Q00998', 'Engineered for high impact resistance', 'designed for impact: "Engineered for high impact resistance"'],
  ['G001-59', 'Q01088', 'impact modified to improve toughness', 'impact-modified: "impact modified to improve toughness"'],
  ['G001-62', 'Q01090', 'enhanced toughness', 'more toughness than the standard form: "delivers … enhanced toughness"'],
  ['G026-05', 'Q02086', 'improved toughness', 'more toughness than the standard form: "offers electrostatic discharge (ESD) safety with improved toughness"'],
  ['G113-02', 'Q04753', 'greatly improves the impact and damage resistance', 'names what toughens it: aramid fibre that "greatly improves the impact and damage resistance"'],
  ['G001-126', 'Q00701', 'Due to its impact modification', 'impact-modified: "Due to its impact modification PLAx offers increased tear and break resistance"'],
  ['G019-04', 'Q01734', 'Due to its impact modification', 'impact-modified: "Due to its impact modification PLAx GF offers increased tear and break resistance"'],
  ['G018-16', 'Q01713', 'Due to its impact modification', 'impact-modified: "Due to its impact modification PLAx CF offers increased tear and break resistance"'],
  ['G001-143', 'Q00780', 'High-toughness PLA', 'called a tough grade of its polymer: "High-toughness PLA"'],
  ['G145-01', 'Q04888', 'tougher and less brittle material than the generic PLA grades', 'names what toughens it and compares with the standard form: "tougher and less brittle … than the generic PLA grades, thanks to the addition of" PHA'],
  ['G001-161', 'Q00860', 'roughly 750% more impact resistant than regular PLA', 'more impact resistance than the standard form: "roughly 750% more impact resistant than regular PLA filaments"'],
  ['G027-45', 'Q02290', 'even more impact resistant', 'impact-modified: "modified ABS … reinforced with … Styrene Maleic Anhydride and PolyCarbonate – resulting in an incredibly strong and even more impact resistant filament"'],
];

let changed = 0;
const TABLE = 'headline_definitions';
const COLUMN = 'Sold as toughened';
if (!t.header(TABLE).includes(COLUMN)) {
  t.addColumn(TABLE, COLUMN, { after: 'Drawer comparison', fill: () => NA });
  changed++;
}
for (const key of ['charpyNotched', 'izodNotched']) {
  if (t.get(TABLE, key)[COLUMN] === 'named') continue;
  t.set(TABLE, key, COLUMN, 'named', { expect: NA, migration: MIGRATION });
  changed++;
}

const held = new Set(t.rows('product_claims').map((r) => `${r.GradeID} | ${r.Claim}`));
for (const [gradeId, evidenceId, words, reason] of CLAIMS) {
  const e = t.get('evidence', evidenceId);
  if (e.GradeID !== gradeId || !e.Finding.includes(words)) throw new Error(`${MIGRATION}: ${evidenceId} is not ${gradeId}'s statement "${words}"; the data moved`);
  if (held.has(`${gradeId} | ${CLAIM}`)) {
    const row = t.rows('product_claims').find((r) => r.GradeID === gradeId && r.Claim === CLAIM);
    if (row.EvidenceID !== evidenceId) throw new Error(`${MIGRATION}: ${gradeId}'s claim points at ${row.EvidenceID}, not ${evidenceId}; the data moved`);
    continue;
  }
  onCachedSheet(t, e.SourceID, words, MIGRATION);
  t.append('product_claims', { GradeID: gradeId, Claim: CLAIM, EvidenceID: evidenceId, Reason: `${reason}.`, 'Reviewed by': REVIEWED });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} change(s): ${COLUMN} named on the two impact headlines; ${CLAIMS.length} products sold as toughened`);
