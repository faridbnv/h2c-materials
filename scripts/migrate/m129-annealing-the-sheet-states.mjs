#!/usr/bin/env node
// Migration m129 (2026-09-21): annealing the sheet states for its test bars (PLAN-REMAINING 2.3).
//
// The sweep's reading found Kingroon's ABS modulus, Polymaker's Fiberon PA6-CF20 modulus and four Spectrum values
// recorded with no post-processing where the sheet says the bars were annealed. Counted across the table:
//
//   - A sentence for the whole table, the way Bambu Lab, Polymaker, Raise3D and Kingroon print it: "All the specimens
//     were annealed and dried at 55 °C for 8 h before testing", "*All specimens were annealed at 100°C for 16h".
//     The rows the batches applied without it take it, as the hand-transcribed rows of the same sheets already do.
//     Polymaker and Fiberon print one such note under each table (a dry one, and one "immerged in water" or
//     "conditioned at 50% relative humidity"), so a row takes the note that follows its own table.
//     A note that says the bars were dried, immersed or conditioned also says their moisture at test, and so does
//     Fiberon's "DRY STATUS" heading over its first table.
//   - Spectrum's footnote for its mechanical and thermal tables: "* 3D printed at 100% infill and annealed at
//     110°C/20 min, XY axis" (PLA Pro), "* annealed" (PLA Huracan).
//   - Spectrum's Flameguard PLA prints "HDT (crystalline) 90°C" beside "HDT (amorphous) 55°C": the crystallised bar.
//
// Only the bars a sentence describes take it: the mechanical tests, heat deflection and Vicat. Post-processing is
// the sheet's sentence as printed; the state and the schedule beside it are what the parser reads from it
// (PARSE-MISMATCH). Nothing else about a row changes, except that Spectrum's PLA Pro footnote also says its bars were
// printed and loaded in XY, which its rows take where they say nothing.
//
//   node scripts/migrate/m129-annealing-the-sheet-states.mjs

import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { correct } from './source-edits.mjs';
import { parseAnnealSchedule } from '../../build/src/normalize/specimen.js';

const migration = 'm129-annealing-the-sheet-states';
const date = '2026-09-21';
const NP = 'Not published';
const t = openTables();

const MECHANICAL = new Set(t.rows('properties').filter((p) => p.Domain === 'mechanical' && p.Property !== 'Tear strength').map((p) => p.Property));
const BARS = new Set([...MECHANICAL, 'HDT', 'Vicat softening temperature']);
const DIRECTIONAL = new Set([...MECHANICAL].filter((p) => !/impact|Charpy|Izod|Hardness/i.test(p)));

const linesOf = (s) => {
  try { return cachedText(s.SHA256).pages.flatMap((p) => p.lines.map((l) => (typeof l === 'string' ? l : l.text))); } catch { return null; }
};
// The line a row was read from: its label and its number on one line, or its number on the line after its label.
const lineOf = (lines, m) => {
  const label = m.Locator.replace(/^p\. ?\d+: ?/, '').trim().slice(0, 24).toLowerCase();
  const num = String(m['Raw numeric'] ?? '').replace(/\.0+$/, '');
  const hits = [];
  lines.forEach((l, i) => {
    const low = l.toLowerCase();
    if (low.includes(label) && (low.includes(num) || (lines[i + 1] ?? '').includes(num))) hits.push(i);
  });
  return hits.length === 1 ? hits[0] : null;
};
// A table note as printed: its line, and the next where the sentence runs on in lower case, to its first full stop.
const sentenceAt = (lines, i) => {
  let s = lines[i].replace(/^\s*\*\s*/, '');
  if (!/\.\s*$/.test(s) && /^[a-z]/.test(lines[i + 1] ?? '')) s += ` ${lines[i + 1]}`;
  return s.replace(/\s+/g, ' ').replace(/\.(\s.*)?$/, '').trim();
};
const MOISTURE = [
  [/immerged in water|immersed in water/i, 'Conditioned: water immersion'],
  [/immerged in ambient temperature/i, 'Conditioned: immerged at ambient temperature for 3 days (medium not stated)'],
  [/conditioned at 50% relative humidity/i, 'Conditioned: 50% RH, ambient temperature'],
  [/\bdried\b/i, 'Dried before testing (see preparation)'],
];
const MOISTURE_STATE = (wording) => (/^(Dried|Dry)\b/.test(wording) ? 'dry' : 'conditioned');

let changed = 0;
const tally = new Map();
const count = (k, n) => { tally.set(k, (tally.get(k) ?? 0) + n); changed += n; };
// A row of a sheet with a note under each table, whose own line cannot be found once, is left as it was.
const left = [];
const bySource = new Map();
for (const m of t.rows('measurements')) {
  if (!bySource.has(m.SourceID)) bySource.set(m.SourceID, []);
  bySource.get(m.SourceID).push(m);
}
const open = (m) => BARS.has(m.Property) && m['Post-processing state'] === 'not-stated' && m['Post-processing'] === NP && /^Published value/.test(m['Data status']);

const anneal = (s, m, sentence, extra = {}, why) => {
  const schedule = parseAnnealSchedule(sentence, 'annealed');
  const set = {
    'Post-processing': [NP, sentence], 'Post-processing state': ['not-stated', 'annealed'],
    'Anneal °C': [m['Anneal °C'], schedule.tempC == null ? NP : String(schedule.tempC)],
    'Anneal h': [m['Anneal h'], schedule.hours == null ? NP : String(schedule.hours)],
    ...extra,
  };
  return correct(t, { source: s.SourceID, ids: [m.MeasurementID], migration, date, set, note: why });
};

// 1. One sentence for a table, or one per table.
const TABLE_NOTE = /(?:^|\*\s*)All (?:the |[A-Z]+ [A-Za-z]+ )?(?:test )?specimens were annealed/i;
for (const s of t.rows('sources')) {
  const rows = (bySource.get(s.SourceID) ?? []).filter(open);
  if (!rows.length || !/^[0-9a-f]{64}$/.test(s.SHA256 ?? '')) continue;
  const lines = linesOf(s);
  if (!lines) continue;
  const notes = lines.map((l, i) => (TABLE_NOTE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (!notes.length) continue;
  const distinct = new Set(notes.map((i) => sentenceAt(lines, i)));
  for (const m of rows) {
    const at = lineOf(lines, m);
    // The note that follows the row's table; a sheet with one note gives it to every row.
    const i = distinct.size === 1 ? notes[0] : at == null ? null : notes.find((n) => n > at);
    if (i == null) { left.push(m.MeasurementID); continue; }
    const sentence = sentenceAt(lines, i);
    const extra = {};
    // Fiberon heads its two tables "MECHANICAL PROPERTIES - DRY STATUS" and "- WET STATUS" (letter-spaced); a row
    // under the dry heading whose note says nothing of moisture was tested dry.
    const heading = at == null ? null : lines.slice(0, at).reverse().map((l) => l.replace(/\s+/g, '')).find((l) => /(DRY|WET)STATUS$/i.test(l));
    const moisture = MOISTURE.find(([re]) => re.test(sentence))?.[1] ?? (heading && /DRYSTATUS$/i.test(heading) ? 'Dry' : undefined);
    if (moisture && m['Moisture state'] === 'not-stated' && m['Moisture condition'] === NP) {
      extra['Moisture condition'] = [NP, moisture];
      extra['Moisture state'] = ['not-stated', MOISTURE_STATE(moisture)];
    }
    count(`${s.Publisher}: the table's note`, anneal(s, m, sentence, extra, `the sheet says how the bars of this row's table were treated before testing: "${sentence}".`));
  }
}

// 2. Spectrum's footnotes. (Its heat deflection rows that say "annealed" on their own line were recorded so.)
const FOOTNOTES = {
  'S-SPECTRUM-en-tds-spectrum-pla-pro': '* 3D printed at 100% infill and annealed at 110°C/20 min, XY axis',
  'S-SPECTRUM-EN-TDS-Spectrum-PLA-Pro-2': '* 3D printed at 100% infill and annealed at 110°C/20 min, XY axis',
  'S-SPECTRUM-en-tds-spectrum-pla-huracan': '* annealed',
};
for (const [sourceId, footnote] of Object.entries(FOOTNOTES)) {
  const s = t.get('sources', sourceId);
  const lines = linesOf(s);
  if (!lines.some((l) => l.trim() === footnote)) throw new Error(`${migration}: ${sourceId} does not print "${footnote}"`);
  const printedXY = /3D printed .* XY axis/.test(footnote);
  for (const m of (bySource.get(sourceId) ?? []).filter(open)) {
    const extra = {};
    if (printedXY && /^Not published/.test(m['Specimen type'])) extra['Specimen type'] = [m['Specimen type'], 'Printed specimen'];
    if (printedXY && DIRECTIONAL.has(m.Property) && ['Unstated', NP].includes(m.Direction)) extra.Direction = [m.Direction, 'XY'];
    count('Spectrum: the tables\' footnote', anneal(s, m, footnote.replace(/^\*\s*/, ''), extra,
      `the sheet marks its mechanical and thermal tables with an asterisk, and the footnote reads "${footnote}".`));
  }
}
changed += correct(t, { source: 'S-SPECTRUM-en-tds-spectrum-flameguard-pla', ids: ['V003031'], migration, date,
  set: { 'Post-processing': [NP, 'HDT (crystalline)'], 'Post-processing state': ['not-stated', 'annealed'] },
  note: 'the sheet prints "HDT (crystalline) 90°C" beside "HDT (amorphous) 55°C": the crystallised bar, which a PLA becomes by annealing.' });

if (changed) t.save();
for (const [k, v] of [...tally].sort()) console.log(`  ${v}\t${k}`);
if (left.length) console.log(`  left as they were (a sheet with a note per table, the row's line not found once): ${left.join(' ')}`);
console.log(`${migration}: ${changed} row(s) given the annealing their sheet states`);
