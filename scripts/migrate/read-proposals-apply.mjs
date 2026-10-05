// The reader round's proposals, applied: the one function every migration that takes a committed proposals folder
// (docs/audits/2026-10-04-reader-round/proposals/<run>/, written by scripts/ingest/read-proposals.mjs) calls.
//
//   import { openTables } from '../data/table-io.mjs';
//   import { applyProposals } from './read-proposals-apply.mjs';
//   const t = openTables();
//   const counts = applyProposals(t, 'docs/audits/2026-10-04-reader-round/proposals/<run>', {
//     migration: 'm339', read: 'Read 2026-10-05 by Claude Sonnet vision readers (reader round), checked against the cached text layer' });
//   t.save();
//
// What it applies, in this order, from the folder's ready rows (a row whose gate is not `ready` stops the run):
//
//   profiles-add.csv        a new profile, built from a like-row of the same maker and typed by the parsers (typedOf)
//   profiles-set.csv        a cell of a held profile, retyped; each row names the value it replaces (`expect`)
//   values-set.csv          a cell of a held measurement the page contradicts (m298's set format), noted
//   values-add.csv          a published value never transcribed, copying a like-row (m298's add format)
//   page-context-add.csv    a heading or footnote stated once for the values beneath it
//
// Every quote is checked on the cached, hash-checked sheet before anything is written (onSheet, with the OCR sidecar as a
// second view; D35). A set names the value it replaces, so a run after the data moved stops instead of overwriting; a
// re-run finds every row already applied and changes nothing. A value's Raw numeric × Conversion factor must be its
// Normalized value (the m298 check), and the parsers' reading of a profile's raw cells must be the typed cells the file
// proposes (the build's PARSE-MISMATCH would otherwise stop the build). Nothing here saves: the migration does.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { nextId } from '../data/table-io.mjs';
import { projectRoot } from '../ingest/context.mjs';
import { NUM, quoteViews, tidy } from '../ingest/read-proposals.mjs';
import { onSheet, rowsOf } from './m277-m279-sweep-shared.mjs';
import { TYPED, retype, typedOf } from './m290-profile-settings.mjs';
import { addValue, withNote } from './source-edits.mjs';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseHdtStandard } from '../../build/src/normalize/thermal.js';
import { loadCellFromParsed, testTemperatureCell } from '../../build/src/typed-values.js';

const NP = 'Not published';
const NA = 'Not applicable';
const H2C_DEFAULTS = { 'H2C left': 'Verify exact grade/nozzle; no blanket approval', 'H2C right': 'Verify exact grade/nozzle; no blanket approval', 'AMS 2 Pro': 'Not verified for every grade', 'AMS HT': 'Not verified for every grade' };
const RAW_PROFILE_CELLS = ['Nozzle °C', 'Bed °C', 'Chamber °C', 'Enclosure', 'Plate', 'Drying', 'Nozzle diameter', 'Abrasion / clogging'];
const TYPED_COLUMNS = Object.values(TYPED).flat();

/** The sheet guard: each piece of the quote is on the cached sheet in the line view (onSheet), else in its reading-order view, else in its OCR sidecar. Returns the view(s) that bore it out. */
export function onCachedSheet(t, sourceId, quote, migration) {
  try {
    onSheet(t, sourceId, quote, migration);
    return 'line';
  } catch (error) {
    const views = quoteViews(t.get('sources', sourceId)?.SHA256, quote);
    if (views == null || views === '') throw error;
    return views;
  }
}

const value = (v) => (v == null ? '' : String(v));
/** A note's account of the view that bore a quote out, when it was not the line view the other migrations read. */
const viewNote = (view) => (!view || view === 'line' ? '' : ` Its quote was read in the ${view.replace('block', 'reading-order')} view of the cached sheet.`);

/**
 * Apply a proposals folder to the open tables. `migration` names the migration in every note; `read` is the sentence the notes
 * start with (who read the pages, when, and what bore the reading out). `date` is the day an added value's note names (the day the
 * pages were read; default 2026-10-04). `sheet` is the quote guard, replaceable in tests. Every text cell written is tidied after its
 * quote is checked: full-width punctuation made ASCII outside Chinese and Japanese text, runs of spaces made one (the lint's TEXT rules).
 * Returns the counts of what was written. A re-run writes nothing.
 */
export function applyProposals(t, dir, { migration, read, date = '2026-10-04', sheet = onCachedSheet } = {}) {
  if (!migration || !read) throw new Error('applyProposals needs { migration, read }: a note must name both');
  const guard = (...args) => { const v = sheet(...args); return typeof v === 'string' && v ? v : 'line'; };
  const root = resolve(projectRoot, dir);
  const file = (name) => join(root, name);
  const load = (name) => (existsSync(file(name)) ? rowsOf(file(name)) : []).map((e) => {
    if (e.gate !== 'ready') throw new Error(`${migration}: ${name} holds a row with gate "${e.gate}"; only ready rows are applied (hold it in held.csv)`);
    return e;
  });
  const counts = { profilesAdded: 0, profileCells: 0, valueCells: 0, valuesAdded: 0, contextAdded: 0, causes: {} };
  const because = (e) => { const c = e.cause || 'unspecified'; counts.causes[c] = (counts.causes[c] ?? 0) + 1; return c; };
  const grades = new Map(t.rows('grades').map((g) => [g.GradeID, g]));
  const live = (p) => p.Profile !== 'Retired duplicate record';
  const formulation = (gradeId) => {
    const key = grades.get(gradeId)?.['Shared formulation key'];
    return key && !/^Not (published|applicable)/.test(key) ? [...grades.values()].filter((g) => g['Shared formulation key'] === key).map((g) => g.GradeID) : [gradeId];
  };

  // ---------------------------------------------------------------- new profiles
  for (const e of load('profiles-add.csv')) {
    if (e.parsed_vs_read !== 'agrees') throw new Error(`${migration}: profile for ${e.GradeID} on ${e.SourceID}: parsed_vs_read is "${e.parsed_vs_read}"`);
    const grade = t.get('grades', e.GradeID);
    const group = formulation(e.GradeID);
    if (t.rows('profiles').some((p) => live(p) && p.SourceID === e.SourceID && group.includes(p.GradeID))) continue;
    const view = guard(t, e.SourceID, e.quote, migration) || 'line';
    const like = t.get('profiles', e.like);
    const ids = t.rows('profiles').map((p) => p.ProfileID);
    const sameProduct = like.GradeID === e.GradeID || like.MaterialID === grade.MaterialID;
    const row = {
      ...like, ...(sameProduct ? {} : H2C_DEFAULTS), ProfileID: nextId('profiles', ids), MaterialID: grade.MaterialID, GradeID: e.GradeID, Profile: e.Profile,
      SourceID: e.SourceID, Locator: tidy(e.Locator), 'Parse review': NA, 'Nozzle material': NP, 'AMS published': NP, 'Support pairing': NP, 'Failure modes': NP,
      ...Object.fromEntries(RAW_PROFILE_CELLS.map((c) => [c, tidy(e[c] ?? NP)])),
    };
    const typed = typedOf(row);
    for (const c of TYPED_COLUMNS) {
      if (value(typed[c]) !== value(e[c])) throw new Error(`${migration}: profile for ${e.GradeID} on ${e.SourceID}: the parsers now read ${c} as "${typed[c]}", the proposal has "${e[c]}"; propose again`);
    }
    t.append('profiles', { ...row, ...typed });
    because(e); counts.profilesAdded++;
  }

  // ---------------------------------------------------------------- cells of held profiles
  for (const e of load('profiles-set.csv')) {
    if (e.table !== 'profiles') throw new Error(`${migration}: ${e.table} is not a table profiles-set edits`);
    const r = t.get('profiles', e.id);
    if (value(r[e.column]) === tidy(e.value)) continue;
    if (r.SourceID !== e.source) throw new Error(`${migration}: ${e.id} cites ${r.SourceID}, not ${e.source}`);
    const view = guard(t, e.source, e.quote, migration) || 'line';
    t.set('profiles', e.id, e.column, tidy(e.value), { expect: e.expect ?? '', migration });
    if (TYPED[e.column]) retype(t, e.id, [e.column], migration);
    because(e); counts.profileCells++;
  }

  // ---------------------------------------------------------------- cells of held measurements
  const touched = new Map();
  for (const e of load('values-set.csv')) {
    if (e.table !== 'measurements') throw new Error(`${migration}: ${e.table} is not a table values-set edits`);
    const r = t.get('measurements', e.id);
    if (value(r[e.column]) === tidy(e.value)) continue;
    if (r.SourceID !== e.source) throw new Error(`${migration}: ${e.id} cites ${r.SourceID}, not ${e.source}`);
    const view = guard(t, e.source, e.quote, migration) || 'line';
    t.set('measurements', e.id, e.column, tidy(e.value), { expect: e.expect ?? '', migration });
    if (!touched.has(e.id)) touched.set(e.id, { columns: new Set(), reader: e.reader, views: new Set(), causes: new Set() });
    touched.get(e.id).causes.add(because(e));
    touched.get(e.id).views.add(view);
    touched.get(e.id).columns.add(e.column);
    counts.valueCells++;
  }
  for (const [id, { columns, reader, views, causes }] of touched) {
    const r = t.get('measurements', id);
    if (NUM(Number(r['Raw numeric']) * Number(r['Conversion factor'])) !== NUM(Number(r['Normalized value']))) {
      throw new Error(`${migration}: ${id}: ${r['Raw numeric']} × ${r['Conversion factor']} is not ${r['Normalized value']}`);
    }
    if (String(r.Notes).includes(`(${migration})`)) continue;
    t.set('measurements', id, 'Notes', withNote(r.Notes, tidy(`${read} (${migration}${reader ? `, ${reader}` : ''}): ${[...columns].join(', ')} as the page prints them (${[...causes].join(', ')}).${viewNote([...views].join('+'))}`)), { expect: r.Notes, migration });
  }

  // ---------------------------------------------------------------- values never transcribed
  const COLUMNS = ['Property', 'Raw value', 'Raw unit', 'Raw numeric', 'Conversion factor', 'Normalized value', 'Normalized unit', 'Operator', 'Specimen type', 'Direction', 'Notch',
    'Moisture condition', 'Moisture state', 'Post-processing', 'Post-processing state', 'Anneal °C', 'Anneal h', 'Test temperature', 'Standard / load', 'Test load MPa',
    'Specimen / print parameters', 'Locator', 'Raw uncertainty ±', 'Normalized uncertainty ±', 'Raw upper bound', 'Normalized upper bound'];
  for (const e of load('values-add.csv')) {
    if (t.rows('measurements').some((m) => m.SourceID === e.SourceID && m.Locator === tidy(e.Locator) && m['Data status'] !== 'Retired duplicate record')) continue;
    const grade = t.get('grades', e.GradeID);
    const like = t.get('measurements', e.like);
    const view = guard(t, e.SourceID, e.quote, migration) || 'line';
    if (NUM(Number(e['Raw numeric']) * Number(e['Conversion factor'])) !== NUM(Number(e['Normalized value']))) {
      throw new Error(`${migration}: ${e.Locator} on ${e.SourceID}: ${e['Raw numeric']} × ${e['Conversion factor']} is not ${e['Normalized value']}`);
    }
    const set = Object.fromEntries(COLUMNS.map((c) => [c, e[c] ?? NA]));
    set.SourceID = e.SourceID; set.GradeID = e.GradeID; set.MaterialID = grade.MaterialID;
    set.Standards = readStandards(e['Standard / load']).join('; ') || NP;
    if (set.Standards !== e.Standards) throw new Error(`${migration}: ${e.Locator}: the parser reads the standards of "${e['Standard / load']}" as "${set.Standards}", the proposal has "${e.Standards}"`);
    set['Test temperature °C'] = testTemperatureCell(e['Test temperature']);
    if (set['Test temperature °C'] !== value(e['Test temperature °C'])) throw new Error(`${migration}: ${e.Locator}: the parser reads the test temperature "${e['Test temperature']}" as ${set['Test temperature °C']}, the proposal has ${e['Test temperature °C']}`);
    if (e.Property === 'HDT') {
      const load2 = loadCellFromParsed(parseHdtStandard(e['Standard / load']));
      if (load2 !== e['Test load MPa']) throw new Error(`${migration}: ${e.Locator}: the parser reads the load of "${e['Standard / load']}" as ${load2}, the proposal has ${e['Test load MPa']}`);
    }
    set['Data status'] = 'Published value';
    set['Parse review'] = NA;
    // Text as the tables hold it, after the quote check; the parsers must read the tidy cells as they read the proposed ones.
    for (const k of Object.keys(set)) if (typeof set[k] === 'string') set[k] = tidy(set[k]);
    if ((readStandards(set['Standard / load']).join('; ') || NP) !== set.Standards) throw new Error(`${migration}: ${e.Locator}: the parser reads the tidied Standard / load differently`);
    if (testTemperatureCell(set['Test temperature']) !== set['Test temperature °C']) throw new Error(`${migration}: ${e.Locator}: the parser reads the tidied Test temperature differently`);
    const id = addValue(t, { like: like.MeasurementID, set, migration, date, why: 'published in the source, never transcribed.', note: tidy(`${e.note} ${read} (${e.cause || 'unspecified'}).${viewNote(view)}`) });
    if (id) { because(e); counts.valuesAdded++; }
  }

  // ---------------------------------------------------------------- what a page states once
  for (const e of load('page-context-add.csv')) {
    if (t.rows('page_context').some((c) => c.SourceID === e.SourceID && String(c.Page) === String(e.Page) && c['Applies to'] === e['Applies to'])) continue;
    const view = guard(t, e.SourceID, e.quote, migration) || 'line';
    t.append('page_context', {
      PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), SourceID: e.SourceID, Page: e.Page, 'Applies to': e['Applies to'], Statement: tidy(e.Statement),
      'Specimen type': e['Specimen type'], 'Moisture state': e['Moisture state'], 'Post-processing state': e['Post-processing state'], 'Anneal °C': e['Anneal °C'], 'Anneal h': e['Anneal h'],
      Standard: e.Standard, 'Test temperature °C': e['Test temperature °C'], Locator: tidy(e.Locator), 'Reviewed by': tidy(`${read} (${migration}${e.reader ? `, ${e.reader}` : ''})${viewNote(view)}`),
    });
    because(e); counts.contextAdded++;
  }
  return counts;
}
