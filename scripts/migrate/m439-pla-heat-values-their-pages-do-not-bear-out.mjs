#!/usr/bin/env node
// Migration m439 (2026-10-18): PLA heat deflection values their own pages do not bear out as an as-printed bar (D149; the
// screening review's change C11, finding F24). Each page read by Claude Opus 5.5 on its cached text, and on its rendered
// image where the layout decides (colorFabb PLA HP, 3DXTECH CarbonX CF-PLA), beside the screening build's re-read dossier
// (a Claude Sonnet reader, 2026-10-18).
//
// A glassy PLA bar deflects under 0.45 MPa near its glass transition (98 pairs in this database: a median of 4 °C below
// it). Above it only a crystallised bar holds: annealed, moulded hot, or a grade that crystallises as it prints.
// - colorFabb PLA HP's sheet of November 2024 prints "Heat Deflection Temp.* HDT-B, ISO 75 135" with the footnote
//   "*Optimal temperature resistance is obtained after annealing the sample", and says on p. 2 that "The reported
//   properties are an average of a batch of 3D specimens" printed on a 55 °C bed. The footnote states the bar's
//   treatment; the row records it (annealed, schedule not stated), so the value decides only for a part annealed as the
//   sheet's was (D99). Its description's "roughly 134°C, without having to anneal the material" contradicts the footnote,
//   and the 2022 sheet prints the same figure with "*only injection molded data available" (V005792, a raw-material
//   value already). Neither now decides an as-printed requirement.
// - Six values sit 25 to 34 °C above their own sheet's glass transition and no page says the bar was annealed:
//   3DXTECH's SimuBone, CarbonX CF-PLA and ECOMAX Tough PLA (a printed-specimen block, bed 23 °C, no annealing stated) and
//   Nanovia's PLA EF 3D850, PLA VX and PLA Flax (an "80 – 90 °C" HDT beside "Max temperature 55 °C" on the same page,
//   and, on PLA Flax's, "DTUL 50 °C"). Flagged physically implausible with the reason (D55): kept as printed, backing
//   nothing.
// - Polymaker HT-PLA-GF prints 75.5 °C "(as printed)" beside 114.7 °C "(annealed)", a glass transition of 59.76 °C, a
//   crystallisation temperature of 81.56 °C and a melting point of 174.87 °C, with 12 % glass fibre: a grade the sheet
//   shows crystallising, whose as-printed bar holds 15.7 °C above its glass transition. Kept; PR12's finding accepted.
// - Stratasys PC-ABS prints 126.1 °C (XZ, printed) and 125.0 °C (moulded) at 66 psi beside a glass transition of
//   105.3 °C: a PC/ABS blend has two glass transitions, and the 105.3 °C (DSC inflection) is its ABS phase's; the
//   polycarbonate phase carries the bar above it. Kept; accepted.
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m439-pla-heat-values-their-pages-do-not-bear-out.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { withNote, settleFindings } from '../../scripts/lib/source-edits.mjs';

const MIGRATION = 'm439';
const DATE = '2026-10-18';
const FLAG = 'Published value (physically implausible)';
const t = openTables();
let n = 0;

// colorFabb PLA HP (2024): the footnote's annealing is the row's treatment.
{
  const id = 'V005853', sid = 'R-COLORFABB-TDS-E-ColorFabb-PLA-HP-7a500b';
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'HDT') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s HDT`);
  const post = 'Optimal temperature resistance is obtained after annealing the sample';
  if (r['Post-processing'] !== post) {
    onCachedSheet(t, sid, 'Heat Deflection Temp.* HDT-B, ISO 75 135 | *Optimal temperature resistance is obtained after annealing the sample | The reported properties are an average of a batch of 3D specimens | without having to anneal the material', MIGRATION);
    t.set('measurements', id, 'Post-processing', post, { expect: 'Not published', migration: MIGRATION });
    t.set('measurements', id, 'Post-processing state', 'annealed', { expect: 'not-stated', migration: MIGRATION });
    t.set('measurements', id, 'Anneal °C', 'Not published', { expect: 'Not applicable', migration: MIGRATION });
    t.set('measurements', id, 'Anneal h', 'Not published', { expect: 'Not applicable', migration: MIGRATION });
    t.set('measurements', id, 'Notes', withNote(r.Notes, `Corrected ${DATE} (${MIGRATION}, D149): the row's asterisk points to the page's footnote "*Optimal temperature resistance is obtained after annealing the sample", so the 135 °C is the annealed bar's, schedule not stated; p. 2 says the reported properties are from 3D-printed specimens (55 °C bed). The description's "roughly 134°C, without having to anneal the material" contradicts the footnote, and the 2022 sheet prints the same figure as "*only injection molded data available" (V005792). A glassy PLA bar deflects near its glass transition (55 to 60 °C); 135 °C is a crystallised bar's.`), { expect: r.Notes, migration: MIGRATION });
    n++;
  }
}

// Six values no page bears out as a bar that was not annealed.
const threeDX = (hdt, tg, bed) => `the sheet prints a heat deflection of ${hdt} °C at 0.45 MPa beside its own glass transition of ${tg} °C (DSC), on bars its "Printed Specimen Conditions" block prints on a ${bed} °C bed, and states no annealing. A glassy PLA bar deflects near its glass transition (this database's 98 PLA pairs: a median of 4 °C below it, none of the glassy ones more than 5 °C above); ${hdt - tg} °C above it is a crystallised (annealed or moulded) bar's, which the page does not say this was.`;
const nanovia = (extra) => `the page prints "HDT" of 80 – 90 °C at 0.45 MPa beside a glass transition of 55 – 60 °C and "Max temperature 55 °C"${extra}, and says nothing of how the HDT bar was made or treated. A glassy PLA bar deflects near its glass transition (this database's 98 PLA pairs: a median of 4 °C below it); 20 to 35 °C above it is a crystallised bar's, which the page does not say this was, and its own maximum temperature of 55 °C says the printed part does not hold there.`;
const FLAGS = [
  ['V010211', 'X-ECOMAX-SimuBone-TDS-v1', 'Glass Transition Temperature | DSC °C 55 | ISO 75 °C 89 | Printed Specimen Conditions | Bed Temp: 23°C', threeDX(89, 55, 23)],
  ['V003309', 'X-ECOMAX-CarbonX-CF-PLA-TDS-v3', 'Glass Transition Temperature (Tg) DSC °C 60 | ISO 75 °C 91 | Bed Temp: 23°C', threeDX(91, 60, 23)],
  ['V003212', 'X-ECOMAX-ECOMAX-Tough-PLA-TDS-v1', 'DSC °C 55 | ISO 75 °C 80 | Bed Temp: 23°C', threeDX(80, 55, 23)],
  ['V007474', 'R-NANOVIA-PLA-EF-3D850', 'Tg 55 – 60 °C | HDT-B (0,45 MPa) 80 – 90 °C E2092 | Max temperature 55 °C', nanovia('')],
  ['V007533', 'R-NANOVIA-PLA-VX', 'Tg 55 – 60 °C | HDT at 0,45 MPa 80 – 90 °C | Max temperature 55 °C', nanovia('')],
  ['V010287', 'R-NANOVIA-PLA-Flax', 'Tg 55 – 60 °C | DTUL 50 °C | HDT B (0.45 MPa) 80 – 90 °C E2092 | Max temperature 55 °C', nanovia(', and a "DTUL" of 50 °C above it')],
];
for (const [id, sid, quote, why] of FLAGS) {
  const r = t.get('measurements', id);
  if (r.SourceID !== sid || r.Property !== 'HDT') throw new Error(`${MIGRATION}: ${id} is not ${sid}'s HDT`);
  if (r['Data status'] === FLAG) continue;
  onCachedSheet(t, sid, quote, MIGRATION);
  t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(r.Notes, `Flagged physically implausible ${DATE} (${MIGRATION}, D55, D149): ${why} Kept as printed; it backs nothing.`), { expect: r.Notes, migration: MIGRATION });
  n++;
}

// What the new check (PR12, MEAS-PHYSICS-HDT-TG) finds and the pages bear out.
const htpla = 'Polymaker HT-PLA-GF prints 75.5 °C "(as printed)" at 0.45 MPa beside 114.7 °C "(annealed)", with a glass transition of 59.76 °C, a crystallisation temperature of 81.56 °C and a melting point of 174.87 °C, and 12 % glass fibre: a grade the sheet shows crystallising, whose as-printed bar holds 15.7 °C above its glass transition, just past PR12\'s margin. Kept as printed (screening build, m439, D149).';
const pcabs = (what) => `Stratasys PC-ABS prints ${what} at 66 psi beside a glass transition of 105.3 °C (ASTM D7426, inflection point). A PC/ABS blend has two glass transitions, and 105.3 °C is its ABS phase's; the polycarbonate phase (about 145 °C) carries the bar above it, so PR12's glassy-bar margin does not describe a blend. Kept as printed (screening build, m439, D149).`;
const { added } = settleFindings(t, {
  date: DATE,
  accept: [
    { Code: 'MEAS-PHYSICS-HDT-TG', Record: 'V014423', Reason: htpla },
    { Code: 'MEAS-PHYSICS-HDT-TG', Record: 'V000350', Reason: htpla.replace('Kept as printed (', 'Its V1.1 sheet prints the same table. Kept as printed (') },
    { Code: 'MEAS-PHYSICS-HDT-TG', Record: 'V014326', Reason: pcabs('126.1 °C for its printed XZ/ZX bar') },
    { Code: 'MEAS-PHYSICS-HDT-TG', Record: 'V014328', Reason: pcabs('125.0 °C for its moulded bar') },
  ],
});
if (n || added) t.save();
console.log(`${MIGRATION}: ${n} PLA heat value(s) recorded as their pages bear out; ${added} finding(s) accepted with their reason`);
