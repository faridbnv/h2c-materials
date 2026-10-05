#!/usr/bin/env node
// Migration m354 (2026-10-05): what a fresh blind draw of the reader round's records found, and the families it named,
// swept (D125).
//
// Forty facts the round recorded or changed were drawn at random (seed 20261005) and checked on their page images by an
// independent Claude Sonnet reader (docs/audits/2026-10-04-reader-round/blind-draw/). It found two wrong and three partly
// wrong, in two families, and each family was then read in full, page by page, and decided by Claude Opus:
//   - a page statement whose scope reaches tables it does not head, or that reads a heading as a state it does not print
//     (QIDI's "Material Properties" read as as-printed beside an annealed column): every page_context row the round added
//     was read again (sweep/page-context-verdicts.csv). A row is kept, narrowed to the scopes it heads (a row per scope),
//     corrected, or voided (its typed columns state nothing, so no value inherits from it; the row and its words stay);
//   - rows of one product, source and property that carry the same conditions and different values: every such group
//     with a row from the round was read again (sweep/group-verdicts.csv), which found columns read into the wrong
//     direction (Raise3D PPS-CF's "ZX, Flat" values held as XY, QIDI PETG-CF's X-Y, X-Z and Z-X columns held as unstated),
//     Stratasys's "Upright (ZX)" tensile bars that the rule records as Z (D92, m191), notches the page prints, and tables
//     the rows did not tell apart; six of Markforged Onyx GF's rows repeat another (retired as duplicates), and four
//     numbers are another product's column or cannot be told apart (quarantined, sweep/status-decisions.csv).
// Beside them (sweep/cell-fixes.csv): annealing schedules the readings paraphrased, so the parser read no schedule
// (Kingroon PETG's "All the specimens were annealed and dried at 65 °C for 8 h before testing", Raise3D PPA-CF25's
// "annealed at 100 ºC for 8h", 3D-Fuel's "annealed at 110 C / 20 min"), now in the sheets' own words and typed; and three
// settings the reading-order view found when it was turned on for every run (purefil PLA Silk's and TPU 53D's bed rows,
// Nanovia Insublend's drying sentence). Every quote is checked on the cached sheet; each edit names the value it
// replaces. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m354-what-the-blind-draw-found.mjs
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseAnnealSchedule, readPostProcessingState } from '../../build/src/normalize/specimen.js';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm354';
const DATE = '2026-10-05';
const DIR = join(projectRoot, 'docs/audits/2026-10-04-reader-round/blind-draw/sweep');
const NP = 'Not published';
const NA = 'Not applicable';
const TYPED_COLUMNS = new Set(Object.values(TYPED).flat());
const read = (f) => (existsSync(join(DIR, f)) ? rowsOf(join(DIR, f)) : []);
const t = openTables();
let cells = 0, contexts = 0, added = 0;
const profiles = new Set();
const measurements = new Set();

// ---------------------------------------------------------------- a measurement or profile cell, quote-checked
const setCell = (table, id, column, expect, value, quote, reason) => {
  const r = t.get(table, id);
  if ((r[column] ?? '') === (value ?? '')) return false;
  if (quote) onCachedSheet(t, r.SourceID, quote, MIGRATION);
  t.set(table, id, column, value, { expect, migration: MIGRATION });
  if (table === 'profiles') profiles.add(id);
  if (table === 'measurements') {
    measurements.add(id);
    const after = t.get('measurements', id);
    const note = `Corrected ${MIGRATION} (${DATE}): ${column} ${expect} → ${value}; ${reason}.`.replace(/\.\.$/, '.');
    if (!String(after.Notes ?? '').includes(note)) t.set('measurements', id, 'Notes', withNote(after.Notes, note), { expect: after.Notes, migration: MIGRATION });
  }
  cells++;
  return true;
};

for (const f of read('cell-fixes.csv')) setCell(f.table, f.id, f.column, f.expect ?? '', f.value ?? '', f.quote, f.reason);
for (const g of read('group-verdicts.csv').filter((x) => x.decision === 'fix' && x.column)) {
  setCell('measurements', g.MeasurementID, g.column, g.expect ?? '', g.value ?? '', g.quote, g.reason);
}

// A row the group read showed to be a copy of another, another product's column, or a number the page does not tell apart
// (sweep/status-decisions.csv): retired as a duplicate naming its twin, or quarantined, with the reason in its notes.
for (const d of read('status-decisions.csv')) {
  const r = t.get('measurements', d.id);
  if (r['Data status'] === d.value) continue;
  t.set('measurements', d.id, 'Data status', d.value, { expect: d.expect, migration: MIGRATION });
  const after = t.get('measurements', d.id);
  if (!String(after.Notes ?? '').includes(d.note)) t.set('measurements', d.id, 'Notes', withNote(after.Notes, d.note), { expect: after.Notes, migration: MIGRATION });
  cells++;
}

// A measurement whose treatment or standard words changed is typed again: its post-processing state and schedule, its
// standards.
for (const id of measurements) {
  const r = t.get('measurements', id);
  const state = readPostProcessingState(r['Post-processing']);
  if (state && state !== r['Post-processing state']) t.set('measurements', id, 'Post-processing state', state, { expect: r['Post-processing state'], migration: MIGRATION });
  const now = t.get('measurements', id);
  const schedule = parseAnnealSchedule(now['Post-processing'], now['Post-processing state']);
  const cell = (v, annealed) => (annealed ? (v == null ? NP : String(v)) : NA);
  const annealed = now['Post-processing state'] === 'annealed';
  for (const [column, v] of [['Anneal °C', schedule?.tempC], ['Anneal h', schedule?.hours]]) {
    const want = cell(v, annealed);
    if (now[column] !== want) t.set('measurements', id, column, want, { expect: now[column], migration: MIGRATION });
  }
  const standards = readStandards(now['Standard / load']).join('; ') || NP;
  if (now.Standards !== standards) t.set('measurements', id, 'Standards', standards, { expect: now.Standards, migration: MIGRATION });
}

// A corrected profile is typed again by the parsers, except in a column its Parse review explains (D115).
for (const id of profiles) {
  const r = t.get('profiles', id); const reviewed = reviewFields(r) ?? new Set(); const typed = typedOf(r);
  for (const c of TYPED_COLUMNS) if (!reviewed.has(c) && r[c] !== typed[c]) t.set('profiles', id, c, typed[c], { expect: r[c], migration: MIGRATION });
}

// ---------------------------------------------------------------- page statements
const VOID = { 'Specimen type': NP, 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA, Standard: NP, 'Test temperature °C': NP };
const reviewed = (r, why) => {
  const words = `Corrected ${MIGRATION} (${DATE}, Claude Opus on a Claude Sonnet re-read of the page): ${why}`;
  if (!String(r['Reviewed by']).includes(`Corrected ${MIGRATION}`)) t.set('page_context', r.PageContextID, 'Reviewed by', `${r['Reviewed by']} ${words}`, { expect: r['Reviewed by'], migration: MIGRATION });
};
// Corrections first, so a row narrowed into several scopes carries them into each; a voided row adds nothing, so its quote
// is not needed.
const ORDER = { fix: 0, void: 1, narrow: 2 };
const verdicts = read('page-context-verdicts.csv').filter((x) => x.decision !== 'keep').sort((a, b) => ORDER[a.decision] - ORDER[b.decision]);
for (const v of verdicts) {
  const r = t.get('page_context', v.PageContextID);
  if (v.quote && v.decision !== 'void') onCachedSheet(t, r.SourceID, v.quote, MIGRATION);
  if (v.decision === 'fix' && v.column) {
    if (r[v.column] === v.value) continue;
    t.set('page_context', r.PageContextID, v.column, v.value, { expect: v.expect, migration: MIGRATION });
    reviewed(t.get('page_context', r.PageContextID), `${v.column} ${v.expect} → ${v.value}; ${v.reason}`);
    contexts++;
  } else if (v.decision === 'void') {
    let moved = false;
    for (const [c, want] of Object.entries(VOID)) if (r[c] !== want) { t.set('page_context', r.PageContextID, c, want, { expect: r[c], migration: MIGRATION }); moved = true; }
    if (moved) { reviewed(t.get('page_context', r.PageContextID), `voided, it states nothing for the page as a whole; ${v.reason}`); contexts++; }
  } else if (v.decision === 'narrow') {
    const [own, ...more] = String(v.scopes ?? '').split(';').map((s) => s.trim()).filter(Boolean);
    if (!own) throw new Error(`${MIGRATION}: ${v.PageContextID} narrowed to no scope`);
    if (r['Applies to'] === own) continue;
    t.set('page_context', r.PageContextID, 'Applies to', own, { expect: r['Applies to'], migration: MIGRATION });
    reviewed(t.get('page_context', r.PageContextID), `Applies to ${r['Applies to']} → ${[own, ...more].join(', ')} (a row per scope); ${v.reason}`);
    for (const scope of more) {
      const base = t.get('page_context', r.PageContextID);
      const id = nextId('page_context', t.rows('page_context').map((x) => x.PageContextID));
      t.append('page_context', { ...base, PageContextID: id, 'Applies to': scope }, { migration: MIGRATION });
      added++;
    }
    contexts++;
  }
}

if (cells || contexts || added) t.save();
console.log(`${MIGRATION}: ${cells} cell(s) corrected, ${contexts} page statement(s) corrected, ${added} page statement(s) added for a narrowed scope`);
