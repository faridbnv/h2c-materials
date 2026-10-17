#!/usr/bin/env node
// Migration m433 (2026-10-17): what three PEEK sheets and three LEHVOSS sheets print, as they print it (D142 round,
// step 5; the data findings the material pages' summaries left). Read by Claude Opus on the cached sheets, each quote
// checked here by onSheet; it follows AGENTS "Record what a page states once" (D116) and "Add a measurement".
//
// 1. PEEK's HDT at 1.8 MPa (3 products) sat above its HDT at 0.45 MPa (2). Two of the three 1.8 MPa values are
//    moulded bars recorded as unstated specimens:
//    - Ensinger TECAFIL PEEK EV natural (R-FILAMENT2PRINT-PEEK-EV-Nat, p. 1) marks its thermal and its other properties
//      "(*2)", and the sheet's footnote reads "(*2) Values measured on the raw material". The same template's PEKK and
//      PEEK CF30 sheets say so through page statements (PC00051, PC00052, PC00034, PC00035); this sheet had them for its
//      tensile and impact rows only. Two page statements, thermal and physical, give its HDT-A 162 °C, Tg, melting
//      point and moisture absorption the raw material's specimen, as on its siblings.
//    - 3D4Makers PEEK (R-3D4MAKERS-TDS-PEEK-Filament-1, p. 1) prints "Heat deflection Temperature As mouled, 1,8 MPa
//      ISO 75A-f 156 °C": the row itself says the bar was moulded. V007429 becomes a Raw material value.
//    PEEK's 1.8 MPa median then rests on iSANMATE PEEK alone (152 °C, specimen not stated), still above the two printed
//    bars at 0.45 MPa (140 and 147 °C): different products, not one bar at two loads (OPEN-PROBLEMS, the estimates).
// 2. PEEK-CF's printing said "No source mentions nozzle wear" beside LEHVOSS's "nozzle material: abbrasion resistant"
//    (p. 2). LEHVOSS prints that line on every LUVOCOM 3F sheet; six of its profiles hold it (P0669, P0707, P0953,
//    P0954, P1492, P1836: Abrasion / clogging as printed, Hardened nozzle TRUE) and two did not: LUVOCOM 3F PEEK CF 9676
//    (P0940) and LUVOCOM 3F PAHT CF 9891 (P0965). They now say it as their sheets and their siblings do. LUVOCOM 3F
//    PEEK 9581's profile (P0590) stays: it cites 3D4Makers' edition, whose page prints a nozzle temperature and no
//    nozzle material; the LEHVOSS original that does is indexed under the same source but is not the registered file.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m433-moulded-bars-and-abrasion-resistant-nozzles-as-their-sheets-say.mjs
import { openTables, nextId } from '../../scripts/data/table-io.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm433';
const DATE = '2026-10-17';
const t = openTables();
let n = 0;

// 1a. The Ensinger PEEK EV sheet's (*2) footnote, for its thermal and other properties.
const EV = 'R-FILAMENT2PRINT-PEEK-EV-Nat';
onSheet(t, EV, '(*2) Values measured on the raw material', MIGRATION);
onSheet(t, EV, 'Deflection temperature HDT-A 162 °C ISO-R 75 Method A', MIGRATION);
for (const [scope, where] of [['thermal', 'footnote (*2) on thermal properties'], ['physical', 'footnote (*2) on other properties']]) {
  if (t.rows('page_context').some((r) => r.SourceID === EV && r['Applies to'] === scope)) continue;
  t.append('page_context', {
    PageContextID: nextId('page_context', t.rows('page_context').map((r) => r.PageContextID)),
    SourceID: EV, Page: '1', 'Applies to': scope, Table: 'Not applicable', Statement: '(*2) Values measured on the raw material',
    'Specimen type': 'Raw material value', 'Moisture state': 'not-stated', 'Post-processing state': 'not-stated',
    'Anneal °C': 'Not applicable', 'Anneal h': 'Not applicable', Standard: 'Not published', 'Test temperature °C': 'Not published',
    Direction: 'Not published', Locator: where,
    'Reviewed by': `Read ${DATE} by Claude Opus against the cached sheet, as its PEKK and PEEK CF30 siblings' footnote rows (PC00051, PC00052); material pages round, step 5 (${MIGRATION})`,
  });
  n++;
}

// 1b. 3D4Makers PEEK's HDT row says its bar was moulded.
const D4 = 'R-3D4MAKERS-TDS-PEEK-Filament-1';
onSheet(t, D4, 'Heat deflection Temperature As mouled, 1,8 MPa ISO 75A-f 156 °C', MIGRATION);
{
  const row = t.get('measurements', 'V007429');
  if (row.SourceID !== D4 || row['Normalized value'] !== '156') throw new Error(`${MIGRATION}: V007429 is not 3D4Makers PEEK's 156 °C`);
  if (row['Specimen type'] !== 'Raw material value') {
    t.set('measurements', 'V007429', 'Specimen type', 'Raw material value', { expect: 'Not published (do not assume printed)', migration: MIGRATION });
    t.set('measurements', 'V007429', 'Notes', `${row.Notes} Specimen type Raw material value since ${MIGRATION} (${DATE}): the row prints "As mouled, 1,8 MPa", a moulded bar.`, { expect: row.Notes, migration: MIGRATION });
    n++;
  }
}

// 2. LEHVOSS's "nozzle material: abbrasion resistant", on three profiles that left it out.
for (const [id, source] of [['P0940', 'S-PET-TDS-LUVOCOM-3F-PEEK-CF-9676-BK'], ['P0965', 'S-PET-TDS-LUVOCOM-3F-PAHT-CF-9891-BK']]) {
  onSheet(t, source, 'nozzle material: abbrasion resistant', MIGRATION);
  const row = t.get('profiles', id);
  if (row.SourceID !== source) throw new Error(`${MIGRATION}: ${id} cites ${row.SourceID}, not ${source}`);
  if (row['Hardened nozzle'] === 'TRUE') continue;
  t.set('profiles', id, 'Abrasion / clogging', 'nozzle material: abbrasion resistant', { expect: 'Not published', migration: MIGRATION });
  t.set('profiles', id, 'Hardened nozzle', 'TRUE', { expect: 'Not published', migration: MIGRATION });
  t.set('profiles', id, 'Locator', `${row.Locator}; p. 2: General: nozzle material`, { expect: row.Locator, migration: MIGRATION });
  n++;
}

if (n) t.save();
console.log(`${MIGRATION}: ${n} record(s): page statements for a sheet's moulded bars, a moulded HDT row, abrasion-resistant nozzles`);
