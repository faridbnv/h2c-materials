#!/usr/bin/env node
// Migration m126 (2026-09-21): the first reading of the sweep (PLAN-REMAINING 2.3): two numbers read as one, and two
// values physics rules out.
//
// The sweep's list is v_measurement_z (a value's robust distance from its material's others measured the same way).
// Its first reading, and a search of the whole table for the defect it found:
//
//   - colorFabb's varioShore TPU sheet prints its 3D-printed table in two columns, 210 °C at 100 % flow and 230 °C at
//     70 % (foamed): "Impact Strength Charpy Notch, ISO 179 40 20 kJ/m". The reader joined the two into 4020 kJ/m²,
//     and an acceptance said the sheet publishes 4020. It prints 40 for the unfoamed column.
//   - Polymaker's PC-ABS sheet prints "Low temperature impact strength (X-Y) ISO 179-1, 1eA:2010, -30°C 13 2 kJ/m"
//     with its ± sign lost, beside "1.5 + 0.2" for the Z row: 13 ± 2 kJ/m², notched by its method (1eA), not 132.
//
// A search of every recorded value for a number its own line prints split in two found these two and seven that are
// a thousands space ("2 900 MPa") or a split digit the value reads correctly.
//
// Two values the sheets print and physics rules out are kept and flagged (D55): Eryone's Hyper-Speed PLA prints a
// glass transition of 160 °C, which is PLA's melting range, and 3D4Makers' PETG a flexural strength of 171 MPa,
// more than twice what a PETG reaches.
//
//   node scripts/migrate/m126-two-numbers-read-as-one.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const migration = 'm126-two-numbers-read-as-one';
const date = '2026-09-21';
const t = openTables();
let changed = 0;
changed += correct(t, { source: 'R-COLORFABB-TDS-varioShore-TPU-95A', ids: ['V005776'], migration, date,
  set: { 'Raw value': ['4020 kJ/m2', '40 kJ/m2'], 'Raw numeric': ['4020', '40'], 'Normalized value': ['4020', '40'] },
  note: 'the line prints "Impact Strength Charpy Notch, ISO 179 40 20 kJ/m" under the columns "210˚C; 100%" and "230°C; 70%": 40 kJ/m² unfoamed and 20 foamed, which the reader had joined into 4020. The row records the unfoamed column.' });
changed += correct(t, { source: 'S-POLYCN-TDS-Polymaker-PC-ABS-V5-5-2025-12-10-EN', ids: ['V003632'], migration, date,
  set: { 'Raw value': ['132 kJ/m2', '13 ± 2 kJ/m2'], 'Raw numeric': ['132', '13'], 'Normalized value': ['132', '13'], 'Raw uncertainty ±': ['Not applicable', '2'], 'Normalized uncertainty ±': ['Not applicable', '2'], Notch: ['Not published', 'Notched'] },
  note: 'the line prints "... ISO 179-1, 1eA:2010,-30°C 13 2 kJ/m" with its ± lost, as the Z row beside it prints "1.5 + 0.2": 13 ± 2 kJ/m², and 1eA is the notched method.' });
for (const [id, source, note] of [
  ['V004934', 'R-ERYONE-eryone-hs-pla-tds', 'Flagged physically implausible (D55): the sheet prints a glass transition of 160 °C (DSC, 10 °C/min) for a PLA, which is its melting range; PLA goes rubbery near 60 °C. Kept as printed; it backs nothing.'],
  ['V007147', 'R-3D4MAKERS-TDS-PETG-Filament', 'Flagged physically implausible (D55): the sheet prints a flexural strength of 171 MPa (ISO 178) for a PETG, more than twice what an unfilled PETG reaches in bending. Kept as printed; it backs nothing.'],
]) {
  const m = t.get('measurements', id);
  if (m['Data status'] === 'Published value (physically implausible)') continue;
  if (m.SourceID !== source) throw new Error(`${migration}: ${id} cites ${m.SourceID}`);
  t.set('measurements', id, 'Data status', 'Published value (physically implausible)', { expect: 'Published value' });
  t.set('measurements', id, 'Notes', `${m.Notes && !/^Not /.test(m.Notes) ? `${m.Notes} ` : ''}${note}`, { expect: m.Notes });
  changed++;
}
if (changed) t.save();
console.log(`${migration}: ${changed} row(s) corrected or flagged`);
