#!/usr/bin/env node
// Migration m150 (2026-09-25): Bambu Lab's Filament Guide, where a product's own sheet is silent (D88; the owner's
// decision 1 for re-center phase 6, docs/GOALS.md).
//
// The guide is one page: a column per Bambu filament type and a row per property or print requirement. It states, per
// type, a nozzle temperature, a bed temperature per build plate, whether to print with an enclosure, the nozzle sizes
// and materials, whether to dry the filament and how. It states no chamber temperature. This records its print
// requirements for the fifteen types its current revision (R-BAMBU-GUIDE-202609) heads, in a print profile's columns
// (print_guide.csv), and which of our materials each type is (print_guide_materials.csv). The build reads a material's
// row only where a product's own profiles, and its twin's (D89), say nothing on a part of its print gate.
//
// Every cell is pinned in m150-bambu-filament-guide.csv as the page prints it, and checked on the cached,
// hash-checked page before anything is written: its text must be what stands in the column headed with the type and the
// row labelled with the requirement (scripts/lib/comparison-table.mjs). The current revision answers "Print with
// Enclosure" with a drawn mark, a green tick or a red cross, which the text layer does not carry; the mark is read by its
// fill colour at that cell, and its meaning is checked against the guide's January 2025 revision (B-GUIDE), which prints
// the same row in words: every type both revisions carry reads Required where the current one draws a tick, and
// Optional where it draws a cross. The typed columns are the build's own parsers' reading (typed-values.js), so no cell
// needs a Parse review.
//
// The reviewer of the readings and of the mapping is an agent, claude-opus-5.5 (agent reviewer); no person has
// reviewed them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m150-bambu-filament-guide.mjs

import { join, dirname } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { cachedText, sha256 } from '../lib/pdf-text.mjs';
import { tableLayout, cellText, sameText, filledShapes, cellMark } from '../lib/comparison-table.mjs';
import { parseTemperature, parseEnclosure, parseDrying, parseAbrasion } from '../../build/src/normalize/process.js';
import { profileCellsFromParsed } from '../../build/src/typed-values.js';
import { TEMP_WINDOW } from '../../build/src/recipe.js';

const migration = 'm150-bambu-filament-guide';
const here = dirname(fileURLToPath(import.meta.url));
const pins = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const mapping = readCsv(join(here, `${migration}-materials.csv`)).records.map((r) => r.values);
const REVIEWER = 'claude-opus-5.5 (agent reviewer), 2026-09-25';
const EARLIER = 'B-GUIDE';
// The marks the current revision draws, by fill colour, and the words its January 2025 revision prints for each.
const MARKS = { '0,174,66': '✓', '230,0,52': '✗' };
const EARLIER_WORDS = { '✓': 'Required', '✗': 'Optional' };
const ROW = {
  nozzle: 'Nozzle Temperature', bed: 'Build Plate & Bed Temperature', enclosure: 'Print with Enclosure',
  nozzleSize: 'Nozzle Size/Material', dryOut: 'Dry Out Before Use', drying: 'Drying Condition',
};
const NA = 'Not applicable';
const NP = 'Not published';

const t = openTables();

// ------------------------------------------------------------------------------------ the document, hash-checked
function documentOf(sourceId) {
  const s = t.get('sources', sourceId);
  const path = [join(projectRoot, '.cache/sources', `${sourceId}.pdf`), join(projectRoot, '.cache/sources/by-sha', `${s.SHA256}.pdf`)].find(existsSync);
  if (!path) throw new Error(`${migration}: ${sourceId} is not cached; fetch ${s.URL} and check its SHA-256 first`);
  const bytes = readFileSync(path);
  if (sha256(bytes) !== s.SHA256) throw new Error(`${migration}: the cached ${sourceId} is not the document sources.csv records (SHA-256 ${sha256(bytes).slice(0, 12)}, recorded ${s.SHA256.slice(0, 12)})`);
  const text = cachedText(s.SHA256);
  if (!text) throw new Error(`${migration}: ${sourceId} has no cached text; extract it first (scripts/lib/pdf-text.mjs, documentText)`);
  if (text.pages.length !== 1) throw new Error(`${migration}: ${sourceId} has ${text.pages.length} pages; the guide is one`);
  return { bytes, page: text.pages[0] };
}

const bySource = new Map();
for (const p of pins) (bySource.get(p.SourceID) ?? bySource.set(p.SourceID, []).get(p.SourceID)).push(p);
const earlier = documentOf(EARLIER);
const earlierLayout = tableLayout(earlier.page, ['PLA', 'PPS-CF']);
const earlierTypes = new Set(earlierLayout.columns.map((c) => c.name));

for (const [sourceId, list] of bySource) {
  const doc = documentOf(sourceId);
  const layout = tableLayout(doc.page, list.map((p) => p['Guide type']));
  if (layout.columns.length !== list.length) throw new Error(`${migration}: ${sourceId} heads ${layout.columns.length} columns; ${list.length} are pinned`);
  const shapes = await filledShapes(doc.bytes);
  for (const p of list) {
    const type = p['Guide type'];
    const where = `${sourceId} ${type}`;
    for (const [column, row] of [['Nozzle Temperature', ROW.nozzle], ['Build Plate & Bed Temperature', ROW.bed], ['Nozzle Size/Material', ROW.nozzleSize], ['Dry Out Before Use', ROW.dryOut], ['Drying Condition', ROW.drying]]) {
      const printed = cellText(doc.page, layout, type, row);
      if (!sameText(printed, p[column])) throw new Error(`${migration}: ${where} "${row}" prints "${printed}", pinned "${p[column]}"`);
    }
    const mark = cellMark(shapes, layout, type, ROW.enclosure, MARKS);
    if (mark !== p['Print with Enclosure']) throw new Error(`${migration}: ${where} "${ROW.enclosure}" draws ${mark ?? 'no mark'}, pinned ${p['Print with Enclosure']}`);
    if (earlierTypes.has(type)) {
      const words = cellText(earlier.page, earlierLayout, type, ROW.enclosure);
      if (words !== EARLIER_WORDS[mark]) throw new Error(`${migration}: ${where} draws ${mark}, and the January 2025 revision prints "${words}" in that row, not "${EARLIER_WORDS[mark]}"`);
    }
  }
}

// ------------------------------------------------------------------------------------------- the rows to write
function guideRow(p) {
  const raw = {
    'Nozzle °C': p['Nozzle Temperature'], 'Bed °C': p['Build Plate & Bed Temperature'], 'Chamber °C': NP,
    Enclosure: p['Print with Enclosure'],
    Drying: `Dry Out Before Use: ${p['Dry Out Before Use']}. Drying Condition: ${p['Drying Condition']}`,
    'Nozzle size / material': p['Nozzle Size/Material'],
  };
  // The typed columns are the build's own parsers' reading of the raw text, as a profile's are.
  const typed = profileCellsFromParsed({
    nozzle: parseTemperature(raw['Nozzle °C'], { plausible: TEMP_WINDOW.nozzle }),
    bed: parseTemperature(raw['Bed °C'], { plausible: TEMP_WINDOW.bed }),
    chamber: parseTemperature(raw['Chamber °C'], { plausible: TEMP_WINDOW.chamber }),
    enclosure: parseEnclosure(raw.Enclosure), drying: parseDrying(raw.Drying), abrasion: parseAbrasion(raw['Nozzle size / material']),
  });
  for (const axis of ['Nozzle', 'Bed']) if (typed[`${axis} state`] !== 'range') throw new Error(`${migration}: ${p['Guide type']} ${axis} "${raw[`${axis} °C`]}" is not read as a window`);
  if (typed['Enclosure state'] === 'unknown') throw new Error(`${migration}: ${p['Guide type']} enclosure "${raw.Enclosure}" is not read`);
  const row = { PrintGuideID: p.PrintGuideID, SourceID: p.SourceID, 'Guide type': p['Guide type'] };
  for (const column of t.header('print_guide')) {
    if (column in row) continue;
    if (column in raw) row[column] = raw[column];
    else if (column in typed) row[column] = typed[column];
  }
  row.Locator = `p. 1, the column headed ${p['Guide type']}: ${[ROW.nozzle, ROW.bed, `${ROW.enclosure} (a drawn mark)`, ROW.nozzleSize, ROW.dryOut, ROW.drying].join('; ')}`;
  row['Parse review'] = NA;
  return row;
}

let changed = 0;
for (const p of pins) {
  const row = guideRow(p);
  const existing = t.find('print_guide', p.PrintGuideID);
  if (existing) {
    const moved = Object.entries(row).filter(([k, v]) => existing[k] !== v).map(([k]) => k);
    if (moved.length) throw new Error(`${migration}: print_guide ${p.PrintGuideID} differs in ${moved.join(', ')}; the data moved since this was pinned`);
    continue;
  }
  t.append('print_guide', row);
  changed++;
}
for (const m of mapping) {
  const material = t.get('materials', m.MaterialID);
  if (material.Scope === 'Family entry') throw new Error(`${migration}: ${m.MaterialID} is a family entry`);
  const row = { MaterialID: m.MaterialID, PrintGuideID: m.PrintGuideID, Reason: m.Reason, 'Reviewed by': REVIEWER };
  const existing = t.find('print_guide_materials', m.MaterialID);
  if (existing) {
    if (existing.PrintGuideID !== m.PrintGuideID || existing.Reason !== m.Reason) throw new Error(`${migration}: print_guide_materials ${m.MaterialID} differs; the data moved since this was pinned`);
    continue;
  }
  t.append('print_guide_materials', row);
  changed++;
}

// The guide is now cited by records; both revisions were re-fetched on 2026-09-25 and matched their recorded SHA-256.
const NOTES = {
  'R-BAMBU-GUIDE-202609': 'Retrieved; re-fetched 2026-09-25, SHA-256 unchanged since the 2026-09-13 reading',
  [EARLIER]: 'Retrieved; re-fetched 2026-09-25, SHA-256 unchanged since the 2026-09-10 reading. Read in m150 only to check what the current revision\'s enclosure marks mean (D88)',
};
const s = t.get('sources', 'R-BAMBU-GUIDE-202609');
if (s['Citation role'] !== 'cited') { t.set('sources', s.SourceID, 'Citation role', 'cited', { expect: 'corroboration' }); changed++; }
for (const [id, note] of Object.entries(NOTES)) {
  const r = t.get('sources', id);
  if (r['Access note'] === note) continue;
  t.set('sources', id, 'Access note', note, { expect: 'Not applicable' });
  changed++;
}

if (changed) t.save();
console.log(`${migration}: ${changed} change(s); ${pins.length} guide rows and ${mapping.length} materials pinned, each read on its hash-checked page`);
