#!/usr/bin/env node
// The index at the head of docs/DECISIONS.md: every decision, in plain words, in force or changed, with what changed
// it. A reader needs to know which decisions still hold, and what each one decides, before reading any of them.
//
// Each entry opens with its own lines, which this reads:
//
//   > **In plain words:** what it decides, for a reader who was not there.
//   > **Status:** superseded by D45; or amended by D83 (...); or in force; extended by D74.
//
// The status line is written where a later decision changed the entry. Without one the status is read, as before,
// from "(superseded by ...)" in the heading or an "*Amended by Dnn" line in the body, and is "In force" otherwise.
// A decision with no plain-words line is indexed with a dash and named on stderr, so a new entry is asked for one.
//
//   npm run docs:decisions            rewrite the index
//   npm run docs:decisions -- --check exit 1 if it is out of date (run by npm run verify)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'docs/DECISIONS.md');
const START = '<!-- index: npm run docs:decisions -->';
const END = '<!-- end index -->';

const text = readFileSync(path, 'utf8');
const capital = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
// A table cell holds one line, and a pipe would end it.
const cell = (s) => s.replace(/\|/g, '\\|').trim();

const rows = [];
const unsummarised = [];
for (const m of text.matchAll(/^## (D\d+)\. (.+)$/gm)) {
  const [, id, heading] = m;
  const next = text.indexOf('\n## ', m.index + 1);
  const section = text.slice(m.index, next < 0 ? undefined : next + 1);
  // "(superseded by D42, then D43)" in the heading, or "*Amended by D59 ...*" in the body.
  const inHeading = /\(([^)]*\b(?:superseded|narrowed|amended)\b[^)]*)\)\s*$/i.exec(heading);
  const amended = [...section.matchAll(/^\*Amended by (D\d+)/gm)].map((a) => a[1]);
  const plain = /^> \*\*In plain words:\*\* (.+)$/m.exec(section)?.[1];
  const stated = /^> \*\*Status:\*\* (.+)$/m.exec(section)?.[1];
  const title = inHeading ? heading.slice(0, inHeading.index).trim() : heading;
  const status = stated ? capital(stated.replace(/\.$/, ''))
    : inHeading ? capital(inHeading[1])
    : amended.length ? `Amended by ${amended.join(', ')}` : 'In force';
  if (!plain) unsummarised.push(id);
  rows.push(`| ${id} | ${cell(title)} | ${plain ? cell(plain) : '—'} | ${cell(status)} |`);
}

const index = [START, '', '| | Decision | In plain words | Status |', '|---|---|---|---|', ...rows, '', END].join('\n');
const has = text.includes(START);
const next = has ? text.slice(0, text.indexOf(START)) + index + text.slice(text.indexOf(END) + END.length)
  : text.replace('\n---\n', `\n${index}\n\n---\n`);

if (unsummarised.length) console.error(`docs/DECISIONS.md: ${unsummarised.join(', ')} ha${unsummarised.length > 1 ? 've' : 's'} no "> **In plain words:**" line; add one under the heading`);
if (process.argv.includes('--check')) {
  if (next !== text) { console.error('docs/DECISIONS.md index is out of date; run npm run docs:decisions'); process.exit(1); }
  console.log('docs/DECISIONS.md index is current');
} else {
  writeFileSync(path, next);
  console.log(`docs/DECISIONS.md: ${rows.length} decisions indexed, ${rows.length - unsummarised.length} in plain words`);
}
