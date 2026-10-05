// b44: the proposals of gap round 2's maker-page batch, written from the pages and guide the lead-finder
// (docs/audits/2026-10-05-gap-round-2/site-leads.csv) pointed at for products whose registered sheets leave the print
// settings unpublished.
//
// Every document is the maker's own (its web.archive.org capture where the live page is gone) for the exact product of
// the GradeID it witnesses. This file is the reviewer's reading of each, line by line against the cached text
// (`text.mjs <sha>`): the words of every cell are the page's own, the typed columns are the build's parsers' reading of
// them (profileFor -> profileCellsFromParsed), and nothing is entered that the page does not print. Run from the
// project root with H2C_DOCUMENT_CACHE set as for the batch and B44_BYTES naming the folder the fetched bytes were saved
// in (fetch-b44.sh):
//
//   B44_BYTES=<dir> node docs/audits/2026-10-05-gap-round-2/ingest/build-b44.mjs
//
// It writes proposals/b44/<sha16>.json, ../ingest/b44-packet.json (the packet the migration pins) and
// staged-manifest-b44.csv (the manifest `ingest:witness --from` stages).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables } from '../../../../scripts/data/table-io.mjs';
import { profileFor } from '../../../../scripts/ingest/propose.mjs';
import { parseAbrasion } from '../../../../build/src/normalize/process.js';

const BY = 'Claude Sonnet (gap round 2, b44), checked by Claude Opus';
const DATE = '2026-10-05';
const HERE = 'docs/audits/2026-10-05-gap-round-2/ingest';
const OUT = `${HERE}/proposals/b44`;
const BYTES = process.env.B44_BYTES;
if (!BYTES) throw new Error('B44_BYTES names the folder of fetched bytes');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const A = 'http://web.archive.org/web/';
const stamp = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)} UTC`;
const PAGE = 'Manufacturer product page or guide';
const NOW = 'Current manufacturer product guidance';

// What each product's registered profiles leave unpublished (read from data/tables/profiles.csv on 2026-10-05).
const MISSING = {
  'G026-06': 'nozzle, chamber and drying', 'G029-09': 'nozzle, bed and chamber', 'G059-03': 'nozzle, bed and chamber', 'G068-04': 'nozzle, bed and chamber',
  'G071-04': 'nozzle, bed and chamber', 'G071-05': 'nozzle, bed and chamber', 'G080-03': 'nozzle, bed and chamber',
  'G029-11': 'nozzle, bed, chamber and drying', 'G030-11': 'nozzle, bed, chamber and drying', 'G084-01': 'nozzle, bed, chamber and drying',
  'G020-01': 'nozzle, bed and drying', 'G049-09': 'the drying time', 'G137-03': 'the nozzle', 'G167-03': 'chamber, plate and drying', 'G167-06': 'chamber, plate and drying',
  'G168-03': 'drying', 'G168-04': 'drying', 'G014-21': 'a second statement of the nozzle and bed', 'G171-02': 'the enclosure', 'G149-04': 'nozzle, bed and enclosure',
};

const raise3d = (o) => ({
  maker: 'Raise3D', slug: 'RAISE3D', kind: NOW, block: 'Printing Guide: Recommended Print Settings', sourceClass: PAGE, ...o,
  profiles: [{
    locator: 'Printing Guide: Recommended Print Settings; Printing Notifications',
    evidence: o.lines.nozzle,
    cells: o.cells, lines: o.lines, notes: o.notes,
  }],
});

// One entry per document. `cells` are the page's words per column; `lines` the printed line each came from; `notes` are [topic, text].
const docs = [
  // ---- Raise3D's own materials pages ----
  raise3d({
    file: 'g026-06', grade: 'G026-06', title: 'PETG ESD', url: 'https://www.raise3d.com/materials/petg-esd/',
    cells: { nozzle: '260-280℃', bed: '70-80℃', drying: '60℃ for 6-12 hours' },
    lines: { nozzle: 'Nozzle temperature (°C) 260-280℃', bed: 'Bed temperature (°C) 70-80℃', drying: 'Drying temperature (°C) 60℃ for 6-12 hours' },
    notes: [['Layer height', '0.1-0.25 mm'], ['Speed', '20-80 mm/s'], ['Cooling', 'Cooling fan Off'],
      ['Shell / walls', 'we recomend to print model with higher infill density and minimal wall thickness of 1.5 mm for a better interlayer bonding quality and ESD property'],
      ['Adhesion / release', 'brim or raft are recommended']],
    skipped: 'The page prints no chamber, enclosure or nozzle-hardness statement. "set bed temperature at 80 °C" for a better bed adhesion is the bed window\'s upper end, not a second setting. The registered V3 sheet is older than the maker\'s TDS V4.0 (July 2026), which prints a specimen setting (245 C nozzle, 80 C plate) for the test bars and no window; the product page is the guidance and V4.0 is not entered.',
  }),
  raise3d({
    file: 'g029-09', grade: 'G029-09', title: 'Hyper Core ABS CF15', url: 'https://www.raise3d.com/materials/hyper-core-abs-cf15/',
    cells: { nozzle: '260-280℃', bed: '70-90℃', drying: '60-80℃',
      abrasion: 'Using an abrasion-resistant nozzle, at minimum a Steel nozzle should be used or preferably, a SiC nozzle.' },
    lines: { nozzle: 'Nozzle temperature (°C) 260-280℃', bed: 'Build platform temperature (°C) 70-90℃', drying: 'Drying temperature (°C) 60-80℃' },
    notes: [['Layer height', '0.2 mm'], ['Speed', '50-300 mm/s'], ['Cooling', 'Cooling fan Off'], ['Odour / emissions', 'Please print in a well-ventilated environment.']],
    skipped: 'The page prints no chamber or enclosure statement. Below the table it says "Drying isn\'t usually necessary, but if so, it\'s recommended to dry the filament at 60-80ºC for 6-8 hours": the cell keeps the table\'s own "60-80℃" because the sentence spells the unit with an ordinal indicator (º) that the temperature parser does not read as a degree sign, so its time cannot be typed.',
  }),
  raise3d({
    file: 'g059-03', grade: 'G059-03', title: 'PA12 CF+', url: 'https://www.raise3d.com/materials/pa12-cf-plus/',
    cells: { nozzle: '260-290℃', bed: '60℃', drying: 'at 80°C for 12 hours before printing',
      abrasion: 'Using an abrasion-resistant nozzle, at minimum a Steel nozzle should be used or preferably, a SiC nozzle.' },
    lines: { nozzle: 'Nozzle temperature (°C) 260-290℃', bed: 'Bed temperature (°C) 60℃', drying: 'Dry PA12 CF+ at 80°C for 12 hours before printing, as having low moisture content is crucial for the quality of the final printed part.' },
    notes: [['Layer height', '0.15-0.25 mm (with 0.4mm nozzle)'], ['Speed', '35-100 mm/s'], ['Cooling', 'Cooling fan On']],
    skipped: 'The page prints no chamber or enclosure statement. The settings table prints "Drying temperature (°C) 70-80℃ (with 1.0-2.0kW heating or drying oven)"; the cell keeps the sentence\'s schedule (its "Dry PA12 CF+" opening is left out because the parser would read the 12 of "PA12" as a temperature). The annealing advice (80-100 C for 8-12 h) and the dry-box storage sentence are not print settings a column holds.',
  }),
  raise3d({
    file: 'g068-04', grade: 'G068-04', title: 'PET GF', url: 'https://www.raise3d.com/materials/pet-gf/',
    cells: { nozzle: '280-300℃', bed: '80-100℃', drying: '70-80°C for 8 to 12 hours',
      abrasion: 'Using an abrasion-resistant nozzle, at minimum a Steel nozzle should be used or preferably, a SiC nozzle.' },
    lines: { nozzle: 'Nozzle temperature (°C) 280-300℃', bed: 'Bed temperature (°C) 80-100℃', drying: 'Drying temperature (°C) 70-80°C for 8 to 12 hours' },
    notes: [['Layer height', '0.1-0.25 mm'], ['Speed', '35-90 mm/s'], ['Cooling', 'Cooling fan ON']],
    skipped: 'The page prints no chamber or enclosure statement. The annealing advice (80-100 C for 8-12 h, with the Z shrinkage it causes) is not a print setting a column holds.',
  }),
  raise3d({
    file: 'g071-04', grade: 'G071-04', title: 'PPA GF', url: 'https://www.raise3d.com/materials/ppa-gf/',
    cells: { nozzle: '280-320℃', bed: '65-80℃', drying: '80-100°C for 4 to 6 hours',
      abrasion: 'Using an abrasion-resistant nozzle, at minimum a Steel nozzle should be used or preferably, a SiC nozzle.' },
    lines: { nozzle: 'Nozzle temperature (°C) 280-320℃', bed: 'Bed temperature (°C) 65-80℃', drying: 'Drying temperature (°C) 80-100°C for 4 to 6 hours' },
    notes: [['Layer height', '0.1-0.25 mm'], ['Speed', '30-120 mm/s'], ['Cooling', 'Cooling fan OFF']],
    skipped: 'The page prints no chamber or enclosure statement. The annealing advice (80-100 C for 4 to 8 h) is not a print setting a column holds. The page is Industrial PPA GF, not Hyper Core PPA GF25 (G071-05), which has its own page.',
  }),
  raise3d({
    file: 'g071-05', grade: 'G071-05', title: 'Hyper Core PPA GF25', url: 'https://www.raise3d.com/materials/hyper-core-ppa-gf25/',
    cells: { nozzle: '300-330℃', bed: '70-80℃', drying: 'at least 8 hours at 80-100°C or more',
      abrasion: 'Using an abrasion-resistant nozzle, at minimum a Steel nozzle should be used or preferably, a SiC nozzle.' },
    lines: { nozzle: 'Nozzle temperature (°C) 300-330℃', bed: 'Build platform temperature (°C) 70-80℃',
      drying: 'Please dry the filament for a long time, at least 8 hours at 80-100°C or more to get the full print quality of Raise3D Hyper Core PPA GF25.' },
    notes: [['Layer height', '0.1-0.25 mm'], ['Speed', '25-300 mm/s'], ['Cooling', 'Cooling fan On']],
    skipped: 'The page prints no chamber or enclosure statement. The settings table prints "Drying temperature (°C) 80-100℃"; the cell keeps the sentence that adds the time. The annealing advice and the dry-box sentence are not print settings a column holds.',
  }),
  raise3d({
    file: 'g080-03', grade: 'G080-03', title: 'PET Support', url: 'https://www.raise3d.com/materials/pet-support/',
    cells: { nozzle: '260℃-300℃', bed: '60-80℃', drying: '70-80℃ for 8-12 hours',
      abrasion: 'It is recommended to use a hardened steel nozzle, tungsten steel, or ruby nozzle to avoid nozzle abrasion.' },
    lines: { nozzle: 'Nozzle temperature (°C) 260℃-300℃', bed: 'Bed temperature (°C) 60-80℃', drying: 'Drying temperature (°C) 70-80℃ for 8-12 hours' },
    notes: [['Layer height', '0.1-0.25 mm'], ['Speed', '35-120 mm/s'], ['Cooling', 'Cooling fan ON'],
      ['Storage humidity', 'PET Support is sensitive to moisture and should be stored and used under dry conditions (Surrounding humidity below 15%).']],
    skipped: 'The page prints no chamber or enclosure statement.',
  }),

  // ---- 3DXTECH: the Triton3D model-material pages (identity: the maker\'s directory page), two archived pages, WearX ----
  {
    file: 'g029-11', grade: 'G029-11', maker: '3DXTECH', slug: '3DXTECH', title: 'TRITON3D™ ABS+CF - Stratasys® Compatible', url: 'https://3dxtech.com/products/triton-abs-cf-1',
    requested: 'https://3dxtech.com/products/triton-abs-cf-1',
    kind: NOW, block: 'Print Recommendations', sourceClass: PAGE,
    identity: ' Identity: 3DXTECH\'s own Triton3D data-sheet directory (https://www.3dxtech.com/pages/triton3d-downloadable-tds-and-sds, SHA-256 fd2601081c2b, fetched the same day) lists "TriMax CF-ABS" against this page, and this page links TriMax_CF_ABS_TDS_v1.pdf, the file the registered sheet X-ECOMAX-TriMax-CF-ABS-TDS-v1 is.',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp  220-240C',
      cells: { nozzle: '220-240C', bed: '100-110C', chamber: 'Recommended', nozzleMaterial: 'Hardened Steel with .4mm diameter minimum', diameter: '.4mm diameter minimum', drying: '80C for 4 hours',
        abrasion: 'Hardened Steel with .4mm diameter minimum' },
      lines: { nozzle: 'Extruder Temp  220-240C', bed: 'Bed Temp  100-110C', chamber: 'Heated Chamber  Recommended', nozzleMaterial: 'Nozzle Specs  Hardened Steel with .4mm diameter minimum', diameter: 'Nozzle Specs  Hardened Steel with .4mm diameter minimum', drying: 'Drying Specs  80C for 4 hours' },
      notes: [['Layer height', '0.25mm or higher']],
    }],
    skipped: 'The page is titled TRITON3D ABS+CF; the maker\'s directory and the TDS file name are what tie it to the registered "TriMax Carbon Fiber ABS Model Material". A Stratasys-compatible canister is set by the printer, but the page prints the figures and they are entered as printed.',
  },
  {
    file: 'g030-11', grade: 'G030-11', maker: '3DXTECH', slug: '3DXTECH', title: 'TRITON3D™ ESD-ABS - Stratasys® Compatible', url: 'https://www.3dxtech.com/products/triton-esd-abs-1',
    kind: NOW, block: 'Print Recommendations', sourceClass: PAGE,
    identity: ' Identity: 3DXTECH\'s own Triton3D data-sheet directory (https://www.3dxtech.com/pages/triton3d-downloadable-tds-and-sds, SHA-256 fd2601081c2b, fetched the same day) lists "TriStat ESD-ABS" against this page, and this page links TriStat_ESD_ABS_TDS_v1.pdf, the file the registered sheet X-ECOMAX-TriStat-ESD-ABS-TDS-v1 is.',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp  220-240C',
      cells: { nozzle: '220-240C', bed: '100-110C', chamber: 'Recommended', nozzleMaterial: 'No special concerns', drying: '80C for 4 hours' },
      lines: { nozzle: 'Extruder Temp  220-240C', bed: 'Bed Temp  100-110C', chamber: 'Heated Chamber  Recommended', nozzleMaterial: 'Nozzle Specs  No special concerns', drying: 'Drying Specs  80C for 4 hours' },
      notes: [['Layer height', 'No special concerns']],
    }],
    skipped: 'The page is titled TRITON3D ESD-ABS; the maker\'s directory and the TDS file name are what tie it to the registered "TriStat ESD-ABS Model Material". The maker\'s separate 3DXSTAT ESD-ABS spool page is another product and is not used.',
  },
  {
    file: 'g084-01', grade: 'G084-01', maker: '3DXTECH', slug: '3DXTECH', title: 'FibreX™ PP+GF30 Polypropylene', url: `${A}20240618193856id_/https://www.3dxtech.com/product/fibrex-pp-gf30-polypropylene/`, captured: '20240618193856',
    orig: 'https://www.3dxtech.com/product/fibrex-pp-gf30-polypropylene/', gone: 'the live address now answers 404 and the maker\'s 2025 page draws its settings by script',
    kind: NOW, block: 'Print Recommendations', sourceClass: PAGE,
    identity: ' Identity: the registered sheet X-FIBREX-GF-PP-TDS-v1 is titled "FibreX PP+GF30 3D Printing Filament" and this page links the maker\'s GF_PP_v1.pdf for the same product.',
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp 240-270°C',
      cells: { nozzle: '240-270°C', bed: '80-110°C', chamber: 'Not required', nozzleMaterial: '0.4mm diameter minimum Hardened Steel Nozzle', diameter: '0.4mm diameter minimum', drying: '4 Hours at 65°C',
        abrasion: 'We highly recommend a hardened steel nozzle with a minimum diameter of 0.4mm for abrasive materials such as this' },
      lines: { nozzle: 'Extruder Temp 240-270°C', bed: 'Bed Temp 80-110°C', chamber: 'Heated Chamber Not required', nozzleMaterial: 'Nozzle Specs 0.4mm diameter minimum Hardened Steel Nozzle', diameter: 'Nozzle Specs 0.4mm diameter minimum Hardened Steel Nozzle', drying: 'Drying Specs 4 Hours at 65°C' },
      notes: [['Layer height', '0.25mm or higher'], ['Adhesion / release', 'Magigoo Bed Prep']],
    }],
    skipped: 'The same page also prints "Typically does not absorb moisture, no drying required!" beside its "Drying Specs 4 Hours at 65°C": the drying cell keeps the Print Recommendations line and this sentence is the other side of the same statement. The "Ideal layer height is 60% of nozzle diameter" advice duplicates the layer note.',
  },
  {
    file: 'g020-01', grade: 'G020-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXPro™ Low-Gloss PETG Filament', url: `${A}20210422202454id_/https://www.3dxtech.com/product/3dxpro-low-gloss-petg/`, captured: '20210422202454',
    orig: 'https://www.3dxtech.com/product/3dxpro-low-gloss-petg/', gone: 'the maker discontinued Low-Gloss PETG and the live address is gone',
    kind: NOW, block: 'General Print Recommendations', sourceClass: PAGE,
    profiles: [{
      locator: 'General Print Recommendations', evidence: 'Ideal extruder temp is 260 to 280°C',
      cells: { nozzle: '260 to 280°C', bed: '60 – 80°C' },
      lines: { nozzle: 'Ideal extruder temp is 260 to 280°C, or higher depending on your printer / thermocouple set-up', bed: 'Platform Temp: 60 – 80°C' },
      notes: [['Adhesion / release', 'Magigoo Bed Prep Adhesive']],
    }],
    skipped: 'The nozzle window is "Ideal ... 260 to 280°C, or higher depending on your printer / thermocouple set-up": the open upper end ("some users report requiring temps up to 290°C") is advice on the printer, not a second window, and is not entered. The platform-prep line also names "Clean glass w/ 4mm Kapton Tape", one of two options and not entered. "Please see the drying instructions" gives no schedule. The page announces the product\'s discontinuation.',
  },
  {
    file: 'g049-09', grade: 'G049-09', maker: '3DXTECH', slug: '3DXTECH', title: 'WEARX™ NYLON 6', url: 'https://www.3dxtech.com/products/wearx-1', requested: 'https://3dxtech.com/product/wear-resistant-pa6',
    kind: NOW, block: 'Print Recommendations', sourceClass: PAGE,
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Extruder Temp  260-275C',
      cells: { nozzle: '260-275C', bed: '80-95C', chamber: 'Recommended', diameter: '0.2mm or Larger', drying: '90C for 4-6 hours' },
      lines: { nozzle: 'Extruder Temp  260-275C', bed: 'Bed Temp  80-95C', chamber: 'Heated Chamber  Recommended', diameter: 'Nozzle Specs  0.2mm or Larger', drying: 'Drying Specs  90C for 4-6 hours' },
      notes: [['Layer height', '0.15mm or Larger']],
    }],
    skipped: 'The page is titled WEARX NYLON 6 ("WearX PA6"); the registered sheet is the maker\'s WearX Wear Resistant PA6 Copolymer. It prints the drying time (4-6 hours) that the registered sheet\'s "90°C" lacks; the rest repeats it.',
  },

  // ---- Fabru (purefil), Fiberlogy, Extrudr, Fillamentum, FormFutura ----
  {
    file: 'g137-03', grade: 'G137-03', maker: 'Fabru', slug: 'FABRU', title: 'purefil COC flex transparent 0.75kg 1.75mm', url: 'https://www.purefil.de/en/filament/coc/purefil-coc-flex-filament_1297_10017/',
    kind: NOW, block: 'product data', sourceClass: PAGE,
    identity: ' purefil is Fabru\'s own brand and shop; the page lists the sheet "Material-datasheet-COC-flex-purefil-EN.pdf" the registered sheet is.',
    profiles: [{
      locator: 'Product data', evidence: 'Nozzle temperature: 240-280 ° C',
      cells: { nozzle: '240-280 ° C', bed: '60-80 ° C' },
      lines: { nozzle: 'Nozzle temperature: 240-280 ° C', bed: 'Printing table temperature: 60-80 ° C' },
      notes: [],
    }],
    skipped: 'The page prints no chamber, enclosure or drying statement. The registered sheet prints a 50-70 C bed and a chamber figure; this page\'s bed window (60-80 C) differs and is kept as a second profile from its own source.',
  },
  ...[
    ['g167-03', 'G167-03', 'FiberFlex 30D', 'https://fiberlogy.com/en/filaments/flex-en/fiberflex-30d-en/', 'Print temperature: 200–220°C', '<35 mm/s'],
    ['g167-06', 'G167-06', 'FiberFlex 40D', 'https://fiberlogy.com/en/filaments/flex-en/fiberflex-40d-en/', 'Printing temperature: 200–220°C', '< 45 mm/s'],
  ].map(([file, grade, title, url, nozzleLine, speed]) => ({
    file, grade, maker: 'Fiberlogy', slug: 'FIBERLOGY', title, url, kind: NOW, block: 'Printing Parameters', sourceClass: PAGE,
    profiles: [{
      locator: 'Technical Data: Printing Parameters', evidence: nozzleLine,
      cells: { nozzle: '200–220°C', bed: '70°C', enclosure: 'not required', plate: 'Smooth PEI + masking tape or adhesive; Textured PEI + adhesive; Glass + masking tape or adhesive', drying: '60°C / 4 hours' },
      lines: { nozzle: nozzleLine, bed: 'Bed temperature: 70°C', enclosure: 'Enclosed chamber: not required', plate: 'Build surface: Smooth PEI + masking tape or adhesive; Textured PEI + adhesive; Glass + masking tape or adhesive', drying: 'Drying conditions: 60°C / 4 hours' },
      notes: [['Speed', `Maximum recommended print speed: ${speed}`]],
    }],
    skipped: 'The page also prints "Humidity: 50–75%" among the parameters; it names no condition (print room or filament) and is not entered. The registered sheet prints the nozzle and bed windows (200-220 C, 50-70 C); this page\'s bed is 70 C and it adds the enclosure, build surface and drying statements.',
  })),
  {
    file: 'g168-03', grade: 'G168-03', maker: 'Extrudr', slug: 'EXTRUDR', title: 'GreenTEC Pro', url: 'https://extrudr.com/en/de/products/greentec-pro/', requested: 'https://extrudr.com/en/shop-eu/products/greentec-pro/',
    kind: NOW, block: 'Print Settings; Drying', sourceClass: PAGE,
    profiles: [{
      locator: 'Print Settings; Drying', evidence: 'Nozzle temperature  210–230 °C',
      cells: { nozzle: '210–230 °C', bed: '20–90 °C', enclosure: 'Enclosed chamber required No', abrasion: 'Hardened nozzle required No', drying: 'Drying temperature 60 °C Drying time 0–4 h' },
      lines: { nozzle: 'Nozzle temperature  210–230 °C', bed: 'Build plate temperature  20–90 °C', enclosure: 'Enclosed chamber required  No', drying: 'Drying temperature 60 °C' },
      notes: [['Speed', '20–200 mm/s'], ['Cooling', '30–80 %']],
    }],
    skipped: 'The shop answers the maker\'s shop-eu address with a redirect to its English page for the German market (/en/de/). The registered sheet prints the nozzle, bed and enclosure; this page adds the drying statement (60 C, 0-4 h) and speed and fan ranges. "Max. volumetric flow rate 16 mm³/s" and the 0.4 mm nozzle caveat are not settings a column holds. The FAQ says the filament "does not require drying before use".',
  },
  {
    file: 'g168-04', grade: 'G168-04', maker: 'Extrudr', slug: 'EXTRUDR', title: 'GreenTEC', url: 'https://extrudr.com/en/it/products/greentec/',
    kind: NOW, block: 'Print Settings; Drying', sourceClass: PAGE,
    profiles: [{
      locator: 'Print Settings; Drying', evidence: 'Nozzle temperature  200–230 °C',
      cells: { nozzle: '200–230 °C', bed: '20–90 °C', enclosure: 'Enclosed chamber required No', abrasion: 'Hardened nozzle required No', drying: 'Drying temperature 60 °C Drying time 0–4 h' },
      lines: { nozzle: 'Nozzle temperature  200–230 °C', bed: 'Build plate temperature  20–90 °C', enclosure: 'Enclosed chamber required  No', drying: 'Drying temperature 60 °C' },
      notes: [['Speed', '20–200 mm/s'], ['Cooling', '30–80 %']],
    }],
    skipped: 'The registered sheet prints the nozzle, bed and enclosure; this page adds the drying statement (60 C, 0-4 h) and speed and fan ranges. "Surface preparation Not required" and "Max. volumetric flow rate 16 mm³/s" are not settings a column holds. The FAQ says the filament "does not require drying before use". The page is GreenTEC, not the Pro or CF variants.',
  },
  {
    file: 'g014-21', grade: 'G014-21', maker: 'Fillamentum', slug: 'FILLAMENTUM', title: 'Timberfill®', url: 'https://fillamentum.com/collections/timberfill-filament/',
    kind: NOW, block: 'product page header', sourceClass: PAGE,
    profiles: [{
      locator: 'Product page header', evidence: 'Working temperature:  165-185 °C',
      cells: { nozzle: '165-185 °C', bed: '40-55 °C' },
      lines: { nozzle: 'Working temperature:  165-185 °C', bed: 'Heated bed:  40-55 °C' },
      notes: [],
    }],
    skipped: 'The page labels the nozzle window "Working temperature". The registered 2019 sheet prints 150-170 C and 50-60 C; this current page prints other windows and is kept as a second profile from its own source. It links the maker\'s print guide, not opened.',
  },
  {
    file: 'g149-04', grade: 'G149-04', maker: 'FormFutura', slug: 'FORMFUTURA', title: 'BioFil - PCL', url: 'https://www.formfutura.com/biofil-pcl',
    kind: NOW, block: 'General printing guidelines', sourceClass: PAGE,
    identity: ' BioFil is FormFutura\'s product line: the registered sheet R-FILAMENT2PRINT-BioFil-PCL is FormFutura\'s own "TECHNICAL DATA SHEET BioFil - PCL" (issued 10-10-2024, hosted by Filament2Print), and this page lists the same sheet as formfutura-tds-biofilpcl.pdf and its 1.75 mm variant as SKU BPCL-175NTRL-00500.',
    profiles: [{
      locator: 'General printing guidelines', evidence: 'Print temp: ± 95 – 130° C',
      cells: { nozzle: '± 95 – 130° C', bed: '± 40 – 50° C', enclosure: 'Enclosure needed: No', diameter: '≥ 0.4mm' },
      lines: { nozzle: 'Print temp: ± 95 – 130° C', bed: 'Heat bed: ± 40 – 50° C', enclosure: 'Enclosure needed: No', diameter: 'Nozzle size: ≥ 0.4mm' },
      notes: [['Layer height', '≥ 0.10mm'], ['Cooling', 'Fan speed: 10 – 50%']],
      parseReview: 'Fields: Nozzle min °C. The page prints a nozzle window of "± 95 – 130° C" for BioFil - PCL, a polycaprolactone that melts near 60 °C; the build\'s plausible nozzle window starts at 100 °C, so its parser drops the 95 and reads 130. The typed minimum is the page\'s own 95 (m363).',
    }],
    skipped: 'The grade\'s manufacturer is recorded as Filament2Print (the listing the sheet was found through); the maker of the product and of this page is FormFutura. The page covers the 1.75 mm and 2.85 mm variants with one set of guidelines. The drying and storage statement is already held (P1482).',
  },

  // ---- BASF Forward AM's own user guideline for Ultrafuse 316L ----
  {
    file: 'g171-02', grade: 'G171-02', maker: 'BASF Forward AM', slug: 'BASF', title: 'Ultrafuse 316L User Guidelines for 3D Printing Metal Parts', url: 'https://forward-am.com/wp-content/uploads/2021/01/User-Guidelines.pdf',
    kind: 'Manufacturer published guidance', block: 'Printing parameters; Printer requirements', sourceClass: PAGE, pdfPages: 9, visual: true,
    revision: 'Not published', publication: '2021',
    profiles: [{
      locator: 'Printing parameters (p. 3); Printer requirements (p. 5)', evidence: 'Nozzle temperature 230 °C –250 °C Actual temperature', locatorFull: 'p. 3: Printing parameters; p. 5: Printer requirements',
      pages: { nozzle: 3, bed: 3, diameter: 3, enclosure: 5 },
      cells: { nozzle: '230 °C –250 °C', bed: '90 °C – 120 °C', enclosure: 'it is recommended to have an enclosed printing chamber with a low chamber air flow', diameter: '0.40 mm' },
      lines: { nozzle: 'Nozzle temperature 230 °C –250 °C Actual temperature', bed: 'Bed temperature 90 °C – 120 °C Actual temperature', enclosure: 'Due to high warpage of the material, it is recommended to have an enclosed printing chamber with a low chamber air flow.', diameter: 'Nozzle size 0.40 mm Influenced by quality (details) and print time' },
      notes: [['Layer height', '0.15 mm; Range of 0.10 – 0.25 mm (Resolution)'], ['Speed', 'Default print speed 35 mm/s'], ['Cooling', 'No cooling; Part cooling increases warpage'],
        ['Retraction', 'Retraction distance (direct/Bowden) 1.5 mm/5.0 mm; Retraction speed 45 mm/s']],
    }],
    skipped: 'The user guideline is the maker\'s own document for Ultrafuse 316L (its product page, now marked discontinued, points to it). The Printer Requirements paragraph (p. 5) says "Due to high warpage of the material, it is recommended to have an enclosed printing chamber with a low chamber air flow", which the registered sheet lacks; the panel beside it lists "Enclosed chamber" and "Low chamber air flow" as minimum and "Enclosed and heated chamber" as recommended requirements. The page 3 and 5 text layers interleave their columns, so both were read on the page images. The guideline\'s nozzle and bed windows repeat the registered sheet\'s. Debinding and sintering sections are not print settings.',
  },
];

// ---- build -----------------------------------------------------------------------------------------------------
const t = openTables();
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const packetDocs = [], expectedGrades = new Map();

for (const d of docs) {
  const bytes = readFileSync(join(BYTES, `${d.file}.bin`));
  const digest = sha(bytes);
  const pdf = bytes.subarray(0, 5).toString('latin1') === '%PDF-';
  const grade = t.get('grades', d.grade);
  if (!grade) throw new Error(`${d.grade} missing`);
  expectedGrades.set(d.grade, { GradeID: grade.GradeID, MaterialID: grade.MaterialID, Manufacturer: grade.Manufacturer, 'Product name': grade['Product name'] });
  const sourceId = `R-${d.slug}-GAP2-20261005-${digest.slice(0, 12)}`;
  const archived = !!d.captured;
  const missing = MISSING[d.grade];
  const revision = d.revision ?? (archived ? `Internet Archive capture of ${stamp(d.captured)}` : 'Not published');
  const what = pdf ? 'user guideline' : archived ? 'product page as the Internet Archive captured it' : d.file === 'g014-21' ? 'collection page as served on 2026-10-05' : 'product page as served on 2026-10-05';
  const gone = archived ? ` The capture is used because ${d.gone}.` : '';
  const maker = d.maker;
  const sourceNote = pdf
    ? `${maker}'s own ${what} (${d.title}) for ${grade.Manufacturer} ${grade['Product name']} (${d.grade}): its ${d.block} sections. The registered sheet leaves ${missing} unpublished.`
    : `${maker}'s ${what} for ${d.title} (${grade.Manufacturer} ${grade['Product name']}, ${d.grade}): its ${d.block} block. The registered sheets leave ${missing} unpublished.${gone}${d.identity ?? ''}`;
  const source = {
    SourceID: sourceId, Publisher: d.maker, Title: d.title, Revision: revision, 'Publication date': d.publication ?? 'Not published', 'Access date': DATE,
    'Source class': d.sourceClass, 'Source note': sourceNote, 'Citation role': 'cited', URL: d.url, Locator: 'Document / exact product page',
    'Applicable grades': d.grade, 'Access state': 'retrieved',
    'Access note': (archived
      ? `Fetched ${DATE} by Claude Sonnet (gap round 2, b44) as the raw capture (id_) of ${d.orig}; the document hashed is the page's HTML exactly as the Internet Archive replayed it. Staged by digest (ingest:witness --from); the page's maker does not serve it now.`
      : `Fetched ${DATE} by Claude Sonnet (gap round 2, b44) from ${d.requested && d.requested !== d.url ? `${d.requested}, which the maker's server redirects to ${d.url}` : "the maker's address"}; staged by digest (ingest:witness --from).`),
    SHA256: digest,
  };

  const profiles = [];
  for (const p of d.profiles) {
    const settings = [];
    const push = (field, raw, line, label, key) => settings.push({ page: p.pages?.[key] ?? 1, field, topic: '', label, raw, fromBelow: false, line });
    const c = p.cells;
    if (c.nozzle) push('nozzle', c.nozzle, p.lines.nozzle, 'Nozzle temperature', 'nozzle');
    if (c.bed) push('bed', c.bed, p.lines.bed, 'Bed temperature', 'bed');
    if (c.chamber) push('chamber', c.chamber, p.lines.chamber, 'Heated chamber', 'chamber');
    if (c.enclosure) push('enclosure', c.enclosure, p.lines.enclosure ?? c.enclosure, 'Enclosure', 'enclosure');
    if (c.plate) push('plate', c.plate, p.lines.plate, 'Build surface', 'plate');
    if (c.drying) push('drying', c.drying, p.lines.drying ?? c.drying, 'Drying', 'drying');
    if (c.nozzleMaterial) push('nozzle-material', c.nozzleMaterial, p.lines.nozzleMaterial, 'Nozzle specs', 'nozzleMaterial');
    if (c.diameter) push('nozzle-diameter', c.diameter, p.lines.diameter ?? p.lines.nozzleMaterial, 'Nozzle diameter', 'diameter');
    const made = profileFor(settings, { sourceId, materialId: grade.MaterialID, locator: p.locator });
    if (!made) throw new Error('no profile');
    const row = made.row;
    // profileFor fills Abrasion / clogging only from a nozzle-material line that affirms; the pages state the hardness
    // in the words recorded here, which the parser reads (Hardened nozzle) and the audit checks against the page.
    if (c.abrasion) {
      const read = parseAbrasion(c.abrasion);
      if (read.requiresHardened == null) throw new Error(`${d.grade}: the abrasion words do not parse`);
      row['Abrasion / clogging'] = c.abrasion;
      row['Hardened nozzle'] = read.requiresHardened ? 'TRUE' : 'FALSE';
    }
    row.Profile = d.kind;
    row.GradeID = d.grade; row.MaterialID = grade.MaterialID;
    row.Locator = p.locatorFull ?? `p. 1: ${p.locator}`;
    if (p.parseReview) row['Parse review'] = p.parseReview;
    profiles.push({
      gradeKey: 'main', row,
      notes: p.notes.map(([Topic, Text]) => ({ Topic, Text })),
      evidence: { page: p.pages?.nozzle ?? 1, text: p.evidence },
      review: { status: 'accepted', by: BY, visual: !!d.visual, note: `Read from the cached text${d.visual ? ' and the page image' : ''}; every cell is the page's own words and the typed columns are the parsers' reading.` },
    });
  }

  const gradeRow = { ...grade };
  const proposal = {
    version: 1, generated: { tool: 'build-b44.mjs (gap round 2)', date: DATE },
    document: { sha256: digest, url: d.url, pages: pdf ? d.pdfPages : 1, provider: d.maker, manufacturer: d.maker, docKey: `${d.url}#witness-for=source:${grade.SourceID}` },
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

// The manifest `ingest:witness --from` stages: each document against the registered sheet of the product it witnesses.
// The maker's Triton3D directory page is staged beside them as the identity evidence of the two Triton3D pages; it
// has no proposal (it prints no settings).
const q = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const manifest = ['file,url,doc,for,provider,manufacturer,product,sha256,accessed,by'];
for (const d of docs) {
  const grade = t.get('grades', d.grade);
  const digest = sha(readFileSync(join(BYTES, `${d.file}.bin`)));
  manifest.push([`${d.file}.bin`, d.url, '', grade.SourceID, d.maker, d.maker, d.title, digest, DATE, 'Claude Sonnet (gap round 2, b44)'].map(q).join(','));
}
const DIRECTORY = 'https://www.3dxtech.com/pages/triton3d-downloadable-tds-and-sds';
const dirBytes = readFileSync(join(BYTES, 'triton-dir.bin'));
manifest.push(['triton-dir.bin', DIRECTORY, '', t.get('grades', 'G029-11').SourceID, '3DXTECH', '3DXTECH', 'Triton3D Technical and Safety Data Sheets (directory)', sha(dirBytes), DATE, 'Claude Sonnet (gap round 2, b44)'].map(q).join(','));
writeFileSync(join(BYTES, 'manifest.csv'), `${manifest.join('\n')}\n`);
writeFileSync(`${HERE}/staged-manifest-b44.csv`, `${manifest.join('\n')}\n`);

const packet = {
  PacketID: 'b44-maker-pages', Batch: 'b44', ExpectedGrades: [...expectedGrades.values()], Documents: packetDocs,
  IdentityEvidence: [{
    Document: '3DXTECH Triton3D Technical and Safety Data Sheets (directory page)', URL: DIRECTORY, SHA256: sha(dirBytes),
    Shows: 'a table that lists "TriMax CF-ABS" against https://www.3dxtech.com/products/triton-abs-cf-1 (TDS file TriMax_CF_ABS_TDS_v1.pdf) and "TriStat ESD-ABS" against https://www.3dxtech.com/products/triton-esd-abs-1 (TDS file TriStat_ESD_ABS_TDS_v1.pdf), the two files the registered sheets of G029-11 and G030-11 are',
    For: ['G029-11', 'G030-11'],
  }],
  Review: { prepared_by: 'Claude Sonnet (gap round 2, b44)', for: 'Claude Opus', scope: 'print settings only; no measurement' },
  NotAdmitted: [
    { Product: 'G149-01 iSANMATE Capa 6500 Polycaprolactone', Why: 'the only PCL page is a 3D-pen filament that never names Capa 6500: identity unconfirmed' },
    { Product: 'G164-08 Yousu Nylon', Why: 'the page\'s only temperature sentence is generic prose about nylon filaments, not a statement about the product' },
    { Product: 'G167-09 Nanovia Flex', Why: 'the page is Nanovia Flex V0, a fire-resistant grade the registered Flex is not shown to be' },
    { Product: 'G053-13 iSANMATE PA12CF', Why: 'the parameters table is headed "High Speed PETG Filament" and repeats the figures of the PC carbon fibre page; only the sentence above it names PA12 CF, so the table is not shown to be this product\'s' },
    { Product: 'G053-09 Raise3D Industrial PA12 CF', Why: 'the only page with settings is the PA12 CF+ sibling (admitted for G059-03 alone)' },
    { Product: 'G026-06 Raise3D TDS V4.0', Why: 'a newer revision of the registered sheet that prints only specimen settings (245 C nozzle, 80 C plate) and no guidance window; the product page is entered' },
    { Product: 'G075-09 Raise3D Premium PVA+', Why: 'the product page prints no nozzle or bed; its drying sentence is the registered one and its chamber limit ("above 50 C may clog") is a ceiling the profile columns would read as a required chamber; the older Premium PVA TDS V4 is another revision' },
    { Product: 'G081-07, G094-09 Stratasys; G164-05 UltiMaker; G166-01 Markforged; G096-03 KOLTRON; G019-02, G030-02, G138-03 iSANMATE', Why: 'no page that prints settings (printer-controlled, script-drawn, 403, or no product page)' },
    { Product: 'G094-12, G168-01, G167-05, G157-02, G174-01, G116-02 (b42 pages)', Why: 'already admitted in b42 (or, for G116-02, printing no settings)' },
    { Product: 'G114-01 3DXSTAT ESD-TPC (90A)', Why: 'the archived page is 3DXSTAT ESD-Flex TPU (Shore 90A, another TDS), not the ESD-TPC the registered sheet is: weak identity' },
    { Product: 'G087-01, G170-01, G173-01 (purefil / Fabru); G162-01 Copper3D booklet; G167-01, G167-12, G171-01, G172-01 (Nanovia); G167-02, G167-11 (Fillamentum); G168-05 Spectrum', Why: 'the page repeats the registered profile (or, for Nanovia, is the page already registered as the sheet) and adds no setting a column holds' },
    { Product: 'G167-04 Fiberlogy MattFlex 40D; G168-02 3DJake niceBIO; G169-02 BigRep HI-TEMP CF', Why: 'a profile from the maker\'s page is already registered (P1474, P1409, P1423)' },
    { Product: 'retailer rewrites and slicer preset files', Why: 'not the maker\'s guidance document' },
  ],
};
writeFileSync(`${HERE}/b44-packet.json`, `${JSON.stringify(packet, null, 2)}\n`);
console.log(`${packetDocs.length} proposals; packet sha ${sha(`${JSON.stringify(packet, null, 2)}\n`).slice(0, 12)}`);
