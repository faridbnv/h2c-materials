#!/usr/bin/env node
// Migration m172 (2026-09-26): the print recipes the products' own sheets state, finished (phase 6, lane 2; GOALS
// step 2, C9).
//
// m136 filled the chamber, enclosure and drying rows it could read, and left three things: the wordings the parser could
// not read, the hardened-nozzle column, and the nozzle and bed of products that already had a profile. The parsers now
// read the wordings (the commit before this one), and this fills what the products' own cached sheets state:
//
// - Enclosure and chamber, in the words the parser learnt: Polymaker's "Closure chamber | Needed", "No Needed" and
//   "Needed (90-100°C)"; Eryone's "Sealed printing" row ("Supports open/closed printing", "Closed printing", "Box
//   Sealing Print"); BASF's "Build Chamber Temperature -"; CreatBot's "OFF"; Polymaker ABS Max's "65˚C+"; the prose
//   "can be used on 3D printers in non-heated chambers", where the sheet prints no chamber row (a sheet that prints both,
//   as SIDDAMENT's PPA-CF and PPS CF do with "Printing Environmental Temperature | Room temperature ~80℃", gives the
//   row, which says more); eSUN's "we highly recommend printing PC-HT material within a
//   closed chamber printer" (only where the sentence names the product: two eSUN sheets print the ABS-CF sentence and
//   are left). Also the labelled rows m136's rules did not reach: Spectrum's and The Filament's "Closed chamber (for
//   printing)", Kingroon's "Chamber Temperature", SUNLU's "Room Temp. | Room Temperature", QIDI's heated-chamber advice.
// - The hardened nozzle: Spectrum's and The Filament's "Ruby or hardened nozzle (recommended)" row, Extrudr's
//   "Hardened Nozzle | no", and the makers' sentences ("We recommend to use ruby nozzles or hardened steel nozzles.",
//   "A reinforced nozzle, suitable for abrasive materials is recommended.", "No hardened nozzle required").
// - Nozzle and bed, for every product whose profiles hold none: SUNLU's speed-tiered table (every tier is the
//   recommendation, so the cell lists them), SIDDAMENT's, QIDI's, Anycubic's, Eryone's and the rest.
// - Two corrections of a reading: BASF PC GF30's "Not required / '-' in TDS" and TPC 45D's "No setpoint published ('-' in
//   TDS)" become the sheet's own "-", which is no setpoint (PC GF30's chamber was read as not required); and eleven cells
//   printed as an at-least value ("> 100 °C", "≥ 50°C") keep their words and lose the upper end nobody published.
//
// Each statement is pinned in m172-the-recipes-the-sheets-state.csv with its page and the label of its row, and checked
// on that cached, hash-checked page before anything is written (its words stand there in order, with up to seven words
// of a two-column layout between them). The typed columns are the build's parsers' reading, except where Parse review
// says why not. A statement goes on the product's lowest-numbered profile citing that document; a product with none
// citing it gets a new profile, every axis the document does not state left Not published. Only a document linked to
// this product alone counts, never a twin's, a retailer's page or a family guide, and never the conditions its test
// specimens were printed under (m170).
//
// The reviewer of every row is an agent (Claude Opus 5.5), reading the candidates the rules proposed on each page; no
// person has reviewed them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m172-the-recipes-the-sheets-state.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseEnclosure, parseAbrasion } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm172-the-recipes-the-sheets-state';
const here = dirname(fileURLToPath(import.meta.url));
const fills = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NA = 'Not applicable';
const NP = 'Not published';
const COLUMN = { nozzle: 'Nozzle', bed: 'Bed', chamber: 'Chamber' };

const t = openTables();
const printed = pageReader(t, migration);

// ------------------------------------------------------------------------------------------ the typed reading
function typedCells(f) {
  const reviewed = f['Parse review'] !== NA;
  if (f.Axis === 'enclosure') {
    const state = parseEnclosure(f.Raw).state;
    if (state !== f.State && !reviewed) throw new Error(`${migration}: ${f.Fill} enclosure reads as ${state}, pinned ${f.State}`);
    return { Enclosure: f.Raw, 'Enclosure state': f.State };
  }
  if (f.Axis === 'hardened') {
    const h = parseAbrasion(f.Raw).requiresHardened;
    const read = h == null ? NP : h ? 'TRUE' : 'FALSE';
    if (read !== f.Hardened && !reviewed) throw new Error(`${migration}: ${f.Fill} hardened reads as ${read}, pinned ${f.Hardened}`);
    return { 'Abrasion / clogging': f.Raw, 'Hardened nozzle': f.Hardened };
  }
  const label = COLUMN[f.Axis];
  const p = parseTemperature(f.Raw, { plausible: TEMP_WINDOW[f.Axis] });
  const range = p.state === 'range';
  const read = { state: p.state, min: range ? String(p.min ?? NP) : NA, max: range ? String(p.max ?? NP) : NA, requirement: p.requirement };
  const pinned = { state: f.State, min: f.Min, max: f.Max, requirement: f.Requirement };
  for (const k of Object.keys(read)) if (read[k] !== pinned[k] && !reviewed) throw new Error(`${migration}: ${f.Fill} ${label} ${k} reads as ${read[k]}, pinned ${pinned[k]}, and no Parse review says why`);
  return { [`${label} °C`]: f.Raw, [`${label} state`]: f.State, [`${label} min °C`]: f.Min, [`${label} max °C`]: f.Max, [`${label} requirement`]: f.Requirement };
}

for (const f of fills) {
  const g = t.get('grades', f.GradeID);
  if (g.Status !== 'active') throw new Error(`${migration}: ${f.Fill} ${f.GradeID} is ${g.Status}`);
  if (f.Label !== 'retype' && !printed(f.SourceID, f.Page, f.Raw, 7)) throw new Error(`${migration}: ${f.Fill} "${f.Raw}" is not printed on p. ${f.Page} of ${f.SourceID}`);
  f.cells = typedCells(f);
}

let changed = 0;
const tally = {};
const count = (k) => { tally[k] = (tally[k] ?? 0) + 1; changed++; };
const addReview = (before, text) => (before == null || before === NA ? text : before.includes(text) ? before : `${before} ${text}`);

// ------------------------------------------------------------------------------ the product's own profile
for (const f of fills.filter((x) => x.Target !== 'new')) {
  const p = t.get('profiles', f.Target);
  if (p.GradeID !== f.GradeID || p.SourceID !== f.SourceID) throw new Error(`${migration}: ${f.Fill} ${f.Target} is ${p.GradeID} citing ${p.SourceID}`);
  const cells = Object.entries(f.cells);
  const [rawColumn] = cells[0];
  if (cells.every(([c, v]) => p[c] === v)) continue; // already written
  if (p[rawColumn] !== f.Replaces && p[rawColumn] !== f.Raw) throw new Error(`${migration}: ${f.Fill} ${f.Target} ${rawColumn} reads "${p[rawColumn]}", expected "${f.Replaces}"; the data moved since this fill was pinned`);
  for (const [column, value] of cells) t.set('profiles', f.Target, column, value);
  if (f.Label !== 'retype') {
    const where = `p. ${f.Page}: ${f.Label}`;
    if (!p.Locator.includes(where)) t.set('profiles', f.Target, 'Locator', `${p.Locator}; ${where}`, { expect: p.Locator });
  }
  if (f['Parse review'] !== NA) t.set('profiles', f.Target, 'Parse review', addReview(p['Parse review'], f['Parse review']), { expect: p['Parse review'] });
  count(f.Label === 'retype' ? `${f.Axis} at-least reading` : f.Replaces === NP ? f.Axis : `${f.Axis} corrected`);
}

// ------------------------------------------------------------------ a profile for a document that had none
const fresh = new Map();
for (const f of fills.filter((x) => x.Target === 'new')) (fresh.get(`${f.GradeID}|${f.SourceID}`) ?? fresh.set(`${f.GradeID}|${f.SourceID}`, []).get(`${f.GradeID}|${f.SourceID}`)).push(f);
for (const [key, list] of [...fresh].sort(([a], [b]) => (a < b ? -1 : 1))) {
  const [gradeId, sourceId] = key.split('|');
  const g = t.get('grades', gradeId);
  const byPage = new Map();
  for (const f of [...list].sort((a, b) => Number(a.Page) - Number(b.Page))) (byPage.get(f.Page) ?? byPage.set(f.Page, []).get(f.Page)).push(f.Label);
  const locator = [...byPage].map(([page, labels]) => `p. ${page}: ${[...new Set(labels)].join(', ')}`).join('; ');
  if (t.rows('profiles').some((p) => p.GradeID === gradeId && p.SourceID === sourceId && p.Locator === locator)) continue; // already written
  const row = {
    ProfileID: t.nextId('profiles'), MaterialID: g.MaterialID, GradeID: gradeId, Profile: 'Manufacturer published guidance',
    'Nozzle °C': NP, 'Nozzle state': 'unknown', 'Nozzle min °C': NA, 'Nozzle max °C': NA, 'Nozzle requirement': 'unknown',
    'Bed °C': NP, 'Bed state': 'unknown', 'Bed min °C': NA, 'Bed max °C': NA, 'Bed requirement': 'unknown',
    'Chamber °C': NP, 'Chamber state': 'unknown', 'Chamber min °C': NA, 'Chamber max °C': NA, 'Chamber requirement': 'unknown',
    Enclosure: NP, 'Enclosure state': 'unknown', Plate: NP, Drying: NP, 'Drying state': 'unknown', 'Drying °C': NA, 'Drying hours': NA,
    'Nozzle material': NP, 'Nozzle diameter': NP, 'Abrasion / clogging': NP, 'Hardened nozzle': NP,
    'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval',
    'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade', 'AMS published': NP,
    'Support pairing': NP, 'Failure modes': NP, SourceID: sourceId, 'H2C SourceID': 'H2C-WIKI', Locator: locator, 'Parse review': NA,
  };
  for (const f of list) {
    Object.assign(row, f.cells);
    if (f['Parse review'] !== NA) row['Parse review'] = addReview(row['Parse review'], f['Parse review']);
    count(f.Axis);
  }
  t.append('profiles', row);
  tally['new profiles'] = (tally['new profiles'] ?? 0) + 1;
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} statement(s) written from the products' own sheets`);
