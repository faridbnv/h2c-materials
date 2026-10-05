#!/usr/bin/env node
// Migration m365 (2026-10-05): the families gap round 2's blind draw and its probe of moved answers named, swept over
// every registered source (D129; docs/audits/2026-10-05-gap-round-2/blind-draw/).
//
// A blind draw of 40 of the round's records (seed 20261007) found 6 with a cell the page contradicts or leaves out, and a
// probe of 22 moved print answers found 7. Each names a family; each family was looked for everywhere
// (blind-draw/sweep/detect.py), read on its pages by Claude Sonnet readers where a page must decide, and decided by
// Claude Opus:
//   - A dry box is where the filament is kept, not a drying schedule (D120): on 169 profiles of Spectrum's sheets and
//     the portfolios that reprint them, the Drying cell held the dry-box row's answer ("No", "Yes", "not necessary",
//     "niewymagane"), which m355 then read as drying not needed. None of those sheets prints a drying row: the cell is
//     Not published, and the dry-box words are a Storage humidity note where the profile has none.
//   - Flashforge's note "the printed model has not been annealed" heads the values its test-bar block speaks for: the
//     21 page statements m358 wrote from those blocks say as-printed, not not-stated (the reader now reads the denial).
//   - A profile's hardened-nozzle answer is read from its nozzle-material and nozzle-size lines where its abrasion line
//     is silent, and a drying time that starts at 0 h is optional (build/src/recipe.js, process.js): every live profile
//     is typed again.
//   - The cells the readers found on the page (sweep/decisions.csv): a drying condition the cell left out ("Drying (if
//     wet) recommended", "In case the filament has become wet"), a hardened-nozzle statement no cell held, the words a
//     nozzle-size cell dropped. Each quote is checked on the cached sheet.
//   - The test bars' printing statement in one sentence or footnote (SUNLU's "[1] Test specimens were printed at…",
//     Stratasys's "Samples were printed with 0.010 in. layer height…", Raise3D's, 3DJake's, Kingroon's), and the
//     conditioning sentence older Polymaker and Raise3D sheets print beside their block ("All specimens were
//     conditioned at room temperature for 24h prior to testing"), onto the values they speak for, as m358 did
//     (sweep/blocks.csv). The conditioning names no humidity, so the moisture state stays not stated.
// Each edit names the value it replaces. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m365-what-the-draw-named.mjs
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { openTables, projectRoot, nextId } from '../data/table-io.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';
import { withNote } from './source-edits.mjs';
import { typedOf, TYPED } from './m290-profile-settings.mjs';
import { reviewFields } from '../../build/src/typed-values.js';
import { readPostProcessingState } from '../../build/src/normalize/specimen.js';
import { pageOf, scopeOf } from '../../build/src/page-context.js';
import { specimenForm } from '../../build/src/normalize/specimen.js';
import { tidy } from '../ingest/read-proposals.mjs';

const MIGRATION = 'm365';
const DIR = join(projectRoot, 'docs/audits/2026-10-05-gap-round-2/blind-draw/sweep');
const REVIEWED = 'Read 2026-10-05 by Claude Sonnet readers on the page image and the cached sheet, quote-checked and scoped by Claude Opus; gap round 2, blind-draw sweep (m365)';
const NP = 'Not published';
const NA = 'Not applicable';
const t = openTables();
const live = (p) => !String(p.Profile).startsWith('Retired');
const count = { dryBox: 0, notes: 0, pageStatements: 0, cells: 0, retyped: 0, pageRows: 0, printParameters: 0, moisture: 0 };

// A dry box's answer held as the Drying cell.
const DRY_BOX = /dry\s*box|drybox|suszarka/i;
const hasStorageNote = (id) => t.rows('profile_notes').some((n) => n.ProfileID === id && n.Topic === 'Storage humidity');
for (const p of t.rows('profiles').filter(live)) {
  if (p.Drying === NP || !DRY_BOX.test(p.Locator) || /drying/i.test(p.Locator)) continue;
  // The row's label as the Locator names it, and its answer: "Dry box recommended No", "Suszarka do filamentu niewymagane".
  const label = /(?:^|;\s*)(?:p\.\s*\d+:\s*)?((?:dry\s*box|drybox|suszarka)[^;]*)/i.exec(p.Locator)[1].trim();
  const words = `${label} ${p.Drying}`;
  if (!hasStorageNote(p.ProfileID)) {
    t.append('profile_notes', { ProfileID: p.ProfileID, Topic: 'Storage humidity', Text: words }, { migration: MIGRATION });
    count.notes++;
  }
  t.set('profiles', p.ProfileID, 'Drying', NP, { expect: p.Drying, migration: MIGRATION });
  count.dryBox++;
}

// Flashforge's denial of annealing heads its block's values.
for (const c of t.rows('page_context')) {
  if (c['Post-processing state'] !== 'not-stated' || !/has not been annealed/i.test(c.Statement) || readPostProcessingState(c.Statement) !== 'as-printed') continue;
  onCachedSheet(t, c.SourceID, 'has not been annealed', MIGRATION);
  t.set('page_context', c.PageContextID, 'Post-processing state', 'as-printed', { expect: 'not-stated', migration: MIGRATION });
  count.pageStatements++;
}

// The cells the readers found on the page.
const decisions = join(DIR, 'decisions.csv');
for (const d of existsSync(decisions) ? rowsOf(decisions) : []) {
  const r = t.get('profiles', d.record);
  if (r[d.column] === d.value) continue;
  if (d.quote) onCachedSheet(t, r.SourceID, d.quote, MIGRATION);
  t.set('profiles', d.record, d.column, d.value, { expect: d.expect, migration: MIGRATION });
  count.cells++;
}

// Every live profile typed again by the readers as they now read.
for (const p of t.rows('profiles').filter(live)) {
  const r = t.get('profiles', p.ProfileID), reviewed = reviewFields(r) ?? new Set(), typed = typedOf(r);
  for (const c of new Set(Object.values(TYPED).flat())) {
    if (reviewed.has(c) || r[c] === typed[c]) continue;
    t.set('profiles', p.ProfileID, c, typed[c], { expect: r[c], migration: MIGRATION });
    count.retyped++;
  }
}

// The test bars' printing and conditioning statements onto the values they speak for (as m358).
const blocksFile = join(DIR, 'blocks.csv');
const norm = (s) => String(s ?? '').toLowerCase().replace(/[°º˚]/g, '°').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
for (const b of existsSync(blocksFile) ? rowsOf(blocksFile).map((x) => ({ ...x, print_parameters: tidy(x.print_parameters) })) : []) {
  onCachedSheet(t, b.source, b.quote, MIGRATION);
  if (b.moisture_condition) onCachedSheet(t, b.source, b.moisture_condition, MIGRATION);
  const table = b.table || null;
  const scopes = new Set(b.scopes.split(';').map((s) => s.trim()).filter(Boolean));
  if (b.specimen_type === 'Printed specimen' && b.print_parameters) {
    for (const scope of scopes) {
      const row = {
        SourceID: b.source, Page: b.values_page, 'Applies to': scope, Table: table ?? NA, Statement: `Printed test bars: ${b.print_parameters}`, 'Specimen type': 'Printed specimen',
        'Moisture state': 'not-stated', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA, Standard: NP, 'Test temperature °C': NP,
        Locator: `p. ${b.page}: the statement of how the test bars were printed${String(b.page) === String(b.values_page) ? '' : `, for the values of p. ${b.values_page}`}`,
      };
      const held = t.rows('page_context').find((c) => c.SourceID === row.SourceID && String(c.Page) === String(row.Page) && c['Applies to'] === scope
        && c['Specimen type'] === 'Printed specimen' && (c.Table ?? NA) === row.Table);
      if (held) continue;
      t.append('page_context', { PageContextID: nextId('page_context', t.rows('page_context').map((c) => c.PageContextID)), ...row, 'Reviewed by': REVIEWED }, { migration: MIGRATION });
      count.pageRows++;
    }
  }
  for (const m of t.rows('measurements')) {
    if (m.SourceID !== b.source || String(pageOf(m.Locator)) !== String(b.values_page) || !scopes.has(scopeOf(m.Property))) continue;
    if (table && !norm(m.Locator).includes(norm(table))) continue;
    if (/^Retired|implausible|Unresolved/.test(m['Data status']) || !['printed', 'not-stated'].includes(specimenForm(m['Specimen type']))) continue;
    const edits = [];
    if (b.specimen_type === 'Printed specimen' && b.print_parameters && m['Specimen / print parameters'] === NP) edits.push(['Specimen / print parameters', b.print_parameters, 'printParameters']);
    if (b.moisture_condition && m['Moisture condition'] === NP) edits.push(['Moisture condition', b.moisture_condition, 'moisture']);
    if (!edits.length) continue;
    for (const [column, value, k] of edits) { t.set('measurements', m.MeasurementID, column, value, { expect: NP, migration: MIGRATION }); count[k]++; }
    const after = t.get('measurements', m.MeasurementID);
    const what = edits.map(([c]) => c).join(' and ');
    t.set('measurements', m.MeasurementID, 'Notes', withNote(after.Notes, `${what} from the sheet's statement of how its test bars were printed and conditioned, read 2026-10-05 (${MIGRATION}).`), { expect: after.Notes, migration: MIGRATION });
  }
}

t.save();
console.log(`${MIGRATION}: ${count.dryBox} dry-box answer(s) out of Drying (${count.notes} note(s)); ${count.pageStatements} page statement(s) as printed; ${count.cells} cell(s) the readers found; ${count.retyped} typed cell(s) again; ${count.pageRows} page statement(s), ${count.printParameters} print-parameter and ${count.moisture} conditioning cell(s) from the test-bar statements`);
