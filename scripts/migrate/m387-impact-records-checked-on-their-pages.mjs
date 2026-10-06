#!/usr/bin/env node
// Migration m387 (2026-10-06): impact records the planning of the impact round found wrong, each decided on its page
// (D133; GOALS 2026-10-06, later).
//
// - Two rows sat on another product than the page they come from names. Fiberlogy's "PLA Impact Filament" page prints
//   "Izod impact strength (notched) @ 23°C: 160 J/m (ASTM D256)" (V013177): it is Fiberlogy IMPACT PLA's (G001-55),
//   not Spectrum PLA Pro's; the source row already names that product first. FormFutura's MagicFil Thermo PLA sheet prints
//   EasyFil PLA's table, whose "Impact strength 7.5" EasyFil PLA already holds (V009581) and MagicFil Thermo PLA reads as
//   its twin: the second copy (V013270) is retired as a duplicate.
// - 3DJake's sheet R-3DJAKE-3DJAKE-14-TDS-hyper-PLA-CF-EN is headed "Hyper-PLA+ Filament Technical Data Sheet" but is
//   Creality's Hyper PLA-CF: "HYPER PLA CF is filled with 4% carbon fiber material", with a flexural modulus of 5003 MPa
//   beside Hyper-PLA+'s 2490. Its eight values, its profile and its three statements were filed on Hyper-PLA+ (G001-122),
//   which then held two sheets' numbers. They move to a grade of their own under PLA-CF (M018), G018-20.
// - colorFabb PLA High Speed PRO's notched Charpy of 27.9 kJ/m² is printed on two of its documents. m127 flagged one
//   copy (V005980) physically implausible ("a PLA that breaks at 5.7 % … 27.9 is an unnotched value"); the other copy
//   (V012707) is its value. The physics does not hold: Polymaker's PolyMax PLA publishes 38.9 notched at the same 5.7 %,
//   and colorFabb sells this one as toughened (product_claims.csv). The flag is lifted, so the two copies agree.
// - Eleven notched impact rows cite ISO 179 "1eU" (or 180/U), the unnotched method code. On every one of these sheets the
//   table prints an unnotched row and a notched row with the same code in the method column (Nanovia swaps 1eA and 1eU
//   between its "notched" and "full" rows), so the row's label is what tells the bars apart. The notch stays the label's;
//   each row says why.
// - BASF's extended sheets head their ISO 180 Izod column "J/m" and print 8.7, 5.7, 2.4: ISO 180 reports kJ/m², and an
//   Izod of 8.7 J/m (about 0.9 kJ/m²) is not an ASA's. The numbers stay as printed and are flagged physically
//   implausible; they were never compared (J/m is not kJ/m², D94), and now say why beside them.
//
// Each quote is checked on the cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m387-impact-records-checked-on-their-pages.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm387';
const DATE = '2026-10-06';
const IMPLAUSIBLE = 'Published value (physically implausible)';
const t = openTables();
let cells = 0;
const note = (table, id, column, text) => {
  const row = t.get(table, id);
  if (String(row[column]).includes(`(${MIGRATION})`)) return;
  t.set(table, id, column, `${row[column]} ${text} (${MIGRATION})`.trim(), { expect: row[column], migration: MIGRATION });
  cells++;
};
const move = (table, id, from, to, materialFrom, materialTo, why) => {
  const row = t.get(table, id);
  if (row.GradeID === to) return;
  if (row.GradeID !== from) throw new Error(`${MIGRATION}: ${table} ${id} is on ${row.GradeID}, not ${from}; the data moved`);
  t.set(table, id, 'GradeID', to, { expect: from, migration: MIGRATION });
  if (materialTo !== materialFrom) t.set(table, id, 'MaterialID', materialTo, { expect: materialFrom, migration: MIGRATION });
  cells++;
  if (table === 'measurements') note(table, id, 'Notes', `Moved ${DATE} from ${from} to ${to}: ${why}`);
};

// 1. Two rows on another product.
onCachedSheet(t, 'D-FIBERLOGY-PLA-IMPACT-FILAMENT-PAGE', 'Izod impact strength (notched) @ 23°C: 160 J/m (ASTM D256)', MIGRATION);
move('measurements', 'V013177', 'G001-16', 'G001-55', 'M001', 'M001', 'the page is Fiberlogy\'s "PLA Impact Filament" (IMPACT PLA), not Spectrum PLA Pro');
// MagicFil Thermo PLA (G001-190) is EasyFil PLA's twin: one formulation key, and its sheet prints EasyFil's table
// (R053), so the table's values are recorded once, on EasyFil PLA (V009581), and MagicFil Thermo reads them. The copy
// read from the MagicFil sheet (V013270) is that same value again: it is retired as a duplicate, not moved.
onCachedSheet(t, 'S-PET-TDS-MagicFil-Thermo-PLA', 'MagicFil', MIGRATION);
const magic = t.get('measurements', 'V013270');
if (magic['Data status'] !== 'Retired duplicate record') {
  const twin = t.get('measurements', 'V009581');
  if (magic.GradeID !== 'G001-159' || twin['Normalized value'] !== magic['Normalized value'] || twin.Property !== magic.Property) throw new Error(`${MIGRATION}: V013270 is not V009581's value again; the data moved`);
  t.set('measurements', 'V013270', 'Data status', 'Retired duplicate record', { expect: magic['Data status'], migration: MIGRATION });
  cells++;
  note('measurements', 'V013270', 'Notes', `Retired duplicate record ${DATE}: the MagicFil Thermo PLA sheet prints EasyFil PLA's table, which MagicFil Thermo PLA reads as EasyFil PLA's twin (one formulation key, R053); the value is held once, as V009581.`);
}

// 2. Hyper PLA-CF, a product of its own.
const CF = 'R-3DJAKE-3DJAKE-14-TDS-hyper-PLA-CF-EN';
const HYPER_CF = 'G018-20';
onCachedSheet(t, CF, 'HYPER PLA CF is filled with 4% carbon fiber material', MIGRATION);
if (!t.find('grades', HYPER_CF)) {
  t.append('grades', {
    GradeID: HYPER_CF, MaterialID: 'M018', Role: 'procurement', Status: 'active', Manufacturer: 'Creality', 'Product name': 'Hyper PLA-CF',
    'Shared formulation key': CF, 'Composition / filler': 'PLA with 4 % carbon fibre (p. 1: "HYPER PLA CF is filled with 4% carbon fiber material")',
    Variant: 'Not applicable', 'Colour caveat': 'Properties may vary by colour; use TDS scope', Availability: 'Not published', 'Certification claims': 'Not published',
    'Selected-grade rationale': `Documented commercial formulation; traceable manufacturer evidence. Its sheet, headed "Hyper-PLA+ Filament Technical Data Sheet", is the carbon-fibre product's (${MIGRATION})`,
    SourceID: CF, 'Source locator': 'TDS p. 1: Product introduction', 'Diameter compatibility': 'Check 1.75 mm variant; diameter is not part tolerance',
  });
  cells++;
}
const why = 'the sheet is Creality Hyper PLA-CF ("HYPER PLA CF is filled with 4% carbon fiber material"), headed Hyper-PLA+ in error';
for (const r of t.rows('measurements').filter((x) => x.SourceID === CF)) move('measurements', r.MeasurementID, 'G001-122', HYPER_CF, 'M001', 'M018', why);
for (const r of t.rows('profiles').filter((x) => x.SourceID === CF)) move('profiles', r.ProfileID, 'G001-122', HYPER_CF, 'M001', 'M018', why);
for (const r of t.rows('evidence').filter((x) => x.SourceID === CF)) move('evidence', r.EvidenceID, 'G001-122', HYPER_CF, 'M001', 'M018', why);
const source = t.get('sources', CF);
if (source['Applicable grades'] !== HYPER_CF) { t.set('sources', CF, 'Applicable grades', HYPER_CF, { expect: 'G001-122', migration: MIGRATION }); cells++; }

// 3. colorFabb PLA High Speed PRO's 27.9: the flag lifted.
const hs = t.get('measurements', 'V005980');
if (hs['Data status'] === IMPLAUSIBLE) {
  onCachedSheet(t, hs.SourceID, '27.9', MIGRATION);
  t.set('measurements', 'V005980', 'Data status', 'Published value', { expect: IMPLAUSIBLE, migration: MIGRATION });
  cells++;
  note('measurements', 'V005980', 'Notes', `Flag lifted ${DATE}: the same 27.9 notched is on colorFabb's second document (V012707); PolyMax PLA publishes 38.9 notched at the same 5.7 % elongation, so the elongation does not rule it out, and colorFabb sells this PLA as toughened.`);
}

// 4. A notched row whose method column prints the unnotched code.
const ONE_EU = ['V001006', 'V006515', 'V002093', 'V002346', 'V002719', 'V002730', 'V002992', 'V007524', 'V014750', 'V007532', 'V009220'];
for (const id of ONE_EU) {
  const m = t.get('measurements', id);
  if (m.Notch !== 'Notched') throw new Error(`${MIGRATION}: ${id} is not a notched row; the data moved`);
  note('measurements', id, 'Notes', `Notch ${DATE}: the row's label says notched while its method column prints ${/180/.test(m['Standard / load']) ? 'the unnotched code' : '1eU'}; the sheet prints an unnotched row beside it (or, at Nanovia, swaps 1eA and 1eU between its notched and full rows), so the label tells the bars apart and the notch stays the label's.`);
}

// 5. BASF's ISO 180 Izod column headed J/m.
const BASF = { 'R-BASF-ExtendedTDS-Ultrafuse-ASA-V2-1': 'Impact Strength Izod ISO 180 8.7 J/m', 'R-BASF-ExtendedTDS-Ultrafuse-PET-CF15-V1-4': 'Impact Strength Izod', 'R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5': 'Impact Strength Izod' };
for (const [sid, quote] of Object.entries(BASF)) {
  onCachedSheet(t, sid, quote, MIGRATION);
  for (const m of t.rows('measurements').filter((x) => x.SourceID === sid && x.Property === 'Izod impact strength' && x['Normalized unit'] === 'J/m')) {
    if (m['Data status'] === IMPLAUSIBLE) continue;
    if (m['Data status'] !== 'Published value') throw new Error(`${MIGRATION}: ${m.MeasurementID} is ${m['Data status']}; the data moved`);
    t.set('measurements', m.MeasurementID, 'Data status', IMPLAUSIBLE, { expect: 'Published value', migration: MIGRATION });
    cells++;
    note('measurements', m.MeasurementID, 'Notes', `Flagged physically implausible ${DATE}: the sheet heads its ISO 180 column "J/m", but ISO 180 reports kJ/m², and an Izod of ${m['Raw numeric'] ?? m['Normalized value']} J/m is not this material's; kept as printed, never converted.`);
  }
}

if (cells) t.save();
console.log(`${MIGRATION}: ${cells} cell(s)`);
