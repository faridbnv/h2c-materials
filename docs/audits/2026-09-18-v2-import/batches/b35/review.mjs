#!/usr/bin/env node
// Batch b35's review, as it was made: the three sheets whose identity the owner settled on 2026-09-25 after batch b34
// (R199 to R202), each row decided through scripts/ingest/review.mjs by an agent named as the reviewer. Every row was
// read against its line on the page; none of the three is an optical reading (the TPV sheet's text layer is the PDF's
// own, whatever the inventory's "Scanned TDS" note said). A row the page does not print is rejected with the line
// quoted, never corrected; --set writes only what the page prints.
//
//   node docs/audits/2026-09-18-v2-import/batches/b35/review.mjs

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { projectRoot } from '../../../../../scripts/data/table-io.mjs';

const BATCH = 'b35';
const BY = 'claude-opus-5.5 (agent reviewer)';
const READ = 'read against the page: the row states its property, its method, its condition and its unit as the sheet prints them, and the identity is the one the owner\'s rulings of 2026-09-25 give (R199 to R202)';
const review = (doc, ...args) => {
  try {
    return execFileSync('node', [join(projectRoot, 'scripts/ingest/review.mjs'), '--batch', BATCH, '--doc', doc, ...args, '--by', BY],
      { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    process.exitCode = 1;
    return `${doc}: ${String(e.stderr || e.message).trim()}`;
  }
};
const log = (s) => console.log(s);

// ---------------------------------------------------------------- purefil TPV: TPE, polymer not stated (R201)
const TPV = '0d7409be7fc659cf';
log(review(TPV, '--rename', 'Thermoplastic vulcanizate (TPV)', '--note', 'p. 1 prints "Thermoplastic vulcanizate (TPV)"; the text layer draws its "ti" ligature as "+". The listing\'s "TPS 40D" is another sheet (816a9fd447126279)'));
log(review(TPV, '--set', 'main', 'Composition / filler=TPV is a high-quality thermoplastic vulcanizate specially developed for demanding technical applications, with a Shore A hardness of 92 (p. 1, as the sheet states it)'));
log(review(TPV, '--reject', 'm01', '--note', 'The same density as m03, read again from the prose "the density of approximately 1.24g/cm³"; recorded once, from the table\'s "Density (ISO 1183 1A) 1.24 g/cm3"'));
log(review(TPV, '--reject', 'p1', '--note', 'Every cell unread: the page prints printing temperature 175-230 °C, heated bed 80-95 °C, build chamber 60-80 °C and drying 82 °C for 3 h in a two-column layout the reader does not pair'));
log(review(TPV, '--accept', 'm02,m03', '--note', `${READ}. The reader leaves the yield stress (7.2 MPa), the elongation at break (630 %, ISO 37), the shrinkage (1.1 %) and the heat deflection (90 °C at 0.45 MPa) unread; they stay in the record tier`));
log(review(TPV, '--done'));

// ------------------------------------------------------------------------------ FormFutura Crystal Flex: SBC (R200)
const CF = '95dd0c3faeba8285';
log(review(CF, '--set', 'm04', 'Property=Tensile yield strength'));
log(review(CF, '--set', 'main', 'Composition / filler=An easy to use high-end SBC (Styrene Butadiene Block Copolymer) type of 3D printer filament (p. 1, as the sheet states it)'));
log(review(CF, '--set', 'main', 'Certification claims=REACH compliant: Yes; RoHS certified: Yes; FDA compliant: Yes (p. 1, as printed; a typical value, not a certificate: verify grade, thickness and certificate)'));
log(review(CF, '--accept', 'm01,m02,m03,m04,m05,m06,m07,m08,p1', '--note', `${READ}. m04 prints "Tensile strength 26 Mpa ASTM D638 @ Yield 2.0 in/min", a yield strength, which its Property now says. The certification the reader read ran into the diameter table beside it; the grade carries the three lines the page prints. The Vicat (82 °C) and the optical values stay in the record tier`));
log(review(CF, '--done'));

// ------------------------------------------------------ QIDI S-White: Support for ABS (R202), read and not applied
const SW = 'https://drive.google.com/file/d/1SmKn9yDfEWdgjZGdPaeDpQ8je57Egjdh/view?usp=drive_link';
log(review(SW, '--reject', 'm02', '--note', 'Misread: the page prints "吸湿率 ISO 62: / 0.4 % / Water absorption Method 1", 0.4 % by ISO 62 Method 1; the reader took "Method 1 0.4 %" for 1 ± 0.4 %. The bilingual layout QIDI\'s reader gap names'));
log(review(SW, '--accept', 'm01,m03', '--note', `${READ}`));
