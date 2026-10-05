// b42: the proposals of the reader round's second maker-page batch, written from the documents the import's reader staged.
//
// Every product still missing a nozzle or bed after the re-read (GOALS, "the reader round", item 2) was searched at its
// maker's site by research agents; this file is the reviewer's reading of what they found, line by line against the
// cached text of each document (`text.mjs <sha>`): the words of every cell are the page's own, the typed columns are the
// build's parsers' reading of them (profileFor -> profileCellsFromParsed), and nothing is entered that the page does not
// print. Run from the project root with H2C_DOCUMENT_CACHE set as for the batch and B42_BYTES naming the folder the
// fetched bytes were saved in (fetch-b42.sh):
//
//   B42_BYTES=<dir> node docs/audits/2026-10-04-reader-round/ingest/build-b42.mjs
//
// It writes proposals/b42/<sha16>.json and ../b42-packet.json (the packet the migration pins).
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openTables } from '../../../../scripts/data/table-io.mjs';
import { profileFor } from '../../../../scripts/ingest/propose.mjs';
import { parseAbrasion } from '../../../../build/src/normalize/process.js';

const BY = 'Claude Sonnet (reader round b42), checked by Claude Opus';
const DATE = '2026-10-04';
const OUT = 'docs/audits/2026-10-04-reader-round/ingest/proposals/b42';
const BYTES = process.env.B42_BYTES;
if (!BYTES) throw new Error('B42_BYTES names the folder of fetched bytes');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const A = 'http://web.archive.org/web/';
const stamp = (ts) => `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)} ${ts.slice(8, 10)}:${ts.slice(10, 12)}:${ts.slice(12, 14)} UTC`;
const PAGE = 'Manufacturer product page or guide';
const NO_ENC = 'Enclosure needed: No';

// What the reader round's re-read found missing from each product's registered sheet (STILL-MISSING.csv).
const MISSING = {
  'G008-28': 'bed, chamber and drying', 'G011-07': 'bed, chamber and drying', 'G011-08': 'bed, chamber and drying', 'G011-09': 'bed, chamber and drying',
  'G012-06': 'bed, chamber and drying', 'G014-13': 'bed, chamber and drying', 'G014-14': 'bed, chamber and drying', 'G015-04': 'bed, chamber and drying',
  'G039-47': 'bed, chamber and drying', 'G039-63': 'nozzle, bed and chamber', 'G046-05': 'nozzle, bed and chamber', 'G046-06': 'nozzle, bed and chamber',
  'G046-07': 'bed, chamber and drying', 'G052-05': 'bed, chamber and drying', 'G066-07': 'nozzle, bed and chamber', 'G075-04': 'bed, chamber and drying',
  'G075-06': 'bed, chamber and drying', 'G075-10': 'bed, chamber and drying', 'G076-03': 'bed, chamber and drying', 'G081-08': 'bed, chamber and drying',
  'G081-12': 'bed, chamber and drying', 'G082-11': 'bed, chamber and drying', 'G082-12': 'bed, chamber and drying', 'G094-10': 'bed, chamber and drying',
  'G144-01': 'nozzle and bed', 'G174-01': 'bed, chamber and drying', 'G083-05': 'nozzle, bed, chamber and drying',
  'G014-15': 'nozzle, bed and chamber', 'G025-01': 'nozzle, bed, chamber and drying', 'G034-02': 'nozzle, bed, chamber and drying', 'G037-03': 'nozzle, bed, chamber and drying',
  'G029-11': 'nozzle, bed, chamber and drying', 'G030-11': 'nozzle, bed, chamber and drying', 'G094-12': 'nozzle, bed, chamber and drying', 'G126-01': 'nozzle, bed, chamber and drying',
  'G039-32': 'nozzle, bed, chamber and drying', 'G039-39': 'bed, chamber and drying', 'G157-02': 'nozzle, bed, chamber and drying', 'G167-05': 'nozzle, bed, chamber and drying',
  'G039-34': 'nozzle, bed, chamber and drying', 'G168-01': 'nozzle, bed, chamber and drying', 'G049-05': 'nozzle, bed and chamber', 'G094-13': 'nozzle, bed and chamber',
  'G155-01': 'nozzle, chamber and drying', 'G155-02': 'nozzle, chamber and drying',
};

/** A FormFutura "General printing guidelines" block: each field is the page's own words. */
function ff(o) {
  const cells = { nozzle: o.temp, bed: o.bed };
  const lines = { nozzle: `Print temp: ${o.temp}`, bed: `Heat bed: ${o.bed}` };
  if (o.size) { cells.diameter = o.size; lines.diameter = `Nozzle size: ${o.size}`; }
  if (o.enc) { cells.enclosure = o.enc; lines.enclosure = o.enc; }
  if (o.plate) { cells.plate = o.plate; lines.plate = `Printing surface: ${o.plate}`; }
  if (o.drying) { cells.drying = o.drying; lines.drying = o.drying; }
  if (o.abrasion) cells.abrasion = o.abrasion;
  const notes = [];
  if (o.layer) notes.push(['Layer height', o.layer]);
  if (o.fan) notes.push(['Cooling', o.fan]);
  if (o.speed) notes.push(['Speed', o.speed]);
  if (o.retr) notes.push(['Retraction', o.retr]);
  for (const n of o.notes ?? []) notes.push(n);
  return { locator: o.locator ?? 'General printing guidelines', evidence: lines.nozzle, cells, lines, notes };
}

const ffDoc = (o) => ({
  maker: 'FormFutura', slug: 'FORMFUTURA', kind: 'Current manufacturer product guidance', block: 'General printing guidelines', sourceClass: PAGE,
  ...o,
  profiles: [ff(o.ff)],
});

// One entry per document. `cells` are the page's words per column; `lines` the printed line each came from; `notes` are [topic, text].
const docs = [
  // ---- FormFutura, the live product pages ("General printing guidelines") and the Internet Archive where the page is gone ----
  ffDoc({
    file: 'g008-28', grade: 'G008-28', title: 'Silk Gloss PLA', url: `${A}20210414224253id_/https://www.formfutura.com/shop/product/silk-gloss-pla-2840`, captured: '20210414224253',
    orig: 'https://www.formfutura.com/shop/product/silk-gloss-pla-2840', gone: 'the live address now answers 404',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 215 - 230° C', bed: '± 0 - 60° C', enc: NO_ENC, fan: '50-100%' },
    skipped: 'The page prints no drying statement. "Experience level: Beginner" is not a print setting.',
  }),
  ffDoc({
    file: 'g011-07', grade: 'G011-07', title: 'MetalFil - Brass', url: 'https://www.formfutura.com/metalfil-brass',
    ff: { size: '≥ 0.6mm', layer: '≥ 0.2mm', temp: '± 190° C', bed: '± 0 – 60° C', enc: NO_ENC, fan: '50-100%', abrasion: 'We recommend using nozzles from stainless steel or other hardened alloys.' },
    skipped: 'The footnote "If blobs/lumps form around the nozzle then your print temperature is too high." is advice on the nozzle setting, not a setting a column holds: not entered. The page prints no drying statement.',
  }),
  ffDoc({
    file: 'g011-08', grade: 'G011-08', title: 'MetalFil - Classic Copper', url: 'https://www.formfutura.com/metalfil-classic-copper',
    ff: { size: '≥ 0.6mm', layer: '≥ 0.2mm', temp: '± 190 – 220° C', bed: '± 0 – 60° C', enc: NO_ENC, fan: '50-100%', abrasion: 'We recommend using nozzles from stainless steel or other hardened alloys.' },
    skipped: 'The footnote about blobs forming at too high a print temperature is advice, not a setting: not entered. The page prints no drying statement.',
  }),
  ffDoc({
    file: 'g011-09', grade: 'G011-09', title: 'MetalFil - Ancient Bronze', url: 'https://www.formfutura.com/metalfil-ancient-bronze',
    ff: { size: '≥ 0.6mm', layer: '≥ 0.2mm', temp: '± 195 – 225° C', bed: '± 0 – 60° C', enc: NO_ENC, fan: '50-100%', abrasion: 'We recommend using nozzles from stainless steel or other hardened alloys.' },
    skipped: 'The footnote about blobs forming at too high a print temperature is advice, not a setting: not entered. The page prints no drying statement.',
  }),
  ffDoc({
    file: 'g012-06', grade: 'G012-06', title: 'StoneFil', url: 'https://www.formfutura.com/stonefil',
    ff: { size: '≥ 0.4mm', layer: '≥ 0.2mm', temp: '± 185 – 225° C', bed: '± 50 – 60° C', fan: '80-100%', speed: 'Slow', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 110%" has no column. "slightly more abrasive effect on brass nozzles" is a comparison, not a hardened-nozzle requirement: not entered.',
  }),
  ffDoc({
    file: 'g014-13', grade: 'G014-13', title: 'EasyCork', url: 'https://www.formfutura.com/easycork',
    ff: {
      locator: 'General printing guidelines; Storage and handling', size: '≥ 0.15mm', layer: '≥ 0.2mm', temp: '± 210 – 250° C', bed: '± 0 – 60°C', enc: NO_ENC, fan: '50-100%',
      drying: 'it is recommended to dry the material prior to usage and to 3D print it directly from a dry box',
      notes: [['Storage humidity', 'Filament should be stored at room temperature in a dry and dark place with humidity below 15%.']],
    },
    skipped: 'The drying statement gives no temperature or time. Storage temperature and shelf life are not print settings.',
  }),
  ffDoc({
    file: 'g014-14', grade: 'G014-14', title: 'EasyWood', url: 'https://www.formfutura.com/easywood',
    ff: { size: '≥ 0.4mm', layer: '≥ 0.2mm', temp: '± 190 – 240° C', bed: '± 50 – 60° C', fan: '80-100%', speed: '20-45mm/s', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 100%" has no column.',
  }),
  ffDoc({
    file: 'g015-04', grade: 'G015-04', title: 'Galaxy PLA', url: 'https://www.formfutura.com/galaxy-pla',
    ff: { size: '≥ 0.15mm', layer: '> 0.1mm', temp: '± 185 – 215° C', bed: '± 50 – 60° C', plate: 'Blue Tape / Glass', enc: 'Enclosed printer needed: No', fan: '80-100%', speed: 'Medium', retr: 'Yes ± 5mm', abrasion: 'Galaxy PLA is not abrasive to the nozzle of your 3D printer.' },
    skipped: 'The page also prints "Heated Build Chamber: No" beside "Enclosed printer needed: No"; the enclosure cell keeps the first (its state, not needed, already says no heated chamber is needed) because the parser reads the two joined as a recommendation. No drying statement; "Flow rate: ± 100%" has no column.',
  }),
  ffDoc({
    file: 'g039-47', grade: 'G039-47', title: 'Python Flex TPU 98A', url: 'https://www.formfutura.com/python-flex-tpu-98a', requested: 'https://www.formfutura.com/product/python-flex/',
    ff: {
      locator: 'General printing guidelines; Hygroscopy', size: '≥ 0.25mm', layer: '≥ 0.1mm', temp: '± 220 – 250° C', bed: '± 0 – 60° C', fan: '50-100%', speed: 'Medium-Fast', retr: 'Yes ± 5mm',
      drying: 'When the filament is too wet it is recommended to dry Python Flex in an oven or filament drying machine at 65C for approximately 6 hours.',
    },
    skipped: 'The footnote "Print temperature depends on printing speed and wall thickness (e.g. ± 220 – 230° C for single wall objects with no infill at 50mm/s and ± 245 – 255° C for high infilled objects at 100mm/s)" qualifies the window by speed and wall: not entered as a second window. "Flow rate: ± 110 – 130%" has no column. No enclosure statement. The page titles the product "Python Flex TPU 98A"; the registered sheet is "Python Flex" with a Shore hardness of 98A, taken as the same product.',
  }),
  ffDoc({
    file: 'g039-63', grade: 'G039-63', title: 'Python Flex TPU 90A', url: 'https://www.formfutura.com/python-flex-tpu-90a',
    ff: {
      locator: 'General printing guidelines; Hygroscopy', size: '≥ 0.25mm', layer: '≥ 0.1mm', temp: '± 220 – 250° C', bed: '± 0 – 60° C', fan: '50-100%',
      drying: 'When the filament is too wet it is recommended to dry Python Flex in an oven or filament drying machine at 65C for approximately 6 hours.',
    },
    skipped: 'No enclosure statement; the Hygroscopy paragraph also describes storage in a vacuum bag, which is not a print setting.',
  }),
  ffDoc({
    file: 'g046-05', grade: 'G046-05', title: 'FlexiFil TPC 30D', url: 'https://www.formfutura.com/flexifil-tpc-30d',
    ff: {
      locator: 'General printing guidelines; Storage and handling', size: '≥ 0.4mm', layer: '≥ 0.2mm', temp: '± 230 – 260°C', bed: '± 60 – 90° C', fan: '0-70%', speed: 'slow', retr: 'Yes ± 5mm',
      drying: 'it is recommended to dry the material prior to usage and to 3D print it directly from a dry box',
      notes: [['Storage humidity', 'Filament should be stored at room temperature in a dry and dark place with humidity below 15%.']],
    },
    skipped: 'The drying statement gives no temperature or time. No enclosure statement; "Flow rate: ± 100%" has no column.',
  }),
  ffDoc({
    file: 'g046-06', grade: 'G046-06', title: 'FlexiFil TPC 40D', url: 'https://www.formfutura.com/flexifil-tpc-40d',
    ff: {
      locator: 'General printing guidelines; Storage and handling', size: '≥ 0.4mm', layer: '≥ 0.2mm', temp: '± 230 – 260°C', bed: '± 60 – 90° C', fan: '0-70%', speed: 'slow', retr: 'Yes ± 5mm',
      drying: 'it is recommended to dry the material prior to usage and to 3D print it directly from a dry box',
      notes: [['Storage humidity', 'Filament should be stored at room temperature in a dry and dark place with humidity below 15%.']],
    },
    skipped: 'The drying statement gives no temperature or time. No enclosure statement; "Flow rate: ± 100%" has no column.',
  }),
  ffDoc({
    file: 'g046-07', grade: 'G046-07', title: 'FlexiFil', url: `${A}20260420063444id_/http://www.formfutura.com/flexifil`, captured: '20260420063444',
    orig: 'http://www.formfutura.com/flexifil', gone: 'the live address now answers HTTP 500',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 220 – 260° C', bed: '± 90 – 110° C', fan: '50-100%', speed: 'Low', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 100%" has no column. The base FlexiFil window (bed 90-110 C) differs from the TPC 30D and 40D pages (60-90 C); each product keeps its own page.',
  }),
  ffDoc({
    file: 'g052-05', grade: 'G052-05', title: 'STYX-12', url: `${A}20251110100959id_/http://www.formfutura.com/styx-12`, captured: '20251110100959',
    orig: 'http://www.formfutura.com/styx-12', gone: 'the live address now answers HTTP 500',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 240 – 270° C', bed: '± 80 – 120° C', fan: '0-30%', speed: 'Medium / High', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 100 – 110%" has no column.',
  }),
  ffDoc({
    file: 'g066-07', grade: 'G066-07', title: 'EasyFil PET', url: 'https://www.formfutura.com/easyfil-pet',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.05mm', temp: '± 230 – 245° C', bed: '± 80 – 90° C', enc: NO_ENC, fan: '10-25%', notes: [['Adhesion / release', 'EasyFil Nr. I']] },
    skipped: 'The adhesive line is "Adhesive: EasyFil Nr. I", kept as an Adhesion / release note. No drying statement.',
  }),
  ffDoc({
    file: 'g075-04', grade: 'G075-04', title: 'AquaSolve - PVA', url: 'https://www.formfutura.com/aquasolve-pva',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 190 – 210° C', bed: '± 0 – 60° C', enc: NO_ENC, fan: '0 – 30%' },
    skipped: 'The footnote "Do not exceed a printing temperature of 225˚C, because AquaSolve PVA will then crystallize to quickly" is a limit above the window, not a setting a column holds: not entered. No drying statement.',
  }),
  ffDoc({
    file: 'g075-06', grade: 'G075-06', title: 'Helios Support', url: `${A}20250521183225id_/https://formfutura.com/product/helios-support/`, captured: '20250521183225',
    orig: 'https://formfutura.com/product/helios-support/', gone: 'the live address now answers 404',
    ff: {
      size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 235 – 255° C', bed: '± 65 – 75° C', enc: NO_ENC, fan: '0 – 30%',
      drying: 'Once Helios Support has been used or opened from its original vacuum-sealed packaging for a while it is advised to dry the material before using again.',
    },
    skipped: 'The page also prints "Can be printed in heated build chambers up to 60° C" (a ceiling for a chamber the print does not need; the parser would read it as a required chamber, so it is not entered) and a maximum thermal stability. The drying statement gives no temperature or time.',
  }),
  ffDoc({
    file: 'g075-10', grade: 'G075-10', title: 'Atlas Support', url: 'https://www.formfutura.com/atlas-support',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 180 – 210° C', bed: '± 0 – 60° C', enc: NO_ENC, fan: '0 – 30%' },
    skipped: 'The footnote names AquaSolve PVA and a 225˚C limit (copied from that product\'s page): not entered. "Less sensitive to deterioration by humidity compared to regular PVA" is not a drying statement.',
  }),
  ffDoc({
    file: 'g076-03', grade: 'G076-03', title: 'BVOH', url: 'https://www.formfutura.com/bvoh',
    ff: {
      size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 200 – 230° C', bed: '± 65 – 75° C', enc: NO_ENC, fan: '0 – 30%',
      drying: 'Once BVOH has been used or opened from its original vacuum-sealed packaging for a while it is advised to dry the material before using again.',
    },
    skipped: 'The page prints "Nozzle side: ≥ 0.15mm" (its own typo for nozzle size). The limit "Do not exceed a printing temperature of 230˚C for a prolonged period of time" is not a setting a column holds. The drying statement gives no temperature or time.',
  }),
  ffDoc({
    file: 'g081-08', grade: 'G081-08', title: 'EasyFil HIPS', url: 'https://www.formfutura.com/easyfil-hips',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 230 – 245° C', bed: '± 80 – 100° C', fan: '0-35%', speed: 'Medium', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 104%" has no column.',
  }),
  ffDoc({
    file: 'g081-12', grade: 'G081-12', title: 'LimoSolve', url: `${A}20190920185448id_/https://www.formfutura.com/shop/product/limosolve-natural-250?category=170`, captured: '20190920185448',
    orig: 'https://www.formfutura.com/shop/product/limosolve-natural-250?category=170', gone: 'the maker no longer serves a LimoSolve page',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 220 - 260° C', bed: '± 90 - 110° C', fan: '20-50%', speed: 'Medium', retr: 'Yes ± 5mm' },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 104%" has no column.',
  }),
  ffDoc({
    file: 'g082-11', grade: 'G082-11', title: 'Centaur PP', url: 'https://www.formfutura.com/centaur-pp',
    ff: {
      size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 245 – 270° C', bed: '± 80 – 85° C', fan: '0-50%', speed: 'Low / Medium', retr: 'Yes ± 5mm',
      notes: [['Adhesion / release', 'Large Centaur PP prints can be printed on an unheated 2mm or 3mm PP plate, which can be attached to the print bed. Smaller prints can be printed on standard PP packaging tape.']],
    },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 104" has no column.',
  }),
  ffDoc({
    file: 'g082-12', grade: 'G082-12', title: 'Pegasus PP-HGS25 Ultralight', url: `${A}20250518011725id_/https://formfutura.com/product/pegasus-pp-hgs25-ultralight/`, captured: '20250518011725',
    orig: 'https://formfutura.com/product/pegasus-pp-hgs25-ultralight/', gone: 'the live address returns a page with no guidelines block',
    ff: {
      size: '≥ 0.4mm', layer: '≥ 0.1mm', temp: '± 215 – 245° C', bed: '± 0 – 100° C', fan: '50-100%', speed: 'Low', retr: 'Yes ± 5mm',
      notes: [['Adhesion / release', 'Large Pegasus PP Ultralight prints can be printed on an unheated 2mm or 3mm PP plate, which can be attached to the print bed. Smaller prints can be printed on standard PP packaging tape.']],
    },
    skipped: 'The page prints no enclosure or drying statement; "Flow rate: ± 104%" has no column. The page names the product "Pegasus PP-HGS25 Ultralight"; the registered sheet is "Pegasus PP" (maker folder "Pegasus PP Ultra Light", density 750 kg/m3), taken as the same product.',
  }),
  ffDoc({
    file: 'g094-10', grade: 'G094-10', title: 'ABSpro Flame Retardant', url: 'https://www.formfutura.com/abspro-flame-retardant',
    ff: {
      size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 240 – 265° C', bed: '± 100 – 110° C', fan: '0-50%', speed: 'Medium', retr: 'Yes ± 5mm',
      enc: 'it is recommended to use a temperature-controlled build chamber and to prepare your heat bed with DimaFix fixative spray when 3D printing large(r) scaled objects',
      notes: [['Adhesion / release', 'prepare your heat bed with DimaFix fixative spray'], ['Warping / shrinkage', 'ABSpro – Flame Retardant has a tendency to warp']],
    },
    skipped: 'The recommendation is for large(r) scaled objects and is kept in the Enclosure cell in the page\'s words. "When using high speed printing, the above displayed settings will likely need to be adjusted accordingly" and "Flow rate: ± 100%" have no column. No drying statement.',
  }),
  ffDoc({
    file: 'g144-01', grade: 'G144-01', title: 'AthenaX CF10', url: 'https://www.formfutura.com/athenax-cf10',
    ff: {
      locator: 'General printing guidelines; Pre-drying AthenaX CF10; Abrasiveness', size: '≥ 0.4mm', layer: '≥ 0.1mm', enc: 'Enclosure: Recommended', temp: '± 250 – 290°C', bed: '± 85 – 100° C', fan: '0-100%',
      drying: 'pre-dry the filament at 75°C for approximately 24 hours before usage', abrasion: 'We recommend to use ruby nozzles or hardened steel nozzles.',
    },
    skipped: 'The marketing paragraph above the table says "No enclosure, or heated chamber needed" while the guidelines table says "Enclosure: Recommended"; the table is the guidance block and is what is entered, the conflict is recorded here for the reviewer.',
  }),
  ffDoc({
    file: 'g174-01', grade: 'G174-01', title: 'Crystal Flex', url: `${A}20251110101840id_/http://www.formfutura.com/crystal-flex`, captured: '20251110101840',
    orig: 'http://www.formfutura.com/crystal-flex', gone: 'the live address now answers HTTP 500',
    ff: { size: '≥ 0.15mm', layer: '≥ 0.1mm', temp: '± 230 – 260° C', bed: '± 80 – 100° C', enc: NO_ENC, fan: '0-30%' },
    skipped: 'No drying statement.',
  }),
  ffDoc({
    file: 'g083-05ff', grade: 'G083-05', title: 'LUVOCOM 3F PP CF 9928', url: 'https://www.formfutura.com/luvocom-3f-pp-cf-9928', slug: 'FORMFUTURA',
    ff: {
      locator: 'General printing guidelines; Abrasiveness', size: '≥ 0.4mm', layer: '≥ 0.10mm', temp: '± 220 – 230° C', bed: '± 65 – 75° C', enc: NO_ENC, fan: '10 – 50%',
      drying: '4-6h @80°C (max)', abrasion: 'We recommend to use nozzles from stainless steel or other hardened alloys.', notes: [['Adhesion / release', 'EasyFix Nr. III']],
    },
    skipped: 'FormFutura distributes this LEHVOSS compound under the LUVOCOM name (the page lists "Lehvoss Luvocom 3F PP CF 9928 BK"); its windows (220-230 C nozzle) differ from LEHVOSS\'s own datasheet (220-250 C), which enters as a second profile from its own source.',
    distributor: true,
  }),

  // ---- iSANMATE, the maker's own product pages ----
  {
    file: 'g014-15', grade: 'G014-15', maker: 'iSANMATE', slug: 'ISANMATE', title: 'iSANMATE High Performance PLA Wood 3D Printer Filament Box wood', url: 'https://www.isanmate.com/product/isanmate-pla-wood-3d-printer-filament-box-wood/',
    kind: 'Current manufacturer product guidance', block: 'Parameter Information; Product Description', sourceClass: PAGE,
    profiles: [
      {
        locator: 'Parameter Information; Product Description (nozzle size)', evidence: 'Print Temp  200-220 ℃  Hot Bed Temp.  35-60 ℃',
        cells: { nozzle: '200-220 ℃', bed: '35-60 ℃', diameter: '≥0.5mm diameter minimum' }, lines: { nozzle: 'Print Temp  200-220 ℃', bed: 'Hot Bed Temp.  35-60 ℃', diameter: '≥0.5mm diameter minimum' },
        notes: [['Speed', '50-20mm/s']],
      },
    ],
    skipped: 'The page prints two windows for the same wood filament: the Parameter Information table (nozzle 200-220, bed 35-60, entered) and the description block ("Extruder Temp 190-220°C", "Bed Temp 45-60℃"); two blocks of one page are one setup read twice (PROFILE-DUPLICATE, D120), so the product-specification table is the profile and the description block\'s windows are recorded here, not entered. Only the description\'s "≥0.5mm diameter minimum" nozzle size is added to the profile. The description also prints "Heated Chamber  unnecessary", a word the parser does not read, so no chamber cell is entered. The page is the Box wood colour of the line; the other colours share the specification. "Print Speed 50-20mm/s" is entered as printed.',
  },
  {
    file: 'g025-01', grade: 'G025-01', maker: 'iSANMATE', slug: 'ISANMATE', title: 'iSANMATE Durable PETG Glass Fiber Filament for industrial parts', url: 'https://www.isanmate.com/product/isanmate-petg-glass-fiber-filament/',
    kind: 'Current manufacturer product guidance', block: 'Product parameters', sourceClass: PAGE,
    profiles: [{
      locator: 'Product parameters', evidence: 'Print Temp  250-270℃', cells: { nozzle: '250-270℃', bed: '90-100℃' }, lines: { nozzle: 'Print Temp  250-270℃', bed: 'Hotbed Temp  90-100℃' },
      notes: [['Speed', '50-100mm/s']],
    }],
    skipped: 'The page prints no chamber, enclosure or drying statement and links the registered TDS.',
  },
  {
    file: 'g034-02', grade: 'G034-02', maker: 'iSANMATE', slug: 'ISANMATE', title: 'iSANMATE UV Resistant ASA Glass Fiber 3D Filament for Outdoor Equipment', url: 'https://www.isanmate.com/product/isanmate-asa-glass-fiber-filament/',
    kind: 'Current manufacturer product guidance', block: 'Product parameters', sourceClass: PAGE,
    profiles: [{
      locator: 'Product parameters', evidence: 'Print Temp  240-270 degrees', cells: { nozzle: '240-270 degrees', bed: '80-100°C' }, lines: { nozzle: 'Print Temp  240-270 degrees', bed: 'Hot Bed Temp.  80-100°C' },
      notes: [['Speed', '30-100mm/s']],
    }],
    skipped: 'The parameters table is headed "Product Name ASA Filament, Color Black" on the glass-fibre page (the page lists black, grey and white); taken as the ASA Glass Fiber product the page heads. No chamber, enclosure or drying statement.',
  },
  {
    file: 'g037-03', grade: 'G037-03', maker: 'iSANMATE', slug: 'ISANMATE', title: 'iSANMATE High Quality PC Carbon Fiber Filament For 3D Printer', url: 'https://www.isanmate.com/product/isanmate-pc-carbon-fiber-filament/',
    kind: 'Current manufacturer product guidance', block: 'Product parameters', sourceClass: PAGE,
    profiles: [{
      locator: 'Product parameters', evidence: 'Print Temp  240-260 degrees', cells: { nozzle: '240-260 degrees', bed: '60-80°C' }, lines: { nozzle: 'Print Temp  240-260 degrees', bed: 'Hot Bed Temp.  60-80°C' },
      notes: [['Speed', '50-600mm/s']],
    }],
    skipped: 'No chamber, enclosure or drying statement ("Sealed printing, good adhesion" is a feature claim).',
  },

  // ---- 3DXTECH (Triton3D line and the ESD-Flex archive) ----
  {
    file: 'g094-12', grade: 'G094-12', maker: '3DXTECH', slug: '3DXTECH', title: 'TRITON3D™ PC/ABS - Stratasys® Compatible', url: 'https://www.3dxtech.com/products/triton3d-pc-abs-stratasys-compatible',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations', sourceClass: PAGE,
    profiles: [{
      locator: 'Print Recommendations', evidence: 'Heated Chamber  Recommended',
      cells: { chamber: 'Recommended', nozzleMaterial: 'No Special Concerns', drying: '80°C for 6 Hours' },
      lines: { chamber: 'Heated Chamber  Recommended', nozzleMaterial: 'Nozzle Specs  No Special Concerns', drying: 'Drying Specs  80°C for 6 Hours' },
      notes: [['Layer height', 'No Special Concerns']],
    }],
    skipped: 'The page prints no extruder or bed temperature (a Stratasys-compatible canister is set by the printer), so the profile holds the chamber, nozzle specification and drying only.',
  },
  {
    file: 'g126-01', grade: 'G126-01', maker: '3DXTECH', slug: '3DXTECH', title: '3DXSTAT ESD-Flex [TPU] 3D Filament', url: `${A}20231216232542id_/https://www.3dxtech.com/product/3dxstat-esd-flex/`, captured: '20231216232542',
    orig: 'https://www.3dxtech.com/product/3dxstat-esd-flex/', gone: 'the live address now redirects to the maker\'s ESD-safe collection (its live ESD-Flex page is the 60D grade)',
    kind: 'Current manufacturer product guidance', block: 'Print Recommendations; Recommended ESD Flex Print Settings', sourceClass: PAGE, gzip: true,
    profiles: [{
      locator: 'Print Recommendations; Recommended ESD Flex Print Settings', evidence: 'Extruder Temp 220-240°C',
      cells: { nozzle: '220-240°C', bed: '40-60°C', chamber: 'Not required', nozzleMaterial: 'No special concerns', drying: '65°C for 4 hours' },
      lines: { nozzle: 'Extruder Temp 220-240°C', bed: 'Bed Temp 40-60°C', chamber: 'Heated Chamber Not required', nozzleMaterial: 'Nozzle Specs No special concerns', drying: 'Drying Specs 65°C for 4 hours' },
      notes: [['Layer height', 'No special concerns'], ['Adhesion / release', 'Hair Spray on Magigoo Bed Prep']],
    }],
    skipped: 'The page prints the settings twice (the Print Recommendations list and the "Recommended ESD Flex Print Settings" text), identical; one profile. The page also prints a water-soluble support recommendation: not entered. The registered sheet\'s test-bar extrusion and bed temperatures (260 and 60 C) are a specimen setting, never guidance (m170).',
  },

  // ---- NinjaTek ----
  ...[
    ['g039-32', 'G039-32', 'NinjaFlex 3D Printer Filament (85A)', 'https://ninjatek.com/shop/ninjaflex/', '225°C – 250°C', 'Room temperature to 50°C', '10-20 mm/sec (600-1200 mm/min)', '15-35 mm/sec (900-2100 mm/min)', 'Glue is suggested on bed.', null],
    ['g039-39', 'G039-39', 'Armadillo 3D Printer Filament (75D)', 'https://ninjatek.com/shop/armadillo/', '210°C – 230°C', 'Room temperature to 50°C', '20-30 mm/sec (900-1800 mm/min)', '35-60 mm/sec (2700-3600 mm/min)', 'Glue is suggested on bed.', 'Build platform requires same prep as PLA.'],
    ['g157-02', 'G157-02', 'Eel 3D Printer Filament (60D)', 'https://ninjatek.com/shop/eel/', '220°C – 230°C', 'Room temperature to 45°C', '15-20 mm/sec (900-1800 mm/min)', '45-60 mm/sec (2700-3600 mm/min)', 'Glue is suggested on bed.', null],
    ['g167-05', 'G167-05', 'Chinchilla 3D Printer Filament (75A)', 'https://ninjatek.com/shop/chinchilla/', '225°C – 235°C', 'Room temperature – 40°C', '10-20 mm/sec (600-1200 mm/min)', '15-35 mm/sec (909-2100 mm/min)', 'Glue and/ or blue painters tape is suggested if not using a heated bed.', null],
  ].map(([file, grade, title, url, temp, bed, top, infill, glue, prep]) => ({
    file, grade, maker: 'NinjaTek', slug: 'NINJATEK', title, url, kind: 'Current manufacturer product guidance', block: 'Print Guidelines', sourceClass: PAGE,
    earlier: grade === 'G039-39' ? { sourceId: 'D-NINJATEK-ARMADILLO-PAGE', sha256: '4abf6ec25bad331e193c43339c4bac34ea0f79fd7e5467e9ebfe8a516bb2d9c1' } : null,
    profiles: [{
      locator: 'Print Guidelines', evidence: `Extruder Temperature ${temp}`,
      cells: { nozzle: temp, bed },
      lines: { nozzle: `Extruder Temperature ${temp}`, bed: `Platform Temperature ${bed}` },
      notes: [['Speed', `Top and bottom layers: ${top}; Infill speeds: ${infill}`], ['Cooling', 'Layer 2+ use cooling fan if available.'], ['Adhesion / release', prep ? `${glue}; ${prep}` : glue]],
    }],
    skipped: 'The page prints no chamber, enclosure or drying statement.' + (grade === 'G039-39' ? ' The page announces that Armadillo will soon be discontinued; "No heated bed required" in its feature list is the same statement as the platform temperature (room temperature to 50 C). The same address was registered on 2026-09-26 as D-NINJATEK-ARMADILLO-PAGE (other bytes, digest 4abf6ec2...), whose profile P1496 holds the nozzle window and the glue statement but not the platform temperature; that source stays, this retrieval is a revision of it (retrievalRevision).' : ''),
  })),

  // ---- BigRep ----
  ...[
    ['g039-34a', 'G039-34', 'TPU Filament - Flexible 3D Printer Material | Bigrep', 'https://bigrep.com/filaments/tpu/', '210 - 240 °C', '50 - 60 °C', '50 - 75 %', '80 °C for 4 - 6 hours', 'https://shop.bigrep.com/products/tpu'],
    ['g168-01a', 'G168-01', 'PRO HT Filament - Versatile 3D Printing Material | BigRep', 'https://bigrep.com/filaments/pro-ht/', '190 - 230 °C', '50 - 70 °C', '50 - 100 %', '50 °C for 4 - 6 hours', 'https://shop.bigrep.com/products/pro-ht/'],
  ].map(([file, grade, title, url, temp, bed, fan, dry, shop]) => ({
    file, grade, maker: 'BigRep', slug: 'BIGREP', title, url, kind: 'Current manufacturer product guidance', block: 'Recommended Printing Conditions', sourceClass: PAGE,
    profiles: [{
      locator: 'Recommended Printing Conditions; Other Information', evidence: `Nozzle Temperature ${temp}`,
      cells: { nozzle: temp, bed, drying: dry },
      lines: { nozzle: `Nozzle Temperature ${temp}`, bed: `Print Bed Temperature ${bed}`, drying: `Drying recommendations ${dry}` },
      notes: [['Cooling', fan]],
    }],
    skipped: `The maker's shop page (${shop}) prints the same Recommended Printing Conditions block; a second copy of one statement is not a second source, so only the maker's site page is admitted. No chamber value (the page says the filament is compatible with open material system printers with a heated print bed).`,
  })),

  // ---- Fillamentum ----
  {
    file: 'g049-05', grade: 'G049-05', maker: 'Fillamentum', slug: 'FILLAMENTUM', title: 'Porthcurno', url: 'https://fillamentum.com/collections/fishy-filaments-by-fillamentum/porthcurno/',
    kind: 'Current manufacturer product guidance', block: 'product page header', sourceClass: PAGE,
    profiles: [{
      locator: 'Product page header', evidence: 'Working temperature:  250–280 °C',
      cells: { nozzle: '250–280 °C', bed: '80–110 °C' }, lines: { nozzle: 'Working temperature:  250–280 °C', bed: 'Heated bed:  80–110 °C' }, notes: [],
    }],
    skipped: 'The page labels the nozzle window "Working temperature". It links a 3D printing guide, a drying page and the data sheet (not opened); no chamber figure is printed.',
  },

  // ---- SIDDAMENT ----
  {
    file: 'g094-13', grade: 'G094-13', maker: 'SIDDAMENT', slug: 'SIDDAMENT', title: 'White PC-ABS', url: 'https://siddament.com.au/products/white-pc-abs',
    kind: 'Current manufacturer product guidance', block: 'Print Settings', sourceClass: PAGE,
    profiles: [{
      locator: 'Print Settings', evidence: 'Hotend 240-260°C',
      cells: { nozzle: '240-260°C', bed: '90-110°C', enclosure: 'Enclosure Required', abrasion: 'Hardened Nozzle Not Required', drying: '55-65°C / 4-8 hours' },
      lines: { nozzle: 'Hotend 240-260°C', bed: 'Heated Bed 90-110°C', enclosure: 'Enclosure Required', drying: 'Drying 55-65°C / 4-8 hours' },
      notes: [],
    }],
    skipped: 'The page then gives the maker\'s own practice for drying ("dry every roll for at least 12 hours, at a minimum of 50 °C and around 70 °C on average"), which it calls a rule of its own beside the textbook value entered here: not entered as a schedule. The black variant page prints the same block (a colour of one product). Another source quoted 270-290 C for this product; this page prints 240-260 C. The page also prints HDT (~95 C) and density (1.08 g/cm3) claims with no method: not entered.',
  },

  // ---- Spectrum, the maker of the Prografen filaments 3DJake sells ----
  ...[
    ['g155-01', 'G155-01', 'Prografen PLA Graphene Light', 'https://spectrumfilaments.com/en/filament/prografen-pla-graphene-light/'],
    ['g155-02', 'G155-02', 'Prografen PLA Graphene Strong', 'https://spectrumfilaments.com/en/filament/prografen-pla-graphene-strong/'],
  ].map(([file, grade, title, url]) => ({
    file, grade, maker: 'Spectrum', slug: 'SPECTRUM', title, url, kind: 'Current manufacturer product guidance', block: 'How to use', sourceClass: PAGE,
    profiles: [{
      locator: 'How to use', evidence: 'Nozzle temperature [°C]  190-240°C',
      cells: { nozzle: '190-240°C', bed: '0-50°C', enclosure: 'Enclosure not necessary', abrasion: 'Ruby or hardened nozzle recommended No' },
      lines: { nozzle: 'Nozzle temperature [°C]  190-240°C', bed: 'Bed temperature [°C]  0-50°C', enclosure: 'Enclosure  not necessary' },
      notes: [['Speed', '40-1000 mm/s'], ['Cooling', 'Up to 100%'], ['Adhesion / release', 'not necessary (for increased adhesion or to prevent warping: Dimafix, 3DLac, Magigoo)'], ['Storage humidity', 'Drybox recommended No']],
    }],
    skipped: `Spectrum Filaments is the maker of this 3DJake-labelled Prografen filament. "Drybox recommended No" is not a drying schedule (the parser would read it as drying required), so it is kept as a storage note and the Drying cell is not published. The registered 3DJake sheet prints nozzle 190-210 C and bed 35-45 C (an optimal window); this page prints 190-240 C and 0-50 C, entered as a second profile from its own source.`,
  })),

  // ---- LEHVOSS's own datasheet ----
  {
    file: 'g083-05pdf', grade: 'G083-05', maker: 'LEHVOSS', slug: 'LEHVOSS', title: 'PRELIMINARY DATASHEET LUVOCOM 3F PP CF 9928 BK', url: 'https://www.lehvoss.de/fileadmin/Compounds/PDFs/LUVOCOM_3F/LUVOCOM_3F_PP_CF_9928_BK/25119928-en-ISO.pdf', requested: 'https://lehvoss.de/fileadmin/Compounds/PDFs/LUVOCOM_3F/LUVOCOM_3F_PP_CF_9928_BK/25119928-en-ISO.pdf',
    kind: 'Manufacturer published guidance', block: 'Recommended processing parameters', sourceClass: 'Manufacturer TDS', revision: 'Preliminary datasheet (file 25119928-en-ISO)', publication: 'Not published',
    profiles: [{
      locator: 'Recommended processing parameters (3D Printing parameters)', evidence: 'nozzle temperature: 220 - 250 °C',
      cells: { nozzle: '220 - 250 °C', bed: '> 50 °C', nozzleMaterial: 'abbrasion resistant', abrasion: 'abbrasion resistant' },
      lines: { nozzle: 'nozzle temperature: 220 - 250 °C', bed: 'print bed temperature: > 50 °C', nozzleMaterial: 'nozzle material: abbrasion resistant' },
      notes: [['Layer height', '> 0,2mm'], ['Speed', '40 - 60 mm/s']],
    }],
    skipped: 'The sheet is LEHVOSS\'s own current edition (the registered copy, hosted by FormFutura, has no 3D printing parameters). Page 2 (pellet predrying and injection-moulding zones) is processing for granules, not filament: not entered. "abbrasion" is the sheet\'s own spelling. The registered edition is a different file (digest 497c7f3c...).',
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
  const sourceId = `R-${d.slug}-READER-20261004-${digest.slice(0, 12)}`;
  const archived = !!d.captured;
  const missing = MISSING[d.grade];
  const revision = d.revision ?? (archived ? `Internet Archive capture of ${stamp(d.captured)}` : 'Not published');
  const what = pdf ? 'datasheet' : archived ? 'product page as the Internet Archive captured it' : 'product page as served on 2026-10-04';
  const gone = archived ? ` The capture is used because ${d.gone}.` : '';
  const identity = d.distributor ? ' FormFutura distributes this LEHVOSS compound; the page is FormFutura\'s.' : '';
  const maker = d.maker === 'Spectrum' ? 'Spectrum Filaments' : d.maker;
  const sourceNote = pdf
    ? `${maker}'s own ${what} (${d.title}) for ${grade.Manufacturer} ${grade['Product name']} (${d.grade}): its ${d.block} block. The registered sheet leaves ${missing} unpublished.${identity}`
    : `${maker}'s ${what} for ${d.title} (${grade.Manufacturer} ${grade['Product name']}, ${d.grade}): its ${d.block} block. The registered sheet leaves ${missing} unpublished.${gone}${identity}`;
  const source = {
    SourceID: sourceId, Publisher: d.maker, Title: d.title, Revision: revision, 'Publication date': d.publication ?? 'Not published', 'Access date': DATE,
    'Source class': d.sourceClass, 'Source note': sourceNote, 'Citation role': 'cited', URL: d.url, Locator: 'Document / exact product page',
    'Applicable grades': d.grade, 'Access state': 'retrieved',
    'Access note': (archived
      ? `Fetched ${DATE} by Claude Sonnet (reader round b42) as the raw capture (id_) of ${d.orig}; the Internet Archive replays the page's own content encoding${d.gzip ? ' (gzip, decoded before hashing)' : ''}, and the document hashed is the decoded HTML. Staged by digest (ingest:witness --from); the page's maker does not serve it now.`
      : `Fetched ${DATE} by Claude Sonnet (reader round b42) from ${d.requested ? `${d.requested}, which the maker's server redirects to ${d.url}` : "the maker's address"}; staged by digest (ingest:witness --from).`),
    SHA256: digest,
  };

  const profiles = [];
  for (const p of d.profiles) {
    const settings = [];
    const push = (field, raw, line, label) => settings.push({ page: 1, field, topic: '', label, raw, fromBelow: false, line });
    const c = p.cells;
    if (c.nozzle) push('nozzle', c.nozzle, p.lines.nozzle, 'Nozzle temperature');
    if (c.bed) push('bed', c.bed, p.lines.bed, 'Bed temperature');
    if (c.chamber) push('chamber', c.chamber, p.lines.chamber, 'Heated chamber');
    if (c.enclosure) push('enclosure', c.enclosure, p.lines.enclosure ?? c.enclosure, 'Enclosure');
    if (c.plate) push('plate', c.plate, p.lines.plate, 'Build surface');
    if (c.drying) push('drying', c.drying, p.lines.drying ?? c.drying, 'Drying');
    if (c.nozzleMaterial) push('nozzle-material', c.nozzleMaterial, p.lines.nozzleMaterial, 'Nozzle specs');
    if (c.diameter) push('nozzle-diameter', c.diameter, p.lines.diameter ?? p.lines.nozzleMaterial, 'Nozzle diameter');
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
    row.Locator = `p. 1: ${p.locator}`;
    profiles.push({
      gradeKey: 'main', row,
      notes: p.notes.map(([Topic, Text]) => ({ Topic, Text })),
      evidence: { page: 1, text: p.evidence },
      review: { status: 'accepted', by: BY, visual: pdf, note: `Read from the cached text${pdf ? ' and the page image' : ''}; every cell is the page's own words and the typed columns are the parsers' reading.` },
    });
  }

  const gradeRow = { ...grade };
  const proposal = {
    version: 1, generated: { tool: 'build-b42.mjs (reader round)', date: DATE },
    document: { sha256: digest, url: d.url, pages: pdf ? 2 : 1, provider: d.maker, manufacturer: d.maker, docKey: `${d.url}#witness-for=source:${grade.SourceID}` },
    identity: { polymer: null, note: `exact product ${d.grade} (${grade.Manufacturer} ${grade['Product name']}) of ${grade.MaterialID}; identity unchanged` },
    source: { row: source, evidence: { page: 1, text: d.title }, review: { status: 'accepted', by: BY } },
    grades: [{ key: 'main', row: gradeRow, review: { status: 'accepted', by: BY, note: 'Existing exact product binding; the grade, its material and its primary source are unchanged.' } }],
    measurements: [], profiles, evidence: [], headlines: [], coverage: [], settings: [],
    skipped: [{ note: d.skipped }],
    review: { status: 'reviewed', by: BY, note: `Maker document for the existing product ${d.grade}: print settings only (${profiles.length} profile row(s)); no measurement is entered. ${d.skipped}` },
  };
  // The same maker address was registered on an earlier day with other bytes: the earlier source stays, pinned by digest.
  if (d.earlier) proposal.review.retrievalRevision = { previousSourceID: d.earlier.sourceId, previousSHA256: d.earlier.sha256, accessed: DATE, by: BY };
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
const q = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const manifest = ['file,url,doc,for,provider,manufacturer,product,sha256,accessed,by'];
for (const d of docs) {
  const grade = t.get('grades', d.grade);
  const digest = sha(readFileSync(join(BYTES, `${d.file}.bin`)));
  manifest.push([`${d.file}.bin`, d.url, '', grade.SourceID, d.maker, d.maker, d.title, digest, DATE, 'Claude Sonnet (reader round b42)'].map(q).join(','));
}
writeFileSync(join(BYTES, 'manifest.csv'), `${manifest.join('\n')}\n`);

const packet = {
  PacketID: 'b42-maker-pages', Batch: 'b42', ExpectedGrades: [...expectedGrades.values()], Documents: packetDocs,
  Review: { prepared_by: 'Claude Sonnet (reader round b42)', for: 'Claude Opus', scope: 'print settings only; no measurement' },
  NotAdmitted: [
    { Product: 'retailer pages (KOLTRON, B2B Arnitel ID 2045)', Why: 'a retailer is not the maker; KOLTRON is Add North 3D\'s product and its maker pages are script-drawn' },
    { Product: 'G137-01, G137-03, G167-13, G170-01 (purefil / Fabru)', Why: 'the registered sheets already print the values; the text layer drops a ligature in "Printing temperature"' },
    { Product: 'G030-02, G084-01, G114-01, G126-01 TDS and 3DXTECH specimen blocks', Why: 'a test-bar "Extrusion Temp" / "Bottom Plate Heating" is a specimen setting, never guidance (m170)' },
    { Product: 'G116-02 TriStat ESD-PC Model Material', Why: 'the page found is the 3DXSTAT ESD-PC spool filament, not the Triton3D model material; the Triton ESD-PC page prints no settings block' },
    { Product: 'G029-11 TriMax Carbon Fiber ABS, G030-11 TriStat ESD-ABS (Triton3D pages)', Why: 'identity unconfirmed: Triton3D page names another product line (TRITON3D ABS+CF and ESD-ABS; nothing on them names TriMax or TriStat). OPEN-PROBLEMS lead' },
    { Product: 'G030-11 3DXSTAT ESD-ABS spool page', Why: 'the same settings as the admitted Triton3D ESD-ABS page, but the maker\'s spool product, not the model material' },
    { Product: 'G084-01 FibreX GF PP archive', Why: 'the archived page prints no settings; the quoted figures were seen only in a search summary' },
    { Product: 'Raise3D ideaMaker profiles (G053-09, G059-03, G071-04)', Why: 'a slicer preset, not the maker\'s guidance document' },
    { Product: 'G075-09, G080-03 Raise3D; G081-07, G094-09 Stratasys; G164-05 UltiMaker; G166-01 Markforged', Why: 'the pages print no settings (script-drawn, 403, or printer-controlled)' },
    { Product: 'G019-02, G138-03 iSANMATE; G149-01 iSANMATE PCL', Why: 'no product page (G019-02, G138-03); the PCL page is a 3D-pen filament whose Capa 6500 identity is unconfirmed' },
    { Product: 'G149-03 SUNLU PCL', Why: 'the registered sheet prints the same figures' },
    { Product: 'G149-04 BioFil PCL (FormFutura page)', Why: 'the grade is Filament2Print\'s listing; its FormFutura datasheet returned HTML and the identity of the 1.75 mm listing is unconfirmed' },
    { Product: 'G046-03 Arnitel ID 2045', Why: 'only a retailer page and a search summary' },
    { Product: 'BigRep shop pages', Why: 'the same block as the admitted maker-site pages: a copy of one statement is not a second source' },
  ],
};
writeFileSync('docs/audits/2026-10-04-reader-round/ingest/b42-packet.json', `${JSON.stringify(packet, null, 2)}\n`);
console.log(`${packetDocs.length} proposals; packet sha ${sha(`${JSON.stringify(packet, null, 2)}\n`).slice(0, 12)}`);
