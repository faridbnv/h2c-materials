#!/usr/bin/env node
// Migration m133 (2026-09-21): two more sheets that state their printed specimens once, and a declared foamed PLA.
//
// m128 counted the wordings the sweep's first reading turned up; two more are in the sweep's notes:
//
//   NinjaTek   "All printed specimens were created using the TAZ5 printer 0.75mm nozzle." (NinjaFlex, Cheetah,
//              Armadillo)
//   Markforged "Plastic test plaques are printed with full infill." (Precise PLA)
//
// Their mechanical tests and heat deflection take "Printed specimen", as m128's did. And eSUN's Wood filament says
// it "utilize[s] active foaming technology to achieve like-wood appearance with low-density PLA of 0.7g/cm3": a
// declared foaming agent, which is a lightweight additive (D57), so its 0.7 g/cm³ stays its own.
//
//   node scripts/migrate/m133-two-more-printed-statements.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm133-two-more-printed-statements';
const date = '2026-09-21';
const t = openTables();
const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);
let changed = 0;

for (const [sourceId, sentence] of [
  ['R-NINJATEK-NinjaFlex-TDS', 'All printed specimens were created using the TAZ5 printer 0.75mm nozzle.'],
  ['R-NINJATEK-Cheetah-TDS', 'All printed specimens were created using the TAZ5 printer 0.75mm nozzle.'],
  ['R-NINJATEK-Armadillo-TDS', 'All printed specimens were created using the TAZ5 printer 0.75mm nozzle.'],
  ['R-MARKFORGED-Precise-PLA-TDS-REV-3-11-22', 'Plastic test plaques are printed with full infill.'],
]) {
  const s = t.get('sources', sourceId);
  const text = cachedText(s.SHA256).pages.flatMap((p) => p.lines.map((l) => (typeof l === 'string' ? l : l.text))).join(' ').replace(/\s+/g, ' ');
  if (!text.includes(sentence)) throw new Error(`${migration}: ${sourceId} does not print "${sentence}"`);
  for (const m of t.rows('measurements').filter((x) => x.SourceID === sourceId)) {
    if (!BARS.has(m.Property) || !/^Not published( \(do not assume printed\))?$/.test(m['Specimen type']) || !/^Published value/.test(m['Data status'])) continue;
    changed += correct(t, { source: sourceId, ids: [m.MeasurementID], migration, date, set: { 'Specimen type': [m['Specimen type'], 'Printed specimen'] },
      note: `the sheet states how its test bars were made, once for the table: "${sentence}"` });
  }
}

const wood = t.get('grades', 'G014-12');
if (wood.Variant !== 'lightweight additive') {
  if (wood['Product name'] !== 'Wood' || wood.Manufacturer !== 'eSUN') throw new Error(`${migration}: G014-12 is ${wood.Manufacturer} ${wood['Product name']}`);
  t.set('grades', 'G014-12', 'Variant', 'lightweight additive', { expect: 'Not applicable' });
  t.set('grades', 'G014-12', 'Composition / filler', 'The sheet declares it: "It utilize active foaming technology to achieve like-wood appearance with low-density PLA of 0.7g /cm3". A foaming agent; recorded as a Variant under D57 (m133).', { expect: wood['Composition / filler'] });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} record(s) changed`);
