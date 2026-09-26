#!/usr/bin/env node
// Batch b34's other thirty sheets: where each of the 74 that did not enter stands, and why, written into the ledger
// through scripts/ingest/batch.mjs (--settle for a sheet read and found to be something else, --defer for one that
// waits on a gap a person names). Nothing is left held in silence (AGENTS.md; R165).
//
//   node docs/audits/2026-09-18-v2-import/batches/b34/settle.mjs

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { projectRoot } from '../../../../../scripts/data/table-io.mjs';

const BY = 'claude-opus-5.5 (agent reviewer)';
const batch = (...args) => {
  try {
    return execFileSync('node', [join(projectRoot, 'scripts/ingest/batch.mjs'), ...args, '--by', BY], { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) { process.exitCode = 1; return String(e.stderr || e.message).trim(); }
};
const settle = (key, as, why, to) => console.log(batch('--settle', key, '--as', as, ...(to ? ['--to', to] : []), '--why', why));
const defer = (keys, gap, why) => console.log(batch(...keys.flatMap((k) => ['--defer', k]), '--gap', gap, '--why', why));

// ----------------------------------------------------------------------------------------------- read, and settled
const RESIN = 'R194: Eastman\'s data sheet for the resin, which names the resin and not the filament';
settle('0e294815a86bf8fc', 'registered', `${RESIN}; colorFabb nGen is made of Amphora AM3300 (M092's notes; the owner: AM3300 belongs to nGen / Amphora), recorded as G092-01`, 'S-NGEN2');
settle('035bc980a7aee312', 'registered', `${RESIN}; colorFabb's own sheet says "colorFabb_HT is producted using Eastman Amphora HT5300", recorded as G089-04`, 'R-COLORFABB-TDS-E-ColorFabb-HT');
settle('1fef87181e40917c', 'registered', `${RESIN}; colorFabb's own sheet says "colorFabb_XT is a co-production with Eastman Amphora AM1800", recorded as G089-03`, 'R-COLORFABB-TDS-E-ColorFabb-XT-2');
settle('89a1ed38185cf86b', 'not-a-data-sheet', 'BASF\'s "Debinding Simulation Guidelines for 3D Printed Parts using Ultrafuse 316L", listed under Ultrafuse 17-4 PH: a guide to simulating a brown part in debinding, with no property of either product. No 17-4 PH data sheet is in the corpus (R187)');
settle('9aa956a521425ddf', 'not-a-data-sheet', 'Revopoint\'s POP 4 3D scanner brochure ("Blue Multi-line Laser", scan accuracy, working distance), hosted by Filament2Print among its filament sheets: not a filament');

// -------------------------------------------------------------------------------------------------- deferred
defer(['d230eec3cdbe2bbd', '2688570615b2eb82', 'eb2ae5932a890e1a', '4a90a1e5e22db834', '0bc016140a8e4346',
  'https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/FormFutura%20Filaments/SKULPT/Data%20Sheets%20and%20Declarations/TDS%20-%20SKULPT.pdf',
  '0cb49f29e7b9ac7f'],
'identity: names neither polymer nor family',
'the sheet names no polymer and no family a home stands for (colorFabb\'s 2015 "20% milled carbon fibres", Multi3D Electrifi\'s "copper-filled thermoplastic", igus iglidur A350, Nuterials JECTO\'s "natural binder", Fillamentum Timberfill\'s "bioplastics", FormFutura SKULPT, NinjaTek Eel\'s "conductive, flexible filament"), so R167 does not reach it; a maker document naming the polymer or the family frees it, or the owner\'s ruling');
defer(['https://formfutura.sharepoint.com/sites/downloads/Shared%20Documents/Downloads%20Server/Materials/Filaments/FormFutura%20Filaments/Crystal%20Flex/Data%20Sheets%20and%20Declarations/TDS%20-%20Crystal%20Flex.pdf'],
'identity: owner ruling pending',
'the sheet names its polymer after all, "SBC (Styrene Butadiene Block Copolymer)", Shore D 63 with a flexural modulus of 1795 MPa: a clear, stiff styrenic, not an elastomer, so not TPS. No material holds SBC and polymers.csv has no row; recommended: an SBC material under Styrenics, its row from a resin producer\'s reference (R081)');
defer(['0d7409be7fc659cf'],
'identity: owner ruling pending',
'the bytes are purefil\'s TPV sheet ("Thermoplastic vulcanizate (TPV)", Shore A 92), not the TPS 40D the listing names, and no ruling covers a TPV; recommended: TPE, polymer not stated (M167), since TPV names a class of elastomer and not its polymer');
defer(['https://drive.google.com/file/d/1SmKn9yDfEWdgjZGdPaeDpQ8je57Egjdh/view?usp=drive_link'],
'identity: owner ruling pending',
'QIDI S-White is a quick-remove breakaway support for seven QIDI materials (ABS-HF, TPU 95A-HF and 85A-HF, PET-GF and -CF, NexABS-GF25 and -CF20) and names no chemistry; R076 files a breakaway by what it supports, and it supports several. Recommended: Support for ABS (M079), the family most of them are');
defer(['af2a1612aba91481'],
'identity: a resin maker\'s sheet naming no filament',
'FKuR\'s sheet for "Fibrolon V 135002 (trial grade)", a PLA blend with wood fibres, listed by 3DJake as colorFabb Woodfill Fine: it names no colorFabb product, and the reader reads none of its values. R194 registers a resin sheet only to a product the database records');
defer(['691787121528d8e1', '36bdc5d8f5c3688c'],
'a language the lexicon lacks',
'Smartfil FLEX 77A\'s Spanish sheet names its polymer ("Poliuretano termoplástico", 77 Shore A: TPU 85A class and softer) and its maker (Smart Materials 3D), and the reader reads two values and neither; the Flashforge / NCI Sales FABRIAL-R TPE sheet is Japanese, read optically, with no value read. A lexicon for either language, or a reading of the page image, frees them');
defer(['8395359922703506', 'e48afc79b561cc0f', '556fd3e0d2ebf186'],
'a layout the reader does not pair',
'Essentium\'s PA and PA-CF sheets (Nylon and Nylon-CF homes by R169) print a column per print orientation and the reader pairs no value; 3D4Makers\' PI Z2 (TPI by R193) prints three orientation columns and no product name the reader finds (its "Z" is the logo), and the one value it read is a standard\'s number');
defer(['https://bigrepgmbh.sharepoint.com/:b:/g/Edf9dbsNa39BiC-Vl1Fh9MwB917sFqJdBc2ekgXXAjmr3g?e=tQs3vW'],
'a text layer whose glyphs are mis-mapped',
'BigRep HI-TEMP\'s text layer maps every glyph to another ("!0%-/\'*$$"), so nothing on it can be read; its page image, read optically (ingest:ocr), frees it for the PLA family\'s home (R185\'s reading of HI-TEMP CF)');
defer(['58a9c5673b437051'],
'several products in one table',
'Markforged\'s "Composites" sheet is one table of four products, a column each (Onyx, Onyx FR, Onyx ESD, Nylon), with continuous-fibre tables below; the reader reads one product per document');
defer(['https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/antero-800na/mds_fdm_antero-800na_0825a.pdf?v=4a4973',
  'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/nylon-cf10/redesign/fdm-nylon-cf10-material-datasheet.pdf?v=4ac731',
  'https://www.stratasys.com/contentassets/6729604c61704654ac5c0392276a2d57/mds_fdm_diran410mf07_0224a-1.pdf?v=4aa22c',
  'https://www.stratasys.com/siteassets/materials/materials-catalog/fdm-materials/st-130/mss_fdm_st130_1016a.pdf?v=48e19f'],
'Stratasys condition tables',
'identity settled where the sheet allows (Antero 800NA is PEKK, R192; Nylon-CF10 the Nylon-CF home, R168; Diran 410MF07 "a nylon-based thermoplastic FDM material, mineral-filled 7% by weight", for the owner: the Nylon home with a declared filler, or a filled home; ST-130 names neither); the values wait on the caption reader, as the other Stratasys sheets do');
