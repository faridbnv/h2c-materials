#!/usr/bin/env node
// Migration m450 (2026-10-18): two rows of conversions.csv say that a product's own stiffness or strength measured on a
// moulded bar, or on one its sheet does not describe, bounds its printed part from above (the screening build's stage 4,
// the screening review's change C28, D160). A moulded bar is stiffer and stronger than a printed one: the estimate
// model's documented moulded conversions put a printed bar at about 0.86 of it (ln −0.15, CV16's neighbours), so the
// printed part is at most 1/0.86 = 1.16 times such a value. The rows are reported: the ledger lists what they would bound
// and decides nothing. The estimate model reads them as ceilings on a grade's range (estimate-model.json ownCeiling),
// one relation in one place (D157). Elongation has no such row: one product's undescribed stretch runs from a third to
// seventeen times its printed one.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m450-own-value-ceilings.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm450';
const NA = 'Not applicable';
const t = openTables();
let changed = 0;
const ROWS = [
  { target: 'tensileModulusXY', property: 'Tensile modulus', words: 'its modulus on a moulded bar or one its sheet does not describe' },
  { target: 'tensileStrengthXY', property: 'Tensile strength (endpoint unspecified)', words: 'its tensile strength on a moulded bar or one its sheet does not describe' },
];
for (const r of ROWS) {
  const held = t.rows('conversions').find((x) => x['Target headline'] === r.target && x.Kind === 'demote-to-ceiling');
  const row = {
    'Target headline': r.target, 'Source properties': r.property, 'Source load MPa': NA, 'Source direction': 'same', 'Source state': 'same',
    'Source specimen': 'moulded or not stated', Kind: 'demote-to-ceiling', 'Factor low': NA, 'Factor high': '1.16', 'Absolute offset': '0',
    'Applies to': '', 'Physical relation': NA, Status: 'reported', 'Estimate kind': NA, 'Estimate offset': NA, 'Estimate sd': NA,
    'Estimate learns': NA, 'Estimate note': NA, 'Reason words': r.words, SourceID: NA,
    Basis: `A moulded bar is stiffer and stronger than a printed one, and a bar its sheet does not describe reads like a moulded one (D84, D159): the estimate model's documented moulded conversion puts a printed bar at about 0.86 of it, so the printed part's ${r.property.toLowerCase()} is at most 1/0.86 = 1.16 times such a value of the same product. Reported: the estimate model reads it as a ceiling on the product's own estimate (D160); the ledger decides nothing by it.`,
  };
  if (held) {
    for (const [k, v] of Object.entries(row)) if ((held[k] ?? '') !== v) throw new Error(`${MIGRATION}: ${held.ConversionID} ${k} is ${held[k]}; the data moved`);
    continue;
  }
  t.append('conversions', { ConversionID: t.nextId('conversions'), ...row });
  changed++;
}
t.save();
console.log(`${MIGRATION}: ${changed} change(s)`);
