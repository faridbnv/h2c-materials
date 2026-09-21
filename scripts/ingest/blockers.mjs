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
  { id: 'ruling:unsettled', whose: 'the owner',
    match: (r) => /^held: ruling/.test(r.status_note),
    needs: 'a ruling of its own: each of these says something no policy so far covers',
    uncertain: 'two are a magnetite and a tungsten load, which R080 named neither; two are a PESU the reader took off a Filament2Print sheet' },
  { id: 'twin:not-yet-applied', whose: 'the pipeline',
    match: (r) => /^held: twin/.test(r.status_note),
    needs: 'the sheet it repeats to be applied first, or a reading of the two sheets',
    uncertain: '"one sheet served twice, or two products tested once?" — the extract stage pairs them and says the question is open. The product name with the maker’s off it decides the clear ends and not the middle' },
  { id: 'no-values', whose: 'the pipeline, or nobody',
    match: (r) => /^held: no-values/.test(r.status_note),
    needs: 'a reader rule, or the finding that the document is a brochure and carries no values at all',
    uncertain: 'which of the two it is has not been asked per document; Spectrum’s 27 are one shape and would answer together' },
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
    needs: 'a table per condition under repeated headings, with a value column per orientation',
    uncertain: 'nothing: Stratasys prints one layout and 24 documents share it' },
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
    out.push({ ...b, n: mine.length, makers: [...makers].sort((a, b2) => b2[1] - a[1]) });
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
    '## Who they wait on', '', '| | Documents |', '|---|---:|',
    ...[...byWhose].sort((a, b) => b[1] - a[1]).map(([who, n]) => `| ${who} | ${n} |`), '',
    '## Each blocker, what it needs, and what is uncertain about it', ''];

  for (const b of out) {
    doc.push(`### \`${b.id}\` — ${b.n} document(s)`, '',
      `**Waits on:** ${b.whose}. **Needs:** ${b.needs}.`, '',
      b.uncertain ? `**Uncertain:** ${b.uncertain}.` : '_Nothing uncertain about it._', '',
      `Where: ${b.makers.slice(0, 8).map(([m, n]) => `${m} ${n}`).join(', ')}${b.makers.length > 8 ? `, and ${b.makers.length - 8} more` : ''}.`, '');
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
