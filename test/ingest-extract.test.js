// Finding the sheet that is the same sheet twice. A retailer's copy is usually a different file with an identical
// table, so the digest cannot see it and the words alone are noisy; the numbers agree or they do not.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { documentText } from '../scripts/lib/pdf-text.mjs';
import { fingerprint, agreement } from '../scripts/ingest/extract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const text = await documentText(readFileSync(join(root, 'test/fixtures/ingest/fixture-tds.pdf')), { refresh: true });

test('a document fingerprints as the numbers it prints', () => {
  const print = fingerprint(text);
  assert.ok(print.includes('52MPa'), print.join(' '));
  assert.ok(print.includes('68°C'), print.join(' '));
  // A rate and a humidity are conditions, not results, and are left out as they are everywhere else.
  assert.ok(!print.includes('10°C') && !print.some((v) => v.endsWith('%')), print.join(' '));
  // Sorted, so two readings of one sheet compare directly however the pages are laid out.
  assert.deepEqual(print, [...print].sort());
});

test('two readings of one sheet agree completely; a sheet with its own numbers does not', () => {
  const print = fingerprint(text);
  assert.equal(agreement(print, print), 1);
  assert.equal(agreement(print, print.map((v) => v.replace(/^\d+/, (n) => String(Number(n) + 1)))), 0);
  // A copy that lost a row still reads as the same sheet; the threshold the pipeline uses is four fifths.
  const short = print.slice(0, Math.max(1, print.length - 1));
  assert.ok(agreement(print, short) >= 0.8, String(agreement(print, short)));
  assert.equal(agreement([], print), 0);
});

test('agreement is measured against the smaller sheet, so a long sheet cannot swallow a short one', () => {
  const a = ['1MPa', '2MPa', '3MPa'];
  const b = ['1MPa', '2MPa', '3MPa', '4MPa', '5MPa', '6MPa', '7MPa', '8MPa'];
  assert.equal(agreement(a, b), 1);
  // Repeats count once each: a sheet printing 1 MPa three times does not match a sheet printing it once.
  assert.equal(agreement(['1MPa', '1MPa', '1MPa'], ['1MPa', '9MPa', '9MPa']), 1 / 3);
});
