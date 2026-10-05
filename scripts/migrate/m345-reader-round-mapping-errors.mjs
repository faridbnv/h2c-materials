#!/usr/bin/env node
// Migration m345 (2026-10-04): what the reader round's mapping got wrong, found by the tests that pin the earlier data (D125).
//
// m342 recorded what the pages print; eighteen tests that pin facts of the earlier data failed, and each failure that was an
// error of the mapping rather than a legitimate new value is corrected here, against the cached sheet, naming the value it
// replaces. In order:
//   1. Test-bar print settings recorded as guidance (D63, m170). On Raise3D and Intamsys sheets the
//      "Nozzle temp." and "Bed temp." lines sit under "All testing specimens were printed under the following conditions": how
//      the test bars were printed, which a profile never holds (test/typed-values.test.js). Each profile held "Not published"
//      before m342; the temperatures go back, the typed cells are read again, the Locator stops naming the specimen lines. P0618
//      and P0919 also took the specimens' nozzle diameter; P0971 took the specimens' nozzle size where the sheet recommends
//      "at least 0.4 mm"; P0635's bed stays at 80 degrees C because its Printing Notifications 2 recommends it.
//   2. Duplicate transcriptions (D120): seven rows the table already held from the same sheet and row.
//   3. The hardened-nozzle reader said "No. ABS Pro contains no abrasive fillers" required a hardened nozzle; it now reads a
//      statement of no abrasive filler, or of a brass nozzle sufficing, as not needed, and the profiles are typed again.
//   4. P1485 (Fillamentum PP 2320): the drying schedule is recorded with the guide's "need to dry" 1 of 5 beside it.
//   5. Extrudr's, DuPont's Zytel and the PEBA PLA sheets' mechanical values are the same bars as the sheets' earlier rows
//      (Raw material value, injection moulded: Extrudr's additional information sheet, section 4), not unstated specimens.
//   6. Stratasys PC-ABS and ABS-M30: the sheets state "measured as printed" and head the table "Printed"; the XY rows get
//      Printed specimen (and the XY direction), so the flat bar ranks before the on-edge one for the heat deflection.
//   7. D93 (a maker's enclosure with no chamber temperature) declared again for the profiles m342 added (m294, m295).
//   8. "Conditioned at room temperature for 24 h" is no moisture state: 33 rows and seven page statements read it as water or
//      humidity conditioning; Polymaker ABS Max's moisture-absorption curve label "70% RH, 23 degrees C" conditioned the
//      whole page; two annealing marks covered rows they do not mark.
//
//   node scripts/migrate/m345-reader-round-mapping-errors.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { retype, typedOf } from './m290-profile-settings.mjs';
import { withNote } from './source-edits.mjs';
import { reviewFields } from '../../build/src/typed-values.js';

const MIGRATION = 'm345';
const NP = 'Not published';
const SPECIMENS = 'All testing specimens were printed under the following conditions';
const t = openTables();

// profile id: { nozzle, bed: the raw value m342 wrote, locator: the segments to drop }
const SPECIMEN_LINES = /^p\. \d: (Specimen print: )?(Nozzle temp\.?|Nozzle diameter|Bed temp\.?|nozzle temperature|build plate temperature|Footnote 1 \(after annealed table\))$/;
const profiles = [
  ['P0918', '250 ºC', '100 ºC', SPECIMENS],
  ['P1263', '320 ºC', '80 ºC', SPECIMENS],
  ['P0673', '320 ºC', '80 ºC', SPECIMENS],
  ['P0633', '320℃', '80℃', SPECIMENS],
  ['P0912', '340 ºC', '80 ºC', SPECIMENS],
  ['P0917', '270 ºC', '60 ºC', SPECIMENS],
  ['P0907', '230 ºC', '55 ºC', SPECIMENS],
  ['P0656', '300ºC', '80ºC', SPECIMENS],
  ['P0909', '340 ºC', '90 ºC', SPECIMENS, null, 'p. 1: Description (a non-heated printing chamber); p. 3: Note 1 (a wear-resistant nozzle). The nozzle and bed temperatures of its p. 2 footnote are the specimens\' print conditions, which are not recorded as guidance (m170, m345).'],
  ['P0618', '250 °C', '70 °C', SPECIMENS, '0.4mm'],
  ['P0919', '220 °C', '60 °C', SPECIMENS, '0.4 mm'],
];
const SUFFIX = ' Its nozzle and bed temperatures are the specimens\' print conditions, which are not printing guidance (m170, m345).';
let cells = 0;
const touched = new Set();
for (const [id, nozzle, bed, quote, diameter, locator] of profiles) {
  const r = t.get('profiles', id);
  if (r['Nozzle °C'] === NP && r['Bed °C'] === NP) continue;
  onCachedSheet(t, r.SourceID, quote, MIGRATION);
  t.set('profiles', id, 'Nozzle °C', NP, { expect: nozzle, migration: MIGRATION });
  t.set('profiles', id, 'Bed °C', NP, { expect: bed, migration: MIGRATION });
  if (diameter) t.set('profiles', id, 'Nozzle diameter', NP, { expect: diameter, migration: MIGRATION });
  const segments = r.Locator.split('; ');
  const kept = segments.filter((s) => !SPECIMEN_LINES.test(s));
  t.set('profiles', id, 'Locator', locator ?? kept.join('; ') + SUFFIX, { expect: r.Locator, migration: MIGRATION });
  retype(t, id, ['Nozzle °C', 'Bed °C'], MIGRATION);
  touched.add(id); cells += 3;
}

// P1742: a 3D-printed mechanical table headed "At 270-290 ℃ print temperature, heat bed 80℃; 100% filling by 100mm/s".
{
  const r = t.get('profiles', 'P1742');
  if (r['Nozzle °C'] !== NP) {
    onCachedSheet(t, r.SourceID, 'Mechanical Properties by 3D printed | At 270-290 ℃ print temperature, heat bed 80℃', MIGRATION);
    t.set('profiles', 'P1742', 'Nozzle °C', NP, { expect: '270-290 ℃', migration: MIGRATION });
    t.set('profiles', 'P1742', 'Bed °C', NP, { expect: '80℃', migration: MIGRATION });
    t.set('profiles', 'P1742', 'Locator', 'p. 1: the conditions the 3D-printed test bars were printed under (print temperature and heat bed, specimens), which are not printing guidance (m170, m345)', { expect: r.Locator, migration: MIGRATION });
    retype(t, 'P1742', ['Nozzle °C', 'Bed °C'], MIGRATION);
    cells += 3;
  }
}

// P0971: the specimens' nozzle size is not the recommendation; the sheet recommends at least 0.4 mm.
{
  const r = t.get('profiles', 'P0971');
  if (r['Nozzle diameter'] === '0.4mm') {
    onCachedSheet(t, r.SourceID, 'Recommended nozzle size | ≥0.4 mm', MIGRATION);
    t.set('profiles', 'P0971', 'Nozzle diameter', '≥0.4 mm', { expect: '0.4mm', migration: MIGRATION });
    t.set('profiles', 'P0971', 'Locator', 'p. 3: Recommended printing settings; p. 3: Recommended nozzle size; p. 3: Recommended build surface material', { expect: r.Locator, migration: MIGRATION });
    cells += 2;
  }
}

// P0635: the nozzle temperature is the specimens'; the bed's 80 °C is the sheet's own recommendation (Printing Notifications 2).
{
  const r = t.get('profiles', 'P0635');
  if (r['Nozzle °C'] !== NP) {
    onCachedSheet(t, r.SourceID, 'For a better bed adhesion, brim or raft are recommended and set bed temperature at 80', MIGRATION);
    t.set('profiles', 'P0635', 'Nozzle °C', NP, { expect: '245 °C', migration: MIGRATION });
    t.set('profiles', 'P0635', 'Locator', 'p. 2: Printing Notifications 2 (bed temperature). The nozzle temperature printed under "All testing specimens were printed under the following conditions" is the test bars\' (m170, m345)', { expect: r.Locator, migration: MIGRATION });
    retype(t, 'P0635', ['Nozzle °C'], MIGRATION);
    cells += 3;
  }
}

// P1485 (Fillamentum PP 2320, the guide's Table 1): m342 wrote the row's schedule "2 h, 80 °C" and left out the table's last
// column, "the need to dry" 1 of 5 (1 - not necessary to dry), which the guide's other products' profiles state (P1376). A
// schedule without it reads as a requirement.
{
  const r = t.get('profiles', 'P1485');
  const drying = '2 h, 80 °C; the need to dry 1 (1 – not necessary to dry, 5 – always needed)';
  if (r.Drying !== drying) {
    onCachedSheet(t, r.SourceID, 'PP 2320 | 2 h 80 °C 1 | 1 – not necessary to dry, 5 – always needed', MIGRATION);
    t.set('profiles', 'P1485', 'Drying', drying, { expect: '2 h, 80 °C', migration: MIGRATION });
    cells++;
  }
}

// Values m342 transcribed that the table already held, from the same sheet, with the same value, direction, specimen and
// state (a second row for the one observation: the Vicat softening temperature of Siraya's PAHT-CF, printed once in the
// product introduction and once in the table; a MakerBot sheet's two pages that print the HDT; sheets whose table the
// first transcription already held under another locator). Two rows of one observation weigh twice in the estimate, so
// each copy is retired, naming the twin that stays (D120).
const DUPLICATES = [
  ['V014078', 'V014089', 'the product introduction\'s "Vicat softening temperature reaches 230°C" restates the table\'s unannealed row, which also names the state and the standard (ISO 306)', ['Post-processing state']],
  ['V014391', 'V007432', 'the sheet prints the HDT on pages 1 and 2'],
  ['V014386', 'V011163', 'the sheet prints the HDT on pages 1 and 2'],
  ['V012244', 'V007613', 'the same row of the same table'],
  ['V012672', 'V009341', 'the same row of the same table'],
  ['V013231', 'V009532', 'the same row of the same table'],
  ['V012239', 'V009848', 'the same row of the same table'],
];
for (const [id, twin, why, unstated = []] of DUPLICATES) {
  const r = t.get('measurements', id);
  if (r['Data status'] === 'Retired duplicate record') continue;
  const keep = t.get('measurements', twin);
  for (const c of ['GradeID', 'Property', 'SourceID', 'Normalized value', 'Direction', 'Moisture state', 'Post-processing state'].filter((c) => !unstated.includes(c))) {
    if (r[c] !== keep[c]) throw new Error(`${MIGRATION}: ${id} and ${twin} differ in ${c}: "${r[c]}" and "${keep[c]}"`);
  }
  t.set('measurements', id, 'Data status', 'Retired duplicate record', { expect: r['Data status'], migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${r.Notes} Retired duplicate of ${twin} (m345, D120): ${why}; the twin stays.`, { expect: r.Notes, migration: MIGRATION });
  cells += 2;
}

// Extrudr's technical data sheets (R-EXTRUDR-<product>-TDS-<language>) state their values for injection-moulded bars: its
// additional information sheet says so for every technical data sheet (R-EXTRUDR-AIS, 04.09.2024, section 4), and the
// earlier campaigns recorded each value of these sheets as a Raw material value with no direction (D95). The reader round's
// values from the same sheets (the German, French and Italian prints, the rows the first transcription left out) were
// recorded as "Not published", and so counted as printed-or-unstated values: a moulded bar's PC/PBT-CF strength floored a
// printed part's estimate. They are the same sheets' values, and read the same way. A sheet that prints a film (a
// "Film specimen" row among the earlier ones) is left alone, and so are the properties the earlier rows left unstated
// (melt flow, shrinkage, water absorption, melting point, dielectric and tear strength).
const MOULDED_PROPERTIES = /^(Charpy strength|Izod impact strength|Compression strength|Elongation at (break|yield)|Flexural (modulus|strength|stress at conventional deflection)|HDT|Tensile (break strength|modulus|strength \(endpoint unspecified\)|yield strength|strain at strength|stress at \d+ % elongation)|Abrasion loss|Hardness|Poisson's ratio)$/;
const AIS = 'Specimen form from Extrudr\'s range-wide additional information sheet (R-EXTRUDR-AIS, 04.09.2024, section 4): the test specimens are manufactured through injection moulding and tested afterwards (m345).';
{
  const all = t.rows('measurements');
  const film = new Set(all.filter((m) => /^Film specimen/.test(m['Specimen type'])).map((m) => m.SourceID));
  let mouldedRows = 0;
  for (const m of all) {
    if (!/^R-EXTRUDR-.*-TDS-/.test(m.SourceID) || film.has(m.SourceID)) continue;
    if (m['Specimen type'] !== 'Not published (do not assume printed)' || !MOULDED_PROPERTIES.test(m.Property)) continue;
    if (!/Added 2026-10-04 \(m342\)/.test(m.Notes ?? '')) continue;
    if (m.Direction !== 'Unstated' && m.Direction !== 'Not applicable') continue;
    const id = m.MeasurementID;
    t.set('measurements', id, 'Specimen type', 'Raw material value', { expect: m['Specimen type'], migration: MIGRATION });
    if (m.Direction === 'Unstated') t.set('measurements', id, 'Direction', 'Not applicable', { expect: 'Unstated', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(m.Notes, AIS), { expect: m.Notes, migration: MIGRATION });
    mouldedRows++; cells += 3;
  }
  console.log(`  ${mouldedRows} Extrudr data-sheet value(s) recorded as moulded-bar values`);
}

// The same on two more sheets whose other values the earlier campaigns recorded as moulded-bar values: DuPont's Zytel
// guide (resin properties, p. 8) and the PEBA PLA sheets (Chinese GB/T standards, values of the resin pellets).
{
  const ids = ['V011917', 'V011918', 'V011919', 'V011920', 'V011921', 'V011922', 'V011923', 'V012860', 'V012861'];
  for (const id of ids) {
    const m = t.get('measurements', id);
    if (m['Specimen type'] === 'Raw material value') continue;
    const same = t.rows('measurements').some((x) => x.SourceID === m.SourceID && x.GradeID === m.GradeID && x['Specimen type'] === 'Raw material value' && x.MeasurementID !== id && !/m342/.test(x.Notes ?? ''));
    if (!same) throw new Error(`${MIGRATION}: ${id}'s sheet records no moulded-bar value of this product`);
    t.set('measurements', id, 'Specimen type', 'Raw material value', { expect: m['Specimen type'], migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(m.Notes, 'Specimen type as the same sheet\'s other values of this product, which the earlier campaigns recorded as Raw material values, not a printed bar (m345).'), { expect: m.Notes, migration: MIGRATION });
    cells += 2;
  }
}

// Stratasys's sheets say the heat deflection values were measured as printed: PC-ABS, p. 5 above its physical-properties table,
// "Values are measured as printed. XY, XZ, and ZX orientations were tested."; ABS-M30, p. 7, heads the table "Physical
// Properties - Printed" and prints an XY and an XZ column. m342 recorded the XZ/ZX column as a printed specimen, but the
// earlier XY column (m96) states no specimen, so the on-edge bar ranked above the flat one. Each XY row of the table is a
// printed specimen, one row at a time: the same page also prints a "Molded" row, so the statement is not the whole page's
// (CONTEXT-ROW-CONTRADICTS-PAGE), and the ABS-M30 rows name the XY column in their Notes, which is their Direction.
{
  const rows = [
    ['R-STRATASYS-mds-fdm-pc-abs-0823a', 'Values are measured as printed. XY, XZ, and ZX orientations were tested.', ['V009342', 'V009343']],
    ['R-STRATASYS-mds-fdm-abs-m30-0826a', 'Physical Properties - Printed | XY and XZ orientations were tested', ['V009361', 'V009362']],
  ];
  for (const [sourceId, quote, ids] of rows) {
    for (const id of ids) {
      const m = t.get('measurements', id);
      if (m.SourceID !== sourceId) throw new Error(`${MIGRATION}: ${id} cites ${m.SourceID}, not ${sourceId}`);
      const specimen = m['Specimen type'] !== 'Printed specimen';
      const direction = m.Direction === 'Not applicable';
      if (!specimen && !direction) continue;
      onCachedSheet(t, sourceId, quote, MIGRATION);
      if (specimen) t.set('measurements', id, 'Specimen type', 'Printed specimen', { expect: 'Not published (do not assume printed)', migration: MIGRATION });
      if (direction) {
        if (!/XY column/.test(JSON.stringify(m))) throw new Error(`${MIGRATION}: ${id} does not name the XY column`);
        t.set('measurements', id, 'Direction', 'XY', { expect: 'Not applicable', migration: MIGRATION });
      }
      t.set('measurements', id, 'Notes', withNote(m.Notes, `Specimen type Printed specimen${direction ? ' and Direction XY' : ''}: the sheet states "${quote.split(' | ')[0]}" and prints an XY and an XZ column of this table (m345).`), { expect: m.Notes, migration: MIGRATION });
      cells += 1 + (specimen ? 1 : 0) + (direction ? 1 : 0);
    }
  }
}

// D93 for the enclosure statements m342 recorded (m294's and m295's rule, applied again to what the reader round added): a
// maker's own "enclosure recommended" with no chamber temperature declares the H2C's heated chamber the enclosure it asks
// for, for the types Bambu Lab's Filament Guide asks an enclosure for, unless another profile of the product states its
// chamber. Without it a product whose newest profile asks for an enclosure kept its chamber unknown beside its guide row.
let declared = 0;
{
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
}

// "Conditioned at room temperature for 24 h prior to testing" (Raise3D's and Polymaker's PLA, PETG, PC and TPU sheets) says
// the specimens rested at room temperature: no humidity, no water. m342 typed those rows' Moisture state "conditioned",
// the state of a bar equilibrated in humid air or water, which a modulus then converts to dry and the conditioned service
// question ranks on. The words state no moisture, so the state is not-stated, as the earlier rows of such sheets read.
{
  const ROOM = /^(All specimens were )?conditioned at room temperature( for)? 24\s?h( prior to testing)?$/i;
  let n = 0;
  for (const m of t.rows('measurements')) {
    if (m['Moisture state'] !== 'conditioned' || !ROOM.test(m['Moisture condition'] ?? '')) continue;
    t.set('measurements', m.MeasurementID, 'Moisture state', 'not-stated', { expect: 'conditioned', migration: MIGRATION });
    t.set('measurements', m.MeasurementID, 'Notes', withNote(m.Notes, 'Moisture state not-stated: conditioning at room temperature for 24 h states no humidity and no water (m345).'), { expect: m.Notes, migration: MIGRATION });
    n++; cells += 2;
  }
  console.log(`  ${n} room-temperature conditioning(s) read as no stated moisture`);
}

// Page statements m342 read with a state the page does not state (page_context.csv):
//   - "All specimens were conditioned at room temperature for 24h prior to testing" and the specimen-condition lines that end
//     with it (Raise3D's and Polymaker's printed-bar tables): no humidity and no water, so Moisture state not-stated;
//   - "70% RH, 23°C", the label of Polymaker ABS Max's moisture-absorption curve: it conditions the curve, not the density,
//     melt index, glass transition, tensile or flexural values of the page, which it had turned all conditioned;
//   - "Mechanical Properties" (a PLA sheet, p. 3) whose Note recommends annealing for a part that needs it:
//     the table's values are as printed; and Fiberlogy ABS+ "Thermal Properties", where only the heat deflection carries the
//     sheet's "* - annealing" mark, not the Vicat softening temperature beside it.
const CONTEXT = [
  ['PC00328', 'Moisture state', 'conditioned'], ['PC00330', 'Moisture state', 'conditioned'], ['PC00332', 'Moisture state', 'conditioned'],
  ['PC00355', 'Moisture state', 'conditioned'], ['PC00359', 'Moisture state', 'conditioned'], ['PC00360', 'Moisture state', 'conditioned'],
  ['PC00361', 'Moisture state', 'conditioned'], ['PC00336', 'Moisture state', 'conditioned'],
  ['PC00317', 'Post-processing state', 'annealed'], ['PC00320', 'Post-processing state', 'annealed'],
];
let contextFixed = 0;
for (const [id, column, wrong] of CONTEXT) {
  const r = t.get('page_context', id);
  if (r[column] !== wrong) continue;
  t.set('page_context', id, column, 'not-stated', { expect: wrong, migration: MIGRATION });
  contextFixed++; cells++;
}
console.log(`  ${contextFixed} page statement(s) read again`);

// The parser now reads "contains no abrasive fillers", "nicht abrasiv" and "prints well with standard nozzles" as no hardened
// nozzle needed (it read the word "abrasive" as a requirement); every profile whose Abrasion / clogging it now reads
// otherwise is typed again.
let retyped = 0;
for (const r of t.rows('profiles')) {
  const reviewed = reviewFields(r) ?? new Set();
  if (reviewed.has('Hardened nozzle')) continue;
  const typed = typedOf(r);
  if (r['Hardened nozzle'] !== typed['Hardened nozzle']) { t.set('profiles', r.ProfileID, 'Hardened nozzle', typed['Hardened nozzle'], { expect: r['Hardened nozzle'], migration: MIGRATION }); retyped++; console.log(`  ${r.ProfileID}: Hardened nozzle ${r['Hardened nozzle']} -> ${typed['Hardened nozzle']} (${r['Abrasion / clogging']})`); }
}
if (cells || retyped || declared) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) written; ${retyped} Hardened nozzle cell(s) read again; ${declared} maker enclosure(s) declared (D93)`);
