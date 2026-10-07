#!/usr/bin/env node
// Migration m410 (2026-10-07): the values, print settings and page statements the held sheets print and the tables did
// not hold (completeness round, item 1; D136), and two filings the round's reading found wrong (item 2).
//
// Item 1. The reader recall (npm run audit:reader-recall) and the import's skipped lines (source_facts) found 2,703
// lines on registered sheets that no row holds. 404 of them would fill an empty headline of the sheet's own product; a
// seeded 80 of the other headline properties and 80 of the rest were drawn beside them (targets.mjs, TARGETS-1.csv).
// Claude Sonnet readers read every cell of every property table on those 311 sheets' pages (read/PROMPT-c1.md);
// `ingest:read-reconcile` checked each against the text layer and the held rows, blind Sonnet second readers read again
// every value that decides and every mismatch (read/second/), and `ingest:read-proposals` mapped what passed. Claude
// Opus reviewed every ready row (read/curate.py, curation.csv): none of the 28 proposed corrections of a held value
// stands, each being the neighbouring cell of the held one; the rest of what stays held is listed there with its reason.
// Reading a registered, hash-checked sheet again is not an import (D123).
//
// Item 2. Spectrum's 2024 portfolio prints its desktop table with each product's name under its row, and m342 filed PLA
// Nature's density and heat deflection (1.25 g/cm³, 60 °C) on PLA Premium: they move to PLA Nature (G001-141), keeping
// their IDs. Recreus FILAFLEX FOAMY (G150-01) was filed on the 95A Foamy sheet of 2024, which is FILAFLEX 95 FOAMY's
// (G150-03); its own sheet is the 2023 one its rows cite (78 Shore A).
//
// applyProposals checks every quote on the cached sheet before it writes. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m410-values-the-held-sheets-print.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { applyProposals } from './read-proposals-apply.mjs';
import { rowsOf } from './m277-m279-sweep-shared.mjs';

const MIGRATION = 'm410';
const DATE = '2026-10-07';
const DIR = join(projectRoot, 'docs/audits/2026-10-07-completeness-round/read/applied');
const READ = 'Read 2026-10-07 by Claude Sonnet readers from the page image with its table and column (completeness round, item 1), checked against the cached text layer, and where it decides, read again blind; reviewed and applied by Claude Opus';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: DATE });

// ---- A value physics rules out, kept as printed and flagged so it backs nothing (AGENTS.md; m401). Fiberlogy's CPE HT
// sheet prints a notched Izod of 92 kJ/m² (ISO 180), read on the page image; a notched copolyester bar breaks near 5 to
// 10 kJ/m², and the sheet says its values come from "standard reference materials and/or supplier test data" (Eastman's
// Amphora HT5300 resin prints a notched Izod near 90 J/m): a resin's J/m printed as kJ/m².
const FLAG = 'Published value (physically implausible)';
counts.flagged = 0;
for (const m of t.rows('measurements').filter((r) => r.SourceID === 'R-FIBERLOGY-FIBERLOGY-CPE-HT-TDS-0' && r.Property === 'Izod impact strength' && r['Raw numeric'] === '92' && r.Notes.includes(`(${MIGRATION})`))) {
  if (m['Data status'] === FLAG) continue;
  t.set('measurements', m.MeasurementID, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', m.MeasurementID, 'Notes', `${m.Notes} Flagged ${DATE} (${MIGRATION}): the page prints 92 kJ/m² for a notched Izod bar of CPE HT, a copolyester whose notched bars break near 5 to 10 kJ/m²; the sheet's values are drawn from reference and supplier data, and 92 is the size of the resin's notched Izod in J/m. The number is kept as printed and backs nothing.`, { expect: m.Notes, migration: MIGRATION });
  counts.flagged++;
}

// ---- Item 2: two filings.
counts.moved = 0;
for (const id of ['V012368', 'V012369']) {
  const m = t.get('measurements', id);
  if (m.GradeID === 'G001-141') continue;
  t.set('measurements', id, 'GradeID', 'G001-141', { expect: 'G001-69', migration: MIGRATION });
  t.set('measurements', id, 'Locator', m.Locator.replace('(G001-69)', '(G001-141)'), { expect: m.Locator, migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${m.Notes} Moved ${DATE} (${MIGRATION}) from PLA Premium (G001-69) to PLA Nature (G001-141): the portfolio prints each product's name under its row, and the row of 1.25 g/cm³ and HDT 60 °C is PLA Nature's (PLA Premium's prints 1.24 and 55 °C).`, { expect: m.Notes, migration: MIGRATION });
  counts.moved++;
}
const FOAMY = 'R-RECREUS-FILAFLEX-FOAMY-TECHNICAL-DATA-SHEET-TDS-2023';
const g150 = t.get('grades', 'G150-01');
if (g150.SourceID !== FOAMY) {
  t.set('grades', 'G150-01', 'SourceID', FOAMY, { expect: 'R-RECREUS-FILAFLEX-95A-FOAMY-TECHNICAL-DATA-SHEET-TDS-2024', migration: MIGRATION });
  t.set('grades', 'G150-01', 'Shared formulation key', FOAMY, { expect: 'R-RECREUS-FILAFLEX-95A-FOAMY-TECHNICAL-DATA-SHEET-TDS-2024', migration: MIGRATION });
  counts.moved++;
}

// ---- Each source names the products its rows are now on (AUDIT-SOURCE-SCOPE), as m399 did.
const GRADE = /G\d{3}-(?:\d+(?:-R\d+)?|R\d+)/g;
counts.scoped = 0;
const touched = new Set([...rowsOf(join(DIR, 'values-add.csv')).map((r) => r.SourceID), 'R-SPECTRUM-PORTFOLIO-2024']);
for (const sourceId of touched) {
  const s = t.get('sources', sourceId);
  const before = s['Applicable grades'];
  const entries = [...new Set(String(before ?? '').split(';').map((e) => e.trim()).filter((e) => e && !/^Not (published|applicable)$/.test(e)))];
  const listed = new Set(entries.flatMap((e) => e.match(GRADE) ?? []));
  const add = [...new Set(t.rows('measurements').filter((m) => m.SourceID === sourceId && m['Data status'] !== 'Retired duplicate record').map((m) => m.GradeID))].filter((g) => !listed.has(g)).sort();
  if (!add.length) continue;
  t.set('sources', sourceId, 'Applicable grades', [...entries, ...add.map((g) => `${t.get('grades', g).MaterialID} / ${g}`)].join('; '), { expect: before, migration: MIGRATION });
  counts.scoped += add.length;
}

// ---- A new "Impact strength, test unclear" row gets its reviewer's reading of the test (impact_test_guesses, m391).
const GUESS = {
  'S-PET-TDS-ReForm-rPLA': ['Cannot tell', 'FormFutura\'s ReForm rPLA sheet prints "Impact strength 7.5 KJ/m²" with no method and no notch; kJ/m² is the unit of ISO 179 Charpy and of ISO 180 Izod alike.'],
  'R-3DJAKE-3DJAKE-23-TDS-HYPER-PETG-EN': ['Charpy', 'The row names "ASTM D256 (ISO 179, GB/T 1043)" and prints kJ/m², the unit of ISO 179 and GB/T 1043, both Charpy; ASTM D256 reports J/m.'],
};
counts.testReadings = 0;
for (const m of t.rows('measurements').filter((r) => r.Property === 'Impact strength' && GUESS[r.SourceID] && r.Notes.includes(`(${MIGRATION})`))) {
  if (t.rows('impact_test_guesses').some((g) => g.MeasurementID === m.MeasurementID)) continue;
  const [test, basis] = GUESS[m.SourceID];
  t.append('impact_test_guesses', { MeasurementID: m.MeasurementID, 'Likely test': test, Basis: basis, 'Reviewed by': `Claude Opus 5.5, ${DATE}, on the cached sheet (${MIGRATION})` });
  counts.testReadings++;
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts }, null, 2));
