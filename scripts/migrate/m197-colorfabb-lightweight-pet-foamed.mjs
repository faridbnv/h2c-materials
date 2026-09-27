#!/usr/bin/env node
// Migration m197 (2026-09-27): colorFabb's lightweight PETs are judged foamed (the owner's decision 6 of 2026-09-26,
// docs/GOALS.md; D95).
//
// colorFabb's sheets for Lightweight PET and Lightweight PET FLEX (G141-01, G141-02) print their mechanical table, "3D
// Printed", in two value columns: "Value unfoamed @ 210 °C" and "Value foamed @ 260 °C, flow: 60%" (p. 1), and p. 2 says
// the specimens were "printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle, 210/260 ˚C nozzle
// temperature and 60 ˚C bed temperature", its print guideline giving the flow of each column (100 % and 60 %). The
// reader reads no row with two value columns, so the record tier held all twelve rows (source_facts) and PET-LW (M141)
// was "not published" on stiffness. The owner ruled: the value as the product is meant to be printed, foamed, decides,
// and the unfoamed value is recorded beside it.
//
//   foamed     Specimen type Printed specimen, Direction XY: the product's own values, which the rule chooses.
//   unfoamed   Specimen type "Printed off the product's recipe" (D95, a new value of schema/vocab/specimen-types.csv, its
//              Form off-recipe): a printed bar, but not the product as it is printed. The build keeps it and shows it,
//              and it is no product value, bound or estimate observation, as a moulded or a film value is none.
//
// Each of the six rows both columns print is recorded twice: the tensile modulus, strength and elongation at break, the
// flexural modulus and strength, and the notched Charpy impact strength ("Charpy Notch").
//
// The same pages, and those of colorFabb's three other PET sheets, head their thermal table "Thermal Properties*" and
// say beneath it "*These results are obtained from the information provided by the supplier of the raw material". Their
// glass transition (67.6 °C on all five) was recorded as a printed specimen's, which the glass transition headline (D92)
// takes as the product's; it is the resin supplier's, as eleven other such rows already say. The five become Raw material
// value.
//
// Every figure is checked on its page before anything is written. The reader is an AI agent (claude-opus-5.5, agent
// reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m197-colorfabb-lightweight-pet-foamed.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { correct, addValue } from './source-edits.mjs';

const migration = 'm197-colorfabb-lightweight-pet-foamed';
const date = '2026-09-27';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const RULING = 'colorFabb\'s lightweight PETs are judged foamed, the unfoamed value recorded beside it (the owner\'s decision 6 of 2026-09-26, D95)';
const OFF = 'Printed off the product\'s recipe';
const t = openTables();

const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const lines = (sourceId, page) => {
  const s = t.get('sources', sourceId);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
  return text.pages.find((p) => p.page === page).lines.map((l) => norm(typeof l === 'string' ? l : l.text));
};
const has = (sourceId, page, line) => {
  if (!lines(sourceId, page).includes(norm(line))) throw new Error(`${migration}: ${sourceId} p. ${page} does not print "${line}"`);
};

// The two sheets, and a row of each to copy its grade and source from.
const SHEETS = [
  { source: 'R-COLORFABB-TDS-LW-PET', grade: 'G141-01', like: 'V005739' },
  { source: 'R-COLORFABB-TDS-LW-PET-FLEX', grade: 'G141-02', like: 'V005836' },
];
// The rows both columns print: the page's label, the property, the unit and its normalisation.
const ROWS = [
  { label: 'Tensile modulus', method: 'Tensile, ISO 527-1A', property: 'Tensile modulus', unit: 'MPa', normalizedUnit: 'GPa', factor: 0.001 },
  { label: 'Tensile Strength', method: 'Tensile, ISO 527-1A', property: 'Tensile strength (endpoint unspecified)', unit: 'MPa', normalizedUnit: 'MPa', factor: 1 },
  { label: 'Elongation at break', method: 'Tensile, ISO 527-1A', property: 'Elongation at break', unit: '%', normalizedUnit: '%', factor: 1 },
  { label: 'Flexural Modulus', method: 'Flexural, ISO 178', property: 'Flexural modulus', unit: 'MPa', normalizedUnit: 'GPa', factor: 0.001 },
  { label: 'Flexural Strength', method: 'Flexural, ISO 178', property: 'Flexural strength', unit: 'MPa', normalizedUnit: 'MPa', factor: 1 },
  { label: 'Impact Strength', method: 'Charpy Notch, ISO 179', property: 'Charpy strength', unit: 'kJ/m', rawUnit: 'kJ/m²', normalizedUnit: 'kJ/m²', factor: 1, notch: 'Notched' },
];
const COLUMNS = [
  { key: 'unfoamed', heading: 'Value unfoamed @ 210 °C', flow: 'flow: 100%', specimen: OFF },
  { key: 'foamed', heading: 'Value foamed @ 260 °C, flow: 60%', flow: 'flow: 60%', specimen: 'Printed specimen' },
];
const HEAD = ['Mechanical Properties – 3D Printed', 'Method Value unfoamed Value foamed Unit', '@ 210 °C, @ 260 °C,', 'flow: 60%'];
const P2 = ['Value unfoamed @ 210 Value foamed @ 260 Unit', '°C, flow: 100% °C, flow: 60%', 'The specimens have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle,', '210/260 ˚C nozzle temperature and 60 ˚C bed temperature.'];
const tidy = (x) => String(Number(x.toPrecision(12)));

let changed = 0;
const tally = new Map();
const count = (k, n) => { if (n) { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; } };

for (const sheet of SHEETS) {
  const like = t.get('measurements', sheet.like);
  if (like.SourceID !== sheet.source || like.GradeID !== sheet.grade) throw new Error(`${migration}: ${sheet.like} is not ${sheet.grade}'s row of ${sheet.source}`);
  for (const h of HEAD) has(sheet.source, 1, h);
  for (const h of P2) has(sheet.source, 2, h);
  const page = lines(sheet.source, 1);
  for (const r of ROWS) {
    const re = new RegExp(`^${r.label} ${r.method.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+(?:,\\d+)?) (\\d+(?:,\\d+)?) ${r.unit.replace('/', '\\/')}$`);
    const line = page.find((l) => re.test(l));
    if (!line) throw new Error(`${migration}: ${sheet.source} p. 1 prints no "${r.label} ${r.method} <unfoamed> <foamed> ${r.unit}" row`);
    const [, unfoamed, foamed] = re.exec(line);
    for (const [col, printed] of [[COLUMNS[0], unfoamed], [COLUMNS[1], foamed]]) {
      const value = Number(printed.replace(',', '.'));
      const rawUnit = r.rawUnit ?? r.unit;
      const id = addValue(t, { like: sheet.like, migration, date,
        why: 'published in the source, never transcribed: the reader reads no row with two value columns (source_facts).',
        note: `p. 1, "Mechanical Properties – 3D Printed", the column "${col.heading}": "${line}"; p. 2: the specimens "have been printed in XY plane, using 0.2 mm layer height, 100% infill, 0.4 mm nozzle, 210/260 ˚C nozzle temperature and 60 ˚C bed temperature", ${col.flow}. ${col.key === 'foamed' ? 'The product as it is meant to be printed' : 'The unfoamed column, recorded beside the product\'s value and never it'}: ${RULING}. ${READER}`,
        set: {
          Property: r.property, 'Raw value': `${printed} ${rawUnit}`, 'Raw unit': rawUnit, 'Raw numeric': String(value),
          'Conversion factor': String(r.factor), 'Normalized value': tidy(value * r.factor), 'Normalized unit': r.normalizedUnit,
          'Specimen type': col.specimen, Direction: 'XY', Notch: r.notch ?? 'Not applicable',
          'Moisture condition': 'Not published', 'Moisture state': 'not-stated', 'Post-processing': 'Not published', 'Post-processing state': 'not-stated',
          'Test temperature': 'Not published', 'Standard / load': r.method, Standards: readStandards(r.method).join('; ') || 'Not published',
          'Test load MPa': 'Not applicable',
          'Specimen / print parameters': `${col.heading} (${col.flow}); printed in XY plane, 0.2 mm layer height, 100% infill, 0.4 mm nozzle, 60 °C bed (p. 2)`,
          Locator: `p. 1: ${r.label} ${r.method}, ${col.key === 'foamed' ? 'Value foamed' : 'Value unfoamed'}`,
          'Data status': 'Published value', 'Parse review': 'Not applicable',
        } });
      if (id) count(`${sheet.grade}: ${col.key} ${r.property}`.replace(/^G141-0\d: /, ''), 1);
    }
  }
}

// The thermal table is the resin supplier's.
const RESIN = [
  { id: 'V005739', source: 'R-COLORFABB-TDS-LW-PET' },
  { id: 'V005836', source: 'R-COLORFABB-TDS-LW-PET-FLEX' },
  { id: 'V005816', source: 'R-COLORFABB-TDS-PET-FLEX-MAX' },
  { id: 'V005746', source: 'R-COLORFABB-TDS-PET-HIGH-SPEED-PRO' },
  { id: 'V005811', source: 'R-COLORFABB-TDS-PET-ULTRA-HIGH-SPEED' },
];
for (const r of RESIN) {
  for (const l of ['Thermal Properties*', 'Glass Transition Temp. DSC, ISO 11357 67,6 ˚C', '*These results are obtained from the information provided by the supplier of the raw material']) has(r.source, 1, l);
  count('a glass transition the sheet gives as the resin supplier\'s', correct(t, { source: r.source, ids: [r.id], migration, date,
    set: { 'Specimen type': ['Printed specimen', 'Raw material value'] },
    note: `p. 1: the table is headed "Thermal Properties*" and the page says "*These results are obtained from the information provided by the supplier of the raw material": the resin supplier's value, not the printed product's. ${READER}` }));
}

// Every unfoamed row is off the product's recipe, and every foamed one is the product's.
for (const m of t.rows('measurements').filter((x) => SHEETS.some((s) => s.source === x.SourceID) && /Value (un)?foamed$/.test(x.Locator))) {
  const want = /unfoamed$/.test(m.Locator) ? OFF : 'Printed specimen';
  if (m['Specimen type'] !== want) throw new Error(`${migration}: ${m.MeasurementID} (${m.Locator}) is ${m['Specimen type']}, not ${want}`);
}

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} row(s) changed or added`);
