#!/usr/bin/env node
// Migration m379 (2026-10-05): values the gap round's second reads left open that a headline reads, read on their pages
// and recorded (check round 3, D131; docs/audits/2026-10-05-check-round-3/second-reads.csv and leftovers/
// page-verdicts.csv, read by a Claude Sonnet reader and decided by Claude Opus).
//
// Gap round 2 left 1,792 second reads outstanding. Joined to what decides (second-reads.py), 1,764 name a property no
// headline reads or a setting no gate reads, and are closed. The other 28 were read on their pages: 7 were held already,
// and 21 values the pages print were not, which this records. Stratasys ABS-ESD7's printed heat deflection (104.6 °C at
// 66 psi, 101.4 °C at 264 psi) and glass transition; Recreus PETG-CF's heat deflection at 0.45 MPa (72,0 °C, read on the
// page image: the text layer prints "F2,0"); colorFabb HT's and nGen's second sheet's raw-material heat deflections;
// colorFabb Economy PLA's printed HDT-B (55, whose unit cell repeats the impact row's "kJ/m2" above it); 3D-Fuel Pro
// PLA's annealed tensile modulus and notched Izod in its three axes (its "YX" axis is no direction the vocabulary holds);
// FormFutura ApolloX CF10's Charpy, printed in ft·lb/in² only; and MakerBot Tough's unnotched Izod from its table (the
// chart beside it is not read). Each row copies its sheet's conventions from a value already recorded from that sheet,
// and each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m379-what-the-second-reads-added.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { newRecord } from '../data/records.mjs';
import { readCsv } from '../../build/src/csv.js';
import { readStandards } from '../../build/src/normalize/standards.js';

const MIGRATION = 'm379';
const DATE = '2026-10-05';
const NA = 'Not applicable';
const NP = 'Not published';
// What each raw unit converts to, as the recorded rows of each property convert it (imperial impact units are new here:
// 1 ft·lbf/in = 53.3787 J/m, 1 ft·lbf/in² = 2.10154 kJ/m²).
const UNITS = { '°C': ['1', '°C'], MPa: ['0.001', 'GPa'], 'J/m': ['1', 'J/m'], 'ft-lb/in': ['53.3787', 'J/m'], 'ft.lb/in2': ['2.10154', 'kJ/m²'] };
const t = openTables();
const verdicts = readCsv(new URL('../../docs/audits/2026-10-05-check-round-3/leftovers/page-verdicts.csv', import.meta.url).pathname).records.map((r) => r.values)
  .filter((v) => v.family === 'second-read' && v.decision === 'add');
const tasks = new Map(readCsv(new URL('../../docs/audits/2026-10-05-check-round-3/second-reads.csv', import.meta.url).pathname).records.map((r) => [r.values.task_id, r.values]));
// A quote of the value itself where the text layer garbles it: the label alone is checked, and the note says so.
const LABEL_ONLY = { S1557: 'HDT (0,45MPa' };
let added = 0;

for (const v of verdicts) {
  const task = tasks.get(v.record);
  const set = Object.fromEntries(v.value.split(/;\s*(?=[A-Z][\w /°-]*=)/).map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()]; }));
  if (t.rows('measurements').some((m) => m.SourceID === task.source_id && m.GradeID === v.grade && m.Locator === set.Locator)) continue;
  // 3D-Fuel's footnote 3 says its bars were "annealed at 110 C / 20 min unless otherwise noted"; 20 min is 0.3333 h, as the
  // parser reads it. Its "[amorphous]" Izod row is the one otherwise noted, beside the annealed "[crystalline]" row.
  if (set['Anneal h'] === '0.33') set['Anneal h'] = '0.3333';
  if (/^As printed \(row label \[amorphous\]/.test(set['Post-processing'] ?? '')) set['Post-processing'] = '[amorphous] row, beside the sheet\'s [crystalline] row (footnote 3)';
  const quotes = LABEL_ONLY[v.record] ? [LABEL_ONLY[v.record]] : v.quote.split(' | ').map((q) => q.trim()).filter(Boolean);
  for (const q of quotes) onCachedSheet(t, task.source_id, q, MIGRATION);
  const like = t.rows('measurements').find((m) => m.SourceID === task.source_id && m.GradeID === v.grade && !m['Data status'].startsWith('Retired'));
  if (!like) throw new Error(`${MIGRATION}: ${v.record}: no value of ${task.source_id} on ${v.grade} to copy its conventions from`);
  const unit = set['Raw unit'];
  const [factor, normalizedUnit] = UNITS[unit] ?? (() => { throw new Error(`${MIGRATION}: ${v.record}: no conversion for "${unit}"`); })();
  const numeric = Number(String(set['Raw value']).replace(/^[^\d-]*/, '').match(/-?\d+(?:[.,]\d+)?/)[0].replace(',', '.'));
  const normalized = String(Number((numeric * Number(factor)).toPrecision(6)));
  const note = [
    `Added ${DATE} (${MIGRATION}): read on the page image in check round 3 (second read ${v.record}).`,
    LABEL_ONLY[v.record] ? 'The value is read on the page image: the text layer garbles it.' : '',
    set.Notes ?? '',
  ].filter(Boolean).join(' ');
  const { row, unset } = newRecord(t, 'measurements', { like: like.MeasurementID, set: {
    Property: set.Property, 'Raw value': set['Raw value'], 'Raw unit': unit, 'Raw numeric': String(numeric), 'Raw uncertainty ±': NA, 'Raw upper bound': NA,
    Operator: '=', 'Conversion factor': factor, 'Normalized value': normalized, 'Normalized uncertainty ±': NA, 'Normalized upper bound': NA, 'Normalized unit': normalizedUnit,
    'Data status': 'Published value', 'Specimen type': set['Specimen type'] ?? NP, Direction: set.Direction ?? NA,
    'Moisture condition': NP, 'Moisture state': 'not-stated',
    'Post-processing': set['Post-processing'] ?? NP,
    'Post-processing state': /annealed at/i.test(set['Post-processing'] ?? '') ? 'annealed' : /^\[amorphous\]/.test(set['Post-processing'] ?? '') ? 'as-printed' : 'not-stated',
    'Anneal °C': set['Anneal °C'] ?? NA, 'Anneal h': set['Anneal h'] ?? NA,
    'Test temperature': NP, 'Test temperature °C': NP,
    'Standard / load': set['Standard / load'] ?? NP, 'Standards': readStandards(set['Standard / load'] ?? NP).join('; ') || NP,
    'Test load MPa': set['Test load MPa'] ?? NA, Notch: set.Notch ?? NA, 'Specimen / print parameters': NP,
    Locator: set.Locator, Notes: note, 'Parse review': NA,
  } });
  if (unset.length) throw new Error(`${MIGRATION}: ${v.record}: columns left unset: ${unset.join(', ')}`);
  t.append('measurements', row, { migration: MIGRATION });
  added++;
}
if (added) t.save();
console.log(`${MIGRATION}: ${added} value(s) the pages print and the second reads found, recorded`);
