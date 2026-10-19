#!/usr/bin/env node
// Migration m440 (2026-10-18): heat deflection values beside a modulus too low for the test (D149; the screening
// review's change C12, finding F16). Each page read by Claude Opus 5.5 on its cached text, and colorFabb nGen_FLEX's on
// its rendered image.
//
// ISO 75 zeroes a loaded bar's deflection and records the temperature at which it has bent a further 0.2 % of
// outer-fibre strain. A bar below 225 MPa is strained more than that by the 0.45 MPa load alone, so a small fall of its
// modulus, or creep, meets the criterion: the number is not the softening of a rigid bar, which is why HDT does not
// apply to an elastomer. The new check MEAS-PHYSICS-HDT-SOFT asks it of every product whose family the HDT headlines
// apply to, and found four:
// - Flashforge "Flexible" (PBAT) prints HDT 90 °C at 0.455 MPa beside a modulus of elasticity of 6~7 MPa, an elongation
//   at break of 400~600 % and no flexural modulus: a bar strained about 7 % by the load alone, which meets ISO 75's
//   criterion once its modulus falls by 3 %. PBAT melts at 110 to 120 °C (polymers.csv). Flagged physically implausible.
// - purefil's COC flex (a "thermoplastic elastomer based on cyclic olefin copolymers", Shore 89A) prints a heat deflection
//   of 60 °C at 0.45 MPa beside a tensile modulus of 50 MPa: strained 0.9 % by the load alone. Flagged physically
//   implausible, so a soft elastomer filed under COC no longer passes a heat requirement on it.
// - Eryone's Hyper-Speed ABS prints HDT 95 °C, credible for an ABS; the check names it because the product's only
//   unflagged modulus is its X-Z "Elastic modulus" of 217.16 MPa, the same template figure as its X-Y 217.08 MPa, which
//   m72's window check already flagged: no ABS has an elastic modulus of 0.22 GPa. The X-Z one is flagged as the X-Y one
//   was, and its accepted window finding, which said the value backs nothing, goes, as does the strain finding of its
//   X-Z elongation, which was judged against it.
// - colorFabb nGen_FLEX (Eastman Neostar FN0006, a copolyester elastomer, Shore 95A) prints HDT-B 100 °C in its
//   "Thermal Properties*" block, whose asterisk says "These results are obtained from the information provided by the
//   supplier of the raw material", already recorded as a raw-material value, beside moulded moduli of 170 MPa (tensile)
//   and 150 MPa (flexural) and a printed one of 150 MPa. A moulded bar near the line, of a copolyester elastomer that
//   melts at 205 °C: kept, and its two findings (HDT-SOFT, and PR12 against its -40 °C glass transition) accepted. Its
//   estimate identity (nGen, an amorphous copolyester) does not describe it; OPEN-PROBLEMS records that.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m440-heat-deflection-of-soft-bars.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote, settleFindings } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm440';
const DATE = '2026-10-18';
const FLAG = 'Published value (physically implausible)';
const t = openTables();
let n = 0;

const FLAGS = [
  ['V005369', 'D-FLASH-PBAT-TDS-EN', 'HDT', 'HDT@ 0.455 MPa (66 psi) ISO 75 ℃ 90 | Modulus of Elasticity (X-Y) ISO 527 Mpa 6~7 | Elongation at Break (X-Y) ISO 527 % 400~600',
    'the sheet prints a heat deflection of 90 °C at 0.455 MPa beside its own modulus of elasticity of 6~7 MPa (V005367) and an elongation at break of 400~600 %. ISO 75 records the temperature at which the loaded bar bends a further 0.2 % of outer-fibre strain; the load alone strains a 6 MPa bar about 7 %, and a 3 % fall of its modulus meets the criterion, so the bar the sheet describes cannot hold to 90 °C in that test (PBAT melts at 110 to 120 °C). The number is not a rigid bar\'s softening point; HDT does not apply to so soft a bar.'],
  ['V011485', 'R-FABRU-10857-Material-datasheet-COC-flex-purefil-EN', 'HDT', 'Heat deflec6on temperature 60 °C | 0.45 MPa (ISO 75-1, -2) | Tensile modulus (ISO 527-2/1A) 50 MPa | thermoplas8c elastomer based on cyclic olefin',
    'the sheet prints a heat deflection of 60 °C at 0.45 MPa beside its own tensile modulus of 50 MPa (V010402), for "a transparent thermoplastic elastomer based on cyclic olefin copolymers" with a Shore hardness of 89A. ISO 75 records the temperature at which the loaded bar bends a further 0.2 % of outer-fibre strain; the 0.45 MPa load alone strains a 50 MPa bar 0.9 %, and an 18 % fall of its modulus meets the criterion, so the number is not the softening of a rigid bar. HDT does not apply to an elastomer, and this one is filed under COC, where it would otherwise decide.'],
  ['V005140', 'R-ERYONE-file-manager-downLoad-path-file-manage-3828-20250903-eryone--fbbd78', 'Tensile modulus', 'Elastic modulus X-Z 50mm/min GB/T 1040.1-2006 | MPa 217.16 | Elastic modulus X-Y 50mm/min GB/T 1040.1-2006 | MPa 217.08',
    'the sheet prints an X-Z "Elastic modulus" of 217.16 MPa beside an X-Y one of 217.08 MPa (V005137, flagged by the window check), one template figure for an ABS whose elastic modulus is about 2 GPa; no ABS bar, in any direction, has one of 0.22 GPa. Flagged as the X-Y figure is.'],
];
for (const [id, sid, property, quote, why] of FLAGS) {
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== property) throw new Error(`${MIGRATION}: ${id} is not ${sid}'s ${property}`);
  if (r['Data status'] === FLAG) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149): ${why} Kept as printed; it backs nothing.`), { expect: r.Notes, migration: MIGRATION });
  n++;
}

onCachedSheet(t, 'R-COLORFABB-TDS-E-ColorFabb-nGen-FLEX', 'Eastman Neostar FN0006 | Heat Deflection Temp. HDT-B, ISO 36 100 | *These results are obtained from the information provided by the supplier of the raw material', MIGRATION);
const ngen = 'colorFabb nGen_FLEX is "produced using the Eastman Neostar FN0006", a copolyester elastomer (Shore A 95, glass transition -40 °C, melting point 205 °C); its HDT-B of 100 °C sits in the "Thermal Properties*" block the sheet says comes from "the supplier of the raw material", recorded as a raw-material value, which never decides for a printed part. Its crystals, not a glass, carry the bar: neither PR12 (a glassy bar) nor the estimate identity it is filed under (nGen, an amorphous copolyester) describes it.';
const { added, dropped } = settleFindings(t, {
  date: DATE,
  accept: [
    { Code: 'MEAS-PHYSICS-HDT-TG', Record: 'V005870', Reason: `${ngen} Kept as printed (screening build, m440, D149).` },
    { Code: 'MEAS-PHYSICS-HDT-SOFT', Record: 'V005870', Reason: `${ngen} Its moulded moduli are 170 MPa (tensile) and 150 MPa (flexural), near the 225 MPa line: the 0.45 MPa load strains such a bar 0.26 %, and the test still reads a halving of its modulus, credible at 100 °C for a polymer that melts at 205 °C. Kept as printed (screening build, m440, D149).` },
  ],
  drop: [{ Code: 'MEAS-PHYSICS-WINDOW', Record: 'V005140' }, { Code: 'MEAS-PHYSICS-STRAIN', Record: 'V005141' }],
});
if (n || added || dropped) t.save();
console.log(`${MIGRATION}: ${n} value(s) flagged; ${added} finding(s) accepted with their reason; ${dropped} acceptance(s) that no longer occur removed`);
