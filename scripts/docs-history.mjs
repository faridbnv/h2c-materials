#!/usr/bin/env node
// Which documents describe the tool as it is, and which as it was (the owner's request of 2026-10-05, GOALS).
//
// A dated audit, its packets, the background research and the archive are records of their day: their numbers, rules
// and file names are not kept up to date, and a reader (or an agent) who takes one for the current state is misled.
// Every Markdown file under docs/audits, docs/background and archive therefore opens, just below its title, with one of
// three marks:
//   > **Historical record** ...   written for a round or review; it describes the tool as it was then
//   > **Current** ...             regenerated from the build, or a reference the tools still read, kept up to date
//   > **Generated** ...           written by a command on a given day; run it again for the current state
// test/docs-history.test.js fails on a file with none. This adds the historical mark where none is, after the title;
// a file that is current is named in CURRENT and given its mark by hand or by its generator.
//
//   npm run docs:history            mark every unmarked file historical
//   npm run docs:history -- --check list the unmarked files and fail
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HISTORY_ROOTS = ['docs/audits', 'docs/background', 'archive'];
export const MARK = /^> \*\*(Historical record|Current|Generated)\*\*/m;
// The index of the audits is itself kept current by hand.
export const CURRENT = new Set(['docs/audits/README.md']);

export function historyFiles() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir)).sort()) {
      const rel = `${dir}/${name}`;
      if (statSync(join(root, rel)).isDirectory()) walk(rel);
      else if (name.endsWith('.md')) out.push(rel);
    }
  };
  for (const r of HISTORY_ROOTS) walk(r);
  return out;
}

/** The first lines decide: a mark must stand near the top, where a reader starts. */
export const marked = (text) => MARK.test(text.split('\n').slice(0, 12).join('\n'));

function banner(rel) {
  const date = /(\d{4}-\d{2}-\d{2})/.exec(rel)?.[1];
  const up = relative(dirname(join(root, rel)), root).split(sep).join('/') || '.';
  const when = date ? ` (${date})` : '';
  const what = rel.startsWith('archive/') ? 'kept from an earlier stage of the project' : rel.startsWith('docs/background/') ? 'research the tool was built from' : 'written for one review or round';
  return `> **Historical record**${when}: ${what}. It describes the tool and its data as they were then; numbers, rules and file names may have changed since. For where things stand now, read the [README](${up}/README.md) and [OPEN-PROBLEMS](${up}/docs/OPEN-PROBLEMS.md).`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const unmarked = historyFiles().filter((rel) => !CURRENT.has(rel) && !marked(readFileSync(join(root, rel), 'utf8')));
  if (process.argv.includes('--check')) {
    for (const rel of unmarked) console.log(`unmarked: ${rel}`);
    if (unmarked.length) process.exit(1);
    console.log('docs:history: every audit, background and archive document is marked');
  } else {
    for (const rel of unmarked) {
      const text = readFileSync(join(root, rel), 'utf8');
      const lines = text.split('\n');
      const at = lines[0].startsWith('# ') ? 1 : 0;
      lines.splice(at, 0, ...(at ? ['', banner(rel)] : [banner(rel), '']));
      writeFileSync(join(root, rel), lines.join('\n'));
    }
    console.log(`docs:history: ${unmarked.length} document(s) marked historical`);
  }
}
