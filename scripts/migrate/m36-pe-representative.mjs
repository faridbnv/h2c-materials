#!/usr/bin/env node
// Migration m36 (2026-09-16): Braskem FL300PE (G085-02) becomes PE's representative grade (owner ruling).
//
// PE (M085) was represented by Spectrum HDPE (G085-01), a declared "undisclosed dense filler" variant whose 1.1 g/cm³
// and 3.5 GPa are a compound's, not polyethylene's (m26). Its sheet states no specimen and no direction, so the only
// headline PE could show was density; stiffness, strength, stretch and heat resistance were estimates. Braskem FL300PE
// (G085-02, added by m35) is an unfilled polyethylene whose product data sheet publishes printed part properties for
// specimens printed in the X-Y direction (R-BRASKEM-FL300PE-PDS, p. 1). It represents PE from this migration; Spectrum
// HDPE stays on record as the declared variant, and its values stay its own.
//
// Headlines (AGENTS.md "Make a measurement a headline"): every value headline of M085 cites a measurement of G085-02.
// - density: V001516 (Spectrum, 1100 kg/m³) is replaced by V002277 (0.954 g/cm³, ASTM D792). Nothing keeps citing the
//   Spectrum density: it is a compound's value and the drawer still lists it as the grade's own measurement.
// - tensileModulusXY, tensileStrengthXY, elongationXY had no value row (the Spectrum sheet states no direction):
//   V002280 (752 MPa XY), V002278 (18.5 MPa XY) and V002279 (208 % XY) become their first value rows, as m26 did for
//   PC-GF.
// - hdt045: V002283 (66 °C, printed part) is at the sheet's stated 0.455 MPa (ASTM D648, 66 psi), the same test as
//   ISO 75's 0.45 MPa. The headline check compared the load exactly and refused it at first; it now allows 0.01 MPa, as
//   the estimate stage always did for related evidence (commit "Read 0.455 MPa as the 0.45 MPa heat-deflection test"),
//   so the row is the value.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

const MIGRATION = 'm36';
const OLD_NOTE = 'Represented by Spectrum HDPE, whose 1.1 g/cm³ and 3.5 GPa show an undisclosed dense filler: the values are that compound\'s, not neat polyethylene\'s (audit 2026-09-15).';
const NEW_NOTE = 'Represented by Braskem FL300PE (G085-02) since 2026-09-16 (m36, owner ruling): an unfilled polyethylene whose sheet publishes printed part properties for specimens printed in the X-Y direction. Spectrum HDPE (G085-01) stays on record as a declared variant: its 1.1 g/cm³ and 3.5 GPa show an undisclosed dense filler, and its values are that compound\'s, not neat polyethylene\'s (audit 2026-09-15).';

// [headline key, the value row's old MeasurementID or null when there was none, the G085-02 measurement, its Use]
const HEADLINES = [
  ['density', 'V001516', 'V002277', 'value'],
  ['tensileModulusXY', null, 'V002280', 'value'],
  ['tensileStrengthXY', null, 'V002278', 'value'],
  ['elongationXY', null, 'V002279', 'value'],
  ['hdt045', null, 'V002283', 'value'],
];

export function migrate(t) {
  const mat = t.get('materials', 'M085');
  if (mat['Representative grade'] === 'G085-01') t.set('materials', 'M085', 'Representative grade', 'G085-02', { expect: 'G085-01' });
  else if (mat['Representative grade'] !== 'G085-02') throw new Error(`${MIGRATION}: M085 is represented by ${mat['Representative grade']}; the data moved since this migration was written`);
  if (mat['Identity notes'] === OLD_NOTE) t.set('materials', 'M085', 'Identity notes', NEW_NOTE, { expect: OLD_NOTE });

  for (const [key, from, to, use] of HEADLINES) {
    const m = t.get('measurements', to);
    if (m.MaterialID !== 'M085' || m.GradeID !== 'G085-02') throw new Error(`${MIGRATION}: ${to} is on ${m.MaterialID} ${m.GradeID}, not M085 G085-02`);
    const rows = t.rows('headlines').filter((h) => h.MaterialID === 'M085' && h.HeadlineKey === key);
    const mine = rows.find((h) => h.MeasurementID === to);
    if (mine?.Use === use) continue;
    // A row already selecting the measurement only changes its Use (V002283 was context while the check refused its load).
    if (mine) { t.update('headlines', { MaterialID: 'M085', HeadlineKey: key, MeasurementID: to }, 'Use', use, { expect: mine.Use }); continue; }
    const values = rows.filter((h) => h.Use === 'value');
    if (from) t.update('headlines', { MaterialID: 'M085', HeadlineKey: key, MeasurementID: from }, 'MeasurementID', to, { expect: from });
    else if (use === 'value' && values.length) throw new Error(`${MIGRATION}: M085 ${key} already selects ${values.map((h) => h.MeasurementID).join(', ')}; a headline shows one measurement`);
    else t.append('headlines', { MaterialID: 'M085', HeadlineKey: key, MeasurementID: to, Use: use });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
