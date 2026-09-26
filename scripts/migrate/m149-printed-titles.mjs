#!/usr/bin/env node
// Migration m149 (2026-09-25): seventy source titles were page furniture, and one identity note had a template's article.
//
// Copper3D's MD Flex sheet was titled "supported by": the sponsor credit in the cover's corner, whose sponsor is a logo,
// was the first line of the page's text. SOURCE-TITLE-NOT-TITLE caught shop chrome, file names and "untitled", not this.
// Widened to the class (build/src/lint-rules.js, FURNITURE), it finds seventy, all read the same way from a sheet's first
// line, and no false one:
//
// - a credit line: "supported by" (Copper3D's MD Flex and PLACTIVE), "A product by" (Filament2Print's ASA and PETG);
// - a lone mark or number: "TM" (Polymaker's five product information sheets, NinjaTek's Chinchilla), "™" (PolyCast), "®"
//   (three BASF extended sheets, a LUVOCOM sheet), "1" (two Stratasys sheets), "S.I." (a column heading);
// - the first word of a two-line heading: "TECHNICAL" (29 Polymaker sheets), "T E C H N I C A L" (Fiberon PETG-ESD);
// - a page, version or date label: "Page: 1" (11 Yousu sheets), "Version: 3.0" or "1.0" (10 ANYCUBIC sheets),
//   "Date of issue: November 1%, 2024" (colorFabb's PLA High Speed PRO; the % is a superscript "st").
//
// Each title below is the heading the sheet prints, read from its cached copy (dist/h2c.sqlite documents_fts, and the
// page rendered where the text layer did not show the layout: MD Flex, PLACTIVE, PolyLite PETG, ABS-Max, PolyLite PC,
// PolyCast, the ELEGOO sheet, ABS-M30i, PC-ISO, both Filament2Print sheets, Chinchilla, a Yousu, two ANYCUBIC and the
// colorFabb sheet). A sheet's own spelling stays ("FILMAENT", "Techanical"); a trademark sign stays where the publisher's
// siblings in the table carry it. Polymaker's sheets print "TECHNICAL DATA SHEET" above the product, and take the form
// their siblings already have ("Polymaker™ HT-PLA-GF Technical Data Sheet"). Where the head also prints a version or a
// revision date and the row had none, it goes where it belongs, Revision and Publication date (as R-YOUSU-POM-TDS has
// them): with the version gone from the title, two ANYCUBIC PLA sheets would otherwise read the same.
//
// One sheet prints no title at all: R-3DJAKE-3DJAKE-TDS-PLA is ELEGOO's table of typical values under its logo, hosted
// by 3DJake. Its Title is Not published, which the column now accepts (schema/tables/sources.schema.json), and its
// Source note says whose sheet it is.
//
// M173's Identity notes began "A alumina", m142's "A ${what}" template; it is "An alumina". M171 ("A 316L") and M172
// ("A silicon carbide") read correctly.
//
// A re-run is a no-op; a run after the data moved stops.
//
//   node scripts/migrate/m149-printed-titles.mjs

import { openTables } from '../data/table-io.mjs';

const migration = 'm149-printed-titles';
const t = openTables();
const NP = 'Not published';

// SourceID: [title it had, title printed, revision printed or null, publication date printed or null]
const TDS = 'Technical Data Sheet';
const yousu = (name, version, day) => [`${name} 3D FILMAENT ${TDS}`, `Version ${version}, revision date ${day}`, day.split('/').reverse().join('-')];
const TITLES = {
  'S-PET-TDS-MDflex': ['supported by', 'MD¹ Flex Antibacterial Nanocomposite', null, null],
  'S-PET-TDS-PLACTIVE': ['supported by', 'PLACTIVE Antibacterial Nanocomposite', null, null],
  'R-FILAMENT2PRINT-F2P-ASA-EN': ['A product by', `ASA ${TDS}`, null, null],
  'R-FILAMENT2PRINT-F2P-PETG-EN': ['A product by', `PETG ${TDS}`, null, null],
  'S-POLYCN-PolyLite-PC-PIS-EN': ['TM', 'PolyLite™ PC', null, null],
  'S-POLYCN-PolyFlex-TPU90-PIS-EN-V1-2': ['TM', 'PolyFlex™ TPU90', null, null],
  'S-POLYCN-PolyMide-CoPA-PIS-EN': ['TM', 'PolyMide™ CoPA', null, null],
  'S-POLYCN-PolyWood-PIS-EN': ['TM', 'PolyWood™', null, null],
  'S-POLYCN-PolyDissolve-S1-PIS-EN': ['TM', 'PolyDissolve™ S1', null, null],
  'R-NINJATEK-Chinchilla-TDS': ['TM', 'Chinchilla™ Technical Specifications', null, null],
  'S-POLYCN-PolyCast-TDS-V5-1': ['™', 'Techanical Data Sheet PolyCast™', 'V5.1', null],
  'R-BASF-ExtendedTDS-Ultrafuse-PAHT-CF15-V1-5': ['®', 'Ultrafuse PAHT CF15 Extended TDS: Complete Technical Documentation and Testing Summary', 'Version 1.5', null],
  'R-BASF-ExtendedTDS-Ultrafuse-PET-CF15-V1-4': ['®', 'Ultrafuse PET CF15 Extended TDS: Complete Technical Documentation and Testing Summary', 'Version 1.4', null],
  'R-BASF-ExtendedTDS-Ultrafuse-ASA-V2-1': ['®', 'Ultrafuse ASA Extended TDS: Complete Technical Documentation and Testing Summary', 'Version 2.1', null],
  'R-3D4MAKERS-TDS-pps-cf-9938-bk-filament-en-iso': ['®', 'LUVOCOM 3F PPS CF 9938 BK', null, null],
  'R-STRATASYS-mds-fdm-absm30i-0621a': ['1', 'ABS-M30i Data Sheet', null, null],
  'R-STRATASYS-mds-fdm-pciso-0820a': ['1', 'PC-ISO Data Sheet', null, null],
  'R-3DJAKE-3DJAKE-TDS-PLA': ['S.I.', NP, null, null],
  'R-POLYMAKER-FIBERON-TDS-FIBERON-PETG-ESD-V1-1-EN-1': ['T E C H N I C A L', `FIBERON™ PETG-ESD ${TDS}`, 'V1.1', null],
  'S-POLYCN-TDS-Polymaker-PolyLite-PETG-V6-0-2026-06-09-EN': ['TECHNICAL', `PolyLite™ PETG ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-Polylite-PLA-CF-V6-0-2026-06-09-EN': ['TECHNICAL', `Polylite™ PLA-CF ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-PolyMax-PC-V5-5-2026-01-05-EN': ['TECHNICAL', `PolyMax™ PC ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-ASA-V6-0-2025-12-02-EN': ['TECHNICAL', `Polymaker™ ASA ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-PolySonic-PLA-Pro-6-0-2026-06-08-EN': ['TECHNICAL', `PolySonic™ PLA PRO ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-ABS-Max-V1-1-2026-06-01-EN': ['TECHNICAL', `POLYMAKER™ ABS-Max ${TDS}`, 'V1.1', null],
  'S-POLYCN-TDS-Polymaker-PolyFlex-TPU90-V5-6-2025-12-11-EN': ['TECHNICAL', `PolyFlex™ TPU90 ${TDS}`, 'V5.6', null],
  'S-POLYCN-TDS-Polymaker-ABS-Pro-V1-1-2026-06-01-EN': ['TECHNICAL', `POLYMAKER™ ABS-Pro ${TDS}`, 'V1.1', null],
  'S-POLYCN-TDS-Polymaker-HT-PLA-GF-V1-2-2025-12-09-EN': ['TECHNICAL', `Polymaker™ HT-PLA-GF ${TDS}`, 'V1.2', null],
  'S-POLYCN-TDS-PolyLite-LW-PLA-v7-0-2026-04-09': ['TECHNICAL', `PolyLite™ LW-PLA ${TDS}`, 'V7.0', null],
  'S-POLYCN-TDS-Polymaker-PC-ABS-V5-5-2025-12-10-EN': ['TECHNICAL', `Polymaker™ PC-ABS ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PC-PBT-V5-5-2025-12-10-EN': ['TECHNICAL', `Polymaker™ PC-PBT ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PolyMax-PLA-V5-5-2026-01-06-EN': ['TECHNICAL', `PolyMax™ PLA ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-HF-V5-5-2025-12-29-EN': ['TECHNICAL', `PolyFlex™ TPU95-HF ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PETG-V2-0-2025-11-17': ['TECHNICAL', `Polymaker™ PETG ${TDS}`, 'V2.0', null],
  'S-POLYCN-TDS-Polymaker-PolyMide-CoPA-V5-5-2026-01-06-EN': ['TECHNICAL', `PolyMide™ CoPA ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-PolySonic-PLA-V6-0-2026-06-08-EN': ['TECHNICAL', `PolySonic™ PLA ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-HT-PLA-V1-3-2025-12-10-EN': ['TECHNICAL', `Polymaker™ HT-PLA ${TDS}`, 'V1.3', null],
  'S-POLYCN-TDS-Polymaker-PolyFlex-TPU95-V5-5-2025-12-29-EN': ['TECHNICAL', `PolyFlex™ TPU95 ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PolyLite-PLA-Pro-V5-6-2026-01-05-EN': ['TECHNICAL', `PolyLite™ PLA Pro ${TDS}`, 'V5.6', null],
  'S-POLYCN-TDS-Polymaker-ABS-v6-0-2025-12-04': ['TECHNICAL', `Polymaker™ ABS ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-PolyTerra-PLA-V6-0-2026-06-08-EN': ['TECHNICAL', `PolyTerra™ PLA ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-PolyLite-CosPLA-Version-A-V5-5-2025-12-30-EN': ['TECHNICAL', `Polymaker™ PolyLite™ CosPLA Version A ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PolyMax-PC-FR-V5-5-2026-01-06-EN': ['TECHNICAL', `PolyMax™ PC-FR ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-HT-PLA-Pro-V1-4-2026-7-17-EN': ['TECHNICAL', `POLYMAKER™ HT-PLA Pro ${TDS}`, 'V1.4', null],
  'S-POLYCN-TDS-Polymaker-PLA-Pro-v6-0-2026-01-30-EN': ['TECHNICAL', `Polymaker™ PLA Pro ${TDS}`, 'V6.0', null],
  'S-POLYCN-TDS-Polymaker-PolyLite-PC-Transparent-V5-5-2026-01-05-EN': ['TECHNICAL', `PolyLite™ PC Transparent ${TDS}`, 'V5.5', null],
  'S-POLYCN-TDS-Polymaker-PolyLite-ABS-V5-6-2025-12-30-EN': ['TECHNICAL', `PolyLite™ ABS ${TDS}`, 'V5.6', null],
  'S-POLYCN-TDS-Polymaker-PolyMax-PETG-V5-5-2026-01-06-EN': ['TECHNICAL', `PolyMax™ PETG ${TDS}`, 'V5.5', null],
  'R-YOUSU-YOUSUPLATDS-081b': ['Page: 1', ...yousu('Yousu PLA', '2.0', '18/12/2020')],
  'R-YOUSU-YOUSUWOODTDS-eb4e': ['Page: 1', ...yousu('YOUSU WOOD', '2.0', '18/12/2020')],
  'R-YOUSU-YOUSU3DPPTDS-4872': ['Page: 1', ...yousu('Yousu PP', '1.0', '18/03/2022')],
  'R-YOUSU-YOUSUABSTDS-cc2f': ['Page: 1', ...yousu('YOUSU Modified ABS', '2.0', '21/12/2020')],
  'R-YOUSU-YOUSUSILKPLATDS-81c3': ['Page: 1', ...yousu('YOUSU Silk PLA', '2.0', '21/12/2020')],
  'R-YOUSU-YOUSUPVATDS-6752': ['Page: 1', ...yousu('Yousu PVA', '2.0', '18/12/2020')],
  'R-YOUSU-YOUSUPETGTDS-8fb4': ['Page: 1', ...yousu('Yousu PETG', '2.0', '18/12/2020')],
  'R-YOUSU-YOUSUPVBTDS-9c2c': ['Page: 1', ...yousu('Yousu PVB', '1.0', '16/06/2021')],
  'R-YOUSU-YOUSUPCTDS-535a': ['Page: 1', ...yousu('Yousu PC', '2.0', '23/12/2020')],
  'R-YOUSU-YOUSUPLATDS-8e09': ['Page: 1', ...yousu('YOUSU Modified PLA', '1.0', '21/12/2020')],
  'R-YOUSU-YOUSUNylonTDS-38ef': ['Page: 1', ...yousu('Yousu Nylon', '2.0', '23/12/2020')],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0-0': ['Version: 3.0', 'Anycubic PLA', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA': ['Version: 1.0', 'ANYCUBIC PLA', 'Version: 1.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-V3-0': ['Version: 3.0', 'Anycubic PLA+', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PETG-V3-0': ['Version: 3.0', 'Anycubic PETG', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ABS-V3-0': ['Version: 3.0', 'Anycubic ABS', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-TPU-V3-0': ['Version: 3.0', 'Anycubic TPU', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-ASA-V3-0': ['Version: 3.0', 'Anycubic ASA', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-Metal-V3-0': ['Version: 3.0', 'Anycubic PLA Metal', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-silk-V3-0': ['Version: 3.0', 'Anycubic PLA Silk', 'Version: 3.0', null],
  'R-3DJAKE-3DJAKE-ANYCUBIC-TDS-PLA-HS-V3-0': ['Version: 3.0', 'Anycubic PLA High Speed', 'Version: 3.0', null],
  'R-COLORFABB-Files-colorFabb': ['Date of issue: November 1%, 2024', 'Technical datasheet colorFabb PLA High Speed PRO', 'v1.0', '2024-11-01'],
};
const NOTES = {
  'R-3DJAKE-3DJAKE-TDS-PLA': ['Not applicable', 'Hosted by 3DJake / 3DJAKE; the sheet is ELEGOO\'s (Shenzhen Zhinengpai Technology), a table of typical values under its logo that prints no title.'],
  'S-POLYCN-PolyCast-TDS-V5-1': ['Hosted by 3DJake / 3DJAKE; the sheet is Polymaker\'s.', 'Hosted by 3DJake / 3DJAKE; the sheet is Polymaker\'s. Its cover spells "Techanical Data Sheet".'],
};

let n = 0;
const put = (id, field, value) => {
  const before = t.get('sources', id)[field];
  if (before === value) return;
  if (before !== NP) throw new Error(`${migration}: ${id} ${field} is "${before}", expected ${NP}; the data moved`);
  t.set('sources', id, field, value, { expect: NP });
  n++;
};
for (const [id, [had, title, revision, published]] of Object.entries(TITLES)) {
  const row = t.get('sources', id);
  if (row.Title !== title) {
    t.set('sources', id, 'Title', title, { expect: had });
    n++;
  }
  if (revision) put(id, 'Revision', revision);
  if (published) put(id, 'Publication date', published);
}
for (const [id, [before, after]] of Object.entries(NOTES)) {
  if (t.get('sources', id)['Source note'] === after) continue;
  t.set('sources', id, 'Source note', after, { expect: before });
  n++;
}

const note = t.get('materials', 'M173')['Identity notes'];
if (note.startsWith('A alumina ')) {
  t.set('materials', 'M173', 'Identity notes', `An alumina ${note.slice('A alumina '.length)}`, { expect: note });
  n++;
} else if (!note.startsWith('An alumina ')) throw new Error(`${migration}: M173's Identity notes begin "${note.slice(0, 20)}"; the data moved`);

if (n) t.save();
console.log(`${migration}: ${n} cell(s) written`);
