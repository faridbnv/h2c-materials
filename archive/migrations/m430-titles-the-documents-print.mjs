#!/usr/bin/env node
// Migration m430 (2026-10-17): source titles a text layer garbled, written as the documents print them (data review fixes,
// item 8; a Claude Sonnet reader read all 2,016 titles and every flagged document's first page, image or saved HTML;
// judged by Claude Opus).
//
// The reviewers saw "8 Sambu TDS of Bambu PLA Pure", the Bambu Lab logo and the heading read together by optical
// character recognition. A Title is the title the publisher printed (D63). 229 titles change:
// - OCR and text-layer debris (143): a logo read as letters ("8 Sambu", "‘a ioerlogy", "Fioerlogy", "UTURA"), a
//   trade-mark sign read as "TM" (TriMaxTM, CARBONXTM), "Thermoplas+c", words run together ("TechnicalDataSheet"), a
//   banner doubled, a file name ("PolySonic PLA EN V5 3"), a document-number cell ("文件编号 SL-TE-WI-164"), a tagline
//   ("Professional 3D Filament Manufacturer", "Innovators in 3D printing"), a table's header row, a company address,
//   a version label, and web pages titled by their shop's chrome ("Store", "Sales Resin Filament ... SUPPORT BLOG",
//   "× Sorry to interrupt CSS Error"), which take the page's own title.
// - A heading kept without the product it heads (86): "Technical Data Sheet", "KARTA TECHNICZNA", "Product
//   Information", "FILAMENT" alone, where the page prints the product beside it; the title is the page's heading and
//   product line, in the form the publisher's other titles take.
// A page's own misspelling stays ("Techanical Data Sheet", Yousu's "3D FILMAENT"); full-width brackets printed beside Latin
// text are written as ASCII (TEXT-FULLWIDTH). The rows, with what each page prints,
// are docs/audits/2026-10-17-data-review-fixes/source-titles.csv; 208 of the titles' words are on the cached text, and
// the other 21 were read on the page image where the text layer differs (ligatures, superscripts, an image heading). A
// re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m430-titles-the-documents-print.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm430';
const t = openTables();
let n = 0;
for (const r of rowsOf(join(projectRoot, 'docs/audits/2026-10-17-data-review-fixes/source-titles.csv'))) {
  const s = t.get('sources', r.SourceID);
  if (s.Title === r['Title after']) continue;
  t.set('sources', r.SourceID, 'Title', r['Title after'], { expect: r['Title before'], migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} source title(s) written as the documents print them`);
