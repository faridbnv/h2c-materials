#!/usr/bin/env node
// Migration m201 (2026-09-27): values five registered sheets print and the reader skipped (GOALS C3, method step 2;
// the research package of 2026-09-26, P1-VALUES-ROOT-014 to 021).
//
// The research package searched for the heat deflection and stiffness of materials that publish none, and found them
// on sheets the database already holds, cached and hash-checked, where the reader passed over the row:
//
//   purefil SAN (G136-01, German)       "Formbeständigkeitstemperatur 101 °C" over "1.8 MPa (ISO 75-2)"
//   purefil COC tough (G137-01)         "Heat deflec5on temperature 160 °C" over "0.45 MPa (ISO 75-1, -2)"
//   purefil COC flex (G137-03)          "Heat deflec6on temperature 60 °C" over "0.45 MPa (ISO 75-1, -2)"
//   purefil PBT (G140-01, German)       "Formbeständigkeitstemperatur 180 °C" over "0.45 MPa (ISO 75-1/2)"
//   purefil PBT (G140-02, French)       "Température de stabilité 180 °C" over "dimensionnelle 0.45 MPa (ISO 75-1/2)"
//   FormFutura ApolloX Kevlar (G113-02) "Elastic tensile modulus 2200 MPa ISO 527-1", a label the lexicon lacks
//
// purefil's text layer draws the "ti" ligature as a digit ("Heat deflec5on", "Elonga5on"), which is why the reader
// missed these rows; the two COC sheets' elongations at break went the same way and are recorded here too
// ("Elonga5on at break (ISO 527-2/1A) 20 %", "Elonga6on at break (ISO 527-2/1A) 500 %"). The English SAN sheet
// (G136-02) prints the same table and reads G136-01's values as its twin (D89), so it takes no row of its own; the
// French PBT sheet is its own product's and does.
//
// None of the sheets says how its bars were made or how they stood: each row keeps its sheet's "not published"
// specimen and an unstated direction, as its neighbours do. A heat deflection needs no direction; the stiffness and
// elongations count as published only (D84), with their own count, until a scenario admits them.
//
// Every figure is checked on its page's lines before anything is written. The reader is an AI agent
// (claude-opus-5.5, agent reviewer), not a person. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m201-values-the-reader-skipped.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { addValue } from './source-edits.mjs';

const migration = 'm201-values-the-reader-skipped';
const date = '2026-09-27';
const READER = 'Read by an AI agent (claude-opus-5.5, agent reviewer), not a person.';
const t = openTables();

const norm = (s) => String(s).normalize('NFKC').replace(/\s+/g, ' ').trim();
function lines(sourceId) {
  const s = t.get('sources', sourceId);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text for ${s.SHA256}; fetch and extract it first`);
  return text.pages.find((p) => p.page === 1).lines.map((l) => norm(typeof l === 'string' ? l : l.text));
}
// The value's line, and its load's line within three below it (the right-hand column interleaves).
function printed(sourceId, first, second) {
  const L = lines(sourceId);
  const i = L.indexOf(norm(first));
  if (i < 0) throw new Error(`${migration}: ${sourceId} p. 1 no longer prints "${first}"`);
  if (second && !L.slice(i + 1, i + 4).includes(norm(second))) throw new Error(`${migration}: ${sourceId} p. 1 does not print "${second}" below "${first}"`);
}

const HDT = [
  { source: 'R-FABRU-PUREFIL-787-Materialdatenblatt-SAN-purefil', like: 'V005629', value: '101', load: '1.8', words: ['Formbeständigkeitstemperatur 101 °C', '1.8 MPa (ISO 75-2)'], standard: '1.8 MPa (ISO 75-2)', label: 'Formbeständigkeitstemperatur' },
  { source: 'R-FABRU-PUREFIL-10802-Material-datasheet-COC-tough-purefil-EN', like: 'V005675', value: '160', load: '0.45', words: ['Heat deflec5on temperature 160 °C', '0.45 MPa (ISO 75-1, -2)'], standard: '0.45 MPa (ISO 75-1, -2)', label: 'Heat deflection temperature' },
  { source: 'R-FABRU-10857-Material-datasheet-COC-flex-purefil-EN', like: 'V010403', value: '60', load: '0.45', words: ['Heat deflec6on temperature 60 °C', '0.45 MPa (ISO 75-1, -2)'], standard: '0.45 MPa (ISO 75-1, -2)', label: 'Heat deflection temperature' },
  { source: 'R-FABRU-PUREFIL-656-Materialdatenblatt-PBT-purefil', like: 'V005737', value: '180', load: '0.45', words: ['Formbeständigkeitstemperatur 180 °C', '0.45 MPa (ISO 75-1/2)'], standard: '0.45 MPa (ISO 75-1/2)', label: 'Formbeständigkeitstemperatur' },
  { source: 'R-FABRU-652-Fiche-technique-du-mat-riau-PBT-purefil', like: 'V006141', value: '180', load: '0.45', words: ['Température de stabilité 180 °C', 'dimensionnelle 0.45 MPa (ISO 75-1/2)'], standard: '0.45 MPa (ISO 75-1/2)', label: 'Température de stabilité dimensionnelle' },
];
const OTHER = [
  { source: 'R-FABRU-PUREFIL-10802-Material-datasheet-COC-tough-purefil-EN', like: 'V005673', words: ['Elonga5on at break (ISO 527-2/1A) 20 %'],
    set: { Property: 'Elongation at break', 'Raw value': '20 %', 'Raw unit': '%', 'Raw numeric': '20', 'Normalized value': '20', 'Normalized unit': '%', 'Standard / load': 'ISO 527-2/1A', Standards: 'ISO 527', Locator: 'p. 1: Elongation at break (ISO 527-2/1A)' } },
  { source: 'R-FABRU-10857-Material-datasheet-COC-flex-purefil-EN', like: 'V010401', words: ['Elonga6on at break (ISO 527-2/1A) 500 %'],
    set: { Property: 'Elongation at break', 'Raw value': '500 %', 'Raw unit': '%', 'Raw numeric': '500', 'Normalized value': '500', 'Normalized unit': '%', 'Standard / load': 'ISO 527-2/1A', Standards: 'ISO 527', Locator: 'p. 1: Elongation at break (ISO 527-2/1A)' } },
  { source: 'S-PET-TDS-ApolloX-Kevlar', like: 'V007519', words: ['Elastic tensile modulus 2200 MPa ISO 527-1'],
    set: { Property: 'Tensile modulus', 'Raw value': '2200 MPa', 'Raw unit': 'MPa', 'Raw numeric': '2200', 'Conversion factor': '0.001', 'Normalized value': '2.2', 'Normalized unit': 'GPa', 'Standard / load': 'ISO 527-1', Standards: 'ISO 527', Locator: 'p. 1: Elastic tensile modulus' } },
];

let changed = 0;
const tally = new Map();
const count = (k) => { tally.set(k, (tally.get(k) ?? 0) + 1); changed++; };
for (const h of HDT) {
  printed(h.source, ...h.words);
  const like = t.get('measurements', h.like);
  if (like.SourceID !== h.source) throw new Error(`${migration}: ${h.like} is not a row of ${h.source}`);
  const id = addValue(t, { like: h.like, migration, date, why: 'printed on the sheet, which the reader passed over (its row is set in two lines, the value above its load).',
    note: `p. 1: ${h.words.map((w) => `"${w}"`).join(' / ')}. ${READER}`,
    set: { Property: 'HDT', 'Raw value': `${h.value} °C`, 'Raw unit': '°C', 'Raw numeric': h.value, 'Normalized value': h.value, 'Normalized unit': '°C', 'Conversion factor': '1',
      Direction: 'Not applicable', 'Standard / load': h.standard, Standards: 'ISO 75', 'Test load MPa': h.load, Locator: `p. 1: ${h.label} ${h.load} MPa` } });
  if (id) count(`heat deflection at ${h.load} MPa: ${like.GradeID}`);
}
for (const o of OTHER) {
  printed(o.source, ...o.words);
  const like = t.get('measurements', o.like);
  if (like.SourceID !== o.source) throw new Error(`${migration}: ${o.like} is not a row of ${o.source}`);
  const id = addValue(t, { like: o.like, migration, date, why: 'printed on the sheet, under a label the reader did not read.',
    note: `p. 1: ${o.words.map((w) => `"${w}"`).join(' / ')}. The sheet does not say how the bar was made or how it stood, as its neighbours do not. ${READER}`,
    set: { ...o.set, Direction: 'Unstated' } });
  if (id) count(`${o.set.Property}: ${like.GradeID}`);
}
if (changed) t.save();
for (const [k, n] of [...tally].sort()) console.log(`  ${n}\t${k}`);
console.log(`${migration}: ${changed} change(s)`);
