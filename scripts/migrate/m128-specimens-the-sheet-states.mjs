#!/usr/bin/env node
// Migration m128 (2026-09-21): specimens the sheet states once for its whole table (PLAN-REMAINING 2.3).
//
// The sweep's reading found values recorded "Not published (do not assume printed)" on sheets that say, once and
// away from the table, how every test bar was made. The reader looks for such a sentence (propose.mjs,
// printedSpecimens) but knew none of these wordings. Counted across the table, by the sentence each sheet prints:
//
//   printed  Flashforge   "Testing Specimen Printing Conditions: Test Equipment Guider IIs ... Infill Density 100%"
//            Polymaker    "HOW TO MAKE SPECIMENS  Printing temperature 270 °C ... Infill 100%"
//            QIDI, iSANMATE "Specimens printed under the following conditions: Nozzle size 0.4mm ..."
//            eSUN         "The performance of the filament is evaluated based on standard samples printed by eSUN"
//            SUNLU        "[1] Test the spline printing speed 45 mm/s, print temperature 210 ℃, Fill 100%"
//            Eryone       "Part III: Mechanical Properties of Printed Samples"
//   moulded  eSUN         "The physical properties, mechanical properties, thermal properties ... are obtained based
//                          on the injection molding spline test."
//            Nobufil      a table headed "FDM H | Injection" whose single-valued rows stand in the Injection column
//                          (read on the page images of three of the thirteen; the layout is one template)
//
// A statement covers the bars a test is made on: the mechanical tests and, where the sentence speaks of all the
// sheet's specimens, heat deflection and Vicat. SUNLU's footnote and Eryone's heading speak of the mechanical table
// only. Density, melt flow, the DSC temperatures and water uptake are not measured on the bar the sentence describes
// and keep their state. A sheet that also speaks of the other kind of specimen is left alone and listed.
//
// A moulded value stays evidence and stops standing for a printed part (D55): it bounds nothing and backs no headline.
//
//   node scripts/migrate/m128-specimens-the-sheet-states.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm128-specimens-the-sheet-states';
const date = '2026-09-21';
const t = openTables();

const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);
const PRINTED = 'Printed specimen';
const MOULDED = 'Raw material value';

const STATEMENTS = [
  { maker: /Flashforge/i, re: /Testing Specimen Printing Conditions/i, to: PRINTED, scope: BARS },
  { maker: /Polymaker/i, re: /HOW TO MAKE SPECIMENS/, to: PRINTED, scope: BARS },
  { maker: /QIDI|iSANMATE/i, re: /Specimens printed under the following conditions/i, to: PRINTED, scope: BARS },
  { maker: /eSUN/i, re: /evaluated based on standard samples printed by eSUN/i, to: PRINTED, scope: BARS },
  { maker: /SUNLU/i, re: /Test the spline printing/i, to: PRINTED, scope: MECHANICAL },
  { maker: /Eryone/i, re: /Mechanical Properties of Printed Samples/i, to: PRINTED, scope: MECHANICAL },
  { maker: /eSUN/i, re: /injection molding spline test/i, to: MOULDED, scope: BARS },
  { maker: /3DJake|Nobufil/i, re: /^Properties FDM H Injection Method$/m, to: MOULDED, scope: BARS, singleValued: true },
];
const OTHER = { [PRINTED]: /injection[- ]?mou?ld|mou?lded (?:bar|specimen|sample|spline)/i, [MOULDED]: /printed (?:specimen|sample|bar)s?\b|samples printed by/i };

const bySource = new Map();
for (const m of t.rows('measurements')) {
  if (!bySource.has(m.SourceID)) bySource.set(m.SourceID, []);
  bySource.get(m.SourceID).push(m);
}
let changed = 0;
const tally = new Map();
const skipped = [];
for (const s of t.rows('sources')) {
  const rows = bySource.get(s.SourceID);
  if (!rows || !/^[0-9a-f]{64}$/.test(s.SHA256 ?? '')) continue;
  let lines;
  try { lines = cachedText(s.SHA256).pages.flatMap((p) => p.lines.map((l) => (typeof l === 'string' ? l : l.text))); } catch { continue; }
  const text = lines.join('\n');
  const said = STATEMENTS.filter((st) => st.maker.test(s.Publisher) && st.re.test(text));
  if (!said.length) continue;
  // eSUN's PEBA 90A prints a second table headed "Printing Performance" with its own XY and Z values: the sentence
  // then settles that table, not the first, and the sheet is left alone like one that names both kinds of bar.
  if (new Set(said.map((st) => st.to)).size > 1 || OTHER[said[0].to].test(text.replace(said[0].re, '')) || /^Printing Performance\b/m.test(text)) { skipped.push(s.SourceID); continue; }
  const st = said[0];
  const sentence = (lines.find((l) => st.re.test(l)) ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  for (const m of rows) {
    if (!/^Not published( \(do not assume printed\))?$/.test(m['Specimen type']) || !/^Published value/.test(m['Data status']) || !st.scope.has(m.Property)) continue;
    // Nobufil's two-column rows (FDM H and Injection) were never read as one value; a single-valued row is the
    // Injection column's, and only such a row is moved.
    if (st.singleValued) {
      const label = m.Locator.replace(/^p\. ?\d+: ?/, '').trim();
      const line = lines.find((l) => l.startsWith(label));
      if (!line || (line.replace(label, '').match(/\d+(?:[.,]\d+)?/g) ?? []).filter((x) => !/^(75|178|527|180|1183)$/.test(x)).length !== 1) continue;
    }
    const note = st.to === PRINTED
      ? `the sheet states how its test bars were made, once for the table: "${sentence.slice(0, 160)}".`
      : st.singleValued
        ? 'the table is headed "Properties FDM H Injection Method", and this row\'s one value stands in the Injection column (page image): an injection-moulded bar.'
        : 'the sheet states once for its table that its physical, mechanical and thermal values are "obtained based on the injection molding spline test": injection-moulded bars.';
    const n = correct(t, { source: s.SourceID, ids: [m.MeasurementID], migration, date, set: { 'Specimen type': [m['Specimen type'], st.to] }, note });
    changed += n;
    const k = `${s.Publisher} → ${st.to}`;
    tally.set(k, (tally.get(k) ?? 0) + n);
  }
}
// A headline that selected a value now known to be a moulded bar's keeps it as context (D55): it stays cited beside
// the headline and stops being the headline.
const moulded = new Set(t.rows('measurements').filter((m) => m['Specimen type'] === MOULDED).map((m) => m.MeasurementID));
for (const h of t.rows('headlines').filter((h) => h.Use === 'value' && moulded.has(h.MeasurementID))) {
  t.update('headlines', { MaterialID: h.MaterialID, HeadlineKey: h.HeadlineKey, MeasurementID: h.MeasurementID }, 'Use', 'context', { expect: 'value' });
  console.log(`  ${h.MaterialID} ${h.HeadlineKey}: ${h.MeasurementID} is a moulded bar's; now context`);
  changed++;
}

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
if (skipped.length) console.log(`  left alone (the sheet also speaks of the other kind of bar, or prints a table of its own printed values): ${skipped.join(', ')}`);
console.log(`${migration}: ${changed} row(s) given the specimen their sheet states`);
