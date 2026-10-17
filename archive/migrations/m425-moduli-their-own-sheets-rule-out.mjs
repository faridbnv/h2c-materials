#!/usr/bin/env node
// Migration m425 (2026-10-17): tensile moduli their own sheets rule out are flagged, as D55 flags them (data review fixes,
// item 4; each read on its cached sheet, SUNLU's on the rendered page, by Claude Opus).
//
// The material pages' reviewers saw SUNLU PETG 2.0's tensile modulus of 0.5 GPa set PETG's range (0.5 to 3.5 GPa) and a
// PLA product's 0.433 GPa set PLA's. Each was accepted as MEAS-PHYSICS-WINDOW with a reason that said it "backs no
// headline", and each was the product's tensile modulus, so each did. Read again:
// - SUNLU PETG 2.0 (p. 1) prints "拉伸模量(X-Y) Tensile Modulus ... 500±50" and "(Z-X) ... 300±50" beside "弯曲模量(X-Y)
//   Flexural Modulus ... 1900±300" and "(Z-X) ... 1650±300"; SUNLU PLA+ Silk 2.0, the same template, 597±50 and 363±30
//   beside 2473±300 and 1719±200. A bar's tension and bending moduli are one modulus in a solid, uniform bar and stay
//   within a factor of about 1.5 on a printed one (D140); a fourth to a fifth is not the bars' elastic modulus, and no
//   PETG or PLA has one of 0.3 to 0.6 GPa.
// - Spectrum PLA Tough (p. 1) prints "E-modulus 432,8 MPa D638" beside "Flexural modulus 2493 MPa ISO 178", "Tensile
//   Strength 53,2 MPa" and "Elongation at max. force 14,50%": 53.2 MPa over 14.5 % is 0.37 GPa, so the "E-modulus" is
//   the slope to the peak, a sixth of the bending modulus of the same bars. m218 kept it as surprising but possible;
//   beside its own flexural modulus it is not.
// - 3DJake's six PLA sheets of one range print an "E-Modulus" of 370 to 476 MPa beside a "Tensile strength at Yield" and a
//   "Strain at yield" of 7 to 11 %, whose ratio is that modulus: the slope to yield, read from the crosshead, not a
//   PLA's elastic modulus (about 3 GPa). Their acceptances said the same and that the value backs nothing; it was each
//   product's tensile modulus as published.
// Each is kept as printed, flagged, with its reason; it backs no product value, estimate or bound (D55). Their
// MEAS-PHYSICS-WINDOW acceptances go once the lint no longer finds them (a flagged value is not checked). Each quote is
// checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m425-moduli-their-own-sheets-rule-out.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm425';
const DATE = '2026-10-17';
const FLAG = 'Published value (physically implausible)';
const sunlu = (tm, fm) => `the sheet prints a tensile modulus of ${tm} MPa beside its own flexural modulus of ${fm} MPa for the same bars; a printed bar's two moduli are within a factor of about 1.5, and no PETG or PLA has an elastic modulus of 0.3 to 0.6 GPa, so the figure is not the bars' modulus.`;
const jake = (e, y, s) => `the sheet prints an "E-Modulus" of ${e} MPa beside a tensile strength at yield of ${y} MPa at a strain at yield of ${s} %, whose ratio is that modulus: the slope to yield, not a PLA's elastic modulus (about 3 GPa).`;
const ROWS = [
  ['V004389', 'R-SUNLU-30522971789539747056', '500±50 | 1900±300', sunlu('500 ± 50', '1900 ± 300')],
  ['V004390', 'R-SUNLU-30522971789539747056', '300±50 | 1650±300', sunlu('300 ± 50 (Z-X)', '1650 ± 300 (Z-X)')],
  ['V004369', 'R-SUNLU-56889371789540318047', '597±50 | 2473±300', sunlu('597 ± 50', '2473 ± 300')],
  ['V004370', 'R-SUNLU-56889371789540318047', '363±30 | 1719±200', sunlu('363 ± 30 (Z-X)', '1719 ± 200 (Z-X)')],
  ['V011510', 'S-SPECTRUM-en-tds-spectrum-pla-tough', 'E-modulus 432,8 MPa D638 | Flexural modulus 2493 MPa ISO 178 | Tensile Strength 53,2 MPa D638 | Elongation at max. force 14,50% D638',
    'the sheet prints an "E-modulus" of 432,8 MPa beside a flexural modulus of 2493 MPa, a tensile strength of 53,2 MPa and an elongation at maximum force of 14,50 %; 53.2 MPa over 14.5 % is 0.37 GPa, so the figure is the slope to the peak, a sixth of the same bars\' bending modulus, not their elastic modulus.'],
  ['V008789', 'R-3DJAKE-3DJAKE-TDS-ecoPLA-Wood-v1-1', 'Tensile strength at Yield 24,617 MPa | Strain at yield 7,078% | E-Modulus 369,993 MPa', jake('369,993', '24,617', '7,078')],
  ['V008803', 'R-3DJAKE-3DJAKE-TDS-ecoPLA-Sparkling-0', 'Tensile strength at Yield 50,80 MPa | Strain at yield 9,225% | E-Modulus 475,737 MPa', jake('475,737', '50,80', '9,225')],
  ['V008830', 'R-3DJAKE-3DJAKE-TDS-magicPLA', 'Tensile strength at Yield 45,830 MPa | Strain at yield 10,037% | E-Modulus 390 MPa', jake('390', '45,830', '10,037')],
  ['V008977', 'R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-v1-1', 'Tensile strength at Yield 39,928 MPa | Strain at yield 10,166% | E-Modulus 411,583 MPa', jake('411,583', '39,928', '10,166')],
  ['V008997', 'R-3DJAKE-3DJAKE-TDS-mysteryPLA-v1-1', 'Tensile strength at Yield 44,763 MPa | Strain at yield 10,139% | E-Modulus 379,426 MPa', jake('379,426', '44,763', '10,139')],
  ['V009131', 'R-3DJAKE-3DJAKE-TDS-ecoPLA-Silk-Rainbow-v1-1', 'Tensile strength at Yield 47,636 MPa | Strain at yield 10,922% | E-Modulus 400,339 MPa', jake('400,339', '47,636', '10,922')],
];

const t = openTables();
let n = 0;
for (const [id, sid, quote, why] of ROWS) {
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'Tensile modulus') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s tensile modulus`);
  if (r['Data status'] === FLAG) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55): ${why} Kept as printed; it backs nothing.`), { expect: r.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} tensile modulus value(s) their own sheets rule out flagged`);
