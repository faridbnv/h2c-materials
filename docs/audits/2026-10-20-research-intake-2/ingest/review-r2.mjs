#!/usr/bin/env node
// Stage 3's review of research intake 2's reading proposals: the executor's decisions (Claude Opus 5.5) on what
// ingest:read-proposals proposed from the reconciled readings (proposals/r2/) and on the readings it held, written into
// proposals/r2-reviewed/, the folder m489 applies with applyProposals. Cells a parser cannot read (a German sentence, a
// printer's model number, "ºC" for "°C") are typed by hand in m489 with their Parse review, since applyProposals writes
// only what the parsers read.
//
//   node docs/audits/2026-10-20-research-intake-2/ingest/review-r2.mjs
//
// Every decision is in this file, with its reason, and summary.md lists them:
//
//   DIRECTIONS     Kexcelled's columns, by the bar each drawing shows (X,Y flat, X,Z on edge, Z,X upright)
//   SPECIMENS      the specimen a document indicates for its tables (D172), with the words that indicate it
//   VALUE_KEEPS    a held or unmapped reading recorded after all, built by the pipeline's own valueProposal
//   PROFILE_SETS   a proposed profile with a cell from a reading the pipeline held (on the same page)
//   DROP_SETS      a proposed cell of a held profile that is not a setting
//   CELL_SETS      a cell of a held profile from a registered sheet, which the pipeline held
// Nothing here writes data/.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const R = resolve(here, '..');
const root = resolve(R, '../../..');
const { readCsv, csvText } = await import(join(root, 'build/src/csv.js'));
const { valueProposal, tidy } = await import(join(root, 'scripts/ingest/read-proposals.mjs'));
const { typedOf } = await import(join(root, 'scripts/lib/profile-settings.mjs'));
const { readStandards } = await import(join(root, 'build/src/normalize/standards.js'));

const rows = (file) => readCsv(file).records.map((r) => Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, v ?? ''])));
const headerOf = (file) => readCsv(file).header;
const table = (name) => rows(join(root, 'data/tables', `${name}.csv`));
const NP = 'Not published', NA = 'Not applicable';
const BY = 'Claude Opus 5.5 (research intake 2, stage 3)';
const IN = join(R, 'proposals/r2'), OUT = join(R, 'proposals/r2-reviewed');
const id = (n) => `r2-resolved.csv#${n}`;
const S = {
  KEX: 'R-KEXCELLED-INTAKE-20261020-92a1f96a864b', HEMP: 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede', QIDI: 'R-QIDI-INTAKE-20261020-4bdb6fe222df',
  BASF: 'R-FORWARDAM-INTAKE-20261020-bd7cbd47d8e7', RAISE: 'R-RAISE3D-INTAKE-20261020-35dfb5b81aeb', PIS: 'R-POLYMAKER-INTAKE-20261020-bf1a52b7bfb4',
  AZURE: 'R-AZUREFILM-INTAKE-20261020-8168f14e3afb', SAKATA_CF: 'R-SAKATA-INTAKE-20261020-d6c57de6f438', SAKATA_NT: 'R-SAKATA-INTAKE-20261020-ff205bacb571',
};

const registry = new Map(table('properties').map((p) => [p.Property, p]));
const grades = new Map(table('grades').map((g) => [g.GradeID, g]));
const measurements = table('measurements');
const profiles = table('profiles');
const readings = new Map(['new-values', 'new-settings', 'unmapped', 'mismatches'].flatMap((f) => rows(join(R, `reconcile/r2/${f}.csv`))).map((r) => [r.RowID, r]));
const decided = [];

// ---------------------------------------------------------------------------------------------------- the decisions
// Kexcelled prints "Printed horizontal" over all three columns and draws the bar under each: flat for X,Y, on its edge for
// X,Z, standing for Z,X (two readers, from the page image). The drawings name the build direction, not the word above
// them (the research's warning: "do not classify the upright sketch as flat from that word alone").
const KEX_DIRECTION = { 'X,Y-axis': 'XY', 'X,Z-axis': 'XZ', 'Z,X-axis': 'Z' };
const KEX_NOTE = { XY: 'The X,Y column, whose drawing shows the bar lying flat.', XZ: 'The X,Z column, whose drawing shows the bar on its edge (XZ).', Z: 'The Z,X column, whose drawing shows the bar standing: pulled across its layers (Z). Footnote 1: "Z,X-axis test data are for reference only".' };
const kexDirection = (r) => KEX_DIRECTION[Object.keys(KEX_DIRECTION).find((k) => String(r.Direction ?? '').includes(k)) ?? ''] ?? null;

// The specimen each document's tables are on (AGENTS.md, D172): where a document gives its test bars' print settings or
// heads its table as the printed filament's, its values are printed bars, with the words that say so.
const SPECIMENS = [
  { source: S.BASF, when: (v) => v.Property !== 'Density', type: 'Printed (implied by the document)', note: 'Page 3 gives the print settings its test specimens were made with, beside the recommended ones ("Printer FFF printer Ultimaker S5": 280 °C nozzle, a passively heated cover, 90 °C bed, 0.6 mm nozzle, 40 mm/s), so its tables are printed bars.' },
  { source: S.QIDI, when: (v) => v.Direction === 'XY', type: 'Printed (implied by the document)', note: 'The row names a print orientation ("Tensile Strength(X-Y)", "Impact Strength (X-Y)"), so the bar was printed.' },
  { source: S.RAISE, when: () => true, type: 'Printed (implied by the document)', note: 'p. 11 heads the table "Technical Sheet of PA12 Carbon Fiber Filament before and after Annealing", its columns "As Printed" and "100℃ Annealed": bars printed from the filament.' },
  { source: S.PIS, when: () => true, type: 'Printed (implied by the document)', note: 'p. 6 heads the columns "As Printed" and "80 °C Annealed", after "Annealing PolyMide™ PA12-CF parts" ("putting the model in an oven at 80˚C for 6 hours"): bars printed from the filament.' },
  { source: S.HEMP, when: (v) => /Tensile|Elongation/.test(v.Property), type: 'Film specimen (ASTM D882); not a printed or moulded bar', note: 'The sheet names ASTM D882, the tensile test of thin plastic sheeting, for its tensile rows, and says nothing else of the specimen.' },
];
const ANNEAL = { [S.RAISE]: { c: '100', h: NP, words: '100℃ Annealed' } };

const VALUE_KEEPS = {
  // Kexcelled's X,Y column, which the pipeline held for its direction words, and two impact cells whose quote it missed.
  [id(425)]: { with: { Direction: 'XY' }, quote: 'Tensile strength（Mpa） 10~15 11~15 10~14', locator: 'p. 2: Tensile strength (Mpa), X,Y-axis', note: KEX_NOTE.XY },
  [id(428)]: { with: { Direction: 'XY' }, quote: 'Elongation at break（%） 210~220', locator: 'p. 2: Elongation at break (%), X,Y-axis', note: KEX_NOTE.XY },
  [id(430)]: { with: { Direction: 'XY' }, quote: 'Emodulus（Mpa） 200~400 200~400 200~300', locator: 'p. 2: Emodulus (Mpa), X,Y-axis', note: KEX_NOTE.XY },
  [id(433)]: { with: { Direction: 'XY' }, quote: 'Notch impact strength（KJ/m） 15~20 34~48 3~6', locator: 'p. 2: Notch impact strength (KJ/m2), X,Y-axis', note: `${KEX_NOTE.XY} Notch type A (footnote 3).` },
  [id(434)]: { with: { Direction: 'XZ' }, quote: 'Notch impact strength（KJ/m） 15~20 34~48 3~6', locator: 'p. 2: Notch impact strength (KJ/m2), X,Z-axis', note: `${KEX_NOTE.XZ} Notch type A (footnote 3).` },
  [id(435)]: { with: { Direction: 'Z' }, quote: 'Notch impact strength（KJ/m） 15~20 34~48 3~6', locator: 'p. 2: Notch impact strength (KJ/m2), Z,X-axis', note: `${KEX_NOTE.Z} Notch type A (footnote 3).` },
  [id(439)]: { with: { Direction: 'XY' }, quote: 'Flexural modulus（Mpa） 300~400 300~400 200~300', locator: 'p. 2: Flexural modulus (Mpa), X,Y-axis', note: KEX_NOTE.XY },
  // Its flexural table's "Maximum force (Mpa)" is a stress under ISO 178: the flexural strength.
  [id(436)]: { with: { Field: 'Flexural strength', Direction: 'XY', Unit: 'MPa' }, quote: 'Maximum force（Mpa） 11~16 13~16 9~13', locator: 'p. 2: Maximum force (Mpa), X,Y-axis', note: `The flexural table's "Maximum force (Mpa)" row, a stress in MPa under ISO 178: the flexural strength. ${KEX_NOTE.XY}` },
  [id(437)]: { with: { Field: 'Flexural strength', Direction: 'XZ', Unit: 'MPa' }, quote: 'Maximum force（Mpa） 11~16 13~16 9~13', locator: 'p. 2: Maximum force (Mpa), X,Z-axis', note: `The flexural table's "Maximum force (Mpa)" row, a stress in MPa under ISO 178: the flexural strength. ${KEX_NOTE.XZ}` },
  [id(438)]: { with: { Field: 'Flexural strength', Direction: 'Z', Unit: 'MPa' }, quote: 'Maximum force（Mpa） 11~16 13~16 9~13', locator: 'p. 2: Maximum force (Mpa), Z,X-axis', note: `The flexural table's "Maximum force (Mpa)" row, a stress in MPa under ISO 178: the flexural strength. ${KEX_NOTE.Z}` },
  [id(421)]: { with: { Unit: 'g/cm3' }, quote: 'density 0.9~0.92g/cm ISO 1183', note: 'The page prints the unit as "g/cm" with the 3 as a superscript the text layer sets apart.' },
  // Filamentive's density (its superscript 3 set apart), its "Tensile Elongation" and its notched Izod.
  [id(445)]: { with: { Unit: 'g/cm3' }, quote: 'D 792 1.24 g/cm | Specific Gravity', note: 'The page prints the unit as "g/cm" with the 3 as a superscript the text layer sets apart.' },
  [id(450)]: { with: { Field: 'Elongation at break' }, quote: 'D 882 6% | Tensile Elongation', note: 'A plain "Tensile Elongation" is read as elongation at break, as on the other sheets that print the label.' },
  [id(451)]: { with: { Field: 'Izod impact strength' }, quote: 'D 256 16 J/m | Notched Izod', note: 'Notched Izod, ASTM D256.' },
  // Forward AM's image-only rows the pipeline held for their quote: each quote is checked on the page's optical text.
  // Its glass load ("Reinforced filament with 30% glass fiber") is a banner neither the text layer nor the optical reading holds,
  // so no quote check can bear it out: left held; the grade's words keep it as two readers read it from the image.
  [id(486)]: { quote: 'Elongation at Break®) ISO 527', note: 'The optical text reads the cell as "44%"; two readers read 4.4 % from the page image, where the decimal point is plain. The quote checks the row\'s label, the figure is the image\'s.' },
  [id(499)]: { quote: 'Impact Strength Charpy ISO 179-2 5.3 kJ/m', note: 'Notched (the row heads "(notched)"), the XY column.' },
  [id(500)]: { quote: 'Impact Strength Charpy ISO 179-2 5.3 kJ/m? 5.2 kJ/m', note: 'Notched, the XZ column.' },
  [id(501)]: { quote: '5.2 kJ/m? 1.2 kJ/m', note: 'Notched, the ZX column.' },
  [id(502)]: { quote: 'Impact Strength Charpy ISO 179-2 23.1 kJ/m', note: 'Unnotched (the row heads "(unnotched)"), the XY column.' },
  [id(503)]: { quote: '25.8 kJ/m', note: 'Unnotched, the XZ column.' },
  [id(504)]: { quote: '2.5 kJ/m', note: 'Unnotched, the ZX column.' },
  [id(505)]: { with: { Field: 'Izod impact strength' }, quote: 'Impact Strength Izod ISO 180 5.6 kJ/m', note: 'Notched, the XY column.' },
  [id(506)]: { with: { Field: 'Izod impact strength' }, quote: '5.6 kJ/m? 6.2 kJ/m', note: 'Notched, the XZ column.' },
  [id(507)]: { with: { Field: 'Izod impact strength' }, quote: '6.2 kJ/m? 1.4 kJ/m', note: 'Notched, the ZX column.' },
  [id(508)]: { with: { Field: 'Izod impact strength' }, quote: 'Impact Strength Izod ISO 180 20.5 kJ/m', note: 'Unnotched, the XY column.' },
  [id(509)]: { with: { Field: 'Izod impact strength' }, quote: '20.5 kJ/m? 2.4 kJ/m', note: 'Unnotched, the XZ column.' },
  [id(510)]: { with: { Field: 'Izod impact strength' }, quote: '2.4 kJ/m? 2.6', note: 'Unnotched, the ZX column (the optical text reads its unit "kJd/m").' },
  [id(516)]: { quote: 'Glass Transition ISO 11357-2 -5°C', note: 'DSC, ISO 11357-2.' },
  [id(518)]: { quote: 'Melt Volume-Flow Rate ISO 1133 11.7 cm', note: 'At 220 °C and 2.16 kg, as the cell prints ("2,16 kg").' },
  [id(519)]: { with: { Unit: 'Shore D' }, quote: 'Shore Hardness D (15s) DIN ISO 7619-1 73', note: 'Shore D, read after 15 s.' },
  // Raise3D's two heat deflections, which a second reader read one column of: the text layer prints both rows whole
  // ("90℃ HDT @ 0.45 MPa 131℃", "HDT @ 1.8 MPa / 105℃"), and the executor read them there.
  [id(599)]: { quote: '90℃ | HDT @ 0.45 MPa 131℃', note: 'The As Printed column at 0.45 MPa (the text layer sets the cell above its label).' },
  [id(601)]: { quote: 'HDT @ 1.8 MPa / 105℃', note: 'The 100℃ Annealed column at 1.8 MPa; the As Printed cell prints "/", no value.' },
  [id(613)]: { with: { Field: 'Charpy strength' }, quote: '17.69 ± 1.14 12.52 ± 0.68', note: 'The notched Charpy row, whose label the page sets as an image (two readers read "Notched Charpy Impact Strength (kJ/m²)"); the As Printed column.' },
  // Values the pipeline held for a unit spelling.
  [id(11)]: { with: { Unit: 'W/(m·K)' }, quote: 'Thermal conduc6vity 23°C 0.15 W/(K*m)', note: 'W/(K*m) is W/(m·K). Measured at 23 °C (F-0037).' },
  [id(18)]: { with: { Unit: 'Ω·cm', Specimen: 'injection moulded' }, quote: 'Volume resistivity of molded resin (not 3D Printed): 15 ohm-cm', note: 'ohm-cm is Ω·cm. Moulded resin, as the page says (F-0038).' },
  [id(19)]: { with: { Unit: 'Ω·cm', Specimen: 'printed', Direction: 'XY' }, quote: 'Volume resistivity of 3D printed parts along layers (x/y): 30 ohm-cm', note: 'ohm-cm is Ω·cm. Printed parts, along the layers (x/y) (F-0038).' },
  [id(20)]: { with: { Unit: 'Ω·cm', Specimen: 'printed', Direction: 'Z' }, quote: 'Volume resistivity of 3D printed parts against layers (z): 115 ohm-cm', note: 'ohm-cm is Ω·cm. Printed parts, against the layers (z) (F-0038).' },
  // Its melting onset ("approx. 155 deg C (310 deg F)") is a prose claim the pipeline refuses: left held.
  [id(30)]: { with: { Direction: '' }, set: { Direction: 'Stated, not a usable direction' }, quote: 'Ultimate strength 38 MPa ISO 527-2/1A | Test performed at 1mm/min on 3D printed test specimins at 0°, along with the tension stress.', note: 'Printed bars with their raster at 0°, along the tension (the page\'s footnote): a raster the database has no direction for, as the other Nanovia sheets\' rows are typed (F-0039).' },
  [id(464)]: { with: { Unit: 'kJ/m²' }, quote: 'Impact Strength (X-Y) 27.3±1.1 kJ/㎡', note: 'The page names no impact test ("Impact Strength"): kept as an impact result whose test is unclear.' },
  [id(557)]: { with: { Unit: '°C' }, quote: 'HDT (1.8 MPa) ISO 75 ºC 60', note: 'ºC is °C.' },
  [id(575)]: { with: { Unit: '°C' }, quote: 'HDT (0.45 MPa) ISO 75 ºC 180', note: 'ºC is °C. The thermal table, not the mechanical one its "dry as moulded" footnote heads.' },
};

const PROFILE_SETS = {
  // QIDI's recipe table window; its printing tip (310-350 °C) is named in the Locator.
  [S.QIDI]: { from: [id(466)], set: { 'Nozzle °C': '300-350 °C' }, quote: 'Nozzle Temperature 300-350 °C', locator: 'Recommended Printing Settings (Nozzle Temperature); its Printing Tips add "The hot end operating temperature must be set between 310°C and 350°C"', note: 'The recipe table\'s nozzle window, which a second reader read from the printing tip (310-350 °C) instead; both are within the H2C\'s nozzle.' },
  'R-FILAMENTIVE-INTAKE-20261020-c8a447a4df81': { from: [id(627), id(628)], set: { 'Nozzle °C': '200 ± 15°C', 'Bed °C': '≤45°C' }, quote: 'Printing temperature: 200 ± 15°C | Bed temperature : ≤45°C', locator: 'Printing temperature; Bed temperature', note: 'The page\'s windows as the parsers read them: 185-215 °C (a tolerance), and a bed of at most 45 °C.' },
  [S.BASF]: { from: [id(481)], set: { Drying: '60 °C in a hot air dryer or vacuum oven for 4 to 16 hours' }, quote: '60 °C in a hot air dryer or vacuum oven for 4 to 16', locator: 'p. 4: Further Recommendations (drying)', note: 'The drying schedule of p. 4, read by two readers from the image and found in its optical text.' },
  [S.AZURE]: { from: [id(545)], set: { Plate: 'PEI, BUILDTAK' }, quote: 'PEI,', locator: 'Bed surface', note: 'The bed surface row, whose cell the text layer breaks across lines.' },
  [S.PIS]: { set: { Drying: 'If the filament has absorbed moisture it can be dried at 80˚C for 12 hours in a convection oven.' }, quote: 'If the filament has absorbed moisture it can be dried at 80˚C for 12 hours in a convection oven.', locator: 'p. 7: Dry box system', note: 'The sheet\'s whole drying sentence, conditional on absorbed moisture: optional (D168), where the cell the pipeline built from the schedule alone read required (F-0146).' },
  [S.SAKATA_CF]: { from: [id(577)], set: { 'Bed °C': '> 65' }, quote: 'Bed temp. ºC > 65', locator: 'PRINT SETTINGS (Bed temp.)', note: 'A bed above 65 °C, open at its top, as the parser reads it.' },
};

// Proposed cells of held profiles that are not settings: Extrudr's "Adhesive: recommended" is not a plate.
const DROP_SETS = [['P0389', 'Plate'], ['P0389', 'Locator'], ['P0371', 'Plate'], ['P0371', 'Locator']];

// Cells of held profiles from registered sheets.
const CELL_SETS = [
  { profile: 'P1453', column: 'Nozzle °C', value: '240-280°C', quote: 'Prin6ng temperature | 240-280°C', locator: 'p. 1: Printing temperature', from: id(14), note: 'The nozzle window two readers read (F-0037\'s sheet); the text layer prints "Prin6ng" for "Printing".' },
  { profile: 'P0560', column: 'Drying', value: 'water resistance (no drying needed)', quote: 'water resistance (no drying | needed), chemical resistance', locator: 'p. 1: description (water resistance)', from: id(41), note: 'The sheet\'s own words: no drying needed (F-0311).' },
  { profile: 'P1985', column: 'Drying', value: 'water resistance (no drying needed)', quote: 'water resistance (no drying | needed), chemical resistance', locator: 'p. 1: description (water resistance)', from: id(41), note: 'The sheet\'s own words: no drying needed (F-0311).' },
];

// ---------------------------------------------------------------------------------------------------- the build
const valuesHeader = headerOf(join(IN, 'values-add.csv'));
const profilesHeader = [...new Set(headerOf(join(IN, 'profiles-add.csv')))];
const setHeader = headerOf(join(IN, 'profiles-set.csv'));

// A sheet's print settings for its test bars are not a standard: they move to the specimen's print parameters.
const splitStandard = (v) => {
  const parts = String(v['Standard / load']).split(';').map((x) => x.trim());
  const keep = parts.filter((x) => !/^(infill|printer|nozzle|bed|speed|shell|shells|layer height|infill angle)=/i.test(x));
  const params = parts.filter((x) => /^(infill|printer|nozzle|bed|speed|shell|shells|layer height|infill angle)=/i.test(x));
  if (!params.length) return v;
  const standard = keep.join('; ') || NP;
  return { ...v, 'Standard / load': standard, Standards: readStandards(standard).join('; ') || NP, 'Specimen / print parameters': params.join('; ') };
};

const values = rows(join(IN, 'values-add.csv')).map((v) => {
  let out = splitStandard(v);
  if (out.SourceID === S.KEX) {
    const r = readings.get(out.rows);
    const dir = kexDirection(r);
    if (dir && dir !== out.Direction) {
      out = { ...out, Direction: dir, note: tidy(`${out.note} ${BY}: ${KEX_NOTE[dir]}`) };
      decided.push({ kind: 'direction', target: out.rows, what: `${out.GradeID} ${out.Property} ${out['Raw value']}: ${dir}`, why: KEX_NOTE[dir] });
    }
  }
  return out;
});

const published = measurements.filter((m) => /^Published value/.test(m['Data status']));
const likeFor = (gradeId, sourceId) => {
  const g = grades.get(gradeId);
  const rank = (m) => (m.SourceID === sourceId && m.GradeID === gradeId ? 0 : m.GradeID === gradeId ? 1 : m.SourceID === sourceId ? 2
    : m.MaterialID === g.MaterialID ? 3 : grades.get(m.GradeID)?.Manufacturer === g.Manufacturer ? 4 : 5);
  return published.reduce((best, m) => (!best || rank(m) < rank(best) ? m : best), null);
};
const locators = new Map();
for (const m of [...measurements, ...values]) (locators.get(m.SourceID) ?? locators.set(m.SourceID, new Set()).get(m.SourceID)).add(m.Locator);

for (const [rowId, d] of Object.entries(VALUE_KEEPS)) {
  const r = readings.get(rowId);
  if (!r) throw new Error(`${rowId}: not a reconciled reading`);
  const reading = { ...r, ...(d.with ?? {}), Quote: '' };
  const p = valueProposal(reading, { registry, grade: r.Grade });
  if (p.error) throw new Error(`${rowId}: ${p.error}${p.detail ? ` (${p.detail})` : ''}`);
  const { facts, bound, decision, ...value } = p;
  void facts; void bound; void decision;
  const locator = tidy(d.locator ?? `p. ${r.Page}: ${r.Label || reading.Field}${r.Direction ? ` (${r.Direction})` : ''}${r.PostProcessing ? ` (${r.PostProcessing})` : ''}`);
  if (locators.get(r.SourceID)?.has(locator)) throw new Error(`${rowId}: locator "${locator}" is taken on ${r.SourceID}`);
  (locators.get(r.SourceID) ?? locators.set(r.SourceID, new Set()).get(r.SourceID)).add(locator);
  const note = `p. ${r.Page}${r.Label ? `, "${r.Label}"` : ''}: the page prints "${r.Raw}"; read by ${r.Reader}, ${r.Presence}, second reading ${r.SecondRead}.`;
  values.push(splitStandard({
    gate: 'ready', task: 'reader-round', like: likeFor(r.Grade, r.SourceID).MeasurementID, SourceID: r.SourceID, GradeID: r.Grade, MaterialID: grades.get(r.Grade).MaterialID,
    ...value, ...(d.set ?? {}), Locator: locator, quote: d.quote ?? r.Quote, note: tidy(`${note} ${BY}: ${d.note}`), decision: '', cause: 'reviewer-kept', sign_view: '', presence: r.Presence,
    second_read: r.SecondRead, quote_view: '', grade_from: 'reader', reader: r.Reader, rows: rowId, data_status: '',
  }));
  decided.push({ kind: 'value kept', target: rowId, what: `${r.Grade} ${value.Property} ${value['Raw value']} ${value['Raw unit']}`, why: d.note });
}

// The specimen each document indicates, and the annealing schedule its column heads.
for (const v of values) {
  const rule = SPECIMENS.find((s) => s.source === v.SourceID && s.when(v));
  if (rule && v['Specimen type'] !== rule.type) {
    decided.push({ kind: 'specimen', target: v.rows, what: `${v.GradeID} ${v.Property} ${v['Raw value']}: ${v['Specimen type']} -> ${rule.type}`, why: rule.note });
    v['Specimen type'] = rule.type;
    v.note = tidy(`${v.note} ${BY}: ${rule.note}`);
  }
  const a = ANNEAL[v.SourceID];
  if (a && v['Post-processing state'] === 'annealed' && v['Anneal °C'] !== a.c) {
    v['Anneal °C'] = a.c; v['Anneal h'] = a.h;
    v.note = tidy(`${v.note} ${BY}: the column heads "${a.words}", which gives the temperature and no time.`);
  }
}
for (const k of Object.keys(VALUE_KEEPS)) if (!values.some((v) => v.rows === k)) throw new Error(`VALUE_KEEPS names ${k}, which proposes no value`);

// Profiles the pipeline proposed, with cells from held readings of the same page.
const retyped = (row) => ({ ...row, ...typedOf({ ...row, 'Nozzle material': NP }) });
const proposedProfiles = rows(join(IN, 'profiles-add.csv')).map((p) => {
  const d = PROFILE_SETS[p.SourceID];
  if (!d) return p;
  const out = retyped({ ...p, ...d.set });
  out.quote = `${p.quote} | ${d.quote}`;
  if (d.locator) out.Locator = `${p.Locator}; ${d.locator}`;
  out.rows = [p.rows, ...(d.from ?? [])].join(' ');
  out.parsed_vs_read = 'agrees';
  out.note = tidy(`${p.note} ${BY}: ${d.note}`);
  decided.push({ kind: 'profile cell added', target: p.rows, what: `${p.GradeID} ${Object.entries(d.set).map(([k, v]) => `${k} "${v}"`).join('; ')}`, why: d.note });
  return out;
});
for (const k of Object.keys(PROFILE_SETS)) if (!proposedProfiles.some((p) => p.SourceID === k)) throw new Error(`PROFILE_SETS names ${k}, which proposes no profile`);

const sets = rows(join(IN, 'profiles-set.csv')).filter((s) => {
  const drop = DROP_SETS.some(([p, c]) => s.id === p && s.column === c);
  if (drop && s.column !== 'Locator') decided.push({ kind: 'cell not set', target: s.id, what: `${s.column} "${s.value}"`, why: 'Extrudr\'s "Adhesive: recommended" names no plate.' });
  return !drop;
});
for (const c of CELL_SETS) {
  const p = profiles.find((x) => x.ProfileID === c.profile);
  sets.push({ gate: 'ready', table: 'profiles', id: c.profile, column: c.column, expect: p[c.column], value: c.value, source: p.SourceID, quote: c.quote, note: tidy(`${c.locator}: the page prints "${c.value}". ${BY}: ${c.note}`), parsed_vs_read: 'agrees', cause: 'reviewer-kept', quote_view: '', grade_from: 'reviewer', reader: readings.get(c.from)?.Reader ?? '', rows: c.from, GradeID: p.GradeID });
  decided.push({ kind: 'held profile cell', target: c.profile, what: `${c.column} "${c.value}"`, why: c.note });
}
for (const [profile, locs] of Object.entries(Object.groupBy(CELL_SETS, (c) => c.profile))) {
  const p = profiles.find((x) => x.ProfileID === profile);
  const add = [...new Set(locs.map((c) => c.locator))].filter((l) => !p.Locator.includes(l));
  if (add.length) sets.push({ gate: 'ready', table: 'profiles', id: profile, column: 'Locator', expect: p.Locator, value: `${p.Locator}; ${add.join('; ')}`, source: p.SourceID, quote: locs[0].quote, note: 'Locator names the rows now read.', parsed_vs_read: 'agrees', cause: 'reviewer-kept', quote_view: '', grade_from: 'reviewer', reader: '', rows: locs[0].from, GradeID: p.GradeID });
}

// ---------------------------------------------------------------------------------------------------- the folder
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'values-add.csv'), csvText(valuesHeader, values));
writeFileSync(join(OUT, 'profiles-add.csv'), csvText(profilesHeader, proposedProfiles));
writeFileSync(join(OUT, 'profiles-set.csv'), csvText(setHeader, sets));
const used = new Set([...Object.keys(VALUE_KEEPS), ...Object.values(PROFILE_SETS).flatMap((d) => d.from ?? []), ...CELL_SETS.map((c) => c.from)]);
const held = rows(join(IN, 'held.csv')).filter((h) => !used.has(h.RowID));
writeFileSync(join(OUT, 'held.csv'), csvText(headerOf(join(IN, 'held.csv')), held));
const md = (s) => String(s).replace(/\|/g, '\\|');
writeFileSync(join(OUT, 'summary.md'), `# Stage 3 proposals, reviewed

> **Historical record** (2026-10-20): the executor's decisions on research intake 2's reading proposals. Written by
> \`ingest/review-r2.mjs\`; m489 applies this folder.

- ${values.length} values to add, ${proposedProfiles.length} profiles to add, ${sets.length} cells of held profiles to set.
- ${held.length} readings left held: settings no table column takes (print speed, fan, layer height, flow), readings
  already recorded from another document of the product, a page note the values carry already, Fiberon's annealing
  footnote (whose scope the research found unclear), units the page does not print, and labels with no property.
- Not here: the page context the pipeline proposed for Fiberon PET-GF15 (its asterisked footnote's scope is unclear).
  Cells a parser cannot read are typed by hand in m489, with their Parse review.

| Decision | Row | What | Why |
|---|---|---|---|
${decided.map((d) => `| ${d.kind} | ${md(d.target)} | ${md(d.what)} | ${md(d.why)} |`).join('\n')}
`);
console.log(JSON.stringify({ values: values.length, profiles: proposedProfiles.length, cellSets: sets.length, held: held.length, decisions: decided.length }));
