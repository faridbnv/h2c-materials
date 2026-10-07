#!/usr/bin/env node
// Migration m397 (2026-10-07): values held twice, once with the word that the bar was moulded and once from a copy that
// says nothing of the bar, are held once, on other properties too; and m393's three mistakes undone (quality round
// 2026-10-07, item 1; D134).
//
// m393 retired twenty impact copies of moulded values. The rule finds the same pattern behind product values of other
// properties: a maker's product page or a second edition of its data sheet repeating a table its own data sheet heads as
// injection-moulded (Spectrum's "*injection moulding", colorFabb's "Injection Molded*", Extrudr's range-wide
// information sheet), or a twin's sheet printing the table (one formulation key, R053). Each pair was read on both pages
// by a Claude Sonnet reader (docs/audits/2026-10-07-quality-round/read/verdicts-*.csv, kind copy-pair): where both print
// the same value, point or range alike, and nothing on the copy's page says how its bar was made, the copy is retired as
// a duplicate and names the record that stays. Where the copy's page prints another table, or the moulded statement does
// not reach the row (colorFabb's thermal table carries no asterisk), the copy stays. A twin's sheet that prints the same
// table without the footnote is the same table (R053) and is held once; two readers read such pairs as not covered, the
// rule decides them.
//
// The re-check of m393, which compared the normalized value only:
// - V014807 (Extrudr DuraPro ASA GF's product page, 8 kJ/m²) is not V004118 (its data sheet's 8–10): the page prints a
//   point, and its table differs (density 1.14 against 1.18). Restored.
// - V006008 (colorFabb nGen_FLEX's 2020 sheet, 40 J/m) is a notched Izod struck at -40 °C (ASTM D256), not the moulded
//   record it was retired for. Restored.
// - V014803 (eSUN PA, the V4.0 sheet): its own page says its values come from injection-moulded test bars. It stays
//   retired, as the second copy of a moulded value, and its note now says so.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m397-moulded-values-held-once.mjs
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm397';
const DATE = '2026-10-07';
const RETIRED = 'Retired duplicate record';
const MOULDED = 'Raw material value';
const t = openTables();
let cells = 0;

// [the copy, the moulded record that stays, the reading task]
const COPIES = [
  ['V012376', 'V002829', 'T00006'],
  ['V012397', 'V002086', 'T00001'],
  ['V012395', 'V003125', 'T00010'],
  ['V010486', 'V002682', 'T00002'],
  ['V010484', 'V002680', 'T00003'],
  ['V010488', 'V002679', 'T00004'],
  ['V006274', 'V004110', 'T00011'],
  ['V011490', 'V003123', 'T00007'],
  ['V007519', 'V003121', 'T00008'],
  ['V007522', 'V003120', 'T00009'],
  ['V012130', 'V004193', 'T00016'],
  ['V005917', 'V001964', 'T00035'],
  ['V005927', 'V001965', 'T00036'],
  ['V006143', 'V004130', 'T00012'],
  ['V006176', 'V004138', 'T00013'],
  ['V007687', 'V002824', 'T00005'],
  ['V007689', 'V002828', 'T00037'],
  ['V009275', 'V009245', 'T00039'],
  ['V006418', 'V004291', 'T00022'],
  ['V006421', 'V004294', 'T00023'],
  ['V008566', 'V004254', 'T00019'],
  ['V008571', 'V004200', 'T00017'],
  ['V008575', 'V004202', 'T00018'],
  ['V005819', 'V005781', 'T00029'],
  ['V005823', 'V005936', 'T00032'],
  ['V009231', 'V009254', 'T00038'],
  ['V005964', 'V005880', 'T00033'],
  ['V005965', 'V005881', 'T00034'],
  ['V008711', 'V004140', 'T00014'],
  ['V006445', 'V004184', 'T00015'],
  ['V008754', 'V004274', 'T00021'],
  ['V006201', 'V004333', 'T00027'],
  ['V006417', 'V004263', 'T00020'],
  ['V005938', 'V005771', 'T00028'],
  ['V008604', 'V004314', 'T00024'],
  ['V008680', 'V004317', 'T00025']
];
const key = (g) => { const k = t.get('grades', g)['Shared formulation key']; return k && !/^Not /.test(k) ? k : g; };
const pinned = new Set(t.rows('headlines').map((h) => h.MeasurementID));
for (const [copyId, stayId, task] of COPIES) {
  const copy = t.get('measurements', copyId), stay = t.get('measurements', stayId);
  if (copy['Data status'] === RETIRED) continue;
  const same = ['Property', 'Notch', 'Normalized value', 'Normalized unit', 'Direction'].every((c) => copy[c] === stay[c]);
  if (!same || stay['Specimen type'] !== MOULDED || /^Retired/.test(stay['Data status']) || key(copy.GradeID) !== key(stay.GradeID) || pinned.has(copyId)) {
    throw new Error(`${MIGRATION}: ${copyId} is not a copy of ${stayId}'s moulded value; the data moved`);
  }
  const where = copy.GradeID === stay.GradeID ? 'the same product' : `its twin ${stay.GradeID}, which prints the same table (one formulation key, R053)`;
  t.set('measurements', copyId, 'Data status', RETIRED, { expect: copy['Data status'], migration: MIGRATION });
  t.set('measurements', copyId, 'Notes', `${copy.Notes} Retired duplicate record ${DATE}: ${stayId} (${stay.SourceID}) holds the same ${copy.Property.toLowerCase()} of ${where}, from a table its sheet heads as injection-moulded; this copy's page prints the same value and says nothing of the bar (read on both pages, quality round ${task}), so the value is held once, as ${stayId} (${MIGRATION}).`.trim(), { expect: copy.Notes, migration: MIGRATION });
  cells += 2;
}

// m393's re-check.
for (const [id, why] of [
  ['V014807', 'the product page prints the point 8 kJ/m² in a table that differs from the data sheet\'s (density 1.14 against 1.18), where the data sheet prints 8–10'],
  ['V006008', 'it is a notched Izod struck at -40 °C (ASTM D256) on the 2020 sheet, not the moulded record it was retired for'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] !== RETIRED) continue;
  t.set('measurements', id, 'Data status', 'Published value', { expect: RETIRED, migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${m.Notes} Restored ${DATE}: m393 retired it as a copy of a moulded value, but ${why} (${MIGRATION}).`, { expect: m.Notes, migration: MIGRATION });
  cells += 2;
}
const esun = t.get('measurements', 'V014803');
if (!esun.Notes.includes(`(${MIGRATION})`)) {
  t.set('measurements', 'V014803', 'Notes', `${esun.Notes} Correction ${DATE}: this copy's own page (p. 2) says its values come from injection-moulded test bars, so it is a second copy of the same moulded value, not a copy silent about its bar (${MIGRATION}).`, { expect: esun.Notes, migration: MIGRATION });
  cells++;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s)`);
