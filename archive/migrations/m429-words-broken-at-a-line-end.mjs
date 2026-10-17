#!/usr/bin/env node
// Migration m429 (2026-10-17): makers' statements whose words were broken at a PDF's line ends are written whole (data
// review fixes, item 7; a Claude Sonnet reader judged each word on its page, image where the text layer interleaves;
// judged by Claude Opus).
//
// The reviewers saw "Labora- tories", "advan- tage" and "ex- ecute" in the makers' statements the pages show. A sheet
// set in justified columns breaks a word at a line end with a hyphen, and the import kept it. Every hyphenated token of
// evidence.csv's statements was listed (3,264; 89 picked by a dictionary test, the other 785 kinds scanned by eye), and
// each candidate read on its page: 64 words printed split across a line end, in 63 cells, are joined ("Labora-" /
// "tories" is Laboratories). A real compound stays as it is, wherever it falls (pre-dry, co-polyester, bio-based,
// multi-colored, cyclo-olefin; "highest-qual-ity" keeps its compound's hyphen). Three more, judged here: "every- day
// usability" is everyday and "electro- static discharge" electrostatic, each split at a line end and printed nowhere
// else; "non- reactive" is printed "non-reactive" mid-line, and the stray space goes. Left as the pages print them:
// "ani-bacterial" (a misprint, mid-line), "deform-able" (a web page, mid-line), Spectrum's run-together
// "printingcomponentsrequiring" (only its break is joined). The cells, words and quotes are
// docs/audits/2026-10-17-data-review-fixes/line-break-hyphens.csv; each quote (the line's end, with its hyphen) is checked
// on the cached sheet. A re-run is a no-op, and a run after the data moved stops.
//
//   node scripts/migrate/m429-words-broken-at-a-line-end.mjs
import { join } from 'node:path';
import { openTables, projectRoot } from '../../scripts/data/table-io.mjs';
import { onCachedSheet } from '../../scripts/lib/read-proposals-apply.mjs';
import { rowsOf } from '../../scripts/lib/sweep-shared.mjs';

const MIGRATION = 'm429';
const t = openTables();
let n = 0;
for (const r of rowsOf(join(projectRoot, 'docs/audits/2026-10-17-data-review-fixes/line-break-hyphens.csv'))) {
  const e = t.get('evidence', r.EvidenceID);
  if (e.SourceID !== r.SourceID) throw new Error(`${MIGRATION}: ${r.EvidenceID} cites ${e.SourceID}, not ${r.SourceID}`);
  if (e[r.Column] === r['Cell after']) continue;
  onCachedSheet(t, r.SourceID, r['Quote on the sheet'], MIGRATION);
  t.set('evidence', r.EvidenceID, r.Column, r['Cell after'], { expect: r['Cell before'], migration: MIGRATION });
  n++;
}
if (n) t.save();
console.log(`${MIGRATION}: ${n} statement(s) with words broken at a line end written whole`);
