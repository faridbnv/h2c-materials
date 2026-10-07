#!/usr/bin/env node
// Migration m399 (2026-10-07): impact results the impact round held because its reading did not say which column of the
// page each sat in, read again with the column (quality round 2026-10-07, item 8; D134).
//
// Claude Sonnet readers read every impact table those pages print again, cell by cell with its column
// (docs/audits/2026-10-07-quality-round/read8/PROMPT.md); `ingest:read-reconcile` checked each reading against the page's
// text and the held rows, a second, blind reader read again what the text did not pair, and `ingest:read-proposals` mapped
// what passed. Claude Opus reviewed every ready row (read8/curate.py, curation.csv):
//   - Stratasys's Izod tables, notched and unnotched, one row per printer table and orientation (the method mapping now
//     reads "ASTM D256, ASTM D4812" over both rows as naming neither notch, so each row's own word decides);
//   - the wet-state row of Bambu Lab's PA comparison for PA6-GF, PA6-CF and PAHT-CF, whose own sheets print the dry state;
//   - Fishy Filaments' 0rCA notched Charpy result.
// Left out: values the products' own sheets already hold, three comparison columns given to the wrong product ("Normal
// PA6-CF" twice, IPCON PPA for PPA GF), a comparison column that contradicts the product's own sheet, QIDI's columns
// headed by drawings, and ULTEM 1010's table, read whole in read9. Reading a registered, hash-checked sheet again is not
// an import (D123).
//
// applyProposals checks every quote on the cached sheet before it writes. A re-run is a no-op, and a run after the data
// moved stops.
//
//   node scripts/migrate/m399-impact-values-held-for-a-column.mjs [--dry-run]
import { join } from 'node:path';
import { openTables, projectRoot } from '../data/table-io.mjs';
import { applyProposals } from './read-proposals-apply.mjs';

const MIGRATION = 'm399';
const DIR = join(projectRoot, 'docs/audits/2026-10-07-quality-round/read8/applied');
const READ = 'Read 2026-10-07 by Claude Sonnet readers from the page image with its column (quality round, item 8), checked against the cached text layer, and where the text did not pair it, read again blind; reviewed and applied by Claude Opus';
const t = openTables();

const counts = applyProposals(t, DIR, { migration: MIGRATION, read: READ, date: '2026-10-07' });

// The wet-state row names no test, as the comparison's other rows do; each product's own sheet prints the dry row of the
// comparison as an unnotched X-Y Charpy to ISO 179 and GB/T 1043, so the wet row is that test's (D133's reading of which
// test, written beside the value).
const WET = 'R-BAMBU-PRIORITY-20261003-0419c91c3241';
const DRY = { 'G051-01': 'V000961', 'G050-01': 'V000940', 'G048-01': 'V000914' };
counts.testReadings = 0;
for (const m of t.rows('measurements').filter((r) => r.SourceID === WET && r.Property === 'Impact strength' && r['Moisture state'] === 'conditioned')) {
  if (t.rows('impact_test_guesses').some((g) => g.MeasurementID === m.MeasurementID)) continue;
  const dry = t.get('measurements', DRY[m.GradeID]);
  if (dry.Property !== 'Charpy strength' || dry.SourceID === WET) throw new Error(`${MIGRATION}: ${dry.MeasurementID} is not the product's own Charpy row`);
  t.append('impact_test_guesses', { MeasurementID: m.MeasurementID, 'Likely test': 'Charpy',
    Basis: `Bambu Lab's data sheet for the product prints this comparison's dry X-Y row (${dry['Raw value'].replace(/;$/, '')}) as the unnotched X-Y Charpy to ISO 179 and GB/T 1043 (${dry.MeasurementID}); the wet-state row beside it is the same test after the bars took up water.`,
    'Reviewed by': `Claude Opus 5.5, 2026-10-07, on the cached sheets (${MIGRATION})` });
  counts.testReadings++;
}
if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...counts, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...counts }, null, 2));
