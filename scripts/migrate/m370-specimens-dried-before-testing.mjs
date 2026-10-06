#!/usr/bin/env node
// Migration m370 (2026-10-05): a test bar dried before testing was tested dry, and a bar conditioned per its standard was
// tested conditioned (check round 3, D131; build/reports/table-detectors, wrong-column; the leftover statements of
// OPEN-PROBLEMS §31).
//
// - Bambu Lab's sheets say how every bar was prepared: "All the specimens were annealed and dried at 80 °C for 12 h before
//   testing". 641 rows carry that sentence in Post-processing and, beside it, Moisture condition "Dried before testing
//   (see preparation)" and Moisture state dry. The rows of seven sheets (PLA Tough+, PC FR, PA6-GF, PLA Translucent, TPU
//   for AMS, PLA Sparkle, PET-CF; 140 values) carry the sentence and Moisture state not-stated, because the moisture
//   reader read no state in it and nothing checked the typed column. They are typed as their siblings are. The reader
//   now reads the sentence (build/src/normalize/moisture.js), so a row that says it and is typed otherwise stops the
//   build (PARSE-MISMATCH).
// - Stratasys's PA6/66-GF30-FR sheet says on p. 5, above the drawings of its bars: "The breakaway support was manually
//   removed before the samples were conditioned per the respective ASTM standard." The tables that sentence speaks for
//   are on pp. 6 and 7 (Tables 4 and 5), whose page statements (PC00381, PC00382) state no moisture. A standard's
//   conditioning is a stated humidity (ASTM D618, 23 °C and 50 % RH), so the bars were tested conditioned: a page
//   statement each for pp. 6 and 7, naming p. 5. A polyamide's values conditioned are not its dry ones (D99).
// Each quote is checked on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m370-specimens-dried-before-testing.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm370';
const NA = 'Not applicable';
const NP = 'Not published';
const DRIED = /^All the specimens were annealed and dried at \d+ °C for \d+ (?:h|hours) before testing/;
const t = openTables();
let rows = 0, statements = 0;

const sheets = new Set();
for (const m of t.rows('measurements')) {
  if (m['Data status'].startsWith('Retired') || !DRIED.test(m['Post-processing'])) continue;
  if (m['Moisture state'] !== 'not-stated' || m['Moisture condition'] !== NP) continue;
  if (!sheets.has(m.SourceID)) { onCachedSheet(t, m.SourceID, m['Post-processing'].match(DRIED)[0], MIGRATION); sheets.add(m.SourceID); }
  t.set('measurements', m.MeasurementID, 'Moisture condition', 'Dried before testing (see preparation)', { expect: NP, migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Moisture state', 'dry', { expect: 'not-stated', migration: MIGRATION });
  rows++;
}

const STRATASYS = 'R-STRATASYS-mds-fdm-pa6-66-gf30-fr-0726a';
const CONDITIONED = 'The breakaway support was manually removed before the samples were conditioned per the respective ASTM standard.';
for (const [page, table] of [[6, 'Table 4'], [7, 'Table 5']]) {
  if (t.rows('page_context').some((c) => c.SourceID === STRATASYS && Number(c.Page) === page && c.Statement === CONDITIONED)) continue;
  onCachedSheet(t, STRATASYS, CONDITIONED, MIGRATION);
  t.append('page_context', {
    PageContextID: t.nextId('page_context'), SourceID: STRATASYS, Page: String(page), 'Applies to': 'all', Table: NA, Statement: CONDITIONED,
    'Specimen type': NP, 'Moisture state': 'conditioned', 'Post-processing state': 'not-stated', 'Anneal °C': NA, 'Anneal h': NA,
    Standard: NP, 'Test temperature °C': NP,
    Locator: `p. 5: Mechanical Properties, above the drawings of the bars; it speaks for ${table} on p. ${page} (a conditioning per the ASTM standard is a stated humidity, ASTM D618)`,
    'Reviewed by': `Read 2026-10-05 by a Claude Sonnet reader from the page image (check round 3), decided and applied by Claude Opus (${MIGRATION})`,
  }, { migration: MIGRATION });
  statements++;
}
if (rows || statements) t.save();
console.log(`${MIGRATION}: ${rows} value(s) on ${sheets.size} sheet(s) typed dry as their preparation says; ${statements} page statement(s) of a conditioning per the standard`);
