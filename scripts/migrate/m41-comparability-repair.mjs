#!/usr/bin/env node
// Migration m41: the comparability repair of docs/audits/2026-09-17-data-gaps (batch B3).
//
// continuing-locally.md sets out 26 rows on 12 sources whose specimen form is the one thing standing between them
// and being an implied lower bound (D55, compile.js), plus two findings the 2026-09-15 workstream recorded and
// never applied. `npm run audit:sources` rebuilt .cache/sources on 2026-09-17 (146 of 147 documents), so all
// twelve could be re-read page by page rather than taken from that workstream's reading (D35).
//
// THE RE-READ RESULT: none of the twelve publishes a specimen preparation.
//
// Ten were cached and read here in full; two (S-PET-TDS and R-FORMFUTURA-STYX-PA6-TDS) are served from a
// FormFutura download URL that is not a .pdf, and were fetched by hand for this migration. Not one of the twelve
// names how its bars were made: no specimen table, no print-orientation heading, no "injection moulded", no
// XY/Z labels beside the values. What several do print is a Basic Printing Recommendations or Print Settings
// block, which is a printing guide and not a specimen condition (D63, and the m33 ruling on the four iSANMATE
// sheets). Two of them - 3DXTECH's 3DXSTAT ESD PA12 and THERMAX PES - come from a publisher whose CarbonX sheets
// DO carry a "Printed Specimen Conditions" block, which makes its absence here informative rather than an
// oversight of the reading.
//
// So no specimen is recoded. The 26 rows stay "Not published (do not assume printed)", which is what the sources
// support, and the twelve SourceIDs are added to the RULED map in
// docs/audits/2026-09-17-data-gaps/ledgers/comparability-targets.mjs so the ledger stops listing as open what has
// now been decided. Turning these into implied bounds needs the publishers to state a specimen, not another read.
//
// WHAT THIS MIGRATION DOES CHANGE: the first of the two carried-over findings.
//
// V002155, V002156 and V002159 are the equilibrium water absorption of three Polymaker PolyMide sheets, and each
// carries the annealing sentence of its sheet as its Post-processing. Re-read here, all three sheets print the
// water-absorption value on p. 2, in the physical and chemical property table, which states no specimen treatment
// at all; the annealing sentence is on p. 4, under the mechanical table, and applies to the mechanical specimens.
// So the anneal was attached to a row the sheet never attached it to. Post-processing becomes Not published and
// the typed schedule Not applicable, which is what p. 2 supports.
//
// THE SECOND CARRIED-OVER FINDING IS ALREADY APPLIED, and a new one takes its place.
//
// continuing-locally.md asks for the Kimya PEBA-S source record to move to its 2026/09 URL with digest
// 66c7b5b1...9ce3 and Access status Retrieved. sources.csv already holds exactly that, from an earlier commit on
// this branch, so there is nothing to do. But the 2026-09-17 refetch found that URL now serving a DIFFERENT file
// (SHA-256 f55f2167...), so samaro.fr has republished it since 2026-09-15. Re-pointing the record would mean
// re-reading every value it backs, and D-07 has already ruled that its rows stay unstated, so this migration does
// not touch it. It is left for the owner, and noted in RESPONSE.md.

import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const MIGRATION = 'm41';
const DATE = '2026-09-17';
const NA = 'Not applicable';
const NP = 'Not published';

// The three Polymaker PolyMide water-absorption rows, with the anneal each wrongly carried.
const WATER_ABSORPTION = [
  { source: 'S-POLYCN-PolyMide-CoPA-TDS-V5-2', id: 'V002155',
    from: 'All specimens were annealed at 80˚C for 30min and dried for 48h prior to testing', tempC: '80', hours: '0.5' },
  { source: 'S-POLYCN-PolyMide-PA6-GF-TDS-V5-1', id: 'V002156',
    from: 'All specimens were annealed at 80˚C for 6h and dried for 48h prior to testing', tempC: '80', hours: '6' },
  { source: 'S-POLYCN-PolyMide-PA12-CF-TDS-V5-1-1', id: 'V002159',
    from: 'All specimens were annealed at 80˚C for 24h and dried for 48h prior to testing', tempC: '80', hours: '24' },
];

const NOTE = 'the sheet prints this value on p. 2, in the physical and chemical property table, which states no specimen treatment; the annealing sentence is on p. 4 under the mechanical table and applies to the mechanical specimens, not to this row.';

// The twelve sources re-read for this batch, with the ruling each received. They go into the RULED map of
// docs/audits/2026-09-17-data-gaps/ledgers/comparability-targets.mjs in this same commit.
export const RULED = [
  'S-PET-TDS', 'S-SPECTRUM-en-tds-spectrum-pctg-cf10', 'S-CPECF', 'S-SPECTRUM-en-tds-spectrum-petg-esd',
  'R-FORMFUTURA-STYX-PA6-TDS', 'X-3DXSTAT-ESD-PA12-TDS-v1', 'S-BVOH', 'S-PES-THERMAX-PES-TDS-v1-0',
  'I-PC-CF-TDS', 'R-FILLAMENTUM-FLEXFILL-PEBA-90A-TDS', 'S-SPECTRUM-en-tds-spectrum-pa12-cf15', 'R-YOUSU-POM-TDS',
];

export async function migrate(t) {
  let changed = 0;
  for (const w of WATER_ABSORPTION) {
    changed += correct(t, {
      source: w.source, ids: [w.id], migration: MIGRATION, date: DATE, note: NOTE,
      set: {
        'Post-processing': [w.from, NP],
        'Anneal °C': [w.tempC, NA],
        'Anneal h': [w.hours, NA],
      },
    });
  }
  return changed;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  const n = await migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
  console.log(`${MIGRATION}: ${n} measurement(s) corrected; ${RULED.length} source(s) ruled on in the comparability ledger.`);
}
