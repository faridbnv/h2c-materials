#!/usr/bin/env node
// Migration m170 (2026-09-26): the test bars' settings are not the product's recipe (phase 6, lane 2, finished; GOALS
// step 2, C9; D63).
//
// Most makers print two blocks of print settings on one sheet: the recommended printing conditions, and the conditions
// their test specimens were printed under (Polymaker's "How to make specimens", Flashforge's "Testing Specimen Printing
// Conditions", eSUN's "Printing Test Conditions", Raise3D's "All testing specimens were printed under the following
// conditions", AzureFilm's "Test specimens print settings", 3DXTECH's "Printed Specimen Conditions"). The import read
// the specimen row where it read a nozzle or bed temperature, and recorded it as the maker's guidance: a single
// temperature ("Printing temperature 260°C") where the sheet recommends a window ("Nozzle temperature 245-265°C"), or,
// where the sheet recommends nothing (3DXTECH, Raise3D's Hyper Speed and Industrial lines), a window nobody published.
// Lane 2 found 35 of these on Polymaker sheets (docs/OPEN-PROBLEMS.md §12); reading every sheet with a specimen block
// found them on 177 profiles of eight makers.
//
// Each cell is corrected to what the recommended block prints for it, as printed, or to Not published where the sheet
// recommends nothing: the specimen block is how the bars were printed, which D63 puts with the measurements (their
// Specimen / print parameters), not in a recipe. Every edit
// is pinned in m170-the-test-bars-are-not-the-recipe.csv with the specimen statement it replaces (checked on its page,
// with the replaced number in it) and the recommended statement it writes (checked on its page), and the typed columns
// are the build's parser's reading of the new words. The Locator names what the profile now holds. Two profiles gain
// the recommended row the import left beside the one it misread (AzureFilm ABS's bed), and PolySonic's two sheets'
// second profile holds the High-speed window the sheet prints beside the Classic one its sibling profile holds.
//
// The reviewer of every row is an agent (Claude Opus 5.5), reading each sheet's two blocks; no person has reviewed them.
// A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m170-the-test-bars-are-not-the-recipe.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm170-the-test-bars-are-not-the-recipe';
const here = dirname(fileURLToPath(import.meta.url));
const edits = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NA = 'Not applicable';
const NP = 'Not published';
const LABEL = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };

const t = openTables();
const printed = pageReader(t, migration);
const numbers = (s) => (String(s).match(/\d+(?:\.\d+)?/g) ?? []).map(Number);

// ------------------------------------------------------------------------------------------ check every row first
for (const e of edits) {
  const p = t.get('profiles', e.ProfileID);
  if (p.GradeID !== e.GradeID || p.SourceID !== e.SourceID) throw new Error(`${migration}: ${e.Edit} ${e.ProfileID} is ${p.GradeID} citing ${p.SourceID}`);
  if (e.Axis === 'locator') continue;
  if (e.SpecStatement !== NA) {
    if (!printed(e.SourceID, e.SpecPage, e.SpecStatement)) throw new Error(`${migration}: ${e.Edit} "${e.SpecStatement}" is not printed on p. ${e.SpecPage} of ${e.SourceID}`);
    // The replaced cell is the specimen row's value: its numbers are that row's.
    const specimen = numbers(e.SpecStatement);
    if (!numbers(e.Replaces).every((n) => specimen.includes(n))) throw new Error(`${migration}: ${e.Edit} "${e.Replaces}" is not the value of "${e.SpecStatement}"`);
  } else if (e.Replaces !== NP) throw new Error(`${migration}: ${e.Edit} replaces "${e.Replaces}" and names no specimen row it came from`);
  if (e.Raw === NP) {
    if (e.State !== 'unknown') throw new Error(`${migration}: ${e.Edit} Not published is state unknown`);
    continue;
  }
  if (!printed(e.SourceID, e.Page, e.Raw)) throw new Error(`${migration}: ${e.Edit} "${e.Raw}" is not printed on p. ${e.Page} of ${e.SourceID}`);
  const read = parseTemperature(e.Raw, { plausible: TEMP_WINDOW[e.Axis] });
  const typed = { state: read.state, min: String(read.min ?? NP), max: String(read.max ?? NP), requirement: read.requirement };
  const pinned = { state: e.State, min: e.Min, max: e.Max, requirement: e.Requirement };
  for (const k of Object.keys(typed)) if (typed[k] !== pinned[k]) throw new Error(`${migration}: ${e.Edit} ${k} reads as ${typed[k]}, pinned ${pinned[k]}`);
}

// ------------------------------------------------------------------------------------------------------ write
let changed = 0;
const tally = {};
for (const e of edits) {
  const p = t.get('profiles', e.ProfileID);
  const column = e.Axis === 'locator' ? 'Locator' : `${LABEL[e.Axis]} °C`;
  if (p[column] === e.Raw) continue; // already written
  if (p[column] !== e.Replaces) throw new Error(`${migration}: ${e.Edit} ${e.ProfileID} ${column} reads "${p[column]}", expected "${e.Replaces}"; the data moved since this edit was pinned`);
  t.set('profiles', e.ProfileID, column, e.Raw, { expect: e.Replaces });
  if (e.Axis !== 'locator') {
    const label = LABEL[e.Axis];
    const cells = { [`${label} state`]: e.State, [`${label} min °C`]: e.Min, [`${label} max °C`]: e.Max, [`${label} requirement`]: e.Requirement };
    for (const [c, v] of Object.entries(cells)) t.set('profiles', e.ProfileID, c, v);
  }
  const kind = e.Axis === 'locator' ? 'locator' : `${e.Axis} ${e.Raw === NP ? '-> Not published' : e.Replaces === NP ? 'filled' : '-> recommended'}`;
  tally[kind] = (tally[kind] ?? 0) + 1;
  changed++;
}

// ------------------------------------------------------------ a coverage finding the correction made untrue
// A material whose only print settings were its specimens' has none left: its "Print setup" row said Evidence recorded
// on the strength of them (COVERAGE-UNTRUE). The row is superseded, never edited (D72), by one that says what is true.
const date = '2026-09-26';
const retiredGrades = new Set(t.rows('grades').filter((g) => g.Status === 'retired').map((g) => g.GradeID));
const publishes = (p) => !retiredGrades.has(p.GradeID) && (['Nozzle', 'Bed', 'Chamber'].some((a) => p[`${a} state`] !== 'unknown') || p['Drying state'] === 'stated');
for (const c of t.rows('coverage').filter((x) => x.Domain === 'Print setup' && x.Status === 'Evidence recorded')) {
  const own = t.rows('profiles').filter((p) => p.MaterialID === c.MaterialID);
  if (own.some(publishes) || !own.some((p) => edits.some((e) => e.ProfileID === p.ProfileID))) continue;
  const id = t.nextId('coverage');
  t.append('coverage', { CoverageID: id, MaterialID: c.MaterialID, Domain: 'Print setup', Status: 'Gap', 'Manufacturer count': NA,
    Finding: `No printing settings published: the only settings on record were the conditions its specimens were printed under, which are not printing guidance (${migration}, ${date}).` });
  t.set('coverage', c.CoverageID, 'Finding', `Superseded by ${id} (${date}; was "${c.Status}"): ${c.Finding}`, { expect: c.Finding });
  t.set('coverage', c.CoverageID, 'Status', 'Superseded', { expect: c.Status });
  tally['coverage superseded'] = (tally['coverage superseded'] ?? 0) + 1;
  changed++;
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} cell(s) written on ${new Set(edits.map((e) => e.ProfileID)).size} profile(s)`);
