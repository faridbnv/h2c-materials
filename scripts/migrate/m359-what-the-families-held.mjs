#!/usr/bin/env node
// Migration m359 (2026-10-05): the error families the reader round named, looked for over every registered source, and
// the conditions a page states in a drawing or on another page (gap round 2, phase 3c and 3e; D125).
//
// Detectors (docs/audits/2026-10-05-gap-round-2/detect.py) listed 714 candidates on 324 sources: test-bar settings held
// as guidance, one product's rows with the same conditions and different values, duplicates, ranges held as points,
// values far from their material's others that back a product's headline, and what only the reading-order view reads.
// Four Claude Sonnet verifiers read each on its page (verify/v1–v4-verdicts.csv). A further two read 631 rows whose
// missing condition a page might state, in a drawing, a legend or on another page (drawings/a-, b-verdicts.csv). Claude
// Opus decided by class (verify/decisions.csv, drawings/decisions.csv, verify/adds/values-add.csv):
//   - kept: a tensile bar a sheet shows upright stays Z where a verifier read its column label "ZX" (D92, m191), and a
//     Raise3D column headed "ZX, Flat" stays ZX, the sheet's own words disagreeing with its drawing;
//   - an absorption test's saturated or equilibrium condition goes in its Standard / load, never in a moisture state,
//     which is the specimen's;
//   - a table's printer, tip and layer height are its rows' print parameters, not their standard;
//   - a notch a specimen drawing shows (Flashforge's 45° V-notch beside ASTM D256, a notched test; Eryone's and PolyCast's
//     drawings), but not Bambu Lab's: its Z impact values beside a drawn V-notch sit above its notched X-Y ones on nine
//     sheets, which a notched Z bar cannot do, so the drawing does not settle them; an
//     orientation a drawing or a column header shows, a schedule printed on another page, a specimen form a footnote
//     states; a duplicate retired naming its twin; a value the page itself contradicts flagged; a row whose label and
//     method disagree quarantined; and the values the page prints that no row held (a heat deflection, a melting point,
//     a hardness in Shore D, an Izod at −40 °C).
// A quote is checked on the cached sheet wherever the text layer prints it; a condition only a drawing shows says so in
// the row's note. Each edit names the value it replaces. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m359-what-the-families-held.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet, applyProposals } from './read-proposals-apply.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { readStandards } from '../../build/src/normalize/standards.js';
import { parseAnnealSchedule, readPostProcessingState } from '../../build/src/normalize/specimen.js';
import { withNote } from './source-edits.mjs';

const MIGRATION = 'm359';
const DATE = '2026-10-05';
const DIR = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2');
const NP = 'Not published';
const NA = 'Not applicable';
const t = openTables();
const measurements = new Set();
const profiles = new Set();
let cells = 0;

const note = (row, text) => {
  const after = t.get('measurements', row);
  if (!String(after.Notes ?? '').includes(text)) t.set('measurements', row, 'Notes', withNote(after.Notes, text), { expect: after.Notes, migration: MIGRATION });
};
for (const d of [...rowsOf(join(DIR, 'verify/decisions.csv')), ...rowsOf(join(DIR, 'drawings/decisions.csv'))]) {
  const r = t.get(d.table, d.id);
  if ((r[d.column] ?? '') === (d.value ?? '')) continue;
  if (d.quote) onCachedSheet(t, r.SourceID, d.quote, MIGRATION);
  t.set(d.table, d.id, d.column, d.value, { expect: d.expect, migration: MIGRATION });
  if (d.table === 'profiles') { profiles.add(d.id); cells++; continue; }
  measurements.add(d.id);
  const why = String(d.note ?? '').replace(/\s+/g, ' ').trim();
  if (d.action === 'status') note(d.id, why.startsWith('Retired') || why.startsWith('Flagged') || why.startsWith('Quarantined') ? why : `${d.value} (${MIGRATION}): ${why}`);
  else note(d.id, `Corrected ${MIGRATION} (${DATE}): ${d.column} ${d.expect} → ${d.value}${d.quote ? '' : ' (read on the page image)'}; ${why}`.replace(/\.?$/, '.'));
  cells++;
}

// What changed words are typed again from: the treatment's state and schedule, the standards.
for (const id of measurements) {
  const r = t.get('measurements', id);
  const state = readPostProcessingState(r['Post-processing']);
  if (state && state !== r['Post-processing state']) t.set('measurements', id, 'Post-processing state', state, { expect: r['Post-processing state'], migration: MIGRATION });
  const now = t.get('measurements', id);
  const annealed = now['Post-processing state'] === 'annealed';
  const schedule = parseAnnealSchedule(now['Post-processing'], now['Post-processing state']);
  for (const [column, v] of [['Anneal °C', schedule?.tempC], ['Anneal h', schedule?.hours]]) {
    const want = annealed ? (v == null ? NP : String(v)) : NA;
    if (now[column] !== want) t.set('measurements', id, column, want, { expect: now[column], migration: MIGRATION });
  }
  const standards = readStandards(now['Standard / load']).join('; ') || NP;
  if (now.Standards !== standards) t.set('measurements', id, 'Standards', standards, { expect: now.Standards, migration: MIGRATION });
}
for (const id of profiles) {
  const r = t.get('profiles', id); const reviewed = reviewFields(r) ?? new Set(); const typed = typedOf(r);
  for (const c of Object.values(TYPED).flat()) if (!reviewed.has(c) && r[c] !== typed[c]) t.set('profiles', id, c, typed[c], { expect: r[c], migration: MIGRATION });
}

// The values the pages print that no row held.
const added = applyProposals(t, join(DIR, 'verify/adds'), {
  migration: MIGRATION, date: DATE,
  read: 'Read 2026-10-05 by a Claude Sonnet verifier on the page image, checked against the cached text layer; decided by Claude Opus (gap round 2)',
});
t.save();
console.log(`${MIGRATION}: ${cells} cell(s) corrected on ${measurements.size} measurement(s) and ${profiles.size} profile(s); ${added.valuesAdded} value(s) added`);
