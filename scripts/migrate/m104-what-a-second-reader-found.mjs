#!/usr/bin/env node
// Migration m104 (2026-09-21): what a second reader found, in the three shapes where the row is wrong.
//
// Two readers who did not decide these rows read them again — R085's second read of a seeded sample of b03 to
// b26, and the visual review of the optical pool — and between them found three classes where the record says
// something the document does not. Each was counted across the whole table before anything was changed, and
// each is fixed in the reader as well, so the class cannot re-enter:
//
//   1. **Seven resistivities that are a piece of a power of ten.** A sheet prints "10^7 – 10^9 Ω/sq" and the row
//      holds **7 Ω** with an upper bound of a billion; another prints ">10¹² Ω" and the row holds **10 Ω**. Seven
//      ohms is a conductor and these are ESD filaments, whose whole point is that they are not; three more hold
//      ten where their sheet prints a bound of 10\u00b2 or 10\u2076. The reader read a
//      window's low end out of the tail of "10^7" and a candidate out of the "10" of a superscript power; it now
//      takes a power of ten whole wherever it stands (test: "a power of ten is one number wherever it stands").
//
//   2. **Thirty heat deflections tested at 0.45 °C.** 3DXTECH splits the label across two lines — "Deflection
//      Temperature at 0.45" above "ISO 75 °C 185" — and the °C of the unit column stood beside the load, so the
//      load became the temperature as well. The typed Test load MPa column already held 0.45; what was wrong was
//      the row also claiming a laboratory at 0.45 °C. The reader now refuses a temperature that is the row's own
//      load (test: "a load a heat deflection was tested under is not also the temperature it was tested at").
//
//   3. **Sixty-one density rows whose method begins with a stray 3.** A table that prints its unit before its
//      value leaves "g/cm3" in the row's words, and the 3 was the first digit outside a standard's span, so the
//      condition read as "3" and the method as "3 ISO 1183". The typed Standards column was right all along. The
//      reader now masks the unit with the standards before looking for the condition.
//
// Every figure here is the document's own, re-read from the cached source (D35). Nothing is invented: where the
// sheet prints a power of ten, the row now holds that power.
//
//   node scripts/migrate/m104-what-a-second-reader-found.mjs

import { openTables } from '../data/table-io.mjs';
import { correct } from './source-edits.mjs';

const DATE = '2026-09-21';
const MIGRATION = 'm104';
const NP = 'Not published';

// 1. A power of ten is one number. The sheet's own text, and the number it means.
const RESISTIVITY = [
  { source: 'R-3DJAKE-3DJAKE-c9047f-87fad94441284d8b9a04976ae0a5e874', ids: ['V008835'],
    note: 'the sheet prints "Surface resistivity 10^7 - 10^9 Ω": a range between two powers of ten, not a range from 7.' },
  { source: 'R-MATTERHACKERS-PRO-SERIES-ri8LR8', ids: ['V008986'],
    note: 'the sheet prints "Surface Resistance: 10^7 – 10^9 Ω/sq ASTM D257": a range between two powers of ten, not a range from 7.' },
  { source: 'R-MATTERHACKERS-PRO-SERIES-VP1dBX', ids: ['V009019'],
    note: 'the sheet prints "Surface Resistance: 10^7 – 10^9 Ω/sq ASTM D257": a range between two powers of ten, not a range from 7.' },
];

const t = openTables();
let changed = 0;

for (const r of RESISTIVITY) {
  changed += correct(t, {
    source: r.source, ids: r.ids, migration: MIGRATION, date: DATE, note: r.note,
    set: {
      'Raw value': ['7-10^9 Ω', '10^7-10^9 Ω'],
      'Raw numeric': ['7', '10000000'],
      'Normalized value': ['7', '10000000'],
    },
  });
}

// The same shape written with a superscript: ">10¹² Ω" read as ten ohms.
changed += correct(t, {
  source: 'R-3D4MAKERS-TDS-LUVOCOM-3F-PEI-50236-GY-Filament-3D-printing', ids: ['V006920'], migration: MIGRATION, date: DATE,
  note: 'the sheet prints "Surface resistance ROB DIN IEC 60093 Ronde 60x4mm Ω >10¹²": a superscript exponent, and the row held the ten alone.',
  set: {
    'Raw value': ['10 Ω', '10¹² Ω'],
    'Raw numeric': ['10', '1000000000000'],
    'Normalized value': ['10', '1000000000000'],
  },
});

// Three more of the same class, found by re-deriving it: a bound written with a superscript exponent, where
// only the ten survived. Each sheet's own words are quoted in the note.
const BOUNDED = [
  { source: 'S-PCGF-PA12-CF-TDS-EN-1', ids: ['V006966'], value: '100', printed: '10\u00b2',
    note: 'the sheet prints "Surface Resistance IEC 60093 \u03a9 \u226410\u00b2": a hundred ohms, and the row held the ten of the power alone.' },
  { source: 'R-3D4MAKERS-TDS-pps-cf-9938-bk-filament-en-iso', ids: ['V007165'], value: '1000000', printed: '10\u2076',
    note: 'the sheet prints "Surface resistance ROB DIN IEC 60093 Ronde 60x4mm \u03a9 <10\u2076": a million ohms, and the row held the ten of the power alone.' },
  { source: 'R-3D4MAKERS-LUVOCOM-3F-PAHT-CF-9742-BK-EN-TDS', ids: ['V007444'], value: '100', printed: '10\u00b2',
    note: 'the sheet prints "Surface resistance \u03a9 <10\u00b2": a hundred ohms, and the row held the ten of the power alone.' },
];

for (const b of BOUNDED) {
  changed += correct(t, {
    source: b.source, ids: b.ids, migration: MIGRATION, date: DATE, note: b.note,
    set: {
      'Raw value': ['10 \u03a9', `${b.printed} \u03a9`],
      'Raw numeric': ['10', b.value],
      'Normalized value': ['10', b.value],
    },
  });
}

// 2. A load is not a temperature.
const HEAT_DEFLECTION = [
  { source: "X-ECOMAX-ESD-TPC-92A-v3", ids: ["V003140"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXSTAT-ESD-PEKK-TDS", ids: ["V003148"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXSTAT-ESD-PC-v3-TDS", ids: ["V003156"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXSTAT-ESD-PLA-TDS-v3", ids: ["V003164"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-FIBREX-GF30-ULTEM-PEI-v1", ids: ["V003172"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-PETG-TDS-v3", ids: ["V003180"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-ezPC-TDS-v01", ids: ["V003188"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXMAX-ABS-TDS-v3", ids: ["V003196"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-Ultem-TDS-v3", ids: ["V003204"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-ECOMAX-Tough-PLA-TDS-v1", ids: ["V003212"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CF-HTN-v1", ids: ["V003220"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-THERMAX-PEI-9085-TDS-v4", ids: ["V003228"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-HTN-TDS-v2", ids: ["V003236"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXMAX-PCASA-TDS-v3", ids: ["V003245"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXSTAT-ESD-PVDF-v3-TDS", ids: ["V003253"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-Thermax-TPI-TDS-TDS-v1", ids: ["V003261"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXMAX-PC-TDS-v3", ids: ["V003269"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF15-PEKK-A-TDS-v1", ids: ["V003278"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-FIBREX-GF-ABS-TDS-v1", ids: ["V003286"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXMAX-ASA-TDS-v3", ids: ["V003294"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-PLA-TDS-v3", ids: ["V003309"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXSTAT-ESD-PPS-v3-TDS", ids: ["V003317"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-PEEK-TDS-v3", ids: ["V003325"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3XDSTAT-ESD-Ultem-v3-TDS", ids: ["V003336"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-3DXMAX-PETG-TDS", ids: ["V003344"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-FIBREX-GF20-PEEK-v2", ids: ["V003360"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-ezPC-TDSv1", ids: ["V003368"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-CarbonX-CF-PC-ABS-TDS-v1-1", ids: ["V003384"], set: { "Test temperature": ["0.45°C", NP] } },
  { source: "X-ECOMAX-THERMAX-PPE-PS-TDS-v1", ids: ["V004089"], set: { "Test temperature": ["1.8°C", NP] } },
  { source: "X-ECOMAX-CarbonX-PA6-G3-TDS-v3-0", ids: ["V006453"], set: { "Test temperature": ["0.45°C", NP] } },];

for (const g of HEAT_DEFLECTION) {
  changed += correct(t, {
    source: g.source, ids: g.ids, migration: MIGRATION, date: DATE, set: g.set,
    note: 'the number the row recorded as its test temperature is the load it was tested under, which its own Test load MPa column already holds; the sheet states no test temperature.',
  });
}

// 3. A unit's exponent is not a condition.
const DENSITY_METHOD = [
  { source: "R-EXTRUDR-pctg-TDS-en", ids: ["V004110"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-EXTRUDR-pla-hs-TDS-en", ids: ["V004291"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PA6-CF-TDS-EN", ids: ["V005163"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-ABS-ESD-TDS-EN", ids: ["V005183"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-ASA-CF-TDS-EN", ids: ["V005193"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PC-ABS-TDS-EN", ids: ["V005223"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PETG-CF-TDS-EN", ids: ["V005284"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PET-CF-TDS-EN", ids: ["V005309"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PLA-Pro-TDS-EN", ids: ["V005352"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PC-TDS-EN", ids: ["V005380"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PETG-TDS-EN", ids: ["V005400"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-ASA-TDS-EN", ids: ["V005410"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PETG-ESD-TDS-EN", ids: ["V005450"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "D-FLASH-PLA-CF-TDS-EN", ids: ["V005460"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-FIBERLOGY-FiberWORKS-PETG-TDS", ids: ["V005475"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-FIBERLOGY-FiberWORKS-PLA-TDS", ids: ["V005489"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-CPEANTIBAC-TDS", ids: ["V005503"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-VELVET-PLA-TDS-1-3", ids: ["V005514"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-ABSGF-TDS", ids: ["V005523"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-IMPACT-PLA-TDS", ids: ["V005533"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-FIBERFLEX-AERO-TDS-1", ids: ["V005542"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "R-COLORFABB-colorFabb-VarioShore-TPU-TDS", ids: ["V005818"], set: { "Standard / load": ["3 ASTM D-792", "ASTM D-792"] } },
  { source: "R-COLORFABB-colorFabb-ASA-TDS", ids: ["V005823"], set: { "Standard / load": ["3 D 792", "D 792"] } },
  { source: "R-COLORFABB-colorFabb-nGen-Filament-TDS", ids: ["V005917"], set: { "Standard / load": ["3 D 792", "D 792"] } },
  { source: "R-COLORFABB-colorFabb-nGen-Flex-Filament-TDS", ids: ["V006002"], set: { "Standard / load": ["3 D 792", "D 792"] } },
  { source: "R-EXTRUDR-pctg-TDS-de", ids: ["V006274"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "D-FLASH-PLA-TDS-EN", ids: ["V006279"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-BRASKEM-Braskem-3D-Printing-Data-Sheet-FL900PP-CF", ids: ["V006381"], set: { "Standard / load": ["3 D 792", "D 792"] } },
  { source: "R-EXTRUDR-pla-high-speed-TDS-en", ids: ["V006418"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-COLORFABB-TDS-E-ColorFabb-varioShore-TPU", ids: ["V006499"], set: { "Standard / load": ["3 ASTM D-792", "ASTM D-792"] } },
  { source: "R-COLORFABB-TDS-E-colorFabb-PLA-Chameleon", ids: ["V006530"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-YOUSU-YOUSUPLATDS-081b", ids: ["V006569"], set: { "Standard / load": ["3 ASTM D792", "ASTM D792"] } },
  { source: "S-PCGF-PA12-CF-TDS-EN-1", ids: ["V006956"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-YOUSU-YOUSUWOODTDS-eb4e", ids: ["V006967"], set: { "Standard / load": ["3 23℃ ASTM D792", "23℃ ASTM D792"] } },
  { source: "R-YOUSU-YOUSU3DPPTDS-4872", ids: ["V007023"], set: { "Standard / load": ["3 GB/T 1033.1-2008", "GB/T 1033.1-2008"] } },
  { source: "R-YOUSU-YOUSUABSTDS-cc2f", ids: ["V007080"], set: { "Standard / load": ["3 GB/T 1033.1-2008", "GB/T 1033.1-2008"] } },
  { source: "R-YOUSU-YOUSUSILKPLATDS-81c3", ids: ["V007259"], set: { "Standard / load": ["3 23℃ D792", "23℃ D792"] } },
  { source: "R-YOUSU-YOUSUPVATDS-6752", ids: ["V007381"], set: { "Standard / load": ["3 GB/T 1033.1-2008", "GB/T 1033.1-2008"] } },
  { source: "S-PCGF-PA-TDS-Siddament", ids: ["V007861"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-ABS-Carbon-Fiber-TDS-Siddament", ids: ["V007869"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-TDS-Siddament", ids: ["V007877"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PETG-Carbon-Fiber-TDS-Siddament", ids: ["V007885"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-TPU-95A-TDS-Siddament", ids: ["V007893"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PC-Carbon-Fiber-TDS-Siddament", ids: ["V007900"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Carbon-Fiber-TDS-Siddament", ids: ["V007917"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Silk-TDS-Siddament", ids: ["V007925"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PETG-TDS-Siddament", ids: ["V007933"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Matte-TDS-Siddament", ids: ["V007948"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Glow-in-the-Dark-TDS-Siddament", ids: ["V007956"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PETG-Matte-TDS-Siddament", ids: ["V007964"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-ASA-Carbon-Fiber-TDS-Siddament", ids: ["V007979"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-ABS-TDS-Siddament", ids: ["V007987"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PC-TDS-Siddament", ids: ["V007995"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Marble-TDS-Siddament", ids: ["V008003"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-ASA-TDS-Siddament", ids: ["V008011"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "S-PCGF-PLA-Wood-TDS-Siddament", ids: ["V008019"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-ABS-ESD-TDS", ids: ["V008452"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-FIBERLOGY-FIBERLOGY-PP-TDS", ids: ["V009223"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-COLORFABB-colorFabb-BronzeFill-TDS", ids: ["V009231"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-COLORFABB-colorFabb-SteelFill-TDS", ids: ["V009275"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },
  { source: "R-COLORFABB-colorFabb-PLA-PHA-Printing-Filament-TDS", ids: ["V009445"], set: { "Standard / load": ["3 ISO 1183", "ISO 1183"] } },];

for (const g of DENSITY_METHOD) {
  changed += correct(t, {
    source: g.source, ids: g.ids, migration: MIGRATION, date: DATE, set: g.set,
    note: "the method began with the 3 of the row's own g/cm3, which the table prints before its value; the standard itself was read correctly and the typed Standards column was always right.",
  });
}

if (changed) t.save();
console.log(`${changed} measurement(s) corrected`);
