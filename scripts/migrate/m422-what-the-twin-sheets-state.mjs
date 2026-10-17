#!/usr/bin/env node
// Migration m422 (2026-10-17): Kingroon's reprints of Bambu Lab's tables, typed with what each page states (data review
// fixes, item 1; read on the cached sheets and their rendered pages by Claude Opus).
//
// The material pages' reviewers saw Kingroon PLA Basic (G001-192) print Bambu Lab PLA Basic's (G002-01) values with
// Bambu's rows annealed and Kingroon's not, and Kingroon PETG Basic (G020-72) repeat Bambu Lab PETG Translucent's
// (G023-01) with its tensile rows annealed and its heat rows not. Read again:
//
// - Kingroon PETG Basic, p. 3: "All the specimens were printed at the following settings: Nozzle Temperature = 255 °C,
//   Printing Speed = 150 mm/s, Bed Temperature = 70 °C, Infill Density = 100%. All the specimens were annealed and
//   dried at 65 °C for 8 h before testing." Its tensile, flexural and impact rows carry the sentence (m354); its heat
//   deflection and Vicat rows did not. A heat deflection or Vicat value is measured on a bar, which "all the specimens"
//   names (m378, D131), so the three take the sentence as their siblings do. Its density, DSC and melt-flow rows,
//   measured on no bar, stay as they are (OPEN-PROBLEMS §31.10).
// - Bambu Lab PETG Translucent's V1.0 sheet (B-PC-Bambu-PETG-Translucent-Technical-Data-Sheet, the "Technical Data
//   Sheet V1.0" registered beside B-petg-translucent-TDS on one grade) prints the same sentence under the same table,
//   and none of its 19 rows carried it: m376 typed the six other Bambu Lab sheets that lacked their preparation and
//   missed this one. Its rows are typed as m376 typed those (every row but melt flow; the specimen printed where the
//   sheet says the bars were printed, density keeping its own).
// - Kingroon PLA Basic states no treatment and no drying anywhere: p. 3 prints only "Specimen Test / Specimen Printing
//   Conditions": Nozzle Temperature 220 °C, Bed Temperature 35 °C, Printing Speed 200 mm/s, Infill Density 100%. Its
//   values stay "treatment not stated", as its page prints them, although Bambu's sheet says its identical bars were
//   annealed at 55 °C for 8 h: nothing on Kingroon's page says so (D35). The printed-bar table is recorded once for the
//   page's tensile, flexural and impact values (D116), as m365 recorded the same table on Kingroon's PETG and TPU sheets.
// - Both Kingroon sheets print an unnotched Charpy value before the notched one in one cell ("26.6 ± 2.8 kJ/m²;
//   7.9 ± 1.2 kJ/m² (notched)"), as Bambu's do; m342 took the notched value only. The unnotched ones are recorded, as
//   Bambu's are (V000060, V000481).
// Each pair stays two products with their own values (the owner's ruling of 2026-10-05; GRADE-VALUES-TWIN accepted).
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m422-what-the-twin-sheets-state.mjs
import { openTables, nextId } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { addValue, withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm422';
const DATE = '2026-10-17';
const NP = 'Not published';
const NA = 'Not applicable';
const t = openTables();
let cells = 0;
const set = (id, column, value) => {
  const r = t.get('measurements', id);
  if (r[column] === value) return 0;
  t.set('measurements', id, column, value, { expect: r[column], migration: MIGRATION });
  cells++;
  return 1;
};

// 1. Kingroon PETG Basic's heat rows.
const KG_PETG = 'R-3DJAKE-KINGROON-PETG-Basic-Technical-Data-Sheet-V1-0';
const KG_SENTENCE = 'All the specimens were annealed and dried at 65 °C for 8 h before testing';
const KG_PRINT = 'Nozzle Temperature = 255 °C; Printing Speed = 150 mm/s; Bed Temperature = 70 °C; Infill Density = 100%';
onCachedSheet(t, KG_PETG, `All the specimens were printed at the following settings: Nozzle Temperature = 255 °C, Printing Speed = 150 mm/s, Bed | ${KG_SENTENCE}`, MIGRATION);
for (const id of ['V013356', 'V013357', 'V013358']) {
  const r = t.get('measurements', id);
  if (r.SourceID !== KG_PETG || !/^(HDT|Vicat softening temperature)$/.test(r.Property)) throw new Error(`${MIGRATION}: ${id} is not a heat row of ${KG_PETG}`);
  let n = 0;
  if (r['Specimen type'] === 'Not published (do not assume printed)') n += set(id, 'Specimen type', 'Printed specimen');
  if (r['Moisture state'] === 'not-stated') { n += set(id, 'Moisture condition', KG_SENTENCE); n += set(id, 'Moisture state', 'dry'); }
  if (r['Post-processing state'] === 'not-stated') {
    n += set(id, 'Post-processing', KG_SENTENCE); n += set(id, 'Post-processing state', 'annealed');
    n += set(id, 'Anneal °C', '65'); n += set(id, 'Anneal h', '8');
  }
  if (r['Specimen / print parameters'] === NP) n += set(id, 'Specimen / print parameters', KG_PRINT);
  if (n) set(id, 'Notes', withNote(r.Notes, `Corrected ${DATE} (${MIGRATION}) against the source: p. 3 says "All the specimens were printed at the following settings" and "${KG_SENTENCE}", and a heat deflection or Vicat value is measured on a specimen bar (m378), as this sheet's tensile rows record.`));
}

// 2. Bambu Lab PETG Translucent's V1.0 sheet, typed as m376 typed Bambu's other sheets.
const BB = 'B-PC-Bambu-PETG-Translucent-Technical-Data-Sheet';
const BB_SENTENCE = 'All the specimens were annealed and dried at 65 °C for 8 h before testing';
onCachedSheet(t, BB, 'All the specimens were printed at the following settings | were annealed and dried at 65 °C for 8 h before testing', MIGRATION);
for (const r of t.rows('measurements').filter((x) => x.SourceID === BB && !x['Data status'].startsWith('Retired') && !/^(Melt (?:mass|volume)-flow rate|Hardness)$/.test(x.Property))) {
  const id = r.MeasurementID;
  let n = 0;
  if (r['Moisture state'] === 'not-stated') { n += set(id, 'Moisture condition', 'Dried before testing (see preparation)'); n += set(id, 'Moisture state', 'dry'); }
  if (r['Post-processing state'] === 'not-stated') {
    n += set(id, 'Post-processing', BB_SENTENCE); n += set(id, 'Post-processing state', 'annealed');
    n += set(id, 'Anneal °C', '65'); n += set(id, 'Anneal h', '8');
  }
  if (r.Property !== 'Density' && r['Specimen type'] === 'Not published (do not assume printed)') n += set(id, 'Specimen type', 'Printed specimen');
  if (n) set(id, 'Notes', withNote(r.Notes, `Corrected ${DATE} (${MIGRATION}) against the source: the sheet says once, under its table, "All the specimens were printed at the following settings" and that they "were annealed and dried at 65 °C for 8 h before testing" (as m376 typed Bambu Lab's other sheets).`));
}

// 3. Kingroon PLA Basic's table of how its test bars were printed, once for the page's mechanical values.
const KG_PLA = 'R-3DJAKE-KINGROON-PLA-Basic-Technical-Data-Sheet-V1-0';
onCachedSheet(t, KG_PLA, 'Specimen Test | Specimen Printing Conditions | Nozzle Temperature 220 °C | Bed Temperature 35 °C | Printing Speed 200 mm/s', MIGRATION);
let context = 0;
for (const scope of ['tensile', 'flexural', 'impact']) {
  if (t.rows('page_context').some((c) => c.SourceID === KG_PLA && c['Applies to'] === scope)) continue;
  t.append('page_context', {
    PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), SourceID: KG_PLA, Page: '2', 'Applies to': scope, Table: NA,
    Statement: 'Specimen Test, Specimen Printing Conditions: Nozzle Temperature 220 °C; Bed Temperature 35 °C; Printing Speed 200 mm/s; Infill Density 100%',
    'Specimen type': 'Printed specimen', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA,
    Standard: NP, 'Test temperature °C': NP, Direction: NP,
    Locator: 'p. 3: the table of how the test bars were printed, for the values of p. 2; the sheet states no annealing or drying',
    'Reviewed by': `Read ${DATE} by Claude Opus on the rendered page and the cached sheet (data review fixes, item 1; ${MIGRATION}), as m365 recorded the same table on Kingroon's PETG and TPU sheets`,
  });
  context++;
}

// 4. The unnotched Charpy values both Kingroon sheets print first in the X-Y impact cell.
let added = 0;
for (const [like, raw, num, sd, quote] of [
  ['V013388', '26.6 ± 2.8 kJ/m²;', '26.6', '2.8', '26.6 ± 2.8 kJ/m²; | Impact Strength (X-Y) ISO 179, GB/T 1043 7.9 ± 1.2 kJ/m²'],
  ['V013369', '37.4 ± 3.3 kJ/m²;', '37.4', '3.3', '37.4 ± 3.3 kJ/m²; | Impact Strength (X-Y) ISO 179, GB/T 1043 8.6 ± 2.1 kJ/m²'],
]) {
  const tpl = t.get('measurements', like);
  onCachedSheet(t, tpl.SourceID, quote, MIGRATION);
  const id = addValue(t, {
    like, migration: MIGRATION, date: DATE,
    why: 'published in the source, never transcribed: the X-Y impact cell prints an unnotched value before the notched one,',
    note: `"${raw} ${num === '26.6' ? '7.9 ± 1.2' : '8.6 ± 2.1'} kJ/m² (notched)"; the first, unmarked, is the unnotched bar, as the same layout is read on Bambu Lab's sheet (V000060, V000481). Read on the rendered page by Claude Opus (data review fixes, item 1).`,
    set: {
      'Raw value': raw, 'Raw numeric': num, 'Raw uncertainty ±': sd, 'Normalized value': num, 'Normalized uncertainty ±': sd,
      Direction: 'XY', Notch: 'Unnotched', Locator: 'p. 2: Impact Strength (X-Y) (unnotched, the first of the cell\'s two values)',
      'Specimen type': tpl['Specimen type'], 'Moisture condition': tpl['Moisture condition'], 'Moisture state': tpl['Moisture state'],
      'Post-processing': tpl['Post-processing'], 'Post-processing state': tpl['Post-processing state'], 'Anneal °C': tpl['Anneal °C'], 'Anneal h': tpl['Anneal h'],
      'Specimen / print parameters': tpl['Specimen / print parameters'], 'Test load MPa': NA,
    },
  });
  if (id) added++;
}

if (cells || context || added) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) typed with what the sheets state, ${context} page statement(s), ${added} unnotched value(s) recorded`);
