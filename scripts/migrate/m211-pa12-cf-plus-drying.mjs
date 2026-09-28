#!/usr/bin/env node
// Migration m211 (2026-09-27): Raise3D Industrial PA12 CF+'s drying schedule, on the profile its own sheet gives it
// (GOALS step 2, C9; OPEN-PROBLEMS §12).
//
// m205 filed the PA12 CF+ sheet as its own product (G059-03) with the profile the import had read from it (P0642),
// which holds its hardened nozzle and no drying. The sheet's note 1 on p. 3 gives the schedule: "Dry PA12 CF+ at 80°C
// for 12 hours before printing". The parser reads a temperature from the product's name ("PA12"), so the typed 80 °C is
// written with a Parse review, as m205 did for the PA12 CF sheet's same sentence. The reviewer is an AI agent
// (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m211-pa12-cf-plus-drying.mjs

import { openTables } from '../data/table-io.mjs';
import { parseDrying } from '../../build/src/normalize/process.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm211-pa12-cf-plus-drying';
const NP = 'Not published';
const NA = 'Not applicable';
const PROFILE = 'P0642';
const SOURCE = 'D-RAISE3D-Raise3D-Industrial-PA12-CF-TDS-V3-0-76400e';
const DRY = 'Dry PA12 CF+ at 80°C for 12 hours before printing, moisture content is crucial for final printed partquality.';
const t = openTables();
const printed = pageReader(t, migration);
if (!printed(SOURCE, 3, DRY, 2)) throw new Error(`${migration}: ${SOURCE} p. 3 no longer prints "${DRY}"`);
const p = t.get('profiles', PROFILE);
if (p.GradeID !== 'G059-03' || p.SourceID !== SOURCE) throw new Error(`${migration}: ${PROFILE} is ${p.GradeID} citing ${p.SourceID}`);
let n = 0;
if (p.Drying !== DRY) {
  if (p.Drying !== NP) throw new Error(`${migration}: ${PROFILE} Drying reads "${p.Drying}"; the data moved`);
  const read = parseDrying(DRY);
  t.set('profiles', PROFILE, 'Drying', DRY, { expect: NP });
  t.set('profiles', PROFILE, 'Drying state', 'stated', { expect: 'unknown' });
  t.set('profiles', PROFILE, 'Drying °C', '80', { expect: NA });
  t.set('profiles', PROFILE, 'Drying hours', '12', { expect: NA });
  t.set('profiles', PROFILE, 'Locator', `${p.Locator}; p. 3: note 1`, { expect: p.Locator });
  const review = `${migration}: the parser takes "12" from the product's name ("PA12 CF+") for the drying temperature (it reads ${read.tempC} °C); the sheet says 80 °C for 12 hours.`;
  t.set('profiles', PROFILE, 'Parse review', p['Parse review'] === NA ? review : `${p['Parse review']} ${review}`, { expect: p['Parse review'] });
  n++;
}
if (n) t.save();
console.log(`${migration}: ${n} profile(s) written`);
