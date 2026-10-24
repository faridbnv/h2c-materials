// The detail parts are written in rows (owner decision 2026-10-22, the site budget): every array of plain records is { keys, rows } and
// the part says "encoding": "rows-1". What is proved here: every real detail part of the build reads back as exactly the part the
// build made (values, missing against null, and key order, down to the written text); a part that says no encoding or another is
// refused as a data-shape error; a damaged table is refused; the writer is smaller than the plain part.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { DETAIL_ENCODING, DetailEncodingError, decodeDetail, encodeDetail } from '../../packages/publish/src/shards.ts';
import { makeShards, plainDetails } from '../../apps/public/tools/shards.ts';
import { DetailsIncomplete, loadDetails } from '../../apps/public/src/parts.ts';
import { DataShapeError } from '../../apps/public/src/model.ts';

const root = fileURLToPath(new URL('../..', import.meta.url));
const R = 'aaaaaaaaaaaa';
let db, shards, plain;

before(() => {
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
  db.meta.release = { id: R, digest: 'a'.repeat(64), inputs: {} };
  shards = makeShards(db, { meta: { caveat: 'x' } }, R);
  plain = plainDetails(db, R);
});

test('every real detail part reads back as exactly the part the build made, key order and missing fields included', () => {
  assert.ok(plain.size > 100, 'the build has its materials');
  let tables = 0;
  for (const [id, part] of plain) {
    const written = shards.files.get(`detail/${id}.json`);
    const wanted = JSON.stringify(part);
    const read = decodeDetail(JSON.parse(written));
    assert.equal(JSON.stringify(read), wanted, `${id}: the text of the part read back`);
    assert.deepEqual(read, JSON.parse(wanted), `${id}: the part read back`);
    assert.equal(JSON.parse(written).encoding, DETAIL_ENCODING);
    tables += written.split('"keys":').length - 1;
  }
  assert.ok(tables > plain.size, 'the parts hold tables (the encoding did something)');
});

test('the written parts are smaller than the plain ones', () => {
  let plainBytes = 0, writtenBytes = 0;
  for (const [id, part] of plain) { plainBytes += JSON.stringify(part).length; writtenBytes += shards.files.get(`detail/${id}.json`).length; }
  assert.ok(writtenBytes < plainBytes * 0.9, `${writtenBytes} against ${plainBytes}`);
});

test('a missing field and a null one stay apart; a record with its fields in another order stays an array', () => {
  const part = { kind: 'detail', release: R, materialId: 'M1', records: { rows: [{ a: 1, b: null }, { a: 2 }, { b: undefined, c: [] }], other: [{ x: 1, y: 2 }, { y: 3, x: 4 }], nested: [{ id: 1, list: [{ p: 1 }, { p: 2, q: 3 }] }, { id: 2, list: [] }], one: [{ a: 1 }] } };
  const wanted = JSON.parse(JSON.stringify(part));
  const written = JSON.parse(JSON.stringify(encodeDetail(part)));
  assert.ok(!Array.isArray(written.records.rows) && Array.isArray(written.records.other) && Array.isArray(written.records.one));
  const read = decodeDetail(written);
  assert.equal(JSON.stringify(read), JSON.stringify(wanted));
  assert.ok('b' in read.records.rows[0] && read.records.rows[0].b === null && !('b' in read.records.rows[1]) && !('b' in read.records.rows[2]));
});

test('a record that looks like an encoded table is refused at write time', () => {
  assert.throws(() => encodeDetail({ kind: 'detail', records: { x: { keys: [], rows: [] } } }), DetailEncodingError);
});

test('a part with no encoding, another encoding or a damaged table is refused', () => {
  const base = { kind: 'detail', release: R, materialId: 'M1', records: { a: [] } };
  assert.throws(() => decodeDetail(base), /no encoding/);
  assert.throws(() => decodeDetail({ ...base, encoding: 'rows-2' }), /rows-2/);
  assert.throws(() => decodeDetail({ ...base, encoding: DETAIL_ENCODING, records: { a: { keys: ['x'], rows: [[1, 2]] } } }), DetailEncodingError);
  assert.throws(() => decodeDetail({ ...base, encoding: DETAIL_ENCODING, records: { a: { keys: ['x', 'x'], rows: [] } } }), DetailEncodingError);
  assert.throws(() => decodeDetail({ ...base, encoding: DETAIL_ENCODING, records: { a: { keys: ['x'], rows: [[1]], absent: [0, 5] } } }), DetailEncodingError);
});

test('the loader reads an encoded part to the objects the page reads, and refuses an unknown or missing encoding as a DataShapeError', async () => {
  const id = [...plain.keys()][0];
  const serve = (override) => async (url) => {
    const body = override ?? JSON.parse(shards.files.get(`detail/${id}.json`));
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
  };
  const loaded = await loadDetails(R, [id], serve());
  assert.equal(JSON.stringify(loaded.get(id).records), JSON.stringify(plain.get(id).records));
  const part = JSON.parse(shards.files.get(`detail/${id}.json`));
  const { encoding, ...bare } = part;
  // loadDetails names the material in a DetailsIncomplete; the cause is the data-shape error.
  for (const broken of [bare, { ...part, encoding: 'rows-9' }]) {
    await assert.rejects(loadDetails(R, [id], serve(broken)), (e) => e instanceof DetailsIncomplete && e.cause instanceof DataShapeError);
  }
});
