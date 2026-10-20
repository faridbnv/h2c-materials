#!/usr/bin/env node
// Migration m474 (2026-10-20): Spectrum PET-G HT100 is a heat-resistant copolyester, not a PETG; it moves to CPE, the
// copolyester material that already holds colorFabb HT and Fiberlogy CPE HT (the owner's rulings, item 11; D176;
// OPEN-PROBLEMS §33.9). Read by Claude Opus 5.5 (the round's materials-science track) on the cached sheets.
//
// What the pages print. Spectrum's sheet (S-SPECTRUM-en-tds-spectrum-petg-ht100, p. 1): "Spectrum PET-G HT100 is a
// co-polyester based filament", a specific gravity of 1.18 g/cm3 (D 792), a heat deflection of 100 °C (D 648), a
// flexural modulus of 1575 MPa, 210 % elongation at break, a 250-280 °C nozzle and a 100-110 °C bed. Spectrum's 2024
// portfolio (R-SPECTRUM-PORTFOLIO-2024) lists it under "Co(Polyester)" with 1.18 and "HDT B - 94°C".
//
// Why it is not a PETG. PETG (Eastman's Eastar 6763, polymers.csv PETG) is a glassy copolyester whose glass transition
// is about 80 °C, and a glassy bar deflects under 0.45 MPa at or below its glass transition: PETG's HDT B is near 70 °C,
// and 94 °C is beyond what a PETG bar can hold. Its density, 1.22 to 1.30 g/cm3 in polymers.csv, is beyond 1.18 the
// other way. A copolyester that is 1.18 g/cm3 dense and deflects at 94 to 100 °C is one of the higher-glass-transition
// copolyesters (cycloaliphatic diol copolyesters of the Tritan or Amphora HT kind, glass transition 100 to 110 °C), and
// the database files those under CPE (M089, "Generic copolyester umbrella, not one chemistry"): colorFabb HT,
// "producted using Eastman Amphora HT5300", prints a flexural modulus of 1575 MPa (ASTM D790) and an HDT of 94 °C at
// 0.455 MPa on its sheet, and Fiberlogy CPE HT
// 1.18 g/cm3, an HDT of 100 °C and a glass transition of 110 °C, the same figures HT100 prints. No variant class is
// needed: the product is not a PETG that something changed, it is another copolyester sold under PETG's name. A Variant
// of PETG would have kept its values out of PETG's spread and estimates, but would still have answered PETG's questions
// (its guide row, its chamber need) for a polymer that prints 30 °C hotter on a bed 30 °C hotter.
//
// The grade keeps its ID and every record moves with it (moveGrade, D86); the two range sources that name it as
// "M020 / G020-08" name its new material. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m474-heat-resistant-copolyester-filed-as-cpe.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { moveGrade, recountGrades } from '../../scripts/data/records.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm474';
const GRADE = 'G020-08', FROM = 'M020', TO = 'M089';
const t = openTables();
let n = 0;

const g = t.get('grades', GRADE);
if (g.Manufacturer !== 'Spectrum' || g['Product name'] !== 'PET-G HT100') throw new Error(`${MIGRATION}: ${GRADE} is not Spectrum PET-G HT100`);
if (t.get('materials', TO)['Original name'] !== 'CPE') throw new Error(`${MIGRATION}: ${TO} is not CPE`);

onSheet(t, 'S-SPECTRUM-en-tds-spectrum-petg-ht100', 'is a co-polyester based | Specific Gravity 1.18 g/cm3 D 792 | Heat Deflection Temperature 100°C D 648 | Flexural Modulus 1575 MPa D 790 | Nozzle temperature 250-280°C | Bed temperature 100-110°C', MIGRATION);
onSheet(t, 'R-SPECTRUM-PORTFOLIO-2024', 'Co(Polyester) | HDT B - 94°C | PET-G HT100', MIGRATION);
onSheet(t, 'R-COLORFABB-TDS-E-ColorFabb-HT', 'producted using Eastman Amphora HT5300 | Flexural Modulus Flexural, ASTM D790 1575 MPa', MIGRATION);
onSheet(t, 'R-FIBERLOGY-FIBERLOGY-CPE-HT-TDS-0', 'Glass Transition Temperature Tg DSC °C 110 | Vicat Softening Temperature ISO 306 °C 110', MIGRATION);

if (g.MaterialID === FROM) {
  const moved = moveGrade(t, GRADE, TO, { migration: MIGRATION });
  const composition = 'Not published';
  t.set('grades', GRADE, 'Composition / filler', `"Spectrum PET-G HT100 is a co-polyester based filament" (S-SPECTRUM-en-tds-spectrum-petg-ht100, p. 1). Filed under CPE since 2026-10-20 (${MIGRATION}, D176): its specific gravity of 1.18 (D 792) is below every PETG's (1.22 to 1.30 g/cm3, polymers.csv PETG) and its heat deflection of 94 °C at 0.45 MPa (HDT B, Spectrum's 2024 portfolio; 100 °C on its sheet) above what a glassy PETG bar holds near its 80 °C glass transition: a higher-glass-transition copolyester sold under PETG's name, as colorFabb HT and Fiberlogy CPE HT are.`, { expect: composition, migration: MIGRATION });
  console.log(`${MIGRATION}: ${GRADE} moved ${FROM} -> ${TO} with ${moved} record(s)`);
  n++;
}
// Each material's coverage row counts its makers (D114): CPE gains Spectrum; PETG keeps it through its other products.
for (const id of [TO, FROM]) if (recountGrades(t, id, { migration: MIGRATION, date: '2026-10-20', because: 'after Spectrum PET-G HT100 moved to CPE' })) n++;
for (const s of t.rows('sources').filter((x) => String(x['Applicable grades']).includes(`${FROM} / ${GRADE}`))) {
  t.set('sources', s.SourceID, 'Applicable grades', s['Applicable grades'].replace(`${FROM} / ${GRADE}`, `${TO} / ${GRADE}`), { expect: s['Applicable grades'], migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} edit(s)`);
