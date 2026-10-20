#!/usr/bin/env node
// Migration m481 (2026-10-20): Spectrum PLA Carbon's elastic modulus of 12.5 GPa, flagged physically implausible (AGENTS.md,
// "Flag a value physics rules out", the m24 pattern; the independent review of the owner's rulings track T1, F2).
//
// Spectrum's data sheet prints "Elastic modulus 12500 MPa ISO 527 (1)" (V003097, p. 1) between two rows it labels
// "(3D printing)", and m463 typed the modulus printed from those neighbours (D172). Its own row carries no such label, and
// Spectrum labels its rows one by one (on its PET-G Matt sheet the modulus row says "injection moulding"). The figure is
// 2.5 times the next PLA-CF's printed modulus (Ecomax CarbonX CF-PLA, 4.95 GPa, V003304), and beyond what 10 % short
// carbon fibre in PLA reaches even moulded (about 7 GPa); the sheet's own 65 MPa at 0.5 % (V003096, V003095) implies about
// 13 GPa, so the sheet is consistent with itself and probably wrong as a whole. The number is kept, flagged, with the
// reason in Notes; it backs no product value, estimate or bound, and PLA-CF's High-stiffness answer no longer rests on it.
// The sheet's word is checked on its cached text before anything is written. A re-run is a no-op; a run after the data
// moved stops.
//
//   node scripts/migrate/m481-a-pla-carbon-modulus-physics-rules-out.mjs
import { openTables } from '../../scripts/data/table-io.mjs';
import { withNote } from '../../scripts/lib/source-edits.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';

const MIGRATION = 'm481';
const FLAG = 'Published value (physically implausible)';
const t = openTables();
const m = t.get('measurements', 'V003097');
if (m.SourceID !== 'S-SPECTRUM-en-tds-spectrum-pla-carbon' || m.Property !== 'Tensile modulus') throw new Error(`${MIGRATION}: V003097 is not Spectrum PLA Carbon's modulus`);
let n = 0;
if (m['Data status'] !== FLAG) {
  onCachedSheet(t, m.SourceID, 'Elastic modulus 12500 MPa', MIGRATION);
  onCachedSheet(t, m.SourceID, 'Tensile strength at break (3D printing)', MIGRATION);
  const note = `Flagged physically implausible by ${MIGRATION} (2026-10-20, D55, D149): 12.5 GPa is 2.5 times the next PLA-CF's printed modulus (Ecomax CarbonX CF-PLA, 4.95 GPa, V003304) and beyond what 10 % short carbon fibre in PLA reaches even moulded (about 7 GPa). Its own row, unlike its neighbours, carries no "(3D printing)" label, and Spectrum labels its rows one by one. The sheet's 65 MPa at 0.5 % (V003096, V003095) implies about 13 GPa, so the sheet agrees with itself and is probably wrong as a whole; Spectrum's word would settle it.`;
  t.set('measurements', 'V003097', 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', 'V003097', 'Notes', withNote(m.Notes, note), { expect: m.Notes, migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} value(s) flagged`);
