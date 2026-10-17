// The reproducible build: the same tree built twice gives the same bytes, with the build cache off and through it.
// Named .check.js and run on its own in `npm run verify`, not in `verify:fast`: it rebuilds the whole database with the
// cache off, and under load (other builds running) that one test set verify:fast's critical path, 88 s of a 99 s run
// on 2026-09-26 (RESPONSE.md, phase 5 part 4). It guards what a commit ships, so verify, the pre-commit gate and CI
// keep it; the working loop does not need it on every run. It compares a rebuild with dist/ as it stands, so run it
// after a build (verify's `npm test` builds first).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, 'dist', f), 'utf8'));

// The material pages' digest as the manifest defines it (build/src/index.js, app/pages/stage.js): the SHA-256 over the
// lines "<sha256 of the file>  materials/<path>" of every file under dist/materials, in the order of the paths, joined by
// a newline. Read from the files on disk, so it checks the manifest against what a reader would fetch, not against the
// build's own memory.
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pagesDir = join(root, 'dist/materials');
const pageFiles = () => readdirSync(pagesDir, { recursive: true }).map(String).filter((f) => statSync(join(pagesDir, f)).isFile());
const pagesDigest = () => sha256(pageFiles().map((f) => [`materials/${f}`, sha256(readFileSync(join(pagesDir, f)))]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  .map(([path, h]) => `${h}  ${path}`).join('\n'));

test('building the same tree twice produces the same bytes', () => {
  const hashes = () => Object.fromEntries(['db.json', 'reference.json', 'manifest.json'].map((f) => [f, createHash('sha256').update(readFileSync(join(root, 'dist', f))).digest('hex')]));
  const before = hashes();
  const pagesBefore = read('manifest.json').outputs['materials/'];
  assert.match(pagesBefore ?? '', /^[0-9a-f]{64}$/, 'the manifest records the material pages\' digest');
  assert.equal(pagesBefore, pagesDigest(), 'the manifest\'s digest is the digest of the files under dist/materials');
  // Rebuilt with the build cache off, so the stages really run again; dist/ may have come from the cache, and then this
  // also proves a stored result gives the bytes a cold build gives.
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore', env: { ...process.env, H2C_NO_BUILD_CACHE: '1' } });
  assert.deepEqual(hashes(), before);
  assert.equal(read('manifest.json').outputs['materials/'], pagesBefore, 'the pages are the same bytes after a cold rebuild');
  assert.equal(pagesDigest(), pagesBefore);
  // And through the cache, which the build uses by default.
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore' });
  assert.deepEqual(hashes(), before);
  assert.equal(read('manifest.json').outputs['materials/'], pagesBefore, 'the pages are the same bytes through the build cache');
  assert.equal(pagesDigest(), pagesBefore);
  const manifest = read('manifest.json');
  assert.equal(manifest.outputs['db.json'], before['db.json']);
  assert.equal(manifest.outputs['materials/'], pagesBefore);
  // The page count the manifest states is the main pages on disk: a material's <id>.html, not its records page or the index.
  assert.equal(manifest.pages.pages, pageFiles().filter((f) => /^M\d+\.html$/.test(f)).length);
  assert.match(manifest.commit ?? '', /^[0-9a-f]{40}$/);
});
