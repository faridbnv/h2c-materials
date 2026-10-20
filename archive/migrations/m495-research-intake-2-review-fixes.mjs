#!/usr/bin/env node
// Migration m495 (2026-10-20): the independent review's fixes to research intake 2 (R01 to R04, R09;
// docs/audits/2026-10-20-research-intake-2/README.md, "Review"). Read by Claude Opus 5.5 on the cached pages; each quote is
// checked there. A re-run is a no-op; a run after the data moved stops.
//
// - R01. Polymaker's PolyMide PA12-CF information sheet (b50) prints the data sheet's heat deflection at 1.8 MPa, 105 °C,
//   under "80 °C Annealed", beside "/" as printed. The data sheet's copy (V000977) carries no condition: it is retired as
//   a duplicate of the information sheet's row, recorded here, as Raise3D's were (m491). The data sheet's 131 °C at
//   0.45 MPa (V000978) has no labelled twin on Polymaker's documents, but its table is the one Raise3D's white paper
//   prints as annealed (131 and 105 °C, 3304 and 3535 MPa): it is typed annealed, schedule not stated, with its Parse
//   review. Read as not stated, it made PolyMide PA12-CF PA12-CF's as-printed heat deflection in Warm environment.
// - R02. Forward AM's recommended column prints "-" for the build chamber (p. 3); P1990 left it Not published, so the
//   polyolefins' row filled it. A sheet's "-" is a statement and is never filled (AGENTS.md), as Forward AM's other sheets
//   are typed.
// - R03. A value whose own table points to reference or resin figures stays apart whatever the plastic (D172, D177):
//   AzureFilm's heat deflection sits in its "Typical properties" table (ISO 294, the moulding standard, beside it), apart
//   from its "Typical properties (3D printed)"; Filamentive's sheet prints "Typical Value" figures "intended for reference
//   purposes only"; Fiberlogy's current sheet says its figures were "gathered from standard reference materials and/or
//   supplier test data".
// - R04. Forward AM's flexural table heads its footnote 5, "Samples were conditioned in standard climate (23°C, 50% RH
//   72h)", as its tensile table does: its flexural rows are conditioned.
// - R09. Sakata's "Moisture absorption" to ISO 62 is a water uptake, not the moisture a spool ships with: Water absorption.
//
//   node scripts/migrate/m495-research-intake-2-review-fixes.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { addValue } from '../../scripts/lib/source-edits.mjs';
import { typedOf } from '../../scripts/lib/profile-settings.mjs';

const MIGRATION = 'm495';
const DATE = '2026-10-20';
const NP = 'Not published';
const t = openTables();
const out = { added: 0, retired: 0, retyped: 0, cells: 0 };
const set = (table, id, column, value) => {
  const r = t.get(table, id);
  if (r[column] === value) return false;
  t.set(table, id, column, value, { expect: r[column], migration: MIGRATION });
  out.cells++;
  return true;
};
const note = (id, words) => { const r = t.get('measurements', id); if (!r.Notes.includes(`(${MIGRATION})`)) set('measurements', id, 'Notes', `${r.Notes} ${words}`); };

// ---- R01: PolyMide PA12-CF's heat deflection ----------------------------------------------------------------------
const PIS = 'R-POLYMAKER-INTAKE-20261020-bf1a52b7bfb4', TDS = 'S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1';
onSheet(t, PIS, 'As Printed 80 °C Annealed | HDT @ 1.8 MPa 105 °C | The annealing process consists of putting the model in an oven at 80˚C', MIGRATION);
if (t.get('measurements', 'V000977').SourceID !== TDS || t.get('measurements', 'V000977')['Normalized value'] !== '105') throw new Error(`${MIGRATION}: V000977 moved`);
const LOCATOR = 'p. 6: HDT @ 1.8 MPa (80 °C Annealed)';
let twin = t.rows('measurements').find((m) => m.SourceID === PIS && m.Locator === LOCATOR);
if (!twin) {
  const id = addValue(t, {
    like: 'V000977', migration: MIGRATION, date: DATE, why: 'published in the source, never transcribed.',
    set: {
      SourceID: PIS, Locator: LOCATOR, 'Specimen type': 'Printed (implied by the document)', 'Specimen / print parameters': NP,
      'Post-processing': '80 °C Annealed', 'Post-processing state': 'annealed', 'Anneal °C': '80', 'Anneal h': NP,
      'Moisture condition': NP, 'Moisture state': 'not-stated', 'Standard / load': 'HDT @ 1.8 MPa', Standards: NP, 'Test load MPa': '1.8',
    },
    note: 'p. 6 prints "HDT @ 1.8 MPa": "/" under As Printed and "105 °C" under "80 °C Annealed"; the sheet\'s annealing paragraph above the table puts the model "in an oven at 80˚C for 6 hours", which the column heading does not repeat. Printed bars, before and after annealing (D172). Read by Claude Opus 5.5 on the cached text and the page image, and by the round\'s independent reviewer on the image (R01).',
  });
  twin = t.get('measurements', id);
  out.added++;
}
const PIS_REVIEW = 'Fields: Anneal °C. The column heads "80 °C Annealed" (p. 6), a temperature before the word, which the parser does not read: 80 °C; the heading gives no time, and the sheet\'s annealing paragraph says 6 hours (research intake 2, m495, R01).';
set('measurements', twin.MeasurementID, 'Parse review', PIS_REVIEW);
if (t.get('measurements', 'V000977')['Data status'] !== 'Retired duplicate record') {
  set('measurements', 'V000977', 'Data status', 'Retired duplicate record');
  note('V000977', `Retired duplicate record (${MIGRATION}): Polymaker's PolyMide PA12-CF information sheet prints this figure under "80 °C Annealed", beside "/" as printed (${twin.MeasurementID}, which stays); the data sheet prints it without its condition.`);
  out.retired++;
}
const V978_REVIEW = 'Fields: Post-processing state. The data sheet prints 131 °C at 0.45 MPa with no condition. Its table is the one Raise3D\'s white paper prints for its PA12 CF as "100℃ Annealed" (131 °C at 0.45 MPa, 105 °C at 1.8 MPa, 3304 MPa, 3535 MPa), and Polymaker\'s own information sheet prints its 105 °C at 1.8 MPa as "80 °C Annealed": an annealed bar, its schedule stated two ways (research intake 2, m495, R01).';
if (t.get('measurements', 'V000978')['Parse review'] !== V978_REVIEW) {
  if (t.get('measurements', 'V000978')['Normalized value'] !== '131') throw new Error(`${MIGRATION}: V000978 moved`);
  set('measurements', 'V000978', 'Post-processing state', 'annealed');
  set('measurements', 'V000978', 'Anneal °C', NP);
  set('measurements', 'V000978', 'Anneal h', NP);
  set('measurements', 'V000978', 'Parse review', V978_REVIEW);
  out.retyped++;
}

// ---- R02: Forward AM's build chamber "-" -------------------------------------------------------------------------
// An image-only page: checked on its optical reading.
onCachedSheet(t, 'R-FORWARDAM-INTAKE-20261020-bd7cbd47d8e7', 'Build Chamber - Passively heated (cover)', MIGRATION);
if (t.get('profiles', 'P1990')['Chamber °C'] !== '-') {
  if (t.get('profiles', 'P1990').GradeID !== 'G084-03') throw new Error(`${MIGRATION}: P1990 is not Forward AM PP GF30's`);
  set('profiles', 'P1990', 'Chamber °C', '-');
  const typed = typedOf({ ...t.get('profiles', 'P1990'), 'Nozzle material': NP });
  for (const c of ['Chamber state', 'Chamber min °C', 'Chamber max °C', 'Chamber requirement']) set('profiles', 'P1990', c, typed[c]);
  const loc = t.get('profiles', 'P1990').Locator;
  if (!loc.includes('Build Chamber')) set('profiles', 'P1990', 'Locator', `${loc}; p. 3: Build Chamber Temperature (recommended column: "-")`);
}

// ---- R03: figures whose table points to reference or resin values -----------------------------------------------
const RESIN = 'Not published (its document points to moulded or resin bars)';
const R03 = [
  ['V015753', 'R-AZUREFILM-INTAKE-20261020-8168f14e3afb', 'Melting temp. ISO 294 200-250 °C | Heat deflect. temp. ISO 75 86 °C', 'Its "Typical properties" table, beside ISO 294 (the moulding standard) and apart from the sheet\'s "Typical properties (3D printed)" table, points to resin figures (R03).'],
  ['V015718', 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede', 'Typical Value | intended for | reference purposes only', 'The sheet prints "Typical Value" figures "intended for reference purposes only", the PLA resin\'s figures other makers reprint (m491, R03).'],
  ['V015719', 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede', 'Typical Value | reference purposes only', 'As V015718 (R03).'],
  ['V015720', 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede', 'Typical Value | reference purposes only', 'As V015718 (R03).'],
  ['V015824', 'R-FILAMENTIVE-INTAKE-20261020-74ea25479ede', 'Typical Value | reference purposes only', 'As V015718 (R03).'],
  ['V015810', 'R-FIBERLOGY-INTAKE-20261020-f5fc266cf423', 'gathered from standard reference materials and/or supplier test data', 'The sheet says its figures were "gathered from standard reference materials and/or supplier test data", as its earlier edition\'s rows are typed (R03).'],
];
for (const [id, source, quote, why] of R03) {
  const m = t.get('measurements', id);
  if (m.SourceID !== source) throw new Error(`${MIGRATION}: ${id} is not on ${source}`);
  onCachedSheet(t, source, quote, MIGRATION);
  if (m['Specimen type'] === RESIN) continue;
  set('measurements', id, 'Specimen type', RESIN);
  note(id, `Specimen type (${MIGRATION}): ${why}`);
  out.retyped++;
}

// ---- R04: Forward AM's flexural rows, conditioned ------------------------------------------------------------------
const CONDITIONED = 'Samples were conditioned in standard climate (23°C, 50% RH 72h)';
for (const m of t.rows('measurements').filter((x) => x.SourceID === 'R-FORWARDAM-INTAKE-20261020-bd7cbd47d8e7' && x.Property.startsWith('Flexural'))) {
  if (m['Moisture state'] === 'conditioned') continue;
  set('measurements', m.MeasurementID, 'Moisture condition', CONDITIONED);
  set('measurements', m.MeasurementID, 'Moisture state', 'conditioned');
  note(m.MeasurementID, `Moisture (${MIGRATION}): the flexural table's heading carries footnote 5, "${CONDITIONED}", as the tensile table's does (R04).`);
  out.retyped++;
}

// ---- R09: Sakata's moisture absorption --------------------------------------------------------------------------
for (const id of ['V015772', 'V015783']) {
  const m = t.get('measurements', id);
  if (!/^R-SAKATA-INTAKE-20261020-/.test(m.SourceID)) throw new Error(`${MIGRATION}: ${id} is not Sakata's`);
  if (m.Property === 'Water absorption') continue;
  set('measurements', id, 'Property', 'Water absorption');
  note(id, `Property (${MIGRATION}): the sheet's "Moisture absorption" to ISO 62 is a water uptake beside its water absorption, not the moisture a spool ships with (R09).`);
  out.retyped++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...out, written: false })); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...out }));
