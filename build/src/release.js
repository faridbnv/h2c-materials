// A release is its content (DECISIONS D96; docs/GOALS.md, 2026-09-28, decision 6).
//
// The data date in method.csv names when the data was last re-dated, and stayed 2026-09-21 through a week of changes
// that moved answers: two pages of one date could disagree, and a scenario saved on one opened on the other with no word.
// A release ID is a digest of everything that decides an answer: the tables, the schema, the build's rules and
// mappings, the selection engine and the templates' questions, and the locked dependency versions. The same inputs give
// the same ID on any day and machine; any change to what decides gives another, even on the same date. What only draws
// the page (the interface around the engine, the stylesheet) is not in it: two pages that differ only there give the
// same answers, and share the ID.
//
// The ID travels in the page (db.meta.release), every saved scenario and link, every export and decision brief, and the
// page's own name. The build's manifest (dist/manifest.json) records the inputs' digests beside it.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** What decides an answer, by the part of the tool it is. Paths are the project root's. */
export const RELEASE_INPUTS = {
  data: ['data/tables'],
  schema: ['schema'],
  rules: ['build/src', 'build/mappings'],
  engine: ['app/js/engine', 'app/js/ui/templates.js'],
  dependencies: ['build/package-lock.json'],
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
// Operating-system litter never decides anything, and a copy made on a Mac would otherwise differ from its clone.
const IGNORED = /(^|\/)(\.DS_Store|Thumbs\.db)$/;

/** Every file under the paths, as { path, bytes }, in a fixed order. */
function filesUnder(root, paths) {
  const out = [];
  for (const p of paths) {
    const abs = join(root, p);
    if (!existsSync(abs)) continue;
    const list = statSync(abs).isDirectory()
      ? readdirSync(abs, { recursive: true }).map((f) => join(abs, String(f))).filter((f) => statSync(f).isFile())
      : [abs];
    for (const f of list) {
      const path = relative(root, f).split('\\').join('/');
      if (!IGNORED.test(path)) out.push({ path, bytes: readFileSync(f) });
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * The release a set of inputs makes: a digest per part, and the ID over them. `groups` maps a part's name to its files
 * ({ path, bytes }); a file's path is part of its digest, so a renamed table is a new release.
 */
export function releaseFrom(groups) {
  const inputs = {};
  for (const name of Object.keys(groups).sort()) {
    inputs[name] = sha256(groups[name].map((f) => `${sha256(f.bytes)}  ${f.path}`).join('\n'));
  }
  const digest = sha256(Object.entries(inputs).map(([k, v]) => `${k} ${v}`).join('\n'));
  return { id: digest.slice(0, 12), digest, inputs };
}

/** The release the project at `root` builds. */
export function releaseIdentity(root) {
  return releaseFrom(Object.fromEntries(Object.entries(RELEASE_INPUTS).map(([name, paths]) => [name, filesUnder(root, paths)])));
}

/** The page's file name: its data date, which a reader recognises, and its release, which identifies it. */
export const pageName = (meta) => `H2C_Material_Selector_${meta.snapshot}${meta.release?.id ? `_${meta.release.id}` : ''}.html`;
