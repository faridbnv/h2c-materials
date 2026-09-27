#!/usr/bin/env node
// Migration m161 (2026-09-25): Spectrum's three PLA Metal grades declare their metal load, as R095 said they would
// (re-center phase 5, part 4).
//
// R095 (2026-09-21) made a load the maker declares the grade Variant "declared dense filler", judged by the dense
// physics windows (D80), and said of these three: "Spectrum's PLA Metal grades (2,280 to 2,360 kg/m³) are the same
// products with six accepted window findings between them; they take the Variant in the sweep". They never did. Their
// six density findings stayed accepted with a reason m107 had already made untrue ("no row of [the window] describes a
// metal powder": W0108 does), and their densities stayed in PLA Metal's range beside Bambu's metallic-look PLA Metal at
// 1.25 g/cm³, which is the EST-OUTLIER that was raised with the owner as question Q008.
//
// Each sheet was re-read from the text cache, which is keyed by the SHA-256 sources.csv records for it, and says it on
// page 1 in the same words: "Spectrum PLA Metal Copper, enriched with copper powder", "High copper powder content",
// "Approximately two to three times heavier than" standard PLA, and a specific gravity of 2.36 (brass 2.33, bronze
// 2.28). So each grade declares the load, and its Composition / filler quotes the sheet as R095's other grades do.
// No value changes. What changes is how the values are read: as a variant's, counted apart from PLA Metal's range and
// kept from pulling its family (D57), and judged by the dense windows.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m161-spectrum-pla-metal-declares-its-load.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm161-spectrum-pla-metal-declares-its-load';
const t = openTables();

const GRADES = [
  ['G011-02', 'S-SPECTRUM-en-tds-spectrum-pla-metal-copper', 'copper', '2360'],
  ['G011-03', 'S-SPECTRUM-EN-TDS-Spectrum-PLA-Metal-Brass', 'brass', '2330'],
  ['G011-04', 'S-SPECTRUM-en-tds-spectrum-pla-metal-bronze', 'bronze', '2280'],
];

let changed = 0;
for (const [id, source, metal, density] of GRADES) {
  const g = t.get('grades', id);
  if (g.SourceID !== source || g.MaterialID !== 'M011' || g.Status !== 'active') throw new Error(`${migration}: ${id} is not the active Spectrum PLA Metal ${metal} grade of M011; the data moved`);
  const own = t.rows('measurements').filter((m) => m.GradeID === id && m.Property === 'Density' && /^Published value/.test(m['Data status']));
  if (!own.length || !own.every((m) => m['Normalized value'] === density)) throw new Error(`${migration}: ${id} no longer publishes a density of ${density} kg/m³`);
  const before = `Physical Spectrum PLA Metal ${metal[0].toUpperCase()}${metal.slice(1)}, enriched with ${metal} (p. 1, as the sheet states it)`;
  const composition = `The sheet declares the load: "Spectrum PLA Metal ${metal[0].toUpperCase()}${metal.slice(1)}, enriched with ${metal} powder", "High ${metal} powder content" and "Approximately two to three times heavier than" standard PLA (p. 1). Its density of ${density} kg/m³ is above what neat PLA reaches (1330); recorded as a Variant under D57 (R095, ${migration}).`;
  if (g.Variant !== 'declared dense filler') { t.set('grades', id, 'Variant', 'declared dense filler', { expect: 'Not applicable' }); changed++; }
  if (g['Composition / filler'] !== composition) { t.set('grades', id, 'Composition / filler', composition, { expect: before }); changed++; }
}
if (changed) t.save();
console.log(`${migration}: ${changed ? `${changed} field(s) on ${GRADES.length} grades` : 'already applied'}`);
