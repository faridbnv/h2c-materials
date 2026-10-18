#!/usr/bin/env node
// Migration m441 (2026-10-18): one heat deflection figure that two documents of one product, or a product and its twin,
// print at two loads (D149; the screening review's change C15, finding F27). Each page read by Claude Opus 5.5 on its
// cached text, beside the screening build's re-read dossier (a Claude Sonnet reader, 2026-10-18).
//
// PR08 now compares a product's documents and its twins' sheets (m438). Where two documents give one number both loads,
// which label is right cannot be read from the pages, and no load is guessed. One reading is safe either way: a heavier
// load cannot deflect a bar at a higher temperature, so if the number is the 1.8 MPa value the product's 0.45 MPa value is
// at least that number, and if it is the 0.45 MPa value it is that number. The 0.45 MPa reading therefore stands, and
// the 1.8 MPa reading, which could overstate the product, is held back (Data status "Unresolved unit / layout", the
// reason in Notes) until the maker says which load it is:
// - Fiberlogy FiberWORKS PETG: its product page prints 70 °C "@ 1.8 MPa" (V013149), its data sheet the same 70 °C
//   "@ 0.45 MPa" (V005480); every other figure the two print agrees.
// - Fiberlogy PP: its data sheet prints 51 °C "@ 1.8 MPa" (V009228), its product page the same 51 °C "@ 0.45 MPa"
//   (V012179), beside the same density, strength, modulus, Vicat and glass transition.
// - colorFabb PA Blue Metal Detectable: its July 2023 sheet prints 90 °C as "Heat Deflection Temperature (A)" beside
//   "Heat Deflection temperature (amorphous) 60" and defines "(A)" nowhere (m359 read it as ISO 75 method A, 1.8 MPa);
//   its November 2023 revision prints the same 90 °C as "HDT-B" (0.45 MPa), from the supplier of the raw material. Beside
//   "(amorphous)", "(A)" may as well name a crystallised (annealed) bar, so neither the load nor the state of the 90 °C
//   can be read; V011126 is held back.
// - Spectrum S-Flex Carbon: the 2025 portfolio prints "HDT A - 134°C" (V012429, typed 1.8 MPa by m421 from its method
//   letter), where the product's own data sheet prints 134 °C at 0.45 MN/m² and 70 °C at 1.81 MN/m² (injection moulding).
//   The portfolio is a summary and the sheet the product's own statement (OPEN-PROBLEMS §32.8); its explicit loads put
//   the 134 °C at 0.45 MPa. V012429 is held back. (HDT does not apply to S-Flex Carbon, a TPU, so nothing moves.)
// One twin pair, and two pairs across documents that each keep the order, are settled too:
// - FormFutura ApolloX Kevlar prints 95 °C at 1.81 MN/m² beside 89 °C at 0.45 (V007526, flagged by m134); its twin,
//   Spectrum ASA Kevlar, one formulation (R053), prints 89 °C and 79 °C (injection moulding). The 95 °C is the figure out
//   of line: flagged as its pair is.
// - Fiberlogy PLA MINERAL's 2025 revision prints 48 °C at 0.45 MPa where its 2021 sheet prints 55 °C at 0.45 and 50 °C at
//   1.8 MPa; Fiberlogy R PP's product page prints 40 °C at 0.45 MPa where its 2022 sheet prints 80 and 65 °C. Each
//   document keeps the order; the documents disagree. Accepted with the reason; both stay as printed.
// Colorfabb ASA (its 2023 raw-material "HDT-B 87" beside its 2020 sheet's 96 °C at 0.45 and 87 °C at 1.8 MPa) and Prusament
// rPLA Natural Pigments (two colourways' sheets, each printing both loads) need nothing: the 2020 ASA sheet prints both
// loads in order, and the 2023 figure is a raw-material value that never decides for a printed part; the Prusament Wine
// sheet's own 59 °C / 60 °C stays accepted as within ISO 75's repeatability (m344), and its documents raise no new pair.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m441-one-hdt-at-two-loads.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote, settleFindings } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm441';
const DATE = '2026-10-18';
const HELD = 'Unresolved unit / layout';
const FLAG = 'Published value (physically implausible)';
const t = openTables();
let n = 0;

const SAFE = 'A heavier load cannot deflect a bar at a higher temperature, so whichever label is right the product\'s HDT at 0.45 MPa is at least this figure: the 0.45 MPa reading stands, and this 1.8 MPa reading, which could overstate the product, is held back and backs nothing until the maker says which load it is (D149).';
const HOLDS = [
  ['V013149', 'D-FIBERLOGY-FIBERWORKS-PETG-FILAMENT-PAGE', 'Heat Deflection Temperature @ 1.8 MPa: 70°C (ASTM D648)',
    ['R-FIBERLOGY-FiberWORKS-PETG-TDS', 'Heat Distortion Temperature @ 0.45 MPa ASTM D648 °C 70'],
    `Fiberlogy's product page prints this 70 °C "@ 1.8 MPa"; its data sheet prints the same 70 °C "@ 0.45 MPa" (V005480), and the other figures the two print agree. One label is wrong and neither document says which. ${SAFE}`],
  ['V009228', 'R-FIBERLOGY-FIBERLOGY-PP-TDS', 'Heat Distortion Temperature @ 1.8 MPa ISO 75 °C 51',
    ['D-FIBERLOGY-PP-FILAMENT-PAGE', 'Deflection temperature under load @ 0.45 MPa: 51°C (ISO 75)'],
    `Fiberlogy's data sheet prints this 51 °C "@ 1.8 MPa"; its product page prints the same 51 °C "@ 0.45 MPa" (V012179), beside the same density, tensile strength, modulus, Vicat and glass transition. One label is wrong and neither document says which. ${SAFE}`],
  ['V011126', 'R-COLORFABB-TDS-E-colorFabbPABlueMetalDetectable', 'Heat Deflection temperature (amorphous) ˚C 60 ISO 75-1 | Heat Deflection Temperature (A) ˚C 90 ISO 75',
    ['R-COLORFABB-TDS-E-PA-Blue-Metal-Detectable', 'Heat Deflection Temp. HDT-B, ISO 75 90 | *These results are obtained from the information provided by the supplier of the raw material'],
    'colorFabb\'s July 2023 sheet (v1.0) prints this 90 °C as "Heat Deflection Temperature (A)" beside "Heat Deflection temperature (amorphous) 60" and defines "(A)" nowhere; m359 read it as ISO 75 method A (1.8 MPa). The November 2023 revision (v2.0) prints the same 90 °C as "HDT-B" (0.45 MPa), from the supplier of the raw material (V011255). The two revisions give the one figure both loads, and beside "(amorphous)" the "(A)" may as well name a crystallised (annealed) bar: neither the load nor the state of the 90 °C can be read from the pages, so it is held back and backs nothing until colorFabb says (D149).'],
  ['V012429', 'R-COVERAGE-20261001-28aad1fe7597', 'HDT A - 134°C matte, carbon appearance',
    ['S-SPECTRUM-en-tds-spectrum-sflex-carbon', '0.45mn/m2 134°C ISO 75 | 1.81mn/m2 70°C ISO 75 | *injection moulding'],
    'Spectrum\'s 2025 portfolio prints "HDT A - 134°C" for S-Flex Carbon, typed 1.8 MPa from its method letter (m421, D141); the product\'s own data sheet prints 134 °C at 0.45 MN/m² and 70 °C at 1.81 MN/m², injection moulded (V004080, V004081). The portfolio is a summary of the sheets, and where the two differ the sheet is the product\'s own statement (OPEN-PROBLEMS §32.8): its explicit loads put the 134 °C at 0.45 MPa. Held back; it backs nothing (D149).'],
];
for (const [id, sid, quote, [otherSid, otherQuote], why] of HOLDS) {
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'HDT' || r['Test load MPa'] !== '1.8') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s HDT at 1.8 MPa`);
  if (r['Data status'] === HELD) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  onCachedSheet(t, otherSid, otherQuote, MIGRATION);
  t.set('measurements', id, 'Data status', HELD, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, `Held back ${DATE} (${MIGRATION}): ${why}`), { expect: r.Notes, migration: MIGRATION });
  n++;
}

// FormFutura ApolloX Kevlar's 95 °C at 1.81 MN/m², out of line with its own sheet and with its twin's.
{
  const id = 'V007527', sid = 'S-PET-TDS-ApolloX-Kevlar';
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'HDT') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s HDT`);
  if (r['Data status'] !== FLAG) {
    onCachedSheet(t, sid, 'Heat deflection temperature (HDT) @ 0.45mn/ m 89°C ISO 75 | Heat deflection temperature (HDT) @ 1.81mn/ m 95°C ISO 75', MIGRATION);
    onCachedSheet(t, 'S-SPECTRUM-en-tds-spectrum-asa-kevlar', '0.45mn/m2* 89°C ISO 75 | 1.81mn/m2* 79°C ISO 75', MIGRATION);
    t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149): FormFutura's sheet prints 95 °C at 1.81 MN/m² beside 89 °C at 0.45 MN/m² (V007526, flagged by m134), and a heavier load cannot deflect a bar at a higher temperature. Its twin, Spectrum ASA Kevlar (one formulation, R053), prints 89 °C at 0.45 and 79 °C at 1.81 MN/m² (injection moulding), so the 95 °C is the figure out of line. Kept as printed; it backs nothing.`), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
}

// The portfolio value held back is no longer checked against its window, so m344's acceptance of it ("HDT A 134 C is
// meaningful and credible") goes with it.
const { added, dropped } = settleFindings(t, {
  date: DATE,
  drop: [{ Code: 'MEAS-PHYSICS-WINDOW', Record: 'V012429' }],
  accept: [
    { Code: 'MEAS-PHYSICS-HDT-LOADS', Record: 'V010876', Reason: 'Fiberlogy PLA MINERAL: its 2021 sheet (3DJake\'s copy, the grade\'s own source) prints 55 °C at 0.45 MPa and 50 °C at 1.8 MPa, and its 2025 revision (the maker\'s site) prints 48 °C at 0.45 MPa and no 1.8 MPa value. The pair the check makes crosses two revisions that each keep the order; the later one lowered its figure. Both stay as printed; the product\'s value is its own sheet\'s, and which revision speaks for a product is a ruling per pair (OPEN-PROBLEMS §37.3). (screening build, m441, D149)' },
    { Code: 'MEAS-PHYSICS-HDT-LOADS', Record: 'V012183', Reason: 'Fiberlogy R PP: its product page (2026) prints 40 °C at 0.45 MPa beside a tensile strength of 14 MPa and a modulus of 700 MPa (Fiberlogy PP\'s figures), and its 2022 data sheet (3DJake\'s copy, the grade\'s own source) prints 80 °C at 0.45 MPa and 65 °C at 1.8 MPa beside 21 MPa and 1100 MPa. The documents disagree throughout, each in order with itself: two statements of the product, recorded as printed for Fiberlogy to settle (OPEN-PROBLEMS §37.3); the product\'s values are its own sheet\'s. (screening build, m441, D149)' },
  ],
});
if (n || added || dropped) t.save();
console.log(`${MIGRATION}: ${n} value(s) held back or flagged; ${added} finding(s) accepted with their reason; ${dropped} acceptance(s) that no longer occur removed`);
