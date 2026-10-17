#!/usr/bin/env node
// Migration m419 (2026-10-16): Flashforge PA6-GF20's two bending moduli are flagged as physics rules them out, as its two
// bending strengths already are (D55, D140).
//
// The flexural heading (D140) drew Flashforge PA6-GF20's flexural modulus at 0.2 GPa among PA6-GF products at 3 to 6 GPa.
// Its sheet (D-FLASH-PA6-GF-TDS-EN, p. 1, SHA-256 in sources.csv) prints "Bending Modulus (X-Y) 200~203.5" and "(X-Z)
// 57.5~59.7" in MPa beside "Bending Strength (X-Y) 5545~5879" and "(X-Z) 1582~1653": the two pairs are swapped. The
// strengths were flagged long ago (V005397, V005398); the moduli, which no glass-filled nylon has (a 200 MPa modulus is a
// soft elastomer's), were left to decide. Each stays as printed, with the reason, and backs no product value, estimate,
// bound or dot.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m419-flashforge-pa6-gf-bending-modulus.mjs
import { openTables } from '../../scripts/data/table-io.mjs';

const MIGRATION = 'm419';
const FLAG = 'Published value (physically implausible)';
const WHY = ' The sheet prints this under "Bending Modulus" in MPa beside a "Bending Strength" of thousands of MPa, and no glass-filled nylon bends with a modulus this low: the sheet\'s modulus and strength rows are swapped (V005397, V005398 are flagged for the same reason). Recorded as printed (m419, D140).';
const t = openTables();
let changed = 0;
for (const id of ['V005395', 'V005396']) {
  const row = t.get('measurements', id);
  if (row['Data status'] === FLAG) { if (!row.Notes.includes('(m419, D140)')) throw new Error(`${MIGRATION}: ${id} is flagged, but not by this migration; the data moved`); continue; }
  t.set('measurements', id, 'Data status', FLAG, { expect: 'Published value', migration: MIGRATION });
  t.set('measurements', id, 'Notes', `${row.Notes}${WHY}`, { expect: row.Notes, migration: MIGRATION });
  changed++;
}
if (changed) t.save();
console.log(`${MIGRATION}: ${changed} measurement(s) flagged physically implausible: Flashforge PA6-GF20's swapped bending moduli`);
