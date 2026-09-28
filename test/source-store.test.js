// The source documents as a private store addressed by digest (A08, the review of 2026-09-27): what the cache holds for
// each registered source, a bundle of the verified bytes to keep elsewhere, and a restore that takes back only bytes
// that hash to a registered digest and names every digest still missing. Nothing is fetched. The register and the
// document cache here are the test's own, in the operating system's temporary folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvText, readCsv } from '../build/src/csv.js';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = mkdtempSync(join(tmpdir(), 'h2c-source-store-'));
const cache = join(dir, 'cache');
// The cache is named once, when the pipeline's context is first read (scripts/ingest/context.mjs).
process.env.H2C_DOCUMENT_CACHE = cache;
const { manifest, exportBundle, restoreBundle } = await import('../scripts/data/source-store.mjs');
const { EXTRACTOR } = await import('../scripts/lib/pdf-text.mjs');
test.after(() => rmSync(dir, { recursive: true, force: true }));

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const put = (path, bytes) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes); };
const A = Buffer.from('%PDF-1.4\n% the sheet of product A\n%%EOF\n');
const B = Buffer.from('<html><body>the page of product B</body></html>');
const C = Buffer.from('%PDF-1.4\n% a sheet cached by its SourceID before the pipeline\n%%EOF\n');
const E = Buffer.from('%PDF-1.4\n% the sheet of product E, as recorded\n%%EOF\n');

// A register of five sources, and a cache that holds A by digest, C by SourceID, E's name over other bytes, and not B.
const root = join(dir, 'repo');
const source = (id, digest) => ({ SourceID: id, SHA256: digest, URL: `https://maker.example/${id}`, 'Access date': '2026-09-01', 'Access state': 'retrieved' });
put(join(root, 'data/tables/sources.csv'), csvText(['SourceID', 'SHA256', 'URL', 'Access date', 'Access state'],
  [source('S-A', sha(A)), source('S-B', sha(B)), source('S-C', sha(C)), source('S-D', 'Not recorded'), source('S-E', sha(E))]));
put(join(cache, 'sources/by-sha', `${sha(A)}.pdf`), A);
put(join(cache, 'sources/S-C.pdf'), C);
put(join(cache, 'sources/S-E.pdf'), Buffer.from('%PDF-1.4\n% another revision of E\n%%EOF\n'));
put(join(cache, 'text', `${sha(A)}.json`), JSON.stringify({ sha: sha(A), extractor: EXTRACTOR, pages: [] }));
put(join(cache, 'text', `${sha(C)}.json`), JSON.stringify({ sha: sha(C), extractor: 'a reader of an older version', pages: [] }));

test('the manifest says, for every registered source, whether its bytes are held and hash to its digest, and whether its text is read', () => {
  const rows = new Map(manifest(root).map((r) => [r.SourceID, r]));
  assert.deepEqual([...rows.keys()], ['S-A', 'S-B', 'S-C', 'S-D', 'S-E']);
  assert.deepEqual(rows.get('S-A'), { SourceID: 'S-A', SHA256: sha(A), Bytes: 'present', Text: 'cached', File: `sources/by-sha/${sha(A)}.pdf` });
  assert.deepEqual(rows.get('S-B'), { SourceID: 'S-B', SHA256: sha(B), Bytes: 'absent', Text: 'absent', File: '' });
  assert.deepEqual(rows.get('S-C'), { SourceID: 'S-C', SHA256: sha(C), Bytes: 'present', Text: 'stale', File: 'sources/S-C.pdf' });
  assert.equal(rows.get('S-D').Bytes, 'not-recorded');
  assert.equal(rows.get('S-E').Bytes, 'mismatch', 'a file under its name that hashes to something else is not its bytes');
});

test('a bundle holds the verified bytes under their digests, with a manifest that names no path on this machine', () => {
  const bundle = join(dir, 'bundle');
  const first = exportBundle(bundle, root);
  assert.deepEqual({ sources: first.sources, files: first.files, copied: first.copied, kept: first.kept }, { sources: 2, files: 2, copied: 2, kept: 0 });
  assert.deepEqual(first.missing.map((m) => `${m.SourceID} ${m.Bytes}`), ['S-B absent', 'S-E mismatch']);
  assert.deepEqual(readdirSync(bundle).sort(), [`${sha(A)}.pdf`, `${sha(C)}.pdf`, 'manifest.csv'].sort());
  assert.ok(readFileSync(join(bundle, `${sha(C)}.pdf`)).equals(C));
  const text = readFileSync(join(bundle, 'manifest.csv'), 'utf8');
  assert.ok(!text.includes(dir) && !text.includes(repo), 'no path of this machine');
  const rows = readCsv(join(bundle, 'manifest.csv')).records.map((r) => r.values);
  assert.deepEqual(rows.map((r) => [r.SourceID, r.File, r.URL]), [['S-A', `${sha(A)}.pdf`, 'https://maker.example/S-A'], ['S-C', `${sha(C)}.pdf`, 'https://maker.example/S-C']]);
  // Exported again, the bundle is already whole.
  const again = exportBundle(bundle, root);
  assert.deepEqual([again.copied, again.kept], [0, 2]);
  // The makers' documents never go into the repository's own tree.
  assert.throws(() => exportBundle(join(repo, 'bundle-in-the-repository'), root), /inside the repository/);
  assert.ok(!existsSync(join(repo, 'bundle-in-the-repository')));
});

test('a restore takes back only bytes that hash to a registered digest, and names every digest still missing', () => {
  const bundle = join(dir, 'bundle');
  exportBundle(bundle, root);
  // The cache is lost; the bundle, a file that hashes to nothing registered, and one that claims a digest it is not.
  rmSync(cache, { recursive: true, force: true });
  writeFileSync(join(bundle, 'unrelated.pdf'), Buffer.from('%PDF-1.4\n% nobody registered this\n%%EOF\n'));
  writeFileSync(join(bundle, `${sha(B)}.html`), Buffer.from('<html>not the page that was read</html>'));
  const r = restoreBundle(bundle, root);
  assert.deepEqual(r.restored.map((x) => x.sources.join()).sort(), ['S-A', 'S-C']);
  assert.deepEqual(r.refused.map((x) => x.why).sort(), [`hashes to no registered source`, `named for ${sha(B)} but hashes to ${sha(Buffer.from('<html>not the page that was read</html>'))}`].sort());
  assert.deepEqual(r.absent.map((m) => `${m.SourceID} ${m.SHA256}`), [`S-B ${sha(B)}`, `S-E ${sha(E)}`]);
  // Restored by digest, where the pipeline reads a document: C is now held under its digest, not its old name.
  assert.ok(readFileSync(join(cache, 'sources/by-sha', `${sha(C)}.pdf`)).equals(C));
  assert.equal(manifest(root).find((m) => m.SourceID === 'S-C').Bytes, 'present');
  // The right bytes under any name are the document; a second restore of the same bundle adds nothing.
  writeFileSync(join(bundle, 'saved-page.html'), B);
  const later = restoreBundle(bundle, root);
  assert.deepEqual(later.restored.map((x) => x.sources.join()), ['S-B']);
  assert.equal(later.already.length, 2);
  assert.deepEqual(later.absent.map((m) => m.SourceID), ['S-E']);
  assert.ok(existsSync(join(cache, 'sources/by-sha', `${sha(B)}.html`)));
});
