// The runtime contract (schema/db.schema.json, schema/reference.schema.json) and the reproducible build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractIssues } from '../build/src/contract.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(root, 'dist', f), 'utf8'));

test('the compiled database and reference match their contract', () => {
  assert.deepEqual(contractIssues({ db: read('db.json'), reference: read('reference.json') }), []);
});

test('a renamed, dropped, retyped or unexpected field is reported at its path', () => {
  const db = read('db.json');
  const reference = read('reference.json');
  const pla = db.materials.findIndex((m) => m.name === 'PLA');
  delete db.materials[pla].headline.density.unit;
  db.measurements[0].valeu = db.measurements[0].value;
  db.grades[2].retired = 'no';
  delete db.registry;
  const messages = contractIssues({ db, reference }).map((i) => `${i.where}  ${i.message.replace(/ \(schema.*$/, '')}`);
  assert.deepEqual(messages.sort(), [
    "dist/db.json/  must have required property 'registry'",
    `dist/db.json/grades/2/retired  must be boolean`,
    `dist/db.json/materials/${pla}/headline/density  must have required property 'unit'`,
    'dist/db.json/measurements/0  must NOT have additional properties ("valeu")',
  ].sort());
});

test('building the same tree twice produces the same bytes', () => {
  const hashes = () => Object.fromEntries(['db.json', 'reference.json', 'manifest.json'].map((f) => [f, createHash('sha256').update(readFileSync(join(root, 'dist', f))).digest('hex')]));
  const before = hashes();
  execFileSync(process.execPath, ['build/src/index.js'], { cwd: root, stdio: 'ignore' });
  assert.deepEqual(hashes(), before);
  const manifest = read('manifest.json');
  assert.equal(manifest.outputs['db.json'], before['db.json']);
  assert.match(manifest.commit ?? '', /^[0-9a-f]{40}$/);
});
