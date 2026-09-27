#!/usr/bin/env node
// Migration m192 (2026-09-27): the test bars' print settings go on the measurements they were printed for (D63;
// OPEN-PROBLEMS §12; phase 6, final round).
//
// m170 took the specimen blocks out of the print profiles, where the import had read them as the product's recipe
// ("Printed Specimen Conditions ... Extrusion Temp: 225°C", "All testing specimens were printed under the following
// conditions: ..."). D63 puts them on the measurements, in Specimen / print parameters: they are the tested conditions.
// On the 50 sheets whose profiles m170 left with no value, 332 measurements still said Not published there.
//
// Each sheet's block is pinned in m192-the-test-bar-settings.csv as the page prints it, and checked on its cached,
// hash-checked page before anything is written. A block goes on a measurement the sheet ties it to:
//
// - "printed": 3DXTECH's "Printed Specimen Conditions" stand under the whole sheet, whose rows the import already
//   records as Printed specimen; every such row takes the block, as the three 3DXTECH sheets that had it do.
// - "bars": Raise3D's "All testing specimens were printed under the following conditions" and Polymaker's "How to make
//   specimens" describe the test bars. As m128 read the statements it knew, a block covers the bars a test is made on:
//   the mechanical tests, heat deflection and Vicat. Those rows are Printed specimen too; they had said "do not assume
//   printed" only because m128's reader did not know these two wordings. Density, the DSC temperatures, melt flow,
//   water uptake and moisture are not measured on the bar the block describes, and keep Not published.
//
// Left: Raise3D Industrial PET CF V4.0's only row without a setting, a 6 GPa modulus its p. 1 prose claims "after
// annealing", which no table ties to a specimen; and the sheets whose remaining rows are all density, water uptake,
// DSC or moisture (Raise3D's Hyper Core, Hyper Speed and PPS-CF lines, PolyMax PLA v1, PC-Max v1.0). A cell that
// already holds the tested conditions is never overwritten.
//
// The reviewer is an agent, claude-opus-5.5 (agent reviewer), reading each block on its page; no person has reviewed
// them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m192-the-test-bar-settings.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { pageReader } from './printed-on.mjs';
import { withNote } from './source-edits.mjs';

const migration = 'm192-the-test-bar-settings';
const DATE = '2026-09-27';
const here = dirname(fileURLToPath(import.meta.url));
const sheets = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NP = 'Not published';
const PRINTED = 'Printed specimen';
const UNSTATED = 'Not published (do not assume printed)';
const LEFT = new Map([['V007190', 'a modulus p. 1 claims in prose "after annealing", which no table ties to a specimen']]);

const t = openTables();
const printed = pageReader(t, migration);
const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);

// Check every block on its page first.
for (const s of sheets) {
  // The block, and the heading or sentence that says it is how the test specimens were printed (Polymaker sets its
  // heading letter by letter, as the page's text has it).
  for (const words of [s.Block, s.Says]) if (!printed(s.SourceID, s.Page, words)) throw new Error(`${migration}: "${words}" is not printed on p. ${s.Page} of ${s.SourceID}`);
  if (!['printed', 'bars'].includes(s.Scope)) throw new Error(`${migration}: ${s.SourceID} scope ${s.Scope}`);
}

let changed = 0, typed = 0;
const tally = {};
for (const s of sheets) {
  const rows = t.rows('measurements').filter((m) => m.SourceID === s.SourceID && /^Published value/.test(m['Data status']) && !LEFT.has(m.MeasurementID));
  let n = 0;
  for (const m of rows) {
    const cell = m['Specimen / print parameters'];
    if (cell === s.Block) continue; // already written
    if (cell !== NP) continue; // a cell that holds the tested conditions already is never overwritten
    const bar = BARS.has(m.Property);
    const takes = s.Scope === 'printed' ? m['Specimen type'] === PRINTED : bar && [PRINTED, UNSTATED].includes(m['Specimen type']);
    if (!takes) continue;
    const before = { ...m };
    t.set('measurements', m.MeasurementID, 'Specimen / print parameters', s.Block, { expect: NP });
    let note = `Specimen / print parameters holds what p. ${s.Page} prints under "${s.Heading}", the conditions its test specimens were printed under (D63), which m170 took out of the product's print profile.`;
    if (m['Specimen type'] === UNSTATED) {
      t.set('measurements', m.MeasurementID, 'Specimen type', PRINTED, { expect: UNSTATED });
      note += ` Specimen type Printed specimen: "${s.Heading}" says the test bars were printed, a wording m128's reader did not know.`;
      typed++;
    }
    t.set('measurements', m.MeasurementID, 'Notes', withNote(before.Notes, `Corrected ${DATE} (${migration}) against the source: ${note}`), { expect: before.Notes });
    n++;
  }
  if (n) tally[s.SourceID.replace(/^(X-ECOMAX|D-RAISE3D|S-POLYCN).*/, '$1')] = (tally[s.SourceID.replace(/^(X-ECOMAX|D-RAISE3D|S-POLYCN).*/, '$1')] ?? 0) + n;
  changed += n;
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} measurement(s) of ${sheets.length} sheets hold their test bars' print settings (${typed} now Printed specimen)`);
