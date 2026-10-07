// npm run audit:sources reads a source's recorded bytes from the store by digest, and otherwise fetches through the
// import pipeline's bounded request (scripts/ingest/fetch.mjs), keeping nothing that is not the recorded document
// (completeness round, 2026-10-07; OPEN-PROBLEMS §19, what F14 left). The fetch here is a stand-in: no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPdf } from '../scripts/audit/source-completeness.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const never = async () => { throw new Error('the store holds these bytes: nothing is fetched'); };

test('bytes the store holds by digest are read, and nothing is fetched', async () => {
  const bytes = Buffer.from('%PDF-1.4 fixture held in the store');
  const { storeBytes } = await import('../scripts/data/source-store.mjs');
  storeBytes(bytes);
  const got = await fetchPdf({ SourceID: 'X-FIXTURE-HELD', SHA256: sha(bytes), URL: 'https://fixture.invalid/held.pdf' }, { fetchBytes: never });
  assert.equal(got.sha, sha(bytes));
  assert.deepEqual(got.bytes, bytes);
});

test('a fetch that serves other bytes is another document: refused, and not kept', async () => {
  const recorded = 'a'.repeat(64);
  const served = Buffer.from('%PDF-1.4 a later revision');
  const got = await fetchPdf({ SourceID: 'X-FIXTURE-CHANGED', SHA256: recorded, URL: 'https://fixture.invalid/changed.pdf' }, { fetchBytes: async () => ({ bytes: served }) });
  assert.match(got.error, /document changed/);
  assert.equal(existsSync(join(root, '.cache/sources/X-FIXTURE-CHANGED.pdf')), false, 'the wrong bytes were written under the source');
});

test("a fetch the bounded request gives up on says why, in the request's words", async () => {
  const got = await fetchPdf({ SourceID: 'X-FIXTURE-GONE', SHA256: 'b'.repeat(64), URL: 'https://fixture.invalid/gone.pdf' }, { fetchBytes: async () => ({ error: 'HTTP 404', state: 'http' }) });
  assert.equal(got.error, 'download failed: HTTP 404');
});
