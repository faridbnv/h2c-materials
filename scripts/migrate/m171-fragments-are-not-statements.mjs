#!/usr/bin/env node
// Migration m171 (2026-09-26): cells that hold a fragment of the page instead of what it states (phase 6, lane 2,
// finished; GOALS step 2 and 5, C9 and C8; docs/OPEN-PROBLEMS.md §12).
//
// - Twenty-four drying cells held a piece of the page beside the drying row rather than the schedule, and counted as
//   drying stated: Bambu Lab's "before Printing" and "X1 Series & P Series & H2 Series Printer" (the row's label and the
//   next row's), Polymaker's product sheets' "Diameter accuracy (2.85/1.75 mm):" (the column beside), BASF's "to" and
//   iSANMATE's "use" (a word of the label), and 3D4Makers' and Eryone's "2-4", "6-8", "60 -65" (half of the value).
//   Each now holds the schedule its row prints, and the typed columns the parser's reading of it. Two Eryone
//   temperatures are printed without their unit, which the Parse review says. Four cells that say drying is not
//   needed (3DXTECH's "Not needed", BASF's "drying is not necessary") are statements and stay.
// - Nine products were named by a sentence fragment the import took for the product ("and prevents nozzle jams.",
//   "colors.", "to print as PLA.", "Technical Data", "TM TM"): each now has the name its sheet prints as its heading,
//   and its source the title the sheet prints, where the title carried the same fragment.
//
// Every value is checked on the page its row names before anything is written: a statement's words stand on the page
// in order (a two-column page may set up to eight words of the other column between them, which the Gap column says);
// a heading's words all stand on its page. The reviewer of every row is an agent (Claude Opus 5.5); no person has
// reviewed them. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m171-fragments-are-not-statements.mjs

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCsv } from '../../build/src/csv.js';
import { openTables } from '../data/table-io.mjs';
import { cachedText } from '../lib/pdf-text.mjs';
import { parseDrying } from '../../build/src/normalize/process.js';
import { pageReader, words } from './printed-on.mjs';

const migration = 'm171-fragments-are-not-statements';
const here = dirname(fileURLToPath(import.meta.url));
const edits = readCsv(join(here, `${migration}.csv`)).records.map((r) => r.values);
const NA = 'Not applicable';
const NP = 'Not published';

const t = openTables();
const printed = pageReader(t, migration);
const pageWords = (sourceId, page) => new Set(words(cachedText(t.get('sources', sourceId).SHA256).pages.find((p) => p.page === Number(page)).lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ')));

for (const e of edits) {
  if (e.Kind === 'drying') {
    if (!printed(e.SourceID, e.Page, e.Raw, Number(e.Gap))) throw new Error(`${migration}: ${e.Edit} "${e.Raw}" is not printed on p. ${e.Page} of ${e.SourceID}`);
    const p = parseDrying(e.Raw);
    const read = { tempC: p.tempC == null ? NP : String(p.tempC), hours: p.hours == null ? NP : String(p.hours) };
    const reviewed = e['Parse review'] !== NA;
    if ((read.tempC !== e['Drying °C'] || read.hours !== e['Drying hours']) && !reviewed) throw new Error(`${migration}: ${e.Edit} reads as ${read.tempC} °C, ${read.hours} h; pinned ${e['Drying °C']}, ${e['Drying hours']}, and no Parse review says why`);
  } else {
    const have = pageWords(e.SourceID, e.Page);
    const missing = words(e.Raw).filter((w) => !have.has(w));
    if (missing.length) throw new Error(`${migration}: ${e.Edit} "${e.Raw}": ${missing.join(', ')} not on p. ${e.Page} of ${e.SourceID}`);
  }
}

let changed = 0;
const tally = {};
const count = (k) => { tally[k] = (tally[k] ?? 0) + 1; changed++; };
for (const e of edits) {
  if (e.Kind === 'drying') {
    const p = t.get('profiles', e.Record);
    if (p.SourceID !== e.SourceID) throw new Error(`${migration}: ${e.Edit} ${e.Record} cites ${p.SourceID}`);
    if (p.Drying === e.Raw) continue;
    if (p.Drying !== e.Replaces) throw new Error(`${migration}: ${e.Edit} ${e.Record} Drying reads "${p.Drying}", expected "${e.Replaces}"; the data moved`);
    t.set('profiles', e.Record, 'Drying', e.Raw, { expect: e.Replaces });
    t.set('profiles', e.Record, 'Drying °C', e['Drying °C']);
    t.set('profiles', e.Record, 'Drying hours', e['Drying hours']);
    const where = `p. ${e.Page}: ${e.Label}`;
    if (!p.Locator.includes(where)) t.set('profiles', e.Record, 'Locator', `${p.Locator}; ${where}`, { expect: p.Locator });
    if (e['Parse review'] !== NA) t.set('profiles', e.Record, 'Parse review', p['Parse review'] === NA ? e['Parse review'] : `${p['Parse review']} ${e['Parse review']}`, { expect: p['Parse review'] });
    count('drying schedule');
  } else if (e.Kind === 'name') {
    const g = t.get('grades', e.Record);
    if (g['Product name'] === e.Raw) continue;
    t.set('grades', e.Record, 'Product name', e.Raw, { expect: e.Replaces });
    count('product name');
  } else {
    const s = t.get('sources', e.Record);
    if (s.Title === e.Raw) continue;
    t.set('sources', e.Record, 'Title', e.Raw, { expect: e.Replaces });
    count('source title');
  }
}

if (changed) t.save();
for (const [k, v] of Object.entries(tally)) console.log(`  ${v}\t${k}`);
console.log(`${migration}: ${changed} cell(s) written`);
