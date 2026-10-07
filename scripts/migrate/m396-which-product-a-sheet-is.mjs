#!/usr/bin/env node
// Migration m396 (2026-10-07): which product two records belong to (quality round 2026-10-07, item 6; D134).
//
// - SUNLU's "Product Information" sheet (R-SUNLU-SUNLU-PLA-Vivid-Yellow, an ASTM table hosted by 3DJake) names one
//   product, "PLA+", in its title and its page-2 header (read on the page image, quality round reader r17). Its 14 values,
//   three profiles and one statement were filed on plain SUNLU PLA (G001-37), whose own ISO sheet prints another table
//   (notched Izod 5 ± 3 against this sheet's 19.8). m372 filed SUNLU's ISO "PLA+" sheet on PLA+2.0 because PLA+2.0's own
//   sheet prints that same table; this ASTM table is not PLA+2.0's (its own sheet prints 10 ± 3), so it is a product of its
//   own: SUNLU PLA+, a new grade, which the records move to with their IDs.
// - Raise3D Hyper Core PPA CF25 (G070-08) carried Raise3D Industrial PET CF's data sheet as its Shared formulation key,
//   so it named itself a twin of a product of another material whose sheet it does not print. Its key is now its own
//   sheet. No twin read either value, so nothing a build reads moves for it.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m396-which-product-a-sheet-is.mjs
import { openTables } from '../data/table-io.mjs';
import { onCachedSheet } from './read-proposals-apply.mjs';

const MIGRATION = 'm396';
const DATE = '2026-10-07';
const t = openTables();
let cells = 0;

// ---- SUNLU PLA+
const SHEET = 'R-SUNLU-SUNLU-PLA-Vivid-Yellow';
onCachedSheet(t, SHEET, 'Product Information', MIGRATION);
let plus = t.rows('grades').find((g) => g.Manufacturer === 'SUNLU' && g['Product name'] === 'PLA+' && g.MaterialID === 'M001');
if (!plus) {
  const from = t.get('grades', 'G001-37');
  const id = t.nextId('grades', { materialId: 'M001' });
  t.append('grades', { ...from, GradeID: id, 'Product name': 'PLA+', 'Shared formulation key': SHEET, SourceID: SHEET,
    'Certification claims': 'Not published', 'Selected-grade rationale': `SUNLU's "Product Information" sheet names the product "PLA+" (${MIGRATION})` });
  plus = t.get('grades', id);
  cells++;
}
const move = (table, idCol) => {
  for (const r of t.rows(table).filter((x) => x.SourceID === SHEET)) {
    if (r.GradeID === plus.GradeID) continue;
    if (r.GradeID !== 'G001-37') throw new Error(`${MIGRATION}: ${table} ${r[idCol]} is on ${r.GradeID}; the data moved`);
    t.set(table, r[idCol], 'GradeID', plus.GradeID, { expect: 'G001-37', migration: MIGRATION });
    if (table === 'measurements') t.set(table, r[idCol], 'Notes', `${r.Notes} Moved ${DATE} from G001-37 (SUNLU PLA) to ${plus.GradeID} (SUNLU PLA+): the sheet names only "PLA+" (${MIGRATION}).`.trim(), { expect: r.Notes, migration: MIGRATION });
    cells++;
  }
};
move('measurements', 'MeasurementID');
move('profiles', 'ProfileID');
move('evidence', 'EvidenceID');
const src = t.get('sources', SHEET);
if (src['Applicable grades'] !== plus.GradeID) { t.set('sources', SHEET, 'Applicable grades', plus.GradeID, { expect: src['Applicable grades'], migration: MIGRATION }); cells++; }

// ---- Raise3D Hyper Core PPA CF25's key
const ppa = t.get('grades', 'G070-08');
if (ppa['Shared formulation key'] !== ppa.SourceID) {
  t.set('grades', 'G070-08', 'Shared formulation key', ppa.SourceID, { expect: 'D-RAISE3D-Raise3D-Industrial-PET-CF-TDS-V4-0', migration: MIGRATION });
  cells++;
}
if (cells) t.save();
console.log(`${MIGRATION}: ${cells} change(s); SUNLU PLA+ is ${plus.GradeID}`);
