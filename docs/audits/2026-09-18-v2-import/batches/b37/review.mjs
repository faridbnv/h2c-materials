#!/usr/bin/env node
// Batch b37's review, as it was made: the two held sheets whose identity the makers' own pages settle (R203, R204;
// the owner lifted the pause for them on 2026-09-27), each row decided through scripts/ingest/review.mjs by an agent
// named as the reviewer. Every row was read against its line on the page; neither sheet is an optical reading. A row
// the page does not print is rejected with the line quoted, never corrected; --set writes only what the page prints.
//
//   node docs/audits/2026-09-18-v2-import/batches/b37/review.mjs

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { projectRoot } from '../../../../../scripts/data/table-io.mjs';

const BATCH = 'b37';
const BY = 'claude-opus-5.5 (agent reviewer)';
const READ = 'read against the page: the row states its property, its method, its condition and its unit as the sheet prints them, and the identity is the one the rulings of 2026-09-27 give (R203, R204)';
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
// A source's title is not a reviewable row; the reader takes it from the page's first line. Where that line is page
// furniture (Timberfill's lone "®", m149's class), the title the page prints is written into the proposal with the
// reviewer's note, before apply lints it.
function title(doc, printed, note) {
  const path = join(projectRoot, 'archive/ingest-2026-09-18/proposals', BATCH, `${doc}.json`);
  const proposal = JSON.parse(readFileSync(path, 'utf8'));
  if (proposal.source.row.Title === printed) return `${doc}: title already "${printed}"`;
  const before = proposal.source.row.Title;
  proposal.source.row.Title = printed;
  proposal.source.review = { ...(proposal.source.review ?? {}), titleRead: { by: BY, before, note } };
  writeFileSync(path, `${JSON.stringify(proposal, null, 2)}\n`);
  return `${doc}: title "${before}" -> "${printed}"`;
}

// ------------------------------------------------------------------------ Fillamentum Timberfill: PLA Wood (R203)
const TIMBERFILL = '0bc016140a8e4346';
log(title(TIMBERFILL, 'Timberfill', 'p. 1 prints "®" over "Timberfill", the sheet\'s heading; the reader took the mark'));
log(review(TIMBERFILL, '--set', 'main', 'Composition / filler=composed of different types of bioplastics and natural fibres obtained from wood (p. 1, as the sheet states it)'));
log(review(TIMBERFILL, '--set', 'm01', 'Test temperature=20 °C'));
log(review(TIMBERFILL, '--set', 'm01', 'Test temperature °C=20'));
log(review(TIMBERFILL, '--set', 'm02', 'Standard / load=ISO 1133 190 °C, 2,16 kg'));
log(review(TIMBERFILL, '--set', 'm06', 'Test temperature=23 °C'));
log(review(TIMBERFILL, '--set', 'm06', 'Test temperature °C=23'));
// The reader leaves "Hot pad 50–60 °C" unread (its label is the sheet's word for the bed); the profile takes it.
for (const cell of ['Bed °C=50–60 °C', 'Bed state=range', 'Bed min °C=50', 'Bed max °C=60', 'Bed requirement=required', 'Locator=p. 1: Recommended printing settings (Print temperature, Hot pad)']) log(review(TIMBERFILL, '--set', 'p1', cell));
log(review(TIMBERFILL, '--accept', 'm01,m02,m03,m04,m05,m06,m07,m08,m09,p1', '--note', `${READ}. m01's "20 °C" and m06's "23 °C, unnotched" are the sheet's test conditions; m09 prints "ISO 75 method B, 0,45 MPa". The recommended nozzle diameter (0,5 mm) and the bed adhesive stay in the record tier`));
log(review(TIMBERFILL, '--done'));

// ------------------------------------------------------------------------------------ NinjaTek Eel: TPU-EC (R204)
// The sheet prints each value in two columns, "Dry / COND VALUE*" ("*DRY: Dry As Molded (DAM) if pellet / Dry if
// powder. COND: Conditioned."). The reader took the second column for every row and called it not stated. The dry
// value is the one D84 compares: a row the sheet prints dry becomes the dry value; a row it prints only conditioned
// ("-" in the dry column) keeps that value, conditioned. The conditioned values of the rows set to dry stay in the
// record tier. The sheet does not say how its bars were made, so the specimen stays not published.
const EEL = '0cb49f29e7b9ac7f';
log(title(EEL, 'Technical Specifications — Eel 3D Printing Filament', 'p. 1 prints "Technical Specifications" over "Eel 3D Printing Filament"; the reader took the first line alone'));
const DRY = 'Dry (the sheet\'s DRY column: "Dry As Molded (DAM) if pellet / Dry if powder")';
const COND = 'Conditioned (the sheet\'s COND column: "COND: Conditioned."; its DRY column prints "-")';
log(review(EEL, '--rename', 'Eel', '--note', 'p. 1 prints "Eel 3D Printing Filament"; the ledger\'s "NinjaFlex Edge" was the listing\'s slip (R204)'));
log(review(EEL, '--set', 'main', 'Composition / filler=NinjaTek\'s first truly conductive, flexible filament (p. 1, as the sheet states it)'));
const set = (id, pairs) => { for (const p of pairs) log(review(EEL, '--set', id, p)); };
set('m02', ['Raw value=305 MPa', 'Raw numeric=305', 'Normalized value=0.305', 'Standard / load=ISO 527-1/-2, 1 mm/min', 'Locator=p. 1: Tensile modulus, 23°C (73°F), 1 mm/min, Dry', `Moisture condition=${DRY}`, 'Moisture state=dry']);
set('m03', ['Raw value=18 MPa', 'Raw numeric=18', 'Normalized value=18', 'Standard / load=ISO 527-1/-2, 50 mm/min', 'Locator=p. 1: Yield stress, 23°C (73°F), 50 mm/min, Dry', `Moisture condition=${DRY}`, 'Moisture state=dry']);
set('m05', ['Standard / load=ISO 527-1/-2, 50 mm/min', 'Locator=p. 1: Nominal strain at break, 23°C (73°F), 50 mm/min, Dry', `Moisture condition=${DRY}`, 'Moisture state=dry']);
set('m01', ['Standard / load=ISO 178', 'Locator=p. 1: Flexural modulus, 23°C (73°F), COND', `Moisture condition=${COND}`, 'Moisture state=conditioned']);
set('m04', ['Standard / load=ISO 527-1/-2, 50 mm/min', 'Locator=p. 1: Stress at break, 23°C (73°F), 50 mm/min, COND', `Moisture condition=${COND}`, 'Moisture state=conditioned']);
set('m06', ['Standard / load=ISO 868, 15 s', 'Locator=p. 1: Hardness, Shore D, 15 s, COND', `Moisture condition=${COND}`, 'Moisture state=conditioned']);
log(review(EEL, '--accept', 'm01,m02,m03,m04,m05,m06', '--note', `${READ}. Each value is the column the sheet prints it in: dry where the DRY column prints one (m02 305 MPa, m03 18 MPa, m05 > 50 %), conditioned where it prints "-" (m01, m04, m06). The conditioned 298 MPa and 17 MPa, the yield strain, the Charpy "No break" rows and the resistances stay in the record tier`));
log(review(EEL, '--done'));
