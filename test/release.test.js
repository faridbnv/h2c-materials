// A release is its content (D96): the same inputs give the same ID, any change to what decides gives another, and
// the page, its database and its name carry it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { releaseFrom, releaseIdentity, pageName, RELEASE_INPUTS } from '../build/src/release.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = (over = {}) => ({
  data: [{ path: 'data/tables/materials.csv', bytes: Buffer.from('MaterialID\nM001\n') }],
  rules: [{ path: 'build/src/products.js', bytes: Buffer.from('export const x = 1;\n') }],
  ...over,
});

test('the same inputs give the same release, on any day', () => {
  assert.deepEqual(releaseFrom(files()), releaseFrom(files()));
  assert.match(releaseFrom(files()).id, /^[0-9a-f]{12}$/);
});

test('a change to a table, a rule or a file name is another release', () => {
  const base = releaseFrom(files()).id;
  assert.notEqual(releaseFrom(files({ data: [{ path: 'data/tables/materials.csv', bytes: Buffer.from('MaterialID\nM002\n') }] })).id, base);
  assert.notEqual(releaseFrom(files({ rules: [{ path: 'build/src/products.js', bytes: Buffer.from('export const x = 2;\n') }] })).id, base);
  assert.notEqual(releaseFrom(files({ rules: [{ path: 'build/src/renamed.js', bytes: Buffer.from('export const x = 1;\n') }] })).id, base);
  // Each part is digested apart, so a file moving between parts is a change too.
  assert.notEqual(releaseFrom({ data: [], rules: [...files().rules, ...files().data] }).id, base);
});

test('the interface around the engine is not part of a release; the engine and the templates are', () => {
  const paths = Object.values(RELEASE_INPUTS).flat();
  assert.ok(paths.includes('app/js/engine') && paths.includes('app/js/ui/templates.js'));
  assert.ok(!paths.some((p) => p === 'app' || p === 'app/js' || p === 'app/js/ui' || p.startsWith('app/css')));
});

test('the built database, its page and its name carry the release of this tree', () => {
  const db = JSON.parse(readFileSync(join(root, 'dist/db.json'), 'utf8'));
  const release = releaseIdentity(root);
  assert.deepEqual(db.meta.release, release, 'npm test builds first, so dist/ is this tree');
  const page = pageName(db.meta);
  assert.equal(page, `H2C_Material_Selector_${db.meta.snapshot}_${release.id}.html`);
  assert.deepEqual(readdirSync(join(root, 'dist')).filter((f) => f.startsWith('H2C_Material_Selector_')), [page], 'one page in dist/, this release\'s');
  const html = readFileSync(join(root, 'dist', page), 'utf8');
  assert.match(html, new RegExp(`<meta name="generator" content="H2C selector release ${release.id},`));
  const manifest = JSON.parse(readFileSync(join(root, 'dist/manifest.json'), 'utf8'));
  assert.equal(manifest.release, release.id);
  assert.deepEqual(manifest.releaseInputs, release.inputs);
});
