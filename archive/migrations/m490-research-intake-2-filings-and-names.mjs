#!/usr/bin/env node
// Migration m490 (2026-10-20): two products filed where their makers' own documents say they belong, and a product's
// later name recorded (research intake 2, stage 4; docs/audits/2026-10-20-research-intake-2/). Read by Claude Opus 5.5 on
// the cached, hash-checked documents; each quote is checked there.
//
// - Extrudr DURAPRO PC FR V0 (G035-11) was filed under PC (M035), though its own sheet opens "DuraPro PC-FR V0 is a UL 94
//   classified, flame-retardant polycarbonate compound": it is a flame-retardant polycarbonate, PC FR (M036). The research
//   package's F-0001. With it, PC FR holds three products.
// - Essentium PA-CF (G165-05) was filed under the carbon-fibre nylons whose makers name no polyamide (M165). Essentium's
//   own safety data sheet (b50, R-ESSENTIUM-INTAKE-20261020-b4959fb55a87) names it in section 3: "Chemical
//   characterization Polyamide (PA 6/66)". It is PA6/66-CF (M156). The research package's F-0609.
// - Polymaker's PolyTerra PLA (G001-23) is sold since as Panchroma Matte PLA: Polymaker's own store page titles it
//   "Panchroma™ Matte PLA (Formerly PolyTerra™ PLA)" (b50, R-POLYMAKER-INTAKE-20261020-cb8de69c5dec). The grade keeps the
//   name its sheet prints, and its words record the later one, as Panchroma Satin PLA's do (m453). F-0678.
// moveGrade (D86) moves the grade and every record filed under it, with their IDs; the sources that name the grade under
// its old material name it under the new one. A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m490-research-intake-2-filings-and-names.mjs [--dry-run]
import { openTables } from '../../scripts/data/table-io.mjs';
import { moveGrade } from '../../scripts/data/records.mjs';
import { onSheet } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm490';
const t = openTables();
const out = { moved: 0, records: 0, words: 0, scopes: 0 };

const MOVES = [
  {
    grade: 'G035-11', from: 'M035', to: 'M036', sheet: 'R-EXTRUDR-durapro-pc-fr-v0-TDS-en',
    quote: 'DuraPro PC-FR V0 is a UL 94 classified, flame-retardant polycarbonate compound',
    composition: { expect: 'Not published', value: '"DuraPro PC-FR V0 is a UL 94 classified, flame-retardant polycarbonate compound engineered for demanding industrial applications requiring enhanced fire protection performance." (p. 1, as the sheet states it); filed under PC FR since 2026-10-20 (m490).' },
  },
  {
    grade: 'G165-05', from: 'M165', to: 'M156', sheet: 'R-ESSENTIUM-INTAKE-20261020-b4959fb55a87',
    quote: 'Chemical characterization | Polyamide (PA 6/66)',
    composition: { expect: 'a carbon fiber-infused polyamide filament specially formulated for additive manufacturing (p. 1, as the sheet states it)', value: 'a carbon fiber-infused polyamide filament specially formulated for additive manufacturing (p. 1, as the sheet states it); its safety data sheet names the polymer: "Chemical characterization Polyamide (PA 6/66)" (R-ESSENTIUM-INTAKE-20261020-b4959fb55a87, section 3), so it is filed under PA6/66-CF since 2026-10-20 (m490). The sheet states no fibre load.' },
  },
];
for (const m of MOVES) {
  onSheet(t, m.sheet, m.quote, MIGRATION);
  const g = t.get('grades', m.grade);
  if (g.MaterialID === m.from) {
    out.records += moveGrade(t, m.grade, m.to, { migration: MIGRATION });
    out.moved++;
  } else if (g.MaterialID !== m.to) throw new Error(`${MIGRATION}: ${m.grade} is under ${g.MaterialID}, neither ${m.from} nor ${m.to}`);
  if (t.get('grades', m.grade)['Composition / filler'] !== m.composition.value) {
    t.set('grades', m.grade, 'Composition / filler', m.composition.value, { expect: m.composition.expect, migration: MIGRATION });
    out.words++;
  }
  // A source that names the grade under its old material names it under the new one.
  for (const s of t.rows('sources')) {
    const listed = s['Applicable grades'] ?? '';
    const old = `${m.from} / ${m.grade}`;
    if (!listed.split(';').map((x) => x.trim()).includes(old)) continue;
    t.set('sources', s.SourceID, 'Applicable grades', listed.split(';').map((x) => (x.trim() === old ? `${x.startsWith(' ') ? ' ' : ''}${m.to} / ${m.grade}` : x)).join(';'), { expect: listed, migration: MIGRATION });
    out.scopes++;
  }
}

// PolyTerra PLA, sold since as Panchroma Matte PLA.
const MATTE = 'R-POLYMAKER-INTAKE-20261020-cb8de69c5dec';
onSheet(t, MATTE, 'Panchroma™ Matte PLA (Formerly PolyTerra™ PLA)', MIGRATION);
const NAME = 'Not published as a composition; sold since as Panchroma Matte PLA: Polymaker\'s own store page titles it "Panchroma™ Matte PLA (Formerly PolyTerra™ PLA)" (R-POLYMAKER-INTAKE-20261020-cb8de69c5dec), and the grade keeps the name its sheet prints.';
if (t.get('grades', 'G001-23')['Composition / filler'] !== NAME) {
  t.set('grades', 'G001-23', 'Composition / filler', NAME, { expect: 'Not published', migration: MIGRATION });
  out.words++;
}

if (process.argv.includes('--dry-run')) { console.log(JSON.stringify({ migration: MIGRATION, ...out, written: false }, null, 2)); process.exit(0); }
t.save();
console.log(JSON.stringify({ migration: MIGRATION, ...out }, null, 2));
