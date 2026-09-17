#!/usr/bin/env node
// The candidate sources the 2026-09-15 workstream fetched, read and never imported
// (docs/audits/2026-09-15-filtering-estimates-data/sources/open-items.md, section 3 "Candidate public sources"),
// with what each one would be worth today.
//
// Nothing here is data. The quoted values and SHA-256 prefixes are that audit's reading of a file this repository
// does not hold; under D35 no value enters the tables from them. They are the shopping list, and the expected
// reading to check a re-read against.
//
//   node docs/audits/2026-09-17-data-gaps/ledgers/import-backlog.mjs
//
// The live columns (material name, next free GradeID, whether the material is already a back-test case) are read
// from the tables, so the ledger stays true as the data moves.

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText } from '../../../../build/src/csv.js';
import { openTables, nextId } from '../../../../scripts/data/table-io.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// From open-items.md section 3. `sha` is the prefix that audit recorded, so a re-fetched file can be confirmed to be
// the same document. `expected` is its reading of the sheet — never a value to enter, only a reading to check.
const CANDIDATES = [
  { MaterialID: 'M027', SourceID: 'S-POLYCN-PolyLite-ABS-TDS-V5-3', Publisher: 'Polymaker',
    Product: 'PolyLite ABS', Title: 'PolyLite ABS Technical Data Sheet', Revision: 'V5.3', sha: '3471ec2c',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ABS_TDS_V5.3.pdf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'yes',
    expected: 'p3 HDT ISO 75 1.8 MPa 98.2 C, 0.45 MPa 99.6 C, Tg DSC 101.1 C; p4 Bending strength (X-Y) 56.2 +/- 0.3 MPa' },
  { MaterialID: 'M031', SourceID: 'S-POLYCN-PolyLite-ASA-TDS-V5-3', Publisher: 'Polymaker',
    Product: 'PolyLite ASA', Title: 'PolyLite ASA Technical Data Sheet', Revision: 'V5.3', sha: 'f51a4df9',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_ASA_TDS_V5.3.pdf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'yes',
    expected: 'p3 HDT 1.8 MPa 100.2 C, 0.45 MPa 102.6 C, Tg 97.8 C; p4 Bending strength (X-Y) 60.9 +/- 0.9 MPa' },
  { MaterialID: 'M035', SourceID: 'S-POLYCN-PolyLite-PC-TDS-V5-3', Publisher: 'Polymaker',
    Product: 'PolyLite PC', Title: 'PolyLite PC Technical Data Sheet', Revision: 'V5.3', sha: '89097c63',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyLite_PC_TDS_V5.3.pdf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'yes',
    expected: 'p3 HDT 1.8 MPa 106.6 C, 0.45 MPa 111.2 C, Tg 113.4 C; p4 Bending strength (X-Y) 106.1 +/- 1.6 MPa' },
  { MaterialID: 'M035', SourceID: 'S-POLYCN-PolyMax-PC-TDS-V5-3', Publisher: 'Polymaker',
    Product: 'PolyMax PC', Title: 'PolyMax PC Technical Data Sheet', Revision: 'V5.3', sha: '8f62ebe0',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_TDS_V5.3.pdf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'owner decision',
    expected: 'p3 HDT 1.8 MPa 99.3 C, 0.45 MPa 114.1 C, Tg 113 C; p4 Bending strength (X-Y) 81.29 +/- 1.53 MPa. Its 14.8 C gap would be an amorphous load-bracket miss (limit about 12.3 C): an alternative to PolyLite PC, not a second PC grade beside it' },
  { MaterialID: 'M036', SourceID: 'S-POLYCN-PolyMax-PC-FR-TDS-V5-1', Publisher: 'Polymaker',
    Product: 'PolyMax PC-FR', Title: 'PolyMax PC-FR Technical Data Sheet', Revision: 'V5.1', sha: '2a0902b5',
    URL: 'https://cdn.polymaker.com.cn/wp-content/uploads/lana-downloads/PolyMax_PC_FR_TDS_V5.1.pdf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'yes',
    expected: 'p3 HDT 1.8 MPa 107 C, 0.45 MPa 110 C, Tg 115 C; p4 Bending strength (X-Y) 96.6 +/- 1.3 MPa' },
  { MaterialID: 'M067', SourceID: 'R-FIBERON-PETCF17-TDS', Publisher: 'Polymaker (Fiberon)',
    Product: 'Fiberon PET-CF17', Title: 'Fiberon PET-CF17 Technical Data Sheet', Revision: 'V1.0', sha: '640a5ed4',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PET-CF17_V1.0_EN.pdf',
    Adds: 'hdt045; tensileStrengthXY; semi-filled load bracket', Ready: 'yes',
    expected: 'p1 HDT ISO 75 1.8 MPa 105 C, 0.45 MPa 147.5 C, Tm 241.3 C, Tensile strength (X-Y) 65.9 +/- 1.0 MPa. Bracket gap 42.5 C, likely a miss above the semi-filled limit' },
  { MaterialID: 'M024', SourceID: 'R-FIBERON-PETGRCF08-TDS', Publisher: 'Polymaker (Fiberon)',
    Product: 'Fiberon PETG-rCF08', Title: 'Fiberon PETG-rCF08 Technical Data Sheet', Revision: 'V1.0', sha: '39068040',
    URL: 'https://polymaker.com/wp-content/uploads/lana-downloads/TDS_FIBERON-PETG-rCF08_V1.0_EN.pdf',
    Adds: 'hdt045; tensileStrengthXY; amorphous load bracket', Ready: 'yes',
    expected: 'p1 HDT 1.8 MPa 65.7 C, 0.45 MPa 68.6 C, Tg 69.7 C, Tensile strength (X-Y) 59.8 +/- 0.3 MPa. Recycled carbon fibre: say so in Composition / filler and consider a declared Variant' },
  { MaterialID: 'M048', SourceID: 'R-FORWARDAM-PAHT-CF15-TDS-v3-5', Publisher: 'BASF Forward AM',
    Product: 'Ultrafuse PAHT CF15', Title: 'Ultrafuse PAHT CF15 Technical Data Sheet', Revision: 'v3.5', sha: '29bce0ad',
    URL: 'https://forward-am.com/wp-content/uploads/2024/10/Ultrafuse_PAHT_CF15_TDS_EN_v3.5-1.pdf',
    Adds: 'hdt045; tensileStrengthXY; semi-filled load bracket', Ready: 'yes',
    expected: 'p3 HDT at 1.8 MPa (dry) 92 C, at 0.45 MPa (dry) 145 C, conditioned 91 / 128 C; p4 Tensile strength ISO 527 103.2 MPa and 18.2 MPa, flexural 160.7 / 171.8 / 50.8 MPa. Open question: whether the p3 bars are printed. Dry bracket gap 53 C, likely a miss' },
  { MaterialID: 'M068', SourceID: 'D-FLASH-PETGF', Publisher: 'Flashforge',
    Product: 'PET-GF (G068-01, already a grade)', Title: 'Flashforge PET-GF Filament', Revision: 'Not published', sha: 'already in sources.csv',
    URL: 'https://www.flashforge.com/products/pet-gf',
    Adds: 'hdt045; tensileStrengthXY', Ready: 'yes; no new grade',
    expected: 'not re-read by that audit. G068-01 holds no HDT and no strength row; if the page publishes either, it is a case for that class with no new grade or source' },
  { MaterialID: 'M053', SourceID: 'R-STRATASYS-FDM-NYLON-CF10-MDS', Publisher: 'Stratasys',
    Product: 'FDM Nylon-CF10', Title: 'FDM Nylon-CF10 Material Data Sheet', Revision: '0724a', sha: 'ccf8e468',
    URL: 'https://www.stratasys.com/contentassets/c96fea7533204a7bbfa25e9ee19f9eb6/mds_fdm_nylon-cf10_0724a.pdf',
    Adds: 'semi-filled load bracket', Ready: 'blocked',
    expected: 'p4 HDT at 66 psi 58 / 77 C and at 264 psi 52 / 62 C in two orientations, moulded 109 / 105 C. Its base is "a blended nylon": whether it is M053 PA12-CF or M050 PA6-CF must be ruled before it can be filed (D57 identity)' },
  { MaterialID: 'M019', SourceID: 'I-PLA-Glass-Fiber-Technical-Data-Sheet', Publisher: 'iSANMATE',
    Product: 'PLA Glass Fiber (G019-02, already a grade)', Title: 'PLA Glass Fiber Technical Data Sheet', Revision: 'Not published', sha: 'already in sources.csv',
    URL: 'https://www.isanmate.com/wp-content/uploads/2025/08/PLA-Glass-Fiber-Technical-Data-Sheet.pdf',
    Adds: 'nothing for certification', Ready: 'no',
    expected: 'the untranscribed "Tensile Streng MPa ISO 46-56" (D-05). M019 is already a strength case, and the sheet has no thermal row, so this adds no case. Its value is the composition conflict C00003, not certification. Host is robots-disallowed to fetch tools' },
];

const t = openTables();
const materials = new Map(t.rows('materials').map((r) => [r.MaterialID, r]));
const gradeIds = t.rows('grades').map((r) => r.GradeID);
const sourceIds = new Set(t.rows('sources').map((r) => r.SourceID));
const cases = new Map();
try {
  const { readFileSync } = await import('node:fs');
  const { parseCsvText } = await import('../../../../build/src/csv.js');
  for (const r of parseCsvText(readFileSync(join(here, 'certification-cases.csv'), 'utf8'), 'certification-cases.csv').records)
    cases.set(`${r.values.Headline}|${r.values.MaterialID}`, r.values['This-material case']);
} catch { /* the cases ledger has not been generated yet */ }

// A new grade of the same material takes the next free ID; two candidates for one material take consecutive ones.
const taken = [...gradeIds];
const rows = CANDIDATES.map((c) => {
  const existing = sourceIds.has(c.SourceID);
  let grade = 'Not applicable (the grade exists)';
  if (!existing) { grade = nextId('grades', taken, { materialId: c.MaterialID }); taken.push(grade); }
  const status = ['hdt045', 'tensileStrengthXY']
    .filter((k) => c.Adds.includes(k))
    .map((k) => `${k}: ${cases.get(`${k}|${c.MaterialID}`) === 'yes' ? 'already a case' : 'would add a case'}`)
    .join('; ') || 'Not applicable';
  return {
    MaterialID: c.MaterialID, Material: materials.get(c.MaterialID)?.['Original name'] ?? '?',
    Publisher: c.Publisher, Product: c.Product, Title: c.Title, Revision: c.Revision,
    'SourceID to assign': c.SourceID, 'Source exists': existing ? 'yes' : 'no',
    'GradeID to create': grade, 'Classes it feeds': c.Adds, 'Today': status,
    Ready: c.Ready, 'SHA-256 prefix (2026-09-15)': c.sha, URL: c.URL,
    'Expected reading (check a re-read against it; never enter it)': c.expected,
  };
});

const header = Object.keys(rows[0]);
writeFileSync(join(here, 'import-backlog.csv'), csvText(header, rows));
const ready = rows.filter((r) => r.Ready.startsWith('yes'));
console.log(`import-backlog.csv: ${rows.length} candidates, ${ready.length} ready to import once fetched and hashed.`);
for (const r of rows) console.log(`  ${r.Ready === 'yes' ? '+' : r.Ready.startsWith('yes') ? '+' : '-'} ${r.MaterialID} ${r.Material.padEnd(12)} ${r['GradeID to create'].padEnd(28)} ${r['Today']}`);
