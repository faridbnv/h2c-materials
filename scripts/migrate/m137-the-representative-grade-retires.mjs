#!/usr/bin/env node
// Migration m137 (2026-09-25): the representative grade and its hand picks retire (re-center phase 4; D83).
//
// Until phase 3 a material's numbers were one product's: materials.csv named a "Representative grade", and
// headlines.csv picked one of its measurements per headline (477 value rows), with 16 more rows citing a measurement
// "for" a headline without being its value. Since phase 1 the build chooses every product's value by rule from its own
// measurements (build/src/products.js); on 2026-09-25 the rule chose the same measurement as all 477 picks
// (docs/audits/2026-09-25-re-center/rule-vs-hand-picks.md). Since phase 2 the engine judges the products, and since this
// phase a material's headline is its products' spread, derived by the build. Nothing reads the column or the rows.
//
// So the column goes, and every headlines.csv row with it, each archived first, word for word, in
// docs/audits/2026-09-25-re-center/retired-representative-picks.csv, and each removal named in
// data/review/removed-records.csv (D72). headlines.csv stays, as the place to pin one product's value where the rule
// chooses wrongly: a row names the material, the headline and the measurement, and now says why (Reason). Its Use column
// goes: a pin is a value by definition, and a citation that is not a value is the drawer's related evidence, which the
// build derives. The Method rules that described the old shape are rewritten to the new one.
//
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m137-the-representative-grade-retires.mjs

import { writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';

const migration = 'm137-the-representative-grade-retires';
const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const archive = 'docs/audits/2026-09-25-re-center/retired-representative-picks.csv';
const t = openTables();

const materialsHave = t.header('materials').includes('Representative grade');
const headlinesHaveUse = t.header('headlines').includes('Use');
if (!materialsHave && !headlinesHaveUse && !t.rows('headlines').length) {
  console.log(`${migration}: already applied`);
  process.exit(0);
}
if (!materialsHave || !headlinesHaveUse) throw new Error(`${migration}: half applied (materials column ${materialsHave}, headlines Use ${headlinesHaveUse}); the data moved since this was written`);

// ------------------------------------------------------------------------------------------------ the archive
// One row per material and headline row, as they stood: the material's representative grade beside each pick, and a
// material with no pick at all still recorded with its grade, so the archive holds the whole of the old selection.
const nameOf = new Map(t.rows('materials').map((m) => [m.MaterialID, m['Original name']]));
const repOf = new Map(t.rows('materials').map((m) => [m.MaterialID, m['Representative grade']]));
const rows = [];
const picked = new Set();
for (const h of t.rows('headlines')) {
  picked.add(h.MaterialID);
  rows.push({ MaterialID: h.MaterialID, Material: nameOf.get(h.MaterialID), 'Representative grade': repOf.get(h.MaterialID), HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID, Use: h.Use });
}
for (const m of t.rows('materials')) {
  if (!picked.has(m.MaterialID)) rows.push({ MaterialID: m.MaterialID, Material: m['Original name'], 'Representative grade': m['Representative grade'], HeadlineKey: '', MeasurementID: '', Use: '' });
}
rows.sort((a, b) => a.MaterialID.localeCompare(b.MaterialID) || a.HeadlineKey.localeCompare(b.HeadlineKey) || a.Use.localeCompare(b.Use) || a.MeasurementID.localeCompare(b.MeasurementID));
const header = ['MaterialID', 'Material', 'Representative grade', 'HeadlineKey', 'MeasurementID', 'Use'];
if (existsSync(join(root, archive))) throw new Error(`${migration}: ${archive} exists but the data is not yet migrated; remove it or finish the migration by hand`);
writeFileSync(join(root, archive), csvText(header, rows));

// ------------------------------------------------------------------------------------------------ the data
const where = `${archive}; the build chooses each product's value by rule (build/src/products.js) and a material's headline is its products' spread (D83)`;
for (const h of [...t.rows('headlines')]) {
  t.removeWhere('headlines', { MaterialID: h.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID }, { migration, where });
}
t.dropColumn('headlines', 'Use');
t.addColumn('headlines', 'Reason');
t.dropColumn('materials', 'Representative grade');

const method = (topic, before, after) => t.set('method', topic, 'Definition / rule', after, { expect: before });
method('Headlines',
  'Materials shows labelled single-grade observations with measurement IDs, not cross-grade family ranges. This avoids mixing incompatible standards, moisture states, preparation, geometry, load and orientation.',
  'A material is shown as the spread of its products (D83): each number is the median of its products\' comparable values, with their range, how many there are, and the product nearest the median named as typical. A comparable value is a printed or unstated specimen, in the headline\'s direction, dry or unstated, at the headline\'s load; values whose source leaves the direction or the load unstated are counted apart (as published, D84), and so are declared variants. Only comparable values form a range, so incompatible standards, moisture states, preparation, load and orientation never mix. A material passes a requirement when one of its products meets every requirement at once.');
method('Headline basis',
  'A headline is a single-grade observation on the material\'s representative grade, never a polymer-family range. A family entry has no values of its own and points at its members; a material with no representative grade has insufficient comparable data.',
  'A material\'s headline is derived from its products, never chosen: each product\'s value is the one its own measurements give by rule (build/src/products.js: comparable before as published, printed before unstated, as printed before annealed, dry before unstated, its own data sheet first), and headlines.csv pins a product\'s value, with its reason, only where the rule chooses wrongly. A family entry has no values of its own and points at its members; a material none of whose products publishes a comparable value has insufficient comparable data.');
const estimates = t.get('method', 'Estimates')['Definition / rule'];
method('Estimates', estimates, estimates
  .replace('A missing headline may carry an estimate, always shown as an estimate.', 'A headline none of a material\'s products publishes comparably may carry an estimate, always shown as an estimate; it stands in for each of those products, and with several products it is any one of them, so it carries the spread between products.')
  .replace('takes every observation in the snapshot: measured headlines, a material\'s related measurements', 'takes every observation in the snapshot: products\' values, their related measurements')
  .replace('are calibrated by hiding each measured headline and predicting it back.', 'are calibrated by hiding each material\'s typical product\'s value and predicting it back.')
  .replace('Heat deflection of an elastomer, and any value of a support product, is not applicable unless its own sources publish one.', 'Heat deflection does not apply to an elastomer (headline_definitions.csv Applies to): a value its own sheet publishes stays that sheet\'s measurement and never decides. Any value of a support product is not applicable unless its own sources publish one.'));

const changes = t.save();
console.log(`${migration}: ${rows.length} archived row(s) in ${archive}; ${changes.filter((c) => c.action === 'Removed' && c.record !== '(column)').length} headline row(s) removed; ${changes.filter((c) => c.action === 'Edited').length} Method rule(s) rewritten`);
