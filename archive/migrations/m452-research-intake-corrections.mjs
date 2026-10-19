#!/usr/bin/env node
// Migration m452 (2026-10-19): the corrections the research package of 2026-10-19 found on sheets already registered,
// and the profiles D168's readings type again (the research intake, stage 2; docs/audits/2026-10-19-research-intake/).
//
// An external research agent re-read the rows OPEN-PROBLEMS §6, §11 and §12 named (its findings F-0001 to F-0100 and
// F-0614, F-0615; the package stays outside the repository, archive/research-2026-10-19/ keeps its dispositions). Claude
// Opus (the executor) judged each finding, rejected the ones the data already held (F-0068 to F-0071), and checked every
// quote below on the cached, hash-checked sheet. What changes:
// - D168 (the owner's ruling of 2026-10-19): the readers learn three wordings, and the profiles they type are typed again
//   from the parsers: "Not mandatory, but it is recommended" and "Enclosed-frame (recommended), open-frame" are an
//   enclosure not needed; prose that asks for "stainless steel or other hardened alloys", or only cautions about wear, does
//   not require a hardened nozzle; "Once … opened … it is advised to dry" and "depending on moisture" are drying optional.
//   Three reviews that made the same reading by hand (P1283, P1285, P1304) are no longer needed; P1282 answers an FAQ's
//   "Can I print PET-GF15 on an open-frame printer?" with "Yes, but …", which only the page's question makes a not-needed.
// - Standards the readers learn (D168): "ISO 52 7" is ISO 527, "IS O 179" is ISO 179, and JIS K 7110, 7161, 7171 and
//   7210 are read as Japan's own standards (no ISO equivalence is assumed: the notched Izod headline asks ISO 180, so
//   Flashforge FABRIAL-R TPE's JIS K 7110 Izod no longer stands as its value). Three Raise3D rows had "X-Y 7 ISO 52 GB/T
//   1040" as their Standard / load, a garble of the line "ISO 52 7, GB/T 1040"; they take the line's words.
// - A test temperature printed in Fahrenheit is converted (72 °F is 22.2 °C, within the 23 ± 2 °C a headline asks):
//   Siraya Tech's Izod rows print "Notched 72F" in their label, kept in Standard / load, and now in Test temperature.
// - Ranges and spreads: Stratasys's dielectric constants "2.9 - 2.7" and "3.0 - 2.8" are ranges printed high first;
//   BASF's 103.2 MPa carried another row's upper bound; iSANMATE's "190--220" and Kimya's "21 - 25 g/10min" are ranges;
//   Polymaker's CoPE sheet prints 17 values as "2514.6±71.1 MPa", and twelve sheets whose legend says "Values in
//   parentheses are standard deviations" print one after each value: each is carried as the value's ±. Two ABS-M30
//   moduli whose bracket exceeds the value ("2.00 (27)" GPa) are left as they are (the unit of the bracket is not the
//   value's; OPEN-PROBLEMS §11).
// - Treatment: Spectrum's Polish PETG FR V0 heads its 0.45 MPa row "wyżarzone" (annealed, no schedule); Flashforge PET-CF
//   says under its table that "the printed model has not been annealed"; QIDI PET-GF's 1.8 MPa heat deflection (p. 2) is
//   in the table whose footer (p. 3) says "Post-processing: 100°C Annealing 8 hours", and prints "ISO 75: Method A".
// - Spectrum's I-TPU density row typed an editor's note into its raw cell ("(as printed; the density method is D792)"):
//   the raw cell keeps the sheet's own "ASTM D782".
// - AddNorth Koltron's tensile modulus of 562 MPa beside its own 2645 MPa flexural modulus is m425's class (a tensile
//   modulus a fifth of the same bars' bending one) and is flagged (D55).
// - Fourteen acceptances said their value "backs no headline" while it was the product's value (OPEN-PROBLEMS §6): each
//   value was confirmed on its page and stands; the reason now says so.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m452-research-intake-corrections.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote, settleFindings } from '../../scripts/lib/source-edits.mjs';
import { retype } from '../../scripts/lib/profile-settings.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { readTestTemperature } from '../../build/src/normalize/thermal.js';

const MIGRATION = 'm452';
const DATE = '2026-10-19';
const DRY = process.argv.includes('--dry-run');
const NA = 'Not applicable', NP = 'Not published';
const READ = 'read again by the research agent of 2026-10-19 and checked on the cached sheet by Claude Opus (research intake)';
const t = openTables();
const counts = {};
const count = (k, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
const standardsOf = (raw) => readStandards(raw).join('; ') || NP;

/** Set one measurement cell, guarded, and say once in Notes why. */
function setM(id, column, value, expect) {
  const r = t.get('measurements', id);
  if (r[column] === value) return false;
  if (r[column] !== expect) throw new Error(`${MIGRATION}: ${id} ${column} is "${r[column]}", not "${expect}": the data moved`);
  t.set('measurements', id, column, value, { expect, migration: MIGRATION });
  return true;
}
function note(id, text) {
  const r = t.get('measurements', id);
  const next = withNote(r.Notes, `Corrected ${DATE} (${MIGRATION}) against the source, ${READ}: ${text}`);
  if (next !== r.Notes) t.set('measurements', id, 'Notes', next, { expect: r.Notes, migration: MIGRATION });
}
function edit(id, source, quote, cells, why) {
  const r = t.get('measurements', id);
  if (r.SourceID !== source) throw new Error(`${MIGRATION}: ${id} is not on ${source}`);
  if (quote) onCachedSheet(t, source, quote, MIGRATION);
  let changed = false;
  for (const [column, [expect, value]] of Object.entries(cells)) changed = setM(id, column, value, expect) || changed;
  if (changed) { note(id, why); count('measurements corrected'); }
}

// 1. D168: the profiles the new readings type differently.
const RETYPE = {
  Enclosure: ['P0088', 'P0090', 'P0169', 'P0883', 'P0994'],
  Drying: ['P0117', 'P1808', 'P1810'],
  'Abrasion / clogging': ['P0499', 'P0528', 'P0869', 'P0886', 'P0899', 'P1259', 'P1662', 'P1664', 'P1682', 'P1805', 'P1829', 'P1842', 'P1846'],
};
for (const [column, ids] of Object.entries(RETYPE)) for (const id of ids) count('profile cells retyped (D168)', retype(t, id, [column], MIGRATION));
for (const id of ['P1283', 'P1285', 'P1304']) {
  const r = t.get('profiles', id);
  if (r['Parse review'] === NA) continue;
  if (!/^Fields: Enclosure state\. /.test(r['Parse review'])) throw new Error(`${MIGRATION}: ${id}'s Parse review is not the D33 enclosure review`);
  t.set('profiles', id, 'Parse review', NA, { expect: r['Parse review'], migration: MIGRATION });
  count('parse reviews the reader now makes');
}
{
  const id = 'P1282', r = t.get('profiles', id);
  onCachedSheet(t, r.SourceID, 'Can I print PET-GF15 on an open-frame printer?', MIGRATION);
  const review = 'Fields: Enclosure state. The cell answers the page\'s FAQ "Can I print PET-GF15 on an open-frame printer?" with "Yes, but for best results, an enclosed or heated-chamber printer is recommended": a filament its maker prints open needs no enclosure, and the recommendation stays in the raw cell (D168). Claude Opus, 2026-10-19.';
  if (r['Enclosure state'] !== 'not-needed') { t.set('profiles', id, 'Enclosure state', 'not-needed', { expect: 'recommended', migration: MIGRATION }); count('profile cells retyped (D168)'); }
  if (r['Parse review'] !== review) t.set('profiles', id, 'Parse review', review, { expect: r['Parse review'], migration: MIGRATION });
}

// 2. Standards and test temperatures the readers learn (D168).
for (const id of ['V002055', 'V007061', 'V014439', 'V014440', 'V014441', 'V014442', 'V014443', 'V014444', 'V014445', 'V014446']) {
  const r = t.get('measurements', id);
  edit(id, r.SourceID, null, { Standards: [r.Standards, standardsOf(r['Standard / load'])] }, `its Standard / load "${r['Standard / load']}" names ${standardsOf(r['Standard / load'])}, which the reader now reads (D168).`);
}
for (const [id, source] of [['V006925', 'D-RAISE3D-Raise3D-Industrial-PET-GF-TDS-V1'], ['V006993', 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e'], ['V007002', 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e']]) {
  const r = t.get('measurements', id);
  const raw = id === 'V007002' ? 'ISO 52 7, GB/T1040' : 'ISO 52 7, GB/T 1040';
  edit(id, source, raw, { 'Standard / load': [r['Standard / load'], raw], Standards: [r.Standards, standardsOf(raw)] },
    `the Standard / load cell held "${r['Standard / load']}", the row's label and value run into the standard; the sheet prints "${raw}", ISO 527 with a space inside the number (F-0054 to F-0056, D168).`);
}
{
  const r = t.get('measurements', 'V014791');
  edit('V014791', r.SourceID, null, { 'Test temperature °C': [NP, String(readTestTemperature(r['Test temperature']))] }, 'the sheet tests its notched Izod at 72 °F, which is 22.2 °C (F-0061, D168).');
}
for (const id of ['V009161', 'V009172', 'V009987', 'V009995']) {
  const r = t.get('measurements', id);
  if (!/^72F\b/.test(r['Standard / load'])) throw new Error(`${MIGRATION}: ${id}'s Standard / load does not print 72F`);
  onCachedSheet(t, r.SourceID, 'Notched 72F', MIGRATION);
  edit(id, r.SourceID, null, { 'Test temperature': [NP, '72F'], 'Test temperature °C': [NP, String(readTestTemperature('72F'))] },
    'the row\'s label prints "IZOD Impact (Notched 72F)": tested at 72 °F, 22.2 °C (F-0062, F-0063, D168).');
}
{
  const r = t.get('measurements', 'V002176');
  edit('V002176', 'I-TPU-TDS', 'Specific Gravity | 1.22 | ASTM D782', { 'Standard / load': [r['Standard / load'], 'ASTM D782'], Standards: [r.Standards, 'ASTM D782'] },
    'the raw cell carried an editor\'s note, "(as printed; the density method is D792)"; the sheet prints "ASTM D782" alone, and the raw cell keeps its words (F-0067).');
}

// 3. Ranges, spreads and brackets.
edit('V015336', 'R-STRATASYS-mds-fdm-absm30i-0621a', 'Dielectric Constant | ASTM D150-98 | 2.9 - 2.7',
  { 'Raw numeric': ['2.9', '2.7'], 'Raw upper bound': ['2.7', '2.9'], 'Normalized value': ['2.9', '2.7'], 'Normalized upper bound': ['2.7', '2.9'] },
  'the sheet prints the range "2.9 - 2.7" high end first; its low end is 2.7 and its high end 2.9 (F-0049).');
edit('V015337', 'R-STRATASYS-mds-fdm-pciso-0820a', 'Dielectric Constant | ASTM D150-98 | 3.0 - 2.8',
  { 'Raw numeric': ['3', '2.8'], 'Raw upper bound': ['2.8', '3'], 'Normalized value': ['3', '2.8'], 'Normalized upper bound': ['2.8', '3'] },
  'the sheet prints the range "3.0 - 2.8" high end first; its low end is 2.8 and its high end 3.0 (F-0050).');
edit('V007622', 'R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5', 'Tensile strength dry ISO 527 103.2',
  { 'Raw upper bound': ['18.2', NA], 'Normalized upper bound': ['18.2', NA] },
  'the sheet prints 103.2 MPa in its XY column, a point; the text layer runs it into the next column\'s 18.2, which was read as an upper bound (that is its grade\'s Z value, V002466) (F-0051).');
edit('V000506', 'I-PETG-Glass-Fiber-Technical-Data-Sheet', 'Melting point | °C | DSC | 190--220',
  { 'Raw upper bound': [NA, '220'], 'Normalized upper bound': [NA, '220'] }, 'the sheet prints the range "190--220" (F-0052).');
edit('V015015', 'R-KIMYA-QR-20261007-01ba14075179', '21 - 25 g/10min',
  { 'Raw upper bound': [NA, '25'], 'Normalized upper bound': [NA, '25'] }, 'the sheet prints the range "21 - 25 g/10min" (F-0053).');

const round = (x) => String(Number(x.toPrecision(12)));
const num = (s) => (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? Number(s.replace(/,/g, '')) : Number(s.replace(',', '.')));
function spread(r, value, sd, why) {
  const factor = Number(r['Conversion factor']);
  if (!Number.isFinite(factor)) throw new Error(`${MIGRATION}: ${r.MeasurementID} has no conversion factor`);
  if (Math.abs(Number(r['Raw numeric']) - value) > 1e-9) throw new Error(`${MIGRATION}: ${r.MeasurementID} prints ${value}, not its Raw numeric ${r['Raw numeric']}`);
  edit(r.MeasurementID, r.SourceID, null, { 'Raw uncertainty ±': [r['Raw uncertainty ±'], round(sd)], 'Normalized uncertainty ±': [r['Normalized uncertainty ±'], round(sd * factor)] }, why);
}
for (const r of t.rows('measurements').filter((x) => x.SourceID === 'R-POLYMAKER-QR-20261007-8106f1c5c75e' && /±/.test(x['Raw value']) && x['Raw uncertainty ±'] === NA)) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*±\s*(\d+(?:\.\d+)?)/.exec(r['Raw value']);
  spread(r, Number(m[1]), Number(m[2]), `the sheet prints "${r['Raw value']}": the spread after ± is the value's (F-0072 to F-0088).`);
}
const SD_SHEETS = {
  'R-ESSENTIUM-TDS-Essentium-PA-CF': 'Standard deviations listed in parentheses',
  'R-STRATASYS-FDM-NYLON12-MDS': 'Values in parenthesis are standard deviations',
  'R-STRATASYS-fdm-nylon-cf10-material-datasheet': 'Values in parenthesis are standard deviations',
  'R-STRATASYS-mds-fdm-abs-m30-0826a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-absesd7-0222a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-antero-800na-0825a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-asa-0826a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-hips-0823a': 'Values in parenthesis are standard deviations',
  'R-STRATASYS-mds-fdm-pa6-66-gf30-fr-0726a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-pc-0426a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-pc-abs-0823a': 'Values in parentheses are standard deviations',
  'R-STRATASYS-mds-fdm-ultem-1010-resin-0626a': 'Values in parentheses are standard deviations',
};
const BRACKET = /^\s*(-?[\d.,]+)\s*\(\s*([\d.,]+)\s*\)\s*([^()\d]*)$/;
for (const [source, legend] of Object.entries(SD_SHEETS)) {
  onCachedSheet(t, source, legend, MIGRATION);
  for (const r of t.rows('measurements').filter((x) => x.SourceID === source && !/^Retired/.test(x['Data status']) && [NA, NP].includes(x['Raw uncertainty ±']))) {
    const m = BRACKET.exec(r['Raw value']);
    if (!m) continue;
    const value = num(m[1]), sd = num(m[2]);
    // A bracket as large as its value is not the value's spread in the value's unit ("2.00 (27)" GPa): left as printed.
    if (!(sd < value)) { count('brackets left (larger than the value)'); continue; }
    spread(r, value, sd, `the sheet's legend says "${legend}"; the bracket after "${r['Raw value']}" is the value's spread (F-0089 to F-0100).`);
  }
}

// 4. Treatment.
{
  edit('V006277', 'S-SPECTRUM-pl-tds-spectrum-petg-frv0', 'HDT 0,45 MN/m2, wyżarzone',
    { 'Post-processing': [NP, 'wyżarzone'], 'Post-processing state': ['not-stated', 'annealed'], 'Anneal °C': [NA, NP], 'Anneal h': [NA, NP] },
    'the row is headed "HDT 0,45 MN/m2, wyżarzone" (Polish: annealed), with no schedule; it is an annealed bar\'s value, and no longer the as-printed heat deflection (F-0047).');
}
edit('V005316', 'D-FLASH-PET-CF-TDS-EN', 'the printed model has not been annealed',
  { 'Post-processing': [NP, 'the printed model has not been annealed'], 'Post-processing state': ['not-stated', 'as-printed'] },
  'the note under the table says "The above test parameter data are obtained from actual printing, and the printed model has not been annealed" (F-0614).');
edit('V008153', 'R-QIDI-PET-GF', 'ISO 75: Method A | Post-processing: 100°C Annealing 8 hours',
  { 'Standard / load': ['1.80MPa', 'ISO 75: Method A (1.80MPa)'], Standards: [NP, 'ISO 75'],
    'Post-processing': [NP, 'Post-processing: 100°C Annealing 8 hours'], 'Post-processing state': ['not-stated', 'annealed'], 'Anneal °C': [NA, '100'], 'Anneal h': [NA, '8'] },
  'p. 2 prints "ISO 75: Method A" with "99.1°C (1.80MPa)", in the property table that runs on to p. 3, whose footer says "Post-processing: 100°C Annealing 8 hours" (PC00085 reads it for p. 3) (F-0615).');

// 5. Koltron's tensile modulus, m425's class.
{
  const id = 'V010180', r = t.get('measurements', id);
  if (r['Data status'] !== 'Published value (physically implausible)') {
    onCachedSheet(t, r.SourceID, 'Tensile Modulus | ISO 527 | MPa | 562', MIGRATION);
    t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: 'Published value', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55): the sheet prints a tensile modulus of 562 MPa beside its own flexural modulus of 2645 MPa for the same material; a printed bar's two moduli are within a factor of about 1.5 (m425's class), so the figure is not the bars' modulus. Kept as printed; it backs nothing (F-0017).`), { expect: r.Notes, migration: MIGRATION });
    count('values flagged');
  }
}

// 6. Acceptances that said a product's value backs nothing.
const CONFIRMED = { V005008: 'F-0001', V005198: 'F-0003', V005228: 'F-0004', V005347: 'F-0005', V005367: 'F-0007', V005368: 'F-0008', V005465: 'F-0009', V005602: 'F-0010', V005617: 'F-0011', V005726: 'F-0012', V005729: 'F-0013', V005859: 'F-0014', V005861: 'F-0015', V005863: 'F-0016' };
const STALE = /\s*The value is recorded as printed and backs no headline it could not\.\s*$/;
{
  const { readCsv } = await import('../../build/src/csv.js');
  const rows = readCsv(new URL('../../data/review/accepted-findings.csv', import.meta.url).pathname).records.map((r) => r.values);
  const accept = [], drop = [];
  for (const row of rows.filter((x) => x.Table === 'measurements' && CONFIRMED[x.Record] && STALE.test(x.Reason))) {
    drop.push({ Code: row.Code, Table: row.Table, Record: row.Record, Field: row.Field });
    accept.push({ ...row, Reason: row.Reason.replace(STALE, ` Confirmed on its page by the research intake of ${DATE} (${CONFIRMED[row.Record]}): it is this product's value, and nothing else its sheet prints rules it out, so it stands and decides.`) });
  }
  const { added, dropped } = settleFindings(t, { accept, drop, date: DATE });
  count('acceptance reasons rewritten', Math.min(added, dropped));
}

console.log(`${MIGRATION}${DRY ? ' (dry run)' : ''}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing to do'}`);
if (!DRY && Object.keys(counts).length) t.save();
