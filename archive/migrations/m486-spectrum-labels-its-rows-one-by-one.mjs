#!/usr/bin/env node
// Migration m486 (2026-10-20): a Spectrum row's label speaks for that row only (the owner's ruling of 2026-10-20, D172; the
// independent review of the owner's rulings track T1, F2).
//
// m463 typed two Spectrum values printed because other rows of their tables carry "(3D printing)": Spectrum PLA Matt's
// elastic modulus (V002778) and Spectrum PLA Carbon's (V003097, flagged physically implausible by m481). Spectrum labels its
// rows one by one, by the specimen each was measured on: its PET-G Matt sheet marks its modulus row "injection moulding"
// beside rows marked "(3D printing)". So a neighbour's label is no indication for an unlabelled row, and the two values go
// back to a bar their document does not describe, set apart (the classification's second pass, PER_ROW). The quotes are
// checked on the cached sheets first. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m486-spectrum-labels-its-rows-one-by-one.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm486';
const IMPLIED = 'Printed (implied by the document)';
const t = openTables();
let n = 0;
for (const [id, source, label] of [
  ['V002778', 'S-SPECTRUM-en-tds-spectrum-pla-matt', 'Tensile strength at break (3D printing)'],
  ['V003097', 'S-SPECTRUM-en-tds-spectrum-pla-carbon', 'Tensile strength at break (3D printing)'],
]) {
  const m = t.get('measurements', id);
  if (m.SourceID !== source) throw new Error(`${MIGRATION}: ${id} is not on ${source}`);
  if (m['Specimen type'] !== IMPLIED) continue;
  onCachedSheet(t, source, label, MIGRATION);
  const note = `Specimen type set back to Not published by ${MIGRATION} (2026-10-20, D172): Spectrum labels its rows one by one ("injection moulding" on its PET-G Matt sheet's modulus row beside rows marked "(3D printing)"), so the label of another row speaks for that row only, and this row states none.`;
  t.set('measurements', id, 'Specimen type', 'Not published (do not assume printed)', { expect: IMPLIED, migration: MIGRATION });
  t.set('measurements', id, 'Notes', withNote(m.Notes, note), { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) set back to a bar their document does not describe`);
