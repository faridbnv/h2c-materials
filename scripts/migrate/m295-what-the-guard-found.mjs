#!/usr/bin/env node
// Migration m295 (2026-10-02): what the guard found once the import's reader learned the causes of the profile
// root-cause sweep, and the control re-read after it (D120).
//
// With the reader's new knowledge `npm run audit:context` checks every profile again, and a fresh draw of 40 found three
// more families, each now read by the reader and swept here:
//
//   - A table row "Nozzle" answered with the nozzle a product needs ("Standard brass or higher grade will work",
//     "Nozzle hardened", "Use a hardened steel nozzle or higher grade": Siraya Tech, 3DJake), and the sentences
//     Polymaker's Fiberon and Raise3D's sheets print ("A wear-resistance nozzle, such as hardened steel and ruby nozzle,
//     is highly recommended"). The profiles held the import's fibre sentence ("Use abrasion-resistant nozzle; verify
//     minimum orifice …"), the register's words, not the sheet's; two Siraya TPUs held it where their sheet says brass
//     will work.
//   - Profiles m170 kept as "not printing guidance" because their sheet's only settings are the test bars': on Raise3D's
//     sheets the numbered notes under them are guidance ("1. … Using abrasion resistance nozzle … is highly recommended",
//     "2. Please dry the filament … at least 8 hours at 80-100°C"), and three of them were a second copy of the first.
//     The notes are recorded, the Locator says what the profile holds, and a copy of them is retired (D120).
//   - LUVOCOM 3F PP-CF's nozzle window is its extrusion "Processing" table's; its sheet prints no 3D-printing line, so the
//     profile states none (P0941, which the guard's new check found: a held setting printed only in such a block).
//   - A nozzle size the profile took from a test-bar block ("0.4mm nozzle" under "Printed Specimen Conditions"), or the
//     end of a heading the import read as one ("s Drying Recommendations"): Not published.
//   - The second draw's families, which the reader reads now: Raise3D's "Recommended environmental | 70 – 80 (°C) |
//     temperature" split around its value (three profiles); purefil's "Drying time | … | 2-4h" two lines under its label
//     (three); QIDI's "Please keep the printer chamber closed"; Spectrum PA6 neat's footnote on its second product.
//   - The delta re-read (the detectors widened where the second draw found them blind): enclosure statements in prose
//     on 19 profiles ("printable without an enclosure", "an enclosed printer is recommended for printing", "Please keep
//     the chamber closed", "Compatible Printer Type | Enclosed-frame"), with D93 where it applies; SUNLU's speed bands
//     printed without a unit (three profiles).
//   - The third draw's families: SIDDAMENT's "Seal the Box: No" (or "Yes", or "Yes/No", which leaves it to the printer)
//     on 18 profiles, with D93 where it applies; a nozzle named in eSUN's run-together list of recommendations
//     ("0.4，0.6hardened steel nozzle") and in colorFabb's prose.
//   - LUVOCOM 3F's 3D printing line runs its settings together with slashes ("… / nozzle material: abbrasion resistant
//     / print bed temperature: > 50 °C / …"): six profiles lacked the bed. (Its ABS-CF line on eSUN's PETG-ESD and
//     TPU-64D sheets names another product and is left out, as OPEN-PROBLEMS §12 says.)
//   - An enclosure recommended in a sentence: CreatBot's "we strongly recommend using an enclosed or semi-enclosed
//     printing chamber" (P1286, which the control draw found).
//
//   node scripts/migrate/m295-what-the-guard-found.mjs
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openTables, nextId } from '../data/table-io.mjs';
import { rowsOf, onSheet } from './m277-m279-sweep-shared.mjs';
import { retype, typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { cachedText } from '../lib/pdf-text.mjs';
import { testBlockAt } from '../ingest/propose.mjs';

const MIGRATION = 'm295';
const here = dirname(fileURLToPath(import.meta.url));
const t = openTables();
let cells = 0, retired = 0, located = 0;
for (const e of rowsOf(join(here, `${MIGRATION}-what-the-guard-found.csv`))) {
  const r = t.get('profiles', e.id);
  if (r[e.column] === e.value) continue;
  onSheet(t, r.SourceID, e.quote, MIGRATION);
  t.set('profiles', e.id, e.column, e.value, { expect: r[e.column], migration: MIGRATION });
  retype(t, e.id, [e.column], MIGRATION);
  cells++;
}
// Spectrum's PA6 neat sheet is filed under two products; P0064 holds its footnote's schedule, and its review explains the
// temperature printed without a unit. P0062, the other product of the sheet, holds the same.
{
  const p = t.get('profiles', 'P0062'), twin = t.get('profiles', 'P0064');
  if (p['Drying °C'] !== twin['Drying °C']) { t.set('profiles', 'P0062', 'Drying °C', twin['Drying °C'], { expect: p['Drying °C'], migration: MIGRATION }); cells++; }
  if (p['Parse review'] !== twin['Parse review']) t.set('profiles', 'P0062', 'Parse review', twin['Parse review'], { expect: p['Parse review'], migration: MIGRATION });
}
// The placeholders whose sheets' notes are guidance: the profile names what it holds, and a second copy retires.
const PLACEHOLDER = /the conditions the test specimens were printed under, which are not printing guidance \(m170\)/;
const NOTES = "the notes under the test specimens' conditions, the sheet's only printing guidance (m295)";
// P0657 and P0675 are the same notes read a second time (m289 gave them the drying sentence), under a Locator that names
// a nozzle row the sheet does not print.
for (const [keep, ...copies] of [['P0633'], ['P0656', 'P0657'], ['P0673', 'P0674', 'P0675'], ['P0907', 'P0908'], ['P0912', 'P0913'], ['P0918']]) {
  const k = t.get('profiles', keep);
  if (PLACEHOLDER.test(k.Locator)) { t.set('profiles', keep, 'Locator', k.Locator.replace(PLACEHOLDER, NOTES), { expect: k.Locator, migration: MIGRATION }); located++; }
  for (const copy of copies) {
    const c = t.get('profiles', copy);
    if (c.Profile === 'Retired duplicate record') continue;
    if (c.GradeID !== k.GradeID || c.SourceID !== k.SourceID) throw new Error(`${MIGRATION}: ${copy} is not a copy of ${keep}`);
    t.set('profiles', copy, 'Profile', 'Retired duplicate record', { expect: c.Profile, migration: MIGRATION });
    t.set('profiles', copy, 'Locator', `Retired duplicate of ${keep} (D120): ${c.Locator}`, { expect: c.Locator, migration: MIGRATION });
    retired++;
  }
}
// A nozzle size printed only under a test-bar heading is how the bars were printed (m170), and eight cells hold the
// end of a heading ("s Drying Recommendations") where Raise3D and Polymaker print no size at all.
let sizes = 0;
for (const r of t.rows('profiles')) {
  const v = r['Nozzle diameter'];
  if (r.Profile === 'Retired duplicate record' || /^Not (published|applicable)/.test(v)) continue;
  let specimenOnly = false;
  if (/\d/.test(v)) {
    const c = cachedText(t.get('sources', r.SourceID).SHA256); if (!c) continue;
    const n = v.match(/\d+(?:\.\d+)?/)[0].replace('.', '\\.');
    const where = c.pages.flatMap((p) => { const lines = p.lines.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').trim()); return lines.flatMap((l, i) => (new RegExp(`(^|[^\\d.])${n}\\s*mm`).test(l) && /nozzle|diameter|φ/i.test(`${lines[i - 1] ?? ''} ${l}`) ? [testBlockAt(lines, i)] : [])); });
    specimenOnly = where.length > 0 && where.every(Boolean);
  }
  if (/\d/.test(v) && !specimenOnly) continue;
  t.set('profiles', r.ProfileID, 'Nozzle diameter', 'Not published', { expect: v, migration: MIGRATION });
  sizes++;
}
// SUNLU's other layout prints its windows per speed band with no unit, one row above the label ("230-240 50-100",
// "Nozzle Print Temp.", "240-255 100-300"): a profile per band, as m291 gave the zonal ones. Two profiles held two bands
// joined into one window neither row states, and SUNLU ABS held none.
let rows = 0;
const pagesOf = (sourceId) => cachedText(t.get('sources', sourceId).SHA256).pages.map((p) => ({ page: p.page, lines: p.lines.map((l) => String(l.text ?? '').replace(/\s+/g, ' ').trim()) }));
for (const [id, expect] of [['P0409', 'Not published'], ['P0786', '240-255; 255-270'], ['P0799', '210-230; 230-260']]) {
  const base = t.get('profiles', id);
  const { page, lines } = pagesOf(base.SourceID).find((p) => p.lines.some((l) => /^Nozzle (Print )?Temp\.$/.test(l)));
  const b = lines.findIndex((l) => /^Nozzle (Print )?Temp\.$/.test(l));
  const bands = lines.slice(b - 1, b + 6).map((l) => /^(\d{3}-\s*\d{3})\s+(\d{2,3}-\s*\d{3})$/.exec(l)).filter(Boolean);
  if (bands.length < 2) throw new Error(`${MIGRATION}: ${id} prints ${bands.length} bands`);
  const [[, first, firstSpeed], ...rest] = bands;
  if (base['Nozzle °C'] !== first) {
    onSheet(t, base.SourceID, `${first} ${firstSpeed}`, MIGRATION);
    t.set('profiles', id, 'Nozzle °C', first, { expect, migration: MIGRATION });
    t.set('profiles', id, 'Locator', `${base.Locator}; p. ${page}: Nozzle temperature, ${firstSpeed}mm/s`, { expect: base.Locator, migration: MIGRATION });
    retype(t, id, ['Nozzle °C'], MIGRATION);
  }
  for (const [, raw, speed] of rest) {
    const locator = `p. ${page}: Recommended Printing Parameters: Nozzle temperature, ${speed}mm/s`;
    if (t.rows('profiles').some((p) => p.GradeID === base.GradeID && p.SourceID === base.SourceID && p.Locator === locator)) continue;
    onSheet(t, base.SourceID, `${raw} ${speed}`, MIGRATION);
    const newId = nextId('profiles', t.rows('profiles').map((p) => p.ProfileID));
    t.append('profiles', { ...t.get('profiles', id), ProfileID: newId, 'Nozzle °C': raw, Locator: locator, 'Parse review': 'Not applicable' });
    retype(t, newId, ['Nozzle °C'], MIGRATION);
    rows++;
  }
}
// D93 for the enclosure statements this migration recorded (m294's rule).
let declared = 0;
const enclosedTypes = new Set(t.rows('print_guide_materials').filter((m) => t.get('print_guide', m.PrintGuideID)?.['Chamber state'] === 'enclosed').map((m) => m.MaterialID));
for (const r of t.rows('profiles')) {
  if (r.Profile === 'Retired duplicate record' || !enclosedTypes.has(r.MaterialID)) continue;
  if (r['Enclosure state'] !== 'recommended' || r['Chamber °C'] !== 'Not published' || r['Chamber state'] !== 'unknown') continue;
  if (t.rows('profiles').some((o) => o.GradeID === r.GradeID && o !== r && o.Profile !== 'Retired duplicate record' && o['Chamber °C'] !== 'Not published')) continue;
  const why = `Fields: Chamber state, Chamber requirement. Chamber state enclosed (requirement recommended) is D93 (${MIGRATION}), not a reading of a chamber row, which this sheet does not print: its maker asks for an enclosure ("${r.Enclosure}") and states no chamber temperature, and for a type Bambu Lab's Filament Guide asks to print with an enclosure, the H2C's heated chamber is that enclosure.`;
  const review = r['Parse review'] === 'Not applicable' ? why : `${why} ${r['Parse review'].replace(/^Fields:\s*([^.]*)\.\s*/, '')}`;
  t.set('profiles', r.ProfileID, 'Chamber state', 'enclosed', { expect: 'unknown', migration: MIGRATION });
  t.set('profiles', r.ProfileID, 'Chamber requirement', 'recommended', { expect: r['Chamber requirement'], migration: MIGRATION });
  t.set('profiles', r.ProfileID, 'Parse review', review, { expect: r['Parse review'], migration: MIGRATION });
  declared++;
}
// Raise3D's PEEK-style bed cell: "20 °C (50 - 80 °C recommended for the first layer, 100 – 110 °C for non-destructive
// removal after completion)". The last window is for taking the part off, not for printing; the parser's 20–110 was not
// the sheet's window.
{
  const r = t.get('profiles', 'P0662');
  if (r['Bed max °C'] !== '80') {
    t.set('profiles', 'P0662', 'Bed max °C', '80', { expect: r['Bed max °C'], migration: MIGRATION });
    t.set('profiles', 'P0662', 'Parse review', 'Fields: Bed max °C. The sheet prints the bed at 20 °C with 50 - 80 °C recommended for the first layer, and 100 – 110 °C "for non-destructive removal after completion"; the last is for taking the part off, not for printing, so the window ends at 80 (m295).', { expect: r['Parse review'], migration: MIGRATION });
  }
}
// The drying parser reads a window at its upper end whatever its unit's layout ("90℃-100℃", "8h-12h"), and a cell that
// joins two methods by its first: the profiles it reads differently are typed again, except in a column a review explains.
let retyped = 0;
for (const r of t.rows('profiles')) {
  const typed = typedOf(r); const reviewed = reviewFields(r) ?? new Set();
  for (const c of Object.values(TYPED).flat()) {
    if (r[c] === typed[c] || reviewed.has(c)) continue;
    t.set('profiles', r.ProfileID, c, typed[c], { expect: r[c], migration: MIGRATION });
    retyped++;
  }
}
t.save();
console.log(`${MIGRATION}: ${retyped} typed cells read again, ${cells} cells written, ${located} profiles name the notes they hold, ${retired} copies retired, ${sizes} nozzle sizes that were a test bar's or a heading's, ${rows} speed-band profiles, ${declared} D93 declarations`);
