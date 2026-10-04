// b41: the proposals of the reader round's maker-page batch, written from the documents the import's reader staged.
//
// The reader (propose.mjs) read each staged page and found part of what it prints; this file is the reviewer's reading,
// made line by line against the cached text of each document (ingest:extract / witness text, `text.mjs <sha>`): the
// words of every cell are the page's own, the typed columns are the build's parsers' reading of them
// (profileFor -> profileCellsFromParsed), and nothing is entered that the page does not print. Run from the project
// root with H2C_DOCUMENT_CACHE and H2C_INGEST_ROOT set as for the batch:
//
//   node docs/audits/2026-10-04-reader-round/ingest/build-b41.mjs
//
// It writes proposals/b41/<sha16>.json and ../b41-packet.json (the packet the migration pins).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables } from '../../../../scripts/data/table-io.mjs';
import { profileFor } from '../../../../scripts/ingest/propose.mjs';
import { parseAbrasion, parseEnclosure } from '../../../../build/src/normalize/process.js';

const BY = 'Claude Sonnet (reader round b41), checked by Claude Opus';
const DATE = '2026-10-04';
const OUT = 'docs/audits/2026-10-04-reader-round/ingest/proposals/b41';
const sha = (b) => createHash('sha256').update(b).digest('hex');
const A = 'http://web.archive.org/web/';
const TDS_TABLE = 'sources';

// One entry per document. `settings` are [field, label, raw, line] as the page prints them; `notes` are [topic, text].
const docs = [
  {
    file: 'm064', grade: 'G064-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXSTAT ESD-Nylon 12 product page (archived 2025-11-15)',
    url: `${A}20251115020229id_/https://www.3dxtech.com/products/3dxstat-esd-nylon-12`, orig: 'https://www.3dxtech.com/products/3dxstat-esd-nylon-12', captured: '2025-11-15 02:02:29 UTC',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp  275-295C',
      cells: { nozzle: '275-295C', bed: '90-110C', chamber: 'Recommended', nozzleMaterial: 'Hardened Steel with .4mm diameter minimum', diameter: '.4mm diameter minimum', abrasion: 'Hardened Steel with .4mm diameter minimum', drying: '90C for 4 hours' },
      lines: { nozzle: 'Extruder Temp  275-295C', bed: 'Bed Temp  90-110C', chamber: 'Heated Chamber  Recommended', nozzleMaterial: 'Nozzle Specs  Hardened Steel with .4mm diameter minimum', drying: 'Drying Specs  90C for 4 hours' },
      notes: [['Layer height', '0.25mm or higher']],
    }],
    skipped: 'Page also prints "High thermal properties, with an HDT of 150C" (a feature claim with no load or standard; the registered TDS prints HDT 0.45 MPa 142) and a sales price: not entered.',
    sourceNote: 'The 3DXTECH product page for 3DXSTAT ESD-Nylon 12 as the Internet Archive captured it on 2025-11-15 (the product is sold out; the live address now redirects to the maker\'s ESD-safe collection). Adds the chamber, nozzle and drying statements the registered TDS (v1) does not print; its extruder window (275-295 C) differs from the TDS\'s (265-285 C) and both stand.',
  },
  {
    file: 'm103', grade: 'G103-01', maker: '3DXTECH', slug: '3DXTECH', title: 'Hyperlite PP product page (archived 2025-09-17)',
    url: `${A}20250917152246id_/https://www.3dxtech.com/products/hyperlite%E2%84%A2-pp`, orig: 'https://www.3dxtech.com/products/hyperlite%E2%84%A2-pp', captured: '2025-09-17 15:22:46 UTC',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp  210-240°C',
      cells: { nozzle: '210-240°C', bed: '60-90°C', chamber: 'Not required', nozzleMaterial: 'No special concerns', drying: 'Not needed' },
      lines: { nozzle: 'Extruder Temp  210-240°C', bed: 'Bed Temp  60-90°C', chamber: 'Heated Chamber  Not required', nozzleMaterial: 'Nozzle Specs  No special concerns', drying: 'Drying Specs  Not needed' },
      notes: [['Layer height', 'No special concerns']],
    }],
    skipped: 'Page also prints "Very low density, only 0.9g/cc" (a feature claim with no method; the database already holds the TDS\'s 0.81 and an older edition\'s 0.75 for this product): not entered.',
    sourceNote: 'The 3DXTECH product page for Hyperlite PP as the Internet Archive captured it on 2025-09-17 (the live address now redirects to the maker\'s polypropylene collection). The registered TDS prints no print settings (its only profile is the test-bar conditions); this page prints all of them.',
  },
  {
    file: 'm119', grade: 'G119-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXMAX PC/ASA product page (archived 2023-10-02)',
    url: `${A}20231002212720id_/https://www.3dxtech.com/product/3dxmax-pc-asa/`, orig: 'https://www.3dxtech.com/product/3dxmax-pc-asa/', captured: '2023-10-02 21:27:20 UTC',
    kind: 'Current manufacturer product guidance', block: 'Recommended Print Conditions',
    profiles: [{
      locator: 'Recommended Print Conditions', evidence: 'Extruder Temp: 270 – 290°C',
      cells: { nozzle: '270 – 290°C', bed: '110 – 120°C', enclosure: 'We recommend using a printer with an enclosure to help keep some heat in while printing with PC/ASA' },
      lines: { nozzle: 'Extruder Temp: 270 – 290°C', bed: 'Bed Temp: 110 – 120°C, cool the bed down by about 10-20°C after the first couple of layers', enclosure: 'Enclosure: We recommend using a printer with an enclosure to help keep some heat in while printing with PC/ASA' },
      notes: [['Adhesion / release', 'Bed Prep: 3DXTech Polyimide Tape, ABS / Acetone Slurry, or Hairspray on clean glass; cool the bed down by about 10-20°C after the first couple of layers']],
      enclosureState: 'recommended',
      parseReview: 'Fields: Enclosure state. The page asks for a printer with an enclosure to keep some heat in ("Enclosure: We recommend using a printer with an enclosure to help keep some heat in while printing with PC/ASA", p. 1); the parser does not read that wording, so the state is typed by the reviewer as a recommendation. No chamber temperature is published. The other typed columns are the parsers\' reading.',
    }],
    skipped: 'Drying is not printed on the page: it says "Please see the following instructions" and links a separate drying page, so Drying stays Not published. The page also says "Note : This product is discontinued."; no nozzle statement.',
    sourceNote: 'The 3DXTECH product page for 3DXMAX PC/ASA as the Internet Archive captured it on 2023-10-02. The page states that the product is discontinued, and the live address now redirects to the maker\'s 3DXMAX r-ASA page. The registered TDS (v3) prints no print settings; this page prints the nozzle and bed windows and an enclosure recommendation.',
  },
  {
    file: 'm120', grade: 'G120-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXSTAT ESD-PVDF product page (archived 2023-10-02)',
    url: `${A}20231002204210id_/https://www.3dxtech.com/product/3dxstat-esd-pvdf/`, orig: 'https://www.3dxtech.com/product/3dxstat-esd-pvdf/', captured: '2023-10-02 20:42:10 UTC',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations; Recommended Print Settings',
    profiles: [{
      locator: 'Print Recommendations; Recommended Print Settings', evidence: 'Extruder Temp 250-270°C',
      cells: { nozzle: '250-270°C', bed: '90-110°C', chamber: 'Not required', nozzleMaterial: 'No special concerns', drying: 'Not required' },
      lines: { nozzle: 'Extruder Temp 250-270°C', bed: 'Bed Temp 90-110°C', chamber: 'Heated Chamber Not required', nozzleMaterial: 'Nozzle Specs No special concerns', drying: 'Drying Specs Not required' },
      notes: [['Layer height', 'No special concerns'], ['Adhesion / release', 'Nano Polymer Adhesive'], ['Cooling', 'No or very slow cooling fan'], ['Speed', '40-60mm/s as a good starting point']],
    }],
    skipped: 'The second print block adds "Some need to get as high as 280°C" and a degradation warning above 290°C (a limit on the extruder, not a setting a column holds): not entered. "High Thermal Properties: 130°C CUT" and "Rated for uses up to 150°C" are feature claims with no method: not entered.',
    sourceNote: 'The 3DXTECH product page for 3DXSTAT ESD-PVDF as the Internet Archive captured it on 2023-10-02 (the live address now redirects to the ESD-safe collection). The registered TDS (v3) prints no print settings; this page prints them twice (the Print Recommendations list and the Recommended Print Settings text), and the two agree.',
  },
  {
    file: 'm124', grade: 'G124-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXSTAT ESD-PPS product page (archived 2024-05-28)',
    url: `${A}20240528134142id_/https://www.3dxtech.com/product/3dxstat-esd-pps/`, orig: 'https://www.3dxtech.com/product/3dxstat-esd-pps/', captured: '2024-05-28 13:41:42 UTC',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp 315-345°C',
      cells: { nozzle: '315-345°C', bed: '120-160°C', chamber: 'Recommended 60-90°C if possible', nozzleMaterial: 'No special concerns', drying: '110°C for 4 hours' },
      lines: { nozzle: 'Extruder Temp 315-345°C', bed: 'Bed Temp 120-160°C', chamber: 'Heated Chamber Recommended 60-90°C if possible', nozzleMaterial: 'Nozzle Specs No special concerns', drying: 'Drying Specs 110°C for 4 hours' },
      notes: [['Layer height', 'No special concerns'], ['Adhesion / release', 'Nano Polymer Adhesive']],
    }],
    skipped: 'The "Benefits of PPS include" list prints "Melting temperatures (Tm) of 285°C" and "Glass Transition temperature (Tg) of 85°C": statements about PPS the polymer, with no method or product scope, beside the registered TDS\'s product Tg of 83 °C; the reader proposed them as measurements and the reviewer rejected both. The annealing instructions are post-processing for PPS parts, not a column of the profile.',
    sourceNote: 'The 3DXTECH product page for 3DXSTAT ESD-PPS as the Internet Archive captured it on 2024-05-28 (the live address now redirects to the ESD-safe collection). The registered TDS (v3) prints no print settings; this page prints the nozzle, bed, chamber and drying settings.',
  },
  {
    file: 'm128', grade: 'G128-01', maker: '3DXTECH', slug: '3DXTECH', title: 'CarbonX PC-ABS+CF product page (archived 2023-06-03)',
    url: `${A}20230603150315id_/https://www.3dxtech.com/product/carbonx-pc-abs-cf/`, orig: 'https://www.3dxtech.com/product/carbonx-pc-abs-cf/', captured: '2023-06-03 15:03:15 UTC',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations; Recommended Print Settings',
    profiles: [{
      locator: 'Print Recommendations; Recommended Print Settings', evidence: 'Extruder Temp 280-300°C',
      cells: { nozzle: '280-300°C', bed: '110-120°C', chamber: 'Recommended', nozzleMaterial: '0.4mm diameter minimum Hardened Steel Nozzle', diameter: '0.4mm diameter minimum', abrasion: '0.4mm diameter minimum Hardened Steel Nozzle', drying: '110°C for 4 hours' },
      lines: { nozzle: 'Extruder Temp 280-300°C', bed: 'Bed Temp 110-120°C', chamber: 'Heated Chamber Recommended', nozzleMaterial: 'Nozzle Specs 0.4mm diameter minimum Hardened Steel Nozzle', drying: 'Drying Specs 110°C for 4 hours' },
      notes: [['Layer height', '0.25mm or higher'], ['Adhesion / release', 'Magigoo Bed Prep']],
    }],
    skipped: 'The second print block says "110°C for 4+ hours" and that layers below 0.25mm "may create too much back pressure in the hot end"; the first block\'s 4 hours is the drying schedule entered.',
    sourceNote: 'The 3DXTECH product page for CarbonX PC-ABS+CF as the Internet Archive captured it on 2023-06-03 (the live address now redirects to the carbon-fibre collection). The registered TDS (v1.1) prints no print settings besides the test-bar conditions; this page prints the nozzle, bed, chamber, nozzle hardness and drying settings.',
  },
  {
    file: 'm132', grade: 'G132-01', maker: 'Flashforge', slug: 'FLASHFORGE', title: 'Flashforge PBT-GF product page (archived 2024-08-13)',
    url: `${A}20240813223834id_/https://flashforge.com/products/pbt-gf`, orig: 'https://flashforge.com/products/pbt-gf', captured: '2024-08-13 22:38:34 UTC',
    kind: 'Current manufacturer product guidance', block: 'Recommended Printing Parameters',
    profiles: [{
      locator: 'Recommended Printing Parameters', evidence: 'Nozzle Temperature: 260~280°C',
      cells: { nozzle: '260~280°C', bed: '100~120°C', drying: '80°C, 3h (convection oven)', diameter: 'φ0.4/0.6mm (φ0.4mm recommended)' },
      lines: { nozzle: 'Nozzle Temperature: 260~280°C', bed: 'Build Plate Temperature: 100~120°C', drying: 'Pre-print Drying Conditions: 80°C, 3h (convection oven)', diameter: 'Nozzle Diameter: φ0.4/0.6mm (φ0.4mm recommended)' },
      notes: [['Layer height', '0.12~0.3mm'], ['Speed', '40~100mm/s'], ['Cooling', '0~50%'], ['Retraction', 'Length: 1~2mm; Retraction Speed: 40~60mm/s'], ['Storage humidity', 'Room temperature to 40°C, ≤20% RH (sealed with desiccant)']],
    }],
    skipped: 'The page says the filament "makes it easy to print even on non-heated chamber FFF 3D printers" and "can withstand continuous use at temperatures up to 150°C" (statements with no setpoint or method), and once calls the product "PET-GF" in the parameters sentence: not entered. The registered TDS prints an ambient temperature of 50~70 C and a drying schedule of 80 C for at least 12 hours; this page\'s 3 hours stands as a second statement.',
    sourceNote: 'The Flashforge product page for PBT-GF as the Internet Archive captured it on 2024-08-13 (the product was listed "Sold out / Coming soon"; the live address now answers 404). Its drying schedule (80 C, 3 h) differs from the registered TDS\'s (80 C, at least 12 h) and both stand. The parameters sentence names the product "PET-GF" once; the title, the URL and the BASF Ultradur B 4300 G2 resin it names make it the PBT-GF.',
  },
  {
    file: 'm133', grade: 'G133-01', maker: 'Flashforge', slug: 'FLASHFORGE', title: 'Flashforge Flexible product page (archived 2025-10-08)',
    url: `${A}20251008152550id_/https://www.flashforge.com/products/flexible`, orig: 'https://www.flashforge.com/products/flexible', captured: '2025-10-08 15:25:50 UTC',
    kind: 'Current manufacturer product guidance', block: 'Specification',
    profiles: [{
      locator: 'Specification', evidence: 'Nozzle Temperature: 190~240°C',
      cells: { nozzle: '190~240°C', bed: '25~60°C', drying: 'Before Printing: 70°C, 5 hours (Convection Oven)', diameter: 'φ0.4/0.6mm (Recommended φ0.6mm)' },
      lines: { nozzle: 'Nozzle Temperature: 190~240°C', bed: 'Build Plate Temperature: 25~60°C', drying: 'Drying Conditions Before Printing: 70°C, 5 hours (Convection Oven)', diameter: 'Nozzle Diameter: φ0.4/0.6mm (Recommended φ0.6mm)' },
      notes: [['Layer height', '0.2~0.3mm'], ['Speed', '20~200mm/s'], ['Cooling', '50~100%'], ['Retraction', 'Length: 0.3~1mm; Retraction Speed: 30~50mm/s'], ['Storage humidity', 'Room temperature to 40°C, ≤20% RH (Sealed with desiccant)']],
    }],
    skipped: 'The page also says the filament is "Ideal for direct drive extruders with 0.6mm or larger nozzles" (the diameter cell holds the specification line). Identity: the page titles the product "Flashforge PLA Flexible Filament", the registered TDS "Flexible Filament" made of PBAT; the product name, the shop address (/products/flexible), the SKU (DLZ-Flexible), the nozzle-diameter and support-material lines are the same, so the page is taken as this product\'s, with the naming difference recorded here.',
    sourceNote: 'The Flashforge product page for Flexible as the Internet Archive captured it on 2025-10-08 (the live address now answers 404). The page titles the product "Flashforge PLA Flexible Filament" where the registered TDS says PBAT; it is taken as the same product (same name, shop address and SKU). Its windows differ from the TDS\'s (nozzle 190~240 vs 200~240 C, bed 25~60 vs room temperature~60 C, speed 20~200 vs 30~150 mm/s) and its drying schedule is 70 C for 5 hours where the TDS says 60 C for at least 5 hours: both statements stand.',
  },
  {
    file: 'm146', grade: 'G146-01', maker: 'Fillamentum', slug: 'FILLAMENTUM', title: 'NonOilen 3D printing guide (version updated 8/2024)',
    url: 'https://fillamentum.com/wp-content/uploads/2024/11/3D_PRINT_GUIDE_NONOILEN_8_2024.pdf', orig: 'https://fillamentum.com/wp-content/uploads/2024/11/3D_PRINT_GUIDE_NONOILEN_8_2024.pdf', captured: null,
    revision: 'Version updated in 8/2024', publication: '2024-08', sourceClass: 'Manufacturer product page or guide', kind: 'Manufacturer published guidance', block: 'printer setups',
    profiles: [
      {
        locator: 'Basic non high-speed printers setup', evidence: 'Print Temp: Bed Temp:',
        cells: { nozzle: '170 – 195 °C', bed: '0 – 50 °C', chamber: 'Not required', enclosure: 'Heated Chamber: not necessary', plate: 'PEI, mirror/glass, Lockpad', drying: '75 °C for 5 hours' },
        lines: { nozzle: '170 – 195 °C 0 – 50 °C', bed: '170 – 195 °C 0 – 50 °C', chamber: 'ADHESIVE: HEATED CHAMBER:', enclosure: 'Heated Chamber: not necessary, a heated chamber can help with', plate: 'PEI, mirror/glass, Lockpad', drying: 'We recommended drying at 75 °C for 5 hours.' },
        notes: [['Speed', '20 – 50 mm/s'], ['Cooling', '100 %'], ['Adhesion / release', 'Adhesive: Magigoo PP, 3DLac, PVA glue, DimaFix; Raft/skirt/brim: In most cases, a 5 mm brim will help.']],
      },
      {
        locator: 'High speed printers setup', evidence: 'Bed Temp: 180 – 215 °C 0 – 60 °C',
        cells: { nozzle: '180 – 215 °C', bed: '0 – 60 °C', chamber: 'Not required', enclosure: 'Heated Chamber: not necessary', plate: 'PEI, mirror/glass, Lockpad', drying: '75 °C for 5 hours' },
        lines: { nozzle: '180 – 215 °C 0 – 60 °C', bed: '180 – 215 °C 0 – 60 °C', chamber: 'ADHESIVE: HEATED CHAMBER:', enclosure: 'Heated Chamber: not necessary, a heated chamber can help with', plate: 'PEI, mirror/glass, Lockpad', drying: 'We recommended drying at 75 °C for 5 hours.' },
        notes: [['Speed', '50 – 200 mm/s'], ['Cooling', '80 – 100 %'], ['Adhesion / release', 'Adhesive: Magigoo PP, 3DLac, PVA glue, DimaFix; Raft/skirt/brim: In most cases, a 5 mm brim will help.']],
      },
    ],
    skipped: 'The two printer setups are read from the page image as well as the text layer, which scrambles their order. Tip 5 also says a heated chamber "can help with adhesion and overall print quality" (its sentence is split by the radar labels in the text layer; the Enclosure cell keeps the words on one line). The overview radar (hardness, impact resistance, density, tensile modulus, temperature resistance up to 110 C, Charpy unnotched) is drawn without numbers: nothing entered from it. The registered 2020 TDS prints 175-195 C, bed 0-50 C and a re-drying schedule of 65 C for 2 hours; the guide\'s settings are a second statement from a newer edition, and both stand. A third drying statement for NonOilen (70 C, 2 h) is in the maker\'s drying table already registered as R-FILLAMENTUM-PRIORITY-20261003-3f22b7dd7442 (not applied to this grade here).',
    sourceNote: 'Fillamentum\'s own 3D printing guide for NonOilen, version updated 8/2024 (one page). It prints two printer setups (basic non high-speed printers, and high-speed printers), a heated-chamber statement and a drying schedule that the registered 2020 TDS does not, or prints differently (nozzle 175-195 C, re-dry 65 C for 2 h); both stand.',
  },
  {
    file: 'm154', grade: 'G154-01', maker: 'Fillamentum', slug: 'FILLAMENTUM', title: 'Fillamentum Nylon AF80 Aramid 3D printing guide',
    url: 'https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_Nylon_AF80_Aramid.pdf', orig: 'https://fillamentum.com/wp-content/uploads/2020/10/FI_Printing_Guide_Nylon_AF80_Aramid.pdf', captured: null,
    revision: 'Not published', publication: 'Not published', sourceClass: 'Manufacturer product page or guide', kind: 'Manufacturer published guidance', block: 'printing guide',
    profiles: [{
      locator: 'Printing guide', evidence: 'Printing temperature: 235 – 255 °C Heated bed surface: PEI, mirror / glass',
      cells: { nozzle: '235 – 255 °C', bed: '90 – 110 °C', chamber: 'recommended', enclosure: 'Heated chamber / enclosure: recommended', plate: 'PEI, mirror / glass', drying: '80 °C for 3 hours', abrasion: 'It is recommended to use wear-resistant nozzles (hardened steel, ruby, Dexdo nozzle etc.) due to the content of aramid fibers' },
      lines: { nozzle: 'Printing temperature: 235 – 255 °C Heated bed surface: PEI, mirror / glass', bed: 'Heated bed temperature: 90 – 110 °C Adhesive: Magigoo PA, PVA glue', chamber: 'Part cooling fan: 0 % Heated chamber / enclosure: recommended', enclosure: 'Part cooling fan: 0 % Heated chamber / enclosure: recommended', plate: 'Printing temperature: 235 – 255 °C Heated bed surface: PEI, mirror / glass', drying: 'of moisture are 80 °C for 3 hours.', abrasion: 'Nozzle - It is recommended to use wear-resistant nozzles (hardened steel, ruby, Dexdo nozzle etc.) due to the' },
      notes: [['Speed', '30 – 50 mm/s'], ['Cooling', '0 %'], ['Adhesion / release', 'Adhesive: Magigoo PA, PVA glue; Raft / skirt / brim: Brim >10 mm / raft']],
    }],
    skipped: 'The guide\'s nozzle and bed windows equal the registered TDS\'s; the guide adds the enclosure recommendation, the re-drying schedule (80 C for 3 hours; the maker\'s drying table, already registered, prints 80 C, minimum 4 h, as a separate statement) and the wear-resistant nozzle advice.',
    sourceNote: 'Fillamentum\'s own 3D printing guide for Nylon AF80 Aramid (polyamide 12 with 8 % aramid fibres), one page. It prints the heated chamber / enclosure recommendation, the re-drying schedule and the wear-resistant nozzle advice that the registered TDS does not.',
  },
];

// ---- build -----------------------------------------------------------------------------------------------------
const t = openTables();
const cache = process.env.H2C_DOCUMENT_CACHE;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [], expectedGrades = [];

for (const d of docs) {
  const bytes = readFileSync(`.b41tmp/${d.file}.bin`);
  const digest = sha(bytes);
  const pdf = bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const grade = t.get('grades', d.grade);
  if (!grade) throw new Error(`${d.grade} missing`);
  const gradeRow = { ...grade };
  expectedGrades.push(gradeRow);
  const sourceId = `R-${d.slug}-READER-20261004-${digest.slice(0, 12)}`;
  const archived = !!d.captured;
  const source = {
    SourceID: sourceId, Publisher: d.maker, Title: d.title,
    Revision: d.revision ?? (archived ? `Internet Archive capture of ${d.captured}` : 'Not published'),
    'Publication date': d.publication ?? 'Not published', 'Access date': DATE,
    'Source class': d.sourceClass ?? 'Manufacturer product page or guide',
    'Source note': d.sourceNote,
    'Citation role': 'cited', URL: d.url, Locator: 'Document / exact product page',
    'Applicable grades': d.grade, 'Access state': 'retrieved',
    'Access note': archived
      ? `Fetched ${DATE} by Claude Sonnet (reader round b41) as the raw capture (id_) of ${d.orig}; the Internet Archive replays the page's own content encoding, and the decoded HTML is the document hashed. Staged by digest (ingest:witness --from); the page's maker does not serve it now.`
      : `Fetched ${DATE} by Claude Sonnet (reader round b41) from the maker's address; staged by digest (ingest:witness --from).`,
    SHA256: digest,
  };

  const profiles = [];
  for (const [i, p] of d.profiles.entries()) {
    const settings = [];
    const push = (field, raw, line, label) => settings.push({ page: 1, field, topic: '', label, raw, fromBelow: false, line });
    const c = p.cells;
    if (c.nozzle) push('nozzle', c.nozzle, p.lines.nozzle, 'Nozzle temperature');
    if (c.bed) push('bed', c.bed, p.lines.bed, 'Bed temperature');
    if (c.chamber) push('chamber', c.chamber, p.lines.chamber, 'Heated chamber');
    if (c.enclosure) push('enclosure', c.enclosure, p.lines.enclosure, 'Enclosure');
    if (c.plate) push('plate', c.plate, p.lines.plate, 'Build surface');
    if (c.drying) push('drying', c.drying, p.lines.drying, 'Drying');
    if (c.nozzleMaterial) push('nozzle-material', c.nozzleMaterial, p.lines.nozzleMaterial, 'Nozzle specs');
    if (c.diameter) push('nozzle-diameter', c.diameter, p.lines.diameter ?? p.lines.nozzleMaterial, 'Nozzle diameter');
    const made = profileFor(settings, { sourceId, materialId: grade.MaterialID, locator: p.locator });
    if (!made) throw new Error('no profile');
    const row = made.row;
    // profileFor fills Abrasion / clogging only from a nozzle-material line that affirms; the pages state the hardness
    // in the words recorded here, which the parser reads (Hardened nozzle) and the audit checks against the page.
    if (c.abrasion) {
      row['Abrasion / clogging'] = c.abrasion;
      if (parseAbrasion(c.abrasion).requiresHardened !== true) throw new Error(`${d.grade}: the hardness words do not parse as a hardened nozzle`);
      row['Hardened nozzle'] = 'TRUE';
      if (!c.nozzleMaterial) row['Nozzle material'] = 'Not published';
    }
    row.Profile = d.kind;
    row.GradeID = d.grade; row.MaterialID = grade.MaterialID;
    row.Locator = `p. 1: ${p.locator}`;
    if (p.enclosureState) {
      if (parseEnclosure(row.Enclosure).state === p.enclosureState) throw new Error('override not needed');
      row['Enclosure state'] = p.enclosureState;
    }
    if (p.parseReview) row['Parse review'] = p.parseReview;
    // the sheet's own line is the row's evidence: the first named setting
    profiles.push({
      gradeKey: 'main', row,
      notes: p.notes.map(([Topic, Text]) => ({ Topic, Text })),
      evidence: { page: 1, text: p.evidence },
      review: { status: 'accepted', by: BY, visual: pdf, note: `Read from the cached text${pdf ? ' and the page image' : ''}; every cell is the page's own words and the typed columns are the parsers' reading.` },
    });
    void i;
  }

  const proposal = {
    version: 1, generated: { tool: 'build-b41.mjs (reader round)', date: DATE },
    document: { sha256: digest, url: d.url, pages: 1, provider: d.maker, manufacturer: d.maker, docKey: `${d.url}#witness-for=source:${grade.SourceID}` },
    identity: { polymer: null, note: `exact product ${d.grade} (${grade.Manufacturer} ${grade['Product name']}) of ${grade.MaterialID}; identity unchanged` },
    source: { row: source, evidence: { page: 1, text: d.title }, review: { status: 'accepted', by: BY } },
    grades: [{ key: 'main', row: gradeRow, review: { status: 'accepted', by: BY, note: 'Existing exact product binding; the grade, its material and its primary source are unchanged.' } }],
    measurements: [], profiles, evidence: [], headlines: [], coverage: [], settings: [],
    skipped: [{ note: d.skipped }],
    review: { status: 'reviewed', by: BY, note: `Maker document for the existing product ${d.grade}: print settings only (${profiles.length} profile row(s)); no measurement is entered. ${d.skipped}` },
  };
  const name = `${digest.slice(0, 16)}.json`;
  const text = `${JSON.stringify(proposal, null, 2)}\n`;
  writeFileSync(join(OUT, name), text);
  packetDocs.push({
    File: name, Extension: pdf ? 'pdf' : 'html', ProposalSHA256: sha(text), OriginalSHA256: digest,
    Source: source, ProposedProfiles: profiles.map((p) => ({ row: p.row, notes: p.notes })),
    Skipped: d.skipped,
  });
}
void TDS_TABLE; void cache; void readdirSync;
// A live "Print setup" Gap beside print settings that now exist is untrue (COVERAGE-UNTRUE): the migration supersedes it, never edits it (D72).
const materialsHere = new Set(docs.map((d) => t.get('grades', d.grade).MaterialID));
const expectedCoverage = t.rows('coverage').filter((c) => materialsHere.has(c.MaterialID) && c.Domain === 'Print setup' && c.Status === 'Gap').map((c) => ({ ...c }));
const packet = {
  PacketID: 'b41-maker-pages', Batch: 'b41', ExpectedGrades: expectedGrades, ExpectedCoverage: expectedCoverage, Documents: packetDocs,
  Review: { prepared_by: 'Claude Sonnet (reader round b41)', for: 'Claude Opus', scope: 'print settings only; no measurement' },
  NotAdmitted: [
    { Material: 'M114', Why: 'the lead is the TPU 90A page (ESD-Flex), a different product from ESD-TPC 92A' },
    { Material: 'M174', Why: 'the nice-cdn "v2" Crystal Flex sheet has the same SHA-256 (95dd0c3f...) as the registered S-PET-TDS-Crystal-Flex: a copy is not a source; the 3DJake page is a retailer' },
    { Material: 'M078/M079/M137/M139/M175/M166/M056/M058/M060', Why: 'as the owner\'s instruction: nothing new, complete, no fetchable source or no exact product' },
    { Material: 'M146/M154 drying table', Why: 'the 12 Oct 2023 drying table is already registered (R-FILLAMENTUM-PRIORITY-20261003-3f22b7dd7442)' },
  ],
};
writeFileSync('docs/audits/2026-10-04-reader-round/ingest/b41-packet.json', `${JSON.stringify(packet, null, 2)}\n`);
console.log(`${packetDocs.length} proposals; packet sha ${sha(JSON.stringify(packet, null, 2) + '\n').slice(0, 12)}`);
