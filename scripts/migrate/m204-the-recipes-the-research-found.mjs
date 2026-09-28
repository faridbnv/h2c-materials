#!/usr/bin/env node
// Migration m204 (2026-09-27): print recipes the products' own cached sheets state, which the research package of
// 2026-09-26 found untyped (GOALS step 2, C9; P1-PRINT-02 to 05).
//
// The research package re-read, on the makers' own documents, the print settings of the products whose gates were
// unknown or answered by a twin or Bambu's guide. Most of what it found m170 to m173 and m190 had typed since. What was
// left is on sheets the database already holds, cached and hash-checked, and is typed here the way m172 typed the rest:
//
// - A hardened nozzle: Siraya Tech's Fibreheart PPA-GF ("... is mandatory"), QIDI's PET-GF ("Phaetus hardened steel and
//   above grade nozzles shall be selected"), AzureFilm LumberLay ("at least a 0.6 mm abrasion-resistant nozzle"),
//   Nobufil PLAx ("Nozzle hardened") and Protopasta's Stainless Steel and Magnetic Iron PLA ("more abrasive than
//   standard PLA and may require nozzle replacements"); not needed, Extrudr's FLEX MEDIUM MATT ("Hardened Nozzle no")
//   and FormFutura's Galaxy PLA ("is not abrasive to the nozzle"). The three PLAs read Bambu's PLA guide row ("no
//   special concern") until now; a product's own statement wins (D88).
// - An enclosure or chamber: Siraya Tech's Fibreheart PPA and 3DXTECH's WearX recommend an enclosure; 3D-Fuel's Pro
//   PCTG "typically doesn't require an enclosure"; Raise3D's Premium PC (V4 sheet) recommends a 70 to 80 °C chamber,
//   as its other sheet does (P0303, m136); Nanovia's PEI Ultem 1010 asks for "Enclosure temperature > 120 °C".
// - A nozzle or bed: Spectrum's ThermaTech PA nozzle (OPEN-PROBLEMS §14 named it), Spectrum's Glow in the Dark PLA bed,
//   AzureFilm SILK's "Heated bed: Not required (recommended 70-80 °C)".
// - Drying before printing, where the sheet gives a schedule the profile did not hold: Raise3D's PET GF, TPU-95A,
//   PET CF (both sheets) and Hyper Core PPA CF25, FormFutura's AthenaX GF10, Eryone's Standard and Wood PLA, Kingroon's
//   PLA Basic and TPU 90A.
// - Three products with no profile get one from their sheet: FormFutura's ReForm rTPU 90A and 85A (nozzle, bed, "Enclosure:
//   Not necessary", drying) and Python Flex TPU 90A ("Drying recommended").
//
// Raise3D Industrial PA12 CF's "Dry PA12 CF at 80°C for 12 hours" is its own sheet's; m206 writes it with the profile
// that sheet gives, when the PA12 CF+ sheet's records leave the grade. Left for the owner: Nobufil ABSx "even on printers
// without an enclosure", which would stand against Bambu's guide.
//
// Each statement is pinned in m204-the-recipes-the-research-found.csv with its page, the label of its row and the
// research finding it answers, and checked on that cached, hash-checked page before anything is written, as m172 does.
// The typed columns are the build's parsers' reading (the commit before this one taught them three of these wordings),
// except where Parse review says why not. The reviewer is an AI
// agent (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m204-the-recipes-the-research-found.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { parseTemperature, parseEnclosure, parseAbrasion, parseDrying } from '../../build/src/normalize/process.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';
import { pageReader } from './printed-on.mjs';

const migration = 'm204-the-recipes-the-research-found';
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
  if (f.Axis === 'drying') {
    const p = parseDrying(f.Raw);
    const read = { tempC: p.tempC == null ? NP : String(p.tempC), hours: p.hours == null ? NP : String(p.hours) };
    if ((read.tempC !== f['Drying °C'] || read.hours !== f['Drying hours']) && !reviewed) throw new Error(`${migration}: ${f.Fill} drying reads as ${read.tempC} °C, ${read.hours} h; pinned ${f['Drying °C']}, ${f['Drying hours']}`);
    return { Drying: f.Raw, 'Drying state': 'stated', 'Drying °C': f['Drying °C'], 'Drying hours': f['Drying hours'] };
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
  if (!printed(f.SourceID, f.Page, f.Raw, 7)) throw new Error(`${migration}: ${f.Fill} "${f.Raw}" is not printed on p. ${f.Page} of ${f.SourceID}`);
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
  const where = `p. ${f.Page}: ${f.Label}`;
  if (!p.Locator.includes(where)) t.set('profiles', f.Target, 'Locator', `${p.Locator}; ${where}`, { expect: p.Locator });
  if (f['Parse review'] !== NA) t.set('profiles', f.Target, 'Parse review', addReview(p['Parse review'], f['Parse review']), { expect: p['Parse review'] });
  count(f.Axis);
}

// ------------------------------------------------------------------ a profile for a product that had none
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
