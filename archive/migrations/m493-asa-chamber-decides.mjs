#!/usr/bin/env node
// Migration m493 (2026-10-20): ASA's chamber row decides (D151), as the owner ruled on 2026-10-20 for the case the
// recount after research intake 2 confirmed; the counts of the High-Performance Engineering and nylon rows, which stay
// reported (research intake 2, stage 5; docs/audits/2026-10-20-research-intake-2/).
//
// The research package of 2026-10-19 (round 2) found two more ASA makers' own statements, entered in m489: AzureFilm's
// "can be printed without an enclosed printer" (no enclosure needed, D168) and Prusa's "place the printer inside an
// enclosure" (an enclosure asked for, D93). With them `node scripts/audit/chamber-need.mjs` counts 20 makers of ASA who
// state a chamber on their own sheets, 2 asking above 65 °C (UltiMaker's Precision ASA at 100 °C, a set point for its own
// heated-chamber printer, and Nanovia's ASA at 90 °C): 2 of 20 is one in ten, the line D151 draws, with no margin; no
// material of the family has a researched band wholly above 65 °C (CHAMBER-NEED-BAND-CONFLICT). The owner ruled on
// 2026-10-20 that the row decides if the recount confirmed it. The High-Performance Engineering row now counts 11 makers,
// none above, and stays reported: the researched bands of PPA, PPA-CF and PPA-GF lie at 80-120 °C, which a within row
// would contradict, and the owner has not ruled on it. The nylon row counts 18, 2 above, short of the line.
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m493-asa-chamber-decides.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm493';
const t = openTables();
const ROWS = {
  CN02: {
    Verdict: 'within', Status: 'deciding',
    'Reviewed by': 'Claude Opus 5.5 (agent), research intake 2, 2026-10-20; switched to deciding as the owner ruled on 2026-10-20',
    Reason: '20 makers state a chamber on their own sheets; 2 ask above 65 °C: UltiMaker\'s Precision ASA at 100 °C (a set point for its own heated-chamber printer) and Nanovia\'s ASA at 90 °C. 2 of 20 is one in ten, the line D151 draws, with no margin: one maker fewer, or a third above 65 °C, would take the row back to unknown. The 19th and 20th, found by research intake 2 (m489), are AzureFilm ("This material can be printed without an enclosed printer", no enclosure needed, D168) and Prusa Research ("One of the best options is to place the printer inside an enclosure", an enclosure asked for, D93). 3DXTECH\'s recommendation names no chamber and is not counted. Bambu Lab\'s guide, which asks an enclosure for ASA (D90), answers the products of other makers; it is not a maker\'s statement and is not counted. No part of the family states a different need, so it is not split.',
  },
  CN07: {
    Reason: '11 makers state a chamber, none above 65 °C under D151: every window, from 25–80 °C to IPCON\'s 60–120 °C for PPS-GF, is within at its low end; LEHVOSS ("needs no temperature-controlled build chamber", research intake 2) and QIDI (PPS-GF20, read from its twin Fiberon PPS-GF20, D89) are the tenth and eleventh. The counts meet D151\'s line, but the researched bands for PPA, PPA-CF and PPA-GF lie at 80–120 °C, which a within row would contradict (CHAMBER-NEED-BAND-CONFLICT): the row stays reported until it is split or the owner rules. LCP publishes no chamber.',
  },
  CN10: {
    Reason: '18 makers state a chamber; 2 ask above 65 °C: 3DXTECH\'s FIBREX PA12 GF30 prints "Up to 120C", a window open at its bottom that D151 still reads by its upper end, and UltiMaker\'s MakerBot Specialty Nylon asks 100 °C, its own printer\'s set point. Raise3D\'s PA12 CF, which prints "without the heating chamber" on Raise3D\'s RMF 500, is the 18th (research intake 2). 2 of 18 is more than one in ten, so silence stays unknown; 20 makers with the same 2 would make it within. Read as "at most 120 °C", the 3DXTECH line would ask nothing above 65 °C and the family would be within (1 of 18): that reading is the owner\'s to make. PA6, PA12 and their filled grades state the same need, so the family is not split.',
  },
};
let set = 0;
for (const [id, cells] of Object.entries(ROWS)) {
  const row = t.get('chamber_need', id);
  for (const [c, v] of Object.entries(cells)) {
    if (row[c] === v) continue;
    t.set('chamber_need', id, c, v, { expect: row[c], migration: MIGRATION });
    set++;
  }
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, set, written: false })); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, set }));
