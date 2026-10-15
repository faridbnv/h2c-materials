#!/usr/bin/env node
// The index at the head of docs/DECISIONS.md: every decision, in plain words, in force or changed, with what changed
// it. A reader needs to know which decisions still hold, and what each one decides, before reading any of them.
//
// A decision that no longer holds at all (superseded or withdrawn) keeps its row here and moves its text to
// docs/DECISIONS-ARCHIVE.md, so DECISIONS.md holds the rules in force (maintainability round, 2026-10-15). An amended or
// narrowed decision stays: its rule still holds. The index reads both files, and its row for an archived decision links
// to it there.
//
// Each entry opens with its own lines, which this reads:
//
//   > **In plain words:** what it decides, for a reader who was not there.
//   > **Status:** superseded by D45; or amended by D83 (...); or in force; extended by D74.
//
// The status line is written where a later decision changed the entry. Without one the status is read from
// "(superseded by ...)" or "(withdrawn)" in the heading, or an "*Amended by Dnn" line in the body, and is "In force"
// otherwise. A decision with no plain-words line is indexed with a dash and named on stderr, so a new entry is asked for
// one; a decision from D138 on that runs past a screen (60 lines) is named too, so the next one stays short.
//
//   npm run docs:decisions            rewrite the index
//   npm run docs:decisions -- --check exit 1 if it is out of date, or a decision is in neither file or in both

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slug } from './docs-links.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIVING = 'docs/DECISIONS.md';
const ARCHIVE = 'docs/DECISIONS-ARCHIVE.md';
const START = '<!-- index: npm run docs:decisions -->';
const END = '<!-- end index -->';
const SCREEN = 60;
const SHORT_FROM = 138;

const capital = (s) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
// A table cell holds one line, and a pipe would end it.
const cell = (s) => s.replace(/\|/g, '\\|').trim();
const read = (file) => (existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : '');

/** The decisions a file holds: each `## Dn.` section up to the next heading of level one or two. */
export function decisionsIn(text, file) {
  const out = [];
  for (const m of text.matchAll(/^## (D(\d+))\. (.+)$/gm)) {
    const [, id, num, heading] = m;
    const after = text.slice(m.index + m[0].length);
    const end = after.search(/\n#{1,2} /);
    const section = end < 0 ? text.slice(m.index) : text.slice(m.index, m.index + m[0].length + end + 1);
    // "(superseded by D42, then D43)" or "(withdrawn)" in the heading, or "*Amended by D59 ...*" in the body.
    const inHeading = /\(([^)]*\b(?:superseded|narrowed|amended|withdrawn)\b[^)]*)\)\s*$/i.exec(heading);
    const amended = [...section.matchAll(/^\*Amended by (D\d+)/gm)].map((a) => a[1]);
    const stated = /^> \*\*Status:\*\* (.+)$/m.exec(section)?.[1];
    out.push({
      id, num: Number(num), file,
      title: inHeading ? heading.slice(0, inHeading.index).trim() : heading,
      anchor: slug(`${id}. ${heading}`),
      plain: /^> \*\*In plain words:\*\* (.+)$/m.exec(section)?.[1] ?? null,
      status: stated ? capital(stated.replace(/\.$/, ''))
        : inHeading ? capital(inHeading[1])
        : amended.length ? `Amended by ${amended.join(', ')}` : 'In force',
      lines: section.trimEnd().split('\n').length,
    });
  }
  return out;
}

/** The index block, and what is wrong with the two files' decisions taken together. */
export function buildIndex(living, archive) {
  const all = [...decisionsIn(living, LIVING), ...decisionsIn(archive, ARCHIVE)].sort((a, b) => a.num - b.num);
  const problems = [];
  const seen = new Map();
  for (const d of all) {
    if (seen.has(d.id)) problems.push(`${d.id} is in both ${seen.get(d.id)} and ${d.file}`);
    seen.set(d.id, d.file);
  }
  const max = Math.max(...all.map((d) => d.num));
  for (let n = 1; n <= max; n++) if (!seen.has(`D${n}`)) problems.push(`D${n} is in neither ${LIVING} nor ${ARCHIVE}`);
  const rows = all.map((d) => {
    const title = d.file === ARCHIVE ? `[${cell(d.title)}](DECISIONS-ARCHIVE.md#${d.anchor})` : cell(d.title);
    return `| ${d.id} | ${title} | ${d.plain ? cell(d.plain) : '—'} | ${cell(d.status)} |`;
  });
  return {
    index: [START, '', '| | Decision | In plain words | Status |', '|---|---|---|---|', ...rows, '', END].join('\n'),
    problems,
    unsummarised: all.filter((d) => !d.plain).map((d) => d.id),
    long: all.filter((d) => d.num >= SHORT_FROM && d.lines > SCREEN).map((d) => `${d.id} (${d.lines} lines)`),
    count: all.length,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const living = read(LIVING);
  const { index, problems, unsummarised, long, count } = buildIndex(living, read(ARCHIVE));
  const next = living.slice(0, living.indexOf(START)) + index + living.slice(living.indexOf(END) + END.length);
  if (unsummarised.length) console.error(`${unsummarised.join(', ')} ha${unsummarised.length > 1 ? 've' : 's'} no "> **In plain words:**" line; add one under the heading`);
  if (long.length) console.error(`longer than a screen (${SCREEN} lines), which a decision from D${SHORT_FROM} on should not be: ${long.join(', ')}`);
  for (const p of problems) console.error(p);
  if (process.argv.includes('--check')) {
    if (next !== living) console.error(`${LIVING} index is out of date; run npm run docs:decisions`);
    if (next !== living || problems.length) process.exit(1);
    console.log(`${LIVING} index is current`);
  } else {
    if (problems.length) process.exit(1);
    writeFileSync(join(root, LIVING), next);
    console.log(`${LIVING}: ${count} decisions indexed, ${count - unsummarised.length} in plain words`);
  }
}
