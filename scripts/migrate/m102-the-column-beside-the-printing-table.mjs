#!/usr/bin/env node
// Migration m102 (2026-09-21): the sentence eleven print setups kept from the column beside them, and the
// answer twenty-six sheets gave about a hardened nozzle.
//
// OPEN-PROBLEMS §9. A data sheet prints its storage paragraph beside its printing table, extraction interleaves
// the two by line, and the setting cell kept what followed it: "240-290°C STORAGE AND SHELF LIFE",
// "80-100°C Filament should be stored in a dr y room at room". The windows were never affected —
// `parseTemperature` reads the range at the head of the cell and stops — but the text a reader is shown was
// nonsense, and in two sheets it swallowed data that belongs in a column of its own.
//
// Every cell here was re-read from its own source, cached and hash-checked (D35).
//
// Three things are corrected:
//
//   1. The eleven setting cells that kept a neighbour's sentence now hold what their own cell prints.
//
//   2. Five Fiberon sheets print their printing table two columns wide, and the right-hand column went into the
//      left-hand cells: "Nozzle temperature 280-300 °C Printing speed Up to 300mm/s" is two settings, not one.
//      The drying schedule and the support the maker pairs the filament with move into the columns that own
//      them, and the printing speed into a profile note, which is where a speed is recorded. The annealing
//      schedule beside them is already on every measurement of those sources, where an annealing belongs.
//
//   3. Twenty-six `Nozzle material` cells read "recommended No", "recommended Yes" or "Ye s". Spectrum's sheets
//      ask the question in the label — "Ruby or hardened nozzle recommended" — and answer it in the cell. The
//      cell now holds the answer. Twenty of those answers are **No**, which the database was not recording at
//      all: their `Abrasion / clogging` column said "Not published" while the sheet plainly said a hardened
//      nozzle is not needed. It now carries the sheet's own row, and `parseAbrasion` reads an answer where the
//      label asks the question, so twenty ordinary PLAs and PETGs stop being unknown and say what they are.
//
//   node scripts/migrate/m102-the-column-beside-the-printing-table.mjs

import { openTables } from '../data/table-io.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm102';
const NP = 'Not published';

// What each cell holds now, and what its own sheet prints. The expected value is named so a re-run is a no-op.
const SETTINGS = [
  { id: 'P0031', nozzle: ['230-260°C STORAGE AND SHELF LIFE', '230-260°C'], bed: ['60-80°C Filament should be stored in a dr y room at room', '60-80°C'] },
  { id: 'P0046', nozzle: ['- standard speed 270-290°C sunlight and direct heat. When stored properly,', '270-290°C'], bed: ['>80°C product has a shelf life of 24 months.', '>80°C'] },
  { id: 'P0058', nozzle: ['200-240°C Filament should be stored in a dr y room at room', '200-240°C'], bed: ['0-50°C is ca. 18-25°C (64.4 -77.0°F). Keep out of moisture,', '0-50°C'] },
  { id: 'P0070', nozzle: ['- standard speed 255-290°C', '255-290°C'] },
  { id: 'P0092', nozzle: ['300-330°C Filament should be stored in a dry room at room', '300-330°C'], bed: ['100-120°C temperature. Recommended storage temperature', '100-120°C'] },
  { id: 'P0102', nozzle: ['230-245°C is ca. 18-25°C (64.4 -77.0°F). Keep out of moisture,', '230-245°C'], bed: ['80-100°C product has a shelf life of 24 months.', '80-100°C'] },
  { id: 'P0107', nozzle: ['240-290°C STORAGE AND SHELF LIFE', '240-290°C'], bed: ['80-100°C Filament should be stored in a dr y room at room', '80-100°C'] },
  { id: 'P0111', bed: ['60-100°C temperature. Recommended storage temperature', '60-100°C'] },
  { id: 'P0114', nozzle: ['250-270°C STORAGE AND SHELF LIFE', '250-270°C'], bed: ['> 50°C Filament should be stored in a dry room at room', '> 50°C'] },
  { id: 'P0120', nozzle: ['240 - 265°C PC/ABS FR V0 is a professional, halogen-free', '240 - 265°C'], bed: ['90 - 110°C filament for 3D printers. It is designed to meet', '90 - 110°C'],
    material: ['not necessary • Excellent interlayer adhesion', 'not necessary'] },
];

// The answer each sheet gives where its label asks the question.
const ANSWERS = [
  { ids: ['P0031', 'P0058', 'P0107', 'P0181', 'P0193', 'P0201', 'P0202', 'P0211', 'P0212', 'P0213', 'P0216', 'P0219', 'P0230', 'P0545', 'P0549', 'P0550', 'P0554', 'P0556', 'P0727', 'P0900'],
    was: 'recommended No', answer: 'No', row: 'Ruby or hardened nozzle recommended No', hardened: 'FALSE' },
  { ids: ['P0174', 'P0222', 'P0232', 'P0734'], was: 'recommended Yes', answer: 'Yes', row: null, hardened: null },
  { ids: ['P0046', 'P0070'], was: 'Ye s', answer: 'Yes', row: null, hardened: null },
];

const t = openTables();
const note = (id, what) => {
  const row = t.get('profiles', id);
  const before = row['Parse review'];
  const text = `Corrected ${DATE} (${MIGRATION}) against the source: ${what}`;
  t.set('profiles', id, 'Parse review', before === 'Not applicable' || !before ? text : `${before} ${text}`, { expect: before });
};

let changed = 0;
for (const s of SETTINGS) {
  for (const [field, pair] of [['Nozzle °C', s.nozzle], ['Bed °C', s.bed], ['Nozzle material', s.material]]) {
    if (!pair) continue;
    const [was, now] = pair;
    if (t.get('profiles', s.id)[field] === now) continue;
    t.set('profiles', s.id, field, now, { expect: was });
    changed++;
  }
  note(s.id, "the cell held the sentence printed beside it in the column to its right; it now holds what its own cell prints.");
}

// Fiberon's printing table is two columns wide, and the right-hand one went into the left-hand cells. Its
// settings move into the columns that own them: the speed into a profile note, the drying schedule into Drying
// and its typed pair, the support Polymaker pairs the filament with into Support pairing. The annealing
// schedule beside them is already on every measurement of these sources (Anneal °C, Anneal h), which is where
// an annealing belongs, so nothing is written for it twice.
const FIBERON = [
  { id: 'P0074', nozzle: ['250-300 °C Printing speed Up to 300mm/s', '250-300 °C'], speed: 'Up to 300mm/s',
    bed: ['40-50 °C Drying temp. and time 100 °C/10H PolySupport™ for PA12', '40-50 °C'], drying: ['100 °C/10H', '100', '10'],
    chamber: ['Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve™ S1', 'Room Temp.'], support: 'PolySupport™ for PA12; PolyDissolve™ S1' },
  { id: 'P0078', nozzle: ['250-300 °C Printing speed Up to 300mm/s', '250-300 °C'], speed: 'Up to 300mm/s',
    bed: ['40-50 °C Drying temp. and time 100 °C/10H PolySupport™ for PA12', '40-50 °C'], drying: ['100 °C/10H', '100', '10'],
    chamber: ['Room Temp. Annealing temp. and time 100 °C/16H PolyDissolve™ S1', 'Room Temp.'], support: 'PolySupport™ for PA12; PolyDissolve™ S1' },
  { id: 'P0083', nozzle: ['280-300 °C Printing speed Up to 300mm/s', '280-300 °C'], speed: 'Up to 300mm/s',
    bed: ['40-50 °C Drying temp. and time 100 °C/10H', '40-50 °C'], drying: ['100 °C/10H', '100', '10'],
    chamber: ['Room Temp. Annealing temp. and time 100 °C/16H PolySupport™ for PA12', 'Room Temp.'], support: 'PolySupport™ for PA12' },
  { id: 'P0084', nozzle: null, speed: 'Up to 300mm/s', bed: null,
    chamber: ['Room Temp. Annealing temp. and time 100 °C/16H PolySupport™ for PA12', 'Room Temp.'],
    drying: ['100 °C/10H', '100', '10'], support: 'PolySupport™ for PA12' },
  { id: 'P0095', nozzle: ['310-350 °C Printing speed Up to 250mm/s', '310-350 °C'], speed: 'Up to 250mm/s',
    bed: ['80-90 °C Drying temp. and time 100 °C/10H', '80-90 °C'], drying: ['100 °C/10H', '100', '10'],
    chamber: ['Room temp. Annealing temp. and time 130 °C/10H', 'Room temp.'], support: 'PolySupport™ for PA12' },
];
for (const f of FIBERON) {
  const row = t.get('profiles', f.id);
  for (const [field, pair] of [['Nozzle °C', f.nozzle], ['Bed °C', f.bed], ['Chamber °C', f.chamber]]) {
    if (!pair || row[field] === pair[1]) continue;
    t.set('profiles', f.id, field, pair[1], { expect: pair[0] });
    changed++;
  }
  if (row.Drying === NP) {
    t.set('profiles', f.id, 'Drying', f.drying[0], { expect: NP });
    t.set('profiles', f.id, 'Drying state', 'stated', { expect: row['Drying state'] });
    t.set('profiles', f.id, 'Drying °C', f.drying[1], { expect: row['Drying °C'] });
    t.set('profiles', f.id, 'Drying hours', f.drying[2], { expect: row['Drying hours'] });
    changed += 4;
  }
  if (row['Support pairing'] === NP) { t.set('profiles', f.id, 'Support pairing', f.support, { expect: NP }); changed++; }
  if (!t.rows('profile_notes').some((n) => n.ProfileID === f.id && n.Topic === 'Speed')) {
    t.append('profile_notes', { ProfileID: f.id, Topic: 'Speed', Text: f.speed });
    changed++;
  }
  note(f.id, "the sheet prints its printing table two columns wide, and the right-hand column stood in the left-hand cells; each setting is now in the column that owns it.");
}

for (const a of ANSWERS) {
  for (const id of a.ids) {
    const row = t.get('profiles', id);
    if (row['Nozzle material'] !== a.answer) { t.set('profiles', id, 'Nozzle material', a.answer, { expect: a.was }); changed++; }
    if (a.row && row['Abrasion / clogging'] === NP) {
      t.set('profiles', id, 'Abrasion / clogging', a.row, { expect: NP });
      t.set('profiles', id, 'Hardened nozzle', a.hardened, { expect: row['Hardened nozzle'] });
      changed += 2;
    }
    note(id, `the sheet asks "Ruby or hardened nozzle recommended" in its label and answers "${a.answer}" in the cell; the cell held the tail of the label with the answer.`);
  }
}

if (changed) t.save();
console.log(`${changed} cell(s) corrected across ${new Set([...SETTINGS.map((s) => s.id), ...ANSWERS.flatMap((a) => a.ids)]).size} profile(s)`);
