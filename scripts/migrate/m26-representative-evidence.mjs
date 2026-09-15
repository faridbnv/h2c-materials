#!/usr/bin/env node
// Migration m26: headlines from the most reliable evidence a material has (audit 2026-09-15, findings B-11 and B-18;
// owner ruling to prefer printed, dry, stated-condition headlines and to mark compounds that are not the neat polymer).
//
// - PC-GF: SIDDAMENT V2 PC-GF states no specimen, direction basis or conditioning, and its 9.5 % elongation exceeds the
//   unfilled PC headline (3.8 %), which a 30 % glass fill cannot do. BASF Ultrafuse PC GF30, filed under the same
//   material, publishes printed, dry XY values for every headline: density 1176 kg/m³, stiffness 2.665 GPa, strength
//   36.1 MPa, elongation 2.4 %, HDT 134 °C at a stated 0.45 MPa. It becomes the representative grade.
// - PA6: Spectrum "PA6 Neat" publishes 1.25 g/cm³ and 3.4 GPa; neat PA6 is 1.13-1.15 g/cm³ and 2.5-3 GPa dry, so the
//   product carries a filler its maker does not name. It is declared a variant, as Spectrum HDPE already is, so its
//   values stay its own and do not move the polyamide family.
import { fileURLToPath } from 'node:url';
import { openTables } from '../data/table-io.mjs';

export function migrate(t) {
  if (t.get('materials', 'M038')['Representative grade'] === 'G038-01') {
    t.set('materials', 'M038', 'Representative grade', 'G038-02', { expect: 'G038-01' });
    t.update('headlines', { MaterialID: 'M038', HeadlineKey: 'tensileStrengthXY', MeasurementID: 'V000740' }, 'MeasurementID', 'V001835', { expect: 'V000740' });
    t.update('headlines', { MaterialID: 'M038', HeadlineKey: 'elongationXY', MeasurementID: 'V000742' }, 'MeasurementID', 'V001837', { expect: 'V000742' });
    for (const [key, id] of [['density', 'V001829'], ['tensileModulusXY', 'V001839'], ['hdt045', 'V001831']]) {
      t.append('headlines', { MaterialID: 'M038', HeadlineKey: key, MeasurementID: id, Use: 'value' });
    }
  }
  // The material's name is the polymer; its only product is a compound. Say so where the identity is described.
  for (const [id, note] of [
    ['M049', 'Represented by Spectrum PA6 Neat, whose 1.25 g/cm³ and 3.4 GPa show an undisclosed dense filler: the values are that compound\'s, not neat PA6\'s (audit 2026-09-15).'],
    ['M085', 'Represented by Spectrum HDPE, whose 1.1 g/cm³ and 3.5 GPa show an undisclosed dense filler: the values are that compound\'s, not neat polyethylene\'s (audit 2026-09-15).'],
  ]) {
    const m = t.get('materials', id);
    if (m['Identity notes'] === 'Not applicable') t.set('materials', id, 'Identity notes', note, { expect: 'Not applicable' });
  }
  const g = t.get('grades', 'G049-01');
  if (g.Variant === 'Not applicable') {
    t.set('grades', 'G049-01', 'Variant', 'undisclosed dense filler', { expect: 'Not applicable' });
    t.set('grades', 'G049-01', 'Composition / filler', 'Not published by the manufacturer. Its 1.25 g/cm³ and 3.4 GPa exceed neat PA6 (1.13-1.15 g/cm³, 2.5-3 GPa dry), so the formulation contains a filler (audit 2026-09-15, B-11).', { expect: g['Composition / filler'] });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t = openTables();
  migrate(t);
  for (const c of t.save()) console.log(`${c.action} ${c.table} ${c.record}`);
}
