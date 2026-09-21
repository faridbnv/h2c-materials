#!/usr/bin/env node
// Every document that is not applied, and what stands between it and being applied.
//
//   npm run ingest:blockers
//
// The ledger says why each document waits; this says what would have to happen, who it waits on, and — where
// the answer is not known — what makes it uncertain. That last column is the point. A queue that says only
// "held: twin" reads as one problem with 143 instances, and it was four problems with different answers; a
// queue that says "the sheet it repeats is not applied yet" says which of them will clear by itself.
//
// Generated, because a register of blockers written by hand is a register of the blockers somebody remembered.

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readCsv, csvText } from '../../build/src/csv.js';
import { projectRoot } from '../data/table-io.mjs';
import { readLedger } from './inventory.mjs';

const AUDIT = join(projectRoot, 'docs/audits/2026-09-18-v2-import');

/**
 * What each way of waiting needs, and from whom. `whose` is the thing to be honest about: a blocker nobody owns
 * is a blocker nobody clears, and three of these wait on a person rather than on the pipeline.
 */
const BLOCKERS = [
  { id: 'ruling:R075/R077/R083', whose: 'the owner',
    match: (r) => /^held: ruling/.test(r.status_note) && /no base polymer in|names a family, not a polymer|would create the material|no material is not a material/.test(r.status_note),
    needs: 'a verdict in readings/readings.csv. The reading is done and cited; what is missing is permission',
    uncertain: 'for 76 of the 117 read so far the sheet itself names no polymer, so the answer is the maker’s and not the page’s' },
  // Rulings the owner has already given, whose documents still wait because the pipeline has not built what the
  // ruling asks for. Listing them under "the owner" asked the owner the same question twice.
  { id: 'ruling:R076-supports', whose: 'the pipeline',
    match: (r) => /^held: ruling/.test(r.status_note) && /is a support or soluble product/.test(r.status_note),
    needs: 'R076 built: the support chemistry read from the sheet (PVA, BVOH, HIPS, or a breakaway named for what it supports) and the grade filed under that material',
    uncertain: 'a breakaway support that names no chemistry is filed by what it supports (M077 to M080), which its sheet does state' },
  { id: 'ruling:R081-polymer-row', whose: 'the pipeline',
    match: (r) => /^held: ruling/.test(r.status_note) && /"(PA11|SEBS|PCL)" has no row in polymers\.csv/.test(r.status_note),
    needs: 'R081 built: a polymers.csv row from the resin producer\u2019s reference, fetched and hashed (Arkema for PA11, Kraton for SEBS), as m70 did',
    uncertain: '' },
  { id: 'ruling:R082-blend', whose: 'the pipeline',
    match: (r) => /^held: ruling/.test(r.status_note) && /names more than one polymer/.test(r.status_note),
    needs: 'R082 built: a material named for the blend, with its own polymers.csv row (PLA-PHA as PC-ABS is)',
    uncertain: 'Siraya\u2019s "PAHT CF (PPA based)" names one polymer twice, not two; that one is a reader question' },
  { id: 'ruling:misread', whose: 'the pipeline',
    match: (r) => /^held: ruling/.test(r.status_note) && /"PESU" has no row|which no filament reaches|is below what neat|above what neat (HIPS|PE)\b/.test(r.status_note),
    needs: 'a reading of the page: the reader took a polymer or a density off the sheet that the sheet does not state that way',
    uncertain: 'the two PESU are Filament2Print\u2019s Eco Coffee and Flex 77A, which are not polyethersulfone; ISTROFLEX is a Shore D 44 elastomer the reader files under HIPS' },
  { id: 'ruling:unsettled', whose: 'the owner', list: true,
    match: (r) => /^held: ruling/.test(r.status_note),
    needs: 'a ruling of its own: each of these says something no policy so far covers, and each is listed below with what the reader saw',
    uncertain: 'four of these are one question: copper, magnetite and tungsten are loads R080 named none of, and one metal value in modifiers.csv would take all of them. A maker who declares the load has named a filler the vocabulary lacks, which is a ruling and not the undisclosed filler R078 speaks for' },
  { id: 'twin:not-yet-applied', whose: 'the pipeline',
    match: (r) => /^held: twin/.test(r.status_note),
    needs: 'the sheet it repeats to be applied first, or a reading of the two sheets',
    uncertain: '"one sheet served twice, or two products tested once?" — the extract stage pairs them and says the question is open. The product name with the maker’s off it decides the clear ends and not the middle' },
  { id: 'no-values:language', whose: 'the pipeline',
    match: (r) => /^held: no-values:language/.test(r.status_note),
    needs: 'property labels in the sheet’s language in scripts/ingest/lexicon/property-labels.csv, as the fifteen Chinese ones entered in b15',
    uncertain: 'nothing; below the twenty-document line for a rule until more sheets in that language arrive' },
  { id: 'no-values:prose', whose: 'the pipeline, or nobody',
    match: (r) => /^held: no-values:prose/.test(r.status_note),
    needs: 'a reading of the page: the values are in sentences, or in a layout the reader cannot pair with its labels',
    uncertain: 'whether a sentence-stated value should enter at all is a data question; a table is a claim and a sentence is marketing' },
  { id: 'no-values:layout', whose: 'the pipeline',
    match: (r) => /^held: no-values:layout/.test(r.status_note),
    needs: 'the layout named per document; it has labels and values and the reader pairs none', uncertain: '' },
  { id: 'no-values', whose: 'the pipeline, or nobody',
    match: (r) => /^held: no-values/.test(r.status_note),
    needs: 'a reader rule, or the finding that the document is a brochure', uncertain: '' },
  { id: 'ocr-visual', whose: 'a reader',
    match: (r) => /^held: ocr-visual/.test(r.status_note),
    needs: 'a person against the page image, row by row (ingest:review --visual)',
    uncertain: 'nothing: D35 says an optical reading may not enter on a machine’s word, and that is the whole blocker' },
  { id: 'reader:several-values', whose: 'the pipeline',
    match: (r) => /^held: reader:several-values/.test(r.status_note),
    needs: 'the table read by column position: "Method | Molded | X-Y | Z" prints three results on one line',
    uncertain: 'refusing such a row inside the reader was tried and cost 297 values the database already holds' },
  { id: 'reader:condition-table', whose: 'the pipeline',
    match: (r) => /^held: reader:condition-table/.test(r.status_note),
    needs: 'each row to carry the caption of the table it came from',
    uncertain: 'nothing, and it is measured: the columns are read now and the 24 documents yield 379 values, 280 stating a direction. Nine of eleven sheets then hold one property in one direction two or three times, one row per layer height, with nothing saying which table each came from' },
  { id: 'reader:other', whose: 'the pipeline',
    match: (r) => /^held: reader:/.test(r.status_note),
    needs: 'a reader rule named on the row',
    uncertain: '' },
  { id: 'registered', whose: 'nobody',
    match: (r) => /^held: registered/.test(r.status_note),
    needs: 'nothing: the product is in the database under another document',
    uncertain: '' },
  { id: 'held:other', whose: '—', match: (r) => r.status === 'held', needs: 'a reason nothing has written yet', uncertain: 'this row is the bug: every hold should name one' },
  { id: 'gated', whose: 'the owner', match: (r) => r.status === 'gated',
    needs: 'credentials or a browser (R084). FormFutura serves its library from SharePoint',
    uncertain: 'how many of the 64 rewrite to a direct download has not been tested' },
  { id: 'needs-staging', whose: 'the owner', match: (r) => r.status === 'needs-staging',
    needs: 'the bytes, staged by hand; the pipeline hashes what it is given (R084)', uncertain: '' },
  { id: 'inventoried', whose: 'the pipeline', match: (r) => r.status === 'inventoried',
    needs: 'a fetch. INTAMSYS serves its sheets behind a request form',
    uncertain: 'whether the form can be satisfied without an account has not been tested' },
  { id: 'needs-ocr', whose: 'the pipeline, then a reader', match: (r) => r.status === 'needs-ocr',
    needs: 'ingest:ocr, and then the same visual review every optical reading needs', uncertain: '' },
  { id: 'unreadable', whose: 'the pipeline', match: (r) => r.status === 'unreadable',
    needs: 'a capture that waits for the page to finish drawing its tables',
    uncertain: 'BASF’s 17 and UltiMaker’s 6 draw their tables with a script; whether waiting is enough is untested' },
  { id: 'unreachable', whose: 'nobody', match: (r) => r.status === 'unreachable',
    needs: 'nothing, or one Wayback retry each', uncertain: 'the URL is gone; whether the sheet is depends on the maker' },
  { id: 'extracted', whose: 'the pipeline', match: (r) => r.status === 'extracted',
    needs: 'a batch: nothing holds it', uncertain: '' },
];

const DONE = new Set(['applied', 'duplicate-of', 'safety-data-sheet', 'not-a-data-sheet', 'skipped', 'registered', 'rejected']);

export function blockers() {
  const rows = readLedger();
  const open = rows.filter((r) => !DONE.has(r.status));
  const taken = new Set();
  const out = [];
  for (const b of BLOCKERS) {
    const mine = open.filter((r) => !taken.has(r.doc_key) && b.match(r));
    for (const r of mine) taken.add(r.doc_key);
    if (!mine.length) continue;
    const makers = new Map();
    for (const r of mine) makers.set(r.provider, (makers.get(r.provider) ?? 0) + 1);
    out.push({ ...b, n: mine.length, makers: [...makers].sort((a, b2) => b2[1] - a[1]), rows: b.list ? mine : [] });
  }
  return { rows, open, out };
}

if (process.argv[1]?.endsWith('blockers.mjs')) {
  const { rows, open, out } = blockers();
  const applied = rows.filter((r) => r.status === 'applied').length;
  const settled = rows.filter((r) => DONE.has(r.status)).length;
  const byWhose = new Map();
  for (const b of out) byWhose.set(b.whose, (byWhose.get(b.whose) ?? 0) + b.n);

  const doc = ['# What is in the way', '',
    `Generated by \`npm run ingest:blockers\` on ${new Date().toISOString().slice(0, 10)}.`, '',
    `**${applied} of ${rows.length} documents are applied**, and ${settled - applied} more are settled as a duplicate, a safety sheet or out of scope.`,
    `That leaves **${open.length}**, and this is what stands in front of each of them.`, '',
    'What waits on the owner is here too: the verdicts in [READINGS.md](READINGS.md), the one-off rulings listed',
    'under `ruling:unsettled`, and the gated documents. There is no separate decisions document any more.', '',
    '**The owner\u2019s three jobs, and what turns each into data:**', '',
    '1. **Verdicts.** One word per row in `readings/readings.csv` (`yes`, `no`, or the polymer it should be); then',
    '   `npm run ingest:readings -- --rulings` writes them to the register and `npm run ingest:batch -- --propose --held ruling`',
    '   re-reads the sheets under them.',
    '2. **Rulings.** A row in `rulings/rulings.csv` for each item under `ruling:unsettled` below.',
    '3. **Documents nobody can fetch.** Save each from a browser (R084) and `npm run ingest:fetch -- --stage <folder> --provider <maker>`',
    '   hashes them against their rows by file name; one file is `--stage <file> --doc <key>`. They then travel the pipeline as',
    '   fetched documents do, with Access state `retrieved-copy`.', '',
    '## Who they wait on', '', '| | Documents |', '|---|---:|',
    ...[...byWhose].sort((a, b) => b[1] - a[1]).map(([who, n]) => `| ${who} | ${n} |`), '',
    '## Each blocker, what it needs, and what is uncertain about it', ''];

  for (const b of out) {
    doc.push(`### \`${b.id}\` — ${b.n} document(s)`, '',
      `**Waits on:** ${b.whose}. **Needs:** ${b.needs}.`, '',
      b.uncertain ? `**Uncertain:** ${b.uncertain}.` : '_Nothing uncertain about it._', '',
      `Where: ${b.makers.slice(0, 8).map(([m, n]) => `${m} ${n}`).join(', ')}${b.makers.length > 8 ? `, and ${b.makers.length - 8} more` : ''}.`, '');
    // The owner's one-offs are the decisions pack now, one line each, with what the reader saw. The pack that
    // used to be its own document asked nine questions and every one of them has been answered (R074 to R083).
    if (b.rows.length) {
      doc.push(...b.rows.map((r) => `- **${r.provider} ${r.product_raw || r.doc_key}** \u2014 ${String(r.status_note).replace(/^held: ruling \u2014 /, '').slice(0, 200)}`), '');
    }
  }

  writeFileSync(join(AUDIT, 'BLOCKERS.md'), doc.join('\n'));
  const HEADER = ['Blocker', 'Waits on', 'Documents', 'Needs', 'Uncertain', 'Where'];
  writeFileSync(join(AUDIT, 'census/blockers.csv'), csvText(HEADER, out.map((b) => ({
    Blocker: b.id, 'Waits on': b.whose, Documents: String(b.n), Needs: b.needs,
    Uncertain: b.uncertain || 'Nothing', Where: b.makers.map(([m, n]) => `${m} ${n}`).join('; '),
  }))));
  console.log(`${open.length} document(s) open across ${out.length} blocker(s) -> BLOCKERS.md and census/blockers.csv`);
  for (const b of out) console.log(`  ${String(b.n).padStart(4)}  ${b.id.padEnd(26)} ${b.whose}`);
}
