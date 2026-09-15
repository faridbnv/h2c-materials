#!/usr/bin/env node
// The index at the head of docs/DECISIONS.md: every decision, in force or superseded, with what replaced it. The file
// is 60 decisions long and a reader needs to know which ones still hold before reading any of them.
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
const body = text.slice(text.indexOf('## D1.') >= 0 ? 0 : 0);

const rows = [];
for (const m of body.matchAll(/^## (D\d+)\. (.+)$/gm)) {
  const [, id, heading] = m;
  const section = body.slice(m.index, body.indexOf('\n## ', m.index + 1) + 1 || undefined);
  // "(superseded by D42, then D43)" in the heading, or "*Amended by D59 ...*" in the body.
  const inHeading = /\(([^)]*\b(?:superseded|narrowed|amended)\b[^)]*)\)\s*$/i.exec(heading);
  const amended = [...section.matchAll(/^\*Amended by (D\d+)/gm)].map((a) => a[1]);
  const title = inHeading ? heading.slice(0, inHeading.index).trim() : heading;
  const note = inHeading && `${inHeading[1].charAt(0).toUpperCase()}${inHeading[1].slice(1)}`;
  const status = note ?? (amended.length ? `Amended by ${amended.join(', ')}` : 'In force');
  rows.push(`| ${id} | ${title} | ${status} |`);
}

const index = [START, '', '| | Decision | Status |', '|---|---|---|', ...rows, '', END].join('\n');
const has = text.includes(START);
const next = has ? text.slice(0, text.indexOf(START)) + index + text.slice(text.indexOf(END) + END.length)
  : text.replace('\n---\n', `\n${index}\n\n---\n`);

if (process.argv.includes('--check')) {
  if (next !== text) { console.error('docs/DECISIONS.md index is out of date; run npm run docs:decisions'); process.exit(1); }
  console.log('docs/DECISIONS.md index is current');
} else {
  writeFileSync(path, next);
  console.log(`docs/DECISIONS.md: ${rows.length} decisions indexed`);
}
