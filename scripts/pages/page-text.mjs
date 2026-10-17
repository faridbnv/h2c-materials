#!/usr/bin/env node
// A material page's text as a reader reads it (D142): what a summary's writer works from, and what a reviewer checks a
// summary's claims against, section by section.
//
//   npm run pages:text -- M020              PETG's page (dist/materials/M020.html) as text
//   npm run pages:text -- M020 --records    its records page instead
//
// It reads the page the build wrote, after building where dist/db.json is stale, and says which release it is of.
// It writes nothing.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadDb, pageText, root } from './lib.mjs';

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
if (!id) { console.error('Name a material: npm run pages:text -- M020'); process.exit(2); }
const db = loadDb({ quiet: true });
const file = join(root, 'dist/materials', `${id}${args.includes('--records') ? '-records' : ''}.html`);
if (!existsSync(file)) {
  console.error(db.materials.some((m) => m.id === id) ? `${id} has no page (npm run pages:fields -- ${id} says why), or the build did not write the pages: npm run build.` : `${id}: no such material.`);
  process.exit(2);
}
const html = readFileSync(file, 'utf8');
const release = /data-release="([^"]+)"/.exec(html)?.[1];
if (release !== db.meta.release?.id) {
  console.error(`The page is of release ${release} and the database of ${db.meta.release?.id}: npm run build, then ask again.`);
  process.exit(1);
}
console.log(`Page ${id} of release ${release}, ${db.meta.snapshot} data.\n`);
process.stdout.write(pageText(html));
