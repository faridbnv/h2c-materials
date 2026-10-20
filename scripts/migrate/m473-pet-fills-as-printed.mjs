#!/usr/bin/env node
// Migration m473 (2026-10-20): fibre-filled PET as printed, the records the owner's ruling turned on (the owner's
// rulings, item 6; D176; OPEN-PROBLEMS §38.10). Each page read by Claude Opus 5.5 (the round's materials-science track)
// on its cached text, beside a Claude Sonnet reader's fetch of the makers' current documents
// (docs/audits/2026-10-20-owner-rulings/science/DECISIONS-MEMO.md, item 1).
//
// The question was whether a PET filled with carbon or glass fibre crystallises as it prints (as PPA's fills do), since
// four products published a crystallised-looking heat deflection with, it seemed, no treatment stated. Read again:
// - Raise3D Industrial PET GF (V1, 02.2023) prints "ISO75 1.8MPa 99" and "ISO75 0.45 MPa 120" on p. 1, beside "After
//   annealing, PET GF stabilizes its heat resistance at around 120 ℃", and on p. 2 "All testing specimens were printed
//   under the following conditions: ... All specimens were annealed at 100˚C for 8h." The sheet's mechanical rows were
//   recorded so (m129, m192); the two heat rows, added in the reader round (m342), were not. They are the annealed bar's.
// - QIDI PET-GF's 99.1 °C at 1.8 MPa says "100°C Annealing 8 hours" on its row and its 120.3 °C at 0.45 MPa inherits the
//   same footnote (PC00085): annealed, already recorded so. Nothing to do.
// - Flashforge PET-CF's 100 °C at 0.455 MPa sits above "Note: The above test parameter data are obtained from actual
//   printing, and the printed model has not been annealed": as printed, recorded so (m452). A glass-fibre or carbon-fibre
//   network carries a glassy bar 15 to 25 °C past its glass transition (D163, row 3b), so 100 °C is a glassy bar's.
// - Flashforge PET-GF prints "HDT@ 0.455 MPa (66 psi) ISO75 ℃ 200" on printed bars ("Testing Specimen Printing
//   Conditions:", p. 2) and states no treatment; the same sheet says "with a softening point reaching up to 200°C" and,
//   on p. 3, "After the printing process, it is recommended to dry the model in the oven at 120-130°C for 6-8 hours to
//   increase the strength of the model." Its sibling made from the same LEHVOSS compound family (PET-CF, "LUVOCOM® 3F PET
//   CF 9780") prints 100 °C as printed. A 15 % glass-fibre PET bar that was not crystallised deflects at 0.45 MPa near
//   80 °C (Polymaker Fiberon PET-GF15: 81.6 °C as printed, 133.7 °C after 16 h at 120 °C); 200 °C is a crystallised
//   bar's, annealed or printed hot, which the page does not say this was. Flagged physically implausible as the bar the
//   row reads (D55, D149, the m439 precedent for PLA): kept as printed, backing nothing.
// - SIDDAMENT PET CF ("produced using LUVOCOM® 3F PET CF modified material") prints "HDT@ 0.455 MPa(66 psi) ISO75 ... 190"
//   on p. 1, never transcribed, with "Test Sample Printing Conditions:" heading p. 2 (a Bambu X1C, 0.6 mm nozzle, 100 %
//   infill on the page image) and the same advice to oven-treat the part at 120 to 130 °C for 6 to 8 h. Recorded, and
//   flagged as Flashforge PET-GF's is, for the same reason.
// What the makers that print both states say: Polymaker PET-GF15 81.6 °C as printed, 133.7 °C annealed; Raise3D
// Industrial PET CF 87 °C before annealing, 175 °C after 8 h at 100 °C (V4.0). Every stated as-printed bar of a filled PET
// in this database lies between 74 and 100 °C: PET's fills print glassy, as D158 classes them; the model is kept.
// Each quote is checked on the cached sheet. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m473-pet-fills-as-printed.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';
import { correct, addValue, withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm473';
const DATE = '2026-10-20';
const FLAG = 'Published value (physically implausible)';
const t = openTables();
let n = 0;

// Raise3D Industrial PET GF: the two heat rows are the annealed bar's, as the sheet's other rows are.
{
  const sid = 'D-RAISE3D-Raise3D-Industrial-PET-GF-TDS-V1';
  onSheet(t, sid, 'After annealing, PET GF stabilizes its heat resistance at around 120 | ISO75 1.8MPa 99 | ISO75 0.45 MPa 120 | All testing specimens were printed under the following conditions | All specimens were annealed at 100˚C for 8h', MIGRATION);
  n += correct(t, {
    source: sid, ids: ['V013951', 'V013952'], migration: MIGRATION, date: DATE,
    set: {
      'Specimen type': ['Not published (do not assume printed)', 'Printed specimen'],
      'Post-processing': ['Not published', 'All specimens were annealed at 100˚C for 8h'],
      'Post-processing state': ['not-stated', 'annealed'],
      'Anneal °C': ['Not applicable', '100'],
      'Anneal h': ['Not applicable', '8'],
      'Specimen / print parameters': ['Not published', 'All testing specimens were printed under the following conditions: Nozzle temp 320℃, Bed temp 80℃, Print speed 45mm/s, Infill 100%, Infill angle ±45°'],
    },
    note: `p. 2 says "All testing specimens were printed under the following conditions" and "All specimens were annealed at 100˚C for 8h", and p. 1 that "After annealing, PET GF stabilizes its heat resistance at around 120 ℃": the heat deflection rows are the annealed, printed bar's, as the sheet's mechanical rows were recorded (m129, m192). The owner's rulings (D176).`,
  });
  // The tensile modulus the description gives "after annealing" was printed too: the same note speaks for it.
  n += correct(t, {
    source: sid, ids: ['V013950'], migration: MIGRATION, date: DATE,
    set: { 'Specimen type': ['Not published (do not assume printed)', 'Printed specimen'] },
    note: 'p. 2 says "All testing specimens were printed under the following conditions"; the description\'s modulus "after annealing" is theirs. The owner\'s rulings (D176).',
  });
}

// Flashforge PET-GF: 200 °C on a printed bar whose treatment the sheet does not state.
{
  const id = 'V005260', sid = 'D-FLASH-PET-GF-TDS-EN';
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'HDT') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s HDT`);
  if (r['Data status'] !== FLAG) {
    onSheet(t, sid, 'HDT@ 0.455 MPa (66 psi) ISO75 ℃ 200 | with a softening point reaching up to 200°C | it is recommended to dry the model in the oven at 120-130°C for 6-8 | Testing Specimen Printing Conditions: | LUVOCOM® 3F\'s modified PET GF', MIGRATION);
    onSheet(t, 'D-FLASH-PET-CF-TDS-EN', 'HDT@ 0.455 MPa (66 psi) ISO 75 ℃ 100 | the printed model has not been annealed | LUVOCOM® 3F PET CF 9780', MIGRATION);
    onSheet(t, 'R-FIBERON-PETGF15-TDS', '81.6 | 133.7', MIGRATION);
    t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149, D176): the sheet prints a heat deflection of 200 °C at 0.455 MPa on printed bars and states no treatment, and advises drying the part "in the oven at 120-130°C for 6-8 hours to increase the strength of the model" (p. 3). PET prints glassy, fibre-filled or not (D158, D176): a 15 % glass-fibre PET bar that was not crystallised deflects near 80 °C (Polymaker Fiberon PET-GF15, 81.6 °C as printed and 133.7 °C annealed), and Flashforge's own PET-CF of the same LEHVOSS compound family prints 100 °C "not annealed". 200 °C is a crystallised bar's, annealed or printed hot, which the page does not say this was. Kept as printed; it backs nothing.`), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
}

// SIDDAMENT PET CF: the heat deflection its sheet prints, never transcribed, recorded with the same flag.
{
  const sid = 'S-PCGF-PET-CF-TDS';
  onSheet(t, sid, 'HDT@ 0.455 MPa(66 psi) ISO75 Cc 190 | Test Sample Printing Conditions: | dry it in an oven at a temperature of 120~130°C for 6~8 hours | LUVOCOM® 3F PET CF', MIGRATION);
  const id = addValue(t, {
    like: 'V014052', migration: MIGRATION, date: DATE,
    why: 'published in the source, never transcribed (the owner\'s rulings, D176).',
    set: {
      Property: 'HDT', 'Raw value': '190', 'Raw unit': '°C', 'Raw numeric': '190', 'Normalized value': '190', 'Normalized unit': '°C',
      'Data status': FLAG, 'Specimen type': 'Printed specimen', Direction: 'Not applicable',
      'Moisture condition': 'Not published', 'Moisture state': 'not-stated', 'Post-processing': 'Not published', 'Post-processing state': 'not-stated',
      'Standard / load': 'ISO75; 0.455 MPa (66 psi)', Standards: 'ISO 75', 'Test load MPa': '0.45',
      'Specimen / print parameters': 'Test Sample Printing Conditions: (p. 2; the conditions are drawn on the page image)',
      Locator: 'p. 1: HDT@ 0.455 MPa(66 psi) ISO75',
    },
    note: `Flagged physically implausible on entry (${MIGRATION}, D55, D149, D176): the sheet prints a heat deflection of 190 °C at 0.455 MPa on printed test samples ("Test Sample Printing Conditions:", p. 2) and states no treatment, and advises drying the printed model "in an oven at a temperature of 120~130°C for 6~8 hours to improve the strength of the model" (p. 1). PET prints glassy, fibre-filled or not (D158, D176): a carbon-fibre PET bar that was not crystallised deflects at 74 to 100 °C (BASF Ultrafuse PET CF15 74 °C, Raise3D Industrial PET CF 87 °C before annealing and 175 °C after, Flashforge PET-CF 100 °C "not annealed"). 190 °C is a crystallised bar's, annealed or printed hot, which the page does not say this was. Kept as printed; it backs nothing.`,
  });
  if (id) { console.log(`${MIGRATION}: SIDDAMENT PET CF's heat deflection recorded as ${id}`); n++; }
}

if (n) t.save();
console.log(`${MIGRATION}: ${n} record(s) written`);
